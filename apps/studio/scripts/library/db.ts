/**
 * The catalog: <root>/.catalog/library.db (SQLite through node:sqlite, no dependency). It is an
 * index: what the library holds is written in each folder's .media.json too (sidecar.ts), so
 * `media scan --rebuild` can always make it again.
 *
 * An item is one content (its SHA-256). `path` is where its main copy is: relative to the library
 * root inside it, absolute outside (a file still in Downloads, a project's input). `locations`
 * lists every path holding the same bytes, the main one included.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const KINDS = ['footage', 'overlays', 'images', 'art', 'music', 'sfx', 'references', 'fonts', '3d'] as const;
export type Kind = (typeof KINDS)[number] | '_unsorted';
/** Where a copy is: what the sweep, dedupe and cleanup-out decide by. */
export type Role = 'library' | 'inbox' | 'downloads' | 'delivery' | 'project' | 'out' | 'brands' | 'overlays' | 'archive' | 'other';
/** remote: a teammate's item, known from `media sync pull`, with no copy on this Mac yet */
export type Status = 'online' | 'cold' | 'missing' | 'remote';

export type Item = {
  id: string;
  path: string;
  kind: Kind;
  subject: string | null;
  title: string | null;
  ext: string;
  bytes: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  fps: number | null;
  has_audio: number | null;
  codec: string | null;
  rating: string | null;
  rights: string | null;
  status: Status;
  disk: string | null;
  role: Role;
  confidence: number;
  added_at: string;
  /** a song's words (Suno's lyrics), also kept as <file>.lyrics.txt beside it */
  lyrics?: string | null;
};

const SCHEMA = [
  `CREATE TABLE items (
     id TEXT PRIMARY KEY, path TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, subject TEXT, title TEXT, ext TEXT NOT NULL,
     bytes INTEGER NOT NULL, width INTEGER, height INTEGER, duration REAL, fps REAL, has_audio INTEGER, codec TEXT,
     rating TEXT, rights TEXT, status TEXT NOT NULL DEFAULT 'online', disk TEXT, role TEXT NOT NULL,
     confidence REAL NOT NULL DEFAULT 1, added_at TEXT NOT NULL);
   CREATE INDEX items_kind ON items(kind, subject);
   CREATE TABLE sources (
     item_id TEXT NOT NULL, tool TEXT NOT NULL, ref TEXT NOT NULL, url TEXT, page_url TEXT, title TEXT, author TEXT,
     query TEXT, prompt TEXT, model TEXT, price REAL, downloaded_at TEXT, UNIQUE(tool, ref));
   CREATE INDEX sources_item ON sources(item_id);
   CREATE TABLE tags (item_id TEXT NOT NULL, tag TEXT NOT NULL, UNIQUE(item_id, tag));
   CREATE TABLE notes (item_id TEXT NOT NULL, at TEXT NOT NULL, text TEXT NOT NULL, production TEXT);
   CREATE TABLE locations (
     item_id TEXT NOT NULL, path TEXT NOT NULL UNIQUE, role TEXT NOT NULL, production TEXT,
     bytes INTEGER NOT NULL, mtime REAL NOT NULL, ino INTEGER NOT NULL, seen_at TEXT NOT NULL);
   CREATE INDEX locations_item ON locations(item_id);
   CREATE TABLE uses (
     item_id TEXT NOT NULL, production TEXT NOT NULL, as_path TEXT NOT NULL, skill TEXT, at TEXT NOT NULL, verdict TEXT,
     UNIQUE(production, as_path));
   CREATE TABLE derived (
     item_id TEXT NOT NULL, kind TEXT NOT NULL, params TEXT NOT NULL, tool TEXT, path TEXT NOT NULL, target TEXT,
     at TEXT NOT NULL, UNIQUE(item_id, kind, params));
   CREATE TABLE productions (
     slug TEXT PRIMARY KEY, title TEXT, channel TEXT, artist TEXT, song TEXT, status TEXT NOT NULL DEFAULT 'active',
     path TEXT, deliver_folder TEXT, updated_at TEXT NOT NULL);
   CREATE TABLE deliveries (
     production TEXT NOT NULL, what TEXT NOT NULL, path TEXT NOT NULL, sha256 TEXT NOT NULL, from_path TEXT,
     at TEXT NOT NULL, status TEXT NOT NULL, UNIQUE(path, sha256));
   CREATE TABLE runs (
     skill TEXT NOT NULL, session TEXT, at TEXT NOT NULL, cwd TEXT, production TEXT, verdict TEXT, UNIQUE(session, skill, at));
   CREATE VIRTUAL TABLE search USING fts5(item_id UNINDEXED, text, tokenize = 'unicode61 remove_diacritics 2');`,
  // 2: Suno songs (lyrics, the rest of a take's settings, what it was made from) and channel team sync
  `ALTER TABLE items ADD COLUMN lyrics TEXT;
   ALTER TABLE sources ADD COLUMN extra TEXT;
   CREATE TABLE relations (
     item_id TEXT NOT NULL, relation TEXT NOT NULL, parent TEXT NOT NULL, parent_id TEXT, at TEXT NOT NULL,
     UNIQUE(item_id, relation, parent));
   CREATE INDEX relations_parent ON relations(parent_id);
   CREATE TABLE remote (
     item_id TEXT PRIMARY KEY, channel TEXT NOT NULL, project_id TEXT NOT NULL, url TEXT, file_name TEXT, mime TEXT,
     data TEXT NOT NULL, pulled_at TEXT NOT NULL);
   CREATE TABLE shares (
     item_id TEXT NOT NULL, channel TEXT NOT NULL, via TEXT NOT NULL, approved_at TEXT NOT NULL, uploaded_at TEXT,
     UNIQUE(item_id, channel));
   CREATE TABLE synced (
     channel TEXT NOT NULL, what TEXT NOT NULL, key TEXT NOT NULL, hash TEXT NOT NULL, at TEXT NOT NULL,
     UNIQUE(channel, what, key));`,
];

