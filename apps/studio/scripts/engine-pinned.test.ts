// node --experimental-strip-types --test scripts/engine-pinned.test.ts (npm run test:engine -w studio)
// A project renders with the engine it was made with (engine-pinned.ts): which engine, kept engines
// (a git worktree per pinned commit, sharing or installing packages), the render handed to the kept
// engine's mm, and pruning. All in a throwaway repo, workspace and engines folder.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { chooseEngine, dropKeptEngine, keptEngine, keptEngines, packagesKey, runWithPinnedEngine, sameEngine } from './engine-pinned.ts';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-pinned-'));
const REPO = path.join(TMP, 'repo');
const STUDIO = path.join(REPO, 'apps', 'studio');
const WS = path.join(TMP, 'ws');
const PROJECTS = path.join(WS, 'projects');
const ENGINES = path.join(TMP, 'engines');
const quiet = { log: () => {} };

const git = (...args: string[]) => execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const write = (rel: string, text: string) => {
  const file = path.join(REPO, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
const lock = (dep: string, remotion: string) =>
  json({
    name: 'fake',
    lockfileVersion: 3,
    packages: {
      '': { name: 'fake', workspaces: ['apps/*', 'packages/*'] },
      'packages/remotion': { name: '@microfox/remotion', version: remotion },
      'node_modules/@microfox/remotion': { resolved: 'packages/remotion', link: true },
      'node_modules/dep-a': { version: dep, resolved: `https://registry.example/dep-a-${dep}.tgz`, integrity: `sha512-${dep}` },
    },
  });
const engineJson = (version: string) => json({ name: '@mediamake/engine', version, entry: 'src/kit/index.ts', names: { kit: 'src/kit' } });
const commit = (message: string) => {
  git('add', '-A');
  git('commit', '-q', '-m', message);
  return git('rev-parse', 'HEAD');
};

/** The kept engine's mm: writes what it was run with to $MM_FAKE_OUT. */
const FAKE_MM = `import fs from 'node:fs';
const engine = JSON.parse(fs.readFileSync(new URL('../engine.json', import.meta.url), 'utf8')).version;
fs.writeFileSync(process.env.MM_FAKE_OUT, JSON.stringify({ argv: process.argv.slice(2), workspace: process.env.MEDIAMAKE_WORKSPACE, pinned: process.env.MM_ENGINE_PINNED, engine }));
process.exit(Number(process.env.MM_FAKE_EXIT ?? 0));
`;

let A = ''; // engine 1.0.0
let B = ''; // engine 2.0.0
let C = ''; // the same engine as B (a README, a changelog, a release's version numbers): HEAD
let Z = ''; // engine 0.5.0 with other packages, on a side branch

const ENV = ['MEDIAMAKE_ENGINES', 'MEDIAMAKE_WORKSPACE', 'MEDIAMAKE_CONFIG', 'MM_ENGINE_PINNED', 'MM_FAKE_OUT', 'MM_FAKE_EXIT'];
const saved = Object.fromEntries(ENV.map(k => [k, process.env[k]]));

before(() => {
  fs.mkdirSync(REPO, { recursive: true });
  execFileSync('git', ['init', '-q', '-b', 'main', REPO]);
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  git('config', 'commit.gpgsign', 'false');
  write('.gitignore', 'node_modules\ndist\n');
  write('package.json', json({ name: 'fake', private: true, workspaces: ['apps/*', 'packages/*'] }));
  write('package-lock.json', lock('1.0.0', '1.0.0'));
  write('packages/remotion/package.json', json({ name: '@microfox/remotion', version: '1.0.0', main: 'dist/index.js' }));
  write('packages/remotion/src/index.ts', 'export const v = 1;\n');
  write('apps/studio/engine.json', engineJson('1.0.0'));
  write('apps/studio/src/kit/index.ts', 'export const kit = 1;\n');
  write('apps/studio/bin/mm.mjs', FAKE_MM);
  A = commit('engine 1');
  // this checkout's installed packages (git ignores them)
  write('node_modules/dep-a/index.js', 'module.exports = 1;\n');
  write('node_modules/@scope/pkg/index.js', 'module.exports = 2;\n');
  write('node_modules/.cache/kept/bundle.js', '');
  write('apps/studio/node_modules/tw/index.js', '');
  write('apps/studio/node_modules/.cache/kept/bundle.js', '');
  fs.mkdirSync(path.join(REPO, 'node_modules', '@microfox'), { recursive: true });
  fs.symlinkSync('../../packages/remotion', path.join(REPO, 'node_modules', '@microfox', 'remotion'));
  fs.mkdirSync(path.join(REPO, 'node_modules', '.bin'), { recursive: true });
  fs.symlinkSync('../dep-a/index.js', path.join(REPO, 'node_modules', '.bin', 'dep-a'));
  // a breaking change
  write('apps/studio/engine.json', engineJson('2.0.0'));
  write('apps/studio/src/kit/index.ts', 'export const kit = 2;\n');
  B = commit('engine 2');
  // a release: version numbers and changelogs, the same engine
  write('README.md', 'notes\n');
  write('packages/remotion/CHANGELOG.md', '# 1.0.1\n');
  write('packages/remotion/package.json', json({ name: '@microfox/remotion', version: '1.0.1', main: 'dist/index.js' }));
  write('package-lock.json', lock('1.0.0', '1.0.1'));
  C = commit('release');
  // an old engine with other packages
  git('checkout', '-q', '-b', 'old', A);
  write('apps/studio/engine.json', engineJson('0.5.0'));
  write('package-lock.json', lock('0.9.0', '1.0.0'));
  Z = commit('engine 0.5 with other packages');
  git('checkout', '-q', 'main');
});

after(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(TMP, { recursive: true, force: true });
});

beforeEach(() => {
  process.env.MEDIAMAKE_ENGINES = ENGINES;
  process.env.MEDIAMAKE_WORKSPACE = WS;
  process.env.MEDIAMAKE_CONFIG = path.join(TMP, 'no-config.json');
  delete process.env.MM_ENGINE_PINNED;
  delete process.env.MM_FAKE_EXIT;
  process.env.MM_FAKE_OUT = path.join(TMP, 'mm-run.json');
});

/** A project in the workspace pinned to <engine> (or with no pin). */
const project = (slug: string, engine?: { version: string; commit?: string }) => {
  const dir = path.join(PROJECTS, slug);
  fs.mkdirSync(path.join(dir, 'video'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'input'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'video', 'index.tsx'), 'export default {};\n');
  fs.writeFileSync(path.join(dir, 'input', 'project.json'), json(engine ? { title: slug, engine } : { title: slug }));
  return dir;
};

test('packagesKey: what gets installed counts, the version numbers of this repo’s own packages don’t', () => {
  assert.equal(packagesKey(lock('1.0.0', '1.0.0')), packagesKey(lock('1.0.0', '2.3.4')));
  assert.notEqual(packagesKey(lock('1.0.0', '1.0.0')), packagesKey(lock('1.0.1', '1.0.0')));
});

test('sameEngine: a release that only changes notes and version numbers is the same engine; a breaking change is not', () => {
  assert.equal(sameEngine(REPO, C), true);
  assert.equal(sameEngine(REPO, B), true);
  assert.equal(sameEngine(REPO, A), false);
  assert.equal(sameEngine(REPO, Z), false);
  assert.equal(sameEngine(REPO, 'f'.repeat(40)), false, 'a commit this checkout doesn’t have');
});

test('which engine: another major renders pinned, this major here; --engine and a kept engine’s own run decide too', () => {
  assert.deepEqual(chooseEngine(project('fresh'), STUDIO), { use: 'current', pin: null });
  const old = project('old', { version: '1.0.0', commit: A });
  assert.deepEqual(chooseEngine(old, STUDIO), { use: 'pinned', pin: { version: '1.0.0', commit: A }, otherMajor: true });
  assert.equal(chooseEngine(old, STUDIO, 'current').use, 'current');
  process.env.MM_ENGINE_PINNED = A;
  assert.equal(chooseEngine(old, STUDIO).use, 'current', 'the kept engine renders it itself');
  delete process.env.MM_ENGINE_PINNED;

  const sameMajor = project('same-major', { version: '2.0.0', commit: B });
  assert.equal(chooseEngine(sameMajor, STUDIO).use, 'current');
  assert.deepEqual(chooseEngine(sameMajor, STUDIO, 'pinned'), { use: 'current', pin: { version: '2.0.0', commit: B }, why: 'same' }, 'B’s engine is this one: nothing to check out');

  const noCommit = project('no-commit', { version: '1.0.0' });
  assert.deepEqual(chooseEngine(noCommit, STUDIO), { use: 'current', pin: { version: '1.0.0' }, why: 'no-commit' }, 'nothing to check out: here, with the warning');
  assert.throws(() => chooseEngine(noCommit, STUDIO, 'pinned'), /without a commit/);
});

test('a kept engine: a worktree of the pinned commit sharing this checkout’s packages, with its own copy of this repo’s packages and caches', () => {
  const built: string[] = [];
  const build = (dir: string) => {
    built.push(dir);
    fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  };
  const dir = keptEngine(REPO, { version: '1.0.0', commit: A }, { ...quiet, build });
  assert.equal(dir, path.join(ENGINES, `1.0.0-${A.slice(0, 12)}`));
  assert.equal(execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), A);
  assert.match(fs.readFileSync(path.join(dir, 'apps', 'studio', 'src', 'kit', 'index.ts'), 'utf8'), /kit = 1/, 'the engine as it was at A');
  const real = (p: string) => fs.realpathSync(path.join(dir, p));
  assert.ok(fs.lstatSync(path.join(dir, 'node_modules')).isDirectory() && !fs.lstatSync(path.join(dir, 'node_modules')).isSymbolicLink());
  assert.equal(real('node_modules/dep-a'), fs.realpathSync(path.join(REPO, 'node_modules', 'dep-a')), 'a package: this checkout’s');
  assert.equal(real('node_modules/@scope/pkg'), fs.realpathSync(path.join(REPO, 'node_modules', '@scope', 'pkg')));
  assert.equal(real('node_modules/@microfox/remotion'), real('packages/remotion'), 'this repo’s own package: the kept engine’s copy');
  assert.equal(real('node_modules/.bin/dep-a'), fs.realpathSync(path.join(REPO, 'node_modules', 'dep-a', 'index.js')));
  assert.equal(real('apps/studio/node_modules/tw'), fs.realpathSync(path.join(REPO, 'apps', 'studio', 'node_modules', 'tw')));
  assert.equal(fs.existsSync(path.join(dir, 'node_modules', '.cache')), false, 'caches are its own');
  assert.equal(fs.existsSync(path.join(dir, 'apps', 'studio', 'node_modules', '.cache')), false);
  assert.deepEqual(built, [path.join(dir, 'packages', 'remotion')]);
  assert.equal(JSON.parse(fs.readFileSync(`${dir}.json`, 'utf8')).packages, 'shared');

  // the next render reuses it as it is
  const again = keptEngine(REPO, { version: '1.0.0', commit: A }, { ...quiet, build });
  assert.equal(again, dir);
  assert.equal(built.length, 1, 'built once');
  assert.equal(git('worktree', 'list', '--porcelain').split('\n').filter(l => l.startsWith('worktree ')).length, 2);
});

