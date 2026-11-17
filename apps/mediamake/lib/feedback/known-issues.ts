/**
 * Known issues: the short list admins keep for each item, shown on its page
 * to everyone who can open it. Feedback itself stays between its writer and
 * the admins; this is what the rest are told. An admin writes each one (often
 * from a feedback), and marks it fixed when the fix ships. A fixed issue
 * stays on the page for 30 days, then drops off. The rules; ./known-issues-store
 * keeps them.
 */

export const KNOWN_ISSUE_TITLE_MAX = 140;
export const KNOWN_ISSUE_NOTE_MAX = 600;
export const FIXED_SHOWN_DAYS = 30;

export interface KnownIssue {
  issueId: string;
  itemId: string;
  title: string;
  /** A workaround, or what is being done. */
  note?: string;
  status: 'open' | 'fixed';
  /** The feedback it came from: they ship with it. */
  feedbackIds: string[];
  createdBy: string;
  createdAt: string;
  fixedAt?: string;
  /** The version that fixed it. */
  fixedIn?: string;
}

/** What the item's page shows of one: nothing about who wrote it or which feedback it came from. */
export type PublicKnownIssue = Pick<KnownIssue, 'issueId' | 'title' | 'note' | 'status' | 'createdAt' | 'fixedAt' | 'fixedIn'>;

export function parseKnownIssue(body: unknown): { title: string; note?: string } | { error: string } {
  const { title, note } = (body ?? {}) as Record<string, unknown>;
  const heading = typeof title === 'string' ? title.trim().replace(/\s+/g, ' ') : '';
  if (heading.length < 3) return { error: 'A known issue needs a title: what goes wrong, in a line' };
  if (heading.length > KNOWN_ISSUE_TITLE_MAX) return { error: `Keep the title under ${KNOWN_ISSUE_TITLE_MAX} characters` };
  const more = typeof note === 'string' ? note.trim() : '';
  if (more.length > KNOWN_ISSUE_NOTE_MAX) return { error: `Keep the note under ${KNOWN_ISSUE_NOTE_MAX} characters` };
  return { title: heading, ...(more && { note: more }) };
}

/** The issues an item's page shows: open ones first (newest first), then the ones fixed in the last 30 days. */
export function shownIssues(issues: KnownIssue[], now: number = Date.now()): PublicKnownIssue[] {
  const cutoff = now - FIXED_SHOWN_DAYS * 24 * 60 * 60 * 1000;
  return issues
    .filter(issue => issue.status === 'open' || (issue.fixedAt && Date.parse(issue.fixedAt) >= cutoff))
    .sort((a, b) => Number(a.status === 'fixed') - Number(b.status === 'fixed') || b.createdAt.localeCompare(a.createdAt))
    .map(({ issueId, title, note, status, createdAt, fixedAt, fixedIn }) => ({
      issueId,
      title,
      ...(note && { note }),
      status,
      createdAt,
      ...(fixedAt && { fixedAt }),
      ...(fixedIn && { fixedIn }),
    }));
}
