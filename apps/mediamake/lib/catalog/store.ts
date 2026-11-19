import { randomBytes } from 'crypto';
import { getDatabase } from '../mongodb';
import {
  ALWAYS_PUBLIC_ERROR,
  LEGACY_ITEM_TIER,
  NETWORK_GROUP,
  isAlwaysPublic,
  itemTier,
  parseHealth,
  visibilityOfTier,
  type AccessGrant,
  type AccessGroup,
  type AccessRequest,
  type AccessRequestStatus,
  type ArchiveMark,
  type CatalogDownload,
  type CatalogItem,
  type CatalogItemRecord,
  type CatalogKind,
  type CatalogStatus,
  type CatalogVersion,
  type CatalogVideo,
  type GrantSubject,
  type HealthMark,
  type InstallSpec,
  type ItemHealth,
  type ItemTier,
  type ReadinessMark,
  type ReadyProof,
  type Visibility,
} from './types';
import { isEmptyListing, type ItemListing, type ListingFields } from './listing';
import type { ProfileChange, SkillProfile } from './skill-profile';

const COL = {
  items: 'catalog_items',
  archive: 'catalog_archive',
  videos: 'catalog_videos',
  health: 'catalog_health',
  readiness: 'catalog_readiness',
  listing: 'catalog_listing',
  profiles: 'skill_profiles',
  downloads: 'catalog_downloads',
  grants: 'access_grants',
  groups: 'access_groups',
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
  await db.collection(COL.profiles).createIndex({ key: 1 }, { unique: true });
  await db.collection(COL.items).createIndex({ kind: 1, visibility: 1 });
  await db.collection(COL.items).createIndex({ publicAt: 1 }, { sparse: true });
  await db.collection(COL.grants).createIndex({ grantId: 1 }, { unique: true });
  await db.collection(COL.grants).createIndex({ 'subject.kind': 1, 'subject.id': 1 });
  await db.collection(COL.grants).createIndex({ itemId: 1 });
  await db.collection(COL.groups).createIndex({ groupId: 1 }, { unique: true });
  await db.collection(COL.groups).createIndex({ members: 1 });
  await db.collection(COL.requests).createIndex({ requestId: 1 }, { unique: true });
  await db.collection(COL.requests).createIndex({ status: 1, createdAt: -1 });
  await db.collection(COL.downloads).createIndex({ itemId: 1, at: -1 });
  await db.collection(COL.downloads).createIndex({ clientId: 1, at: -1 });
  await db.collection(COL.archive).createIndex({ id: 1 }, { unique: true });
  await db.collection(COL.videos).createIndex({ id: 1 }, { unique: true });
  await db.collection(COL.videos).createIndex({ lessons: 1 }, { sparse: true });
  await db.collection(COL.readiness).createIndex({ id: 1 }, { unique: true });
  await db.collection(COL.listing).createIndex({ id: 1 }, { unique: true });
}

// ── Items ────────────────────────────────────────────────────────────────────

