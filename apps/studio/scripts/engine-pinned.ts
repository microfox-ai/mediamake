/**
 * engine-pinned: a project renders with the engine it was made with (refactor step A4).
 *
 * A project records its engine in input/project.json, `"engine": { "version", "commit" }` (engine.ts).
 * The version is semver: a change that would break a project that worked bumps the major. So:
 * - a project pinned to this engine's major version renders here, with this checkout;
 * - a project pinned to another major (made before a breaking change, or with a newer engine than this
 *   checkout has) renders with its own: mm render, mm stills and mm preview <slug> run the mm of the
 *   pinned commit, from a kept checkout of it, on the same workspace. An approved video re-renders as
 *   it was approved, and a project moves to a new engine only when someone looks at it there
 *   (--engine=current) and runs mm engine pin <slug>.
 *
 *   --engine=pinned    the pinned engine even within this major: an exact re-render of what was approved
 *   --engine=current   this checkout's engine, whatever the pin says (how to try a project on a new one)
 *
 * A commit whose engine is this checkout's (the same studio, @microfox/remotion and packages, which most
 * commits are) renders here either way: nothing is checked out for it.
 *
 * Kept engines: one git worktree per pinned commit, `<engines>/<version>-<commit>`, where <engines> is
 * MEDIAMAKE_ENGINES or `engines/` beside the config file (~/.mediamake/engines). It is made the first
 * time a render needs it and reused after. When its packages are this checkout's (package-lock.json
 * resolves the same packages; the version numbers of this repo's own packages don't count), its
 * node_modules folders link to this checkout's, one link per package, so this repo's own packages
 * (@microfox/remotion) and every cache stay its own. When they differ it installs its own (npm ci,
 * once). Its @microfox/remotion is built there (once). mm engine lists the kept engines and mm engine
 * prune removes the ones no project pins.
 *
 * A pinned render needs your work outside the checkout (mm migrate): the kept engine finds your projects
 * in the workspace and lays it over its own folders, as this checkout does.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configFile, expandHome } from './library/config.ts';
import { currentPin, projectDirs, projectPin, type EnginePin } from './engine.ts';
import { workspaceSetting } from './workspace.ts';

export type EngineFlag = 'pinned' | 'current';
type Pinned = { version: string; commit: string };
export type EngineChoice =
  | { use: 'current'; pin: EnginePin | null; why?: 'same' | 'no-commit' | 'inside' }
  | { use: 'pinned'; pin: Pinned; otherMajor: boolean };

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const major = (v: string) => Number.parseInt(v.split('.')[0], 10);
const short = (commit?: string) => (commit ? commit.slice(0, 7) : '');
const tilde = (p: string) => (p.startsWith(os.homedir() + path.sep) ? `~${p.slice(os.homedir().length)}` : p);
const inside = (dir: string, abs: string) => abs === dir || abs.startsWith(dir + path.sep);
const lexists = (p: string) => {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
};
// package-lock.json is megabytes: room for it
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 }).trim();
const tryGit = (cwd: string, ...args: string[]) => {
  try {
    return git(cwd, ...args);
  } catch {
    return null;
  }
};
/** The checkout a studio folder is in (apps/studio → the repo). */
const repoOf = (studio: string) => path.resolve(studio, '..', '..');
/** Where the studio is inside a checkout. */
const STUDIO_IN_REPO = path.join('apps', 'studio');

/** --engine=pinned | current from a command's arguments (undefined when not given). */
export const engineFlag = (args: string[]): EngineFlag | undefined => {
  const raw = args.find(a => a.startsWith('--engine='))?.slice('--engine='.length);
  if (raw === undefined) return undefined;
  if (raw !== 'pinned' && raw !== 'current') throw new Error(`--engine takes pinned or current, not "${raw}"`);
  return raw;
};

// ── which engine

/**
 * What package-lock.json installs: every package under a node_modules folder, by version and source.
 * The entries of this repo's own packages (their version numbers, bumped by every release) don't
 * count, since node_modules links them either way.
 */
export const packagesKey = (lockText: string): string => {
  let lock: { packages?: Record<string, Record<string, unknown>> };
  try {
    lock = JSON.parse(lockText);
  } catch {
    return `unreadable:${crypto.createHash('sha1').update(lockText).digest('hex')}`;
  }
  const installed = Object.entries(lock.packages ?? {})
    .filter(([key]) => key.includes('node_modules/'))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, p]) => [key, p.version ?? null, p.resolved ?? null, p.integrity ?? null, p.link ?? null]);
  return crypto.createHash('sha1').update(JSON.stringify(installed)).digest('hex');
};

const withoutVersion = (text: string | null) => {
  if (text === null) return null;
  try {
    const { version: _, ...rest } = JSON.parse(text);
    return JSON.stringify(rest);
  } catch {
    return text;
  }
};
const readOrNull = (file: string) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

