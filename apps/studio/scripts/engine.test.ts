// node --experimental-strip-types --test scripts/engine.test.ts (npm run test:engine -w studio)
// The engine by name (engine.ts, engine.json): the names, every place that resolves them, the codemod
// and the pins.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as editor from '../../mediamake/lib/remotion-editor/engine-names.ts';
import {
  ENGINE,
  applyCodemod,
  engineAliases,
  engineFile,
  engineSpecifier,
  engineTarget,
  pinProject,
  pinWarning,
  planCodemod,
  projectPin,
  readEngine,
  tsPaths,
} from './engine.ts';
import { engineWebpack } from './workspace-webpack.ts';

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const table = readEngine(STUDIO)!;

let tmp: string;
const saved = { ws: process.env.MEDIAMAKE_WORKSPACE, config: process.env.MEDIAMAKE_CONFIG };
beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-engine-')));
  process.env.MEDIAMAKE_CONFIG = path.join(tmp, 'no-config.json');
  delete process.env.MEDIAMAKE_WORKSPACE;
});
afterEach(() => {
  for (const [k, v] of [['MEDIAMAKE_WORKSPACE', saved.ws], ['MEDIAMAKE_CONFIG', saved.config]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

const write = (root: string, rel: string, text: string) => {
  const p = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
};

test('engine.json: every name is a folder of the studio, and tsconfig.json mirrors it', () => {
  assert.equal(table.name, ENGINE);
  assert.match(table.version, /^\d+\.\d+\.\d+$/);
  assert.ok(fs.statSync(path.join(STUDIO, table.entry)).isFile());
  for (const [name, dir] of Object.entries(table.names)) assert.ok(fs.statSync(path.join(STUDIO, dir)).isDirectory(), name);
  const tsconfig = JSON.parse(fs.readFileSync(path.join(STUDIO, 'tsconfig.json'), 'utf8'));
  assert.deepEqual(tsconfig.compilerOptions.paths, tsPaths(table), 'tsconfig.json paths: copy tsPaths(readEngine(studio))');
});

test('names and paths, both ways', () => {
  assert.equal(engineTarget(ENGINE, table), 'src/kit/index.ts');
  assert.equal(engineTarget(`${ENGINE}/remix/edl.ts`, table), 'src/remix/edl.ts');
  assert.equal(engineTarget(`${ENGINE}/lyrics`, table), 'src/mediamake');
  assert.equal(engineTarget(`${ENGINE}/logos/lib/motion`, table), 'logoGraphics/lib/motion');
  assert.equal(engineTarget(`${ENGINE}/nothing/x`, table), null);
  assert.equal(engineTarget('@mediamake/engines', table), null);
  assert.equal(engineTarget('react', table), null);

  assert.equal(engineSpecifier('src/kit', table), ENGINE);
  assert.equal(engineSpecifier('src/kit/index.ts', table), ENGINE);
  assert.equal(engineSpecifier('src/kit/manifest.ts', table), `${ENGINE}/kit/manifest.ts`);
  assert.equal(engineSpecifier('src/mediamake', table), `${ENGINE}/lyrics`);
  assert.equal(engineSpecifier('src/mediamake/index.ts', table), `${ENGINE}/lyrics`);
  assert.equal(engineSpecifier('src/mediamake/look.ts', table), `${ENGINE}/lyrics/look.ts`);
  assert.equal(engineSpecifier('src/remix/gfx/cues/index.tsx', table), `${ENGINE}/remix/gfx/cues`);
  assert.equal(engineSpecifier('thumbnails/spec.ts', table), `${ENGINE}/thumbnails/spec.ts`);
  assert.equal(engineSpecifier('src/Root.tsx', table), null);
  assert.equal(engineSpecifier('scripts/paths.ts', table), null);
  for (const rel of ['src/kit/timing.ts', 'src/remix/edl.ts', 'src/lyricshorts/spec.ts', 'logoGraphics/kit.ts', 'catalog/index.ts']) {
    assert.equal(engineFile(engineSpecifier(rel, table)!, STUDIO), path.join(STUDIO, rel), rel);
  }
  // an import without its extension finds the file the way the bundles do
  assert.equal(engineFile(`${ENGINE}/remix/edl`, STUDIO), path.join(STUDIO, 'src/remix/edl.ts'));
  assert.equal(engineFile(`${ENGINE}/lyrics`, STUDIO), path.join(STUDIO, 'src/mediamake/index.ts'));
});

test("the editor's rule is the same (apps/mediamake/lib/remotion-editor/engine-names.ts)", () => {
  const names = editor.parseEngineNames(fs.readFileSync(path.join(STUDIO, 'engine.json'), 'utf8'));
  assert.deepEqual(names, { entry: table.entry, names: table.names });
  for (const spec of [ENGINE, `${ENGINE}/kit/manifest.ts`, `${ENGINE}/lyrics`, `${ENGINE}/remix/gfx/cues`, `${ENGINE}/nothing`, `${ENGINE}x`, 'zod']) {
    assert.equal(editor.engineTarget(spec, names), engineTarget(spec, table), spec);
  }
  assert.equal(editor.parseEngineNames('{"name":"other"}'), null);
});

test('the bundles: aliases into this studio, and a cache that starts over when the names change', () => {
  const aliases = engineAliases(STUDIO);
  assert.equal(aliases[`${ENGINE}$`], path.join(STUDIO, 'src/kit/index.ts'));
  assert.equal(aliases[`${ENGINE}/lyrics`], path.join(STUDIO, 'src/mediamake'));
  const config = { plugins: [], resolve: { alias: { react: '/r' } }, cache: { type: 'filesystem', version: 'v1' } };
  const out = engineWebpack(config, STUDIO) as typeof config & { resolve: { alias: Record<string, string> } };
  assert.equal(out.resolve.alias.react, '/r');
  assert.equal(out.resolve.alias[`${ENGINE}/remix`], path.join(STUDIO, 'src/remix'));
  assert.match(out.cache.version, /^v1-engine-[0-9a-f]{8}$/);
  // another studio's names (golden.ts, for a commit from before engine.json) point at that studio's folders
  const other = engineWebpack(config, '/old/apps/studio', table) as typeof out;
  assert.equal(other.resolve.alias[`${ENGINE}/remix`], path.join('/old/apps/studio', 'src/remix'));
  assert.notEqual(other.cache.version, out.cache.version);
  // a studio with no engine.json and no names given: unchanged
  assert.equal(engineWebpack(config, tmp), config);
});

test('the codemod: imports of the engine by path in your workspace get names; yours stay; projects get pins', () => {
  const ws = path.join(tmp, 'ws');
  process.env.MEDIAMAKE_WORKSPACE = ws;
  const index = write(
    ws,
    'projects/song/video/index.tsx',
    [
      "import { defineProject, layer } from '../../../src/kit';",
      "import { lyricVideo } from '../../../src/mediamake/index.ts';",
      "import type { Storyboard } from \"../../../src/mediamake/look.ts\";",
      "export * from '../../../src/kit/timing.ts';",
      "import { Logo } from '../../../brands/b/graphics/Logo';",
      "import { body } from './fonts';",
      "import Root from '../../../src/Root';",
      "const later = () => import('../../../src/amv/build.ts');",
      "// import { c } from '../../../src/remix/edl.ts';",
      'export default defineProject({ id: "song", layers: [] });',
    ].join('\n'),
  );
  write(ws, 'projects/song/video/fonts.ts', 'export const body = 1;\n');
  const edl = write(ws, 'projects/song/shorts/a/edl.ts', "import { c } from '../../../../src/remix/edl.ts';\nexport const x = c;\n");
  write(ws, 'projects/song/input/project.json', JSON.stringify({ title: 'Song', artist: 'Me' }));
  write(ws, 'projects/other/video/index.tsx', "import { defineProject } from '../../../src/kit';\n");
  write(ws, 'projects/_old/video/index.tsx', "import { defineProject } from '../../../src/kit';\n");
  const logo = write(ws, 'brands/b/graphics/index.tsx', "import { defineLogo } from '../../../logoGraphics/kit';\n");
  // a file of your own at the place an engine path points: yours, left alone
  write(ws, 'src/mine.ts', 'export const mine = 1;\n');
  const mine = write(ws, 'projects/song/video/mine.ts', "import { mine } from '../../../src/mine.ts';\n");

  const plan = planCodemod(STUDIO);
  const text = plan.texts.get(index)!;
  assert.match(text, /from '@mediamake\/engine';/);
  assert.match(text, /from '@mediamake\/engine\/lyrics';/);
  assert.match(text, /from "@mediamake\/engine\/lyrics\/look\.ts";/);
  assert.match(text, /export \* from '@mediamake\/engine\/kit\/timing\.ts';/);
  assert.match(text, /import\('@mediamake\/engine\/amv\/build\.ts'\)/);
  assert.match(text, /\/\/ import \{ c \} from '@mediamake\/engine\/remix\/edl\.ts';/);
  assert.match(text, /'\.\.\/\.\.\/\.\.\/brands\/b\/graphics\/Logo'/);
  assert.match(text, /'\.\/fonts'/);
  assert.match(text, /from '\.\.\/\.\.\/\.\.\/src\/Root';/);
  assert.equal(plan.texts.get(edl), "import { c } from '@mediamake/engine/remix/edl.ts';\nexport const x = c;\n");
  assert.equal(plan.texts.get(logo), "import { defineLogo } from '@mediamake/engine/logos/kit';\n");
  assert.equal(plan.texts.has(mine), false);
  assert.deepEqual(plan.unnamed.map(u => [path.basename(u.file), u.spec, u.target]), [['index.tsx', '../../../src/Root', 'src/Root']]);
  assert.deepEqual(plan.pins.map(p => path.basename(p.dir)).sort(), ['other', 'song']);
  assert.equal(plan.changes.find(c => c.from === '../../../src/kit/timing.ts')?.line, 4);

  applyCodemod(plan, STUDIO);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ws, 'projects/song/input/project.json'), 'utf8')), {
    title: 'Song',
    artist: 'Me',
    engine: plan.pins[0].pin,
  });
  assert.equal(projectPin(path.join(ws, 'projects/other'))?.version, table.version);
  // run again: nothing left
  const again = planCodemod(STUDIO);
  assert.equal(again.changes.length, 0);
  assert.equal(again.pins.length, 0);
  assert.equal(again.unnamed.length, 1);
});