test('a kept engine with other packages installs its own; this checkout’s packages are untouched', () => {
  const installed: string[] = [];
  const install = (dir: string) => {
    installed.push(dir);
    fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', 'own.txt'), '');
  };
  const build = (dir: string) => fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  const dir = keptEngine(REPO, { version: '0.5.0', commit: Z }, { ...quiet, install, build });
  assert.deepEqual(installed, [dir]);
  assert.ok(fs.existsSync(path.join(dir, 'node_modules', 'own.txt')));
  assert.equal(fs.existsSync(path.join(dir, 'node_modules', 'dep-a')), false, 'no link to this checkout’s packages');
  assert.equal(JSON.parse(fs.readFileSync(`${dir}.json`, 'utf8')).packages, 'own');
  keptEngine(REPO, { version: '0.5.0', commit: Z }, { ...quiet, install, build });
  assert.equal(installed.length, 1, 'installed once');
  assert.ok(fs.existsSync(path.join(REPO, 'node_modules', 'dep-a', 'index.js')));
  assert.throws(() => keptEngine(REPO, { version: '9.9.9', commit: 'e'.repeat(40) }, quiet), /neither in this checkout nor on GitHub/);
});

test('mm render of a project made with another major runs the kept engine’s mm, on the same workspace', () => {
  const build = (dir: string) => fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  project('old', { version: '1.0.0', commit: A });
  const status = runWithPinnedEngine('render', 'old', ['old', '--preview', '--engine=pinned'], { studio: STUDIO, projects: PROJECTS, ...quiet, build });
  assert.equal(status, 0);
  const run = JSON.parse(fs.readFileSync(process.env.MM_FAKE_OUT!, 'utf8'));
  assert.deepEqual(run, { argv: ['render', 'old', '--preview'], workspace: WS, pinned: A, engine: '1.0.0' });
  process.env.MM_FAKE_EXIT = '3';
  assert.equal(runWithPinnedEngine('stills', 'old', ['old'], { studio: STUDIO, projects: PROJECTS, ...quiet, build }), 3, 'its exit code');

  project('same-major', { version: '2.0.0', commit: B });
  assert.equal(runWithPinnedEngine('render', 'same-major', ['same-major'], { studio: STUDIO, projects: PROJECTS }), null, 'this checkout renders it');
  assert.equal(runWithPinnedEngine('render', 'old', ['old', '--engine=current'], { studio: STUDIO, projects: PROJECTS }), null);
  assert.throws(() => runWithPinnedEngine('render', 'old', ['old', '--engine=newest'], { studio: STUDIO, projects: PROJECTS }), /pinned or current/);

  // your work still in the checkout: the kept engine couldn't find it
  delete process.env.MEDIAMAKE_WORKSPACE;
  const inCheckout = path.join(STUDIO, 'projects');
  fs.cpSync(path.join(PROJECTS, 'old'), path.join(inCheckout, 'old'), { recursive: true });
  try {
    assert.throws(() => runWithPinnedEngine('render', 'old', ['old'], { studio: STUDIO, projects: inCheckout }), /still in the checkout\. mm migrate/);
  } finally {
    fs.rmSync(inCheckout, { recursive: true, force: true });
  }
});

test('mm engine prune: kept engines no project pins go, with their links; this checkout’s packages stay', () => {
  fs.rmSync(PROJECTS, { recursive: true, force: true });
  project('old', { version: '1.0.0', commit: A });
  const kept = keptEngines(PROJECTS);
  assert.deepEqual(kept.map(k => [k.version, k.projects]).sort(), [['0.5.0', []], ['1.0.0', ['old']]]);
  const unused = kept.find(k => k.version === '0.5.0')!;
  dropKeptEngine(REPO, unused.dir);
  assert.equal(fs.existsSync(unused.dir), false);
  assert.equal(fs.existsSync(`${unused.dir}.json`), false);
  assert.doesNotMatch(git('worktree', 'list', '--porcelain'), /0\.5\.0-/);
  const shared = kept.find(k => k.version === '1.0.0')!;
  dropKeptEngine(REPO, shared.dir);
  assert.ok(fs.existsSync(path.join(REPO, 'node_modules', 'dep-a', 'index.js')), 'removing links leaves what they point at');
  assert.ok(fs.existsSync(path.join(REPO, 'apps', 'studio', 'node_modules', 'tw', 'index.js')));
  assert.deepEqual(keptEngines(PROJECTS), []);
});
