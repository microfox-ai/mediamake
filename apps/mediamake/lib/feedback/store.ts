import { randomBytes } from 'crypto';
import { getDatabase } from '../mongodb';
import type { Feedback, FeedbackInput } from './feedback';
import type { MemberTier } from '@/lib/memberships/tiers';

/** Feedback records in MongoDB `feedback` (see ./feedback). */
const COLLECTION = 'feedback';

async function collection() {
  return (await getDatabase()).collection<Feedback>(COLLECTION);
}

let indexed: Promise<unknown> | null = null;
function ensureIndexes() {
  indexed ??= (async () => {
    const feedback = await collection();
    await feedback.createIndex({ feedbackId: 1 }, { unique: true });
    await feedback.createIndex({ clientId: 1, createdAt: -1 });
    await feedback.createIndex({ itemId: 1, createdAt: -1 }, { sparse: true });
    await feedback.createIndex({ status: 1, createdAt: -1 });
  })().catch(error => {
    indexed = null;
    throw error;
  });
  return indexed;
}

export const feedbackDB = {
  async add(clientId: string, tier: MemberTier, input: FeedbackInput): Promise<Feedback> {
    await ensureIndexes();
    const feedback: Feedback = {
      feedbackId: `fb_${randomBytes(9).toString('base64url')}`,
      clientId,
      tier,
      text: input.text,
      ...(input.itemId && { itemId: input.itemId }),
      ...(input.version && { version: input.version }),
      source: input.source,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    await (await collection()).insertOne({ ...feedback });
    return feedback;
  },

  /** How many an account sent since a moment: the daily limit. */
  async countSince(clientId: string, since: string): Promise<number> {
    return (await collection()).countDocuments({ clientId, createdAt: { $gte: since } });
  },

  /** Newest first: one account's, or everyone's for admins, optionally about one item. */
  async list(filter: { clientId?: string; itemId?: string; status?: string }, limit = 100): Promise<Feedback[]> {
    const query = Object.fromEntries(Object.entries(filter).filter(([, value]) => value !== undefined));
    return (await collection()).find(query, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  },
};
