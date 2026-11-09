/**
 * migrate: moves your work out of the checkout, into your workspace (~/MediaMake unless you name
 * another), and finishes the 2026-11 rename on the way: what git left in apps/lyrics_videos goes to
 * apps/studio first.
 *
 *   mm migrate               what would move and what would change (nothing changes)
 *   mm migrate --yes         do it
 *   mm migrate --to=<dir>    another workspace folder (or move the workspace you have to <dir>)
 *
 * Into the workspace: projects/, out/, brand kits (brands/), thumbnail jobs (thumbnails/jobs/) and
 * overlays/ from apps/studio, and notes/, skills/ and extensions/ when they were in ~/MediaMake and the
 * workspace is elsewhere. Files git tracks stay (the sample-pulse example; a copy of it goes to the
 * workspace so it still renders there). Then:
 * - "workspace" in ~/.mediamake/config.json names it, so every script, Remotion, the app's dev routes
 *   and the Python analysis use it (scripts/workspace.ts);
 * - the workspace gets a node_modules link and a tsconfig.json (workspace-setup.ts), so projects
 *   type-check there;
 * - .claude/settings.local.json lists it in additionalDirectories, so Claude Code sessions in the repo
 *   can open it;
 * - each folder it left gets a MOVED.md saying where its files went.
 *
 * How it moves (both steps):
 * - Folders are merged. A file that is already there with the same content is dropped from the old
 *   folder; one with other content stays where it is, listed, for you to settle.
 * - Rebuildable things are deleted instead of merged: __pycache__, .DS_Store, and node_modules or
 *   analysis/.venv when apps/studio already has its own. A venv that moves keeps working (its
 *   scripts are pointed at the new folder).
 * - The media library's catalog (projects' clones, productions, deliveries), text files you made (job
 *   JSON, notes, logs) and links that name an old folder's full path are pointed at the new one.
 * - The inbox watcher (`media init --watch`) is reinstalled if it runs the old folder's script.
 *
 * On one disk a move is a rename: 40 GB of projects move in a moment. So the workspace goes on the
 * studio's disk: when ~/MediaMake is on another one (a checkout on an external drive), it is
 * MediaMake/ next to the checkout instead, which also keeps the library's clones possible.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { configFile, expandHome, hasConfig, loadConfig, saveWorkspace } from './library/config.ts';
import { tx } from './library/db.ts';
import { exportLibrary } from './library/export.ts';
import { openLibrary } from './library/lib.ts';
import { rendering, size } from './library/sys.ts';
import { REPO, ROOT, shown } from './paths.ts';
import { setupWorkspace } from './workspace-setup.ts';
import { DEFAULT_WORKSPACE, STUDIO_FOLDERS, WORKSPACE_FOLDERS, workspaceDir, workspaceSetting, type WorkspaceFolder } from './workspace.ts';

/** Deleted wherever they are: rebuilt by whatever made them. */
const JUNK = new Set(['__pycache__', '.DS_Store']);
/** Moved whole when apps/studio has none yet, else deleted (never merged file by file). */
const WHOLE = new Set(['node_modules', '.venv']);
/** Files whose text may name the old folder's full path (job files, notes, logs, edit lists). */
const TEXT = /\.(json|jsonl|md|txt|csv|tsv|ya?ml|toml|html|srt|vtt|lrc|ass|xml|sh|py|ts|tsx|js|mjs)$/i;
const TEXT_MAX = 4 << 20;

export type Move = { rel: string; bytes: number; files: number };
/** Old folder → new folder, as whole paths. */
export type Pairs = [string, string][];
export type Plan = {
  from: string;
  to: string;
  /** entries renamed into place whole (the new folder has nothing there) */
  moves: Move[];
  /** files already in the new folder with the same content: the old copy is deleted */
  same: string[];
  /** files in both with different content (or a file where the other has a folder): left where they are */
  conflicts: string[];
  /** junk, and node_modules or .venv the new folder already has: deleted */
  rebuild: string[];
  /** moved text files that name an old folder's full path (relative to either folder) */
  texts: string[];
  /** moved links whose target moves too, or that point outside what moves: pointed at it again */
  links: string[];
  /** files the caller keeps where they are (the ones git tracks) */
  kept: string[];
};

