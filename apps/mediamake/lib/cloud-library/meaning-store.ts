/**
 * The Library's search index in Upstash Vector (./meaning). A hybrid index made with Upstash's own
 * embedding models, so text goes in and comes out and no embedding key is needed. Its own index,
 * apart from the presets': LIBRARY_VECTOR_REST_URL and LIBRARY_VECTOR_REST_TOKEN. Without them the
 * Library works as before and a search by meaning says so.
 *
 * Nothing here is the truth: every answer is read again from MongoDB by the store, which also
 * applies who may see what.
 */
import type { CollectionRecord, EntryRecord } from './index';
import { namespaceOf, prefixOf, rank, recordsOf, type MeaningHit, type Ranked } from './meaning';
import { MAX_INLINE_BYTES, blobKey, readText, storageReady } from './storage';

const url = () => process.env.LIBRARY_VECTOR_REST_URL?.trim().replace(/\/+$/, '') ?? '';
const token = () => process.env.LIBRARY_VECTOR_REST_TOKEN?.trim() ?? '';

export const meaningReady = () => !!(url() && token());
export const NO_INDEX = 'Search by meaning is not set up on this server (LIBRARY_VECTOR_REST_URL and LIBRARY_VECTOR_REST_TOKEN). Search by words and filters works without it.';

const BATCH = 50;
/** A text file larger than this is not put in the index (its card still is). */
const MAX_TEXT_BYTES = Math.min(MAX_INLINE_BYTES, 2_000_000);

async function call<T>(method: 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${url()}/${path}`, { method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20_000) });
  const answer = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok) throw Object.assign(new Error(`The search index answered ${res.status}${answer.error ? `: ${answer.error}` : ''}`), { status: res.status });
  return answer.result as T;
}

const quiet = (what: string, error: unknown) => console.error(`[library] Could not ${what}:`, error instanceof Error ? error.message : error);

/** The text and JSON files of an entry that are small enough to index, by slot. */
async function textsOf(space: string, entry: Pick<EntryRecord, 'slots'>): Promise<Record<string, string>> {
  const texts: Record<string, string> = {};
  if (!storageReady()) return texts;
  for (const [slot, files] of Object.entries(entry.slots)) {
    const file = files[0];
    if (!file || (file.type !== 'text' && file.type !== 'json') || file.size > MAX_TEXT_BYTES) continue;
    const content = await readText(blobKey(space, file.sha256), file.size);
    if (content) texts[slot] = content;
  }
  return texts;
}

export const meaningIndex = {
  /** Puts an entry in the index, in place of what it had there. Never throws: a save must not fail on the index. */
  async put(space: string, collection: CollectionRecord, entry: EntryRecord): Promise<number> {
    if (!meaningReady()) return 0;
    try {
      const namespace = namespaceOf(space, collection.slug);
      const records = recordsOf(collection, entry, await textsOf(space, entry));
      await call('DELETE', `delete/${namespace}`, { prefix: prefixOf(entry.slug) }).catch(() => null); // a namespace that isn't there yet
      for (let at = 0; at < records.length; at += BATCH) await call('POST', `upsert-data/${namespace}`, records.slice(at, at + BATCH));
      return records.length;
    } catch (error) {
      quiet(`index ${collection.slug}/${entry.slug}`, error);
      return 0;
    }
  },

  /** Takes an entry out of the index. Never throws. */
  async forget(space: string, collection: string, entry: string): Promise<void> {
    if (!meaningReady()) return;
    await call('DELETE', `delete/${namespaceOf(space, collection)}`, { prefix: prefixOf(entry) }).catch(error => quiet(`take ${collection}/${entry} out of the index`, error));
  },

  /** Empties a collection's part of the index, before it is rebuilt. Never throws. */
  async clear(space: string, collection: string): Promise<void> {
    if (!meaningReady()) return;
    await call('DELETE', `delete-namespace/${namespaceOf(space, collection)}`).catch(error => {
      if ((error as { status?: number }).status !== 404) quiet(`empty the index of ${collection}`, error);
    });
  },

  /** One collection's entries by meaning, best first. A collection with nothing indexed answers with none. */
  async ask(space: string, collection: string, words: string, topK: number): Promise<Ranked[]> {
    try {
      const hits = await call<MeaningHit[]>('POST', `query-data/${namespaceOf(space, collection)}`, { data: words, topK, includeMetadata: true, includeData: true });
      return rank(Array.isArray(hits) ? hits : []);
    } catch (error) {
      quiet(`search ${collection} by meaning`, error);
      return [];
    }
  },
};
