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
 *
 * MM_BUNDLE=fresh bundles again (and replaces the kept bundle); MM_BUNDLE=off bundles into a temp
 * folder like before, nothing kept.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle, type WebpackOverrideFn } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind-v4';
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
  const own = ['project-bundle.ts', 'only-project.ts', 'snapshots.ts', 'webpack-cache.ts', 'locks.ts', 'workspace.ts', 'workspace-webpack.ts'].map(f => {
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

const rm = (dir: string) => fs.rmSync(dir, { recursive: true, force: true });

/** Removes this project's old bundles (not in use), and every cache and bundle of projects not used lately. */
function prune(slug: string) {
  // this project: every bundle but the kept one, unless a process still renders from it
  const mine = readJson<Deps>(path.join(BUNDLES, slug, 'deps.json'));
  for (const name of safeList(path.join(BUNDLES, slug))) {
    const dir = path.join(BUNDLES, slug, name);
    if (name === 'deps.json' || name === '.lock' || name === mine?.current) continue;
    if (/^\.tmp-(\d+)-/.test(name) && alive(Number(name.split('-')[1]))) continue;
    if (!inUse(dir)) rm(dir);
  }
  // other projects: keep the most recently used KEEP
  const all = safeList(BUNDLES)
    .map(s => readJson<Deps>(path.join(BUNDLES, s, 'deps.json')))
    .filter((d): d is Deps => Boolean(d?.slug))
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
  const kept = new Set(all.slice(0, KEEP).map(d => d.webpackCache).filter(Boolean));
  for (const d of all.slice(KEEP)) {
    const dir = path.join(BUNDLES, d.slug);
    if (safeList(dir).some(n => inUse(path.join(dir, n)))) continue;
    rm(dir);
    if (d.webpackCache && !kept.has(d.webpackCache)) rm(path.join(WEBPACK_CACHE_DIR, d.webpackCache));
  }
  // webpack caches no kept project uses any more (a config change gives a project a new one)
  for (const env of safeList(WEBPACK_CACHE_DIR)) {
    if (!env.startsWith('remotion-production-')) continue;
    for (const hash of safeList(path.join(WEBPACK_CACHE_DIR, env))) {
      const name = path.join(env, hash);
      const dir = path.join(WEBPACK_CACHE_DIR, name);
      const age = Date.now() - (fs.statSync(dir, { throwIfNoEntry: false })?.mtimeMs ?? 0);
      // a cache being written right now has no deps.json pointing at it yet
      if (!kept.has(name) && !all.slice(0, KEEP).some(d => d.webpackCache === name) && age > 60 * 60 * 1000) rm(dir);
    }
  }
}

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
  const entry = path.join(ROOT, 'src', 'index.ts');
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
    const made = reuse();
    if (made) {
      log(`Bundle: ${slug} was just bundled by another process, reusing it`);
      return made;
    }
    const record = new RecordDepsPlugin();
    const bundleStart = Date.now();
    const tmp = path.join(dir, `.tmp-${process.pid}-${crypto.randomBytes(3).toString('hex')}`);
    const override = studioWebpack(slug);
    let lastShown = -25;
    await bundle({
      entryPoint: entry,
      publicDir,
      outDir: tmp,
      // linked, not copied: projects/ is tens of GB (bundle.ts)
      symlinkPublicDir: true,
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
      prune(slug);
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
  if (!slug) {
    console.error('Usage: mm bundle <slug>   (MM_BUNDLE=fresh to bundle again)');
    process.exit(1);
  }
  const b = await projectBundle(slug);
  console.log(b.serveUrl);
  // keep using it after this process ends: the in-use marker is this process's own
  process.exit(0);
}
