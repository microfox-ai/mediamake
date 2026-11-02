/**
 * The library as one object the commands share: config, catalog, the app's folders, and the
 * catalog writes every command makes the same way (an item, its copies, sources, tags).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { DIRS, REPO, ROOT } from '../paths.ts';
import { SOURCE_COLUMNS, type Source } from './classify.ts';
import { loadConfig, type LibraryConfig } from './config.ts';
import { catalogDir, extraOf, getItem, n, openDb, reindex, type Item, type Role } from './db.ts';
import { now, readJson } from './sys.ts';

export type Lib = {
  cfg: LibraryConfig;
  root: string;
  db: DatabaseSync;
  catalog: string;
  thumbs: string;
  cache: string;
  projects: string;
  out: string;
  brands: string;
  overlays: string;
  /** .claude/skills: where skill variants are installed (media sync) */
  skills: string;
  log: (s: string) => void;
};

export const openLibrary = (opts: { cfg?: LibraryConfig; projects?: string; out?: string; brands?: string; overlays?: string; skills?: string; quiet?: boolean } = {}): Lib => {
  const cfg = opts.cfg ?? loadConfig();
  const catalog = catalogDir(cfg.root);
  return {
    cfg,
    root: cfg.root,
    db: openDb(cfg.root),
    catalog,
    thumbs: path.join(catalog, 'thumbs'),
    // ".noindex": Spotlight skips it (thousands of analysis frames would keep it busy)
    cache: path.join(cfg.root, '.cache.noindex'),
    projects: opts.projects ?? DIRS.projects,
    out: opts.out ?? DIRS.out,
    brands: opts.brands ?? DIRS.brands,
    overlays: opts.overlays ?? path.join(ROOT, 'overlays'),
    skills: opts.skills ?? path.join(REPO, '.claude', 'skills'),
    log: opts.quiet ? () => {} : (s: string) => console.log(s),
  };
};

const inside = (dir: string, abs: string) => abs === dir || abs.startsWith(dir + path.sep);

/** Library paths are stored relative to its root (the library can move); the rest absolute. */
export const relOf = (lib: Lib, abs: string) => (inside(lib.root, abs) ? path.relative(lib.root, abs) : abs);
export const absOf = (lib: Lib, p: string) => (path.isAbsolute(p) ? p : path.join(lib.root, p));

/** What a copy at this path is, and the production it belongs to. */
export const roleOf = (lib: Lib, abs: string): { role: Role; production?: string } => {
  const first = (dir: string) => path.relative(dir, abs).split(path.sep)[0];
  if (inside(lib.root, abs)) return { role: 'library' };
  if (inside(lib.cfg.inbox, abs)) return { role: 'inbox' };
  if (inside(lib.projects, abs)) return { role: 'project', production: first(lib.projects) };
  if (inside(lib.out, abs)) {
    const [a, b] = path.relative(lib.out, abs).split(path.sep);
    return { role: 'out', production: ['youtube', 'posters', 'thumbnails'].includes(a) ? b : a };
  }
  if (inside(lib.brands, abs)) return { role: 'brands' };
  if (inside(lib.overlays, abs)) return { role: 'overlays' };
  if (inside(lib.cfg.deliverRoot, abs)) {
    const [channel, song] = path.relative(lib.cfg.deliverRoot, abs).split(path.sep);
    const d = song && readJson<{ production?: string }>(path.join(lib.cfg.deliverRoot, channel, song, 'delivery.json'));
    return d ? { role: 'delivery', production: d.production } : { role: 'downloads' };
  }
  return { role: 'other' };
};

/** Where a copy of the main file should come from, best first. */
const RANK: Role[] = ['library', 'brands', 'out', 'project', 'overlays', 'delivery', 'downloads', 'inbox', 'archive', 'other'];
export const rank = (r: Role) => RANK.indexOf(r);

export type NewItem = Omit<Item, 'status' | 'disk' | 'added_at' | 'rating' | 'rights'> & Partial<Pick<Item, 'rating' | 'rights'>>;

