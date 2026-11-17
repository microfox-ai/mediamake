import { ObjectId, type Db } from 'mongodb';
import { canUseCloudProjects, getViewerTier } from '@/lib/access';
import { isAdmin } from '@/lib/admin-utils';
import { getUserByClientId, getUserByEmail, listUsers, type User } from '@/lib/auth/users';
import { summarizeBrandKit, type BrandKit } from '@/lib/brand-kit';
import { BUNDLE_COLLECTION } from '@/lib/projectsync';
import { storageUsedBy } from './storage-store';
import { takeInvite, type MemberPerson, type Person, type ProjectCard, type ProjectInvite, type ProjectMember } from './access';

/** Cloud projects with the people on them, read and changed (the rules: ./access). */

export interface ProjectDoc {
  _id: ObjectId;
  clientId?: string;
  /** The owner's personal space (./personal): only theirs. */
  personal?: boolean;
  displayName: string;
  tags?: string[];
  sharedWith?: ProjectMember[];
  invites?: ProjectInvite[];
  brandKit?: BrandKit;
  createdAt: Date | string;
  updatedAt: Date | string;
}

const LIVE = { deletedAt: { $exists: false } } as const;
const iso = (value: unknown) => {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
};

const projects = (db: Db) => db.collection<ProjectDoc>('projects');

function person(clientId: string, user: User | null | undefined, withEmail: boolean): Person {
  return {
    clientId,
    name: user?.name || user?.githubLogin || user?.email?.split('@')[0] || clientId,
    ...(withEmail && user?.email && { email: user.email }),
    ...(user?.avatarUrl && { avatarUrl: user.avatarUrl }),
  };
}

/** The accounts behind some client ids. One without a user record (from before sign-in) is absent. */
async function usersOf(db: Db, clientIds: string[]): Promise<Map<string, User>> {
  const ids = [...new Set(clientIds.filter(Boolean))];
  if (!ids.length) return new Map();
  try {
    const users = await db.collection<User>('users').find({ clientId: { $in: ids } }, { projection: { _id: 0, passwordHash: 0 } }).toArray();
    return new Map(users.map(user => [user.clientId, user as User]));
  } catch (error) {
    console.error('[projects] Could not load the people of a project:', error);
    return new Map();
  }
}

/**
 * Invites waiting for this account's email become memberships. Called where
 * projects are listed, so someone invited before they had an account finds
 * the project the first time they look, in the app or through ProjectSync.
 */
export async function claimInvites(db: Db, clientId: string): Promise<number> {
  try {
    const email = (await getUserByClientId(clientId))?.email;
    if (!email) return 0;
    const waiting = await projects(db).find({ 'invites.email': email }).toArray();
    const at = new Date().toISOString();
    for (const project of waiting) {
      const next = takeInvite(project, email, clientId, at);
      if (next) await projects(db).updateOne({ _id: project._id }, { $set: { sharedWith: next.sharedWith, invites: next.invites, updatedAt: new Date() } });
    }
    return waiting.length;
  } catch (error) {
    console.error('[projects] Could not take up invites:', error);
    return 0;
  }
}

/** What each project holds and when it last changed: its productions, releases and media. */
async function activityOf(db: Db, ids: string[]) {
  const stats = new Map<string, { productions: number; releases: number; media: number; last: string }>(ids.map(id => [id, { productions: 0, releases: 0, media: 0, last: '' }]));
  if (!ids.length) return stats;
  const group = (field: string) => [{ $match: { projectId: { $in: ids }, ...LIVE } }, { $group: { _id: '$projectId', count: { $sum: 1 }, last: { $max: `$${field}` } } }];
  const [productions, releases, media] = await Promise.all([
    db.collection(BUNDLE_COLLECTION.production).aggregate<{ _id: string; count: number; last: unknown }>(group('updatedAt')).toArray(),
    db.collection(BUNDLE_COLLECTION.release).aggregate<{ _id: string; count: number; last: unknown }>(group('updatedAt')).toArray(),
    db.collection('mediaFiles').aggregate<{ _id: string; count: number; last: unknown }>(group('createdAt')).toArray(),
  ]);
  const add = (rows: { _id: string; count: number; last: unknown }[], key: 'productions' | 'releases' | 'media') => {
    for (const row of rows) {
      const entry = stats.get(row._id);
      if (!entry) continue;
      entry[key] = row.count;
      const last = row.last ? iso(row.last) : '';
      if (last > entry.last) entry.last = last;
    }
  };
  add(productions, 'productions');
  add(releases, 'releases');
  add(media, 'media');
  return stats;
}

