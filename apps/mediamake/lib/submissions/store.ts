import { randomBytes } from 'crypto';
import { getDatabase } from '../mongodb';
import type { MemberTier } from '../memberships/tiers';
import { summarize, totalBytes, type Checks, type Submission, type SubmissionFile, type SubmissionInput } from './submission';

/**
 * Submissions in MongoDB: the record in `submissions` (see ./submission) and
 * its files apart in `submission_files`, so lists never load them. Files are
 * private: only the admin page and the delivery read them.
 */
const COLLECTION = 'submissions';
const FILES = 'submission_files';

interface StoredFiles {
  submissionId: string;
  files: SubmissionFile[];
  at: string;
}

async function collection() {
  return (await getDatabase()).collection<Submission>(COLLECTION);
}

async function filesCollection() {
  return (await getDatabase()).collection<StoredFiles>(FILES);
}

let indexed: Promise<unknown> | null = null;
function ensureIndexes() {
  indexed ??= (async () => {
    const submissions = await collection();
    await submissions.createIndex({ submissionId: 1 }, { unique: true });
    await submissions.createIndex({ clientId: 1, createdAt: -1 });
    await submissions.createIndex({ status: 1, updatedAt: -1 });
    await submissions.createIndex({ 'delivery.repo': 1, 'delivery.number': 1 }, { sparse: true });
    await (await filesCollection()).createIndex({ submissionId: 1 }, { unique: true });
  })().catch(error => {
    indexed = null;
    throw error;
  });
  return indexed;
}

const now = () => new Date().toISOString();

export const submissionsDB = {
  /** A new submission, waiting for an admin. */
  async add(clientId: string, tier: MemberTier, input: SubmissionInput, checks: Checks): Promise<Submission> {
    await ensureIndexes();
    const at = now();
    const { files, ...rest } = input;
    const submission: Submission = {
      submissionId: `sub_${randomBytes(9).toString('base64url')}`,
      clientId,
      tier,
      ...rest,
      itemId: `${input.kind}/${input.slug}`,
      files: summarize(files),
      bytes: totalBytes(files),
      checks,
      status: 'pending',
      createdAt: at,
      updatedAt: at,
      round: 1,
    };
    await (await collection()).insertOne({ ...submission });
    await (await filesCollection()).replaceOne({ submissionId: submission.submissionId }, { submissionId: submission.submissionId, files, at }, { upsert: true });
    return submission;
  },

  /** The same item sent again before a decision: the new files replace the old, and it waits for an admin again. */
  async resend(submissionId: string, tier: MemberTier, input: SubmissionInput, checks: Checks): Promise<Submission | null> {
    const at = now();
    const { files, kind: _kind, slug: _slug, ...rest } = input;
    const submission = await (await collection()).findOneAndUpdate(
      { submissionId, status: { $in: ['pending', 'changes'] } },
      { $set: { ...rest, tier, files: summarize(files), bytes: totalBytes(files), checks, status: 'pending', updatedAt: at }, $inc: { round: 1 }, ...(!rest.note && { $unset: { note: '' } }) },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    if (submission) await (await filesCollection()).replaceOne({ submissionId }, { submissionId, files, at }, { upsert: true });
    return submission;
  },

  async get(submissionId: string): Promise<Submission | null> {
    return (await collection()).findOne({ submissionId }, { projection: { _id: 0 } });
  },

  async filesOf(submissionId: string): Promise<SubmissionFile[]> {
    return (await (await filesCollection()).findOne({ submissionId }))?.files ?? [];
  },

  /** An account's undecided submission of one item, when it has one. */
  async undecidedOf(clientId: string, itemId: string): Promise<Submission | null> {
    return (await collection()).findOne({ clientId, itemId, status: { $in: ['pending', 'changes'] } }, { projection: { _id: 0 } });
  },

  /** Another account's submission of the same item that is still open or was accepted: names are first come, first served. */
  async takenBy(itemId: string, clientId: string): Promise<Submission | null> {
    return (await collection()).findOne({ itemId, clientId: { $ne: clientId }, status: { $in: ['pending', 'changes', 'approved', 'live'] } }, { projection: { _id: 0 } });
  },

  /** Whether this account made the item: an earlier submission of it by them was accepted (approved, or live). */
  async madeBy(itemId: string, clientId: string): Promise<boolean> {
    return !!(await (await collection()).findOne({ itemId, clientId, status: { $in: ['approved', 'live'] } }, { projection: { _id: 1 } }));
  },

  /** How many an account sent since a moment: the daily limit. */
  async countSince(clientId: string, since: string): Promise<number> {
    return (await collection()).countDocuments({ clientId, updatedAt: { $gte: since } });
  },

  /** One account's, newest first. */
  async listFor(clientId: string, limit = 100): Promise<Submission[]> {
    return (await collection()).find({ clientId }, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).limit(limit).toArray();
  },

  /** Everything for the admin page, newest first. */
  async all(limit = 500): Promise<Submission[]> {
    await ensureIndexes();
    return (await collection()).find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).limit(limit).toArray();
  },

  /** How many wait for an admin. */
  async pendingCount(): Promise<number> {
    return (await collection()).countDocuments({ status: 'pending' });
  },

  /** Sets fields on one submission, only while it is in one of `from` when given. The record after the change. */
  async update(submissionId: string, set: Partial<Submission>, from?: Submission['status'][]): Promise<Submission | null> {
    return (await collection()).findOneAndUpdate(
      { submissionId, ...(from && { status: { $in: from } }) },
      { $set: { ...set, updatedAt: now() } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
  },

  /**
   * Marks a submission as being approved by one admin, so a second click (or a second admin) does
   * not deliver it twice. A claim left by a request that died is taken over after three minutes.
   */
  async claim(submissionId: string, by: string): Promise<boolean> {
    const stale = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const res = await (await collection()).updateOne(
      { submissionId, status: { $in: ['pending', 'changes'] }, $or: [{ deciding: { $exists: false } }, { 'deciding.at': { $lt: stale } }] },
      { $set: { deciding: { by, at: now() } } },
    );
    return res.modifiedCount > 0;
  },

  /** Gives a claim back when the delivery failed. */
  async release(submissionId: string): Promise<void> {
    await (await collection()).updateOne({ submissionId }, { $unset: { deciding: '' } });
  },

  /** Records the decision of the admin who holds the claim. */
  async decide(submissionId: string, set: Pick<Submission, 'status' | 'delivery' | 'decision'>): Promise<Submission | null> {
    return (await collection()).findOneAndUpdate(
      { submissionId, status: { $in: ['pending', 'changes'] } },
      { $set: { ...set, updatedAt: now() }, $unset: { deciding: '', review: '' } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
  },

  /** The submissions a pull request delivers. */
  async byPr(repo: string, number: number): Promise<Submission[]> {
    return (await collection()).find({ 'delivery.kind': 'pr', 'delivery.repo': repo, 'delivery.number': number }, { projection: { _id: 0 } }).toArray();
  },

  /** Once it is closed for good its files are no longer needed here: the repository has them. */
  async dropFiles(submissionId: string): Promise<void> {
    await (await filesCollection()).deleteOne({ submissionId });
  },
};
