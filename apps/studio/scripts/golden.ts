/**
 * golden: render fixed frames of the fixture projects (fixtures/fixtures.json) and compare them with
 * the same frames from another commit, so a refactor of the engine (a rename, a move, a new
 * package) shows it left existing videos exactly as they were.
 *
 * Usage (from the repo root):
 *   mm golden check [--against=<git ref>]   # this checkout vs <ref> (default origin/main)
 *   mm golden check --outside               # the same, with this checkout's fixtures in a workspace outside the repo
 *   mm golden shoot [--out=<dir>] [--root=<app folder>] [--outside]
 *   mm golden compare <dir A> <dir B>
 *   flags: --only=<fixture,…>  --scale=0.5 (default)  --keep (keep the staged fixtures and the worktree)
 *
 * How:
 * - Each fixture's folder is copied into <app>/.golden/<name>/ (gitignored), one level under the app
 *   like projects/<name>, so its relative imports (../../../src/kit) reach that app's own engine. The
 *   bundle's projects context and public dir point there, so the user's projects are never bundled.
 * - `check` shoots this checkout and <ref> (a git worktree in the temp folder, reused; it borrows
 *   this checkout's node_modules, so a built @microfox/remotion comes from here) with the fixtures of
 *   this checkout, then compares: byte-equal frames pass at once, others by PSNR (ffmpeg), and a
 *   failing frame gets a difference picture beside it. Exit 1 when any frame differs.
 * - --outside stages this checkout's fixtures in a workspace in the temp folder instead
 *   (<tmp>/mediamake-golden-workspace/projects/<name>), bundled the way a workspace outside the repo is
 *   (scripts/workspace-webpack.ts): it shows a project renders the same frames from there. <ref> is
 *   still shot the usual way.
 * - Frames are PNG at half size by default. Compare on one machine: fonts and GPU differ between
 *   machines, so goldens are never committed.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enableTailwind } from '@remotion/tailwind-v4';
import { renderStill, selectComposition } from '@remotion/renderer';
import webpack from 'webpack';
import { removeBundle, tempBundle } from './bundle.ts';
import { FFMPEG, FFPROBE } from './ff.ts';
import { DIRS } from './paths.ts';
import { workspaceWebpack } from './workspace-webpack.ts';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(HERE, '..', '..');
const STAGE = '.golden';
/** PSNR (dB) at or above which two frames count as the same picture */
const SAME_DB = 48;

type Fixture = { name: string; from: string; about?: string; seconds: number[] };
type Shot = { fixture: string; seconds: number; file: string };

const args = process.argv.slice(2);
const flag = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => args.includes(`--${name}`);
const positional = args.filter(a => !a.startsWith('--'));
const [command] = positional;

const readFixtures = (): Fixture[] => {
  const all = (JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'fixtures.json'), 'utf8')) as { fixtures: Fixture[] }).fixtures;
  const only = flag('only')?.split(',').filter(Boolean);
  const picked = only ? all.filter(f => only.includes(f.name)) : all;
  if (only && picked.length !== only.length) {
    const missing = only.filter(n => !all.some(f => f.name === n));
    throw new Error(`No fixture ${missing.join(', ')} in fixtures/fixtures.json (${all.map(f => f.name).join(', ')})`);
  }
  return picked;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A workspace outside the repo, for --outside: its projects/ holds the staged fixtures. */
const OUTSIDE = path.join(os.tmpdir(), 'mediamake-golden-workspace');

/** Copies the fixtures into <root>/.golden/<name>/, or with --outside into OUTSIDE/projects/<name> (taken from this checkout, whatever <root> is). */
const stage = (root: string, fixtures: Fixture[], outside = false) => {
  const dir = outside ? path.join(OUTSIDE, 'projects') : path.join(root, STAGE);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fixtures) {
    const src = path.join(HERE, f.from);
    if (!fs.existsSync(path.join(src, 'video', 'index.tsx'))) throw new Error(`${f.from} has no video/index.tsx`);
    if (!fs.existsSync(path.join(src, 'manifest.json'))) throw new Error(`${f.from} has no manifest.json (mm prepare first)`);
    fs.cpSync(src, path.join(dir, f.name), { recursive: true, dereference: true });
  }
  return dir;
};

