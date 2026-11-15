import { getDatabase } from '../mongodb';
import type { LocalSkill, SkillRun, SkillUsage } from './usage';

/**
 * Usage in MongoDB (see ./usage for what it is):
 * - `skill_runs`: one document per run, `{ clientId, skill, at }` and nothing more.
 * - `local_skills`: the last list each of an account's devices reported,
 *   `{ clientId, device, skills: [{ name, version }], reportedAt }`.
 */
const COL = { runs: 'skill_runs', local: 'local_skills' } as const;

interface RunDoc extends SkillRun {
  clientId: string;
}

export interface LocalSkillsDoc {
  clientId: string;
  device: string;
  skills: LocalSkill[];
  reportedAt: string;
}

let indexed: Promise<unknown> | null = null;
/** Creates the indexes usage relies on, once per server. Safe to run repeatedly. */
export function ensureUsageIndexes() {
  indexed ??= (async () => {
    const db = await getDatabase();
    // the same run reported twice (a retry, two hooks) is one run
    await db.collection(COL.runs).createIndex({ clientId: 1, skill: 1, at: 1 }, { unique: true });
    await db.collection(COL.runs).createIndex({ clientId: 1, at: -1 });
    await db.collection(COL.local).createIndex({ clientId: 1, device: 1 }, { unique: true });
  })().catch(error => {
    indexed = null;
    throw error;
  });
  return indexed;
}

export const usageDB = {
  /** Saves runs; ones already saved are skipped. Returns how many were new. */
  async addRuns(clientId: string, runs: SkillRun[]): Promise<number> {
    if (!runs.length) return 0;
    await ensureUsageIndexes();
    const db = await getDatabase();
    const res = await db.collection<RunDoc>(COL.runs).bulkWrite(
      runs.map(({ skill, at }) => ({ updateOne: { filter: { clientId, skill, at }, update: { $setOnInsert: { clientId, skill, at } }, upsert: true } })),
      { ordered: false },
    );
    return res.upsertedCount;
  },

  /** An account's skills by how often they ran since `since`, most used first. */
  async usageOf(clientId: string, since: string): Promise<SkillUsage[]> {
    const db = await getDatabase();
    const rows = await db
      .collection<RunDoc>(COL.runs)
      .aggregate<{ _id: string; runs: number; lastAt: string }>([
        { $match: { clientId, at: { $gte: since } } },
        { $group: { _id: '$skill', runs: { $sum: 1 }, lastAt: { $max: '$at' } } },
        { $sort: { runs: -1, lastAt: -1, _id: 1 } },
      ])
      .toArray();
    return rows.map(row => ({ skill: row._id, runs: row.runs, lastAt: row.lastAt }));
  },

  /** Replaces what one device last reported. */
  async setLocalSkills(clientId: string, device: string, skills: LocalSkill[]): Promise<LocalSkillsDoc> {
    await ensureUsageIndexes();
    const doc: LocalSkillsDoc = { clientId, device, skills, reportedAt: new Date().toISOString() };
    await (await getDatabase()).collection<LocalSkillsDoc>(COL.local).replaceOne({ clientId, device }, doc, { upsert: true });
    return doc;
  },

  /** What each of an account's devices last reported, newest first. */
  async localSkillsOf(clientId: string): Promise<Omit<LocalSkillsDoc, 'clientId'>[]> {
    return (await getDatabase())
      .collection<LocalSkillsDoc>(COL.local)
      .find({ clientId }, { projection: { _id: 0, clientId: 0 } })
      .sort({ reportedAt: -1 })
      .toArray();
  },

  /** Deletes everything usage holds of an account. */
  async forget(clientId: string): Promise<{ runs: number; devices: number }> {
    const db = await getDatabase();
    const [runs, devices] = await Promise.all([db.collection(COL.runs).deleteMany({ clientId }), db.collection(COL.local).deleteMany({ clientId })]);
    return { runs: runs.deletedCount, devices: devices.deletedCount };
  },
};
