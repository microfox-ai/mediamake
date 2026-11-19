/**
 * The Cloud Library in MongoDB (docs/library.md):
 *
 * - `library_collections`  a space's collections, each with its template, its owner's preferences
 *                          and the lists that learn;
 * - `library_entries`      one document an entry, saved over the `rev` it was read at;
 * - `library_files`        one document per content a space stores (sha256), `uploading` until the
 *                          bytes were seen in storage;
 * - `library_stats`        a song's numbers per platform and day, apart from the entry so a daily
 *                          sync never touches its history;
 * - `library_events`       one line per change, for what is rebuilt from the records later (search
 *                          by meaning);
 * - `library_usage`        one line per action, for who used what and what it costs;
 * - `library_prices`       the prices the cost estimate uses, corrected by an admin.
 *
 * Every function takes the space the caller was checked against (./access): nothing here checks
 * who is asking.
 */
import type { Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { storageProblem } from '@/lib/projects/storage-store';
import type { LibrarySpace } from './access';
import {
  DEFAULT_PRICES,
  LIBRARY_SCHEMA,
  SHA256,
  SLUG,
  applySave,
  cleanPrices,
  contentTypeOf,
  costOf,
  emptySum,
  fileTypeOf,
  knownSpelling,
  learnedOptions,
  matches,
  readPart,
  relearn,
  slugOf,
  storageCostOf,
  sumBy,
  type CollectionRecord,
  type EntryRecord,
  type Prices,
  type ReadAsk,
  type SaveAsk,
  type SearchAsk,
  type SlotFile,
  type UsageLine,
  type UsageSum,
} from './index';
import { MAX_FILE_BYTES, blobKey, createReadUrl, createUploadUrl, readText, storedSize } from './storage';
import { TEMPLATES } from './templates';

const COLLECTIONS = 'library_collections';
const ENTRIES = 'library_entries';
const FILES = 'library_files';
const STATS = 'library_stats';
const EVENTS = 'library_events';
const USAGE = 'library_usage';
const PRICES = 'library_prices';
const noId = { projection: { _id: 0 } } as const;
const LIVE = { deletedAt: { $exists: false } } as const;

export interface FileRecord {
  space: string;
  sha256: string;
  size: number;
  name: string;
  contentType: string;
  state: 'uploading' | 'stored';
  by: string;
  at: string;
}

export interface StatRecord {
  space: string;
  collection: string;
  entry: string;
  platform: string;
  /** `2026-11-19` */
  day: string;
  numbers: Record<string, number>;
  /** Where the numbers came from: a worker's name, or "typed". */
  source: string;
  syncedAt: string;
}

let indexed: Promise<unknown> | null = null;
async function database(): Promise<Db> {
  const db = await getDatabase();
  indexed ??= Promise.all([
    db.collection(COLLECTIONS).createIndex({ space: 1, slug: 1 }, { unique: true }),
    db.collection(ENTRIES).createIndex({ space: 1, collection: 1, slug: 1 }, { unique: true }),
    db.collection(ENTRIES).createIndex({ space: 1, collection: 1, updatedAt: -1 }),
    db.collection(FILES).createIndex({ space: 1, sha256: 1 }, { unique: true }),
    db.collection(STATS).createIndex({ space: 1, collection: 1, entry: 1, platform: 1, day: 1 }, { unique: true }),
    db.collection(EVENTS).createIndex({ space: 1, at: 1 }),
    db.collection(USAGE).createIndex({ day: 1, space: 1 }),
    db.collection(USAGE).createIndex({ clientId: 1, day: 1 }),
  ]).catch(() => null);
  await indexed;
  return db;
}

type Fail = { error: string; status: number };
const fail = (error: string, status = 400): Fail => ({ error, status });

async function event(db: Db, space: string, kind: string, by: string, what: { collection?: string; entry?: string }) {
  await db.collection(EVENTS).insertOne({ at: new Date().toISOString(), space, kind, by, ...what }).catch(() => null);
}

/** One usage line. Never throws: counting must not fail the action it counts. */
export async function logUsage(line: Omit<UsageLine, 'at' | 'day'>): Promise<void> {
  try {
    const at = new Date().toISOString();
    const clean = Object.fromEntries(Object.entries({ ...line, at, day: at.slice(0, 10) }).filter(([, value]) => value !== undefined && value !== ''));
    await (await database()).collection(USAGE).insertOne(clean);
  } catch (error) {
    console.error('[library] Could not count usage:', error instanceof Error ? error.message : error);
  }
}

/** A collection as an overview gives it: what it is, how to fill it, and what its lists have learned. */
function collectionView(doc: CollectionRecord, entries: number, full: boolean) {
  const { template } = doc;
  return {
    slug: doc.slug,
    name: doc.name,
    template: template.id,
    noun: template.noun,
    about: template.about,
    entries,
    updatedAt: doc.updatedAt,
    fields: template.fields.map(f => ({ key: f.key, label: f.label, kind: f.kind, group: f.group, ...(f.options && { options: f.options }), ...(f.learns && { learns: f.learns }), ...(f.neverGuess && { neverGuess: true }), ...(full && f.hint && { hint: f.hint }) })),
    slots: template.slots.map(s => ({ key: s.key, label: s.label, accepts: s.accepts, many: s.many, ...(full && s.hint && { hint: s.hint }) })),
    learned: Object.fromEntries(Object.entries(doc.learned ?? {}).map(([list, values]) => [list, learnedOptions(values)])),
    ...(full && { guide: template.guide, prefs: doc.prefs }),
  };
}

const entryView = (entry: EntryRecord, full: boolean) =>
  full ? entry : { ref: `${entry.collection}/${entry.slug}`, title: entry.title, card: entry.card, rev: entry.rev, updatedAt: entry.updatedAt, ...(entry.agent && { agent: true }) };

export const libraryDB = {
  /** A space's collections, with how many entries each has. `full` adds each one's guide and preferences. */
  async overview(space: LibrarySpace, full = false) {
    const db = await database();
    const [docs, counts] = await Promise.all([
      db.collection<CollectionRecord>(COLLECTIONS).find({ space: space.id, ...LIVE }, noId).sort({ name: 1 }).toArray(),
      db.collection(ENTRIES).aggregate<{ _id: string; n: number }>([{ $match: { space: space.id, ...LIVE } }, { $group: { _id: '$collection', n: { $sum: 1 } } }]).toArray(),
    ]);
    const byCollection = new Map(counts.map(row => [row._id, row.n]));
    return { space: { id: space.id, name: space.name, personal: space.personal, role: space.role }, collections: docs.map(doc => collectionView(doc, byCollection.get(doc.slug) ?? 0, full)) };
  },

  async collection(space: string, slug: string): Promise<CollectionRecord | null> {
    return (await database()).collection<CollectionRecord>(COLLECTIONS).findOne({ space, slug, ...LIVE }, noId);
  },

  /** A new collection from a template. Its name is the template's unless one is given; a second one of the same template needs its own name. */
  async createCollection(space: LibrarySpace, templateId: string, by: string, name?: string) {
    const template = TEMPLATES[templateId];
    if (!template) return fail(`No template "${templateId}". There ${Object.keys(TEMPLATES).length === 1 ? 'is' : 'are'}: ${Object.keys(TEMPLATES).join(', ')}`);
    const title = (name ?? template.name).trim().slice(0, 80);
    const slug = slugOf(title, template.id);
    if (!SLUG.test(slug)) return fail('That name has no letters or digits to make an id from');
    const db = await database();
    const at = new Date().toISOString();
    const doc: CollectionRecord = { schema: LIBRARY_SCHEMA, space: space.id, slug, name: title, template, prefs: '', learned: {}, createdAt: at, createdBy: by, updatedAt: at };
    try {
      await db.collection<CollectionRecord>(COLLECTIONS).insertOne({ ...doc });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      return fail(`The ${space.name} space already has a collection called ${title} (${slug})`, 409);
    }
    await event(db, space.id, 'collection', by, { collection: slug });
    return { collection: collectionView(doc, 0, true) };
  },

  /** The owner's preferences for whoever fills the collection: Markdown, whole. */
  async setPrefs(space: LibrarySpace, slug: string, prefs: string) {
    const db = await database();
    const saved = await db.collection<CollectionRecord>(COLLECTIONS).updateOne({ space: space.id, slug, ...LIVE }, { $set: { prefs: prefs.slice(0, 20_000), updatedAt: new Date().toISOString() } });
    return saved.matchedCount ? { ok: true as const } : fail(`No collection ${slug} in the ${space.name} space`, 404);
  },

  async entry(space: string, collection: string, slug: string): Promise<EntryRecord | null> {
    return (await database()).collection<EntryRecord>(ENTRIES).findOne({ space, collection, slug, ...LIVE }, noId);
  },

  /** One entry in full, with the latest numbers of each platform. */
  async get(space: LibrarySpace, collection: string, slug: string) {
    const db = await database();
    const [entry, stats] = await Promise.all([this.entry(space.id, collection, slug), db.collection<StatRecord>(STATS).find({ space: space.id, collection, entry: slug }, noId).sort({ day: -1 }).limit(400).toArray()]);
    if (!entry) return fail(`No ${collection}/${slug} in the ${space.name} space`, 404);
    const latest = new Map<string, StatRecord>();
    for (const stat of stats) if (!latest.has(stat.platform)) latest.set(stat.platform, stat);
    return { entry, statistics: [...latest.values()].map(({ platform, day, numbers, source, syncedAt }) => ({ platform, day, numbers, source, syncedAt })) };
  },

  /**
   * Saves an entry: a new one, or a change to one. The files it names must be stored already
   * (`startUploads`, `finishUploads`). Saved over the `rev` that was read, so of two saves at once
   * the second is judged against what the first left.
   */
  async save(space: LibrarySpace, collectionSlug: string, ask: { slug?: string; fields?: unknown; files?: { slot: string; sha256: string; name?: string; madeFrom?: SlotFile['madeFrom'] }[]; removeFiles?: SaveAsk['removeFiles']; rev?: number; agent?: boolean }, by: string) {
    const db = await database();
    const entries = db.collection<EntryRecord>(ENTRIES);
    const files: SaveAsk['files'] = [];
    for (const wanted of ask.files ?? []) {
      if (!SHA256.test(wanted.sha256 ?? '')) return fail('Each file is named by its sha256');
      const stored = await db.collection<FileRecord>(FILES).findOne({ space: space.id, sha256: wanted.sha256, state: 'stored' }, noId);
      if (!stored) return fail(`The file ${wanted.name ?? wanted.sha256.slice(0, 12)} isn't stored yet: upload it first`, 409);
      const name = (wanted.name ?? stored.name).slice(0, 200);
      const madeFrom = wanted.madeFrom && SHA256.test(wanted.madeFrom.sha256 ?? '') ? { sha256: wanted.madeFrom.sha256, ...(wanted.madeFrom.tool && { tool: String(wanted.madeFrom.tool).slice(0, 80) }), ...(wanted.madeFrom.params && { params: String(wanted.madeFrom.params).slice(0, 300) }) } : undefined;
      files.push({ slot: String(wanted.slot ?? 'other').toLowerCase(), file: { sha256: stored.sha256, name, size: stored.size, type: fileTypeOf(name, stored.contentType), contentType: stored.contentType, addedAt: new Date().toISOString(), by, ...(madeFrom && { madeFrom }) } });
    }
    for (let tries = 0; tries < 4; tries++) {
      const collection = await this.collection(space.id, collectionSlug);
      if (!collection) return fail(`No collection ${collectionSlug} in the ${space.name} space`, 404);
      const slug = ask.slug && SLUG.test(ask.slug) ? ask.slug : undefined;
      const current = slug ? await entries.findOne({ space: space.id, collection: collectionSlug, slug, ...LIVE }, noId) : null;
      const result = applySave(collection, current, { ...ask, slug, files }, by);
      if ('error' in result) return result;
      if (!result.created && !result.changes.length) return { entry: result.entry, created: false, changed: false, warnings: result.warnings };
      try {
        if (result.created) {
          const clash = await entries.findOne({ space: space.id, collection: collectionSlug, slug: result.entry.slug }, { projection: { title: 1, deletedAt: 1 } });
          if (clash) {
            return fail(
              clash.deletedAt
                ? `A ${collection.template.noun} with the id ${collectionSlug}/${result.entry.slug} is in the trash: restore it, or save this one under another id (slug)`
                : `The ${collection.name} collection already has "${clash.title}" (${collectionSlug}/${result.entry.slug}). To change it, save with that id; for another ${collection.template.noun} of the same name, give it its own id (slug)`,
              409,
            );
          }
          await entries.insertOne({ ...result.entry });
        } else {
          const saved = await entries.replaceOne({ space: space.id, collection: collectionSlug, slug: result.entry.slug, rev: current!.rev }, result.entry);
          if (!saved.matchedCount) continue; // someone saved in between: read again and judge the change against that
        }
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        continue;
      }
      const learned = relearn(collection.learned ?? {}, collection.template, current?.fields ?? null, result.entry.fields);
      await db.collection<CollectionRecord>(COLLECTIONS).updateOne({ space: space.id, slug: collectionSlug }, { $set: { learned, updatedAt: result.entry.updatedAt } });
      await event(db, space.id, result.created ? 'entry-new' : 'entry-changed', by, { collection: collectionSlug, entry: result.entry.slug });
      return { entry: result.entry, created: result.created, changed: true, warnings: result.warnings };
    }
    return fail('It keeps changing: read it again, then save', 409);
  },

  /** Moves an entry to the trash. Its files stay stored while anything else points at them. */
  async trash(space: LibrarySpace, collection: string, slug: string, by: string) {
    const db = await database();
    const entry = await this.entry(space.id, collection, slug);
    if (!entry) return fail(`No ${collection}/${slug} in the ${space.name} space`, 404);
    const at = new Date().toISOString();
    await db.collection<EntryRecord>(ENTRIES).updateOne({ space: space.id, collection, slug }, { $set: { deletedAt: at, updatedAt: at, updatedBy: by } });
    const doc = await this.collection(space.id, collection);
    if (doc) await db.collection<CollectionRecord>(COLLECTIONS).updateOne({ space: space.id, slug: collection }, { $set: { learned: relearn(doc.learned ?? {}, doc.template, entry.fields, null) } });
    await event(db, space.id, 'entry-trashed', by, { collection, entry: slug });
    return { ok: true as const, title: entry.title };
  },

  /** Entries that answer a search, newest first, as cards. Exact filters and plain words: search by meaning comes with the index. */
  async search(spaces: LibrarySpace[], ask: SearchAsk) {
    const db = await database();
    const names = new Map(spaces.map(space => [space.id, space.name]));
    const docs = await db
      .collection<EntryRecord>(ENTRIES)
      .find({ space: { $in: [...names.keys()] }, ...(ask.collection && { collection: ask.collection }), ...LIVE }, { projection: { _id: 0, history: 0 } })
      .sort({ updatedAt: -1 })
      .limit(5000)
      .toArray();
    const hits = docs.filter(entry => matches(entry, ask));
    const limit = ask.limit ?? 10;
    return { total: hits.length, results: hits.slice(0, limit).map(entry => ({ ...entryView(entry as EntryRecord, false), space: names.get(entry.space), spaceId: entry.space })) };
  },

  /**
   * What must be uploaded of `files`, with a signed PUT link for each: a content the space already
   * stores is not sent again. Refused when the new bytes don't fit in the owner's storage.
   */
  async startUploads(space: LibrarySpace, files: { sha256?: unknown; size?: unknown; name?: unknown; contentType?: unknown }[], by: string) {
    const db = await database();
    const col = db.collection<FileRecord>(FILES);
    const asked = new Map<string, { sha256: string; size: number; name: string; contentType: string }>();
    for (const file of files.slice(0, 200)) {
      const sha256 = String(file.sha256 ?? '').toLowerCase();
      const size = Number(file.size);
      const name = String(file.name ?? '').split(/[\\/]/).pop()!.slice(0, 200);
      if (!SHA256.test(sha256) || !Number.isInteger(size) || size <= 0 || !name) return fail('Each file needs its sha256, its size in bytes and its name');
      if (size > MAX_FILE_BYTES) return fail(`${name} is larger than ${MAX_FILE_BYTES / 1e9} GB, the most one file can be: keep it on the device`, 413);
      asked.set(sha256, { sha256, size, name, contentType: typeof file.contentType === 'string' && /^[\w.+-]+\/[\w.+-]+$/.test(file.contentType) ? file.contentType : contentTypeOf(name) });
    }
    if (!asked.size) return fail('files is a list of { sha256, size, name }');
    const have = await col.find({ space: space.id, sha256: { $in: [...asked.keys()] }, state: 'stored' }, noId).toArray();
    const stored = new Set(have.map(file => file.sha256));
    const pending = [...asked.values()].filter(file => !stored.has(file.sha256));
    const problem = await storageProblem(db, space.id, pending.reduce((sum, file) => sum + file.size, 0));
    if (problem) return fail(problem, 413);
    const at = new Date().toISOString();
    const uploads = [];
    for (const file of pending) {
      await col.updateOne({ space: space.id, sha256: file.sha256 }, { $set: { ...file, space: space.id, state: 'uploading', by, at } }, { upsert: true });
      uploads.push({ sha256: file.sha256, name: file.name, size: file.size, uploadUrl: await createUploadUrl(blobKey(space.id, file.sha256), file.contentType), headers: { 'Content-Type': file.contentType, 'x-amz-acl': 'private' } });
    }
    return { uploads, alreadyStored: [...stored], linksExpireIn: 3600 };
  },

  /** Marks the files stored once their bytes are in storage at the size that was said. */
  async finishUploads(space: LibrarySpace, shas: unknown[], usage: { clientId: string; device?: string }) {
    const db = await database();
    const col = db.collection<FileRecord>(FILES);
    const stored: string[] = [];
    const missing: string[] = [];
    for (const raw of shas.slice(0, 200)) {
      const sha256 = String(raw ?? '').toLowerCase();
      const file = SHA256.test(sha256) ? await col.findOne({ space: space.id, sha256 }, noId) : null;
      if (!file) {
        missing.push(sha256.slice(0, 12));
        continue;
      }
      if (file.state === 'stored') {
        stored.push(sha256);
        continue;
      }
      const size = await storedSize(blobKey(space.id, sha256));
      if (size !== file.size) {
        missing.push(`${file.name}${size === null ? '' : ` (${size} of ${file.size} bytes arrived)`}`);
        continue;
      }
      await col.updateOne({ space: space.id, sha256 }, { $set: { state: 'stored', at: new Date().toISOString() } });
      await logUsage({ ...usage, space: space.id, action: 'upload', bytes: file.size });
      stored.push(sha256);
    }
    return missing.length ? { ...fail(`Not everything arrived: ${missing.join(', ')}. Send those again`, 409), stored } : { stored };
  },

  /** Signed links to an entry's files (all, or the slots asked for), counted as a download for whoever asked. */
  async links(space: LibrarySpace, collection: string, slug: string, slots: string[], usage: { clientId: string; device?: string }) {
    const entry = await this.entry(space.id, collection, slug);
    if (!entry) return fail(`No ${collection}/${slug} in the ${space.name} space`, 404);
    const wanted = Object.entries(entry.slots).filter(([slot]) => !slots.length || slots.includes(slot));
    if (slots.length && !wanted.length) return fail(`${entry.title} has no file in ${slots.join(', ')}. It has: ${Object.keys(entry.slots).join(', ') || 'no files'}`, 404);
    const files = await Promise.all(wanted.flatMap(([slot, list]) => list.map(async file => ({ slot, name: file.name, size: file.size, sha256: file.sha256, type: file.type, contentType: file.contentType, url: await createReadUrl(blobKey(space.id, file.sha256), file.name) }))));
    await logUsage({ ...usage, space: space.id, collection, action: 'fetch', bytes: files.reduce((sum, file) => sum + file.size, 0) });
    return { ref: `${collection}/${slug}`, title: entry.title, files, linksExpireIn: 3600 };
  },

  /** A field's text, or a text or JSON file's content, whole or in part. Audio, video and pictures are fetched, not read. */
  async read(space: LibrarySpace, collection: string, slug: string, what: string, ask: ReadAsk, usage: { clientId: string; device?: string }) {
    const entry = await this.entry(space.id, collection, slug);
    if (!entry) return fail(`No ${collection}/${slug} in the ${space.name} space`, 404);
    const field = entry.fields[what] ?? entry.extra[what];
    if (field !== undefined) {
      const content = typeof field === 'string' ? field : JSON.stringify(field, null, 2);
      await logUsage({ ...usage, space: space.id, collection, action: 'read', bytes: content.length });
      return { ref: `${collection}/${slug}`, what, from: 'field', ...readPart(content, typeof field === 'string' ? 'text' : 'json', { lines: ask.lines }) };
    }
    const file = (entry.slots[what] ?? [])[0];
    if (!file) return fail(`${entry.title} has no "${what}". Fields: ${Object.keys(entry.fields).join(', ') || 'none'}. Files: ${Object.keys(entry.slots).join(', ') || 'none'}`, 404);
    if (file.type !== 'text' && file.type !== 'json') return fail(`${file.name} is ${file.type}: fetch it, it cannot be read as text`, 415);
    const content = await readText(blobKey(space.id, file.sha256), file.size);
    if (content === null) return fail(`${file.name} is too large to read here, or isn't in storage: fetch it instead`, 413);
    await logUsage({ ...usage, space: space.id, collection, action: 'read', bytes: file.size });
    return { ref: `${collection}/${slug}`, what, from: 'file', file: { name: file.name, size: file.size, sha256: file.sha256, ...(file.madeFrom && { madeFrom: file.madeFrom }) }, ...readPart(content, file.type, ask) };
  },

  /** A platform's numbers for one day, kept apart from the entry. The same platform and day is replaced. */
  async putStats(space: LibrarySpace, collection: string, slug: string, rows: { platform?: unknown; day?: unknown; numbers?: unknown; source?: unknown }[]) {
    const db = await database();
    const doc = await this.collection(space.id, collection);
    if (!doc || !(await this.entry(space.id, collection, slug))) return fail(`No ${collection}/${slug} in the ${space.name} space`, 404);
    const syncedAt = new Date().toISOString();
    let saved = 0;
    for (const row of rows.slice(0, 500)) {
      const platform = knownSpelling(doc.learned?.platform, String(row.platform ?? '').slice(0, 60));
      const day = String(row.day ?? syncedAt.slice(0, 10));
      const numbers = Object.fromEntries(Object.entries((row.numbers ?? {}) as Record<string, unknown>).map(([key, value]) => [key.slice(0, 40), Number(value)] as const).filter(([key, value]) => key && Number.isFinite(value)).slice(0, 40));
      if (!platform || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Object.keys(numbers).length) continue;
      await db.collection<StatRecord>(STATS).updateOne({ space: space.id, collection, entry: slug, platform, day }, { $set: { numbers, source: String(row.source ?? 'typed').slice(0, 80), syncedAt } }, { upsert: true });
      saved++;
    }
    return saved ? { saved } : fail('Each row needs a platform and numbers, e.g. { "platform": "Spotify", "day": "2026-11-19", "numbers": { "streams": 1200 } }');
  },

  /** What one person used, by day range. */
  async usageOf(clientId: string, since: string): Promise<{ since: string; total: UsageSum; bySpace: Record<string, UsageSum>; cost: number }> {
    const db = await database();
    const [lines, prices] = await Promise.all([db.collection<UsageLine>(USAGE).find({ clientId, day: { $gte: since } }, noId).limit(100_000).toArray(), this.prices()]);
    const total = sumBy(lines, 'clientId')[clientId] ?? emptySum();
    return { since, total, bySpace: sumBy(lines, 'space'), cost: costOf(total, prices) };
  },

  /** Everyone's usage since a day, for admins: by person, device, space and collection, each with its estimated cost, and what is stored. */
  async usageAll(since: string) {
    const db = await database();
    const [lines, prices, stored] = await Promise.all([
      db.collection<UsageLine>(USAGE).find({ day: { $gte: since } }, noId).limit(500_000).toArray(),
      this.prices(),
      db.collection(FILES).aggregate<{ _id: string; bytes: number; files: number }>([{ $match: { state: 'stored' } }, { $group: { _id: '$space', bytes: { $sum: '$size' }, files: { $sum: 1 } } }]).toArray(),
    ]);
    const table = (key: Parameters<typeof sumBy>[1]) =>
      Object.entries(sumBy(lines, key))
        .map(([name, sum]) => ({ name, ...sum, cost: costOf(sum, prices) }))
        .sort((a, b) => b.cost - a.cost || b.fetchedBytes - a.fetchedBytes);
    return {
      since,
      prices,
      note: 'Costs are estimates from the prices above, which an admin sets: they are not read from a bill.',
      stored: stored.map(row => ({ space: row._id, bytes: row.bytes, files: row.files, costPerMonth: storageCostOf(row.bytes, prices) })).sort((a, b) => b.bytes - a.bytes),
      byPerson: table('clientId'),
      byDevice: table('device'),
      bySpace: table('space'),
      byCollection: table('collection'),
    };
  },

  async prices(): Promise<Prices> {
    const doc = await (await database()).collection(PRICES).findOne({ id: 'prices' }, noId);
    return cleanPrices(doc, DEFAULT_PRICES);
  },

  async setPrices(raw: unknown, by: string): Promise<Prices> {
    const prices = cleanPrices(raw, await this.prices());
    await (await database()).collection(PRICES).updateOne({ id: 'prices' }, { $set: { ...prices, id: 'prices', by, at: new Date().toISOString() } }, { upsert: true });
    return prices;
  },
};