/** Renders every fixture's seconds with the engine in <root> (an app folder: src/index.ts, src/kit, …). */
const shoot = async (root: string, out: string, fixtures: Fixture[], scale: number, outside = false): Promise<Shot[]> => {
  const staged = stage(root, fixtures, outside);
  // webpack sees real paths (macOS's temp folder is a link into /private), so match both spellings
  const projectsDir = path.join(root, 'projects');
  const projectsRe = new RegExp(`^(${[...new Set([projectsDir, fs.existsSync(projectsDir) ? fs.realpathSync(projectsDir) : projectsDir, path.join(fs.realpathSync(root), 'projects')])].map(escapeRegExp).join('|')})$`);
  // Tailwind scans for classes from the working folder: the engine being shot, not this checkout
  const cwd = process.cwd();
  process.chdir(root);
  // a single-project narrowing (scripts/only-project.ts) would hide the fixtures
  delete process.env.ONLY_PROJECT;
  const serveUrl = await tempBundle({
    entryPoint: path.join(root, 'src', 'index.ts'),
    publicDir: staged,
    // the contexts are pointed at the fixtures here, never at the user's workspace
    workspace: false,
    webpackOverride: async config => {
      const styled = await enableTailwind(config);
      // a workspace outside the repo, laid over the engine in <root>, with only the fixtures in it
      if (outside)
        return workspaceWebpack(styled, {
          studio: root,
          root: OUTSIDE,
          dirs: { projects: staged, brands: path.join(root, 'brands'), thumbnailJobs: path.join(root, 'thumbnails', 'jobs') },
        });
      // `as`: the CLI's webpack and @remotion/bundler's own copy have different types (only-project.ts)
      return {
        ...styled,
        plugins: [
          ...(styled.plugins ?? []),
          // Root.tsx's require.context('../projects', …) reads the staged fixtures instead
          new webpack.ContextReplacementPlugin(projectsRe, staged),
        ],
      } as typeof styled;
    },
  }).finally(() => process.chdir(cwd));
  const chromiumOptions = { gl: 'angle' as const };
  const browserExecutable = process.env.GOLDEN_BROWSER ?? null;
  const shots: Shot[] = [];
  try {
    for (const f of fixtures) {
      const manifest = JSON.parse(fs.readFileSync(path.join(staged, f.name, 'manifest.json'), 'utf8'));
      const inputProps = { manifest };
      const composition = await selectComposition({ serveUrl, id: f.name, inputProps, chromiumOptions, browserExecutable });
      fs.mkdirSync(path.join(out, f.name), { recursive: true });
      for (const s of f.seconds) {
        const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
        const file = path.join(out, f.name, `${s.toFixed(2)}s.png`);
        await renderStill({
          serveUrl,
          composition,
          frame,
          output: file,
          inputProps,
          imageFormat: 'png',
          scale,
          chromiumOptions,
          browserExecutable,
          timeoutInMilliseconds: 120000,
        });
        shots.push({ fixture: f.name, seconds: s, file });
        console.log(`✔ ${path.relative(process.cwd(), file)}`);
      }
    }
  } finally {
    removeBundle(serveUrl);
    if (!has('keep')) fs.rmSync(staged, { recursive: true, force: true });
  }
  return shots;
};

/** PSNR of b against a in dB (Infinity when the pixels are the same). */
const psnr = (a: string, b: string): number => {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /average:(inf|[\d.]+)/.exec(r.stderr ?? '');
  if (!m) throw new Error(`ffmpeg could not compare ${a} and ${b}:\n${(r.stderr ?? '').split('\n').slice(-4).join('\n')}`);
  return m[1] === 'inf' ? Infinity : Number(m[1]);
};

const sizeOf = (file: string) => {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim();
  return out;
};

/** Compares every frame in dir B with the same file in dir A; returns false when any differs. */
const compare = (a: string, b: string): boolean => {
  const files = (dir: string) =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { recursive: true }).map(String).filter(f => f.endsWith('.png') && !f.includes('.diff.'))
      : [];
  const inA = new Set(files(a));
  const inB = files(b);
  let ok = true;
  for (const rel of inB) {
    if (!inA.has(rel)) {
      console.log(`·  ${rel}: new here (nothing to compare with)`);
      continue;
    }
    const fa = path.join(a, rel);
    const fb = path.join(b, rel);
    if (fs.readFileSync(fa).equals(fs.readFileSync(fb))) {
      console.log(`✔  ${rel}: identical`);
      continue;
    }
    if (sizeOf(fa) !== sizeOf(fb)) {
      console.log(`✖  ${rel}: size ${sizeOf(fa)} → ${sizeOf(fb)}`);
      ok = false;
      continue;
    }
    const db = psnr(fa, fb);
    if (db >= SAME_DB) {
      console.log(`✔  ${rel}: same picture (PSNR ${db.toFixed(1)} dB)`);
      continue;
    }
    ok = false;
    const diff = fb.replace(/\.png$/, '.diff.png');
    spawnSync(FFMPEG, ['-v', 'error', '-y', '-i', fa, '-i', fb, '-lavfi', 'blend=all_mode=difference,eq=brightness=0.1:contrast=4', '-frames:v', '1', diff]);
    console.log(`✖  ${rel}: differs (PSNR ${db.toFixed(1)} dB) → ${path.relative(process.cwd(), diff)}`);
  }
  for (const rel of inA) if (!inB.includes(rel)) console.log(`·  ${rel}: only in ${a}`);
  return ok;
};