const lstat = (p: string) => {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
};

const inside = (dir: string, abs: string) => abs === dir || abs.startsWith(dir + path.sep);

/** Where a path is after the move: the first pair whose old folder holds it. */
const moved = (abs: string, pairs: Pairs) => {
  for (const [o, n] of pairs) if (inside(o, abs)) return n + abs.slice(o.length);
  return abs;
};

/**
 * What a link at `link` (moved from `old`) should point at: its target's new place. A relative link
 * stays relative while its target moves with it; one whose target stays behind becomes absolute.
 */
export const retarget = (old: string, link: string, target: string, pairs: Pairs) => {
  const was = path.isAbsolute(target) ? target : path.resolve(path.dirname(old), target);
  const now = moved(was, pairs);
  if (path.isAbsolute(target)) return now;
  return pairs.some(([o]) => inside(o, was)) ? path.relative(path.dirname(link), now) : now;
};

/** Same bytes (or, for links, the same target), read a chunk at a time. */
const sameContent = (a: string, b: string, sa: fs.Stats, sb: fs.Stats) => {
  if (sa.isSymbolicLink() || sb.isSymbolicLink()) return sa.isSymbolicLink() && sb.isSymbolicLink() && fs.readlinkSync(a) === fs.readlinkSync(b);
  if (!sa.isFile() || !sb.isFile() || sa.size !== sb.size) return false;
  const fa = fs.openSync(a, 'r');
  const fb = fs.openSync(b, 'r');
  try {
    const ba = Buffer.alloc(1 << 20);
    const bb = Buffer.alloc(1 << 20);
    for (let pos = 0; pos < sa.size; ) {
      const n = fs.readSync(fa, ba, 0, ba.length, pos);
      if (n <= 0) return false;
      fs.readSync(fb, bb, 0, n, pos);
      if (!ba.subarray(0, n).equals(bb.subarray(0, n))) return false;
      pos += n;
    }
    return true;
  } finally {
    fs.closeSync(fa);
    fs.closeSync(fb);
  }
};

/**
 * What moving `from` into `to` would do. Nothing changes. `pairs` are every old folder → new folder of
 * this migration (for the text files and links that name them); `keep` are files (relative to `from`)
 * that stay where they are.
 */
export const planMigration = (from: string, to: string, pairs: Pairs = [[from, to]], keep: ReadonlySet<string> = new Set()): Plan => {
  const plan: Plan = { from, to, moves: [], same: [], conflicts: [], rebuild: [], texts: [], links: [], kept: [] };
  const olds = pairs.map(([o]) => o);
  // the folders that hold a kept file are walked into, never moved whole
  const keepDirs = new Set<string>();
  for (const k of keep) for (let d = path.dirname(k); d !== '.' && d !== path.sep; d = path.dirname(d)) keepDirs.add(d);

  /** Size of an entry moved whole, and its text files and links that name an old folder. */
  const survey = (top: string) => {
    let bytes = 0;
    let files = 0;
    const walk = (r: string, scan: boolean) => {
      const a = path.join(from, r);
      const st = lstat(a);
      if (!st) return;
      if (st.isDirectory()) {
        // packages never name the user's folders, and a venv's own scripts are fixed by fixVenv
        const inner = scan && !WHOLE.has(path.basename(a));
        for (const e of fs.readdirSync(a)) walk(path.join(r, e), inner);
        return;
      }
      bytes += st.size;
      files++;
      if (st.isSymbolicLink()) {
        const target = fs.readlinkSync(a);
        const was = path.isAbsolute(target) ? target : path.resolve(path.dirname(a), target);
        // a relative link inside what moves whole keeps working; any other is checked
        const within = !path.isAbsolute(target) && inside(path.join(from, top), was);
        if (!within && retarget(a, path.join(to, r), target, pairs) !== target) plan.links.push(r);
        return;
      }
      if (scan && st.isFile() && st.size <= TEXT_MAX && TEXT.test(a)) {
        const text = fs.readFileSync(a, 'utf8');
        if (olds.some(o => text.includes(o))) plan.texts.push(r);
      }
    };
    walk(top, true);
    return { bytes, files };
  };

  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(from, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = path.join(rel, e.name);
      const src = path.join(from, r);
      const dst = path.join(to, r);
      if (keep.has(r)) {
        plan.kept.push(r);
        continue;
      }
      if (JUNK.has(e.name)) {
        plan.rebuild.push(r);
        continue;
      }
      if (keepDirs.has(r) && e.isDirectory()) {
        walk(r);
        continue;
      }
      const there = lstat(dst);
      if (!there) {
        plan.moves.push({ rel: r, ...survey(r) });
        continue;
      }
      if (WHOLE.has(e.name)) {
        plan.rebuild.push(r);
        continue;
      }
      const here = fs.lstatSync(src);
      if (here.isDirectory() && there.isDirectory()) walk(r);
      else if (sameContent(src, dst, here, there)) plan.same.push(r);
      else plan.conflicts.push(r);
    }
  };
  walk('');
  return plan;
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Every old prefix → its new one, as a whole path (not /apps/lyrics_videos_old). */
const rewrite = (text: string, pairs: Pairs) =>
  pairs.reduce((t, [o, n]) => t.replace(new RegExp(`${escapeRe(o)}(?![\\w.-])`, 'g'), n), text);

