/**
 * Remotion cost backfill.
 * Reads uncalculated aws_render rows and writes the cost already stored on the render.
 * Live progress is fetched only when that stored cost is missing, using the region and
 * function the render actually used.
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import { z } from 'zod';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import {
  speculateFunctionName,
  getRenderProgress,
  type AwsRegion,
} from '@remotion/lambda/client';
import { renderRequestDB } from '../../../../lib/render-mongodb';
import { platformCostUsageDB } from '../../../../lib/cost-usage-mongodb';
import { resolveAwsRenderAmountUSD } from '../../../../lib/aws-render-cost';

const InputSchema = z.object({}).catchall(z.unknown()).optional().default({});
const OutputSchema = z.object({
  processed: z.number(),
  updated: z.number(),
  costBackfilled: z.number(),
  errors: z.number(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

/** Inline defaults for Lambda when config.mjs is not in deployment package. Matches config.mjs classic/complex-fast. */
function getDefaultAwsRenderConfigs(): Record<string, { disk: number; memory: number; timeout: number }> {
  return {
    classic: { memory: 3008, disk: 10240, timeout: 240 },
    'complex-fast': { memory: 3008, disk: 10240, timeout: 900 },
    'complex-slow': { memory: 3008, disk: 10240, timeout: 900 },
    'basic-fast': { memory: 2048, disk: 10240, timeout: 900 },
    throttled: { memory: 2048, disk: 10240, timeout: 900 },
    lightweight: { memory: 1024, disk: 2048, timeout: 180 },
    broadcast: { memory: 6144, disk: 10240, timeout: 900 },
    enterprise: { memory: 10240, disk: 10240, timeout: 900 },
  };
}

type StoredRenderCost = {
  accruedSoFar: number;
  currency: string;
  done: boolean;
  fatal: boolean;
  lambdasInvoked?: number;
  timeToFinishChunks?: number | null;
  region?: string;
  memorySizeInMb?: number;
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
  const meta = asRecord(payload.renderMetadata);
  return {
    accruedSoFar,
    currency: typeof costs?.currency === 'string' ? costs.currency : 'USD',
    done: payload.done === true,
    fatal: payload.fatalErrorEncountered === true,
    lambdasInvoked: typeof payload.lambdasInvoked === 'number' ? payload.lambdasInvoked : undefined,
    timeToFinishChunks:
      typeof payload.timeToFinishChunks === 'number' ? payload.timeToFinishChunks : null,
    region: typeof meta?.region === 'string' ? meta.region : undefined,
    memorySizeInMb: typeof meta?.memorySizeInMb === 'number' ? meta.memorySizeInMb : undefined,
  };
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
    let updated = 0;
    let costBackfilled = 0;
    let errors = 0;

    // Use env on Lambda (config.mjs not in deployment package); never dynamic import in Lambda to avoid init errors
    let AWS_RENDER_CONFIGS: Record<string, { disk: number; memory: number; timeout: number }>;
    let REGION: AwsRegion;
    const regionEnv = process.env.REMOTION_REGION?.trim();
    const configJsonEnv = process.env.REMOTION_AWS_RENDER_CONFIGS;
    const isLambda = typeof process.env.AWS_LAMBDA_FUNCTION_NAME === 'string';
    if (regionEnv && configJsonEnv) {
      REGION = regionEnv as AwsRegion;
      try {
        AWS_RENDER_CONFIGS = JSON.parse(configJsonEnv) as Record<string, { disk: number; memory: number; timeout: number }>;
      } catch {
        AWS_RENDER_CONFIGS = getDefaultAwsRenderConfigs();
      }
    } else if (isLambda) {
      REGION = (regionEnv ?? 'us-east-2') as AwsRegion;
      AWS_RENDER_CONFIGS = getDefaultAwsRenderConfigs();
    } else {
      try {
        const configModule = await import('../../../../config.mjs');
        AWS_RENDER_CONFIGS = configModule.AWS_RENDER_CONFIGS as Record<string, { disk: number; memory: number; timeout: number }>;
        REGION = (configModule.REGION ?? 'us-east-2') as AwsRegion;
      } catch {
        REGION = (regionEnv ?? 'us-east-2') as AwsRegion;
        AWS_RENDER_CONFIGS = getDefaultAwsRenderConfigs();
      }
    }

    const pending = await platformCostUsageDB.findUncalculated('aws_render', 2000);
    const renderIds = pending
      .map((doc) => (typeof doc.metadata?.renderId === 'string' ? doc.metadata.renderId : ''))
      .filter((id) => id.length > 0);
    const renders = await renderRequestDB.getByRenderIds(renderIds);
    const renderById = new Map(renders.map((render) => [render.renderId, render]));
    console.log('[cost-usage-remotion] Uncalculated aws_render rows:', {
      jobId,
      count: pending.length,
      renders: renders.length,
    });

    for (const doc of pending) {
      const renderId = typeof doc.metadata?.renderId === 'string' ? doc.metadata.renderId : '';
      if (!renderId) continue;
      const req = renderById.get(renderId);
      if (!req) continue;

      try {
        processed += 1;
        let stored = readStoredRenderCost(req.progressData);
        const terminal =
          stored != null &&
          (stored.done || stored.fatal || req.status === 'completed' || req.status === 'failed');

        if (!terminal && req.bucketName) {
          const preset = (req.awsRenderPreset as string) || 'classic';
          const config = AWS_RENDER_CONFIGS[preset] ?? AWS_RENDER_CONFIGS['classic'];
          const functionName =
            req.functionNameUsed ||
            speculateFunctionName({
              diskSizeInMb: config.disk,
              memorySizeInMb: config.memory,
              timeoutInSeconds: config.timeout,
            });
          const region = (req.regionUsed as AwsRegion | undefined) || REGION;
          const renderProgress = await getRenderProgress({
            bucketName: req.bucketName,
            functionName,
            region,
            renderId,
          });
          await renderRequestDB.update(
            renderId,
            {
              progressData: renderProgress,
              status: renderProgress.fatalErrorEncountered
                ? 'failed'
                : renderProgress.done
                  ? 'completed'
                  : 'rendering',
              downloadUrl: renderProgress.outputFile as string,
              fileSize: renderProgress.outputSizeInBytes as number,
            },
            req.clientId
          );
          updated += 1;
          stored = readStoredRenderCost(renderProgress);
        }

        const finished =
          stored != null &&
          (stored.done || stored.fatal || req.status === 'completed' || req.status === 'failed');
        if (!stored || !finished) continue;

        const preset = (req.awsRenderPreset as string) || 'classic';
        const config = AWS_RENDER_CONFIGS[preset] ?? AWS_RENDER_CONFIGS['classic'];
        const amount = resolveAwsRenderAmountUSD({
          accruedSoFar: stored.accruedSoFar,
          region: stored.region || req.regionUsed || REGION,
          memorySizeInMb: stored.memorySizeInMb || req.memoryUsed || config.memory,
          diskSizeInMb: req.diskUsed || config.disk,
          lambdasInvoked: stored.lambdasInvoked,
          timeToFinishChunks: stored.timeToFinishChunks,
        });
        const ok = await platformCostUsageDB.updateCostByRenderId(
          renderId,
          { amount, currency: stored.currency, amountUSD: amount },
          doc.clientId
        );
        if (ok) costBackfilled += 1;
      } catch (e) {
        console.error('[cost-usage-remotion] request failed', renderId, e);
        errors += 1;
      }
    }

    console.log('[cost-usage-remotion] Handler completed:', { jobId, workerId, processed, updated, costBackfilled, errors });
    return { processed, updated, costBackfilled, errors };
  },
});
