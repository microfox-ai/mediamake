/**
 * migrate: moves your work from apps/lyrics_videos into apps/studio, once, after pulling the rename
 * (2026-11). git moved the tracked files; what it leaves in the old folder is yours: projects,
 * renders (out/), brand kits, thumbnail jobs, overlays, built 3D props, the analysis venv.
 *
 *   mm migrate          what would move (nothing changes)
 *   mm migrate --yes    move it
 *
 * - Folders are merged. A file that is already in apps/studio with the same content is dropped
 *   from the old folder; one with other content stays where it is, listed, for you to settle.
 * - Rebuildable things are deleted instead of merged: __pycache__, .DS_Store, and node_modules or
 *   analysis/.venv when apps/studio already has its own. A venv that moves keeps working (its
 *   scripts are pointed at the new folder).
 * - The media library's catalog (projects' clones, productions, deliveries) and text files you
 *   made (job JSON, notes, logs) that name the old folder's full path are pointed at the new one.
 * - The inbox watcher (`media init --watch`) is reinstalled if it runs the old folder's script.
 *
 * It is the same disk, so a move is a rename: 40 GB of projects move in a moment.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { hasConfig } from './library/config.ts';
import { tx } from './library/db.ts';
import { exportLibrary } from './library/export.ts';
import { openLibrary } from './library/lib.ts';
import { rendering, size } from './library/sys.ts';
import { REPO, ROOT } from './paths.ts';

/** Deleted wherever they are: rebuilt by whatever made them. */
const JUNK = new Set(['__pycache__', '.DS_Store']);
/** Moved whole when apps/studio has none yet, else deleted (never merged file by file). */
const WHOLE = new Set(['node_modules', '.venv']);
/** Files whose text may name the old folder's full path (job files, notes, logs, edit lists). */
const TEXT = /\.(json|jsonl|md|txt|csv|tsv|ya?ml|toml|html|srt|vtt|lrc|ass|xml|sh|py|ts|tsx|js|mjs)$/i;
const TEXT_MAX = 4 << 20;

export type Move = { rel: string; bytes: number; files: number };
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
  /** moved text files that name the old folder's full path (relative to either folder) */
  texts: string[];
};