/** A venv's scripts name its own folder (shebangs, activate): point them at where it is now. */
const fixVenv = (dir: string, oldDir: string) => {
  for (const bin of ['bin', 'Scripts']) {
    const d = path.join(dir, bin);
    if (!lstat(d)?.isDirectory()) continue;
    for (const f of fs.readdirSync(d)) {
      const file = path.join(d, f);
      const st = fs.lstatSync(file);
      if (!st.isFile() || st.size > 1 << 20) continue;
      const text = fs.readFileSync(file, 'latin1');
      if (text.includes(oldDir)) fs.writeFileSync(file, text.split(oldDir).join(dir), 'latin1');
    }
  }
};

const renameInto = (src: string, dst: string) => {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  try {
    fs.renameSync(src, dst);
  } catch (err) {
    // another disk (a workspace you named on another drive), or a part of the old folder that is a mount
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    fs.cpSync(src, dst, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true, errorOnExist: true, force: false });
    fs.rmSync(src, { recursive: true, force: true });
  }
};

/** Empty folders, deepest first; returns what is left of `dir` (relative), or [] when it is gone. */
const prune = (dir: string): string[] => {
  const left: string[] = [];
  const walk = (abs: string, rel: string): boolean => {
    let empty = true;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory() && walk(path.join(abs, e.name), r)) continue;
      if (!e.isDirectory()) left.push(r);
      empty = false;
    }
    if (empty) fs.rmdirSync(abs);
    return empty;
  };
  if (lstat(dir)?.isDirectory()) walk(dir, '');
  return left;
};

/** Does it. The conflicts and kept files stay in the old folder; returns what else is left there. */
export const applyMigration = (plan: Plan, pairs: Pairs = [[plan.from, plan.to]]) => {
  for (const m of plan.moves) {
    const src = path.join(plan.from, m.rel);
    const dst = path.join(plan.to, m.rel);
    renameInto(src, dst);
    if (path.basename(m.rel) === '.venv') fixVenv(dst, src);
  }
  for (const r of [...plan.same, ...plan.rebuild]) fs.rmSync(path.join(plan.from, r), { recursive: true, force: true });
  for (const r of plan.texts) {
    const file = path.join(plan.to, r);
    const text = fs.readFileSync(file, 'utf8');
    const next = rewrite(text, pairs);
    if (next !== text) fs.writeFileSync(file, next);
  }
  for (const r of plan.links) {
    const link = path.join(plan.to, r);
    const target = fs.readlinkSync(link);
    const next = retarget(path.join(plan.from, r), link, target, pairs);
    if (next === target) continue;
    fs.unlinkSync(link);
    fs.symlinkSync(next, link);
  }
  const kept = new Set(plan.kept);
  return prune(plan.from).filter(r => !kept.has(r));
};