test('pins: written once, kept, never on the framework example; another major is named', () => {
  const ws = path.join(tmp, 'ws');
  process.env.MEDIAMAKE_WORKSPACE = ws;
  const dir = path.join(ws, 'projects', 'p');
  write(ws, 'projects/p/video/index.tsx', '');
  const first = pinProject(dir, STUDIO);
  assert.equal(first?.version, table.version);
  assert.equal(pinProject(dir, STUDIO), null);
  fs.writeFileSync(path.join(dir, 'input', 'project.json'), JSON.stringify({ engine: { version: '0.9.0', commit: 'abc' } }));
  assert.match(pinWarning(dir, STUDIO) ?? '', /made with engine 0\.9\.0 \(abc\), and this render uses 1\./);
  assert.equal(pinProject(dir, STUDIO), null);
  assert.equal(pinProject(dir, STUDIO, { force: true })?.version, table.version);
  assert.equal(pinWarning(dir, STUDIO), null);
  // the framework's example in the checkout (git tracks it) is never pinned
  const example = path.join(STUDIO, 'projects', 'sample-pulse');
  const before = fs.readFileSync(path.join(example, 'input', 'project.json'), 'utf8');
  assert.equal(pinProject(example, STUDIO, { force: true }), null);
  assert.equal(fs.readFileSync(path.join(example, 'input', 'project.json'), 'utf8'), before);
});