export const upsertItem = (lib: Lib, it: NewItem) => {
  lib.db
    .prepare(
      `INSERT INTO items (id, path, kind, subject, title, ext, bytes, width, height, duration, fps, has_audio, codec, rating, rights, status, role, confidence, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET path = excluded.path, kind = excluded.kind, subject = excluded.subject, title = excluded.title,
         width = COALESCE(excluded.width, width), height = COALESCE(excluded.height, height), duration = COALESCE(excluded.duration, duration),
         fps = COALESCE(excluded.fps, fps), has_audio = COALESCE(excluded.has_audio, has_audio), codec = COALESCE(excluded.codec, codec),
         rating = COALESCE(excluded.rating, rating), rights = COALESCE(excluded.rights, rights),
         status = 'online', role = excluded.role, confidence = excluded.confidence`,
    )
    .run(it.id, it.path, it.kind, n(it.subject), n(it.title), it.ext, it.bytes, n(it.width), n(it.height), n(it.duration), n(it.fps), n(it.has_audio), n(it.codec), n(it.rating), n(it.rights), it.role, it.confidence, now());
};

export const addLocation = (lib: Lib, id: string, abs: string) => {
  const st = fs.statSync(abs);
  const { role, production } = roleOf(lib, abs);
  lib.db
    .prepare(
      `INSERT INTO locations (item_id, path, role, production, bytes, mtime, ino, seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET item_id = excluded.item_id, role = excluded.role, production = excluded.production,
         bytes = excluded.bytes, mtime = excluded.mtime, ino = excluded.ino, seen_at = excluded.seen_at`,
    )
    .run(id, relOf(lib, abs), role, n(production), st.size, st.mtimeMs, st.ino, now());
};

export const dropLocation = (lib: Lib, abs: string) => lib.db.prepare('DELETE FROM locations WHERE path = ?').run(relOf(lib, abs));

/** A known copy whose file hasn't changed: its hash needs no reading again. */
export const knownHash = (lib: Lib, abs: string, st: fs.Stats) => {
  const row = lib.db.prepare('SELECT item_id, bytes, mtime, ino FROM locations WHERE path = ?').get(relOf(lib, abs)) as { item_id: string; bytes: number; mtime: number; ino: number } | undefined;
  return row && row.bytes === st.size && Math.abs(row.mtime - st.mtimeMs) < 1 && row.ino === st.ino ? row.item_id : undefined;
};

/**
 * One (tool, ref) points at one item. A better copy of the same source (a higher resolution
 * download) takes it over; the older item keeps a tag saying which one replaced it. `beside`: a
 * teammate's item (media sync), which never takes a source over from one on this Mac.
 */
export const addSource = (lib: Lib, id: string, s: Source, opts: { beside?: boolean } = {}) => {
  if (!s.tool) return;
  let ref = s.ref ?? id.slice(0, 16);
  const had = lib.db.prepare('SELECT item_id FROM sources WHERE tool = ? AND ref = ?').get(s.tool, ref) as { item_id: string } | undefined;
  if (had && had.item_id !== id && opts.beside) ref = `${ref}@${id.slice(0, 8)}`;
  else if (had && had.item_id !== id) {
    const old = getItem(lib.db, had.item_id);
    const mine = getItem(lib.db, id);
    if (old && mine && (old.height ?? 0) >= (mine.height ?? 0)) ref = `${ref}@${id.slice(0, 8)}`;
    else {
      lib.db.prepare('UPDATE sources SET ref = ? WHERE tool = ? AND ref = ?').run(`${ref}@${had.item_id.slice(0, 8)}`, s.tool, ref);
      addTags(lib, had.item_id, [`replaced-by:${id.slice(0, 12)}`]);
    }
  }
  const extra = extraKeys(s);
  lib.db
    .prepare(
      `INSERT INTO sources (item_id, tool, ref, url, page_url, title, author, query, prompt, model, price, downloaded_at, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tool, ref) DO UPDATE SET item_id = excluded.item_id, url = COALESCE(excluded.url, url), page_url = COALESCE(excluded.page_url, page_url),
         title = COALESCE(excluded.title, title), author = COALESCE(excluded.author, author), query = COALESCE(excluded.query, query),
         prompt = COALESCE(excluded.prompt, prompt), model = COALESCE(excluded.model, model), price = COALESCE(excluded.price, price),
         extra = COALESCE(excluded.extra, extra)`,
    )
    .run(id, s.tool, ref, n(s.url), n(s.pageUrl), n(s.title), n(s.author), n(s.query), n(s.prompt), n(s.model), n(s.price), n(s.downloadedAt), Object.keys(extra).length ? JSON.stringify(extra) : null);
};