/**
 * The catalog keeps absolute paths for files outside the library (a project's clones, productions,
 * what a delivery came from). Rows whose new path is already there (a scan after the pull) are
 * the old copy of a fresher row: a location is dropped, any other row is left as it was.
 */
const COLUMNS: { table: string; column: string; unique?: 'drop' | 'keep' }[] = [
  { table: 'locations', column: 'path', unique: 'drop' },
  { table: 'items', column: 'path', unique: 'keep' },
  { table: 'productions', column: 'path' },
  { table: 'deliveries', column: 'from_path' },
  { table: 'derived', column: 'path' },
  { table: 'runs', column: 'cwd' },
  { table: 'relations', column: 'parent' },
];

export type CatalogChange = { table: string; column: string; rows: number; clashes: number };

export const catalogPaths = (db: DatabaseSync, pairs: [string, string][], apply: boolean): CatalogChange[] => {
  const changes: CatalogChange[] = [];
  const run = () => {
    for (const [from, to] of pairs) {
      const n = [...from].length; // SQLite counts characters, not UTF-16 units
      for (const { table, column, unique } of COLUMNS) {
        const under = `(${column} = ? OR substr(${column}, 1, ?) = ?)`;
        const args = [from, n + 1, from + path.sep];
        const moved = `? || substr(${table}.${column}, ?)`;
        const clash = `EXISTS (SELECT 1 FROM ${table} AS b WHERE b.${column} = ${moved})`;
        const rows = Number((db.prepare(`SELECT count(*) AS c FROM ${table} WHERE ${under}`).get(...args) as { c: number }).c);
        if (!rows) continue;
        const clashes = unique ? Number((db.prepare(`SELECT count(*) AS c FROM ${table} WHERE ${under} AND ${clash}`).get(...args, to, n + 1) as { c: number }).c) : 0;
        changes.push({ table, column, rows, clashes });
        if (!apply) continue;
        if (unique === 'drop' && clashes) db.prepare(`DELETE FROM ${table} WHERE ${under} AND ${clash}`).run(...args, to, n + 1);
        db.prepare(`UPDATE ${table} SET ${column} = ${moved} WHERE ${under}${unique ? ` AND NOT ${clash}` : ''}`).run(
          to,
          n + 1,
          ...args,
          ...(unique ? [to, n + 1] : []),
        );
      }
    }
  };
  if (apply) tx(db, run);
  else run();
  return changes;
};

const AGENT_FILE = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.themoondevs.media-ingest.plist');
/** Config files that may run a script from the old folder: only reported (they are yours to edit). */
const ELSEWHERE = [
  path.join(os.homedir(), '.claude', 'settings.json'),
  path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
];

const mentions = (file: string, olds: string[]) => {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return olds.some(o => text.includes(o));
  } catch {
    return false;
  }
};

/** The nearest folder at or above `p` that exists: the disk a new folder there would be on. */
const existing = (p: string) => {
  let d = path.resolve(p);
  while (!lstat(d) && path.dirname(d) !== d) d = path.dirname(d);
  return d;
};
const disk = (p: string) => fs.statSync(existing(p)).dev;
const freeBytes = (p: string) => {
  try {
    const st = fs.statfsSync(existing(p));
    return st.bavail * st.bsize;
  } catch {
    return Infinity;
  }
};
const real = (p: string) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
};
/** A path through its links (~/dev → /Volumes/…), also when it doesn't exist yet. */
const realish = (p: string) => {
  const e = existing(p);
  return path.join(real(e), path.relative(e, p));
};
/** The pairs, plus each with its links resolved: the catalog may have either spelling. */
const bothSpellings = (pairs: Pairs): Pairs => {
  const out: Pairs = [...pairs];
  for (const [o, n] of pairs) if (realish(o) !== o) out.push([realish(o), realish(n)]);
  return out;
};
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const tilde = (p: string) => (inside(os.homedir(), p) ? path.join('~', path.relative(os.homedir(), p)) : p);