/**
 * Whether the engine at <commit> is the one this checkout has now (its studio, its @microfox/remotion
 * and the packages it installs, uncommitted changes included). False when the commit isn't here.
 */
export const sameEngine = (repo: string, commit: string): boolean => {
  if (!tryGit(repo, 'rev-parse', '--verify', '--quiet', `${commit}^{commit}`)) return false;
  const remotion = 'packages/remotion';
  const r = spawnSync(
    'git',
    ['-C', repo, 'diff', '--quiet', commit, '--', STUDIO_IN_REPO.split(path.sep).join('/'), remotion, `:(exclude)${remotion}/CHANGELOG.md`, `:(exclude)${remotion}/package.json`],
    { stdio: 'ignore' },
  );
  if (r.status !== 0) return false;
  if (withoutVersion(tryGit(repo, 'show', `${commit}:${remotion}/package.json`)) !== withoutVersion(readOrNull(path.join(repo, remotion, 'package.json')))) return false;
  const theirs = tryGit(repo, 'show', `${commit}:package-lock.json`);
  const ours = readOrNull(path.join(repo, 'package-lock.json'));
  return theirs !== null && ours !== null && packagesKey(theirs) === packagesKey(ours);
};

/**
 * Which engine renders a project: this checkout's, or the one it is pinned to (see the top of this
 * file). MM_ENGINE_PINNED is set in a kept engine that a newer one started: it renders there.
 */
export const chooseEngine = (projectDir: string, studio: string, flag?: EngineFlag): EngineChoice => {
  const pin = projectPin(projectDir);
  const slug = path.basename(projectDir);
  if (process.env.MM_ENGINE_PINNED || !pin || flag === 'current') return { use: 'current', pin };
  const here = currentPin(studio);
  if (!here) return { use: 'current', pin };
  const otherMajor = major(pin.version) !== major(here.version);
  if (!otherMajor && flag !== 'pinned') return { use: 'current', pin };
  if (!pin.commit) {
    if (flag === 'pinned') throw new Error(`${slug} records engine ${pin.version} without a commit, so there is nothing to check out: --engine=current renders it with this engine (${here.version}).`);
    return { use: 'current', pin, why: 'no-commit' };
  }
  if (pin.commit === here.commit || sameEngine(repoOf(studio), pin.commit)) return { use: 'current', pin, why: 'same' };
  return { use: 'pinned', pin: { version: pin.version, commit: pin.commit }, otherMajor };
};

// ── kept engines

/** Where kept engines are: MEDIAMAKE_ENGINES, or engines/ beside the config file (~/.mediamake/engines). */
export const enginesDir = () => {
  const env = process.env.MEDIAMAKE_ENGINES?.trim();
  return env ? path.resolve(expandHome(env)) : path.join(path.dirname(configFile()), 'engines');
};

type Mark = { version: string; commit: string; packages: 'shared' | 'own'; built?: boolean; made: string; used: string };
const markFile = (dir: string) => `${dir}.json`;
const readMark = (dir: string): Mark | null => {
  try {
    return JSON.parse(fs.readFileSync(markFile(dir), 'utf8'));
  } catch {
    return null;
  }
};
const writeMark = (dir: string, mark: Mark) => fs.writeFileSync(markFile(dir), `${JSON.stringify(mark, null, 2)}\n`);

/** The folders of a checkout that can have node_modules: the root and each workspace package. */
const moduleHomes = (root: string) => [
  '.',
  ...['apps', 'packages'].flatMap(group => {
    try {
      return fs.readdirSync(path.join(root, group), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => path.join(group, e.name));
    } catch {
      return [];
    }
  }),
];

/**
 * node_modules in <to> made of links to the packages in <from>: a package of this repo (a link into the
 * checkout, like @microfox/remotion → packages/remotion) links to the kept engine's own copy, every
 * other package to this checkout's. Caches (.cache: kept bundles, webpack's) are left out: each engine
 * has its own.
 */
const linkPackages = (from: string, to: string, repo: string, wt: string) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === '.cache') continue;
    const src = path.join(from, e.name);
    const dst = path.join(to, e.name);
    if (lexists(dst)) continue;
    if (e.isSymbolicLink()) {
      const target = path.resolve(path.dirname(src), fs.readlinkSync(src));
      const ownPackage = inside(repo, target) && !path.relative(repo, target).split(path.sep).includes('node_modules');
      const linkTo = ownPackage ? path.relative(path.dirname(dst), path.join(wt, path.relative(repo, target))) : target;
      let isDir = false;
      try {
        isDir = fs.statSync(target).isDirectory();
      } catch {}
      fs.symlinkSync(linkTo, dst, isDir ? 'dir' : 'file');
    } else if (e.isDirectory() && (e.name.startsWith('@') || e.name === '.bin')) {
      linkPackages(src, dst, repo, wt);
    } else {
      fs.symlinkSync(src, dst, e.isDirectory() ? 'dir' : 'file');
    }
  }
};