/** A source's keys without a column of their own (Suno's excludeStyles, settings, parentRef…). */
const extraKeys = (s: Source) => Object.fromEntries(Object.entries(s).filter(([k, v]) => v !== undefined && v !== null && !(SOURCE_COLUMNS as readonly string[]).includes(k)));

/** A source as the sidecar had it, minus what is kept elsewhere (lyrics on the item, a teammate's details). */
export const provenance = (s: Source): Source =>
  Object.fromEntries(Object.entries(s).filter(([k, v]) => v !== undefined && v !== null && k !== 'lyrics' && k !== 'library')) as Source;

/** A song's words, on the item (and so in the search index). */
export const setLyrics = (lib: Lib, id: string, lyrics: string | undefined | null) => {
  if (lyrics?.trim()) lib.db.prepare('UPDATE items SET lyrics = ? WHERE id = ?').run(lyrics.trim(), id);
};

export const addTags = (lib: Lib, id: string, tags: string[]) => {
  const st = lib.db.prepare('INSERT OR IGNORE INTO tags (item_id, tag) VALUES (?, ?)');
  for (const t of tags) if (t) st.run(id, t.toLowerCase());
};

export const sourcesOf = (lib: Lib, id: string) =>
  (lib.db.prepare('SELECT tool, ref, url, page_url AS pageUrl, title, author, query, prompt, model, price, downloaded_at AS downloadedAt, extra FROM sources WHERE item_id = ?').all(id) as unknown as (Source & { extra?: string | null })[]).map(
    ({ extra, ...s }) => ({ ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null)), ...extraOf(extra) }) as Source,
  );

export const locationsOf = (lib: Lib, id: string) =>
  lib.db.prepare('SELECT path, role, production, bytes FROM locations WHERE item_id = ? ORDER BY path').all(id) as { path: string; role: Role; production: string | null; bytes: number }[];

/**
 * A path as a person or a skill typed it: relative to where the command ran, except that skills
 * write project paths (projects/<slug>/…, out/…) relative to apps/lyrics_videos, from anywhere.
 */
export const userPath = (p: string) => {
  if (path.isAbsolute(p)) return p;
  const direct = path.resolve(process.env.INIT_CWD ?? process.cwd(), p);
  return !fs.existsSync(direct) && /^(projects|out|thumbnails|brands|overlays)\//.test(p) ? path.resolve(ROOT, p) : direct;
};

/**
 * An item from what a person or a skill would type: an id (or its first 6+ characters), a path
 * (anywhere it has a copy), or a path inside the library.
 */
export const resolveItem = (lib: Lib, ref: string): Item => {
  const abs = userPath(ref);
  if (fs.existsSync(abs)) {
    const row = lib.db.prepare('SELECT item_id FROM locations WHERE path = ?').get(relOf(lib, abs)) as { item_id: string } | undefined;
    const it = row && getItem(lib.db, row.item_id);
    if (it) return it;
  }
  const inLib = lib.db.prepare('SELECT item_id FROM locations WHERE path = ?').get(ref) as { item_id: string } | undefined;
  if (inLib) return getItem(lib.db, inLib.item_id)!;
  if (/^[0-9a-f]{6,64}$/i.test(ref)) {
    const rows = lib.db.prepare('SELECT * FROM items WHERE id LIKE ? LIMIT 2').all(`${ref.toLowerCase()}%`) as Item[];
    if (rows.length === 1) return rows[0];
    if (rows.length > 1) throw new Error(`${ref} matches more than one item: give more of the id`);
  }
  throw new Error(`Nothing in the library matches "${ref}" (an id, a path, or run media find)`);
};

export const touch = (lib: Lib, id: string) => reindex(lib.db, id);
