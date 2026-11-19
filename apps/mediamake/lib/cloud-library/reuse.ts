/**
 * Paid work is found before it is paid for again (docs/library.md › Reuse). A file in a slot can
 * say what it was made from: a transcript from one exact master, with one tool and its settings.
 * Asking "what was made from this file?" by the file's SHA-256 finds that result from any computer
 * or cloud session, so nothing is spent twice.
 */
import { SHA256, SLUG, type EntryRecord } from './index';

export interface MadeFromAsk {
  /** The SHA-256 of the file the result was made from. */
  sha256: string;
  /** Only results in this slot (`transcript`). */
  slot?: string;
  /** Only results made with this tool, whatever its letters' case. */
  tool?: string;
  /** The settings the result must have been made with. None means the tool's defaults: a result made with other settings is a different result. */
  params: string;
}

export interface MadeFromHit {
  ref: string;
  title: string;
  slot: string;
  name: string;
  size: number;
  sha256: string;
  tool?: string;
  params?: string;
  addedAt: string;
}

/** Settings compare as words in any order: `letters lang=en` is `lang=en letters`. */
export const paramsKey = (params: string | undefined) => (params ?? '').toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ');

export function parseMadeFromAsk(params: URLSearchParams): MadeFromAsk | { error: string } {
  const sha256 = (params.get('madeFrom') ?? '').toLowerCase();
  if (!SHA256.test(sha256)) return { error: 'madeFrom is the SHA-256 of the file the result was made from' };
  const slot = (params.get('slot') ?? '').toLowerCase();
  if (slot && !SLUG.test(slot)) return { error: 'slot is a slot of the collection, e.g. transcript' };
  const tool = (params.get('tool') ?? '').trim().slice(0, 80);
  return { sha256, ...(slot && { slot }), ...(tool && { tool }), params: paramsKey(params.get('params') ?? '') };
}

/** The files in these entries that were made from the asked file with the asked settings, the newest first. */
export function madeFrom(entries: Pick<EntryRecord, 'collection' | 'slug' | 'title' | 'slots'>[], ask: MadeFromAsk): MadeFromHit[] {
  const hits: MadeFromHit[] = [];
  for (const entry of entries)
    for (const [slot, files] of Object.entries(entry.slots ?? {})) {
      if (ask.slot && slot !== ask.slot) continue;
      for (const file of files ?? []) {
        const from = file.madeFrom;
        if (!from || from.sha256 !== ask.sha256) continue;
        if (ask.tool && (from.tool ?? '').toLowerCase() !== ask.tool.toLowerCase()) continue;
        if (paramsKey(from.params) !== paramsKey(ask.params)) continue;
        hits.push({ ref: `${entry.collection}/${entry.slug}`, title: entry.title, slot, name: file.name, size: file.size, sha256: file.sha256, ...(from.tool && { tool: from.tool }), ...(from.params && { params: from.params }), addedAt: file.addedAt });
      }
    }
  return hits.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}
