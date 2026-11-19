/**
 * Listed collections and requests for access in MongoDB (./listing):
 *
 * - a listing is kept on its collection (`library_collections.listing`);
 * - `library_requests`  one document per collection and space that asks.
 *
 * An accepted request becomes a share (./share-store) that the asker still accepts in their own
 * Library, where they read that it is the owner's live collection.
 */
import { ObjectId, type Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { canWrite } from '@/lib/editor/project-access';
import { ensurePersonalProject } from '@/lib/projects/personal';
import { librarySpaces, type LibrarySpace } from './access';
import type { CollectionRecord, EntryRecord } from './index';
import { ROLE_ON_ACCEPT, SAMPLE, stateOf, type ListedCard, type RequestAsk, type RequestRecord, type RequestView } from './listing';
import { spaceNames } from './share-store';
import type { ShareRecord } from './shares';
import { blobKey, createReadUrl, storageReady } from './storage';
import { upgradeTemplate } from './templates';

const COLLECTIONS = 'library_collections';
const ENTRIES = 'library_entries';
const SHARES = 'library_shares';
const REQUESTS = 'library_requests';
const noId = { projection: { _id: 0 } } as const;
const LIVE = { deletedAt: { $exists: false } } as const;
/** What a listing never shows: an entry its owner keeps internal. */
const SHOWN = { 'fields.use': { $not: /^internal only$/i } } as const;

type Fail = { error: string; status: number };
const fail = (error: string, status = 400): Fail => ({ error, status });

let indexed: Promise<unknown> | null = null;
async function database(): Promise<Db> {
  const db = await getDatabase();
  indexed ??= Promise.all([db.collection(REQUESTS).createIndex({ from: 1, collection: 1, to: 1 }, { unique: true }), db.collection(REQUESTS).createIndex({ by: 1 }), db.collection(COLLECTIONS).createIndex({ 'listing.at': 1 }, { sparse: true })]).catch(() => null);
  await indexed;
  return db;
}

export const listingDB = {
  /** Lists a collection in Explore, changes its listing, or (null) takes it off. The route checks it is the space's owner. */
  async set(space: LibrarySpace, collection: string, listing: { about: string; rights: string } | null, by: string): Promise<{ listed: boolean } | Fail> {
    const db = await database();
    const done = await db.collection<CollectionRecord>(COLLECTIONS).updateOne({ space: space.id, slug: collection, ...LIVE }, listing ? { $set: { listing: { ...listing, at: new Date().toISOString(), by } } } : { $unset: { listing: '' } });
    if (!done.matchedCount) return fail(`No collection ${collection} in the ${space.name} space`, 404);
    // requests that were waiting are answered by the listing going away
    if (!listing) await db.collection(REQUESTS).deleteMany({ from: space.id, collection, state: 'asked' });
    return { listed: !!listing };
  },

  /** Every listed collection, newest listing first, with what the viewer has to do with each. */
  async listed(clientId: string): Promise<{ collections: ListedCard[] }> {
    const db = await database();
    const docs = await db.collection<CollectionRecord>(COLLECTIONS).find({ listing: { $exists: true }, ...LIVE }, noId).sort({ 'listing.at': -1 }).limit(100).toArray();
    if (!docs.length) return { collections: [] };
    const mine = await librarySpaces(db, clientId);
    const mineIds = mine.map(space => space.id);
    const [names, shares, requests] = await Promise.all([
      spaceNames(db, docs.map(doc => doc.space)),
      db.collection<ShareRecord>(SHARES).find({ to: { $in: mineIds }, from: { $in: docs.map(doc => doc.space) } }, noId).toArray(),
      db.collection<RequestRecord>(REQUESTS).find({ by: clientId }, noId).toArray(),
    ]);
    const cards = await Promise.all(
      docs.map(async (doc): Promise<ListedCard | null> => {
        const source = names.get(doc.space);
        if (!source || !doc.listing) return null;
        const query = { space: doc.space, collection: doc.slug, ...LIVE, ...SHOWN };
        const [entries, sample] = await Promise.all([db.collection(ENTRIES).countDocuments(query), db.collection<EntryRecord>(ENTRIES).find(query, { projection: { _id: 0, title: 1 } }).sort({ updatedAt: -1 }).limit(SAMPLE).toArray()]);
        const share = shares.filter(one => one.from === doc.space && one.collection === doc.slug);
        const headshot = doc.headshot?.url ?? (doc.headshot?.sha256 && storageReady() ? await createReadUrl(blobKey(doc.space, doc.headshot.sha256), doc.headshot.name ?? 'headshot').catch(() => undefined) : undefined);
        return {
          from: doc.space,
          collection: doc.slug,
          name: doc.name,
          by: source.name,
          noun: doc.template.noun,
          template: doc.template.name,
          entries,
          about: doc.listing.about || doc.template.about,
          rights: doc.listing.rights,
          ...(headshot && { headshot }),
          sample: sample.map(entry => entry.title),
          fields: upgradeTemplate(doc.template).fields.map(field => field.label),
          slots: upgradeTemplate(doc.template).slots.map(slot => slot.label),
          state: stateOf({ mine: mineIds.includes(doc.space), share: share.some(one => one.state === 'accepted') ? 'accepted' : share.length ? 'invited' : undefined, request: requests.find(one => one.from === doc.space && one.collection === doc.slug)?.state }),
        };
      }),
    );
    return { collections: cards.filter((card): card is ListedCard => !!card) };
  },

  /** Asks the owner of a listed collection for access, for the asker's personal space or a project they own or edit. */
  async request(clientId: string, ask: RequestAsk): Promise<{ asked: true; of: string } | Fail> {
    const db = await database();
    const doc = await db.collection<CollectionRecord>(COLLECTIONS).findOne({ space: ask.from, slug: ask.collection, listing: { $exists: true }, ...LIVE }, noId);
    const source = doc ? (await spaceNames(db, [ask.from])).get(ask.from) : undefined;
    if (!doc || !source) return fail('That collection is not listed any more', 404);
    const mine = await librarySpaces(db, clientId);
    if (mine.some(space => space.id === ask.from)) return fail('You are on the space it belongs to: it is in your Library already');
    const to = ask.to ?? (await ensurePersonalProject(db, clientId));
    const target = mine.find(space => space.id === to);
    if (ask.to && (!target || !canWrite(target.role))) return fail('Ask for a space you own or edit, or leave it out to ask for your personal Library', 403);
    if (await db.collection(SHARES).findOne({ from: ask.from, collection: ask.collection, to }, { projection: { _id: 1 } })) return fail('It is already opened to that space: look in its Library', 409);
    const before = await db.collection<RequestRecord>(REQUESTS).findOne({ from: ask.from, collection: ask.collection, to }, noId);
    if (before?.state === 'declined') return fail(`${source.name} declined this request`, 409);
    await db.collection<RequestRecord>(REQUESTS).updateOne({ from: ask.from, collection: ask.collection, to }, { $set: { note: ask.note, by: clientId }, $setOnInsert: { state: 'asked', at: new Date().toISOString() } }, { upsert: true });
    return { asked: true, of: source.name };
  },

  /** Takes back a request that was not answered yet. */
  async withdraw(clientId: string, from: string, collection: string): Promise<{ ok: true }> {
    await (await database()).collection(REQUESTS).deleteMany({ from, collection, by: clientId, state: 'asked' });
    return { ok: true };
  },

  /** The requests waiting on a collection, for its owner. */
  async requests(space: LibrarySpace, collection: string): Promise<{ requests: RequestView[] }> {
    const db = await database();
    const rows = await db.collection<RequestRecord>(REQUESTS).find({ from: space.id, collection, state: 'asked' }, noId).sort({ at: 1 }).limit(100).toArray();
    if (!rows.length) return { requests: [] };
    const [spaces, users] = await Promise.all([
      spaceNames(db, rows.map(row => row.to)),
      db.collection<{ clientId: string; name?: string; githubLogin?: string; email?: string }>('users').find({ clientId: { $in: rows.map(row => row.by) } }, { projection: { _id: 0, clientId: 1, name: 1, githubLogin: 1, email: 1 } }).toArray(),
    ]);
    const who = new Map(users.map(user => [user.clientId, user.name || user.githubLogin || user.email?.split('@')[0] || 'A member']));
    return { requests: rows.map(row => ({ to: row.to, name: who.get(row.by) ?? 'A member', space: spaces.get(row.to)?.personal ? 'their personal Library' : (spaces.get(row.to)?.name ?? 'a project'), note: row.note, at: row.at })) };
  },

  /** How many requests wait on each of a space's collections. */
  async waiting(space: string): Promise<Map<string, number>> {
    const rows = await (await database()).collection(REQUESTS).aggregate<{ _id: string; n: number }>([{ $match: { from: space, state: 'asked' } }, { $group: { _id: '$collection', n: { $sum: 1 } } }]).toArray();
    return new Map(rows.map(row => [row._id, row.n]));
  },

  /**
   * The owner's answer. Yes opens the collection to the space that asked, to read and fetch, as an
   * invitation the asker accepts in their Library. No is kept, so the same request is not sent again.
   */
  async decide(space: LibrarySpace, collection: string, to: string, yes: boolean, by: string): Promise<{ accepted: boolean } | Fail> {
    const db = await database();
    const requests = db.collection<RequestRecord>(REQUESTS);
    const request = await requests.findOne({ from: space.id, collection, to, state: 'asked' }, noId);
    if (!request) return fail('That request is gone: it was taken back or answered', 404);
    const at = new Date().toISOString();
    if (!yes) {
      await requests.updateOne({ from: space.id, collection, to }, { $set: { state: 'declined', decidedAt: at } });
      return { accepted: false };
    }
    const target = await db.collection<{ personal?: boolean }>('projects').findOne({ _id: new ObjectId(to), ...LIVE }, { projection: { personal: 1 } });
    if (!target) return fail('The space that asked is gone', 404);
    await db.collection<ShareRecord>(SHARES).updateOne({ from: space.id, collection, to }, { $setOnInsert: { role: ROLE_ON_ACCEPT, internal: false, kind: target.personal ? 'person' : 'project', state: 'invited', by, at } }, { upsert: true });
    await requests.deleteOne({ from: space.id, collection, to });
    return { accepted: true };
  },
};
