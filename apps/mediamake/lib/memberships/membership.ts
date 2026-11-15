import { tierRank, type GrantableTier, type MemberTier } from './tiers';

/**
 * Membership records: how each person got their tier. One record per grant,
 * keyed on the client id (the account id; the `users` record of lib/auth
 * carries the same `clientId`). Public is having no live record, and Admin is
 * the `isAdmin` flag on the Redis user profile, so neither has records.
 *
 * A person's tier is the highest of their live records. Records are never
 * deleted: one that ends keeps `revokedAt` or its passed `expiresAt`, so the
 * collection is also the audit log of who changed whose tier, when and why.
 *
 * Pure: the database side is ./store.
 */

/**
 * How a membership was got:
 *  - signup:       given when the account was made (none today: a new account is Public).
 *  - admin:        an admin gave it, with a note saying why.
 *  - contribution: earned with an accepted item or a merged PR (`ref` names it). Lasts
 *                  CONTRIBUTION_MONTHS and renews by contributing again, unless an admin
 *                  makes it permanent.
 *  - invite:       an invite link was redeemed (`ref` is its code).
 *  - migration:    carried over from the tiers before the ladder (private testers, community).
 *  - paid:         for later: payments change no access code, only add records.
 */
export const MEMBERSHIP_SOURCES = ['signup', 'admin', 'contribution', 'invite', 'migration', 'paid'] as const;
export type MembershipSource = (typeof MEMBERSHIP_SOURCES)[number];

export function isMembershipSource(value: unknown): value is MembershipSource {
  return typeof value === 'string' && (MEMBERSHIP_SOURCES as readonly string[]).includes(value);
}

/** How long a membership earned by contributing lasts. Contributing again starts a new one. */
export const CONTRIBUTION_MONTHS = 3;

export interface Membership {
  membershipId: string;
  /** The account: the client id. */
  clientId: string;
  tier: GrantableTier;
  source: MembershipSource;
  /** What earned or carried it: a PR link, a catalog item id, an invite code. */
  ref?: string;
  note?: string;
  grantedBy?: string;
  grantedAt: string;
  /** When it ends by itself. None: it lasts until an admin removes it. */
  expiresAt?: string;
  /** An admin made it permanent: it has no expiry until an admin removes it. */
  permanent?: boolean;
  permanentBy?: string;
  permanentAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  /** Why it was removed, e.g. "moved to pro". */
  revokedNote?: string;
}

/** `months` calendar months after `from`, as an ISO date (31 Jan + 1 month is the end of February). */
export function monthsAfter(from: string | number | Date, months: number): string {
  const start = new Date(from);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  // a day that doesn't exist in the target month rolls over: step back to that month's last day
  if (end.getUTCDate() !== start.getUTCDate()) end.setUTCDate(0);
  return end.toISOString();
}

/**
 * When a new membership ends. An explicit `expiresAt` or `days` wins; a
 * permanent one never ends; a contribution lasts CONTRIBUTION_MONTHS;
 * anything else lasts until an admin removes it.
 */
export function expiryFor(
  input: { source: MembershipSource; permanent?: boolean; expiresAt?: string; days?: number },
  now: string | number | Date = Date.now(),
): string | undefined {
  if (input.permanent) return undefined;
  if (input.expiresAt) return input.expiresAt;
  if (input.days && input.days > 0) return new Date(new Date(now).getTime() + input.days * 86_400_000).toISOString();
  return input.source === 'contribution' ? monthsAfter(now, CONTRIBUTION_MONTHS) : undefined;
}

/** True while a membership counts: not removed, not past its expiry. */
export function isLive(membership: Pick<Membership, 'revokedAt' | 'expiresAt'>, now: number = Date.now()): boolean {
  if (membership.revokedAt) return false;
  return !membership.expiresAt || Date.parse(membership.expiresAt) > now;
}

/** The live record that gives a person their tier: the highest, then the one that lasts longest. */
export function currentMembership<T extends Pick<Membership, 'tier' | 'revokedAt' | 'expiresAt'>>(
  memberships: T[],
  now: number = Date.now(),
): T | null {
  const lasts = (m: T) => (m.expiresAt ? Date.parse(m.expiresAt) : Infinity);
  return (
    memberships
      .filter(membership => isLive(membership, now))
      .sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || lasts(b) - lasts(a))[0] ?? null
  );
}

/** A person's tier from their records: the highest live one, else Public. Admin is decided elsewhere. */
export function memberTierFrom(
  memberships: Pick<Membership, 'tier' | 'revokedAt' | 'expiresAt'>[],
  now: number = Date.now(),
): MemberTier {
  return currentMembership(memberships, now)?.tier ?? 'public';
}

const SOURCE_WORDS: Record<MembershipSource, string> = {
  signup: 'Signed up',
  admin: 'Given by an admin',
  contribution: 'Earned by contributing',
  invite: 'Joined with an invite',
  migration: 'Carried over from the earlier tiers',
  paid: 'Paid',
};

/** How a membership was got and how long it lasts, in a line: what Subscription and Manage Memberships show. */
export function describeMembership(membership: Membership): string {
  const how = SOURCE_WORDS[membership.source] + (membership.ref ? ` (${membership.ref})` : '');
  const until = membership.permanent
    ? 'permanent, until an admin removes it'
    : membership.expiresAt
      ? `until ${membership.expiresAt.slice(0, 10)}${membership.source === 'contribution' ? ', renewed by contributing again' : ''}`
      : 'until an admin removes it';
  return `${how}: ${until}`;
}
