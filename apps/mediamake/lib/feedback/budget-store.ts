import { getDatabase } from '../mongodb';
import { monthlyCeiling, monthOf, prMaxUsd, type Budget, type SpendPurpose } from './budget';

/** What was spent, by month and purpose, in MongoDB `feedback_ai_spend` (see ./budget). */
interface SpendDoc {
  month: string;
  purpose: SpendPurpose;
  costUSD: number;
  calls: number;
  updatedAt: string;
}

const spend = async () => (await getDatabase()).collection<SpendDoc>('feedback_ai_spend');

export const budgetDB = {
  /** Adds one call's cost to its month. */
  async record(purpose: SpendPurpose, costUSD: number, at: Date = new Date()): Promise<void> {
    await (await spend()).updateOne(
      { month: monthOf(at), purpose },
      { $inc: { costUSD: Math.max(0, costUSD), calls: 1 }, $set: { updatedAt: at.toISOString() } },
      { upsert: true },
    );
  },

  /** This month so far. `runningPrs` is how many fix runs are out: each holds the most it may spend. */
  async state(runningPrs = 0, at: Date = new Date()): Promise<Budget> {
    const month = monthOf(at);
    const docs = await (await spend()).find({ month }, { projection: { _id: 0 } }).toArray();
    const byPurpose: Budget['byPurpose'] = { triage: { costUSD: 0, calls: 0 }, pr: { costUSD: 0, calls: 0 } };
    for (const doc of docs) if (doc.purpose in byPurpose) byPurpose[doc.purpose] = { costUSD: doc.costUSD, calls: doc.calls };
    return {
      month,
      ceilingUSD: monthlyCeiling(),
      spentUSD: byPurpose.triage.costUSD + byPurpose.pr.costUSD,
      heldUSD: runningPrs * prMaxUsd(),
      byPurpose,
    };
  },
};
