/**
 * Remotion cost backfill.
 * Copies the accrued amount already stored on a finished render (completed or failed).
 * That snapshot is taken when the render ends. This worker does not call Lambda again.
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import { z } from 'zod';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { renderRequestDB } from '../../../../lib/render-mongodb';
import type { RenderRequestDocument } from '../../../../lib/render-mongodb';
import { platformCostUsageDB } from '../../../../lib/cost-usage-mongodb';

const InputSchema = z.object({}).catchall(z.unknown()).optional().default({});
const OutputSchema = z.object({
  processed: z.number(),
  updated: z.number(),
  costBackfilled: z.number(),
  errors: z.number(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

type StoredRenderCost = {
  accruedSoFar: number;
  currency: string;
  done: boolean;
  fatal: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** Progress is saved either as the Remotion payload or as { renderInfo: payload }. */
function readStoredRenderCost(progressData: unknown): StoredRenderCost | null {
  const root = asRecord(progressData);
  if (!root) return null;
  const payload = asRecord(root.renderInfo) ?? root;
  const costs = asRecord(payload.costs);
  const accruedSoFar = costs?.accruedSoFar;
  if (typeof accruedSoFar !== 'number' || !Number.isFinite(accruedSoFar)) return null;
  return {
    accruedSoFar,
    currency: typeof costs?.currency === 'string' ? costs.currency : 'USD',
    done: payload.done === true,
    fatal: payload.fatalErrorEncountered === true,
  };
}

function isTerminal(req: RenderRequestDocument, stored: StoredRenderCost | null): boolean {
  return (
    req.status === 'completed' ||
    req.status === 'failed' ||
    stored?.done === true ||
    stored?.fatal === true
  );
}

export const workerConfig: WorkerConfig = {
  timeout: 300,
  memorySize: 1024,
  group: "billing"
};

export default createWorker<typeof InputSchema, Output>({
  id: 'cost-usage-remotion',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input: _input, ctx }: WorkerHandlerParams<Input, Output>) => {
    const { jobId, workerId } = ctx;
    console.log('[cost-usage-remotion] Handler started:', { jobId, workerId });

    let processed = 0;
    let costBackfilled = 0;
    let errors = 0;

    const pending = await platformCostUsageDB.findUncalculated('aws_render', 2000);
    const finishedRenders = await renderRequestDB.listFinishedWithStoredCost(2000);
    const renderIds = new Set<string>();
    for (const doc of pending) {
      if (typeof doc.metadata?.renderId === 'string' && doc.metadata.renderId) {
        renderIds.add(doc.metadata.renderId);
      }
    }
    for (const render of finishedRenders) {
      if (render.renderId) renderIds.add(render.renderId);
    }
    const loaded = await renderRequestDB.getByRenderIds([...renderIds]);
    const renderById = new Map<string, RenderRequestDocument>();
    for (const render of [...finishedRenders, ...loaded]) {
      if (render.renderId) renderById.set(render.renderId, render);
    }
    console.log('[cost-usage-remotion] Renders to cost:', {
      jobId,
      uncalculated: pending.length,
      finishedWithCost: finishedRenders.length,
      unique: renderById.size,
    });

    for (const [renderId, req] of renderById) {
      try {
        processed += 1;
        const stored = readStoredRenderCost(req.progressData);
        if (!stored || !isTerminal(req, stored)) continue;

        const ok = await platformCostUsageDB.upsertAwsRenderCost({
          renderId,
          clientId: req.clientId,
          bucketName: req.bucketName,
          createdAt: req.createdAt,
          cost: {
            amount: stored.accruedSoFar,
            currency: stored.currency,
            amountUSD: stored.accruedSoFar,
          },
        });
        if (ok) costBackfilled += 1;
      } catch (e) {
        console.error('[cost-usage-remotion] request failed', renderId, e);
        errors += 1;
      }
    }

    console.log('[cost-usage-remotion] Handler completed:', { jobId, workerId, processed, costBackfilled, errors });
    return { processed, updated: 0, costBackfilled, errors };
  },
});
