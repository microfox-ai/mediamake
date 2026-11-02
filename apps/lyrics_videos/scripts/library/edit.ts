/**
 * Changes to what the library knows: tags, ratings ("twixtors look bad" → rated bad, so it isn't
 * cast again), notes, and moving an item to the right folder. The Library page asks for the same
 * changes by writing request files (<root>/.catalog/requests/*.json, mediamake.library-request/v1),
 * which `media apply-requests` carries out, so the catalog keeps one writer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { destOf } from './classify.ts';
import { getItem, reindex, tagsOf, tx, type Item, type Kind } from './db.ts';
import { absOf, addTags, relOf, type Lib } from './lib.ts';
import { saveProduction, type Production } from './production.ts';
import { dropEntry, putEntry, readFolder } from './sidecar.ts';
import { freePath, move, now, readJson } from './sys.ts';

const inLibrary = (it: Item) => !path.isAbsolute(it.path);

/** Keep the item's .media.json entry in step with the catalog (library items only). */
const syncSidecar = (lib: Lib, it: Item) => {
  if (!inLibrary(it)) return;
  const abs = absOf(lib, it.path);
  const notes = lib.db.prepare('SELECT at, text, production FROM notes WHERE item_id = ? ORDER BY at').all(it.id) as { at: string; text: string; production: string | null }[];
  putEntry(path.dirname(abs), path.basename(abs), {
    sha256: it.id,
    kind: it.kind,
    subject: it.subject,
    title: it.title,
    tags: tagsOf(lib.db, it.id),
    rating: it.rating,
    notes: notes.map(n => ({ at: n.at, text: n.text, production: n.production ?? undefined })),
  });
};

export const tag = (lib: Lib, it: Item, add: string[], remove: string[] = []) => {
  tx(lib.db, () => {
    addTags(lib, it.id, add);
    for (const t of remove) lib.db.prepare('DELETE FROM tags WHERE item_id = ? AND tag = ?').run(it.id, t.toLowerCase());
    reindex(lib.db, it.id);
  });
  syncSidecar(lib, getItem(lib.db, it.id)!);
};

export const rate = (lib: Lib, it: Item, rating: string | null, note?: string, production?: string) => {
  tx(lib.db, () => {
    lib.db.prepare('UPDATE items SET rating = ? WHERE id = ?').run(rating, it.id);
    if (note) lib.db.prepare('INSERT INTO notes (item_id, at, text, production) VALUES (?, ?, ?, ?)').run(it.id, now(), note, production ?? null);
    reindex(lib.db, it.id);
  });
  syncSidecar(lib, getItem(lib.db, it.id)!);
};

/** Move a library item to the folder its kind and subject say (its name is kept). */
export const moveItem = async (lib: Lib, it: Item, to: { kind?: Kind; subject?: string; folder?: string }) => {
  if (!inLibrary(it)) throw new Error(`${it.path} isn't in the library yet: media ingest it first`);
  const from = absOf(lib, it.path);
  const name = path.basename(from);
  const kind = to.kind ?? (it.kind === '_unsorted' ? undefined : it.kind);
  if (!to.folder && !kind) throw new Error('Say where it goes: --kind=<kind> (and --subject=…), or --to=<folder in the library>');
  const subject = to.subject ?? it.subject;
  const rel = to.folder ?? path.dirname(destOf({ kind: kind!, subject, name, tags: [], title: name, confidence: 1 }));
  if (path.join(lib.root, rel, name) === from) return it;
  const dest = freePath(path.join(lib.root, rel, name));
  const entry = dropEntry(path.dirname(from), name) ?? readFolder(path.dirname(from)).items[name];
  await move(from, dest);
  const next = { ...it, path: relOf(lib, dest), kind: kind ?? it.kind, subject };
  tx(lib.db, () => {
    lib.db.prepare('UPDATE items SET path = ?, kind = ?, subject = ? WHERE id = ?').run(next.path, next.kind, next.subject, it.id);
    lib.db.prepare('UPDATE locations SET path = ? WHERE path = ?').run(next.path, it.path);
    lib.db.prepare("DELETE FROM tags WHERE item_id = ? AND tag LIKE 'kind:%'").run(it.id);
    reindex(lib.db, it.id);
  });
  if (entry) putEntry(path.dirname(dest), path.basename(dest), { ...entry, kind: next.kind, subject: next.subject });
  syncSidecar(lib, getItem(lib.db, it.id)!);
  return getItem(lib.db, it.id)!;
};

/** What the Library page writes (apps/mediamake/lib/library/types.ts), plus the CLI's own ops. */
type Request =
  | { op: 'tag'; target: string; add?: string[]; remove?: string[] }
  | { op: 'rate'; target: string; rating: 'good' | 'bad' | number | null; note?: string }
  | { op: 'note'; target: string; text: string }
  | { op: 'sort'; target: string; kind: Kind; subject?: string; tags?: string[] }
  | { op: 'move'; target: string; kind?: Kind; subject?: string }
  | { op: 'set-channel'; target: string; channel: string | null }
  | { op: 'set-thumbnail'; target: string; item: string }
  | { op: 'production'; target: string; channel?: string; title?: string; status?: Production['status'] };

/** Carry out what the Library page asked for; each request file then moves to requests/done/. */
export const applyRequests = async (lib: Lib) => {
  const dir = path.join(lib.catalog, 'requests');
  if (!fs.existsSync(dir)) return { applied: 0, failed: [] as string[] };
  const failed: string[] = [];
  let applied = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const file = path.join(dir, f);
    const r = readJson<Request>(file);
    try {
      if (!r) throw new Error('unreadable');
      if (r.op === 'production') saveProduction(lib, r.target, { channel: r.channel, title: r.title, status: r.status });
      else if (r.op === 'set-channel') saveProduction(lib, r.target, { channel: r.channel ?? undefined });
      else if (r.op === 'set-thumbnail') {
        if (!getItem(lib.db, r.item)) throw new Error(`no item ${r.item}`);
        saveProduction(lib, r.target, { thumbnailItem: r.item });
      } else {
        const it = getItem(lib.db, r.target);
        if (!it) throw new Error(`no item ${r.target}`);
        if (r.op === 'tag') tag(lib, it, r.add ?? [], r.remove ?? []);
        // the page rates 1–5; the CLI says good or bad (1–2 count as bad: `find` leaves them out)
        else if (r.op === 'rate') rate(lib, it, r.rating === null ? null : String(r.rating), r.note);
        else if (r.op === 'note') rate(lib, it, it.rating, r.text);
        else if (r.op === 'sort' || r.op === 'move') {
          const moved = await moveItem(lib, it, { kind: r.kind, subject: r.subject });
          if (r.op === 'sort' && r.tags?.length) tag(lib, moved, r.tags);
        }
      }
      applied++;
      fs.mkdirSync(path.join(dir, 'done'), { recursive: true });
      fs.renameSync(file, path.join(dir, 'done', f));
    } catch (err) {
      failed.push(`${f}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return { applied, failed };
};