/** The app folder inside a checkout (apps/studio after the rename, apps/lyrics_videos before it). */
const appIn = (checkout: string) => {
  for (const name of ['studio', 'lyrics_videos']) {
    const dir = path.join(checkout, 'apps', name);
    if (fs.existsSync(path.join(dir, 'src', 'index.ts'))) return dir;
  }
  throw new Error(`No apps/studio or apps/lyrics_videos with src/index.ts in ${checkout}`);
};

/** A worktree of <ref>, reused across runs, with this checkout's node_modules linked in. */
const worktree = (ref: string) => {
  const sha = execFileSync('git', ['-C', REPO, 'rev-parse', '--verify', `${ref}^{commit}`]).toString().trim();
  const dir = path.join(os.tmpdir(), 'mediamake-golden', sha.slice(0, 12));
  if (!fs.existsSync(path.join(dir, '.git'))) {
    fs.rmSync(dir, { recursive: true, force: true });
    execFileSync('git', ['-C', REPO, 'worktree', 'add', '--detach', dir, sha], { stdio: 'ignore' });
  }
  const link = (from: string, to: string) => {
    if (fs.existsSync(from) && !fs.existsSync(to)) fs.symlinkSync(from, to, 'dir');
  };
  link(path.join(REPO, 'node_modules'), path.join(dir, 'node_modules'));
  link(path.join(HERE, 'node_modules'), path.join(appIn(dir), 'node_modules'));
  // the mediamake presets are built, not committed (scripts/generated.mjs): a ref from after that
  // builds its own, with its own script, before it is shot
  const app = appIn(dir);
  if (!fs.existsSync(path.join(app, 'src', 'mediamake', 'presets.json'))) {
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', path.join(app, 'scripts', 'sync-presets.ts'), '--quiet'], { cwd: app, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`Building ${ref}'s presets failed: ${(r.stderr || r.stdout).trim()}`);
  }
  return { dir, sha };
};

const main = async () => {
  const scale = Number(flag('scale') ?? 0.5);
  if (command === 'shoot') {
    const root = flag('root') ? path.resolve(flag('root')!) : HERE;
    const out = path.resolve(flag('out') ?? path.join(DIRS.out, '.golden', 'here'));
    fs.rmSync(out, { recursive: true, force: true });
    await shoot(root, out, readFixtures(), scale, has('outside'));
    console.log(`\nFrames in ${out}`);
    return;
  }
  if (command === 'compare') {
    const [, a, b] = positional;
    if (!a || !b) throw new Error('Usage: golden compare <dir A> <dir B>');
    process.exit(compare(path.resolve(a), path.resolve(b)) ? 0 : 1);
  }
  if (command === 'check') {
    const ref = flag('against') ?? 'origin/main';
    const fixtures = readFixtures();
    const base = path.join(DIRS.out, '.golden');
    const { dir, sha } = worktree(ref);
    const theirs = path.join(base, `ref-${sha.slice(0, 12)}`);
    const ours = path.join(base, 'here');
    for (const d of [theirs, ours]) fs.rmSync(d, { recursive: true, force: true });
    console.log(`Shooting ${ref} (${sha.slice(0, 12)}) …`);
    await shoot(appIn(dir), theirs, fixtures, scale);
    console.log(`Shooting this checkout${has('outside') ? `, its fixtures in ${OUTSIDE}` : ''} …`);
    await shoot(HERE, ours, fixtures, scale, has('outside'));
    console.log(`\nComparing this checkout with ${ref}:`);
    const ok = compare(theirs, ours);
    if (!has('keep')) execFileSync('git', ['-C', REPO, 'worktree', 'remove', '--force', dir], { stdio: 'ignore' });
    console.log(ok ? `\nEvery frame matches ${ref}.` : `\nSome frames differ from ${ref}: look at the .diff.png files in ${path.relative(process.cwd(), ours)}.`);
    process.exit(ok ? 0 : 1);
  }
  console.error('Usage: mm golden check [--against=<ref>] [--outside] | shoot [--out=<dir>] [--root=<app>] [--outside] | compare <a> <b>');
  process.exit(1);
};

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
