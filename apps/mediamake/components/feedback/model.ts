import type { Budget } from '@/lib/feedback/budget';
import type { Feedback, FeedbackGroup, FeedbackKind, FeedbackSeverity } from '@/lib/feedback/feedback';
import type { KnownIssue } from '@/lib/feedback/known-issues';

/** GET /api/admin/feedback */
export interface FeedbackData {
  groups: FeedbackGroup[];
  issues: KnownIssue[];
  /** Null when the spend could not be read. */
  budget: Budget | null;
  /** Writers' names by account id. */
  people: Record<string, string>;
  /** Item titles by id. */
  titles: Record<string, string>;
  setup: { triage: boolean; model: string; prs: boolean; prRepo: string; prMaxUSD: number; autoPrsPerDay: number; mail: boolean };
}

export async function feedbackCall<T = Record<string, unknown>>(body?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/admin/feedback', {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

export const KIND_STYLE: Record<FeedbackKind | 'unread', string> = {
  major: 'bg-red-500/15 text-red-700 dark:text-red-300',
  bug: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  improvement: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  question: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  praise: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  unread: 'bg-muted text-muted-foreground',
};

export const KIND_ORDER: (FeedbackKind | 'unread')[] = ['major', 'bug', 'improvement', 'question', 'praise', 'unread'];

export const SEVERITY_WORDS: Record<FeedbackSeverity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export const usd = (value: number) => `$${value.toFixed(value < 10 ? 2 : 0)}`;

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Where a feedback stands, for the row's chip. */
export function standing(feedback: Feedback): { label: string; style: string } | null {
  if (feedback.status === 'shipped') return { label: feedback.shipped?.version ? `Shipped in v${feedback.shipped.version.replace(/^v/, '')}` : 'Shipped', style: KIND_STYLE.praise };
  if (feedback.status === 'dismissed') return { label: 'Dismissed', style: KIND_STYLE.unread };
  if (feedback.status === 'answered') return { label: 'Answered', style: KIND_STYLE.improvement };
  return null;
}

/** The pull request's state in a few words. */
export function prWords(pr: NonNullable<Feedback['pr']>): string {
  const who = pr.by === 'auto' ? 'automatic' : 'raised by an admin';
  if (pr.state === 'requested') return `Fix run started (${who})`;
  if (pr.state === 'failed') return `Fix run made no pull request${pr.note ? `: ${pr.note}` : ''}`;
  const name = pr.number ? `${pr.repo}#${pr.number}` : pr.repo;
  return pr.state === 'merged' ? `Merged: ${name}` : `Draft pull request: ${name}`;
}
