import { randomUUID } from 'node:crypto';
import { getDatabase } from '../mongodb';
import { MAX_MADE, type MadeEntry } from './made';

/** What members made with an item (./made), in MongoDB `catalog_made`, by the item's details key. */

const COLLECTION = 'catalog_made';

let indexed: Promise<unknown> | null = null;
async function made() {
  const db = await getDatabase();
  const collection = db.collection<MadeEntry>(COLLECTION);
  indexed ??= collection.createIndex({ key: 1, at: -1 }).catch(() => null);
  await indexed;
  return collection;
}

export const madeDB = {
  /** An item's entries, the newest first. */
  async list(key: string): Promise<MadeEntry[]> {
    return (await made()).find({ key }, { projection: { _id: 0 } }).sort({ at: -1 }).limit(MAX_MADE).toArray();
  },

  async add(entry: Omit<MadeEntry, 'id' | 'at'>): Promise<MadeEntry> {
    const saved: MadeEntry = { ...entry, id: randomUUID().slice(0, 12), at: new Date().toISOString() };
    await (await made()).insertOne({ ...saved });
    return saved;
  },

  /** Removes one entry: its adder's own, or any when `by` is left out (an admin). True when one was removed. */
  async remove(key: string, id: string, by?: string): Promise<boolean> {
    const result = await (await made()).deleteOne({ key, id, ...(by && { by }) });
    return result.deletedCount > 0;
  },
};
