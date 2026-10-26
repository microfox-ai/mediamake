import { randomBytes } from 'crypto';
import { getDatabase } from '../mongodb';
import {
  ALWAYS_PUBLIC_ERROR,
  ALWAYS_PUBLIC_KINDS,
  NETWORK_GROUP,
  isAlwaysPublic,
  type AccessGrant,
  type AccessGroup,
  type AccessInvite,
  type AccessRequest,
  type AccessRequestStatus,
  type CatalogDownload,
  type CatalogItem,
  type CatalogItemRecord,
  type CatalogKind,
  type CatalogStatus,
  type CatalogVersion,
  type GrantSubject,
  type InstallSpec,
  type Visibility,
} from './types';

const COL = {
  items: 'catalog_items',
  downloads: 'catalog_downloads',
  grants: 'access_grants',
  groups: 'access_groups',
  invites: 'access_invites',
  requests: 'access_requests',
} as const;

function nowISO() {
  return new Date().toISOString();
}

/** The driver stores `undefined` as null; drop those keys instead. */
function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function newId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString('base64url')}`;
}

/** Creates the indexes the catalog relies on. Safe to run repeatedly. */
export async function ensureCatalogIndexes() {
  const db = await getDatabase();
  await db.collection(COL.items).createIndex({ id: 1 }, { unique: true });
  await db.collection(COL.items).createIndex({ kind: 1, visibility: 1 });
  await db.collection(COL.items).createIndex({ publicAt: 1 }, { sparse: true });
  await db.collection(COL.grants).createIndex({ grantId: 1 }, { unique: true });
  await db.collection(COL.grants).createIndex({ 'subject.kind': 1, 'subject.id': 1 });
  await db.collection(COL.grants).createIndex({ itemId: 1 });
  await db.collection(COL.groups).createIndex({ groupId: 1 }, { unique: true });
  await db.collection(COL.groups).createIndex({ members: 1 });
  await db.collection(COL.invites).createIndex({ code: 1 }, { unique: true });
  await db.collection(COL.requests).createIndex({ requestId: 1 }, { unique: true });
  await db.collection(COL.requests).createIndex({ status: 1, createdAt: -1 });
  await db.collection(COL.downloads).createIndex({ itemId: 1, at: -1 });
}

// ── Items ────────────────────────────────────────────────────────────────────

export const catalogItemsDB = {
  async get(id: string): Promise<CatalogItemRecord | null> {
    const db = await getDatabase();
    return db.collection<CatalogItemRecord>(COL.items).findOne({ id }, { projection: { _id: 0 } });
  },

  async list(filter: { kind?: CatalogKind } = {}): Promise<CatalogItemRecord[]> {
    const db = await getDatabase();
    return db
      .collection<CatalogItemRecord>(COL.items)
      .find(filter.kind ? { kind: filter.kind } : {}, { projection: { _id: 0 } })
      .sort({ releasedAt: -1, createdAt: -1 })
      .toArray();
  },

  /** Creates the item, or updates its card fields. Never touches versions. */
  /**
   * Leaving `visibility` or `status` out keeps the current value; new items
   * start private and in beta.
   */
  async upsert(
    item: Omit<CatalogItem, 'updatedAt' | 'version' | 'releasedAt' | 'visibility' | 'status'> & {
      slug: string;
      install?: InstallSpec;
      visibility?: Visibility;
      status?: CatalogStatus;
    },
    actor?: string,
  ): Promise<CatalogItemRecord> {
    const db = await getDatabase();
    const now = nowISO();
    const { visibility: requested, status, ...card } = item;
    const existing = await this.get(item.id);
    const visibility = isAlwaysPublic(item) ? 'public' : (requested ?? existing?.visibility ?? 'private');
    if (!existing) {
      const record: CatalogItemRecord = {
        ...card,
        visibility,
        status: status ?? 'beta',
        listed: item.listed ?? true,
        releasedAt: now,
        versions: [],
        createdAt: now,
        createdBy: actor,
        updatedAt: now,
        stageHistory: [{ visibility, at: now, by: actor }],
      };
      await db.collection<CatalogItemRecord>(COL.items).insertOne(withoutUndefined(record) as CatalogItemRecord);
      return record;
    }
    await db.collection<CatalogItemRecord>(COL.items).updateOne(
      { id: item.id },
      { $set: { ...withoutUndefined({ ...card, status }), updatedAt: now } },
    );
    if (visibility !== existing.visibility) {
      await this.setVisibility(item.id, visibility, actor);
    }
    return (await this.get(item.id))!;
  },

  /**
   * Moves an item between stages, e.g. private → network → public. Moving
   * by hand clears a pending gate (scheduleRelease sets a new one after);
   * never-publish items stay private.
   */
  async setVisibility(id: string, visibility: Visibility, actor?: string) {
    const db = await getDatabase();
    const now = nowISO();
    const existing = await this.get(id);
    if (!existing) return null;
    if (isAlwaysPublic(existing) && visibility !== 'public') throw new Error(ALWAYS_PUBLIC_ERROR);
    if (existing.neverPublish && visibility !== 'private') {
      throw new Error(`${id} is marked never-publish; take it out of the vault first`);
    }
    await db.collection<CatalogItemRecord>(COL.items).updateOne(
      { id },
      {
        $unset: { publicAt: '', gateStartedAt: '' },
        $set: {
          visibility,
          updatedAt: now,
          // Going public for the first time puts the card back at the top.
          ...(visibility === 'public' && !existing.stageHistory?.some(h => h.visibility === 'public')
            ? { releasedAt: now }
            : {}),
        },
        $push: { stageHistory: { visibility, at: now, by: actor } },
      },
    );
    return this.get(id);
  },

  /**
   * Records gated releases whose time has come as public, dated from their
   * `publicAt`. Access already treats them as public (effectiveVisibility);
   * this keeps the stored stage and history in step. Returns the ids moved.
   */
  async settleGates(): Promise<string[]> {
    const db = await getDatabase();
    const now = nowISO();
    const due = await db
      .collection<CatalogItemRecord>(COL.items)
      .find(
        { publicAt: { $lte: now }, visibility: 'network', neverPublish: { $ne: true } },
        { projection: { _id: 0, id: 1, publicAt: 1, stageHistory: 1 } },
      )
      .toArray();
    for (const item of due) {
      const firstTime = !item.stageHistory?.some(h => h.visibility === 'public');
      await db.collection<CatalogItemRecord>(COL.items).updateOne(
        { id: item.id },
        {
          $set: { visibility: 'public', updatedAt: now, ...(firstTime ? { releasedAt: item.publicAt } : {}) },
          $unset: { publicAt: '', gateStartedAt: '' },
          $push: { stageHistory: { visibility: 'public', at: item.publicAt!, by: 'gate' } },
        },
      );
    }
    // Skills are always public: record any stored as private or network (from before that rule) as public.
    const skills = await db
      .collection<CatalogItemRecord>(COL.items)
      .find({ kind: { $in: ALWAYS_PUBLIC_KINDS }, $or: [{ visibility: { $ne: 'public' } }, { neverPublish: true }, { publicAt: { $exists: true } }] }, { projection: { _id: 0, id: 1, stageHistory: 1 } })
      .toArray();
    for (const item of skills) {
      const firstTime = !item.stageHistory?.some(h => h.visibility === 'public');
      await db.collection<CatalogItemRecord>(COL.items).updateOne(
        { id: item.id },
        {
          $set: { visibility: 'public', updatedAt: now, ...(firstTime ? { releasedAt: now } : {}) },
          $unset: { neverPublish: '', publicAt: '', gateStartedAt: '' },
          $push: { stageHistory: { visibility: 'public', at: now, by: 'skills-public' } },
        },
      );
    }
    return [...due, ...skills].map(item => item.id);
  },

  /**
   * Gates a release: the item becomes a community item now and goes public
   * by itself at `publicAt`. Passing null cancels the gate (the item stays
   * where it is).
   */
  async scheduleRelease(id: string, publicAt: string | null, actor?: string) {
    const db = await getDatabase();
    const existing = await this.get(id);
    if (!existing) return null;
    if (publicAt === null) {
      await db
        .collection<CatalogItemRecord>(COL.items)
        .updateOne({ id }, { $unset: { publicAt: '', gateStartedAt: '' }, $set: { updatedAt: nowISO() } });
      return this.get(id);
    }
    if (isAlwaysPublic(existing)) throw new Error(ALWAYS_PUBLIC_ERROR);
    if (existing.neverPublish) throw new Error(`${id} is marked never-publish; take it out of the vault first`);
    if (existing.visibility === 'public') throw new Error(`${id} is already public`);
    if (existing.visibility === 'private') await this.setVisibility(id, 'network', actor);
    const now = nowISO();
    await db.collection<CatalogItemRecord>(COL.items).updateOne({ id }, { $set: { publicAt, gateStartedAt: now, updatedAt: now } });
    return this.get(id);
  },

  /**
   * Puts an item in the vault (never published, admins and explicit grants
   * only) or takes it out, back to development.
   */
  async setNeverPublish(id: string, neverPublish: boolean, actor?: string) {
    const db = await getDatabase();
    const existing = await this.get(id);
    if (!existing) return null;
    if (neverPublish) {
      if (isAlwaysPublic(existing)) throw new Error(ALWAYS_PUBLIC_ERROR);
      if (existing.visibility !== 'private') await this.setVisibility(id, 'private', actor);
      await db
        .collection<CatalogItemRecord>(COL.items)
        .updateOne({ id }, { $set: { neverPublish: true, updatedAt: nowISO() }, $unset: { publicAt: '', gateStartedAt: '' } });
    } else {
      await db.collection<CatalogItemRecord>(COL.items).updateOne({ id }, { $unset: { neverPublish: '' }, $set: { updatedAt: nowISO() } });
    }
    return this.get(id);
  },

  async addVersion(id: string, version: CatalogVersion) {
    const db = await getDatabase();
    const existing = await this.get(id);
    if (!existing) throw new Error(`Unknown catalog item ${id}`);
    if (existing.versions.some(v => v.version === version.version)) {
      throw new Error(`${id}@${version.version} is already published`);
    }
    await db.collection<CatalogItemRecord>(COL.items).updateOne(
      { id },
      { $push: { versions: version }, $set: { version: version.version, updatedAt: nowISO() } },
    );
    return this.get(id);
  },

  async remove(id: string) {
    const db = await getDatabase();
    await db.collection(COL.items).deleteOne({ id });
  },

  async logDownload(entry: CatalogDownload) {
    const db = await getDatabase();
    await db.collection<CatalogDownload>(COL.downloads).insertOne({ ...entry });
  },

  async listDownloads(itemId: string, limit = 100) {
    const db = await getDatabase();
    return db
      .collection<CatalogDownload>(COL.downloads)
      .find({ itemId }, { projection: { _id: 0 } })
      .sort({ at: -1 })
      .limit(limit)
      .toArray();
  },
};

// ── Grants ───────────────────────────────────────────────────────────────────

export const accessGrantsDB = {
  async create(input: {
    itemId: string | '*';
    subject: GrantSubject;
    grantedBy?: string;
    expiresAt?: string;
    note?: string;
    inviteCode?: string;
  }): Promise<AccessGrant> {
    const db = await getDatabase();
    const grant: AccessGrant = { grantId: newId('grant'), grantedAt: nowISO(), ...input };
    await db.collection<AccessGrant>(COL.grants).insertOne(withoutUndefined(grant) as AccessGrant);
    return grant;
  },

  async revoke(grantId: string, revokedBy?: string) {
    const db = await getDatabase();
    const res = await db
      .collection<AccessGrant>(COL.grants)
      .updateOne({ grantId, revokedAt: { $exists: false } }, { $set: { revokedAt: nowISO(), revokedBy } });
    return res.modifiedCount > 0;
  },

  /** Revokes every live grant of one item to one subject. */
  async revokeFor(itemId: string | '*', subject: GrantSubject, revokedBy?: string) {
    const db = await getDatabase();
    const res = await db.collection<AccessGrant>(COL.grants).updateMany(
      { itemId, 'subject.kind': subject.kind, 'subject.id': subject.id, revokedAt: { $exists: false } },
      { $set: { revokedAt: nowISO(), revokedBy } },
    );
    return res.modifiedCount;
  },

  /** Live (not revoked, not expired) grants for a client and its groups. */
  async liveFor(clientId: string, groupIds: string[]): Promise<AccessGrant[]> {
    const db = await getDatabase();
    const now = nowISO();
    return db
      .collection<AccessGrant>(COL.grants)
      .find(
        {
          revokedAt: { $exists: false },
          $and: [
            { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] },
            {
              $or: [
                { 'subject.kind': 'client', 'subject.id': clientId },
                ...(groupIds.length ? [{ 'subject.kind': 'group' as const, 'subject.id': { $in: groupIds } }] : []),
              ],
            },
          ],
        },
        { projection: { _id: 0 } },
      )
      .toArray();
  },

  async list(filter: { itemId?: string; includeRevoked?: boolean } = {}) {
    const db = await getDatabase();
    return db
      .collection<AccessGrant>(COL.grants)
      .find(
        {
          ...(filter.itemId ? { itemId: filter.itemId } : {}),
          ...(filter.includeRevoked ? {} : { revokedAt: { $exists: false } }),
        },
        { projection: { _id: 0 } },
      )
      .sort({ grantedAt: -1 })
      .toArray();
  },
};

// ── Groups ───────────────────────────────────────────────────────────────────

export const accessGroupsDB = {
  async groupsOf(clientId: string): Promise<string[]> {
    const db = await getDatabase();
    const groups = await db
      .collection<AccessGroup>(COL.groups)
      .find({ members: clientId }, { projection: { groupId: 1 } })
      .toArray();
    return groups.map(g => g.groupId);
  },

  async list(): Promise<AccessGroup[]> {
    const db = await getDatabase();
    return db.collection<AccessGroup>(COL.groups).find({}, { projection: { _id: 0 } }).toArray();
  },

  async addMembers(groupId: string, clientIds: string[], name?: string) {
    const db = await getDatabase();
    const now = nowISO();
    await db.collection<AccessGroup>(COL.groups).updateOne(
      { groupId },
      {
        $addToSet: { members: { $each: clientIds } },
        $set: { updatedAt: now },
        $setOnInsert: {
          groupId,
          name: name ?? (groupId === NETWORK_GROUP ? 'Network' : groupId),
          createdAt: now,
        },
      },
      { upsert: true },
    );
  },

  async removeMembers(groupId: string, clientIds: string[]) {
    const db = await getDatabase();
    await db
      .collection<AccessGroup>(COL.groups)
      .updateOne({ groupId }, { $pull: { members: { $in: clientIds } }, $set: { updatedAt: nowISO() } });
  },
};

// ── Invites ──────────────────────────────────────────────────────────────────

export const accessInvitesDB = {
  async create(input: {
    itemIds: (string | '*')[];
    groupId?: string;
    maxUses?: number;
    grantDays?: number;
    expiresAt?: string;
    createdBy?: string;
    note?: string;
  }): Promise<AccessInvite> {
    const db = await getDatabase();
    const invite: AccessInvite = {
      // Short enough to paste in a chat, long enough not to be guessed.
      code: randomBytes(8).toString('base64url'),
      itemIds: input.itemIds,
      groupId: input.groupId,
      maxUses: input.maxUses ?? 1,
      uses: 0,
      redeemedBy: [],
      grantDays: input.grantDays,
      createdBy: input.createdBy,
      createdAt: nowISO(),
      expiresAt: input.expiresAt,
      note: input.note,
    };
    await db.collection<AccessInvite>(COL.invites).insertOne(withoutUndefined(invite) as AccessInvite);
    return invite;
  },

  async list(): Promise<AccessInvite[]> {
    const db = await getDatabase();
    return db
      .collection<AccessInvite>(COL.invites)
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async disable(code: string) {
    const db = await getDatabase();
    await db.collection<AccessInvite>(COL.invites).updateOne({ code }, { $set: { disabledAt: nowISO() } });
  },

  /**
   * Atomically takes one use of a live invite for `clientId`. Returns the
   * invite, or a reason it cannot be used.
   */
  async claim(code: string, clientId: string): Promise<{ invite: AccessInvite } | { error: string }> {
    const db = await getDatabase();
    const now = nowISO();
    const claimed = await db.collection<AccessInvite>(COL.invites).findOneAndUpdate(
      {
        code,
        disabledAt: { $exists: false },
        'redeemedBy.clientId': { $ne: clientId },
        $expr: { $lt: ['$uses', '$maxUses'] },
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
      },
      { $inc: { uses: 1 }, $push: { redeemedBy: { clientId, at: now } } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    if (claimed) return { invite: claimed };

    const existing = await db.collection<AccessInvite>(COL.invites).findOne({ code });
    if (!existing) return { error: 'This invite code does not exist.' };
    if (existing.redeemedBy.some(r => r.clientId === clientId)) {
      return { error: 'You already redeemed this invite.' };
    }
    if (existing.disabledAt) return { error: 'This invite was turned off.' };
    if (existing.expiresAt && existing.expiresAt <= now) return { error: 'This invite has expired.' };
    return { error: 'This invite has been used up.' };
  },
};

// ── Requests ─────────────────────────────────────────────────────────────────

export const accessRequestsDB = {
  /** One pending request per client and item; asking again refreshes it. */
  async create(itemId: string, clientId: string, message?: string): Promise<AccessRequest> {
    const db = await getDatabase();
    const now = nowISO();
    const res = await db.collection<AccessRequest>(COL.requests).findOneAndUpdate(
      { itemId, clientId, status: 'pending' },
      {
        $set: { message, createdAt: now },
        $setOnInsert: { requestId: newId('req'), itemId, clientId, status: 'pending' as const },
      },
      { upsert: true, returnDocument: 'after', projection: { _id: 0 } },
    );
    return res!;
  },

  async list(status?: AccessRequestStatus): Promise<AccessRequest[]> {
    const db = await getDatabase();
    return db
      .collection<AccessRequest>(COL.requests)
      .find(status ? { status } : {}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async pendingFor(clientId: string): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db
      .collection<AccessRequest>(COL.requests)
      .find({ clientId, status: 'pending' }, { projection: { itemId: 1 } })
      .toArray();
    return rows.map(r => r.itemId);
  },

  async resolve(requestId: string, status: 'approved' | 'rejected', resolvedBy?: string) {
    const db = await getDatabase();
    return db.collection<AccessRequest>(COL.requests).findOneAndUpdate(
      { requestId, status: 'pending' },
      { $set: { status, resolvedAt: nowISO(), resolvedBy } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
  },
};
