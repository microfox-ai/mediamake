import { randomBytes } from 'crypto';
import { ObjectId, type Db } from 'mongodb';
import { getUserByClientId, type User } from '@/lib/auth/users';
import { getDatabase } from '../mongodb';
import { syncCollaborators, type GithubLinkSync } from './github';
import { githubGrants } from './github-store';
import { collaboratorsOf, linkSpaceId, roleOn, takeLinkInvite, type LinkedItemView, type LinkRecord, type LinkRole } from './links';
import { spaceView, type SpaceItemRecord, type SpaceKind, type SpaceRecord } from './space';
import { projectsOf, spaceDB, type MemberProject, type MySpaces } from './store';

/**
 * Linked items in MongoDB (see ./links for what they are):
 * `space_links`, one document per item: `{ id, owner, kind, name, repo,
 * projects: [{ id, by, at }], people: [{ clientId, editor, by, at }],
 * invites: [{ email, editor, by, at }], createdAt, updatedAt }`.
 * What its computers report is kept like a space's, under `item:<id>`
 * (`spaces`, `space_items`).
 */
const COL = 'space_links';
const noId = { projection: { _id: 0 } } as const;
const SAME_NAME = { locale: 'en', strength: 2 } as const;

let indexed: Promise<unknown> | null = null;
const ensureIndexes = (db: Db) =>
  (indexed ??= Promise.all([
    db.collection(COL).createIndex({ id: 1 }, { unique: true }),
    db.collection(COL).createIndex({ owner: 1, kind: 1, name: 1 }, { unique: true }),
    db.collection(COL).createIndex({ 'projects.id': 1 }),
    db.collection(COL).createIndex({ 'people.clientId': 1 }),
  ]).catch(error => {
    indexed = null;
    throw error;
  }));

const links = (db: Db) => db.collection<LinkRecord>(COL);

interface ProjectLite {
  _id: ObjectId;
  clientId?: string;
  displayName?: string;
  sharedWith?: { clientId: string }[];
}

/** The live projects among `ids`: each one's name and everyone on it. */
async function projectsById(db: Db, ids: string[]): Promise<Map<string, { name: string; people: string[] }>> {
  const valid = [...new Set(ids)].filter(id => ObjectId.isValid(id));
  if (!valid.length) return new Map();
  const docs = await db
    .collection<ProjectLite>('projects')
    .find({ _id: { $in: valid.map(id => new ObjectId(id)) }, deletedAt: { $exists: false }, personal: { $ne: true } } as never, { projection: { clientId: 1, displayName: 1, 'sharedWith.clientId': 1 } })
    .toArray();
  return new Map(
    docs.map(doc => [String(doc._id), { name: doc.displayName ?? 'Project', people: [...new Set([doc.clientId ?? '', ...(doc.sharedWith ?? []).map(member => member.clientId)].filter(Boolean))] }]),
  );
}

