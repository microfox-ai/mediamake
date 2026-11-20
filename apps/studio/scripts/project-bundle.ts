/**
 * project-bundle: one Remotion bundle per project, made once and reused by every render, clip, look,
 * short format and stills run until the code it was built from changes (refactor step B1: P1, P2).
 *
 * Before this, every render bundled its project from scratch (6–7 s on the M3 Pro, about half of a
 * look preview), because webpack's cache was off: it didn't know which project a bundle was
 * narrowed to, and two sessions rendering two projects at once got each other's bundle (2026-11-04).
 *
 * - **Webpack's cache per project.** The config carries the project's name (only-project.ts), so
 *   each project has its own cache and they can't be mixed up. The caches live in
 *   node_modules/.cache/mediamake/webpack, where the Remotion CLI's "cache disabled / config
 *   changed: clearing" never reaches them. A rebundle after a code change takes seconds.
 * - **Bundle once, render many.** A bundle is kept in node_modules/.cache/mediamake/bundles/<slug>/<fp>/
 *   with the list of files webpack read for it (deps.json). <fp> is a fingerprint of those files
 *   (path, size, modified time), the paths webpack looked for and didn't find, and the project's
 *   composition entries (video/index.tsx, shorts/<id>/index.tsx). The next run stats them (about
 *   15 ms) and reuses the bundle when nothing changed.
 * - Two processes never bundle the same project at once (a lock per project). A bundle in use by a
 *   running process is never deleted. The caches and bundles of all but the most recently used
 *   projects (MM_BUNDLE_KEEP, default 8) are removed; one project's cache is about 0.5 GB.
 * - The public dir (projects/) is linked into the bundle, never copied: on Windows Remotion copied
 *   it (many GB a bundle) and the kept bundles filled C: on 2026-11-19, so it is a junction there
 *   (linked-public.ts).
 * - So the store can't fill a disk again, each new bundle also removes: half-made bundles of
 *   processes that are gone, other projects' bundles this code can't reuse (made by other code, or
 *   with public copied), the bundles and caches of projects unused for MM_BUNDLE_DAYS (default 5),
 *   and, while the disk has less than MM_BUNDLE_MIN_FREE_GB free (default 20), other projects'
 *   bundles and caches, least recently used first. `mm bundle --prune` does the same now;
 *   `mm doctor` shows the store's size.
 *
 * MM_BUNDLE=fresh bundles again (and replaces the kept bundle); MM_BUNDLE=off bundles into a temp
 * folder like before, nothing kept.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WebpackOverrideFn } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind-v4';
import { bundleLinked, freeSpace, publicIsLinked, removeBundleDir, sizeOf } from './linked-public.ts';
import { acquireLock, alive, onExit, readJson, writeJsonAtomic } from './locks.ts';
import { onlyProject } from './only-project.ts';
import { timestampSnapshots } from './snapshots.ts';
import { studioCache, studioCacheDir } from './webpack-cache.ts';
import { workspaceDir } from './workspace.ts';
import { workspaceWebpack } from './workspace-webpack.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REPO = path.resolve(ROOT, '..', '..');
const STORE = path.join(ROOT, 'node_modules', '.cache', 'mediamake');
const WEBPACK_CACHE_DIR = studioCacheDir(ROOT);
const BUNDLES = path.join(STORE, 'bundles');
const SCHEMA = 'mediamake.bundle-deps/v1';
const KEEP = Math.max(1, Number(process.env.MM_BUNDLE_KEEP) || 8);
const DAY = 24 * 60 * 60 * 1000;
const MAX_AGE = Math.max(0.5, Number(process.env.MM_BUNDLE_DAYS) || 5) * DAY;
const MIN_FREE = Math.max(0, Number(process.env.MM_BUNDLE_MIN_FREE_GB) || 20) * 2 ** 30;
const ENTRY = path.join(ROOT, 'src', 'index.ts');

type Deps = {
  schema: typeof SCHEMA;
  slug: string;
  /** what the bundle was made with: Remotion, the app's bundling code, the installed packages */
  key: string;
  files: string[];
  missing: string[];
  /** the fingerprint of the kept bundle (its folder name) */
  current: string | null;
  /** webpack's cache for this project, relative to WEBPACK_CACHE_DIR */
  webpackCache: string | null;
  lastUsed: string;
};

