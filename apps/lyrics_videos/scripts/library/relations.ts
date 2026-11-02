/**
 * relations: what an item was made from. A Suno cover, extension or remaster points at the take it
 * came from, a song's stems at the song, a take made from a track uploaded to Suno at that track.
 * The parent is named as the sidecar names it, a clip id (found through sources(tool, ref)) or a
 * library item's sha256 (`sourceItem`), and linked once it is in the library: a parent that
 * arrives later is linked then.
 */
import { mediaTypeOf, type Source } from './classify.ts';
import type { Lib } from './lib.ts';
import { now } from './sys.ts';

export const RELATIONS = ['cover', 'extend', 'remaster', 'stems', 'variation'] as const;
export type Relation = (typeof RELATIONS)[number];

/** How Suno says a take came about → the library's word for it. */
const FROM_SOURCE: Record<string, Relation> = { cover: 'cover', extend: 'extend', remaster: 'remaster', reuse: 'variation', upload: 'variation' };

/** A song's stems come with the song's clip id: they keep it as <ref>:stems, so the song keeps its (tool, ref). */
export const stemsRef = (s: Source, file: string): Source =>
  mediaTypeOf(file) === 'archive' && s.ref && !/stems$/i.test(s.ref) ? { ...s, ref: `${s.ref}:stems`, parentRef: s.parentRef ?? s.ref } : s;

/** The parents a file's sources name: [relation, "<tool>:<ref>" or "sha256:<hex>"]. */
export const parentsOf = (file: string, sources: Source[]): [Relation, string][] => {
  const stems = mediaTypeOf(file) === 'archive';
  const out: [Relation, string][] = [];
  for (const s of sources) {
    const relation = stems ? 'stems' : (FROM_SOURCE[s.relation ?? ''] ?? (s.parentRef || s.sourceItem ? 'variation' : undefined));
    if (!relation) continue;
    if (s.parentRef && s.tool) out.push([relation, `${s.tool}:${s.parentRef}`]);
    if (s.sourceItem && /^[0-9a-f]{64}$/i.test(s.sourceItem)) out.push([relation, `sha256:${s.sourceItem.toLowerCase()}`]);
  }
  return out;
};

const resolve = (lib: Lib, parent: string) => {
  if (parent.startsWith('sha256:')) return (lib.db.prepare('SELECT id FROM items WHERE id = ?').get(parent.slice(7)) as { id: string } | undefined)?.id;
  const at = parent.indexOf(':');
  return (lib.db.prepare('SELECT item_id FROM sources WHERE tool = ? AND ref = ?').get(parent.slice(0, at), parent.slice(at + 1)) as { item_id: string } | undefined)?.item_id;
};

/** Parents still to find: each is looked up again (the parent may have come in since). */
export const resolveRelations = (lib: Lib) => {
  let found = 0;
  for (const r of lib.db.prepare('SELECT rowid, item_id, parent FROM relations WHERE parent_id IS NULL').all() as { rowid: number; item_id: string; parent: string }[]) {
    const id = resolve(lib, r.parent);
    if (id && id !== r.item_id) found += Number(lib.db.prepare('UPDATE relations SET parent_id = ? WHERE rowid = ?').run(id, r.rowid).changes);
  }
  return found;
};

/** Record what an item was made from, as its sources say. */
export const linkRelations = (lib: Lib, id: string, file: string, sources: Source[]) => {
  const st = lib.db.prepare('INSERT OR IGNORE INTO relations (item_id, relation, parent, at) VALUES (?, ?, ?, ?)');
  for (const [relation, parent] of parentsOf(file, sources)) st.run(id, relation, parent, now());
  resolveRelations(lib);
};

export type Related = { relation: Relation; id: string | null; parent?: string };

/** What an item was made from (parents) and what was made from it (children). */
export const relationsOf = (lib: Lib, id: string) => ({
  parents: (lib.db.prepare('SELECT relation, parent_id AS id, parent FROM relations WHERE item_id = ? ORDER BY at').all(id) as Related[]).map(r => ({ ...r })),
  children: (lib.db.prepare('SELECT relation, item_id AS id FROM relations WHERE parent_id = ? ORDER BY at').all(id) as Related[]).map(r => ({ ...r })),
});
