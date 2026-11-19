import { ObjectId, type Db } from 'mongodb';
import { getViewerTier } from '@/lib/access';
import { canWrite, type ProjectRole } from '@/lib/editor/project-access';
import { tierHasFeature } from '@/lib/memberships/tiers';

/**
 * Who may use a space's Cloud Library. It costs money to keep and to serve, so it opens with the
 * cohort for now (`cloudLibrary` in lib/memberships/tiers); then the space decides: everyone on a
 * project reads, searches and fetches, its owner and editors add and change. A personal space is
 * its owner's alone.
 */
export interface LibrarySpace {
  id: string;
  /** As a person reads it: the project's name, or "Personal". */
  name: string;
  personal: boolean;
  role: ProjectRole;
  /** Whose storage it counts against. */
  owner: string;
}

export type LibraryAccess = { ok: true; space: LibrarySpace } | { ok: false; status: number; error: string };

export const NEEDS_COHORT = 'The Library is open to Cohort members for now.';

export async function libraryAccess(db: Db, spaceId: string | null | undefined, clientId: string | null, mode: 'read' | 'write'): Promise<LibraryAccess> {
  if (!clientId) return { ok: false, status: 401, error: 'Sign in first' };
  if (!spaceId || !ObjectId.isValid(spaceId)) return { ok: false, status: 400, error: 'space is a project id (your personal space has one too: GET /api/library lists them)' };
  if (process.env.NODE_ENV !== 'development' && !tierHasFeature(await getViewerTier({ clientId }), 'cloudLibrary')) return { ok: false, status: 403, error: NEEDS_COHORT };
  type Doc = { clientId?: string; displayName?: string; personal?: boolean; sharedWith?: { clientId?: string; role?: ProjectRole }[] };
  const doc = await db.collection<Doc>('projects').findOne({ _id: new ObjectId(spaceId), deletedAt: { $exists: false } }, { projection: { clientId: 1, displayName: 1, personal: 1, sharedWith: 1 } });
  const role: ProjectRole | null = !doc ? null : doc.clientId === clientId ? 'owner' : ((doc.sharedWith ?? []).find(member => member.clientId === clientId)?.role ?? null);
  if (!doc || !role || !doc.clientId) return { ok: false, status: 404, error: 'No such space of yours' };
  if (mode === 'write' && !canWrite(role)) return { ok: false, status: 403, error: "You can read this Library: its space's owner or an editor adds and changes things" };
  return { ok: true, space: { id: spaceId, name: doc.personal ? 'Personal' : (doc.displayName ?? 'Project'), personal: doc.personal === true, role, owner: doc.clientId } };
}

/** Every space whose Library the account can open: its personal one first, then its projects by name. */
export async function librarySpaces(db: Db, clientId: string): Promise<LibrarySpace[]> {
  type Doc = { _id: ObjectId; clientId?: string; displayName?: string; personal?: boolean; sharedWith?: { clientId?: string; role?: ProjectRole }[] };
  const docs = await db
    .collection<Doc>('projects')
    .find({ deletedAt: { $exists: false }, $or: [{ clientId }, { 'sharedWith.clientId': clientId }] }, { projection: { clientId: 1, displayName: 1, personal: 1, sharedWith: 1 } })
    .limit(500)
    .toArray();
  const spaces: LibrarySpace[] = [];
  for (const doc of docs) {
    const role: ProjectRole | null = doc.clientId === clientId ? 'owner' : ((doc.sharedWith ?? []).find(member => member.clientId === clientId)?.role ?? null);
    if (!role || !doc.clientId || (doc.personal && role !== 'owner')) continue;
    spaces.push({ id: doc._id.toString(), name: doc.personal ? 'Personal' : (doc.displayName ?? 'Project'), personal: doc.personal === true, role, owner: doc.clientId });
  }
  return spaces.sort((a, b) => Number(b.personal) - Number(a.personal) || a.name.localeCompare(b.name));
}