export type ProjectBundle = { serveUrl: string; reused: boolean; ms: number };

const sha1 = (s: string) => crypto.createHash('sha1').update(s).digest('hex');
const statLine = (file: string) => {
  try {
    const s = fs.statSync(file);
    return `${s.size}:${Math.round(s.mtimeMs)}`;
  } catch {
    return 'x';
  }
};

/** Records what the compilation read, for the fingerprint (no enumerable fields: webpack's config hash stays the same). */
class RecordDepsPlugin {
  declare readonly record: { files: string[]; missing: string[]; cacheName: string | null };
  constructor() {
    Object.defineProperty(this, 'record', { value: { files: [], missing: [], cacheName: null }, enumerable: false });
  }
  apply(compiler: { options: { cache?: unknown }; hooks: { done: { tap: (name: string, fn: (stats: { compilation: { fileDependencies: Iterable<string>; missingDependencies: Iterable<string> } }) => void) => void } } }) {
    const cache = compiler.options.cache as { name?: string } | false | undefined;
    this.record.cacheName = cache ? cache.name ?? null : null;
    compiler.hooks.done.tap('mediamake-record-deps', stats => {
      this.record.files = [...stats.compilation.fileDependencies].filter(f => path.isAbsolute(f)).sort();
      this.record.missing = [...stats.compilation.missingDependencies].filter(f => path.isAbsolute(f)).sort();
    });
  }
}

/**
 * The webpack config every bundle of src/index.ts gets: Tailwind (mediamake presets and atoms style
 * themselves with its classes), the studio's contexts reading the workspace (workspace-webpack.ts),
 * snapshots by timestamp (snapshots.ts), webpack's cache in our folder, and with a slug, that project
 * alone under its own cache (only-project.ts).
 */
export const studioWebpack =
  (slug: string | null | undefined): WebpackOverrideFn =>
  async config => {
    const styled = timestampSnapshots(workspaceWebpack(await enableTailwind(config), { studio: ROOT }));
    return studioCache(slug ? onlyProject(styled, slug) : styled);
  };

/** The project's composition entries, as Root.tsx's require.context finds them (folders starting with _ or . skipped). */
const entriesOf = (projectsDir: string, slug: string): string[] => {
  const dir = path.join(projectsDir, slug);
  const found: string[] = [];
  if (fs.existsSync(path.join(dir, 'video', 'index.tsx'))) found.push('video/index.tsx');
  try {
    for (const id of fs.readdirSync(path.join(dir, 'shorts')).sort()) {
      if (/^[_.]/.test(id)) continue;
      if (fs.existsSync(path.join(dir, 'shorts', id, 'index.tsx'))) found.push(`shorts/${id}/index.tsx`);
    }
  } catch {
    // no shorts
  }
  return found;
};

/** What a bundle depends on besides the files webpack read: Remotion, our bundling code, the installed packages. */
const keyFor = (slug: string, entry: string, publicDir: string) => {
  const own = ['project-bundle.ts', 'only-project.ts', 'snapshots.ts', 'webpack-cache.ts', 'locks.ts', 'linked-public.ts', 'workspace.ts', 'workspace-webpack.ts', 'engine.ts', '../engine.json'].map(f => {
    try {
      return sha1(fs.readFileSync(path.join(HERE, f), 'utf8'));
    } catch {
      return 'x';
    }
  });
  const remotion = readJson<{ version: string }>(createRequire(import.meta.url).resolve('@remotion/bundler/package.json'))?.version;
  return sha1(JSON.stringify({ slug, entry, publicDir, remotion, own, node: process.versions.node.split('.')[0], installed: statLine(path.join(REPO, 'node_modules', '.package-lock.json')) }));
};

const fingerprint = (deps: Pick<Deps, 'key' | 'files' | 'missing'>, entries: string[]) => {
  const h = crypto.createHash('sha1').update(deps.key).update('\0').update(entries.join('\n'));
  for (const f of deps.files) h.update(`\n${f}\t${statLine(f)}`);
  for (const f of deps.missing) h.update(`\n?${f}\t${fs.existsSync(f) ? 1 : 0}`);
  return h.digest('hex').slice(0, 16);
};

