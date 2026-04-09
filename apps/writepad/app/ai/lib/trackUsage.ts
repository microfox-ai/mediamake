/**
 * Inline usage tracking for Writepad AI calls.
 *
 * Unlike mediamake (which defers cost calculation to a cron worker),
 * Writepad calculates the cost immediately and stores isCalculated=true
 * in a single DB write — no background job needed.
 */

import { fetchModels } from 'tokenlens';
import { getTokenCosts } from '@tokenlens/helpers';
import { insertCostUsage } from '@/lib/db/cost-usage';
import type { TokenUsage } from '@/lib/cost-usage-types';

// ── Module-level catalog cache (1h TTL) ───────────────────────────────────────

let catalogCache: unknown = null;
let catalogFetchedAt = 0;

async function getModelsCatalog(): Promise<unknown> {
  const now = Date.now();
  if (catalogCache && now - catalogFetchedAt < 60 * 60 * 1000) return catalogCache;
  try {
    catalogCache = await fetchModels();
    catalogFetchedAt = now;
  } catch (e) {
    console.warn('[trackUsage] fetchModels failed, falling back to null catalog', e);
  }
  return catalogCache;
}

// ── Token usage normalizer ────────────────────────────────────────────────────

function normalizeUsage(raw: Record<string, unknown> | TokenUsage | null | undefined): TokenUsage {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, number | undefined>;
  return {
    promptTokens: r.promptTokens ?? r.inputTokens,
    completionTokens: r.completionTokens ?? r.outputTokens,
    totalTokens: r.totalTokens,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    reasoningTokens: r.reasoningTokens,
    cachedInputTokens: r.cachedInputTokens,
    cachedOutputTokens: r.cachedOutputTokens,
  };
}

// ── Main tracking function ────────────────────────────────────────────────────

export async function trackUsage(opts: {
  modelId: string;
  projectId?: string;
  clientId?: string;
  rawUsage: Record<string, unknown> | TokenUsage | null | undefined;
}): Promise<void> {
  const { modelId, projectId, clientId, rawUsage } = opts;
  if (!rawUsage) return;

  const usage = normalizeUsage(rawUsage);

  // Build token usage in the shape tokenlens expects (snake_case)
  const tokenUsage = {
    prompt_tokens: usage.promptTokens ?? usage.inputTokens ?? 0,
    completion_tokens: usage.completionTokens ?? usage.outputTokens ?? 0,
    total_tokens: usage.totalTokens,
    reasoning_tokens: usage.reasoningTokens,
    cached_input_tokens: usage.cachedInputTokens,
    cached_output_tokens: usage.cachedOutputTokens,
  };

  let cost = undefined;
  try {
    const catalog = await getModelsCatalog();
    if (catalog) {
      const costs = getTokenCosts(
        modelId,
        tokenUsage,
        catalog as Parameters<typeof getTokenCosts>[2],
      );
      if (costs) {
        cost = {
          amount: costs.totalUSD ?? 0,
          currency: 'USD',
          amountUSD: costs.totalUSD ?? 0,
          breakdown: {
            inputUSD: costs.inputUSD,
            outputUSD: costs.outputUSD,
            reasoningUSD: costs.reasoningUSD,
            cacheReadUSD: costs.cacheReadUSD,
            cacheWriteUSD: costs.cacheWriteUSD,
          },
        };
      }
    }
  } catch (e) {
    console.warn('[trackUsage] Cost calculation failed for', modelId, e);
  }

  try {
    await insertCostUsage({
      platform: 'ai',
      source: modelId,
      projectId,
      clientId,
      isCalculated: cost != null,
      cost,
      metadata: { usage },
    });
  } catch (e) {
    console.error('[trackUsage] Failed to persist usage for', modelId, e);
  }
}