/** Files git tracks under `dir` (relative to it): the framework's, which stay. None outside a checkout. */
const tracked = (dir: string): Set<string> => {
  if (!inside(REPO, dir)) return new Set();
  const r = spawnSync('git', ['-C', REPO, 'ls-files', '-z', '--', path.relative(REPO, dir)], { encoding: 'utf8' });
  if (r.status !== 0) return new Set();
  return new Set(r.stdout.split('\0').filter(Boolean).map(f => path.relative(dir, path.join(REPO, f))));
};

/** The note a moved folder keeps (never moved itself). */
export const NOTE = 'MOVED.md';

/** One folder of yours going into the workspace; `tracked` (git's files) and the note stay. */
export type Job = { name: WorkspaceFolder; from: string; to: string; tracked: Set<string>; keep: Set<string> };

/**
 * Every folder that moves into `target`: apps/studio's (projects, out, brands, thumbnails/jobs,
 * overlays), ~/MediaMake's (notes, skills, extensions) when the workspace is elsewhere, and the
 * workspace set now when it isn't `target`.
 */
export const workspaceJobs = (target: string, studio = ROOT): Job[] => {
  const home = path.resolve(expandHome(DEFAULT_WORKSPACE));
  const jobs: Job[] = [];
  for (const name of Object.keys(WORKSPACE_FOLDERS) as WorkspaceFolder[]) {
    const rel = WORKSPACE_FOLDERS[name].split('/');
    const to = path.join(target, ...rel);
    const first = STUDIO_FOLDERS.includes(name) ? path.join(studio, ...rel) : path.join(home, ...rel);
    for (const from of new Set([first, workspaceDir(name, studio)])) {
      if (from === to || !lstat(from)?.isDirectory()) continue;
      const t = tracked(from);
      jobs.push({ name, from, to, tracked: t, keep: new Set([...t, NOTE]) });
    }
  }
  return jobs;
};

/** The workspace to move into: the one you name, else the one set, else ~/MediaMake on the studio's disk. */
const chooseTarget = (named: string | undefined) => {
  if (named) return { root: path.resolve(expandHome(named)), why: 'you named it' };
  const set = workspaceSetting();
  if (set) return { root: set.root, why: set.from === 'env' ? 'MEDIAMAKE_WORKSPACE' : `"workspace" in ${shown(configFile())}` };
  const home = path.resolve(expandHome(DEFAULT_WORKSPACE));
  if (disk(home) === disk(ROOT)) return { root: home, why: 'the default' };
  return {
    root: path.join(path.dirname(REPO), 'MediaMake'),
    why: `next to the checkout: ${DEFAULT_WORKSPACE} is on another disk, where every file would be copied and the library's clones would become copies`,
  };
};

/** Claude Code sessions started in the repo may open the workspace (.claude/settings.local.json, never committed). */
const SETTINGS = () => path.join(REPO, '.claude', 'settings.local.json');
const claudeAccess = (target: string, apply: boolean): string | null => {
  const file = SETTINGS();
  let json: { permissions?: { additionalDirectories?: unknown } } & Record<string, unknown> = {};
  if (lstat(file)) {
    try {
      json = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return `.claude/settings.local.json is not plain JSON: add ${target} to permissions.additionalDirectories in it by hand`;
    }
  }
  const dirs = Array.isArray(json.permissions?.additionalDirectories) ? (json.permissions.additionalDirectories as string[]) : [];
  if (dirs.some(d => typeof d === 'string' && path.resolve(expandHome(d)) === target)) return null;
  if (apply) {
    json.permissions = { ...json.permissions, additionalDirectories: [...dirs, target] };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  }
  return `.claude/settings.local.json: ${tilde(target)} in additionalDirectories (Claude Code sessions in the repo can open it)`;
};

const configWorkspace = () => {
  try {
    const v = (JSON.parse(fs.readFileSync(configFile(), 'utf8')) as { workspace?: unknown }).workspace;
    return typeof v === 'string' && v.trim() ? path.resolve(expandHome(v.trim())) : null;
  } catch {
    return null;
  }
};