async function usersOf(db: Db, clientIds: string[]): Promise<Map<string, Pick<User, 'clientId' | 'name' | 'githubLogin' | 'email'>>> {
  const ids = [...new Set(clientIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const users = await db.collection<User>('users').find({ clientId: { $in: ids } }, { projection: { _id: 0, clientId: 1, name: 1, githubLogin: 1, email: 1 } }).toArray();
  return new Map(users.map(user => [user.clientId, user]));
}
const nameOf = (user: Pick<User, 'name' | 'githubLogin' | 'email'> | undefined) => user?.name || user?.githubLogin || user?.email?.split('@')[0] || 'A member';

/** Who should be on an item's repo, by GitHub login, and who can't be because they linked none. */
async function repoPeople(db: Db, link: LinkRecord) {
  const projects = await projectsById(db, link.projects.map(project => project.id));
  const wanted = collaboratorsOf(link, new Map([...projects].map(([id, project]) => [id, project.people])));
  const users = await usersOf(db, [...wanted.keys()]);
  return [...wanted].map(([clientId, permission]) => ({ name: nameOf(users.get(clientId)), githubLogin: users.get(clientId)?.githubLogin, permission }));
}

export const linkDB = {
  async byId(id: string): Promise<LinkRecord | null> {
    return (await links(await getDatabase()).findOne({ id }, noId)) as LinkRecord | null;
  },

  /** The owner's item of that kind and name: the record there is, with its repo set to this one, else a new one. */
  async ensure(owner: string, kind: SpaceKind, name: string, repo: string): Promise<LinkRecord> {
    const db = await getDatabase();
    await ensureIndexes(db);
    const now = new Date().toISOString();
    const had = (await links(db).findOne({ owner, kind, name }, noId)) as LinkRecord | null;
    if (had) {
      if (had.repo.toLowerCase() === repo.toLowerCase()) return had;
      const next = { ...had, repo, updatedAt: now };
      await links(db).replaceOne({ id: had.id }, next);
      // another repo starts its computers again
      await Promise.all([db.collection('spaces').deleteOne({ id: linkSpaceId(had.id) }), db.collection('space_items').deleteMany({ space: linkSpaceId(had.id) })]);
      return next;
    }
    const link: LinkRecord = { id: randomBytes(12).toString('hex'), owner, kind, name, repo, projects: [], people: [], invites: [], createdAt: now, updatedAt: now };
    await links(db).insertOne({ ...link });
    return link;
  },

  async save(link: LinkRecord): Promise<void> {
    await links(await getDatabase()).replaceOne({ id: link.id }, link);
  },

  /** What `clientId` may do with the item, or null. */
  async roleOf(link: LinkRecord, clientId: string): Promise<LinkRole | null> {
    const direct = roleOn(link, clientId, []);
    if (direct || !link.projects.length) return direct;
    const projects = await projectsById(await getDatabase(), link.projects.map(project => project.id));
    return roleOn(link, clientId, [...projects].filter(([, project]) => project.people.includes(clientId)).map(([id]) => id));
  },

  /** Invites waiting for this account's email become named members, the way a project's do. */
  async claimInvites(db: Db, clientId: string): Promise<number> {
    try {
      const email = (await getUserByClientId(clientId))?.email;
      if (!email) return 0;
      const waiting = (await links(db).find({ 'invites.email': email }, noId).toArray()) as LinkRecord[];
      const at = new Date().toISOString();
      for (const link of waiting) {
        const next = takeLinkInvite(link, email, clientId, at);
        if (next) await links(db).replaceOne({ id: link.id }, next);
      }
      return waiting.length;
    } catch (error) {
      console.error('[spaces] Could not take up the invites to linked items:', error);
      return 0;
    }
  },

  /** Every linked item the account owns or may use, for the app and `mm space`. */
  async viewsFor(db: Db, clientId: string, mine: MemberProject[]): Promise<LinkedItemView[]> {
    await linkDB.claimInvites(db, clientId);
    const myProjects = new Set(mine.map(project => project.id));
    const found = (await links(db)
      .find({ $or: [{ owner: clientId }, { 'people.clientId': clientId }, ...(myProjects.size ? [{ 'projects.id': { $in: [...myProjects] } }] : [])] }, noId)
      .toArray()) as LinkRecord[];
    if (!found.length) return [];
    const spaceIds = found.map(link => linkSpaceId(link.id));
    const [projects, spaces, items] = await Promise.all([
      projectsById(db, found.flatMap(link => link.projects.map(project => project.id))),
      db.collection<SpaceRecord>('spaces').find({ id: { $in: spaceIds } }, noId).toArray(),
      // a README's text and pictures are read when its dialog opens, not with every list
      db.collection<SpaceItemRecord>('space_items').find({ space: { $in: spaceIds } }, { projection: { _id: 0, 'readme.text': 0, 'readme.pictures': 0 } }).toArray(),
    ]);
    const owned = found.filter(link => link.owner === clientId);
    const users = await usersOf(db, [
      ...found.map(link => link.owner),
      ...spaces.flatMap(space => space.devices.map(device => device.clientId)),
      ...owned.flatMap(link => [...link.people.map(person => person.clientId), ...link.projects.flatMap(project => projects.get(project.id)?.people ?? [])]),
    ]);
    const names = Object.fromEntries([...users].map(([id, user]) => [id, nameOf(user)]));

    const views: LinkedItemView[] = [];
    for (const link of found) {
      const role = roleOn(link, clientId, myProjects);
      if (!role) continue;
      const spaceId = linkSpaceId(link.id);
      const space = (spaces.find(entry => entry.id === spaceId) as SpaceRecord | undefined) ?? null;
      const record = items.find(item => item.space === spaceId && item.kind === link.kind && item.name === link.name) as SpaceItemRecord | undefined;
      const view = spaceView({ space, items: record ? [record] : [] }, clientId, names);
      const shown = view?.items[0];
      const isOwner = role === 'owner';
      const linked = link.projects.filter(project => projects.has(project.id) && (isOwner || myProjects.has(project.id)));
      views.push({
        id: link.id,
        kind: link.kind,
        name: link.name,
        title: shown?.title ?? link.name.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()),
        ...(shown?.summary && { summary: shown.summary }),
        ...(shown?.version && { version: shown.version }),
        repo: link.repo,
        repoUrl: `https://github.com/${link.repo}`,
        role,
        owner: nameOf(users.get(link.owner)),
        projects: linked.map(project => ({ id: project.id, name: projects.get(project.id)!.name })),
        ...(link.people.some(person => person.clientId === clientId) && { direct: true }),
        ...(isOwner && {
          people: link.people.map(person => ({ clientId: person.clientId, name: nameOf(users.get(person.clientId)), ...(users.get(person.clientId)?.email && { email: users.get(person.clientId)!.email }), editor: !!person.editor })),
          invites: link.invites.map(invite => ({ email: invite.email, editor: !!invite.editor })),
          collaborators: [...collaboratorsOf(link, new Map([...projects].map(([id, project]) => [id, project.people])))].map(([id, permission]) => ({
            name: nameOf(users.get(id)),
            ...(users.get(id)?.githubLogin && { githubLogin: users.get(id)!.githubLogin }),
            permission,
          })),
        }),
        space: view,
      });
    }
    return views.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  },

  /** GitHub said a repo has a new name or owner: the linked items on it follow. How many. */
  async renameRepo(from: string, to: string): Promise<number> {
    const db = await getDatabase();
    const result = await links(db).updateMany({ repo: from }, { $set: { repo: to, updatedAt: new Date().toISOString() }, $addToSet: { formerRepos: from } } as never, { collation: SAME_NAME });
    if (result.modifiedCount) await links(db).updateMany({ repo: to }, { $pull: { formerRepos: to } } as never);
    return result.modifiedCount;
  },

  /** GitHub said a repo was deleted: a linked item on it is no more. How many. */
  async forgetRepo(repo: string): Promise<number> {
    const db = await getDatabase();
    return (await links(db).deleteMany({ repo }, { collation: SAME_NAME })).deletedCount;
  },
};

/** An account's spaces with the linked items it owns or may use: what `GET /api/space`, Mine and a space's page read. */
export async function allSpaces(clientId: string): Promise<MySpaces> {
  const db = await getDatabase();
  const [spaces, projects] = await Promise.all([spaceDB.mySpaces(clientId), projectsOf(db, clientId)]);
  return { ...spaces, linked: await linkDB.viewsFor(db, clientId, projects) };
}

/** How it went on GitHub, with who has no GitHub account linked to MediaMake (so can't be on the repo yet). */
export type LinkSync = GithubLinkSync & { noGithub?: string[] };

/**
 * After an item's links or people changed: the same on its repo, with the
 * owner's GitHub connection when there is one. Otherwise the owner's next
 * `mm space sync` does it. Never throws.
 */
export async function githubAfterLink(link: LinkRecord): Promise<LinkSync> {
  try {
    const db = await getDatabase();
    const [grant, people] = await Promise.all([githubGrants.use(link.owner), repoPeople(db, link)]);
    const noGithub = people.filter(person => !person.githubLogin).map(person => person.name);
    if (!grant) return { state: 'not-connected', ...(noGithub.length && { noGithub }) };
    const result = await syncCollaborators(grant, link.repo, people.flatMap(person => (person.githubLogin ? [{ login: person.githubLogin, permission: person.permission }] : [])));
    return { ...result, ...(noGithub.length && { noGithub }) };
  } catch (error) {
    console.error('[spaces] GitHub sync of a linked item failed:', error instanceof Error ? error.message : 'error');
    return { state: 'failed', repo: link.repo, reason: 'Something went wrong on the way to GitHub.' };
  }
}

/** After a project's people changed: every item linked to it follows on GitHub, where its owner connected. Best effort. */
export async function githubAfterProjectChange(projectId: string): Promise<void> {
  try {
    const db = await getDatabase();
    const linked = (await links(db).find({ 'projects.id': projectId }, noId).toArray()) as LinkRecord[];
    await Promise.all(linked.map(link => githubAfterLink(link)));
  } catch (error) {
    console.error('[spaces] GitHub sync after a project change failed:', error instanceof Error ? error.message : 'error');
  }
}