/** Removes a kept engine's node_modules folders (links are removed, never what they point at). */
const removePackages = (wt: string) => {
  for (const home of moduleHomes(wt)) fs.rmSync(path.join(wt, home, 'node_modules'), { recursive: true, force: true });
};

const sharePackages = (repo: string, wt: string) => {
  for (const home of moduleHomes(repo)) {
    const from = path.join(repo, home, 'node_modules');
    if (fs.existsSync(from) && fs.existsSync(path.join(wt, home))) linkPackages(from, path.join(wt, home, 'node_modules'), repo, wt);
  }
};

export type KeepOptions = {
  /** installs a kept engine's own packages (default: npm ci there) */
  install?: (wt: string) => void;
  /** builds its @microfox/remotion (default: npm run build there) */
  build?: (packageDir: string) => void;
  log?: (line: string) => void;
};

const run = (cmd: string, args: string[], cwd: string, what: string) => {
  const r = spawnSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error(`${what} failed in ${tilde(cwd)} (${cmd} ${args.join(' ')}).`);
};
const npmCi = (wt: string) => run(NPM, ['ci', '--no-audit', '--no-fund'], wt, 'Installing the kept engine’s packages');
const buildRemotion = (dir: string) => run(NPM, ['run', '--silent', 'build'], dir, 'Building the kept engine’s @microfox/remotion');

/** One process at a time sets up a kept engine (two sessions can render the same project at once). */
const withLock = <T>(lock: string, fn: () => T): T => {
  const until = Date.now() + 20 * 60_000;
  for (;;) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      let age = 0;
      try {
        age = Date.now() - fs.statSync(lock).mtimeMs;
      } catch {
        continue;
      }
      // left behind by a process that died while setting up
      if (age > 30 * 60_000) fs.rmSync(lock, { recursive: true, force: true });
      else if (Date.now() > until) throw new Error(`Another process is still setting up ${tilde(lock.replace(/\.lock$/, ''))}: try again when it is done.`);
      else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
};

/** The full commit, fetched from origin when this checkout doesn't have it. */
const haveCommit = (repo: string, commit: string) => {
  const local = () => tryGit(repo, 'rev-parse', '--verify', '--quiet', `${commit}^{commit}`);
  const sha = local() ?? (tryGit(repo, 'fetch', '--quiet', 'origin', commit) !== null ? local() : null);
  if (!sha) throw new Error(`Engine commit ${short(commit)} is neither in this checkout nor on GitHub (it was a commit that was never pushed), so it can't be checked out. --engine=current renders with this engine.`);
  return sha;
};

/** A kept engine for <pin>: its folder, made and set up when needed (see the top of this file). */
export const keptEngine = (repo: string, pin: Pinned, opts: KeepOptions = {}): string => {
  const log = opts.log ?? ((line: string) => console.log(line));
  const sha = haveCommit(repo, pin.commit);
  const root = enginesDir();
  fs.mkdirSync(root, { recursive: true });
  const dir = path.join(root, `${pin.version}-${sha.slice(0, 12)}`);
  return withLock(`${dir}.lock`, () => {
    const now = new Date().toISOString();
    const mark = readMark(dir);
    if (!fs.existsSync(path.join(dir, '.git'))) {
      log(`⚙ Keeping engine ${pin.version} (${short(sha)}) in ${tilde(dir)}, once …`);
      fs.rmSync(dir, { recursive: true, force: true });
      tryGit(repo, 'worktree', 'prune');
      git(repo, 'worktree', 'add', '--detach', '--quiet', dir, sha);
    }
    const theirs = tryGit(repo, 'show', `${sha}:package-lock.json`);
    const ours = readOrNull(path.join(repo, 'package-lock.json'));
    let packages: Mark['packages'];
    if (theirs !== null && ours !== null && packagesKey(theirs) === packagesKey(ours)) {
      if (mark?.packages === 'own') removePackages(dir); // this checkout has its packages now
      sharePackages(repo, dir);
      packages = 'shared';
    } else {
      if (mark?.packages !== 'own') {
        removePackages(dir);
        log(`⚙ Engine ${pin.version} uses other packages than this checkout: installing its own (npm ci, once) …`);
        (opts.install ?? npmCi)(dir);
      }
      packages = 'own';
    }
    // built once, and again after a build that didn't finish
    const remotion = path.join(dir, 'packages', 'remotion');
    const hasRemotion = fs.existsSync(path.join(remotion, 'package.json'));
    if (hasRemotion && !(mark?.built && fs.existsSync(path.join(remotion, 'dist')))) {
      writeMark(dir, { version: pin.version, commit: sha, packages, built: false, made: mark?.made ?? now, used: now });
      log(`⚙ Building engine ${pin.version}'s @microfox/remotion, once …`);
      (opts.build ?? buildRemotion)(remotion);
    }
    writeMark(dir, { version: pin.version, commit: sha, packages, built: hasRemotion, made: mark?.made ?? now, used: now });
    return dir;
  });
};

