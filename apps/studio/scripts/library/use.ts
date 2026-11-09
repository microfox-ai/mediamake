/**
 * use and cache: give a production what it needs from the library, and keep analyses for reuse.
 *
 * `use` clones a library file into projects/<slug>/ (where the engine reads it) and records the use.
 * Projects keep owning their inputs as clones, never links: a moved or archived library file can't
 * break a render (eyesofpink's dangling link did).
 *
 * The cache keeps what was worked out from a file once (footage segregation, faces, a song's stems
 * and beat grid, transcripts, mattes, cutouts, upscales), keyed by the file's content, the
 * parameters and the tool: <root>/.cache.noindex/<kind>/<sha>/<params>/. A second production of the
 * same footage or song gets it back instead of running the analysis (or paying for it) again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { n, type Item, type Kind } from './db.ts';
import { absOf, addLocation, relOf, type Lib } from './lib.ts';
import { clone, cloneTree, now, sha256File, sha256Text } from './sys.ts';

const DEFAULT_DIR: Record<Kind, string> = {
  footage: 'input/footage',
  overlays: 'input/overlays',
  images: 'input/images',
  art: 'input',
  music: 'input',
  sfx: 'input/sfx',
  references: 'input/inspiration',
  fonts: 'fonts',
  '3d': 'input/3d',
  _unsorted: 'input',
};

export type Derived = { item_id: string; kind: string; params: string; tool: string | null; path: string; target: string | null; at: string };

export const paramsKey = (params?: string) => (params ? sha256Text(params).slice(0, 12) : 'default');

export const cacheGet = (lib: Lib, item: Item, kind: string, params?: string) => {
  const row = lib.db.prepare('SELECT * FROM derived WHERE item_id = ? AND kind = ? AND params = ?').get(item.id, kind, paramsKey(params)) as Derived | undefined;
  return row && fs.existsSync(absOf(lib, row.path)) ? row : undefined;
};

/**
 * Keep a file or folder made from an item. `target` is where a production wants it, relative to the
 * production folder, with {name} for the name the item has there (e.g. footage/{name} for a segregation).
 */
export const cachePut = (lib: Lib, item: Item, kind: string, src: string, o: { params?: string; tool?: string; target?: string } = {}) => {
  const key = paramsKey(o.params);
  const dest = path.join(lib.cache, kind, item.id, key);
  fs.rmSync(dest, { recursive: true, force: true });
  if (fs.statSync(src).isDirectory()) cloneTree(src, dest);
  else clone(src, path.join(dest, path.basename(src)));
  lib.db
    .prepare(
      `INSERT INTO derived (item_id, kind, params, tool, path, target, at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_id, kind, params) DO UPDATE SET tool = excluded.tool, path = excluded.path, target = excluded.target, at = excluded.at`,
    )
    .run(item.id, kind, key, n(o.tool), relOf(lib, dest), n(o.target), now());
  return dest;
};

/** Clone a cached result into a folder (merged with what is there). */
export const cacheInto = (lib: Lib, row: Derived, into: string) => {
  cloneTree(absOf(lib, row.path), into);
  return into;
};

export type UseOptions = { as?: string; with?: string[]; skill?: string; force?: boolean };

export const use = async (lib: Lib, item: Item, production: string, o: UseOptions = {}) => {
  const prod = path.join(lib.projects, production);
  if (!fs.existsSync(prod)) throw new Error(`No production ${production} in ${lib.projects} (make it first: media production new ${production} --channel=…)`);
  if (item.status !== 'online') throw new Error(`${item.path} is ${item.status}${item.disk ? ` (on the disk "${item.disk}": connect it and restore it with cleanup-out)` : ''}`);
  const src = absOf(lib, item.path);
  const rel = o.as ?? path.join(DEFAULT_DIR[item.kind], path.basename(item.path));
  const dest = path.join(prod, rel);
  if (fs.existsSync(dest)) {
    if ((await sha256File(dest)) !== item.id && !o.force) throw new Error(`${path.relative(lib.projects, dest)} is already there with other content (pass --force to replace it, or --as=<another name>)`);
    if (o.force) fs.rmSync(dest);
  }
  if (!fs.existsSync(dest)) clone(src, dest);
  lib.db
    .prepare(
      `INSERT INTO uses (item_id, production, as_path, skill, at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(production, as_path) DO UPDATE SET item_id = excluded.item_id, skill = COALESCE(excluded.skill, skill), at = excluded.at`,
    )
    .run(item.id, production, rel, n(o.skill), now());
  addLocation(lib, item.id, dest);

  const cached: string[] = [];
  const missing: string[] = [];
  for (const kind of o.with ?? []) {
    const row = cacheGet(lib, item, kind);
    if (!row) {
      missing.push(kind);
      continue;
    }
    const target = (row.target ?? `footage/{name}`).replace('{name}', path.parse(rel).name);
    cached.push(path.relative(prod, cacheInto(lib, row, path.join(prod, target))));
  }
  return { dest, rel, cached, missing };
};
