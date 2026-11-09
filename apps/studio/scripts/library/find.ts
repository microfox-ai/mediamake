/**
 * find and show: search the library before downloading anything. Words go through the full-text
 * index (titles, file names, subjects, tags, searches, prompts, notes); facets narrow it. Items the
 * user rated bad are left out unless asked for (`--all`), so a rejected clip isn't cast again.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getItem, tagsOf, type Item } from './db.ts';
import { absOf, locationsOf, sourcesOf, type Lib } from './lib.ts';
import { frames, sheet } from './probe.ts';
import { relationsOf } from './relations.ts';
import { channelClause } from './share.ts';
import { lpad, pad, size } from './sys.ts';

export type FindOptions = {
  kind?: string;
  subject?: string;
  /** a channel's items: <channel>/… subjects (its songs, its art), its tag, use in its productions */
  channel?: string;
  minHeight?: number;
  hasAudio?: boolean;
  unused?: boolean;
  role?: string;
  all?: boolean;
  limit?: number;
};

/** "zoro twixtor 4k" → every word must match, each as a prefix. */
const ftsQuery = (words: string) =>
  words
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(w => `"${w}"*`)
    .join(' ');

export const find = (lib: Lib, words: string, o: FindOptions = {}): Item[] => {
  const where: string[] = [];
  const args: unknown[] = [];
  const q = ftsQuery(words);
  if (q) {
    where.push('i.id IN (SELECT item_id FROM search WHERE search MATCH ?)');
    args.push(q);
  }
  if (o.kind) {
    where.push('(i.kind = ? OR (i.kind = ? AND EXISTS (SELECT 1 FROM tags t WHERE t.item_id = i.id AND t.tag = ?)))');
    args.push(o.kind, '_unsorted', `kind:${o.kind}`);
  }
  if (o.subject) {
    where.push('(i.subject = ? OR i.subject LIKE ? OR i.subject LIKE ?)');
    args.push(o.subject, `${o.subject}/%`, `%/${o.subject}`);
  }
  if (o.channel) {
    const c = channelClause(lib, o.channel);
    where.push(c.sql);
    args.push(...c.args);
  }
  if (o.minHeight) {
    where.push('i.height >= ?');
    args.push(o.minHeight);
  }
  if (o.hasAudio !== undefined) {
    where.push('i.has_audio = ?');
    args.push(Number(o.hasAudio));
  }
  if (o.unused) where.push('NOT EXISTS (SELECT 1 FROM uses u WHERE u.item_id = i.id)');
  if (o.role) {
    where.push('i.role = ?');
    args.push(o.role);
  }
  // 'bad' from the CLI, 1–2 stars from the Library page
  if (!o.all) where.push("(i.rating IS NULL OR i.rating NOT IN ('bad', '1', '2'))", "i.status != 'missing'");
  const sql = `SELECT i.* FROM items i ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
               ORDER BY (i.role = 'library') DESC, i.height DESC, i.added_at DESC LIMIT ${Math.max(1, o.limit ?? 40)}`;
  return lib.db.prepare(sql).all(...args) as Item[];
};

const res = (it: Item) =>
  it.height ? `${it.height}p${it.fps && it.fps >= 48 ? Math.round(it.fps) : ''}` : it.duration ? `${Math.round(it.duration)} s` : '';

export const printItems = (lib: Lib, items: Item[]) => {
  if (!items.length) return lib.log('Nothing found. Try fewer words, or drop a facet.');
  for (const it of items) {
    const uses = (lib.db.prepare('SELECT COUNT(*) AS n FROM uses WHERE item_id = ?').get(it.id)?.n as number) ?? 0;
    if (it.status === 'remote') {
      const r = lib.db.prepare('SELECT channel, url FROM remote WHERE item_id = ?').get(it.id) as { channel: string; url: string | null } | undefined;
      const how = r?.url ? `media sync pull --ids=${it.id.slice(0, 10)} --yes` : 'details only: its file is not shared';
      lib.log(`${it.id.slice(0, 10)}  ${pad(it.kind, 10)} ${lpad(res(it), 8)} ${lpad(size(it.bytes), 8)}  ${it.title ?? it.id}  (remote: ${r?.channel ?? '?'} team's · ${how})`);
      continue;
    }
    const flags = [it.rating === 'bad' ? 'rated bad' : '', it.status !== 'online' ? it.status : '', uses ? `used ×${uses}` : '', it.role !== 'library' ? `in ${it.role}` : '']
      .filter(Boolean)
      .join(', ');
    lib.log(`${it.id.slice(0, 10)}  ${pad(it.kind, 10)} ${lpad(res(it), 8)} ${lpad(size(it.bytes), 8)}  ${absOf(lib, it.path)}${flags ? `  (${flags})` : ''}`);
  }
};