export type KeptEngine = { dir: string; version: string; commit: string; packages: Mark['packages'] | '?'; used?: string; projects: string[] };

/** The kept engines, with the projects (in <projects>) pinned to each. */
export const keptEngines = (projects: string): KeptEngine[] => {
  const root = enginesDir();
  let names: string[];
  try {
    names = fs.readdirSync(root);
  } catch {
    return [];
  }
  const pins = projectDirs(projects).map(dir => ({ slug: path.basename(dir), pin: projectPin(dir) }));
  return names
    .map(name => /^(.+)-([0-9a-f]{12})$/.exec(name))
    .filter((m): m is RegExpExecArray => Boolean(m) && fs.statSync(path.join(root, m![0])).isDirectory())
    .map(([name, version, prefix]) => {
      const dir = path.join(root, name);
      const mark = readMark(dir);
      return {
        dir,
        version,
        commit: mark?.commit ?? prefix,
        packages: mark?.packages ?? '?',
        used: mark?.used,
        projects: pins.filter(p => p.pin?.commit?.startsWith(prefix)).map(p => p.slug),
      };
    });
};

/** Removes a kept engine: its links and packages, the worktree, its record. */
export const dropKeptEngine = (repo: string, dir: string) => {
  removePackages(dir);
  if (tryGit(repo, 'worktree', 'remove', '--force', dir) === null) {
    fs.rmSync(dir, { recursive: true, force: true });
    tryGit(repo, 'worktree', 'prune');
  }
  fs.rmSync(markFile(dir), { force: true });
};

// ── the commands

export type Command = 'render' | 'stills' | 'preview';

/**
 * Runs `mm <command> <args…>` with the project's pinned engine when that is the one to use (see the
 * top of this file): its exit code, or null when this checkout renders it. `args` are the command's
 * own (the slug first); --engine is taken out of them.
 */
export const runWithPinnedEngine = (command: Command, slug: string, args: string[], opts: { studio: string; projects: string } & KeepOptions): number | null => {
  const flag = engineFlag(args);
  const choice = chooseEngine(path.join(opts.projects, slug), opts.studio, flag);
  const here = currentPin(opts.studio);
  if (choice.use === 'current') {
    if (flag === 'pinned' && choice.why === 'same') console.log(`⚙ ${slug}'s engine, ${choice.pin!.version} (${short(choice.pin!.commit)}), is this checkout's: ${command === 'preview' ? 'opening' : 'rendering'} it here.`);
    return null;
  }
  const { pin } = choice;
  const ws = workspaceSetting();
  if (!ws || path.resolve(ws.root) === path.resolve(opts.studio))
    throw new Error(
      `${slug} was made with engine ${pin.version} (${short(pin.commit)})${choice.otherMajor ? ` and this is ${here?.version}, another major version` : ''}: it renders with its own engine, which reads your projects from your workspace, and your work is still in the checkout. mm migrate moves it (a dry run first); --engine=current renders with this engine instead.`,
    );
  const dir = keptEngine(repoOf(opts.studio), pin, opts);
  const mm = path.join(dir, STUDIO_IN_REPO, 'bin', 'mm.mjs');
  if (!fs.existsSync(mm)) throw new Error(`Engine ${pin.version} (${short(pin.commit)}) has no ${path.join(STUDIO_IN_REPO, 'bin', 'mm.mjs')}: it is from before mm, so it can't render here. --engine=current renders with this engine.`);
  console.log(
    `⚙ ${slug} was made with engine ${pin.version} (${short(pin.commit)}): ${command === 'preview' ? 'opening' : 'rendering'} it with that engine, kept in ${tilde(dir)}.` +
      (choice.otherMajor && here ? ` To move it to ${here.version}: mm ${command} ${slug} --engine=current, and when it looks right, mm engine pin ${slug}.` : ''),
  );
  const r = spawnSync(process.execPath, [mm, command, ...args.filter(a => !a.startsWith('--engine='))], {
    stdio: 'inherit',
    cwd: process.env.INIT_CWD ?? process.cwd(),
    env: { ...process.env, MEDIAMAKE_WORKSPACE: ws.root, MM_ENGINE_PINNED: pin.commit },
  });
  return r.status ?? 1;
};
