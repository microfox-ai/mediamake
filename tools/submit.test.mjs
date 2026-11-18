import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { NO_RUN_SHEET } from './skills.mjs';
import { candidates, check, collect, describe, madeProblem, payload, uploadTimedOut, uploadTimeout } from './submit.mjs';

const SKILL_MD = '---\nname: make-thing\ndescription: Makes a thing from a song and a picture\nmetadata:\n  version: 1.2.0\n---\n\n# make-thing\n';
const SHEET = "\n## Where it runs\n\n| Step | Needs | A person's yes | Safe to repeat | Without it |\n|---|---|---|---|---|\n| Make it | `key:elevenlabs` | no | yes | a to-do for a place with the key |\n";

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-submit-'));
  const write = (rel, content) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  return { root, write, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('finds an item in a space, a project space or the workspace skills, once', () => {
  const w = workspace();
  try {
    w.write('space/skills/make-thing/SKILL.md', SKILL_MD);
    w.write('space/mcps/weather/item.json', '{"title":"Weather","summary":"Reads the weather for a shoot day","version":"0.3.0"}');
    w.write('spaces/film/apps/board/index.html', '<p>hi</p>');
    // the workspace links a space's skill: the same folder is one candidate
    fs.mkdirSync(path.join(w.root, 'skills'), { recursive: true });
    fs.symlinkSync(path.join(w.root, 'space/skills/make-thing'), path.join(w.root, 'skills/make-thing'));
    w.write('skills/own-variant/SKILL.md', SKILL_MD.replace('make-thing', 'own-variant'));
    const where = { spaces: [{ dir: path.join(w.root, 'space') }, { dir: path.join(w.root, 'spaces/film'), project: { id: 'p1', name: 'Film' } }], skillsDir: path.join(w.root, 'skills') };
    assert.deepEqual(candidates('make-thing', where).map(i => [i.kind, i.where]), [['skill', 'your space']]);
    assert.deepEqual(candidates('weather', where).map(i => [i.kind, i.where]), [['mcp', 'your space']]);
    assert.deepEqual(candidates('board', where).map(i => [i.kind, i.where]), [['app', "the Film project's space"]]);
    assert.deepEqual(candidates('own-variant', where).map(i => [i.kind, i.where]), [['skill', 'your workspace']]);
    assert.deepEqual(candidates('nothing', where), []);
  } finally {
    w.done();
  }
});

test('collects text as text and the rest as bytes, leaving out what never travels', () => {
  const w = workspace();
  try {
    w.write('item/SKILL.md', SKILL_MD);
    w.write('item/scripts/run.mjs', 'console.log(1)\n');
    w.write('item/assets/logo.png', Buffer.from([0, 1, 2, 3]));
    w.write('item/.env', 'KEY=1');
    w.write('item/.env.local', 'KEY=1');
    w.write('item/node_modules/x/index.js', 'x');
    w.write('item/.git/config', 'x');
    w.write('item/big.bin', Buffer.alloc(1024 * 1024 + 1));
    fs.symlinkSync(path.join(w.root, 'item/SKILL.md'), path.join(w.root, 'item/link.md'));
    const { files, skipped } = collect(path.join(w.root, 'item'));
    assert.deepEqual(files.map(f => [f.path, f.encoding]), [['SKILL.md', 'utf8'], ['assets/logo.png', 'base64'], ['scripts/run.mjs', 'utf8']]);
    assert.equal(files[1].content, Buffer.from([0, 1, 2, 3]).toString('base64'));
    assert.equal(skipped.length, 2);
    assert.match(skipped.join('\n'), /big\.bin is 1\.0 MB, over 1 MB/);
    assert.match(skipped.join('\n'), /link\.md is a link/);
  } finally {
    w.done();
  }
});

test('checks stop on keys, machine paths and a wrong name, and note emails', () => {
  const w = workspace();
  try {
    w.write('make-thing/SKILL.md', `${SKILL_MD.replace('name: make-thing', 'name: other')}Run it from /Users/ana/x\nMail ana@studio.io\n`);
    w.write('make-thing/run.mjs', `const k = 'ghp_${'a'.repeat(36)}';\n`);
    const item = { kind: 'skill', name: 'make-thing', dir: path.join(w.root, 'make-thing') };
    const { problems, notes } = check(item, collect(item.dir).files);
    // a skill is made with its run sheet, and a broken one stops it too
    assert.equal(problems[1], NO_RUN_SHEET);
    assert.deepEqual(problems.filter(p => p !== NO_RUN_SHEET), ['SKILL.md says name: other, the folder is make-thing', 'SKILL.md:9 has a path on this machine', 'run.mjs:1 looks like an API key or token']);
    w.write('make-thing/SKILL.md', `${SKILL_MD}${SHEET.replace('key:elevenlabs', 'a key')}`);
    assert.match(check(item, collect(item.dir).files).problems.join('\n'), /SKILL\.md:\d+: "a key" isn't a need/);
    assert.deepEqual(notes, ['SKILL.md:10 has an email address']);
  } finally {
    w.done();
  }
});

test('a clean skill passes, and its payload carries the production and the files', () => {
  const w = workspace();
  try {
    w.write('make-thing/SKILL.md', SKILL_MD + SHEET);
    const item = { kind: 'skill', name: 'make-thing', dir: path.join(w.root, 'make-thing') };
    const { files } = collect(item.dir);
    assert.deepEqual(check(item, files).problems, []);
    assert.deepEqual(describe(item), { title: undefined, summary: 'Makes a thing from a song and a picture', version: '1.2.0' });
    assert.deepEqual(payload(item, files, { made: ' Akhilanda Natha lyric video ', madeUrl: 'https://youtu.be/abc', note: '' }), {
      kind: 'skill',
      name: 'make-thing',
      summary: 'Makes a thing from a song and a picture',
      version: '1.2.0',
      made: { title: 'Akhilanda Natha lyric video', url: 'https://youtu.be/abc' },
      source: 'mm-submit',
      files: [{ path: 'SKILL.md', content: SKILL_MD + SHEET, encoding: 'utf8' }],
    });
  } finally {
    w.done();
  }
});

test('a production is a finished work, never a test or a demo', () => {
  for (const made of ['', '  ', 'test', 'a demo', 'TBD', 'n/a']) assert.match(madeProblem(made), /We publish nothing we don't use/, made);
  assert.equal(madeProblem('Akhilanda Natha lyric video'), null);
});

test('the upload gets a minute for the server plus time to go up, and a time-out says it may have arrived', () => {
  assert.equal(uploadTimeout(0), 60_000);
  // the 1.3 MB skill that ran out of 8 s on 18 Nov 2026 (about 1.7 MB as JSON), and the largest item (3 MB, about 4.2 MB as JSON)
  assert.equal(uploadTimeout(1.7 * 1048576), 88_000);
  assert.ok(uploadTimeout(4.2 * 1048576) > 120_000 && uploadTimeout(4.2 * 1048576) < 130_000);
  const said = uploadTimedOut('pack-distrokid', 1.7 * 1048576, 88_000);
  assert.match(said, /^Sending pack-distrokid \(1\.7 MB\) got no answer within 88 s\./);
  assert.match(said, /may still have arrived: mm submit status shows whether it did/);
});