/** Everything known about one item: what it is, where it came from, where its copies are, who used it. */
export const describe = (lib: Lib, it: Item) => ({
  ...it,
  abs: it.status === 'remote' ? null : absOf(lib, it.path),
  remote: it.status === 'remote' ? (lib.db.prepare('SELECT channel, url, file_name AS fileName, pulled_at AS pulledAt FROM remote WHERE item_id = ?').get(it.id) ?? null) : null,
  shared: lib.db.prepare('SELECT channel, via, approved_at AS approvedAt, uploaded_at AS uploadedAt FROM shares WHERE item_id = ?').all(it.id),
  ...relationsOf(lib, it.id),
  thumb: fs.existsSync(path.join(lib.thumbs, `${it.id}.jpg`)) ? path.join(lib.thumbs, `${it.id}.jpg`) : null,
  tags: tagsOf(lib.db, it.id),
  sources: sourcesOf(lib, it.id),
  copies: locationsOf(lib, it.id).map(l => ({ ...l, path: absOf(lib, l.path) })),
  uses: lib.db.prepare('SELECT production, as_path AS asPath, skill, at, verdict FROM uses WHERE item_id = ? ORDER BY at').all(it.id),
  notes: lib.db.prepare('SELECT at, text, production FROM notes WHERE item_id = ? ORDER BY at').all(it.id),
  cached: lib.db.prepare('SELECT kind, params, tool, path, at FROM derived WHERE item_id = ? ORDER BY kind').all(it.id),
});

export const printItem = (lib: Lib, id: string) => {
  const it = getItem(lib.db, id)!;
  const d = describe(lib, it);
  lib.log(`${d.title ?? path.basename(d.path)}  [${d.kind}${d.subject ? ` · ${d.subject}` : ''}]  ${d.id}`);
  lib.log(`  ${d.abs ?? `remote: the ${(d.remote as { channel?: string } | null)?.channel ?? ''} team's${(d.remote as { url?: string } | null)?.url ? ` (media sync pull --ids=${d.id.slice(0, 10)} --yes)` : ', details only'}`}`);
  lib.log(`  ${[res(it), size(it.bytes), it.codec, it.has_audio === 0 ? 'no sound' : ''].filter(Boolean).join(' · ')}`);
  if (d.tags.length) lib.log(`  tags: ${d.tags.join(', ')}`);
  for (const s of d.sources) lib.log(`  from ${s.tool}${s.ref ? ` ${s.ref}` : ''}${s.title ? `: ${s.title}` : ''}${s.query ? ` (search "${s.query}")` : ''}${s.url ? `  ${s.url}` : ''}`);
  for (const c of d.copies.filter(c => c.path !== d.abs)) lib.log(`  copy (${c.role}${c.production ? ` ${c.production}` : ''}): ${c.path}`);
  for (const u of d.uses as { production: string; asPath: string; verdict: string | null }[]) lib.log(`  used in ${u.production} as ${u.asPath}${u.verdict ? ` (${u.verdict})` : ''}`);
  for (const n of d.notes as { at: string; text: string }[]) lib.log(`  note ${n.at.slice(0, 10)}: ${n.text}`);
  for (const c of d.cached as { kind: string; params: string }[]) lib.log(`  cached: ${c.kind}${c.params !== 'default' ? ` (${c.params})` : ''}`);
  if (it.rating) lib.log(`  rated ${it.rating}`);
  for (const r of d.parents) lib.log(`  ${r.relation} of ${r.id ? (getItem(lib.db, r.id)?.title ?? r.id.slice(0, 10)) : `${r.parent} (not in the library yet)`}`);
  for (const r of d.children) lib.log(`  has a ${r.relation}: ${getItem(lib.db, r.id!)?.title ?? r.id?.slice(0, 10)}`);
  for (const sh of d.shared as { channel: string; uploadedAt: string | null }[]) lib.log(`  shared with the ${sh.channel} team${sh.uploadedAt ? '' : ' (uploads on the next media sync push --yes)'}`);
  if (it.lyrics) lib.log(`  lyrics: ${it.lyrics.split('\n').filter(Boolean).slice(0, 2).join(' / ')}…`);
};

/** A labelled grid of the found items (or 12 frames of one video), for looking before casting. */
export const sheetOf = (lib: Lib, items: Item[], out: string) => {
  if (items.length === 1 && items[0].duration && /^\.(mp4|mov|webm|mkv|m4v)$/.test(items[0].ext)) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-frames-'));
    try {
      return sheet(frames(absOf(lib, items[0].path), items[0].duration, tmp), out, 4);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  const cells = items
    .map((it, i) => ({ image: path.join(lib.thumbs, `${it.id}.jpg`), label: `${i + 1} ${it.id.slice(0, 6)} ${res(it)} ${path.basename(it.path)}` }))
    .filter(c => fs.existsSync(c.image));
  return sheet(cells, out);
};
