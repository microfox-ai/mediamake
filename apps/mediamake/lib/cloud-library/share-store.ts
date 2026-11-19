/**
 * Shared collections in MongoDB (docs/library.md › Shared collections):
 *
 * - `library_shares`  one document per collection and space it was opened to (./shares);
 * - `library_notes`   a receiving space's own rating, tags and "used in" on a shared entry. They
 *                     never touch the entry.
 *
 * Nothing is copied by sharing: the entries, the files and the storage they count against stay the
 * owner's. Someone reads a shared collection only while they are on the space it was opened to, so
 * leaving that project, or the owner taking the share back, ends it at once.
 */
import { ObjectId, type Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { ensurePersonalProject } from '@/lib/projects/personal';
import type { LibrarySpace } from './access';
import type { CollectionRecord, UsageLine } from './index';
import { INVITATION, aliasFor, cleanNotes, emptyNotes, fetchedThrough, roleThrough, visibleThrough, type InvitationView, type ShareAsk, type ShareNotes, type ShareRecord, type ShareView } from './shares';

const SHARES = 'library_shares';
const NOTES = 'library_notes';
const noId = { projection: { _id: 0 } } as const;
const LIVE = { deletedAt: { $exists: false } } as const;

type Fail = { error: string; status: number };
const fail = (error: string, status = 400): Fail => ({ error, status });

type ProjectDoc = { _id: ObjectId; clientId?: string; displayName?: string; personal?: boolean; sharedWith?: { clientId?: string }[] };
type UserDoc = { clientId: string; name?: string; githubLogin?: string; email?: string };
const nameOf = (user: UserDoc | null | undefined) => user?.name || user?.githubLogin || user?.email?.split('@')[0] || 'A member';

let indexed: Promise<unknown> | null = null;
async function database(): Promise<Db> {
  const db = await getDatabase();
  indexed ??= Promise.all([
    db.collection(SHARES).createIndex({ from: 1, collection: 1, to: 1 }, { unique: true }),
    db.collection(SHARES).createIndex({ to: 1, state: 1 }),
    db.collection(NOTES).createIndex({ space: 1, from: 1, collection: 1, entry: 1 }, { unique: true }),
  ]).catch(() => null);
  await indexed;
  return db;
}

/** Each space's name as someone outside it reads it: the project's name, or whose personal Library it is. */
export async function spaceNames(db: Db, ids: string[]): Promise<Map<string, { name: string; personal: boolean; owner: string }>> {
  const valid = [...new Set(ids)].filter(id => ObjectId.isValid(id));
  if (!valid.length) return new Map();
  const docs = await db.collection<ProjectDoc>('projects').find({ _id: { $in: valid.map(id => new ObjectId(id)) }, ...LIVE }, { projection: { clientId: 1, displayName: 1, personal: 1 } }).toArray();
  const owners = [...new Set(docs.filter(doc => doc.personal && doc.clientId).map(doc => doc.clientId!))];
  const users = owners.length ? await db.collection<UserDoc>('users').find({ clientId: { $in: owners } }, { projection: { _id: 0, clientId: 1, name: 1, githubLogin: 1, email: 1 } }).toArray() : [];
  const people = new Map(users.map(user => [user.clientId, nameOf(user)]));
  return new Map(docs.filter(doc => doc.clientId).map(doc => [doc._id.toString(), { name: doc.personal ? (people.get(doc.clientId!) ?? 'A member') : (doc.displayName ?? 'Project'), personal: doc.personal === true, owner: doc.clientId! }]));
}

/** A shared collection as the receiving space reaches it. */
export interface SharedPlace {
  share: ShareRecord;
  /** The owner's space, with what the caller may do in this collection. */
  space: LibrarySpace;
  /** Who shares it. */
  by: string;
}

export const shareDB = {
  /** The collection that `alias` names in the space it was opened to, when there is one. */
  async resolve(target: LibrarySpace, alias: string): Promise<SharedPlace | null> {
    const db = await database();
    const share = await db.collection<ShareRecord>(SHARES).findOne({ to: target.id, as: alias, state: 'accepted' }, noId);
    if (!share) return null;
    const source = (await spaceNames(db, [share.from])).get(share.from);
    if (!source) return null;
    return { share, by: source.name, space: { id: share.from, name: source.name, personal: source.personal, role: roleThrough(share, target.role), owner: source.owner } };
  },

  /** Every accepted share into these spaces whose owner's space still exists. */
  async into(targets: LibrarySpace[]): Promise<(SharedPlace & { to: LibrarySpace })[]> {
    if (!targets.length) return [];
    const db = await database();
    const shares = await db.collection<ShareRecord>(SHARES).find({ to: { $in: targets.map(target => target.id) }, state: 'accepted' }, noId).limit(500).toArray();
    const sources = await spaceNames(db, shares.map(share => share.from));
    return shares.flatMap(share => {
      const source = sources.get(share.from);
      const to = targets.find(target => target.id === share.to);
      return source && to && share.as ? [{ share, to, by: source.name, space: { id: share.from, name: source.name, personal: source.personal, role: roleThrough(share, to.role), owner: source.owner } }] : [];
    });
  },

  /** The collections opened to this space that nobody accepted yet. */
  async invitations(target: LibrarySpace): Promise<InvitationView[]> {
    const db = await database();
    const shares = await db.collection<ShareRecord>(SHARES).find({ to: target.id, state: 'invited' }, noId).limit(50).toArray();
    if (!shares.length) return [];
    const sources = await spaceNames(db, shares.map(share => share.from));
    const views = await Promise.all(
      shares.map(async (share): Promise<InvitationView | null> => {
        const source = sources.get(share.from);
        const doc = source ? await db.collection<CollectionRecord>('library_collections').findOne({ space: share.from, slug: share.collection, ...LIVE }, noId) : null;
        if (!source || !doc) return null;
        const entries = await db.collection('library_entries').countDocuments({ space: share.from, collection: share.collection, ...LIVE, ...visibleThrough(share) });
        return { from: share.from, collection: share.collection, name: doc.name, by: source.name, noun: doc.template.noun, entries, role: share.role, says: INVITATION };
      }),
    );
    return views.filter((view): view is InvitationView => !!view);
  },

  /** How many spaces each of a space's collections is opened to. */
  async counts(space: string): Promise<Map<string, number>> {
    const db = await database();
    const rows = await db.collection(SHARES).aggregate<{ _id: string; n: number }>([{ $match: { from: space } }, { $group: { _id: '$collection', n: { $sum: 1 } } }]).toArray();
    return new Map(rows.map(row => [row._id, row.n]));
  },

  /** Whether a receiving space already uses this id for a shared collection. */
  async aliasTaken(space: string, slug: string): Promise<boolean> {
    return !!(await (await database()).collection(SHARES).findOne({ to: space, as: slug, state: 'accepted' }, { projection: { _id: 1 } }));
  },

  /**
   * Opens a collection to a project the sharer is on, or to one person. Only the owner of the
   * collection's space does this (the route checks). Sharing again changes what the share allows.
   */
  async share(space: LibrarySpace, ask: ShareAsk, by: string): Promise<{ shared: ShareView; invited: boolean } | Fail> {
    const db = await database();
    const doc = await db.collection<CollectionRecord>('library_collections').findOne({ space: space.id, slug: ask.collection, ...LIVE }, noId);
    if (!doc) return fail(`No collection ${ask.collection} in the ${space.name} space`, 404);
    let to: string;
    let name: string;
    let kind: ShareRecord['kind'];
    if (ask.project) {
      if (ask.project === space.id) return fail('That is the space the collection is already in');
      const project = await db.collection<ProjectDoc>('projects').findOne({ _id: new ObjectId(ask.project), ...LIVE }, { projection: { clientId: 1, displayName: 1, personal: 1, sharedWith: 1 } });
      const onIt = !!project && (project.clientId === by || (project.sharedWith ?? []).some(member => member.clientId === by));
      if (!project || !onIt || project.personal) return fail('Share with a project you are on. For someone outside your projects, share with their email address', 404);
      to = ask.project;
      name = project.displayName ?? 'Project';
      kind = 'project';
    } else {
      const user = await db.collection<UserDoc>('users').findOne({ email: ask.email }, { projection: { _id: 0, clientId: 1, name: 1, githubLogin: 1, email: 1 } });
      if (!user?.clientId) return fail(`Nobody on MediaMake signs in with ${ask.email}`, 404);
      if (user.clientId === by) return fail('That is you: it is your collection already');
      to = await ensurePersonalProject(db, user.clientId);
      name = nameOf(user);
      kind = 'person';
    }
    const at = new Date().toISOString();
    const shares = db.collection<ShareRecord>(SHARES);
    const before = await shares.findOne({ from: space.id, collection: ask.collection, to }, noId);
    await shares.updateOne(
      { from: space.id, collection: ask.collection, to },
      { $set: { role: ask.role, internal: ask.internal, kind }, $setOnInsert: { state: 'invited', by, at } },
      { upsert: true },
    );
    return { invited: !before, shared: { to, kind, name, role: ask.role, state: before?.state ?? 'invited', internal: ask.internal, at: before?.at ?? at, fetchedBytes: 0, fetches: 0, people: 0 } };
  },

  /** Takes a share back. The collection is gone from that Library at once; files already inside their productions stay. */
  async unshare(space: LibrarySpace, collection: string, to: string): Promise<{ ok: true } | Fail> {
    const db = await database();
    const gone = await db.collection(SHARES).deleteOne({ from: space.id, collection, to });
    if (!gone.deletedCount) return fail('It is not shared there', 404);
    await db.collection(NOTES).deleteMany({ space: to, from: space.id, collection });
    return { ok: true };
  },

  /** Who a collection is opened to, each with what was fetched through it since a day. */
  async list(space: LibrarySpace, collection: string, since: string): Promise<{ shares: ShareView[]; since: string }> {
    const db = await database();
    const shares = await db.collection<ShareRecord>(SHARES).find({ from: space.id, collection }, noId).sort({ at: 1 }).toArray();
    if (!shares.length) return { shares: [], since };
    const [names, lines] = await Promise.all([
      spaceNames(db, shares.map(share => share.to)),
      db.collection<UsageLine & { via?: string }>('library_usage').find({ space: space.id, collection, day: { $gte: since }, via: { $exists: true } }, { projection: { _id: 0, via: 1, clientId: 1, action: 1, bytes: 1 } }).limit(100_000).toArray(),
    ]);
    const fetched = fetchedThrough(lines);
    return {
      since,
      shares: shares.map(share => ({ to: share.to, kind: share.kind, name: names.get(share.to)?.name ?? 'A space that is gone', role: share.role, state: share.state, internal: share.internal === true, at: share.at, ...(fetched[share.to] ?? { fetchedBytes: 0, fetches: 0, people: 0 }) })),
    };
  },

  /** Says yes to an invitation: the collection shows in this space, under an id that is free there. */
  async accept(target: LibrarySpace, from: string, collection: string, by: string): Promise<{ as: string; name: string } | Fail> {
    const db = await database();
    const shares = db.collection<ShareRecord>(SHARES);
    const share = await shares.findOne({ from, collection, to: target.id }, noId);
    if (!share) return fail('That invitation is gone: its owner took it back', 404);
    const source = (await spaceNames(db, [from])).get(from);
    const doc = source ? await db.collection<CollectionRecord>('library_collections').findOne({ space: from, slug: collection, ...LIVE }, noId) : null;
    if (!source || !doc) return fail('That collection is gone', 404);
    if (share.state === 'accepted' && share.as) return { as: share.as, name: doc.name };
    const [own, others] = await Promise.all([
      db.collection<CollectionRecord>('library_collections').find({ space: target.id }, { projection: { _id: 0, slug: 1 } }).toArray(),
      shares.find({ to: target.id, state: 'accepted' }, { projection: { _id: 0, as: 1 } }).toArray(),
    ]);
    const as = aliasFor(collection, source.name, new Set([...own.map(item => item.slug), ...others.map(item => item.as ?? '')]));
    await shares.updateOne({ from, collection, to: target.id }, { $set: { state: 'accepted', as, acceptedBy: by, acceptedAt: new Date().toISOString() } });
    return { as, name: doc.name };
  },

  /** Declines an invitation, or leaves a shared collection. This space's notes on it go too. */
  async leave(target: LibrarySpace, from: string, collection: string): Promise<{ ok: true } | Fail> {
    const db = await database();
    const gone = await db.collection(SHARES).deleteOne({ from, collection, to: target.id });
    if (!gone.deletedCount) return fail('It is not shared with this space', 404);
    await db.collection(NOTES).deleteMany({ space: target.id, from, collection });
    return { ok: true };
  },

  /** A receiving space's own notes on a shared entry. */
  async notes(target: string, share: Pick<ShareRecord, 'from' | 'collection'>, entry: string): Promise<ShareNotes> {
    const doc = await (await database()).collection<ShareNotes & { space: string }>(NOTES).findOne({ space: target, from: share.from, collection: share.collection, entry }, noId);
    return cleanNotes(doc);
  },

  async setNotes(target: string, share: Pick<ShareRecord, 'from' | 'collection'>, entry: string, raw: unknown, by: string): Promise<ShareNotes> {
    const notes = cleanNotes(raw);
    const col = (await database()).collection(NOTES);
    const key = { space: target, from: share.from, collection: share.collection, entry };
    if (emptyNotes(notes)) await col.deleteOne(key);
    else await col.replaceOne(key, { ...key, ...notes, by, at: new Date().toISOString() }, { upsert: true });
    return notes;
  },
};
