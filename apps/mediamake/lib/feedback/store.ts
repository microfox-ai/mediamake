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
    await feedback.createIndex({ 'pr.repo': 1, 'pr.number': 1 }, { sparse: true });
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

  async get(feedbackId: string): Promise<Feedback | null> {
    return (await collection()).findOne({ feedbackId }, { projection: { _id: 0 } });
  },

  /** Sets fields on one feedback, and clears the ones named in `unset`. The record after the change. */
  async update(feedbackId: string, set: Partial<Feedback>, unset: (keyof Feedback)[] = []): Promise<Feedback | null> {
    return (await collection()).findOneAndUpdate(
      { feedbackId },
      { $set: set, ...(unset.length > 0 && { $unset: Object.fromEntries(unset.map(key => [key, ''])) }) },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
  },

  /** The feedback still open about one item (or about MediaMake as a whole), newest first: what triage checks repeats against. */
  async openAbout(itemId: string | undefined, limit = 40): Promise<Feedback[]> {
    return (await collection())
      .find({ itemId: itemId ?? { $exists: false }, status: { $in: ['new', 'answered'] } }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  /** The feedback that repeats one. */
  async duplicatesOf(feedbackId: string): Promise<Feedback[]> {
    return (await collection()).find({ 'triage.duplicateOf': feedbackId }, { projection: { _id: 0 } }).toArray();
  },

  /** The feedback a pull request answers. */
  async byPr(repo: string, number: number): Promise<Feedback[]> {
    return (await collection()).find({ 'pr.repo': repo, 'pr.number': number }, { projection: { _id: 0 } }).toArray();
  },

  /** How many pull requests triage raised on its own since a moment: the daily limit. */
  async autoPrsSince(since: string): Promise<number> {
    return (await collection()).countDocuments({ 'pr.by': 'auto', 'pr.at': { $gte: since } });
  },

  /** Fix runs started and not heard from yet: each holds its share of the monthly ceiling. */
  async prsRunning(since: string): Promise<number> {
    return (await collection()).countDocuments({ 'pr.state': 'requested', 'pr.at': { $gte: since } });
  },

  /** Everything for the admin page, newest first. */
  async all(limit = 500): Promise<Feedback[]> {
    await ensureIndexes();
    return (await collection()).find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  },
};