const lstat = (p: string) => {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
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

/** Size of an entry, and its text files that name one of the old prefixes. */
const survey = (abs: string, rel: string, olds: string[], texts: string[]) => {
  let bytes = 0;
  let files = 0;
  const walk = (a: string, r: string, scan: boolean) => {
    const st = lstat(a);
    if (!st) return;
    if (st.isDirectory()) {
      // packages never name the user's folders, and a venv's own scripts are fixed by fixVenv
      const inner = scan && !WHOLE.has(path.basename(a));
      for (const e of fs.readdirSync(a)) walk(path.join(a, e), path.join(r, e), inner);
      return;
    }
    bytes += st.size;
    files++;
    if (scan && st.isFile() && st.size <= TEXT_MAX && TEXT.test(a)) {
      const text = fs.readFileSync(a, 'utf8');
      if (olds.some(o => text.includes(o))) texts.push(r);
    }
  };
  walk(abs, rel, true);
  return { bytes, files };
};

/** What moving `from` into `to` would do. Nothing changes. */
export const planMigration = (from: string, to: string, olds: string[] = [from]): Plan => {
  const plan: Plan = { from, to, moves: [], same: [], conflicts: [], rebuild: [], texts: [] };
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(from, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = path.join(rel, e.name);
      const src = path.join(from, r);
      const dst = path.join(to, r);
      if (JUNK.has(e.name)) {
        plan.rebuild.push(r);
        continue;
      }
      const there = lstat(dst);
      if (!there) {
        plan.moves.push({ rel: r, ...survey(src, r, olds, plan.texts) });
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
const rewrite = (text: string, pairs: [string, string][]) =>
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
    // only when the old folder (or a part of it) is a mount of its own
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

/** Does it. The conflicts stay in the old folder; returns what is left there. */
export const applyMigration = (plan: Plan, pairs: [string, string][] = [[plan.from, plan.to]]) => {
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
  return prune(plan.from);
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

const main = () => {
  const yes = process.argv.includes('--yes');
  const OLD = path.join(REPO, 'apps', 'lyrics_videos');
  // the same folders as the catalog may have them, through a symlinked parent (~/dev → /Volumes/…)
  const real = (p: string) => {
    try {
      return fs.realpathSync(p);
    } catch {
      return p;
    }
  };
  const pairs: [string, string][] = [[OLD, ROOT]];
  const realOld = path.join(real(REPO), 'apps', 'lyrics_videos');
  if (realOld !== OLD) pairs.push([realOld, real(ROOT)]);
  const olds = pairs.map(([o]) => o);
  const rel = (p: string) => path.relative(REPO, p) || '.';
  const list = (title: string, items: string[], max = 12) => {
    if (!items.length) return;
    console.log(`\n${title}`);
    for (const r of items.slice(0, max)) console.log(`  ${r}`);
    if (items.length > max) console.log(`  … and ${items.length - max} more`);
  };

  const plan = lstat(OLD)?.isDirectory() ? planMigration(OLD, ROOT, olds) : null;
  if (!plan) console.log(`${rel(OLD)} is not here: nothing to move.`);
  else {
    const bytes = plan.moves.reduce((s, m) => s + m.bytes, 0);
    const files = plan.moves.reduce((s, m) => s + m.files, 0);
    console.log(`${rel(OLD)} → ${rel(ROOT)}: ${plan.moves.length ? `${files} file${files === 1 ? '' : 's'} (${size(bytes)}) to move` : 'nothing to move'}.`);
    const names = plan.moves.map(m => `${m.rel}${lstat(path.join(OLD, m.rel))?.isDirectory() ? path.sep : ''}`);
    const width = Math.max(0, ...names.map(n => n.length));
    list('Moves:', plan.moves.map((m, i) => `${names[i].padEnd(width)}  ${m.files} file${m.files === 1 ? '' : 's'}, ${size(m.bytes)}`), 40);
    list('Already in apps/studio with the same content (the old copy is deleted):', plan.same);
    list('Rebuildable (deleted):', plan.rebuild);
    list('In both with different content (left in apps/lyrics_videos for you to settle):', plan.conflicts, 40);
    list(`Text files naming the old folder's full path (pointed at ${rel(ROOT)}):`, plan.texts);
  }

  const lib = hasConfig() ? openLibrary({ quiet: true }) : null;
  const catalog = lib ? catalogPaths(lib.db, pairs, false) : [];
  if (catalog.length) {
    console.log('\nMedia library catalog (pointed at apps/studio):');
    for (const c of catalog) console.log(`  ${c.table}.${c.column}: ${c.rows} rows${c.clashes ? ` (${c.clashes} already have a row at the new path: ${c.table === 'locations' ? 'the old row is dropped' : 'left as they are'})` : ''}`);
  }

  const watcher = process.platform === 'darwin' && mentions(AGENT_FILE, olds);
  if (watcher) console.log('\nThe inbox watcher runs the old folder\'s script: it is reinstalled from apps/studio.');
  const elsewhere = ELSEWHERE.filter(f => mentions(f, olds));
  list('These name apps/lyrics_videos: edit them by hand (it is apps/studio now):', elsewhere.map(f => f.replace(os.homedir(), '~')));

  const todo = (plan && (plan.moves.length || plan.same.length || plan.rebuild.length || plan.texts.length)) || catalog.length || watcher;
  if (!todo) {
    if (plan?.conflicts.length) console.log('\nOnly the files above are left: compare them with apps/studio, keep one, and delete the other.');
    else console.log('\nNothing to do.');
    return;
  }
  if (!yes) return console.log('\nNothing has changed. To do it: mm migrate --yes');

  const busy = rendering();
  if (busy.length) {
    console.error(`\nSomething is rendering or analyzing; run it again once it is done:\n${busy.map(l => `  ${l.slice(0, 160)}`).join('\n')}`);
    process.exit(1);
  }
  const left = plan ? applyMigration(plan, pairs) : [];
  if (lib && catalog.length) {
    catalogPaths(lib.db, pairs, true);
    exportLibrary(lib);
  }
  if (watcher) {
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', path.join(ROOT, 'scripts', 'media.ts'), 'init', '--watch'], {
      stdio: 'inherit',
    });
    if (r.status !== 0) console.error('The inbox watcher was not reinstalled: run mm media init --watch');
  }
  console.log(`\n✔ Moved into ${rel(ROOT)}.${catalog.length ? ' The library catalog points there too.' : ''}`);
  if (left.length) list(`Still in ${rel(OLD)} (in both with different content):`, left, 40);
  else if (plan) console.log(`${rel(OLD)} is gone.`);
  if (!lstat(path.join(REPO, 'node_modules', 'studio'))) console.log('Next: npm install (the workspace is called studio now).');
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(`migrate: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
