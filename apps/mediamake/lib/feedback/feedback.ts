import { tierOpens, type MemberTier } from '../memberships/tiers';

/**
 * Feedback members send about an item, or about MediaMake as a whole: on the
 * item's page, or from Claude through mm-use's send_feedback (both POST
 * /api/feedback). Claude reads each one (./triage), bugs and major problems
 * from Plus members and above get an automatic draft pull request (./auto-pr),
 * and admins work through the rest on /app/feedback. Only admins and the
 * writer see a feedback; what everyone sees is the known issues list
 * (./known-issues). This file is the record and the rules, with no database.
 */

export const FEEDBACK_MAX_CHARS = 4000;
/** More than this from one account in a day is refused. */
export const FEEDBACK_PER_DAY = 30;

const ITEM_ID = /^(skill|mcp|app|tutorial|course)\/[a-z0-9][a-z0-9-]{0,63}$/;

/** new: nobody acted yet. answered: an admin replied. dismissed: closed with nothing to do. shipped: its fix is out. */
export type FeedbackStatus = 'new' | 'answered' | 'dismissed' | 'shipped';

/** What Claude calls a feedback. A major problem is a bug that stops the item from doing its job. */
export const FEEDBACK_KINDS = ['bug', 'major', 'improvement', 'question', 'praise'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_SEVERITIES = ['low', 'medium', 'high'] as const;
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

export const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: 'Bug',
  major: 'Major problem',
  improvement: 'Improvement',
  question: 'Question',
  praise: 'Praise',
};

/** Claude's reading of one feedback. */
export interface Triage {
  kind: FeedbackKind;
  severity: FeedbackSeverity;
  /** One line an admin can scan. */
  summary: string;
  /** The open feedback this one repeats, when it does. */
  duplicateOf?: string;
  model: string;
  at: string;
  costUSD: number;
}

/**
 * The pull request that answers a feedback. requested: the fix workflow was
 * started. open: its draft PR is up (or an admin linked an existing PR).
 * failed: the workflow found nothing to change or broke. merged: it shipped.
 */
export interface FeedbackPr {
  repo: string;
  state: 'requested' | 'open' | 'failed' | 'merged';
  number?: number;
  url?: string;
  /** The workflow run that made it. */
  runUrl?: string;
  /** 'auto' when triage raised it, else the admin who did. */
  by: string;
  at: string;
  /** Why it failed, or what the run said. */
  note?: string;
}

export interface Feedback {
  feedbackId: string;
  clientId: string;
  /** Their membership when they wrote it: bugs from Plus and above get an automatic draft PR. */
  tier: MemberTier;
  text: string;
  /** The catalog item it is about; none for MediaMake as a whole. */
  itemId?: string;
  /** The version of the item they used, as they or Claude gave it. */
  version?: string;
  /** Where it came in: 'mm-use' from Claude, 'web' from a page. */
  source: string;
  status: FeedbackStatus;
  createdAt: string;
  triage?: Triage;
  /** Why Claude has not read it: the monthly ceiling, no key, or an error. */
  triageSkipped?: string;
  pr?: FeedbackPr;
  answer?: { text: string; by: string; at: string };
  dismissed?: { by: string; at: string; reason?: string };
  shipped?: { at: string; version?: string; note?: string; mailed?: boolean };
}

/** What its writer may read back: no account ids of admins, no costs. */
export interface OwnFeedback {
  feedbackId: string;
  itemId?: string;
  version?: string;
  text: string;
  status: FeedbackStatus;
  createdAt: string;
  kind?: FeedbackKind;
  answer?: { text: string; at: string };
  pr?: { state: FeedbackPr['state']; url?: string };
  shipped?: { at: string; version?: string; note?: string };
}

export function ownView(feedback: Feedback): OwnFeedback {
  return {
    feedbackId: feedback.feedbackId,
    ...(feedback.itemId && { itemId: feedback.itemId }),
    ...(feedback.version && { version: feedback.version }),
    text: feedback.text,
    status: feedback.status,
    createdAt: feedback.createdAt,
    ...(feedback.triage && { kind: feedback.triage.kind }),
    ...(feedback.answer && { answer: { text: feedback.answer.text, at: feedback.answer.at } }),
    ...(feedback.pr && feedback.pr.state !== 'failed' && { pr: { state: feedback.pr.state, ...(feedback.pr.url && { url: feedback.pr.url }) } }),
    ...(feedback.shipped && { shipped: { at: feedback.shipped.at, ...(feedback.shipped.version && { version: feedback.shipped.version }), ...(feedback.shipped.note && { note: feedback.shipped.note }) } }),
  };
}

