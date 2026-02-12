/**
 * Remotion daily worker: progress + cost backfill.
 * Runs daily: queries render_requests from last 1–2 days, calls getRenderProgress for each,
 * updates render_requests with progressData and status; when done, writes cost to platform_cost_usage.
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import { z } from 'zod';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import {
  speculateFunctionName,
  getRenderProgress,
  type AwsRegion,
} from '@remotion/lambda/client';
import { renderRequestDB } from '../../../lib/render-mongodb';
import { platformCostUsageDB } from '../../../lib/cost-usage-mongodb';

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

export const workerConfig: WorkerConfig = {
  timeout: 300,
  memorySize: 1024,
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
        const configModule = await import('../../../config.mjs');
        AWS_RENDER_CONFIGS = configModule.AWS_RENDER_CONFIGS as Record<string, { disk: number; memory: number; timeout: number }>;
        REGION = (configModule.REGION ?? 'us-east-2') as AwsRegion;
      } catch {
        REGION = (regionEnv ?? 'us-east-2') as AwsRegion;
        AWS_RENDER_CONFIGS = getDefaultAwsRenderConfigs();
      }
    }

    const renderRequests = await renderRequestDB.getRecent(2);
    console.log('[cost-usage-remotion] Render requests to process:', { jobId, count: renderRequests.length });
    for (const req of renderRequests) {
      try {
        processed += 1;
        const { renderId, bucketName, clientId, awsRenderPreset } = req;
        if (!bucketName || !renderId) continue;

        const preset = (awsRenderPreset as string) || 'classic';
        const config =
          AWS_RENDER_CONFIGS[preset] ?? AWS_RENDER_CONFIGS['classic'];
        const functionName = speculateFunctionName({
          diskSizeInMb: config.disk,
          memorySizeInMb: config.memory,
          timeoutInSeconds: config.timeout,
        });

        const renderProgress = await getRenderProgress({
          bucketName,
          functionName,
          region: REGION,
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
          clientId ?? undefined
        );
        updated += 1;

        if (
          (renderProgress.done || renderProgress.fatalErrorEncountered) &&
          renderProgress.costs
        ) {
          const costs = renderProgress.costs as {
            accruedSoFar?: number;
            displayCost?: string;
            currency?: string;
          };
          const amount =
            typeof costs.accruedSoFar === 'number'
              ? costs.accruedSoFar
              : typeof costs.displayCost === 'string'
                ? parseFloat(costs.displayCost.replace(/[^0-9.]/g, '')) || 0
                : 0;
          const currency = costs.currency ?? 'USD';
          const ok = await platformCostUsageDB.updateCostByRenderId(
            renderId,
            { amount, currency, amountUSD: amount },
            clientId ?? undefined
          );
          if (ok) costBackfilled += 1;
        }
      } catch (e) {
        console.error('[cost-usage-remotion] request failed', req?.renderId, e);
        errors += 1;
      }
    }

    console.log('[cost-usage-remotion] Handler completed:', { jobId, workerId, processed, updated, costBackfilled, errors });
    return { processed, updated, costBackfilled, errors };
  },
});