/** Marks a bundle as in use by this process until it ends (prune never removes it meanwhile). */
const useBundle = (dir: string) => {
  const users = path.join(dir, '.users');
  fs.mkdirSync(users, { recursive: true });
  const mine = path.join(users, String(process.pid));
  fs.writeFileSync(mine, new Date().toISOString());
  onExit(() => fs.rmSync(mine, { force: true }));
  const now = new Date();
  fs.utimesSync(dir, now, now);
};

const inUse = (dir: string) => {
  try {
    return fs.readdirSync(path.join(dir, '.users')).some(p => Number(p) !== process.pid && alive(Number(p)));
  } catch {
    return false;
  }
};

/** Removes a bundle or a project's bundles: a linked public dir is unlinked, never emptied (linked-public.ts). */
const rm = removeBundleDir;

const gb = (n: number) => `${(n / 2 ** 30).toFixed(1)} GB`;

/** A half-made bundle (.tmp-<pid>-…) whose process is gone. */
const deadTmp = (name: string) => /^\.tmp-(\d+)-/.test(name) && !alive(Number(name.split('-')[1]));

/** Whether any bundle of a project is in use, or being made by a live process. */
const projectBusy = (slug: string) =>
  safeList(path.join(BUNDLES, slug)).some(n => (n.startsWith('.tmp-') ? !deadTmp(n) : inUse(path.join(BUNDLES, slug, n))));

type Removed = { what: string; bytes: number };

/**
 * Tidies the store. `slug`: the project just bundled (its kept bundle stays, whatever the rules say).
 * Returns what it removed. Never removes a bundle a live process uses or is making.
 */
export function prune(slug: string | null, opts: { publicDir?: string } = {}): Removed[] {
  const removed: Removed[] = [];
  const drop = (dir: string, what: string) => {
    const bytes = sizeOf(dir);
    rm(dir);
    removed.push({ what, bytes });
  };
  const publicDir = opts.publicDir ?? workspaceDir('projects', ROOT);
  const mine = slug ? readJson<Deps>(path.join(BUNDLES, slug, 'deps.json')) : null;
  // every project: half-made bundles whose process is gone; this project: every bundle but the kept one
  for (const s of safeList(BUNDLES)) {
    for (const name of safeList(path.join(BUNDLES, s))) {
      const dir = path.join(BUNDLES, s, name);
      if (deadTmp(name)) drop(dir, `${s}: a half-made bundle`);
      else if (s === slug && !name.startsWith('.tmp-') && !['deps.json', '.lock', mine?.current].includes(name) && !inUse(dir)) drop(dir, `${s}: an old bundle`);
    }
    // a folder left with nothing in it
    if (!safeList(path.join(BUNDLES, s)).length) fs.rmSync(path.join(BUNDLES, s), { recursive: true, force: true });
  }
  const all = () =>
    safeList(BUNDLES)
      .map(s => readJson<Deps>(path.join(BUNDLES, s, 'deps.json')))
      .filter((d): d is Deps => Boolean(d?.slug))
      .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
  /** a project's bundles and webpack cache, unless one is in use; the cache stays when `keptCaches` has it */
  const dropProject = (d: Deps, why: string, keptCaches: Set<string | null>) => {
    if (d.slug === slug || projectBusy(d.slug)) return;
    drop(path.join(BUNDLES, d.slug), `${d.slug}: its bundles (${why})`);
    const cache = d.webpackCache && path.join(WEBPACK_CACHE_DIR, d.webpackCache);
    if (cache && !keptCaches.has(d.webpackCache) && fs.existsSync(cache)) drop(cache, `${d.slug}: its webpack cache (${why})`);
  };
  // other projects: bundles this code never reuses (made by other code, or with public copied); the cache stays
  for (const d of all()) {
    if (d.slug === slug) continue;
    const stale = d.schema !== SCHEMA || d.key !== keyFor(d.slug, ENTRY, publicDir);
    for (const name of safeList(path.join(BUNDLES, d.slug))) {
      const dir = path.join(BUNDLES, d.slug, name);
      if (name.startsWith('.') || !fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory() || inUse(dir)) continue;
      const copied = fs.existsSync(path.join(dir, 'public')) && !publicIsLinked(dir);
      if (stale || copied) drop(dir, `${d.slug}: a bundle ${copied ? 'holding a copy of projects/' : 'made by other code'}`);
    }
  }
  // other projects: keep the KEEP used last, if used within MAX_AGE
  {
    const list = all();
    const recent = list.slice(0, KEEP).filter(d => d.slug === slug || Date.now() - Date.parse(d.lastUsed) < MAX_AGE);
    const kept = new Set(recent.map(d => d.webpackCache).filter(Boolean));
    for (const [i, d] of list.entries())
      if (!recent.includes(d)) dropProject(d, i >= KEEP ? `not among the ${KEEP} used last` : `unused for ${Math.round(MAX_AGE / DAY)} days`, kept);
  }
  // the disk is nearly full: other projects' bundles and caches, least recently used first
  const free = freeSpace(BUNDLES);
  if (free !== null && free < MIN_FREE) {
    const list = all();
    for (const d of [...list].reverse()) {
      if ((freeSpace(BUNDLES) ?? Infinity) >= MIN_FREE) break;
      dropProject(d, `the disk had ${gb(free)} free`, new Set(list.filter(o => o.slug !== d.slug).map(o => o.webpackCache).filter(Boolean)));
    }
  }
  // webpack caches no kept project uses any more (a config change gives a project a new one)
  const used = new Set(all().map(d => d.webpackCache).filter(Boolean));
  for (const env of safeList(WEBPACK_CACHE_DIR)) {
    if (!env.startsWith('remotion-production-')) continue;
    for (const hash of safeList(path.join(WEBPACK_CACHE_DIR, env))) {
      const name = path.join(env, hash);
      const dir = path.join(WEBPACK_CACHE_DIR, name);
      const age = Date.now() - (fs.statSync(dir, { throwIfNoEntry: false })?.mtimeMs ?? 0);
      // a cache being written right now has no deps.json pointing at it yet
      if (!used.has(name) && age > 60 * 60 * 1000) drop(dir, 'a webpack cache no project uses');
    }
  }
  return removed;
}

