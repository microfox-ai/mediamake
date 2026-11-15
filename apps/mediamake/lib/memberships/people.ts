import { currentMembership, isLive, type Membership } from './membership';
import { LEGACY_PERSON_TIER, higherTier, tierRank, type MemberTier } from './tiers';

/**
 * Everyone, as Manage Memberships lists them: each account with its tier,
 * the record that gives it, and whether it ends soon. Pure, so the page
 * (browser) and the admin API (server) share it.
 */

/** What is known of an account (lib/auth's AccountRow, or only a client id with keys). */
export interface PersonAccount {
  clientId: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  githubLogin?: string;
  /** False for an account from before sign-in that nobody has linked yet. */
  linked: boolean;
  methods?: { password: boolean; google: boolean; github: boolean };
  createdAt?: string;
  lastLoginAt?: string;
}

export interface PersonRow extends PersonAccount {
  name: string;
  activeKeys: number;
  isAdmin: boolean;
  tier: MemberTier;
  /** The live record that gives the tier. None for Public, an admin, or a tier still held through an earlier group. */
  membership: Membership | null;
  /** The tier comes from an earlier group (private testers, community) with no record yet. */
  legacy: boolean;
  /** Every record of theirs, newest first: their history. */
  records: Membership[];
}

export interface PeopleInput {
  accounts: PersonAccount[];
  /** API key holders: a client id, the name on the key and how many keys work. */
  keyHolders: { clientId: string; name: string; activeKeys: number }[];
  memberships: Membership[];
  /** The earlier groups, until the migration clears them. */
  legacy?: { private?: string[]; community?: string[] };
  admins: Iterable<string>;
}

/** Everyone with an account, a key or a membership: highest tier first, then by name. */
export function buildPeople(input: PeopleInput, now: number = Date.now()): PersonRow[] {
  const admins = new Set(input.admins);
  const accounts = new Map(input.accounts.map(account => [account.clientId, account]));
  const keys = new Map(input.keyHolders.map(holder => [holder.clientId, holder]));
  const records = new Map<string, Membership[]>();
  for (const membership of input.memberships) {
    records.set(membership.clientId, [...(records.get(membership.clientId) ?? []), membership]);
  }
  const inPrivate = new Set(input.legacy?.private ?? []);
  const inCommunity = new Set(input.legacy?.community ?? []);

  const everyone = new Set([...accounts.keys(), ...keys.keys(), ...records.keys(), ...inPrivate, ...inCommunity, ...admins]);
  const rows = [...everyone].map((clientId): PersonRow => {
    const account = accounts.get(clientId);
    const own = (records.get(clientId) ?? []).sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
    const membership = currentMembership(own, now);
    let tier: MemberTier = membership?.tier ?? 'public';
    if (inPrivate.has(clientId)) tier = higherTier(tier, LEGACY_PERSON_TIER.private);
    if (inCommunity.has(clientId)) tier = higherTier(tier, LEGACY_PERSON_TIER.community);
    const legacy = tier !== 'public' && tier !== membership?.tier;
    const isAdmin = admins.has(clientId);
    return {
      ...account,
      clientId,
      linked: account?.linked ?? false,
      name: account?.name || keys.get(clientId)?.name || account?.email || clientId,
      activeKeys: keys.get(clientId)?.activeKeys ?? 0,
      isAdmin,
      tier: isAdmin ? 'admin' : tier,
      membership: legacy ? null : membership,
      legacy,
      records: own,
    };
  });
  return rows.sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || a.name.localeCompare(b.name));
}

const DAY = 86_400_000;

/** Whole days until a membership ends by itself; null when it never does, or has ended. */
export function daysLeft(membership: Pick<Membership, 'expiresAt' | 'revokedAt'> | null, now: number = Date.now()): number | null {
  if (!membership?.expiresAt || !isLive(membership, now)) return null;
  return Math.ceil((Date.parse(membership.expiresAt) - now) / DAY);
}

/** How many days ahead a membership counts as ending soon. */
export const ENDING_SOON_DAYS = 14;

export function endsSoon(membership: Pick<Membership, 'expiresAt' | 'revokedAt'> | null, now: number = Date.now()): boolean {
  const left = daysLeft(membership, now);
  return left !== null && left <= ENDING_SOON_DAYS;
}

/** How many people hold each tier. */
export function countByTier(people: PersonRow[]): Record<MemberTier, number> {
  const counts: Record<MemberTier, number> = { public: 0, plus: 0, pro: 0, cohort: 0, admin: 0 };
  for (const person of people) counts[person.tier] += 1;
  return counts;
}
