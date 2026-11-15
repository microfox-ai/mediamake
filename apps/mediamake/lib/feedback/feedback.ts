import type { MemberTier } from '@/lib/memberships/tiers';

/**
 * Feedback members send about an item, or about MediaMake as a whole. This
 * step only takes it in (mm-use's send_feedback, POST /api/feedback) and
 * lets admins read it; triage, the admin page and automatic draft PRs are
 * plan step 2e, which builds on these records.
 */

export const FEEDBACK_MAX_CHARS = 4000;
/** More than this from one account in a day is refused. */
export const FEEDBACK_PER_DAY = 30;

const ITEM_ID = /^(skill|mcp|app|tutorial|course)\/[a-z0-9][a-z0-9-]{0,63}$/;

export type FeedbackStatus = 'new' | 'answered' | 'dismissed';

export interface Feedback {
  feedbackId: string;
  clientId: string;
  /** Their membership when they wrote it: step 2e treats Plus and Pro feedback differently. */
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