test('Node: project code imports the engine by name, from the checkout or a workspace', () => {
  const ws = path.join(tmp, 'ws');
  const edl = write(
    ws,
    'projects/x/video/edl.ts',
    "import { c } from '@mediamake/engine/remix/edl.ts';\nimport { c as c2 } from '@mediamake/engine/remix/edl';\nexport const same = c === c2 && typeof c;\n",
  );
  const code = `import './workspace-node.ts'; const m = await import(${JSON.stringify(pathToFileURL(edl).href)}); console.log(m.same);`;
  for (const env of [{ MEDIAMAKE_WORKSPACE: ws }, {}]) {
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', code], {
      cwd: path.join(STUDIO, 'scripts'),
      env: { ...process.env, MEDIAMAKE_WORKSPACE: '', MEDIAMAKE_CONFIG: path.join(tmp, 'no-config.json'), ...env },
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), 'function');
  }
  const bad = write(ws, 'projects/x/video/bad.ts', "import { x } from '@mediamake/engine/nothing/x.ts';\nexport const y = x;\n");
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', `import './workspace-node.ts'; await import(${JSON.stringify(pathToFileURL(bad).href)});`], {
    cwd: path.join(STUDIO, 'scripts'),
    env: { ...process.env, MEDIAMAKE_CONFIG: path.join(tmp, 'no-config.json') },
    encoding: 'utf8',
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Cannot find @mediamake\/engine\/nothing\/x\.ts in the engine/);
});

test('esbuild: a brand module imports the logo engine by name', () => {
  const ws = path.join(tmp, 'ws');
  const svg = write(ws, 'brands/b/graphics/brand/svg.ts', "import { clamp01 } from '@mediamake/engine/logos/lib/motion';\nexport default () => String(clamp01(5));\n");
  const out = path.join(tmp, 'out.mjs');
  const code = [
    "import { build } from 'esbuild';",
    "import { workspaceEsbuild } from './workspace-node.ts';",
    `await build({ entryPoints: [${JSON.stringify(svg)}], bundle: true, platform: 'node', format: 'esm', outfile: ${JSON.stringify(out)}, logLevel: 'error', plugins: [workspaceEsbuild()] });`,
    `console.log((await import(${JSON.stringify(pathToFileURL(out).href)})).default());`,
  ].join('\n');
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', code], {
    cwd: path.join(STUDIO, 'scripts'),
    env: { ...process.env, MEDIAMAKE_WORKSPACE: ws, MEDIAMAKE_CONFIG: path.join(tmp, 'no-config.json') },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '1');
});