/** Still waiting on something: not dismissed, not shipped. */
export const isOpen = (feedback: Pick<Feedback, 'status'>) => feedback.status === 'new' || feedback.status === 'answered';

/**
 * Whether triage raises a draft PR on its own: a bug or a major problem, about
 * one item, not a repeat, from a member at Plus or above. Everything else
 * waits for an admin, who can raise one from any feedback with the button.
 */
export function earnsAutoPr(feedback: Pick<Feedback, 'tier' | 'itemId' | 'triage' | 'pr' | 'status'>): boolean {
  const { triage } = feedback;
  if (!triage || !feedback.itemId || feedback.pr || !isOpen(feedback)) return false;
  if (triage.duplicateOf) return false;
  return (triage.kind === 'bug' || triage.kind === 'major') && tierOpens(feedback.tier, 'plus');
}

/** One item's feedback on the admin page (or `general`, for MediaMake as a whole). */
export interface FeedbackGroup {
  /** A catalog id, or 'general'. */
  key: string;
  /** Originals, newest first, each with the feedback that repeats it. */
  threads: { feedback: Feedback; duplicates: Feedback[] }[];
  total: number;
  open: number;
  byKind: Partial<Record<FeedbackKind | 'unread', number>>;
}

export const GENERAL = 'general';

/**
 * Feedback grouped by item, repeats folded under the one they repeat, the
 * items with the most open feedback first. A repeat whose original is not in
 * the list stands on its own.
 */
export function groupFeedback(list: Feedback[]): FeedbackGroup[] {
  const ids = new Set(list.map(feedback => feedback.feedbackId));
  const repeats = new Map<string, Feedback[]>();
  const groups = new Map<string, FeedbackGroup>();
  for (const feedback of list) {
    const original = feedback.triage?.duplicateOf;
    if (original && original !== feedback.feedbackId && ids.has(original)) repeats.set(original, [...(repeats.get(original) ?? []), feedback]);
  }
  const folded = new Set([...repeats.values()].flat().map(feedback => feedback.feedbackId));
  const newestFirst = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const feedback of newestFirst) {
    const key = feedback.itemId ?? GENERAL;
    const group = groups.get(key) ?? { key, threads: [], total: 0, open: 0, byKind: {} };
    groups.set(key, group);
    group.total += 1;
    if (isOpen(feedback)) {
      group.open += 1;
      const kind = feedback.triage?.kind ?? 'unread';
      group.byKind[kind] = (group.byKind[kind] ?? 0) + 1;
    }
    if (!folded.has(feedback.feedbackId)) group.threads.push({ feedback, duplicates: repeats.get(feedback.feedbackId) ?? [] });
  }
  return [...groups.values()].sort((a, b) => b.open - a.open || b.total - a.total || a.key.localeCompare(b.key));
}

export type FeedbackInput = Pick<Feedback, 'text' | 'itemId' | 'version' | 'source'>;

/** A feedback body, checked: `{ text, itemId?, version?, source? }`. */
export function parseFeedback(body: unknown): FeedbackInput | { error: string } {
  const { text, itemId, version, source } = (body ?? {}) as Record<string, unknown>;
  const words = typeof text === 'string' ? text.trim() : '';
  if (words.length < 3) return { error: 'text is required: the feedback, in your own words' };
  if (words.length > FEEDBACK_MAX_CHARS) return { error: `Keep it under ${FEEDBACK_MAX_CHARS} characters` };
  if (itemId !== undefined && itemId !== null && (typeof itemId !== 'string' || !ITEM_ID.test(itemId)))
    return { error: 'itemId must be a catalog id such as skill/pack-brand-kit' };
  const v = typeof version === 'string' ? version.trim().slice(0, 80) : '';
  const from = typeof source === 'string' && /^[a-z0-9-]{1,30}$/.test(source) ? source : 'api';
  return { text: words, ...(typeof itemId === 'string' && { itemId }), ...(v && { version: v }), source: from };
}
