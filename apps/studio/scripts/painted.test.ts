// The painted-cartoon kit's page and how the bundles reach its files (src/painted, scripts/painted.ts).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { paintedPage, parseConfig, settingsFor, type PageSources } from '../src/painted/page.ts';
import { PAINTED_LIBS, paintedLibAliases, paintedLibs } from './painted-libs.ts';
import { ROOT } from './paths.ts';
import { RAW, engineWebpack, rawText } from './workspace-webpack.ts';

const sources: PageSources = { p5: 'P5', brush: 'BRUSH', kit: { core: 'CORE', clawd: 'CLAWD', timeline: 'TIMELINE', sheets: 'SHEETS' } };
const settings = { duration: 11, bpm: 120, offset: 0 };

test('the page: libraries, PROJECT, the kit, the driver, the scenes, then the loop, in that order', () => {
  const html = paintedPage({ sources, settings, scenes: [{ name: 'scenes/a.js', src: 'A()' }, { name: 'scenes/b.js', src: 'B()' }], loop: 'emotions' });
  const at = (s: string) => {
    const i = html.indexOf(s);
    assert.ok(i >= 0, `the page has ${s}`);
    return i;
  };
  const order = ['P5', 'BRUSH', 'const PROJECT = {"duration":11,"bpm":120,"offset":0};', 'CORE', 'CLAWD', 'TIMELINE', 'SHEETS', 'window.renderFrame', 'A()', 'B()', 'window.LOOP = LOOPS["emotions"]'];
  order.reduce((prev, s) => {
    const i = at(s);
    assert.ok(i > prev, `${s} comes after what's before it`);
    return i;
  }, -1);
  assert.match(html, /<canvas id="out" width="1920" height="1080">/);
  // the scrub bar is off: the page is driven from outside
  assert.match(html, /window\.devUI = \(\) => \{\};/);
  assert.equal(paintedPage({ sources, settings, scenes: [] }).includes('window.LOOP ='), false);
});

test('the page: a script that says </script can not end its tag early', () => {
  const html = paintedPage({ sources, settings, scenes: [{ name: 'scenes/x.js', src: "const s = '</script><b>';" }] });
  assert.ok(html.includes("const s = '<\\/script><b>';"));
  assert.equal(html.includes("'</script><b>'"), false);
});

test('PROJECT: the track sets the length; painted.json, else the song, else 120 / 0 sets the beat', () => {
  const song = { audio: { duration: 31.5 }, beats: { bpm: 96, downbeats: [0.42, 2.9] } };
  assert.deepEqual(settingsFor({ scenes: ['a.js'] }, song), { duration: 31.5, bpm: 96, offset: 0.42 });
  assert.deepEqual(settingsFor({ scenes: ['a.js'], bpm: 140, offset: 0 }, song), { duration: 31.5, bpm: 140, offset: 0 });
  assert.deepEqual(settingsFor({ scenes: ['a.js'] }, { audio: { duration: 15 }, beats: { bpm: null } }), { duration: 15, bpm: 120, offset: 0 });
});

test('painted.json: scene files in video/, numbers for the beat', () => {
  assert.deepEqual(parseConfig('{"scenes":["scenes/main.js"],"bpm":100}'), { scenes: ['scenes/main.js'], bpm: 100, offset: undefined });
  assert.throws(() => parseConfig('{"scenes":[]}'), /needs "scenes"/);
  assert.throws(() => parseConfig('{"scenes":["../other/x.js"]}'), /needs "scenes"/);
  assert.throws(() => parseConfig('{"scenes":["a.js"],"bpm":"fast"}'), /"bpm" is a number/);
  assert.throws(() => parseConfig('scenes: a.js'), /not JSON/);
});

test('?raw: one rule makes the text, and every other rule leaves those imports alone', () => {
  const js = { test: /\.jsx?$/, use: ['esbuild'] };
  const config = { module: { rules: ['...', js] } };
  const out = rawText(config);
  const rules = out.module.rules as Record<string, unknown>[];
  assert.deepEqual(rules[0], { resourceQuery: RAW, type: 'asset/source' });
  assert.equal(rules[1], '...');
  assert.deepEqual(rules[2], { ...js, resourceQuery: { not: [RAW] } });
  assert.equal(rawText(out), out, 'twice is once');
  for (const q of ['?raw', '?x=1&raw']) assert.ok(RAW.test(q), q);
  for (const q of ['?rawest', '?draw']) assert.equal(RAW.test(q), false, q);
});

test("the bundles reach p5's and p5.brush's browser builds by name", () => {
  const libs = paintedLibs(ROOT);
  assert.ok(libs, 'the studio has p5 and p5.brush (npm ci)');
  assert.ok(fs.readFileSync(libs!.p5, 'utf8').length > 100_000, 'p5.min.js');
  assert.equal(path.basename(libs!.brush), 'p5.brush.js');
  const out = engineWebpack({ resolve: { alias: {} } }, ROOT) as { resolve: { alias: Record<string, string> }; module: { rules: unknown[] } };
  assert.equal(out.resolve.alias[`${PAINTED_LIBS.p5}$`], libs!.p5);
  assert.equal(out.resolve.alias[`${PAINTED_LIBS.brush}$`], libs!.brush);
  assert.deepEqual(out.module.rules[0], { resourceQuery: RAW, type: 'asset/source' });
  // a studio from before them: no names
  assert.deepEqual(paintedLibAliases('/old/apps/studio'), {});
});
