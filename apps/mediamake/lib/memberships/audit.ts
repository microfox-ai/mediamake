import type { Membership, MembershipSource } from './membership';
import { requestedTier } from './requests';
import type { GrantableTier } from './tiers';

/**
 * The audit log of memberships: who changed whose tier, when and why. Nothing
 * is stored for it. Every record it reads already keeps who and when: a
 * membership (given, made permanent, ended) and a request (asked, approved,
 * rejected), and none of them is ever
 * deleted, so the log also covers everything from before this page existed.
 *
 * Pure: safe for the browser.
 */

export type AuditKind =
  | 'given'
  | 'permanent'
  | 'ended'
  | 'expired'
  | 'requested'
  | 'request_approved'
  | 'request_rejected';

export interface AuditEvent {
  /** Unique in a log, for list keys. */
  id: string;
  at: string;
  kind: AuditKind;
  /** Whose membership it is about. */
  clientId?: string;
  /** Who did it: an admin's client id. None when it happened by itself (an expiry) or nobody was recorded. */
  by?: string;
  tier?: GrantableTier;
  source?: MembershipSource;
  /** What earned or carried it: a PR link, an item, the item asked for (an invite code on old records). */
  ref?: string;
  /** Why, in the words of whoever did it. */
  reason?: string;
  /** When the membership given here ends by itself. */
  expiresAt?: string;
}

/** The parts of a request the log reads (lib/catalog/types has the whole record). */
export interface AuditRequest {
  requestId: string;
  itemId: string;
  clientId: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AuditInput {
  memberships: Membership[];
  requests?: AuditRequest[];
}

/** Everything that happened, newest first. */
export function auditLog(input: AuditInput, now: number = Date.now()): AuditEvent[] {
  const events: AuditEvent[] = [];

  for (const m of input.memberships) {
    const about = { clientId: m.clientId, tier: m.tier, source: m.source, ref: m.ref };
    events.push({ id: `${m.membershipId}:given`, at: m.grantedAt, kind: 'given', ...about, by: m.grantedBy, reason: m.note, expiresAt: m.expiresAt });
    // a record that was permanent from the start says so in its "given" line
    if (m.permanent && m.permanentAt && m.permanentAt !== m.grantedAt) {
      events.push({ id: `${m.membershipId}:permanent`, at: m.permanentAt, kind: 'permanent', ...about, by: m.permanentBy });
    }
    if (m.revokedAt) {
      events.push({ id: `${m.membershipId}:ended`, at: m.revokedAt, kind: 'ended', ...about, by: m.revokedBy, reason: m.revokedNote });
    } else if (m.expiresAt && Date.parse(m.expiresAt) <= now) {
      events.push({ id: `${m.membershipId}:expired`, at: m.expiresAt, kind: 'expired', ...about });
    }
  }

  for (const request of input.requests ?? []) {
    const tier = requestedTier(request.itemId) ?? undefined;
    const about = { clientId: request.clientId, tier, ref: tier ? undefined : request.itemId };
    events.push({ id: `${request.requestId}:asked`, at: request.createdAt, kind: 'requested', ...about, reason: request.message });
    if (request.status !== 'pending' && request.resolvedAt) {
      events.push({
        id: `${request.requestId}:resolved`,
        at: request.resolvedAt,
        kind: request.status === 'approved' ? 'request_approved' : 'request_rejected',
        ...about,
        by: request.resolvedBy,
      });
    }
  }

  return events.sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
}

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const title = (tier?: string) => (tier ? tier[0].toUpperCase() + tier.slice(1) : 'a membership');

/** What happened, in a line, without the names (the log shows who and by whom beside it). */
export function auditText(event: AuditEvent, itemTitle?: string): string {
  const tier = title(event.tier);
  const asked = event.tier ? tier : (itemTitle ?? event.ref ?? 'access');
  switch (event.kind) {
    case 'given': {
      const how =
        event.source === 'contribution'
          ? ' for a contribution'
          : event.source === 'invite'
            ? ' through an invite'
            : event.source === 'migration'
              ? ', carried over from the earlier tiers'
              : event.source === 'paid'
                ? ', paid'
                : '';
      return `Given ${tier}${how}${event.expiresAt ? `, until ${date(event.expiresAt)}` : ''}`;
    }
    case 'permanent':
      return `${tier} made permanent`;
    case 'ended':
      return `${tier} ended`;
    case 'expired':
      return `${tier} ran out`;
    case 'requested':
      return `Asked for ${asked}`;
    case 'request_approved':
      return `Request for ${asked} approved`;
    case 'request_rejected':
      return `Request for ${asked} rejected`;
  }
}
