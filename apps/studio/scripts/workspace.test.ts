/**
 * The workspace resolver (workspace.ts), its twins (the app's dev routes, the Python) and the bundle
 * changes that let a project outside the repo compile (workspace-webpack.ts).
 *
 *   node --experimental-strip-types --test scripts/workspace.test.ts   (mm test:workspace)
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as app from '../../mediamake/lib/remotion-editor/server/workspace.ts';
import { overlayAliases, workspaceWebpack } from './workspace-webpack.ts';
import { WORKSPACE_FOLDERS, fromStudioPath, isWorkspaceSet, toStudioPath, workspaceDir, workspaceDirs, workspaceRoot, workspaceSetting, type WorkspaceFolder } from './workspace.ts';

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = os.homedir();
const NAMES = Object.keys(WORKSPACE_FOLDERS) as WorkspaceFolder[];

let tmp: string;
const saved = { ws: process.env.MEDIAMAKE_WORKSPACE, cfg: process.env.MEDIAMAKE_CONFIG };
const writeConfig = (cfg: object) => fs.writeFileSync(process.env.MEDIAMAKE_CONFIG!, JSON.stringify(cfg));

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-workspace-'));
  delete process.env.MEDIAMAKE_WORKSPACE;
  process.env.MEDIAMAKE_CONFIG = path.join(tmp, 'config.json');
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const [k, v] of [['MEDIAMAKE_WORKSPACE', saved.ws], ['MEDIAMAKE_CONFIG', saved.cfg]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test('with no workspace set, the old folders stay in apps/studio and the new ones are in ~/MediaMake', () => {
  writeConfig({ library: { root: '~/Downloads/_LIBRARY' } });
  assert.equal(workspaceSetting(), null);
  assert.equal(isWorkspaceSet(), false);
  assert.equal(workspaceRoot(), path.join(HOME, 'MediaMake'));
  assert.equal(workspaceDir('projects', STUDIO), path.join(STUDIO, 'projects'));
  assert.equal(workspaceDir('thumbnailJobs', STUDIO), path.join(STUDIO, 'thumbnails', 'jobs'));
  assert.equal(workspaceDir('overlays', STUDIO), path.join(STUDIO, 'overlays'));
  assert.equal(workspaceDir('notes'), path.join(HOME, 'MediaMake', 'notes'));
  assert.equal(workspaceDir('skills'), path.join(HOME, 'MediaMake', 'skills'));
  assert.throws(() => workspaceDir('projects'), /needs the studio folder/);
});

test('a missing or broken config file names no workspace', () => {
  assert.equal(workspaceSetting(), null);
  fs.writeFileSync(process.env.MEDIAMAKE_CONFIG!, '{ not json');
  assert.equal(workspaceSetting(), null);
  writeConfig({ workspace: '  ' });
  assert.equal(workspaceSetting(), null);
});

test('`workspace` in the config puts every folder there, ~ expanded', () => {
  writeConfig({ workspace: '~/Somewhere/MM', library: {} });
  assert.deepEqual(workspaceSetting(), { root: path.join(HOME, 'Somewhere', 'MM'), from: 'config' });
  const dirs = workspaceDirs(STUDIO);
  for (const name of NAMES) assert.equal(dirs[name], path.join(HOME, 'Somewhere', 'MM', ...WORKSPACE_FOLDERS[name].split('/')));
});

test('MEDIAMAKE_WORKSPACE wins over the config', () => {
  writeConfig({ workspace: '~/FromConfig' });
  process.env.MEDIAMAKE_WORKSPACE = path.join(tmp, 'ws');
  assert.deepEqual(workspaceSetting(), { root: path.join(tmp, 'ws'), from: 'env' });
  assert.equal(workspaceDir('out', STUDIO), path.join(tmp, 'ws', 'out'));
});

test('studio paths name the same file wherever the workspace is', () => {
  const inRepo = path.join(STUDIO, 'out', 'nakama', 'nakama.mp4');
  assert.equal(toStudioPath(inRepo, STUDIO), 'out/nakama/nakama.mp4');
  assert.equal(fromStudioPath('out/nakama/nakama.mp4', STUDIO), inRepo);
  assert.equal(toStudioPath(path.join(STUDIO, 'src', 'kit', 'index.ts'), STUDIO), 'src/kit/index.ts');

  process.env.MEDIAMAKE_WORKSPACE = path.join(tmp, 'ws');
  const outside = path.join(tmp, 'ws', 'thumbnails', 'jobs', 'cover', 'thumbs.json');
  assert.equal(toStudioPath(outside, STUDIO), 'thumbnails/jobs/cover/thumbs.json');
  assert.equal(fromStudioPath('thumbnails/jobs/cover/thumbs.json', STUDIO), outside);
  // the engine stays in the studio
  assert.equal(fromStudioPath('thumbnails/Root.tsx', STUDIO), path.join(STUDIO, 'thumbnails', 'Root.tsx'));
  assert.equal(fromStudioPath('src/kit', STUDIO), path.join(STUDIO, 'src', 'kit'));
  assert.equal(fromStudioPath('projects', STUDIO), path.join(tmp, 'ws', 'projects'));
  // in neither: kept absolute
  assert.equal(toStudioPath('/elsewhere/x.mp4', STUDIO), '/elsewhere/x.mp4');
  assert.equal(fromStudioPath('/elsewhere/x.mp4', STUDIO), '/elsewhere/x.mp4');
});

/** Each case: the env and config it runs with. */
const CASES: { name: string; env?: string; config?: object }[] = [
  { name: 'nothing set' },
  { name: 'config', config: { workspace: '~/MM-config' } },
  { name: 'env', env: '/tmp/mm-env-ws', config: { workspace: '~/MM-config' } },
];

