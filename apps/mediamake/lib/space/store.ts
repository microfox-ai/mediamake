import { personalProjectId } from '@/lib/projects/personal';
import type { Db } from 'mongodb';
import type { ProjectRole } from '@/lib/editor/project-access';
import type { User } from '@/lib/auth/users';
import { getDatabase } from '../mongodb';
import {
  projectSpaceId,
  spaceItemKey,
  spaceView,
  userSpaceId,
  type ProjectSpaceView,
  type SpaceChange,
  type SpaceItemRecord,
  type SpaceRecord,
  type SpaceState,
  type SpaceView,
} from './space';

/**
 * Spaces in MongoDB (see ./space for what they are):
 * - `spaces`: one document per space, `{ id, repo, connectedAt, updatedAt,
 *   devices: [{ key, clientId, label, branch, commit, commitAt, pushed, reportedAt }] }`.
 *   `id` is `user:<clientId>` or `project:<projectId>`.
 * - `space_items`: one document per item, `{ space, kind, name, title,
 *   summary, version, media, devices: [{ device, version, changed }],
 *   createdAt, updatedAt }`.
 */
const COL = { spaces: 'spaces', items: 'space_items' } as const;

let indexed: Promise<unknown> | null = null;
/** Creates the indexes spaces rely on, once per server. Safe to run repeatedly. */
export function ensureSpaceIndexes() {
  indexed ??= (async () => {
    const db = await getDatabase();
    await db.collection(COL.spaces).createIndex({ id: 1 }, { unique: true });
    await db.collection(COL.items).createIndex({ space: 1, kind: 1, name: 1 }, { unique: true });
  })().catch(error => {
    indexed = null;
    throw error;
  });
  return indexed;
}

const noId = { projection: { _id: 0 } } as const;

/** A project the account is on, as spaces need it. */
export interface MemberProject {
  id: string;
  name: string;
  role: ProjectRole;
  /** Everyone on it, the owner first. */
  people: { clientId: string; role: ProjectRole }[];
}

interface ProjectDocLite {
  _id: string | { toString(): string };
  clientId?: string;
  displayName?: string;
  sharedWith?: { clientId: string; role: 'editor' | 'viewer' }[];
}

