import { getDatabase } from '../mongodb';
import type { Rating, RatingInput, RatingSummary } from './ratings';

/** Ratings in MongoDB `ratings` (see ./ratings): one per account and item. */
const COLLECTION = 'ratings';

async function collection() {
  return (await getDatabase()).collection<Rating>(COLLECTION);
}

let indexed: Promise<unknown> | null = null;
function ensureIndexes() {
  indexed ??= (async () => {
    await (await collection()).createIndex({ itemId: 1, clientId: 1 }, { unique: true });
  })().catch(error => {
    indexed = null;
    throw error;
  });
  return indexed;
}

const round = (average: number) => Math.round(average * 10) / 10;

export const ratingsDB = {
  /** Sets an account's rating of an item, replacing the one it gave before. */
  async set(clientId: string, input: RatingInput): Promise<Rating> {
    await ensureIndexes();
    const now = new Date().toISOString();
    const ratings = await collection();
    await ratings.updateOne(
      { itemId: input.itemId, clientId },
      { $set: { stars: input.stars, source: input.source, updatedAt: now, ...(input.version && { version: input.version }) }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    return (await ratings.findOne({ itemId: input.itemId, clientId }, { projection: { _id: 0 } }))!;
  },

  /** The stars an account gave an item, or null. */
  async mine(clientId: string, itemId: string): Promise<number | null> {
    return (await (await collection()).findOne({ itemId, clientId }, { projection: { _id: 0, stars: 1 } }))?.stars ?? null;
  },

  async remove(clientId: string, itemId: string) {
    await (await collection()).deleteOne({ itemId, clientId });
  },

  /** One item's average and count, or null when nobody rated it. */
  async summary(itemId: string): Promise<RatingSummary | null> {
    return (await this.summaries([itemId])).get(itemId) ?? null;
  },

  /** Every rated item's average and count (or only the ones named). */
  async summaries(itemIds?: string[]): Promise<Map<string, RatingSummary>> {
    const rows = await (await collection())
      .aggregate<{ _id: string; average: number; count: number }>([
        ...(itemIds ? [{ $match: { itemId: { $in: itemIds } } }] : []),
        { $group: { _id: '$itemId', average: { $avg: '$stars' }, count: { $sum: 1 } } },
      ])
      .toArray();
    return new Map(rows.map(row => [row._id, { average: round(row.average), count: row.count }]));
  },
};
