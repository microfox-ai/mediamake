/**
 * Rollup worker: daily/weekly/monthly aggregates.
 * Runs daily: reads platform_cost_usage where isCalculated and cost exists,
 * groups by clientId, platform, period (day/week/month), sums cost; upserts into platform_cost_usage_aggregates.
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import { z } from 'zod';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import {
  platformCostUsageDB,
  platformCostUsageAggregatesDB,
} from '../../../lib/cost-usage-mongodb';
import type { PeriodType } from '../../../lib/cost-usage-types';
import { getISOWeek, getISOWeekYear } from 'date-fns';

const InputSchema = z.object({}).catchall(z.unknown()).optional().default({});
const OutputSchema = z.object({
  documentsRead: z.number(),
  aggregatesUpserted: z.number(),
  errors: z.number(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

function getPeriodValue(date: Date, periodType: PeriodType): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  if (periodType === 'day') return `${y}-${m}-${d}`;
  if (periodType === 'month') return `${y}-${m}`;
  if (periodType === 'week') {
    const wy = getISOWeekYear(date);
    const ww = getISOWeek(date);
    return `${wy}-W${String(ww).padStart(2, '0')}`;
  }
  return `${y}-${m}-${d}`;
}

export const workerConfig: WorkerConfig = {
  timeout: 300,
  memorySize: 1024,
  schedule: 'cron(0 3 * * ? *)',
};

export default createWorker<typeof InputSchema, Output>({
  id: 'cost-usage-rollup',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input: _input, ctx }: WorkerHandlerParams<Input, Output>) => {
    const { jobId, workerId } = ctx;
    console.log('[cost-usage-rollup] Handler started:', { jobId, workerId });

    let documentsRead = 0;
    let aggregatesUpserted = 0;
    let errors = 0;

    const docs = await platformCostUsageDB.findWithCost({
      limit: 20000,
    });
    documentsRead = docs.length;
    console.log('[cost-usage-rollup] Documents with cost to aggregate:', { jobId, count: documentsRead });

    const buckets = new Map<
      string,
      { totalCostUSD: number; requestCount: number; breakdown: Record<string, { totalCostUSD: number; requestCount: number }> }
    >();
    for (const doc of docs) {
      try {
        const costAmount = doc.cost?.amountUSD ?? doc.cost?.amount ?? 0;
        const clientId = doc.clientId ?? '';
        const platform = doc.platform;
        const createdAt = new Date(doc.createdAt);
        const source = doc.source ?? 'unknown';

        for (const periodType of ['day', 'week', 'month'] as PeriodType[]) {
          const periodValue = getPeriodValue(createdAt, periodType);
          // Per-client bucket
          const key = `${clientId}\t${platform}\t${periodType}\t${periodValue}`;
          let b = buckets.get(key);
          if (!b) {
            b = { totalCostUSD: 0, requestCount: 0, breakdown: {} };
            buckets.set(key, b);
          }
          b.totalCostUSD += costAmount;
          b.requestCount += 1;
          if (!b.breakdown[source]) {
            b.breakdown[source] = { totalCostUSD: 0, requestCount: 0 };
          }
          b.breakdown[source].totalCostUSD += costAmount;
          b.breakdown[source].requestCount += 1;

          // Global bucket (same collection, clientId undefined)
          const globalKey = `__global__\t${platform}\t${periodType}\t${periodValue}`;
          let g = buckets.get(globalKey);
          if (!g) {
            g = { totalCostUSD: 0, requestCount: 0, breakdown: {} };
            buckets.set(globalKey, g);
          }
          g.totalCostUSD += costAmount;
          g.requestCount += 1;
          if (!g.breakdown[source]) {
            g.breakdown[source] = { totalCostUSD: 0, requestCount: 0 };
          }
          g.breakdown[source].totalCostUSD += costAmount;
          g.breakdown[source].requestCount += 1;
        }
      } catch (e) {
        console.error('[cost-usage-rollup] doc failed', doc._id, e);
        errors += 1;
      }
    }

    for (const [key, b] of buckets) {
      try {
        const [clientIdPart, platform, periodType, periodValue] = key.split('\t');
        const isGlobal = clientIdPart === '__global__';
        await platformCostUsageAggregatesDB.upsertAggregate(
          isGlobal ? undefined : (clientIdPart || undefined),
          platform,
          periodType as PeriodType,
          periodValue,
          b.totalCostUSD,
          b.requestCount,
          b.breakdown
        );
        aggregatesUpserted += 1;
      } catch (e) {
        console.error('[cost-usage-rollup] upsert failed', key, e);
        errors += 1;
      }
    }

    console.log('[cost-usage-rollup] Handler completed:', { jobId, workerId, documentsRead, aggregatesUpserted, errors });
    return { documentsRead, aggregatesUpserted, errors };
  },
});
