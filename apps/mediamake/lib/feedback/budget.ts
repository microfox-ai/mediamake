/**
 * What feedback costs in Claude API calls, under a monthly ceiling. Two
 * things spend: triage (one short call per feedback, from this app) and the
 * automatic draft pull requests (Claude Code in GitHub Actions, which reports
 * its cost back). Both use the same key, ANTHROPIC_API_KEY, here and as the
 * repository's secret.
 *
 * The ceiling is FEEDBACK_AI_MONTHLY_USD, 50 US dollars unless set. When a
 * month's spend would pass it, triage and automatic PRs stop until the next
 * month (UTC); feedback is still saved, and an admin can read it unread.
 * The rules; ./budget-store keeps the spend.
 */

export const DEFAULT_MONTHLY_USD = 50;
/** The most one fix run may spend (FEEDBACK_PR_MAX_USD). The workflow passes it to Claude Code as its budget. */
export const DEFAULT_PR_MAX_USD = 5;
/** What one triage call is assumed to cost before it runs: a few thousand tokens. */
export const TRIAGE_RESERVE_USD = 0.1;

export type SpendPurpose = 'triage' | 'pr';

/** US dollars per million tokens, by model id. */
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-fable-5-2': { input: 8, output: 40 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
};
/** A model not in the table is priced as the dearest, so the ceiling errs on the safe side. */
const UNKNOWN_PRICE = { input: 10, output: 50 };

export interface TokenUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/** What one response cost: cache writes at 1.25 times the input price, cache reads at a tenth. */
export function costOf(model: string, usage: TokenUsage): number {
  const price = PRICES[model] ?? UNKNOWN_PRICE;
  const input = (usage.input_tokens ?? 0) + 1.25 * (usage.cache_creation_input_tokens ?? 0) + 0.1 * (usage.cache_read_input_tokens ?? 0);
  return (input * price.input + (usage.output_tokens ?? 0) * price.output) / 1_000_000;
}

function dollars(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value?.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const monthlyCeiling = () => dollars(process.env.FEEDBACK_AI_MONTHLY_USD, DEFAULT_MONTHLY_USD);
export const prMaxUsd = () => dollars(process.env.FEEDBACK_PR_MAX_USD, DEFAULT_PR_MAX_USD);

/** The month a moment falls in, UTC: `2026-11`. */
export const monthOf = (at: Date = new Date()) => at.toISOString().slice(0, 7);

export interface Budget {
  month: string;
  ceilingUSD: number;
  spentUSD: number;
  /** Held for fix runs that have started and not reported yet. */
  heldUSD: number;
  byPurpose: Record<SpendPurpose, { costUSD: number; calls: number }>;
}

/** Whether `needUSD` more fits under the ceiling. */
export function fits(budget: Pick<Budget, 'ceilingUSD' | 'spentUSD' | 'heldUSD'>, needUSD: number): boolean {
  return budget.spentUSD + budget.heldUSD + needUSD <= budget.ceilingUSD;
}
