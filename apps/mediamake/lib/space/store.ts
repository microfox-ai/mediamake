import { getDatabase } from '../mongodb';
import { spaceItemKey, type SpaceChange, type SpaceItemRecord, type SpaceRecord, type SpaceState } from './space';

/**
 * Private spaces in MongoDB (see ./space for what they are):
 * - `spaces`: one document per account, `{ clientId, repo, connectedAt,
 *   updatedAt, devices: [{ device, branch, commit, commitAt, pushed, reportedAt }] }`.
 * - `space_items`: one document per item, `{ owner, kind, name, title,
 *   summary, version, media, devices: [{ device, version, changed }],
 *   projects, people, editors, createdAt, updatedAt }`. `projects` and
 *   `people` are indexed, so step 2b finds what a project's members or one
 *   member were given without reading every space.
 */
const COL = { spaces: 'spaces', items: 'space_items' } as const;

let indexed: Promise<unknown> | null = null;
/** Creates the indexes spaces rely on, once per server. Safe to run repeatedly. */
export function ensureSpaceIndexes() {
  indexed ??= (async () => {
    const db = await getDatabase();
    await db.collection(COL.spaces).createIndex({ clientId: 1 }, { unique: true });
    await db.collection(COL.items).createIndex({ owner: 1, kind: 1, name: 1 }, { unique: true });
    await db.collection(COL.items).createIndex({ projects: 1 });
    await db.collection(COL.items).createIndex({ people: 1 });
  })().catch(error => {
    indexed = null;
    throw error;
  });
  return indexed;
}

const noId = { projection: { _id: 0 } } as const;

export const spaceDB = {
  /** An account's space and its items, or `{ space: null, items: [] }`. */
  async stateOf(clientId: string): Promise<SpaceState> {
    const db = await getDatabase();
    const [space, items] = await Promise.all([
      db.collection<SpaceRecord>(COL.spaces).findOne({ clientId }, noId),
      db.collection<SpaceItemRecord>(COL.items).find({ owner: clientId }, noId).toArray(),
    ]);
    return { space: space as SpaceRecord | null, items: items as SpaceItemRecord[] };
  },

  /**
   * Saves what a report changed. What a computer reports is set field by
   * field, so sharing (`projects`, `people`, `editors`) set meanwhile from
   * the app is never written over.
   */
  async save(clientId: string, before: SpaceState, change: SpaceChange): Promise<void> {
    await ensureSpaceIndexes();
    const db = await getDatabase();
    await db.collection<SpaceRecord>(COL.spaces).replaceOne({ clientId }, change.space, { upsert: true });
    const was = new Map(before.items.map(item => [spaceItemKey(item), item]));
    const writes = change.items
      .filter(item => was.get(spaceItemKey(item)) !== item)
      .map(item => {
        const { owner, kind, name, projects, people, editors, createdAt, summary, version, media, ...reported } = item;
        const unset = { ...(summary === undefined && { summary: '' }), ...(version === undefined && { version: '' }), ...(media === undefined && { media: '' }) };
        return {
          updateOne: {
            filter: { owner, kind, name },
            update: {
              $set: { ...reported, ...(summary !== undefined && { summary }), ...(version !== undefined && { version }), ...(media !== undefined && { media }) },
              ...(Object.keys(unset).length && { $unset: unset }),
              $setOnInsert: { projects, people, editors, createdAt },
            },
            upsert: true,
          },
        };
      });
    if (writes.length) await db.collection<SpaceItemRecord>(COL.items).bulkWrite(writes as never, { ordered: false });
    const gone = change.removed.map(key => {
      const [kind, name] = key.split('/');
      return { owner: clientId, kind, name };
    });
    // only while it is still unshared: sharing may have been added since it was read
    if (gone.length) await db.collection(COL.items).deleteMany({ $or: gone, projects: { $size: 0 }, people: { $size: 0 } });
  },

  /** Deletes everything MediaMake holds of an account's space. The repo is the member's and is untouched. */
  async forget(clientId: string): Promise<{ items: number }> {
    const db = await getDatabase();
    const [, items] = await Promise.all([db.collection(COL.spaces).deleteOne({ clientId }), db.collection(COL.items).deleteMany({ owner: clientId })]);
    return { items: items.deletedCount };
  },
};
