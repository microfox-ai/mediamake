import { randomBytes } from 'crypto';
import { getDatabase } from '../mongodb';
import type { KnownIssue } from './known-issues';

/** Known issues in MongoDB `known_issues` (see ./known-issues). */
const collection = async () => (await getDatabase()).collection<KnownIssue>('known_issues');

export const knownIssuesDB = {
  async add(input: { itemId: string; title: string; note?: string; feedbackId?: string; by: string }): Promise<KnownIssue> {
    const issue: KnownIssue = {
      issueId: `ki_${randomBytes(9).toString('base64url')}`,
      itemId: input.itemId,
      title: input.title,
      ...(input.note && { note: input.note }),
      status: 'open',
      feedbackIds: input.feedbackId ? [input.feedbackId] : [],
      createdBy: input.by,
      createdAt: new Date().toISOString(),
    };
    await (await collection()).insertOne({ ...issue });
    return issue;
  },

  async update(issueId: string, set: Partial<KnownIssue>, unset: (keyof KnownIssue)[] = []): Promise<KnownIssue | null> {
    return (await collection()).findOneAndUpdate(
      { issueId },
      { $set: set, ...(unset.length > 0 && { $unset: Object.fromEntries(unset.map(key => [key, ''])) }) },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
  },

  /** Ties one more feedback to an issue. */
  async link(issueId: string, feedbackId: string): Promise<KnownIssue | null> {
    return (await collection()).findOneAndUpdate({ issueId }, { $addToSet: { feedbackIds: feedbackId } }, { returnDocument: 'after', projection: { _id: 0 } });
  },

  async remove(issueId: string): Promise<boolean> {
    return (await (await collection()).deleteOne({ issueId })).deletedCount > 0;
  },

  async forItem(itemId: string): Promise<KnownIssue[]> {
    return (await collection()).find({ itemId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
  },

  async all(): Promise<KnownIssue[]> {
    return (await collection()).find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(500).toArray();
  },

  /** Marks the open issues that came from these feedback as fixed. */
  async fixFor(feedbackIds: string[], fixedIn?: string): Promise<number> {
    if (feedbackIds.length === 0) return 0;
    const result = await (await collection()).updateMany(
      { status: 'open', feedbackIds: { $in: feedbackIds } },
      { $set: { status: 'fixed', fixedAt: new Date().toISOString(), ...(fixedIn && { fixedIn }) } },
    );
    return result.modifiedCount;
  },
};
