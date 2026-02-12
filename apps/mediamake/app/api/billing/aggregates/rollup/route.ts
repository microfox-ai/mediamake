import { NextRequest, NextResponse } from 'next/server';
import { dispatchQueue } from '@microfox/ai-worker';
import { getQueueRegistry } from '@/app/api/workflows/registry/workers';
import { createQueueJob } from '@/app/api/workflows/stores/queueJobStore';
import { listJobsByWorker } from '@/app/api/workflows/stores/jobStore';

export const dynamic = 'force-dynamic';

/** Minimum gap between rollup runs when triggered via API (avoids duplicate with cron). */
const ROLLUP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/billing/aggregates/rollup
 * Triggers the cost-usage queue (ai → remotion → rollup).
 * Returns jobId for polling or webhook.
 * Skips if a rollup is already running or completed recently (avoids duplicate keys from cron + API).
 */
const LOG = '[BillingRollup]';

export async function POST(_request: NextRequest) {
  try {
    const registry = await getQueueRegistry();
    const queue = registry.getQueueById('cost-usage');
    if (!queue) {
      console.warn(`${LOG} Queue cost-usage not found in config`);
      return NextResponse.json(
        { error: 'Queue cost-usage not found. Ensure workers are deployed and config is available.' },
        { status: 503 }
      );
    }

    const recent = await listJobsByWorker('cost-usage-rollup');
    const now = Date.now();
    for (const job of recent) {
      if (job.status === 'running') {
        console.log(`${LOG} Skipping: rollup already running`, { jobId: job.jobId });
        return NextResponse.json(
          { error: 'A rollup is already running. Wait for it to finish or check the dashboard.', jobId: job.jobId },
          { status: 409 }
        );
      }
      if (job.status === 'completed' && job.completedAt) {
        const completedAt = new Date(job.completedAt).getTime();
        if (now - completedAt < ROLLUP_COOLDOWN_MS) {
          console.log(`${LOG} Skipping: rollup completed recently`, {
            jobId: job.jobId,
            completedAt: job.completedAt,
            cooldownMinutes: ROLLUP_COOLDOWN_MS / 60_000,
          });
          return NextResponse.json(
            {
              error: `A rollup completed recently. Trigger again after ${ROLLUP_COOLDOWN_MS / 60_000} minutes or use the existing job.`,
              jobId: job.jobId,
              completedAt: job.completedAt,
            },
            { status: 409 }
          );
        }
      }
    }

    console.log(`${LOG} Triggering cost-usage queue`, { queueId: 'cost-usage', firstWorker: queue.steps[0]?.workerId });
    const result = await dispatchQueue('cost-usage', {}, {
      registry,
      metadata: { source: 'billing-api' },
      onCreateQueueJob: async (p) => {
        await createQueueJob(p.queueJobId, p.queueId, p.firstStep, p.metadata);
      },
    });
    console.log(`${LOG} Queue triggered`, { jobId: result.jobId, queueId: result.queueId, messageId: result.messageId });
    return NextResponse.json({
      jobId: result.jobId,
      status: result.status,
      messageId: result.messageId,
      queueId: result.queueId,
      queueJobUrl: `/api/workflows/queue-jobs/${result.jobId}`,
    });
  } catch (e) {
    console.error(`${LOG} Error:`, e instanceof Error ? e.message : e, e instanceof Error ? { stack: e.stack } : {});
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to trigger rollup worker' },
      { status: 500 }
    );
  }
}