const note = (from: string, to: string, framework: boolean) =>
  `# Moved to ${tilde(to)}\n\n` +
  `\`mm migrate\` moved what was here to ${to} on ${new Date().toISOString().slice(0, 10)}. That folder is your workspace\n` +
  `now: every script, Remotion and the app read it from there. \`mm workspace\` lists where each folder is.\n` +
  (framework ? '\nWhat is still here is the framework (files git tracks): leave it.\n' : '');

const main = () => {
  const yes = process.argv.includes('--yes');
  const named = process.argv.find(a => a.startsWith('--to='))?.slice('--to='.length);
  const list = (title: string, items: string[], max = 12) => {
    if (!items.length) return;
    console.log(`\n${title}`);
    for (const r of items.slice(0, max)) console.log(`  ${r}`);
    if (items.length > max) console.log(`  … and ${items.length - max} more`);
  };
  const rel = (p: string) => path.relative(REPO, p) || '.';
  const totals = (plans: Plan[]) => ({
    bytes: plans.flatMap(p => p.moves).reduce((s, m) => s + m.bytes, 0),
    files: plans.flatMap(p => p.moves).reduce((s, m) => s + m.files, 0),
  });

  // ── 1 · what the rename left in apps/lyrics_videos → apps/studio
  const OLD = path.join(REPO, 'apps', 'lyrics_videos');
  const pairs1 = bothSpellings([[OLD, ROOT]]);
  const plan1 = lstat(OLD)?.isDirectory() ? planMigration(OLD, ROOT, pairs1) : null;
  if (plan1) {
    const { bytes, files } = totals([plan1]);
    console.log(`1 · ${rel(OLD)} → ${rel(ROOT)} (the rename): ${plan1.moves.length ? `${plural(files, 'file')} (${size(bytes)}) to move` : 'nothing to move'}.`);
    const names = plan1.moves.map(m => `${m.rel}${lstat(path.join(OLD, m.rel))?.isDirectory() ? path.sep : ''}`);
    const width = Math.max(0, ...names.map(n => n.length));
    list('Moves:', plan1.moves.map((m, i) => `${names[i].padEnd(width)}  ${plural(m.files, 'file')}, ${size(m.bytes)}`), 40);
    list('Already in apps/studio with the same content (the old copy is deleted):', plan1.same);
    list('Rebuildable (deleted):', plan1.rebuild);
    list('In both with different content (left in apps/lyrics_videos for you to settle):', plan1.conflicts, 40);
    list(`Text files naming the old folder's full path (pointed at ${rel(ROOT)}):`, plan1.texts);
    console.log('');
  }

  // ── 2 · your work → the workspace
  const target = chooseTarget(named);
  const ws = target.root;
  if (inside(REPO, ws) || inside(realish(REPO), realish(ws))) throw new Error(`${ws} is inside the checkout: the workspace must be outside it (--to=<folder>)`);
  const library = hasConfig() ? loadConfig().root : null;
  if (library && (inside(library, ws) || inside(ws, library))) throw new Error(`${ws} and the media library (${library}) can't hold one another: pick another folder (--to=<folder>)`);

  const jobs = workspaceJobs(ws);
  const pairs2 = bothSpellings(jobs.map(j => [j.from, j.to] as [string, string]));
  const plans = jobs.map(j => planMigration(j.from, j.to, pairs2, j.keep));
  const examples = (js: Job[]) =>
    js.filter(j => j.name === 'projects').flatMap(j => [...j.tracked].filter(k => !lstat(path.join(j.to, k))).map(k => ({ from: path.join(j.from, k), to: path.join(j.to, k) })));
  const copies = examples(jobs);
  const { bytes, files } = totals(plans);
  const across = plans.filter(p => p.moves.length && disk(p.from) !== disk(p.to));
  const acrossBytes = totals(across).bytes;

  console.log(`${plan1 ? '2 · ' : ''}Your work → ${tilde(ws)} (your workspace, outside the checkout; ${target.why}):`);
  console.log(
    `  ${files ? `${plural(files, 'file')} (${size(bytes)}) to move` : 'nothing to move'}` +
      (files ? (across.length ? `, ${size(acrossBytes)} of it copied to another disk (${size(freeBytes(ws))} free there)` : ', on the same disk (instant)') : '') +
      '.',
  );
  const moved2 = plans.flatMap(p => p.moves.map(m => ({ p, m })));
  const names2 = moved2.map(({ p, m }) => `${shown(path.join(p.from, m.rel))}${lstat(path.join(p.from, m.rel))?.isDirectory() ? path.sep : ''}`);
  const width2 = Math.max(0, ...names2.map(n => n.length));
  list('Moves:', moved2.map(({ m }, i) => `${names2[i].padEnd(width2)}  ${plural(m.files, 'file')}, ${size(m.bytes)}`), 40);
  if (plan1?.moves.some(m => STUDIO_FOLDERS.some(f => inside(WORKSPACE_FOLDERS[f], m.rel) || inside(m.rel, WORKSPACE_FOLDERS[f])))) {
    console.log(`  … and what step 1 moves into apps/studio's ${STUDIO_FOLDERS.map(f => `${WORKSPACE_FOLDERS[f]}/`).join(', ')} goes on to ${tilde(ws)}.`);
  }
  const at = (p: Plan, items: string[]) => items.map(r => shown(path.join(p.from, r)));
  const keptTop = [...new Set(plans.flatMap(p => p.kept.filter(k => k !== NOTE).map(k => shown(path.join(p.from, k.split(path.sep)[0])))))];
  if (moved2.length) list('Stays (git tracks it: the framework\'s):', keptTop);
  if (copies.length) console.log(`  A copy of the example project goes to ${tilde(path.join(ws, 'projects'))} too, so it renders there (${plural(copies.length, 'file')}).`);
  list(`Already in ${tilde(ws)} with the same content (the old copy is deleted):`, plans.flatMap(p => at(p, p.same)));
  list('Rebuildable (deleted):', plans.flatMap(p => at(p, p.rebuild)));
  list('In both with different content (left where they are for you to settle):', plans.flatMap(p => at(p, p.conflicts)), 40);
  list(`Links pointed at their targets' new place:`, plans.flatMap(p => at(p, p.links)));
  list(`Text files naming an old folder's full path (pointed at ${tilde(ws)}):`, plans.flatMap(p => at(p, p.texts)));

  const setup = setupWorkspace(ws, ROOT, false).map(l => `${tilde(ws)}/${l}`);
  const config = configWorkspace() === ws ? null : `${shown(configFile())}: "workspace": "${tilde(ws)}" (every script, Remotion, the app and the analysis use it)`;
  const claude = claudeAccess(ws, false);
  const notes = plans.filter(p => p.moves.length || p.same.length).map(p => `${shown(p.from)}/${NOTE}`);
  list('Then:', [...(config ? [config] : []), ...setup, ...(claude ? [claude] : []), ...(notes.length ? [`a note where your files were: ${notes.join(', ')}`] : [])]);

  // ── the catalog, the watcher, and config files that name an old folder (both steps)
  const lib = hasConfig() ? openLibrary({ quiet: true }) : null;
  const catalog1 = lib ? catalogPaths(lib.db, pairs1, false) : [];
  const catalog2 = lib ? catalogPaths(lib.db, pairs2, false) : [];
  const show = (title: string, cs: CatalogChange[]) => {
    if (!cs.length) return;
    console.log(`\n${title}`);
    for (const c of cs) console.log(`  ${c.table}.${c.column}: ${c.rows} rows${c.clashes ? ` (${c.clashes} already have a row at the new path: ${c.table === 'locations' ? 'the old row is dropped' : 'left as they are'})` : ''}`);
  };
  show('Media library catalog (pointed at apps/studio):', catalog1);
  show(`Media library catalog (pointed at ${tilde(ws)}):`, catalog2);
  if (library && disk(library) !== disk(ws)) console.log(`\n⚠ ${tilde(ws)} is on another disk than the media library (${tilde(library)}): media use will copy files instead of cloning them.`);

  const olds1 = pairs1.map(([o]) => o);
  const watcher = process.platform === 'darwin' && mentions(AGENT_FILE, olds1);
  if (watcher) console.log('\nThe inbox watcher runs the old folder\'s script: it is reinstalled from apps/studio.');
  const olds = [...olds1, ...pairs2.map(([o]) => o)];
  const elsewhere = ELSEWHERE.filter(f => mentions(f, olds));
  list('These name a folder that moves: edit them by hand (mm workspace says where each one is now):', elsewhere.map(tilde));

  const todo1 = !!plan1 && !!(plan1.moves.length || plan1.same.length || plan1.rebuild.length || plan1.texts.length);
  const todo2 = plans.some(p => p.moves.length || p.same.length || p.rebuild.length) || copies.length || setup.length || config || claude;
  if (!todo1 && !todo2 && !catalog1.length && !catalog2.length && !watcher) {
    const conflicts = [...(plan1?.conflicts ?? []), ...plans.flatMap(p => p.conflicts)];
    console.log(conflicts.length ? '\nOnly the files above are left: compare the two copies, keep one, and delete the other.' : '\nNothing to do.');
    return;
  }
  if (!yes) return console.log(`\nNothing has changed. To do it: mm migrate${named ? ` --to=${named}` : ''} --yes`);

  const busy = rendering();
  if (busy.length) {
    console.error(`\nSomething is rendering or analyzing; run it again once it is done:\n${busy.map(l => `  ${l.slice(0, 160)}`).join('\n')}`);
    process.exit(1);
  }
  if (acrossBytes > freeBytes(ws)) throw new Error(`${tilde(ws)} has ${size(freeBytes(ws))} free and ${size(acrossBytes)} would be copied there: make room or pick a folder on the studio's disk (--to=<folder>)`);

  // 1, then 2 planned again: it moves what 1 brought into apps/studio as well
  const left1 = plan1 ? applyMigration(plan1, pairs1) : [];
  if (lib && catalog1.length) catalogPaths(lib.db, pairs1, true);
  const jobsNow = workspaceJobs(ws);
  const pairsNow = bothSpellings(jobsNow.map(j => [j.from, j.to] as [string, string]));
  const copiesNow = examples(jobsNow);
  const left2: string[] = [];
  for (const j of jobsNow) {
    const p = planMigration(j.from, j.to, pairsNow, j.keep);
    const did = p.moves.length || p.same.length;
    left2.push(...applyMigration(p, pairsNow).map(r => shown(path.join(j.from, r))));
    if (did) {
      fs.mkdirSync(j.from, { recursive: true });
      fs.writeFileSync(path.join(j.from, NOTE), note(j.from, j.to, j.tracked.size > 0));
    }
  }
  for (const c of copiesNow) {
    fs.mkdirSync(path.dirname(c.to), { recursive: true });
    fs.copyFileSync(c.from, c.to);
  }
  setupWorkspace(ws, ROOT, true);
  if (configWorkspace() !== ws) saveWorkspace(tilde(ws));
  claudeAccess(ws, true);
  if (lib) {
    catalogPaths(lib.db, pairsNow, true);
    exportLibrary(lib);
  }
  if (watcher) {
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', path.join(ROOT, 'scripts', 'media.ts'), 'init', '--watch'], {
      stdio: 'inherit',
    });
    if (r.status !== 0) console.error('The inbox watcher was not reinstalled: run mm media init --watch');
  }

  if (plan1) console.log(left1.length ? `\nStill in ${rel(OLD)} (in both with different content):` : `\n${rel(OLD)} is gone.`);
  for (const r of left1.slice(0, 40)) console.log(`  ${r}`);
  console.log(`\n✔ Your work is in ${tilde(ws)}, and the config names it as your workspace${lib ? '; the library catalog points there too' : ''}.`);
  list('Left where they were (in both with different content):', left2, 40);
  console.log('mm workspace lists every folder.');
  if (plan1 && !lstat(path.join(REPO, 'node_modules', 'studio'))) console.log('Next: npm install (the workspace is called studio now).');
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(`migrate: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