/** What prune removed, in one line (null for nothing). */
const removedLine = (removed: Removed[]) => {
  if (!removed.length) return null;
  const bytes = removed.reduce((n, r) => n + r.bytes, 0);
  return `Tidied the bundle store: removed ${removed.length} (${gb(bytes)}): ${removed.map(r => r.what).join('; ')}`;
};

const safeList = (dir: string) => {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/**
 * The bundle of one project (src/index.ts narrowed to projects/<slug>), reused when its code is
 * unchanged. Returns the bundle folder to pass as serveUrl (or to `remotion render <folder> …`).
 */
export async function projectBundle(slug: string, opts: { projectsDir?: string; quiet?: boolean } = {}): Promise<ProjectBundle> {
  const started = Date.now();
  const entry = ENTRY;
  const publicDir = opts.projectsDir ?? workspaceDir('projects', ROOT);
  const log = (msg: string) => opts.quiet || console.log(msg);
  const mode = process.env.MM_BUNDLE;
  const dir = path.join(BUNDLES, slug);
  const depsFile = path.join(dir, 'deps.json');
  const key = keyFor(slug, entry, publicDir);

  const reuse = (): ProjectBundle | null => {
    if (mode === 'fresh' || mode === 'off') return null;
    const deps = readJson<Deps>(depsFile);
    if (!deps || deps.schema !== SCHEMA || deps.key !== key || !deps.current) return null;
    const fp = fingerprint(deps, entriesOf(publicDir, slug));
    const serveUrl = path.join(dir, fp);
    if (fp !== deps.current || !fs.existsSync(path.join(serveUrl, 'index.html'))) return null;
    useBundle(serveUrl);
    writeJsonAtomic(depsFile, { ...deps, lastUsed: new Date().toISOString() });
    return { serveUrl, reused: true, ms: Date.now() - started };
  };

  const hit = reuse();
  if (hit) {
    log(`Bundle: ${slug} unchanged, reusing it (${seconds(hit.ms)})`);
    return hit;
  }

  const release = await acquireLock(path.join(dir, '.lock'), `bundle ${slug}`, {
    onWait: holder => log(`Waiting for another bundle of ${slug} (pid ${holder.pid}) to finish…`),
  });
  try {
    // another process may have made it while this one waited
    const theirs = reuse();
    if (theirs) {
      log(`Bundle: ${slug} was just bundled by another process, reusing it`);
      return theirs;
    }
    const record = new RecordDepsPlugin();
    const bundleStart = Date.now();
    const tmp = path.join(dir, `.tmp-${process.pid}-${crypto.randomBytes(3).toString('hex')}`);
    const override = studioWebpack(slug);
    let lastShown = -25;
    // linked, not copied (a junction on Windows): projects/ is tens of GB (linked-public.ts)
    const made = bundleLinked({
      entryPoint: entry,
      publicDir,
      outDir: tmp,
      enableCaching: mode !== 'off',
      onProgress: p => {
        if (opts.quiet || p < lastShown + 25) return;
        lastShown = p - (p % 25);
        process.stdout.write(`Bundling ${slug}… ${lastShown} %\r`);
      },
      webpackOverride: async config => {
        const own = await override(config);
        return { ...own, plugins: [...(own.plugins ?? []), record] };
      },
    });
    // a bundle that failed (a full disk, a code error) leaves nothing behind
    await made.catch(err => {
      rm(tmp);
      throw err;
    });
    const files = record.record.files;
    // a file changed while webpack read it: this bundle may hold the old version, so don't keep it
    const dirty = files.some(f => (fs.statSync(f, { throwIfNoEntry: false })?.mtimeMs ?? 0) > bundleStart);
    const deps: Deps = {
      schema: SCHEMA,
      slug,
      key,
      files,
      missing: record.record.missing,
      current: null,
      webpackCache: record.record.cacheName,
      lastUsed: new Date().toISOString(),
    };
    if (mode === 'off' || dirty) {
      if (dirty) log('A file changed while bundling: this bundle is used once, not kept.');
      onExit(() => rm(tmp));
      return { serveUrl: tmp, reused: false, ms: Date.now() - started };
    }
    const fp = fingerprint(deps, entriesOf(publicDir, slug));
    const serveUrl = path.join(dir, fp);
    if (fs.existsSync(path.join(serveUrl, 'index.html'))) rm(tmp);
    else {
      rm(serveUrl);
      fs.renameSync(tmp, serveUrl);
    }
    useBundle(serveUrl);
    const previous = readJson<Deps>(depsFile);
    writeJsonAtomic(depsFile, { ...deps, current: fp });
    // a config change moved this project to a new webpack cache: the old one is dead weight
    if (previous?.webpackCache && previous.webpackCache !== deps.webpackCache) rm(path.join(WEBPACK_CACHE_DIR, previous.webpackCache));
    try {
      const line = removedLine(prune(slug, { publicDir }));
      if (line) log(line);
    } catch (err) {
      console.warn(`Could not tidy old bundles: ${err instanceof Error ? err.message : err}`);
    }
    const ms = Date.now() - started;
    log(`Bundle: ${slug} in ${seconds(ms)}${previous ? '' : ' (first bundle of this project: the next ones take a few seconds)'}`);
    return { serveUrl, reused: false, ms };
  } finally {
    release();
  }
}

/** Whether a folder is a bundle this store keeps (callers must not delete it). */
export const isKeptBundle = (dir: string) => {
  const rel = path.relative(BUNDLES, path.resolve(dir));
  return !rel.startsWith('..') && !path.isAbsolute(rel) && !path.basename(rel).startsWith('.tmp-');
};

/** The store's folder, for `mm doctor`-style reports and cleanups. */
export const BUNDLE_STORE = STORE;

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  // mm bundle <slug>: make (or reuse) a project's bundle and print its folder
  const [slug] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (process.argv.includes('--prune')) {
    // mm bundle --prune: the store's rules now, without bundling anything
    console.log(removedLine(prune(null)) ?? 'The bundle store has nothing to tidy.');
    const free = freeSpace(BUNDLES);
    console.log(`Bundle store: ${gb(sizeOf(STORE))}${free === null ? '' : `, ${gb(free)} free on its disk`} (${STORE})`);
    process.exit(0);
  }
  if (!slug) {
    console.error('Usage: mm bundle <slug>   (MM_BUNDLE=fresh to bundle again)\n       mm bundle --prune   (tidy the store now)');
    process.exit(1);
  }
  const b = await projectBundle(slug);
  console.log(b.serveUrl);
  // keep using it after this process ends: the in-use marker is this process's own
  process.exit(0);
}
