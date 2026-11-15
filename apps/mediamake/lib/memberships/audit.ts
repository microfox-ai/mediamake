import type { Membership, MembershipSource } from './membership';
import { requestedTier } from './requests';
import type { GrantableTier } from './tiers';

/**
 * The audit log of memberships: who changed whose tier, when and why. Nothing
 * is stored for it. Every record it reads already keeps who and when: a
 * membership (given, made permanent, ended), an invite (made, used, turned
 * off) and a request (asked, approved, rejected), and none of them is ever
 * deleted, so the log also covers everything from before this page existed.
 *
 * Pure: safe for the browser.
 */

export type AuditKind =
  | 'given'
  | 'permanent'
  | 'ended'
  | 'expired'
  | 'invite_made'
  | 'invite_used'
  | 'invite_off'
  | 'requested'
  | 'request_approved'
  | 'request_rejected';

export interface AuditEvent {
  /** Unique in a log, for list keys. */
  id: string;
  at: string;
  kind: AuditKind;
  /** Whose membership it is about. None for an invite nobody has used. */
  clientId?: string;
  /** Who did it: an admin's client id. None when it happened by itself (an expiry) or nobody was recorded. */
  by?: string;
  tier?: GrantableTier;
  source?: MembershipSource;
  /** What earned or carried it: a PR link, an item, an invite code, the item asked for. */
  ref?: string;
  /** Why, in the words of whoever did it. */
  reason?: string;
  /** When the membership given here ends by itself. */
  expiresAt?: string;
}

/** The parts of an invite and a request the log reads (lib/catalog/types has the whole records). */
export interface AuditInvite {
  code: string;
  tier?: GrantableTier;
  itemIds?: string[];
  email?: string;
  createdBy?: string;
  createdAt: string;
  disabledAt?: string;
  note?: string;
  redeemedBy?: { clientId: string; at: string }[];
}

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
  invites?: AuditInvite[];
  requests?: AuditRequest[];
}

/** Everything that happened, newest first. Invites that only open items (no tier) are left out: they are on Releases. */
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

  for (const invite of input.invites ?? []) {
    if (!invite.tier) continue;
    const about = { tier: invite.tier, ref: invite.email ?? invite.code };
    events.push({ id: `${invite.code}:made`, at: invite.createdAt, kind: 'invite_made', ...about, by: invite.createdBy, reason: invite.note });
    for (const use of invite.redeemedBy ?? []) {
      events.push({ id: `${invite.code}:used:${use.clientId}`, at: use.at, kind: 'invite_used', ...about, clientId: use.clientId });
    }
    if (invite.disabledAt) events.push({ id: `${invite.code}:off`, at: invite.disabledAt, kind: 'invite_off', ...about });
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
    case 'invite_made':
      return `Invite to ${tier} ${event.ref?.includes('@') ? `mailed to ${event.ref}` : 'made'}`;
    case 'invite_used':
      return `Opened an invite to ${tier}`;
    case 'invite_off':
      return `Invite to ${tier} turned off`;
    case 'requested':
      return `Asked for ${asked}`;
    case 'request_approved':
      return `Request for ${asked} approved`;
    case 'request_rejected':
      return `Request for ${asked} rejected`;
  }
}
