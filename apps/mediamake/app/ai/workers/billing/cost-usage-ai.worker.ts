/**
 * AI cost calculation worker (TokenLens).
 * Runs daily: reads platform_cost_usage where platform='ai' and isCalculated=false,
 * computes cost via TokenLens getTokenCosts, sets cost and isCalculated=true.
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import { z } from 'zod';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { fetchModels } from 'tokenlens';
import { getTokenCosts } from '@tokenlens/helpers';
import { platformCostUsageDB } from '../../../../lib/cost-usage-mongodb';
import type { ObjectId } from 'mongodb';

const InputSchema = z.object({}).catchall(z.unknown()).optional().default({});
const OutputSchema = z.object({
  processed: z.number(),
  errors: z.number(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 300,
  memorySize: 1024,
  group: "billing"
};

export default createWorker<typeof InputSchema, Output>({
  id: 'cost-usage-ai',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input: _input, ctx }: WorkerHandlerParams<Input, Output>) => {
    const { jobId, workerId } = ctx;
    console.log('[cost-usage-ai] Handler started:', { jobId, workerId });

    let processed = 0;
    let errors = 0;

    const docs = await platformCostUsageDB.findUncalculated('ai', 500);
    if (docs.length === 0) {
      console.log('[cost-usage-ai] No uncalculated AI docs, skipping:', { jobId, workerId });
      return { processed: 0, errors: 0 };
    }
    console.log('[cost-usage-ai] Processing docs:', { jobId, count: docs.length });

    let providers: unknown;
    try {
      providers = await fetchModels();
    } catch (e) {
      console.error('[cost-usage-ai] fetchModels failed', e);
      throw e;
    }

    for (const doc of docs) {
      try {
        const modelId = doc.source;
        const usage = doc.metadata?.usage;
        if (!usage || typeof usage !== 'object') {
          errors += 1;
          continue;
        }
        const tokenUsage = {
          prompt_tokens: usage.promptTokens ?? usage.inputTokens ?? 0,
          completion_tokens: usage.completionTokens ?? usage.outputTokens ?? 0,
          total_tokens: usage.totalTokens,
          reasoning_tokens: usage.reasoningTokens,
          cached_input_tokens: usage.cachedInputTokens,
          cached_output_tokens: usage.cachedOutputTokens,
        };
        // tokenlens fetchModels() returns ProvidersCatalog; getTokenCosts expects ModelCatalog | ProviderInfo — compatible at runtime
        const costs = getTokenCosts(modelId, tokenUsage, providers as Parameters<typeof getTokenCosts>[2]);
        const totalUSD = costs?.totalUSD ?? 0;
        const amount = totalUSD;
        const currency = 'USD';
        await platformCostUsageDB.markCalculated(doc._id as ObjectId, {
          amount,
          currency,
          amountUSD: amount,
          breakdown: costs
            ? {
                inputUSD: costs.inputUSD,
                outputUSD: costs.outputUSD,
                reasoningUSD: costs.reasoningUSD,
                cacheReadUSD: costs.cacheReadUSD,
                cacheWriteUSD: costs.cacheWriteUSD,
              }
            : undefined,
        });
        processed += 1;
      } catch (e) {
        console.error('[cost-usage-ai] doc failed', doc._id, e);
        errors += 1;
      }
    }

    console.log('[cost-usage-ai] Handler completed:', { jobId, workerId, processed, errors });
    return { processed, errors };
  },
});