test("the app's dev routes follow the same rule (apps/mediamake/lib/remotion-editor/server/workspace.ts)", () => {
  for (const c of CASES) {
    writeConfig(c.config ?? {});
    if (c.env) process.env.MEDIAMAKE_WORKSPACE = c.env;
    else delete process.env.MEDIAMAKE_WORKSPACE;
    assert.deepEqual(app.WORKSPACE_FOLDERS, WORKSPACE_FOLDERS);
    for (const name of NAMES) assert.equal(app.workspaceDir(name, STUDIO), workspaceDir(name, STUDIO), `${c.name}: ${name}`);
    for (const rel of ['projects/a/video/index.tsx', 'out/a/a.mp4', 'thumbnails/jobs/j/thumbs.json', 'thumbnails/Root.tsx', 'src/kit']) {
      assert.equal(app.fromStudioPath(rel, STUDIO), fromStudioPath(rel, STUDIO), `${c.name}: ${rel}`);
      assert.equal(app.toStudioPath(fromStudioPath(rel, STUDIO), STUDIO), rel, `${c.name}: back to ${rel}`);
    }
  }
});

const python = spawnSync('python3', ['--version']).status === 0;

test('the Python follows the same rule (analysis/workspace.py)', { skip: !python && 'no python3 here' }, () => {
  for (const c of CASES) {
    writeConfig(c.config ?? {});
    const env = { ...process.env, MEDIAMAKE_WORKSPACE: c.env ?? '' };
    if (c.env) process.env.MEDIAMAKE_WORKSPACE = c.env;
    else delete process.env.MEDIAMAKE_WORKSPACE;
    const out = JSON.parse(execFileSync('python3', [path.join(STUDIO, 'analysis', 'workspace.py'), STUDIO], { env }).toString());
    assert.deepEqual(out, workspaceDirs(STUDIO), c.name);
  }
});