/** A stored record's tier, whatever the clock says: a pending gate doesn't count. */
function storedTier(record: CatalogItemRecord): ItemTier {
  return itemTier({ ...record, publicAt: undefined });
}

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

  /**
   * Creates the item, or updates its card fields. Never touches versions.
   * Leaving `tier` (or the older `visibility`) and `status` out keeps the
   * current value; new items start with the cohort. An item that is always
   * Public (see isAlwaysPublic) is Public whatever is asked.
   */
  async upsert(
    item: Omit<CatalogItem, 'updatedAt' | 'version' | 'releasedAt' | 'visibility' | 'status' | 'tier' | 'readiness' | 'readyProof'> & {
      slug: string;
      install?: InstallSpec;
      tier?: ItemTier;
      visibility?: Visibility;
      status?: CatalogStatus;
    },
    actor?: string,
  ): Promise<CatalogItemRecord> {
    const db = await getDatabase();
    const now = nowISO();
    // inRepo is read from the skill registry when records load, never stored
    const { visibility: stage, tier: asked, status, inRepo: _inRepo, ...card } = item;
    const existing = await this.get(item.id);
    const requested = asked ?? (stage ? LEGACY_ITEM_TIER[stage] : undefined);
    const tier: ItemTier = isAlwaysPublic(item) ? 'public' : (requested ?? (existing ? storedTier(existing) : 'cohort'));
    if (!existing) {
      const record: CatalogItemRecord = {
        ...card,
        tier,
        visibility: visibilityOfTier(tier),
        ...(tier === 'admin' && { neverPublish: true }),
        status: status ?? 'beta',
        listed: item.listed ?? true,
        releasedAt: now,
        versions: [],
        createdAt: now,
        createdBy: actor,
        updatedAt: now,
        stageHistory: [{ visibility: visibilityOfTier(tier), tier, at: now, by: actor }],
      };
      await db.collection<CatalogItemRecord>(COL.items).insertOne(withoutUndefined(record) as CatalogItemRecord);
      return record;
    }
    await db.collection<CatalogItemRecord>(COL.items).updateOne(
      { id: item.id },
      { $set: { ...withoutUndefined({ ...card, status }), updatedAt: now } },
    );
    if (tier !== storedTier(existing)) {
      await this.setTier(item.id, tier, actor, { alwaysPublic: isAlwaysPublic(item) });
    }
    return (await this.get(item.id))!;
  },

  /** Sets a card's title and summary alone: a tutorial or course takes them from its video. */
  async setWords(id: string, words: { title: string; summary: string }) {
    const db = await getDatabase();
    await db.collection<CatalogItemRecord>(COL.items).updateOne({ id }, { $set: { ...words, updatedAt: nowISO() } });
  },

  /**
   * Sets the lowest membership that opens an item: public, plus, pro, cohort,
   * or admin (the vault: never published). Moving by hand clears a pending
   * gate (scheduleRelease sets a new one after). An item that is always
   * Public can only be Public: the caller says so with `alwaysPublic` (a
   * stored record doesn't know whether its skill is in the repo).
   */
  async setTier(id: string, tier: ItemTier, actor?: string, options: { alwaysPublic?: boolean } = {}) {
    const db = await getDatabase();
    const now = nowISO();
    const existing = await this.get(id);
    if (!existing) return null;
    if ((options.alwaysPublic || isAlwaysPublic(existing)) && tier !== 'public') throw new Error(ALWAYS_PUBLIC_ERROR);
    const visibility = visibilityOfTier(tier);
    await db.collection<CatalogItemRecord>(COL.items).updateOne(
      { id },
      {
        $unset: { publicAt: '', gateStartedAt: '', ...(tier !== 'admin' && { neverPublish: '' }) },
        $set: {
          tier,
          visibility,
          ...(tier === 'admin' && { neverPublish: true }),
          updatedAt: now,
          // Going public for the first time puts the card back at the top.
          ...(tier === 'public' && !existing.stageHistory?.some(h => h.visibility === 'public') ? { releasedAt: now } : {}),
        },
        $push: { stageHistory: { visibility, tier, at: now, by: actor } },
      },
    );
    return this.get(id);
  },

  /**
   * Writes a tier on a record stored before the ladder (the migration):
   * unlike setTier, a pending gate stays as it is.
   */
  async recordTier(id: string, tier: ItemTier, actor?: string) {
    const db = await getDatabase();
    const now = nowISO();
    const visibility = visibilityOfTier(tier);
    await db.collection<CatalogItemRecord>(COL.items).updateOne(
      { id },
      {
        $set: { tier, visibility, ...(tier === 'admin' && { neverPublish: true }), updatedAt: now },
        ...(tier !== 'admin' && { $unset: { neverPublish: '' } }),
        $push: { stageHistory: { visibility, tier, at: now, by: actor } },
      },
    );
  },

  /** The older way to move an item, by stage: private is the cohort, network is Pro. Leaves the vault alone. */
  async setVisibility(id: string, visibility: Visibility, actor?: string) {
    const existing = await this.get(id);
    if (!existing) return null;
    if (existing.neverPublish && visibility !== 'private') {
      throw new Error(`${id} is in the vault; take it out first`);
    }
    return this.setTier(id, existing.neverPublish ? 'admin' : LEGACY_ITEM_TIER[visibility], actor);
  },

  /**
   * Records gated releases whose time has come as Public, dated from their
   * `publicAt`. Access already treats them as Public (itemTier); this keeps
   * the stored tier and history in step. Returns the ids moved.
   */
  async settleGates(): Promise<string[]> {
    const db = await getDatabase();
    const now = nowISO();
    const due = await db
      .collection<CatalogItemRecord>(COL.items)
      .find({ publicAt: { $lte: now }, neverPublish: { $ne: true } }, { projection: { _id: 0, id: 1, publicAt: 1, stageHistory: 1 } })
      .toArray();
    for (const item of due) {
      const firstTime = !item.stageHistory?.some(h => h.visibility === 'public');
      await db.collection<CatalogItemRecord>(COL.items).updateOne(
        { id: item.id },
        {
          $set: { tier: 'public', visibility: 'public', updatedAt: now, ...(firstTime ? { releasedAt: item.publicAt } : {}) },
          $unset: { publicAt: '', gateStartedAt: '' },
          $push: { stageHistory: { visibility: 'public', tier: 'public', at: item.publicAt!, by: 'gate' } },
        },
      );
    }
    // Items made by others are always Public: record any stored otherwise as Public.
    const others = await db
      .collection<CatalogItemRecord>(COL.items)
      .find(
        {
          madeBy: { $exists: true },
          $or: [{ visibility: { $ne: 'public' } }, { neverPublish: true }, { publicAt: { $exists: true } }],
        },
        { projection: { _id: 0, id: 1, stageHistory: 1 } },
      )
      .toArray();
    for (const item of others) {
      const firstTime = !item.stageHistory?.some(h => h.visibility === 'public');
      await db.collection<CatalogItemRecord>(COL.items).updateOne(
        { id: item.id },
        {
          $set: { tier: 'public', visibility: 'public', updatedAt: now, ...(firstTime ? { releasedAt: now } : {}) },
          $unset: { neverPublish: '', publicAt: '', gateStartedAt: '' },
          $push: { stageHistory: { visibility: 'public', tier: 'public', at: now, by: 'made-by-others' } },
        },
      );
    }
    return [...due, ...others].map(item => item.id);
  },

  /**
   * Gates a release: the item keeps its tier now and goes Public by itself
   * at `publicAt`. Passing null cancels the gate (the item stays where it is).
   */
  async scheduleRelease(id: string, publicAt: string | null, _actor?: string) {
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
    if (existing.neverPublish) throw new Error(`${id} is in the vault; take it out first`);
    if (storedTier(existing) === 'public') throw new Error(`${id} is already public`);
    const now = nowISO();
    await db.collection<CatalogItemRecord>(COL.items).updateOne({ id }, { $set: { publicAt, gateStartedAt: now, updatedAt: now } });
    return this.get(id);
  },

  /** Puts an item in the vault (tier admin) or takes it out, back to the cohort. */
  async setNeverPublish(id: string, neverPublish: boolean, actor?: string) {
    const existing = await this.get(id);
    if (!existing) return null;
    if (neverPublish) return this.setTier(id, 'admin', actor);
    return existing.neverPublish ? this.setTier(id, 'cohort', actor) : existing;
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

  /** What one account installed: each item once, with the version and time of its last install, newest first. */
  async installsOf(clientId: string): Promise<{ itemId: string; version?: string; at: string }[]> {
    const db = await getDatabase();
    const rows = await db
      .collection<CatalogDownload>(COL.downloads)
      .aggregate<{ _id: string; version?: string; at: string }>([
        { $match: { clientId } },
        { $sort: { at: -1 } },
        { $group: { _id: '$itemId', version: { $first: '$version' }, at: { $first: '$at' } } },
        { $sort: { at: -1 } },
      ])
      .toArray();
    return rows.map(row => ({ itemId: row._id, ...(row.version && { version: row.version }), at: row.at }));
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

// ── Archive ──────────────────────────────────────────────────────────────────

/** Archived items (see ArchiveMark): any id, a skill from the repo too, so kept apart from the items. */
export const catalogArchiveDB = {
  async list(): Promise<ArchiveMark[]> {
    const db = await getDatabase();
    return db.collection<ArchiveMark>(COL.archive).find({}, { projection: { _id: 0 } }).toArray();
  },

  async get(id: string): Promise<ArchiveMark | null> {
    const db = await getDatabase();
    return db.collection<ArchiveMark>(COL.archive).findOne({ id }, { projection: { _id: 0 } });
  },

  /**
   * Archives the items (one archived already keeps its date; a new note
   * replaces the old one) or takes them out of the archive.
   */
  async set(ids: string[], archived: boolean, actor?: string, note?: string) {
    const db = await getDatabase();
    if (!archived) {
      await db.collection<ArchiveMark>(COL.archive).deleteMany({ id: { $in: ids } });
      return;
    }
    const now = nowISO();
    await db.collection<ArchiveMark>(COL.archive).bulkWrite(
      ids.map(id => ({
        updateOne: {
          filter: { id },
          update: { $setOnInsert: withoutUndefined({ id, at: now, by: actor }), ...(note ? { $set: { note } } : {}) },
          upsert: true,
        },
      })),
    );
  },
};

// ── Health ───────────────────────────────────────────────────────────────────

/** Items' health (see ItemHealth): any item, one the repo defines too, so kept apart from the items. */
export const catalogHealthDB = {
  /** Every mark. One stored under the earlier name `not-working` reads as failed. */
  async list(): Promise<HealthMark[]> {
    const db = await getDatabase();
    const marks = await db.collection<HealthMark>(COL.health).find({}, { projection: { _id: 0 } }).toArray();
    return marks.map(mark => ({ ...mark, health: parseHealth(mark.health) ?? 'healthy' }));
  },

  /** Marks the items (a new note replaces the old one, none clears it), or with null clears the mark: back to the repo's default. */
  async set(ids: string[], health: ItemHealth | null, actor?: string, note?: string) {
    const db = await getDatabase();
    if (!health) {
      await db.collection<HealthMark>(COL.health).deleteMany({ id: { $in: ids } });
      return;
    }
    const at = nowISO();
    await db.collection<HealthMark>(COL.health).bulkWrite(
      ids.map(id => ({
        replaceOne: { filter: { id }, replacement: withoutUndefined({ id, health, note, at, by: actor }) as HealthMark, upsert: true },
      })),
    );
  },
};

// ── Readiness ────────────────────────────────────────────────────────────────

/** Items marked Ready, with their proof (see Readiness): any item, kept apart from the items like health. Beta is having no mark. */
export const catalogReadinessDB = {
  async list(): Promise<ReadinessMark[]> {
    const db = await getDatabase();
    return db.collection<ReadinessMark>(COL.readiness).find({}, { projection: { _id: 0 } }).toArray();
  },

  async get(id: string): Promise<ReadinessMark | null> {
    const db = await getDatabase();
    return db.collection<ReadinessMark>(COL.readiness).findOne({ id }, { projection: { _id: 0 } });
  },

  /** Marks the items Ready with their proof. */
  async setReady(ids: string[], proof: ReadyProof[], actor?: string, note?: string) {
    const db = await getDatabase();
    const at = nowISO();
    await db.collection<ReadinessMark>(COL.readiness).bulkWrite(
      ids.map(id => ({
        replaceOne: {
          filter: { id },
          replacement: withoutUndefined({ id, readiness: 'ready' as const, proof, note, at, by: actor }) as ReadinessMark,
          upsert: true,
        },
      })),
    );
  },

  /** Back to Beta: the mark and its proof go. */
  async setBeta(ids: string[]) {
    const db = await getDatabase();
    await db.collection<ReadinessMark>(COL.readiness).deleteMany({ id: { $in: ids } });
  },
};

// ── Videos ───────────────────────────────────────────────────────────────────

/** Videos on items (see CatalogVideo): any id, a skill from the repo too, so kept apart from the items. */
export const catalogVideosDB = {
  async list(): Promise<CatalogVideo[]> {
    const db = await getDatabase();
    return db.collection<CatalogVideo>(COL.videos).find({}, { projection: { _id: 0 } }).toArray();
  },

  async get(id: string): Promise<CatalogVideo | null> {
    const db = await getDatabase();
    return db.collection<CatalogVideo>(COL.videos).findOne({ id }, { projection: { _id: 0 } });
  },

  async getMany(ids: string[]): Promise<CatalogVideo[]> {
    const db = await getDatabase();
    return db.collection<CatalogVideo>(COL.videos).find({ id: { $in: ids } }, { projection: { _id: 0 } }).toArray();
  },

  /** The courses that play this tutorial. */
  async coursesWith(lessonId: string): Promise<CatalogVideo[]> {
    const db = await getDatabase();
    return db.collection<CatalogVideo>(COL.videos).find({ lessons: lessonId }, { projection: { _id: 0 } }).toArray();
  },

  /** Sets an item's video, replacing the one it had. */
  async set(video: Omit<CatalogVideo, 'updatedAt' | 'updatedBy'>, actor?: string): Promise<CatalogVideo> {
    const db = await getDatabase();
    const record = withoutUndefined({ ...video, updatedAt: nowISO(), updatedBy: actor }) as CatalogVideo;
    await db.collection<CatalogVideo>(COL.videos).replaceOne({ id: video.id }, record, { upsert: true });
    return record;
  },

  async remove(id: string) {
    const db = await getDatabase();
    await db.collection(COL.videos).deleteOne({ id });
  },
};

// ── Listings ─────────────────────────────────────────────────────────────────

/** Store listings (see ItemListing): what an admin adds to any id's listing, a skill from the repo too. */
export const catalogListingDB = {
  async list(): Promise<ItemListing[]> {
    const db = await getDatabase();
    return db.collection<ItemListing>(COL.listing).find({}, { projection: { _id: 0 } }).toArray();
  },

  async get(id: string): Promise<ItemListing | null> {
    const db = await getDatabase();
    return db.collection<ItemListing>(COL.listing).findOne({ id }, { projection: { _id: 0 } });
  },

  /** Sets an item's listing, replacing the one it had; with nothing in it, the listing goes. */
  async set(id: string, listing: ListingFields, actor?: string): Promise<ItemListing | null> {
    const db = await getDatabase();
    if (isEmptyListing(listing)) {
      await db.collection(COL.listing).deleteOne({ id });
      return null;
    }
    const record = withoutUndefined({
      id,
      tags: listing.tags,
      media: listing.media,
      description: listing.description || undefined,
      headshot: listing.headshot || undefined,
      icon: listing.icon || undefined,
      readme: listing.readme || undefined,
      editorsPick: listing.editorsPick || undefined,
      updatedAt: nowISO(),
      updatedBy: actor,
    }) as ItemListing;
    await db.collection<ItemListing>(COL.listing).replaceOne({ id }, record, { upsert: true });
    return record;
  },

  async remove(id: string) {
    const db = await getDatabase();
    await db.collection(COL.listing).deleteOne({ id });
  },
};

// ── Skill details ────────────────────────────────────────────────────────────

/** A skill's details (./skill-profile): its nature, its type and a private skill's tags, by the item's details key. */
export const skillProfilesDB = {
  async get(key: string): Promise<SkillProfile | null> {
    const db = await getDatabase();
    return db.collection<SkillProfile>(COL.profiles).findOne({ key }, { projection: { _id: 0 } });
  },

  /** Sets what the change gives and keeps the rest; `type: null` clears the type. */
  async set(change: ProfileChange, actor?: string): Promise<SkillProfile> {
    const db = await getDatabase();
    const { key, type, ...rest } = change;
    const set = withoutUndefined({ ...rest, ...(type && { type }), updatedAt: nowISO(), updatedBy: actor });
    await db.collection<SkillProfile>(COL.profiles).updateOne({ key }, { $set: set, ...(type === null && { $unset: { type: '' } }) }, { upsert: true });
    return (await this.get(key))!;
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