export const catalogDir = (root: string) => path.join(root, '.catalog');

export const openDb = (root: string, file = path.join(catalogDir(root), 'library.db')) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 10000; PRAGMA synchronous = NORMAL;');
  const version = Number(db.prepare('PRAGMA user_version').get()?.user_version ?? 0);
  for (let i = version; i < SCHEMA.length; i++)
    tx(db, () => {
      db.exec(SCHEMA[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
    });
  return db;
};

export const tx = <T>(db: DatabaseSync, fn: () => T): T => {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

/** A source's own keys beyond the columns (Suno's lyrics settings, parent, workspace…), stored as JSON. */
export const extraOf = (v: unknown): Record<string, unknown> => {
  try {
    return typeof v === 'string' && v ? (JSON.parse(v) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

/** node:sqlite refuses undefined: bind null. */
export const n = (v: unknown) => (v === undefined ? null : v);

export const getItem = (db: DatabaseSync, id: string) => db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item | undefined;

export const tagsOf = (db: DatabaseSync, id: string) =>
  (db.prepare('SELECT tag FROM tags WHERE item_id = ? ORDER BY tag').all(id) as { tag: string }[]).map(r => r.tag);

/** Rewrite one item's row in the full-text index from everything known about it. */
export const reindex = (db: DatabaseSync, id: string) => {
  const it = getItem(db, id);
  db.prepare('DELETE FROM search WHERE item_id = ?').run(id);
  if (!it) return;
  const src = db.prepare('SELECT tool, title, author, query, prompt, model FROM sources WHERE item_id = ?').all(id);
  const notes = db.prepare('SELECT text FROM notes WHERE item_id = ?').all(id);
  const words = [
    it.title,
    it.kind,
    it.subject?.replace(/[/-]/g, ' '),
    path.basename(it.path).replace(/[._-]+/g, ' '),
    ...tagsOf(db, id),
    // a Suno take's prompt is its styles (its excluded styles are left out: they're what it isn't)
    ...src.flatMap(s => [s.tool, s.title, s.author, s.query, s.prompt, s.model]),
    ...notes.map(r => r.text),
    it.lyrics,
  ];
  db.prepare('INSERT INTO search (item_id, text) VALUES (?, ?)').run(id, words.filter(Boolean).join(' '));
};
