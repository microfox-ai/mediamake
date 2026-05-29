/**
 * AI usage capture: init ctx.state.usage (before), appendUsage helper, persist (after).
 * See .cursor/plans/pricing_and_usage_db_architecture.
 */

import type { AiMiddleware } from '@microfox/ai-router';
import type { TokenUsage, UsageEntry } from '@/lib/cost-usage-types';
import { platformCostUsageDB } from '@/lib/cost-usage-mongodb';
import { userQuotaDB } from '@/lib/quota-mongodb';
import { isAdmin } from '@/lib/admin-utils';

/** State shape: usage is an array of UsageEntry, append-only */
export interface UsageCaptureState {
  usage?: UsageEntry[];
  [key: string]: unknown;
}

function normalizeUsage(raw: Record<string, unknown> | null | undefined): TokenUsage {
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

/**
 * Append one AI call's usage to shared state. Agents must call this after generateText/streamText.
 * Never assign ctx.state.usage = ... (overwrites other agents' usage).
 * Returns the entry that was pushed so callers can persist it (e.g. from stream onFinish when .after has already run).
 */
export function appendUsage(
  state: UsageCaptureState,
  modelId: string,
  rawUsage: Record<string, unknown> | TokenUsage | null | undefined
): UsageEntry {
  const usage = state.usage ?? [];
  state.usage = usage;
  const normalized = normalizeUsage(
    rawUsage && typeof rawUsage === 'object' ? (rawUsage as Record<string, unknown>) : undefined
  );
  const entry: UsageEntry = { modelId, usage: normalized };
  usage.push(entry);
  return entry;
}

/** Persist usage entries to platform_cost_usage. Used by .after and by stream onFinish when usage is added after .after ran. */
export async function persistUsageEntries(
  entries: UsageEntry[],
  clientId: string | undefined
): Promise<void> {
  console.log("[usageCapture] Saving ai usage entries", entries)
  for (const { modelId, usage } of entries) {
    try {
      await platformCostUsageDB.insert({
        platform: 'ai',
        source: modelId,
        clientId,
        metadata: { usage },
        isCalculated: false,
      });
    } catch (err) {
      console.error('[usageCapture] Failed to insert usage for', modelId, err);
    }
  }

  // ── AI quota increment (soft-cap) ───────────────────────────────────────
  // Sum total tokens across all entries and bump the user's AI quota usage.
  // Also increment per-provider usage if per-provider limits are configured.
  // Admins bypass quota tracking entirely.
  if (clientId && !isAdmin(clientId)) {
    const totalTokens = entries.reduce((sum, e) => {
      const u = e.usage ?? {};
      return sum + (u.totalTokens ?? ((u.inputTokens ?? u.promptTokens ?? 0) + (u.outputTokens ?? u.completionTokens ?? 0)));
    }, 0);
    if (totalTokens > 0) {
      try {
        await userQuotaDB.incrementUsageBy(clientId, 'ai', totalTokens);
      } catch (err) {
        console.error('[usageCapture] Failed to increment AI quota for', clientId, err);
      }
    }

    // Per-provider token tracking: group entries by provider prefix (e.g. "anthropic", "google")
    // and increment per-provider usage if a limit exists for that provider.
    const byProvider = new Map<string, number>();
    for (const { modelId, usage: u } of entries) {
      if (!modelId) continue;
      const provider = modelId.split('/')[0]?.toLowerCase();
      if (!provider) continue;
      const tokens = (u?.totalTokens ?? ((u?.inputTokens ?? u?.promptTokens ?? 0) + (u?.outputTokens ?? u?.completionTokens ?? 0)));
      if (tokens > 0) {
        byProvider.set(provider, (byProvider.get(provider) ?? 0) + tokens);
      }
    }
    for (const [provider, tokens] of byProvider) {
      try {
        await userQuotaDB.incrementAiProviderUsage(clientId, provider, tokens);
      } catch (err) {
        console.error('[usageCapture] Failed to increment provider quota for', provider, err);
      }
    }
  }
}

/** Append usage to state and persist (for stream onFinish when .after has already run). clientId is read from request. Single call: modelId + usage. */
export async function recordUsage(
  state: UsageCaptureState,
  request: { clientId?: string },
  modelId: string,
  rawUsage: Record<string, unknown> | TokenUsage | null | undefined
): Promise<void> {
  const entry = appendUsage(state, modelId, rawUsage);
  try {
    await persistUsageEntries([entry], request.clientId);
  } catch (err) {
    console.error('[usageCapture] Failed to persist usage for', modelId, err);
  }
}

/** Before middleware: ensure ctx.state.usage is always an array. */
export const initUsageState: AiMiddleware<any, UsageCaptureState, any, any, any> = async (
  ctx,
  next
) => {
  ctx.state.usage = ctx.state.usage ?? [];
  console.log("[usageCapture] Initializing usage state", ctx.state.usage)
  return next();
};

/** After middleware: persist ctx.state.usage to platform_cost_usage (one doc per entry). */
export const persistUsageAfter: AiMiddleware<any, UsageCaptureState, any, any, any> = async (
  ctx,
  next
) => {
  const entries = ctx.state.usage ?? [];
  const clientId = (ctx.request as { clientId?: string }).clientId;
  await persistUsageEntries(entries, clientId);
  await next();
};
