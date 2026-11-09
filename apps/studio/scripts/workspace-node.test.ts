// node --experimental-strip-types --test scripts/workspace-node.test.ts (npm run test:workspace -w studio)
// Code in a workspace outside the checkout, loaded by Node (mm remix, amv, lyric-shorts, wave-lab) and
// esbuild (mm brand), finds the engine it imports relatively as if the workspace were apps/studio.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { studioTarget } from './workspace-node.ts';

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NODE = ['--experimental-strip-types', '--no-warnings'];

const tmpWorkspace = () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-ws-node-')));
  const write = (rel: string, text: string) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
    return p;
  };
  return { root, write };
};

/** Runs `code` as an ES module from the studio's scripts folder, with MEDIAMAKE_WORKSPACE set (or not). */
const run = (code: string, workspace: string | null) => {
  const env = { ...process.env, MEDIAMAKE_CONFIG: path.join(os.tmpdir(), 'mm-ws-node-no-config.json') } as NodeJS.ProcessEnv;
  if (workspace) env.MEDIAMAKE_WORKSPACE = workspace;
  else delete env.MEDIAMAKE_WORKSPACE;
  return spawnSync(process.execPath, [...NODE, '--input-type=module', '-e', code], { cwd: path.join(STUDIO, 'scripts'), env, encoding: 'utf8' });
};

test('studioTarget: framework paths in the workspace mean the studio, your own folders never', () => {
  const root = '/ws';
  const studio = '/repo/apps/studio';
  assert.equal(studioTarget('/ws/src/remix/edl.ts', root, studio), '/repo/apps/studio/src/remix/edl.ts');
  assert.equal(studioTarget('/ws/logoGraphics/lib/motion.ts', root, studio), '/repo/apps/studio/logoGraphics/lib/motion.ts');
  assert.equal(studioTarget('/ws/thumbnails/spec.ts', root, studio), '/repo/apps/studio/thumbnails/spec.ts');
  assert.equal(studioTarget('/ws/thumbnails/jobs/a/custom.tsx', root, studio), null);
  assert.equal(studioTarget('/ws/projects/x/video/edl.ts', root, studio), null);
  assert.equal(studioTarget('/ws/brands/b/graphics/Logo.tsx', root, studio), null);
  assert.equal(studioTarget('/ws/node_modules/zod/index.js', root, studio), null);
  assert.equal(studioTarget('/ws/.cache/x', root, studio), null);
  assert.equal(studioTarget('/elsewhere/src/kit', root, studio), null);
});

test('Node: a project edl in the workspace imports the engine relatively, and packages without a node_modules link', () => {
  const ws = tmpWorkspace();
  const edl = ws.write(
    'projects/x/video/edl.ts',
    [
      "import { c } from '../../../src/remix/edl.ts';",
      "import { z } from 'zod';",
      "import { local } from './local.ts';",
      'export const kinds = [typeof c, typeof z.object, local];',
    ].join('\n'),
  );
  ws.write('projects/x/video/local.ts', "export const local = 'own';\n");
  const code = `import './workspace-node.ts'; const m = await import(${JSON.stringify(pathToFileURL(edl).href)}); console.log(JSON.stringify(m.kinds));`;
  const ok = run(code, ws.root);
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(JSON.parse(ok.stdout.trim()), ['function', 'function', 'own']);

  // without the hook (no workspace set), Node looks for <workspace>/src as it always did
  const without = run(code, null);
  assert.notEqual(without.status, 0);
  assert.match(without.stderr, /ERR_MODULE_NOT_FOUND/);
});

test('Node: what is missing in your own folders still fails, naming the file', () => {
  const ws = tmpWorkspace();
  const edl = ws.write('projects/x/video/edl.ts', "import { gone } from '../../y/video/gone.ts';\nexport const g = gone;\n");
  const r = run(`import './workspace-node.ts'; await import(${JSON.stringify(pathToFileURL(edl).href)});`, ws.root);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /projects\/y\/video\/gone\.ts/);
});

test('esbuild: a brand module in the workspace bundles with the logo engine from the studio', () => {
  const ws = tmpWorkspace();
  const svg = ws.write(
    'brands/b/graphics/brand/svg.ts',
    "import { clamp01 } from '../../../../logoGraphics/lib/motion';\nexport default () => `<svg data-x=\"${clamp01(2)}\"/>`;\n",
  );
  const out = path.join(ws.root, 'out.mjs');
  const code = [
    "import { build } from 'esbuild';",
    "import { workspaceEsbuild } from './workspace-node.ts';",
    `await build({ entryPoints: [${JSON.stringify(svg)}], bundle: true, platform: 'node', format: 'esm', outfile: ${JSON.stringify(out)}, logLevel: 'error', plugins: [workspaceEsbuild()] });`,
    `const m = await import(${JSON.stringify(pathToFileURL(out).href)}); console.log(m.default());`,
  ].join('\n');
  const r = run(code, ws.root);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '<svg data-x="1"/>');
});