/** The projects an account owns or was given. Its personal space's own project (lib/projects/personal) is not one of them. */
export async function projectsOf(db: Db, clientId: string): Promise<MemberProject[]> {
  const docs = await db
    .collection<ProjectDocLite>('projects')
    .find({ $or: [{ clientId }, { 'sharedWith.clientId': clientId }], deletedAt: { $exists: false }, personal: { $ne: true } } as never, { projection: { clientId: 1, displayName: 1, sharedWith: 1 } })
    .toArray();
  return docs
    .map(doc => ({
      id: String(doc._id),
      name: doc.displayName ?? 'Project',
      role: (doc.clientId === clientId ? 'owner' : ((doc.sharedWith ?? []).find(member => member.clientId === clientId)?.role ?? 'viewer')) as ProjectRole,
      people: [
        ...(doc.clientId ? [{ clientId: doc.clientId, role: 'owner' as ProjectRole }] : []),
        ...(doc.sharedWith ?? []).filter(member => member.clientId && member.clientId !== doc.clientId).map(member => ({ clientId: member.clientId, role: member.role as ProjectRole })),
      ],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Names and GitHub logins of some accounts. One without a user record is absent. */
async function peopleOf(db: Db, clientIds: string[]): Promise<Map<string, { name: string; githubLogin?: string }>> {
  const ids = [...new Set(clientIds)];
  if (!ids.length) return new Map();
  const users = await db.collection<User>('users').find({ clientId: { $in: ids } }, { projection: { _id: 0, clientId: 1, name: 1, githubLogin: 1, email: 1 } }).toArray();
  return new Map(users.map(user => [user.clientId, { name: user.name || user.githubLogin || user.email?.split('@')[0] || 'A member', ...(user.githubLogin && { githubLogin: user.githubLogin }) }]));
}

/** Everything an account's spaces show: its own, and one per project it is on. */
export interface MySpaces {
  mine: SpaceView | null;
  /** The project that keeps the personal space's files (brand kits, productions, media), once it exists. */
  personalProjectId?: string;
  projects: (ProjectSpaceView & {
    /** For the people who may change the project: who to invite to the repo, by GitHub login. */
    members?: { name: string; githubLogin?: string; role: ProjectRole; you?: boolean }[];
  })[];
}

export const spaceDB = {
  /** One space and its items, or `{ space: null, items: [] }`. */
  async stateOf(spaceId: string): Promise<SpaceState> {
    const db = await getDatabase();
    const [space, items] = await Promise.all([
      db.collection<SpaceRecord>(COL.spaces).findOne({ id: spaceId }, noId),
      db.collection<SpaceItemRecord>(COL.items).find({ space: spaceId }, noId).toArray(),
    ]);
    return { space: space as SpaceRecord | null, items: items as SpaceItemRecord[] };
  },

  /** Saves what a report changed. */
  async save(before: SpaceState, change: SpaceChange): Promise<void> {
    await ensureSpaceIndexes();
    const db = await getDatabase();
    const spaceId = change.space.id;
    await db.collection<SpaceRecord>(COL.spaces).replaceOne({ id: spaceId }, change.space, { upsert: true });
    const was = new Map(before.items.map(item => [spaceItemKey(item), item]));
    const writes = change.items
      .filter(item => was.get(spaceItemKey(item)) !== item)
      .map(item => ({ replaceOne: { filter: { space: spaceId, kind: item.kind, name: item.name }, replacement: item, upsert: true } }));
    if (writes.length) await db.collection<SpaceItemRecord>(COL.items).bulkWrite(writes, { ordered: false });
    const gone = change.removed.map(key => {
      const [kind, name] = key.split('/');
      return { space: spaceId, kind, name };
    });
    if (gone.length) await db.collection(COL.items).deleteMany({ $or: gone });
    // a repo that changed starts the space again: what the old one held is gone
    if (before.space && before.space.repo !== change.space.repo) {
      const keep = new Set(change.items.map(spaceItemKey));
      const stale = before.items.filter(item => !keep.has(spaceItemKey(item))).map(item => ({ space: spaceId, kind: item.kind, name: item.name }));
      if (stale.length) await db.collection(COL.items).deleteMany({ $or: stale });
    }
  },

  /** Names the repo of a project's space (the first share does it), keeping its computers when it is the same repo. */
  async setProjectRepo(projectId: string, repo: string): Promise<SpaceRecord> {
    await ensureSpaceIndexes();
    const db = await getDatabase();
    const id = projectSpaceId(projectId);
    const now = new Date().toISOString();
    const before = await db.collection<SpaceRecord>(COL.spaces).findOne({ id }, noId);
    if (before?.repo === repo) return before as SpaceRecord;
    const space: SpaceRecord = { id, repo, connectedAt: now, updatedAt: now, devices: [] };
    await db.collection<SpaceRecord>(COL.spaces).replaceOne({ id }, space, { upsert: true });
    await db.collection(COL.items).deleteMany({ space: id });
    return space;
  },

  /** An account's own space and the space of every project it is on, as the page and `mm space` read them. */
  async mySpaces(clientId: string): Promise<MySpaces> {
    const db = await getDatabase();
    const [projects, personal] = await Promise.all([projectsOf(db, clientId), personalProjectId(db, clientId).catch(() => null)]);
    const ids = [userSpaceId(clientId), ...projects.map(project => projectSpaceId(project.id))];
    const [spaces, items, people] = await Promise.all([
      db.collection<SpaceRecord>(COL.spaces).find({ id: { $in: ids } }, noId).toArray(),
      db.collection<SpaceItemRecord>(COL.items).find({ space: { $in: ids } }, noId).toArray(),
      peopleOf(db, projects.flatMap(project => project.people.map(person => person.clientId))),
    ]);
    const names = Object.fromEntries([...people].map(([id, person]) => [id, person.name]));
    const state = (id: string): SpaceState => ({
      space: (spaces.find(space => space.id === id) as SpaceRecord | undefined) ?? null,
      items: items.filter(item => item.space === id) as SpaceItemRecord[],
    });
    return {
      mine: spaceView(state(ids[0]), clientId),
      ...(personal && { personalProjectId: personal }),
      projects: projects.map(project => ({
        projectId: project.id,
        name: project.name,
        role: project.role,
        people: project.people.length,
        ...(people.get(project.people[0]?.clientId)?.name && project.people[0].role === 'owner' && { owner: people.get(project.people[0].clientId)!.name }),
        space: spaceView(state(projectSpaceId(project.id)), clientId, names),
        ...(project.role !== 'viewer' && {
          members: project.people.map(person => ({
            name: people.get(person.clientId)?.name ?? 'A member',
            ...(people.get(person.clientId)?.githubLogin && { githubLogin: people.get(person.clientId)!.githubLogin }),
            role: person.role,
            ...(person.clientId === clientId && { you: true }),
          })),
        }),
      })),
    };
  },

  /** Takes an account's computers off every space, and deletes its own space. The repos are untouched. */
  async forget(clientId: string): Promise<{ items: number }> {
    const db = await getDatabase();
    const own = userSpaceId(clientId);
    const [, items] = await Promise.all([db.collection(COL.spaces).deleteOne({ id: own }), db.collection(COL.items).deleteMany({ space: own })]);
    await db.collection(COL.spaces).updateMany({ 'devices.clientId': clientId }, { $pull: { devices: { clientId } } } as never);
    await db.collection(COL.items).updateMany({ 'devices.device': { $regex: `^${clientId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/` } }, { $pull: { devices: { device: { $regex: `^${clientId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/` } } } } as never);
    return { items: items.deletedCount };
  },
};
