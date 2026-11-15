import { randomBytes } from 'crypto';
import { getDatabase } from '../mongodb';
import { expiryFor, type Membership, type MembershipSource } from './membership';
import type { GrantableTier } from './tiers';

/** Membership records in MongoDB `memberships` (see ./membership). */
const COLLECTION = 'memberships';

function nowISO() {
  return new Date().toISOString();
}

/** The driver stores `undefined` as null; drop those keys instead. */
function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

async function collection() {
  return (await getDatabase()).collection<Membership>(COLLECTION);
}

/** Not removed and not past its expiry. */
function liveFilter(now = nowISO()) {
  return { revokedAt: { $exists: false }, $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] };
}

export interface GrantMembershipInput {
  clientId: string;
  tier: GrantableTier;
  source: MembershipSource;
  ref?: string;
  note?: string;
  grantedBy?: string;
  /** How long it lasts; a contribution without one lasts CONTRIBUTION_MONTHS. */
  days?: number;
  expiresAt?: string;
  permanent?: boolean;
}

export const membershipsDB = {
  /** Creates the indexes memberships rely on. Safe to run repeatedly. */
  async ensureIndexes() {
    const memberships = await collection();
    await memberships.createIndex({ membershipId: 1 }, { unique: true });
    await memberships.createIndex({ clientId: 1, grantedAt: -1 });
  },

  /** Adds one record. A person's other records stay: their tier is the highest live one. */
  async grant(input: GrantMembershipInput): Promise<Membership> {
    const { days: _days, expiresAt: _expiresAt, permanent, ...rest } = input;
    const now = nowISO();
    const membership: Membership = {
      membershipId: `mem_${randomBytes(9).toString('base64url')}`,
      ...rest,
      grantedAt: now,
      expiresAt: expiryFor(input, now),
      ...(permanent && { permanent: true, permanentBy: input.grantedBy, permanentAt: now }),
    };
    await (await collection()).insertOne(withoutUndefined(membership) as Membership);
    return membership;
  },

  /**
   * Puts a person at one tier: their live records end (kept, with who and
   * why) and, unless the tier is Public, one new record gives the tier.
   */
  async setTier(input: Omit<GrantMembershipInput, 'tier'> & { tier: GrantableTier | 'public' }): Promise<Membership | null> {
    const { tier, ...rest } = input;
    await this.revokeAll(input.clientId, input.grantedBy, `moved to ${tier}`);
    return tier === 'public' ? null : this.grant({ ...rest, tier });
  },

  async get(membershipId: string): Promise<Membership | null> {
    return (await collection()).findOne({ membershipId }, { projection: { _id: 0 } });
  },

  /** Ends one live record. */
  async revoke(membershipId: string, revokedBy?: string, revokedNote?: string): Promise<boolean> {
    const res = await (await collection()).updateOne(
      { membershipId, revokedAt: { $exists: false } },
      { $set: withoutUndefined({ revokedAt: nowISO(), revokedBy, revokedNote }) },
    );
    return res.modifiedCount > 0;
  },

  /** Ends every live record of a person. Returns how many. */
  async revokeAll(clientId: string, revokedBy?: string, revokedNote?: string): Promise<number> {
    const res = await (await collection()).updateMany(
      { clientId, ...liveFilter() },
      { $set: withoutUndefined({ revokedAt: nowISO(), revokedBy, revokedNote }) },
    );
    return res.modifiedCount;
  },

  /** An admin makes a membership permanent: no expiry, until an admin removes it. */
  async makePermanent(membershipId: string, by?: string): Promise<Membership | null> {
    return (await collection()).findOneAndUpdate(
      { membershipId, revokedAt: { $exists: false } },
      { $set: withoutUndefined({ permanent: true, permanentBy: by, permanentAt: nowISO() }), $unset: { expiresAt: '' } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
  },

  /** A person's live records. */
  async liveFor(clientId: string): Promise<Membership[]> {
    return (await collection()).find({ clientId, ...liveFilter() }, { projection: { _id: 0 } }).toArray();
  },

  /** A person's whole history, newest first. */
  async historyFor(clientId: string): Promise<Membership[]> {
    return (await collection()).find({ clientId }, { projection: { _id: 0 } }).sort({ grantedAt: -1 }).toArray();
  },

  /** Every live record, newest first; with `includeEnded`, the ended ones too (the audit log). */
  async list(options: { includeEnded?: boolean } = {}): Promise<Membership[]> {
    return (await collection())
      .find(options.includeEnded ? {} : liveFilter(), { projection: { _id: 0 } })
      .sort({ grantedAt: -1 })
      .toArray();
  },
};
