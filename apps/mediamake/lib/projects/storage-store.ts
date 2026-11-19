import { ObjectId, type Db } from 'mongodb';
import { getViewerTier } from '@/lib/access';
import type { MemberTier } from '@/lib/memberships/tiers';
import { getDatabase } from '@/lib/mongodb';
import { BUNDLE_COLLECTION, type BundleDoc } from '@/lib/projectsync';
import { noRoomFor, storageCap, type StorageRaise } from './storage';

/** What is stored for cloud projects, counted, and the caps admins raised (see ./storage). */

const RAISES = 'storage_caps';
const LIVE = { deletedAt: { $exists: false } } as const;

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export const storageRaisesDB = {
  async get(clientId: string): Promise<StorageRaise | null> {
    return (await getDatabase()).collection<StorageRaise>(RAISES).findOne({ clientId }, { projection: { _id: 0 } });
  },

  async list(): Promise<StorageRaise[]> {
    return (await getDatabase()).collection<StorageRaise>(RAISES).find({}, { projection: { _id: 0 } }).sort({ at: -1 }).toArray();
  },

  /** Sets one person's cap (it counts when it is more than their membership's). */
  async set(input: Omit<StorageRaise, 'at'>): Promise<StorageRaise> {
    const raise = withoutUndefined({ ...input, at: new Date().toISOString() });
    await (await getDatabase()).collection<StorageRaise>(RAISES).replaceOne({ clientId: input.clientId }, raise, { upsert: true });
    return raise;
  },

  /** Back to their membership's cap. */
  async remove(clientId: string): Promise<boolean> {
    return (await (await getDatabase()).collection(RAISES).deleteOne({ clientId })).deletedCount > 0;
  },
};

/**
 * The bytes stored for each project `ownerId` owns: its productions and
 * releases (a file several versions share is stored, and counted, once),
 * its project media, its brand kit's files and its Cloud Library's files. What is in a project's trash
 * isn't counted.
 */
export async function storageUsedBy(db: Db, ownerId: string): Promise<{ total: number; byProject: Record<string, number> }> {
  const projects = await db
    .collection('projects')
    .find({ clientId: ownerId }, { projection: { _id: 1, 'brandKit.assets.size': 1 } })
    .toArray();
  const byProject: Record<string, number> = {};
  for (const project of projects) {
    const assets = (project.brandKit?.assets ?? []) as { size?: number }[];
    byProject[project._id.toString()] = assets.reduce((sum, asset) => sum + (Number(asset.size) || 0), 0);
  }
  const ids = Object.keys(byProject);
  if (!ids.length) return { total: 0, byProject };

  const [bundles, media, library] = await Promise.all([
    Promise.all(
      Object.values(BUNDLE_COLLECTION).map(name =>
        db
          .collection<BundleDoc>(name)
          .find({ projectId: { $in: ids }, ...LIVE }, { projection: { projectId: 1, 'versions.files.key': 1, 'versions.files.size': 1 } })
          .toArray(),
      ),
    ),
    db
      .collection('mediaFiles')
      .aggregate<{ _id: string; bytes: number }>([{ $match: { projectId: { $in: ids }, ...LIVE } }, { $group: { _id: '$projectId', bytes: { $sum: '$fileSize' } } }])
      .toArray(),
    // the Cloud Library's files (lib/cloud-library): each content once per space
    db
      .collection('library_files')
      .aggregate<{ _id: string; bytes: number }>([{ $match: { space: { $in: ids }, state: 'stored' } }, { $group: { _id: '$space', bytes: { $sum: '$size' } } }])
      .toArray(),
  ]);
  for (const doc of bundles.flat()) {
    const stored = new Map<string, number>();
    for (const version of doc.versions ?? []) for (const file of version.files ?? []) stored.set(file.key, Number(file.size) || 0);
    byProject[doc.projectId] = (byProject[doc.projectId] ?? 0) + [...stored.values()].reduce((a, b) => a + b, 0);
  }
  for (const row of [...media, ...library]) byProject[row._id] = (byProject[row._id] ?? 0) + (Number(row.bytes) || 0);
  return { total: Object.values(byProject).reduce((a, b) => a + b, 0), byProject };
}

export interface MemberStorage {
  tier: MemberTier;
  used: number;
  /** null: no cap. */
  cap: number | null;
  /** The admin's raise, when there is one. */
  raise: StorageRaise | null;
  byProject: Record<string, number>;
}

/** What one person stores, and their cap. */
export async function storageOf(db: Db, clientId: string): Promise<MemberStorage> {
  const [tier, raise, used] = await Promise.all([getViewerTier({ clientId }), storageRaisesDB.get(clientId), storageUsedBy(db, clientId)]);
  return { tier, used: used.total, cap: storageCap(tier, raise), raise, byProject: used.byProject };
}

/**
 * Whether `adding` more bytes fit in a project: they count against its
 * owner's cap. Returns what is wrong in words, or null when they fit.
 * Like the membership check beside it (projectSyncAccess), it is off in
 * development.
 */
export async function storageProblem(db: Db, projectId: string, adding: number): Promise<string | null> {
  if (process.env.NODE_ENV === 'development' || adding <= 0 || !ObjectId.isValid(projectId)) return null;
  const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) }, { projection: { clientId: 1 } });
  const owner = project?.clientId as string | undefined;
  if (!owner) return null;
  const storage = await storageOf(db, owner);
  return noRoomFor(adding, storage.used, storage.cap);
}