/** Every project `clientId` owns or was given, as the Spaces page's cards. */
export async function projectCards(db: Db, clientId: string): Promise<ProjectCard[]> {
  await claimInvites(db, clientId);
  const docs = await projects(db).find({ $or: [{ clientId }, { 'sharedWith.clientId': clientId }] }).toArray();
  const ids = docs.map(doc => doc._id.toString());
  const owners = [...new Set(docs.map(doc => doc.clientId).filter((id): id is string => !!id))];
  const everyone = docs.flatMap(doc => [doc.clientId ?? '', ...(doc.sharedWith ?? []).map(member => member.clientId)]);

  const quiet = <T,>(what: string, fallback: T) => (error: unknown) => {
    console.error(`[projects] Could not load ${what}:`, error);
    return fallback;
  };
  const [users, activity, sizes] = await Promise.all([
    usersOf(db, everyone),
    activityOf(db, ids).catch(quiet('project activity', new Map<string, { productions: number; releases: number; media: number; last: string }>())),
    Promise.all(owners.map(owner => storageUsedBy(db, owner).then(used => used.byProject).catch(quiet('project sizes', {} as Record<string, number>)))),
  ]);
  const bytes: Record<string, number> = Object.assign({}, ...sizes);

  return docs.map(doc => {
    const id = doc._id.toString();
    const owned = doc.clientId === clientId;
    const stats = activity.get(id);
    const changed = iso(doc.updatedAt);
    const kit = summarizeBrandKit(doc.brandKit);
    return {
      id,
      displayName: doc.displayName,
      ...(doc.personal && owned && { personal: true }),
      tags: doc.tags ?? [],
      createdAt: iso(doc.createdAt),
      lastActivityAt: stats && stats.last > changed ? stats.last : changed,
      role: owned ? 'owner' : ((doc.sharedWith ?? []).find(member => member.clientId === clientId)?.role ?? 'viewer'),
      owner: person(doc.clientId ?? '', users.get(doc.clientId ?? ''), false),
      members: (doc.sharedWith ?? []).map(member => ({ ...person(member.clientId, users.get(member.clientId), owned), role: member.role, addedAt: member.addedAt })),
      invites: owned ? (doc.invites ?? []).length : 0,
      bytes: bytes[id] ?? 0,
      counts: { productions: stats?.productions ?? 0, releases: stats?.releases ?? 0, media: stats?.media ?? 0 },
      ...(kit && { brandKit: { assetCount: kit.assetCount, logo: kit.logo, colors: kit.colors ?? [] } }),
    } satisfies ProjectCard;
  });
}

export interface ProjectAccessView {
  projectId: string;
  displayName: string;
  myRole: 'owner' | 'editor' | 'viewer';
  isOwner: boolean;
  owner: Person;
  members: MemberPerson[];
  /** The owner's to see. */
  invites: ProjectInvite[];
}

export async function findProject(db: Db, projectId: string): Promise<ProjectDoc | null> {
  if (!ObjectId.isValid(projectId)) return null;
  return projects(db).findOne({ _id: new ObjectId(projectId) });
}

/** Who is on a project, for anyone on it. Emails, invites and who can't open it yet are the owner's to see. */
export async function accessView(db: Db, project: ProjectDoc, clientId: string): Promise<ProjectAccessView | null> {
  const members = project.sharedWith ?? [];
  const isOwner = project.clientId === clientId;
  const mine = members.find(member => member.clientId === clientId);
  if (!isOwner && !mine) return null;
  const users = await usersOf(db, [project.clientId ?? '', ...members.map(member => member.clientId)]);
  const opens = isOwner ? await Promise.all(members.map(member => opensCloudProjects(member.clientId))) : [];
  return {
    projectId: project._id.toString(),
    displayName: project.displayName,
    myRole: isOwner ? 'owner' : mine!.role,
    isOwner,
    owner: person(project.clientId ?? '', users.get(project.clientId ?? ''), isOwner),
    members: members.map((member, index) => ({
      ...person(member.clientId, users.get(member.clientId), isOwner || member.clientId === clientId),
      role: member.role,
      addedAt: member.addedAt,
      ...(isOwner && { canOpen: opens[index] }),
    })),
    invites: isOwner ? (project.invites ?? []) : [],
  };
}

/** Whether an account's membership opens cloud projects (Plus and above). True when it can't be told. */
async function opensCloudProjects(clientId: string): Promise<boolean> {
  try {
    return canUseCloudProjects(await getViewerTier({ clientId }));
  } catch {
    return true;
  }
}

/** The account a share names: by email, or by its id. Null when there is none. */
export async function accountFor(db: Db, target: { email?: string; clientId?: string }): Promise<Person | null> {
  if (target.email) {
    const user = await getUserByEmail(target.email);
    return user ? person(user.clientId, user, true) : null;
  }
  if (!target.clientId) return null;
  const user = await getUserByClientId(target.clientId);
  if (user) return person(user.clientId, user, false);
  // An account from before sign-in: it has API keys and no user record.
  const { listKeyHolders } = await import('@/lib/memberships/admin');
  const holder = (await listKeyHolders()).find(entry => entry.clientId === target.clientId);
  return holder ? { clientId: holder.clientId, name: holder.name } : null;
}

/**
 * People to offer while the owner types a name: those already on a project
 * with them, and for admins everyone with an account. Nobody can list the
 * accounts of people they don't work with; anyone else is reached by their
 * exact email.
 */
export async function suggestPeople(db: Db, clientId: string, query: string, exclude: string[] = []): Promise<Person[]> {
  const q = query.trim().toLowerCase();
  const skip = new Set([clientId, ...exclude]);
  const matches = (user: Person) => !q || [user.name, user.email ?? '', user.clientId].some(text => text.toLowerCase().includes(q));

  const mine = await projects(db).find({ $or: [{ clientId }, { 'sharedWith.clientId': clientId }] }, { projection: { clientId: 1, 'sharedWith.clientId': 1 } }).toArray();
  const known = [...new Set(mine.flatMap(doc => [doc.clientId ?? '', ...(doc.sharedWith ?? []).map(member => member.clientId)]))].filter(id => id && !skip.has(id));
  const users = await usersOf(db, known);
  const found = new Map<string, Person>(known.map(id => [id, person(id, users.get(id), true)] as const).filter(([, who]) => matches(who)));

  if (q.length >= 2 && (await isAdmin(clientId).catch(() => false))) {
    for (const user of await listUsers().catch(() => [] as User[])) {
      const who = person(user.clientId, user, true);
      if (!skip.has(user.clientId) && matches(who)) found.set(user.clientId, who);
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
}