test('paths.ts: DIRS, and ledger paths that keep their apps/studio name', () => {
  const ws = path.join(tmp, 'ws');
  const script = `
    const p = await import(${JSON.stringify(path.join(STUDIO, 'scripts', 'paths.ts'))});
    const f = ${JSON.stringify(path.join(ws, 'out', 'nakama', 'nakama.mp4'))};
    console.log(JSON.stringify({ projects: p.DIRS.projects, cleanup: p.DIRS.cleanup, repo: p.repoPath(f), back: p.fromRepoPath(p.repoPath(f)),
      engine: p.repoPath(${JSON.stringify(path.join(STUDIO, 'src', 'kit', 'index.ts'))}), kind: p.kindOf(${JSON.stringify(path.join(ws, 'projects', 'nakama', 'input', 'song.mp3'))}),
      shown: p.shown(f) }));`;
  const run = (env: Record<string, string | undefined>) =>
    JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], { env: { ...process.env, ...env } }).toString());
  const r = run({ MEDIAMAKE_WORKSPACE: ws });
  assert.equal(r.projects, path.join(ws, 'projects'));
  assert.equal(r.cleanup, path.join(ws, 'out', '.cleanup'));
  assert.equal(r.repo, 'apps/studio/out/nakama/nakama.mp4');
  assert.equal(r.back, path.join(ws, 'out', 'nakama', 'nakama.mp4'));
  assert.equal(r.engine, 'apps/studio/src/kit/index.ts');
  assert.equal(r.kind, 'source');
  const d = run({ MEDIAMAKE_WORKSPACE: '' });
  assert.equal(d.projects, path.join(STUDIO, 'projects'));
});

test('workspaceWebpack changes nothing while everything is in the studio', () => {
  const config = { plugins: [], resolve: { alias: { react: '/r' } } };
  assert.equal(workspaceWebpack(config, { studio: STUDIO }), config);
  assert.equal(workspaceWebpack(config, { studio: STUDIO, root: STUDIO }), config);
});

test('workspaceWebpack points the contexts, packages and engine at an outside workspace', () => {
  const ws = path.join(tmp, 'ws');
  process.env.MEDIAMAKE_WORKSPACE = ws;
  const config = { plugins: [], resolve: { alias: { react: '/r' } } };
  const out = workspaceWebpack(config, { studio: STUDIO }) as unknown as { plugins: { constructor: { name: string }; resourceRegExp: RegExp; newContentResource: string }[]; resolve: { modules: string[]; alias: Record<string, string> } };
  const contexts = out.plugins.filter(p => p.constructor.name === 'ContextReplacementPlugin');
  assert.deepEqual(contexts.map(p => p.newContentResource), [path.join(ws, 'projects'), path.join(ws, 'brands'), path.join(ws, 'thumbnails', 'jobs')]);
  assert.ok(contexts[0].resourceRegExp.test(path.join(STUDIO, 'projects')));
  assert.ok(!contexts[0].resourceRegExp.test(path.join(STUDIO, 'projects', 'x')));
  assert.deepEqual(out.resolve.modules, ['node_modules', path.join(STUDIO, 'node_modules'), path.resolve(STUDIO, '..', '..', 'node_modules')]);
  assert.equal(out.resolve.alias.react, '/r');
  assert.equal(out.resolve.alias[path.join(ws, 'src')], path.join(STUDIO, 'src'));
});

test('the overlay: framework entries of the studio, never the workspace folders', () => {
  const aliases = overlayAliases(STUDIO, '/ws');
  assert.equal(aliases['/ws/src'], path.join(STUDIO, 'src'));
  assert.equal(aliases['/ws/catalog'], path.join(STUDIO, 'catalog'));
  assert.equal(aliases['/ws/logoGraphics'], path.join(STUDIO, 'logoGraphics'));
  // thumbnails/ is opened: its engine files are aliased (with and without the extension), its jobs are not
  assert.equal(aliases['/ws/thumbnails/Thumbnail.tsx'], path.join(STUDIO, 'thumbnails', 'Thumbnail.tsx'));
  assert.equal(aliases['/ws/thumbnails/Thumbnail'], path.join(STUDIO, 'thumbnails', 'Thumbnail'));
  for (const own of ['/ws/projects', '/ws/out', '/ws/brands', '/ws/thumbnails', '/ws/thumbnails/jobs', '/ws/overlays', '/ws/notes', '/ws/node_modules']) assert.equal(aliases[own], undefined, own);
});
