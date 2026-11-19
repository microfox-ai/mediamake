/**
 * Device libraries in MongoDB (docs/library.md › Device libraries):
 *
 * - `library_devices`       one document per computer that reports: how much it holds, and when it said so;
 * - `library_device_files`  one card per file on it (./devices). Never the bytes, never a path.
 *
 * A computer's cards are its owner's. Someone else on a project sees them only while the owner has
 * opened that computer to the project (`mm access open`, the register's `places`).
 */
import { ObjectId, type Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import type { PlaceRecord } from '@/lib/space/register';
import type { LibrarySpace } from './access';
import { MAX_DEVICE_CARDS, cloudCopies, searchTextOf, searchWords, type CloudCopy, type DeviceAsk, type DeviceCard, type DeviceFile, type DeviceReport, type DeviceView } from './devices';

const DEVICES = 'library_devices';
const CARDS = 'library_device_files';
const noId = { projection: { _id: 0 } } as const;

interface DeviceRecord {
  clientId: string;
  label: string;
  files: number;
  bytes: number;
  kinds: Record<string, number>;
  reportedAt: string;
}
type CardRecord = DeviceCard & { clientId: string; device: string; text: string; run: string };

let indexed: Promise<unknown> | null = null;
async function database(): Promise<Db> {
  const db = await getDatabase();
  indexed ??= Promise.all([
    db.collection(DEVICES).createIndex({ clientId: 1, label: 1 }, { unique: true }),
    db.collection(CARDS).createIndex({ clientId: 1, device: 1, sha256: 1 }, { unique: true }),
    db.collection(CARDS).createIndex({ clientId: 1, device: 1, kind: 1 }),
  ]).catch(() => null);
  await indexed;
  return db;
}

/** The SHA-256 of every file a space's entries hold, with where each is. */
async function copiesIn(db: Db, space: string): Promise<Map<string, CloudCopy>> {
  const entries = await db
    .collection<{ collection: string; slug: string; title: string; slots?: Record<string, { sha256: string }[]> }>('library_entries')
    .find({ space, deletedAt: { $exists: false } }, { projection: { _id: 0, collection: 1, slug: 1, title: 1, slots: 1 } })
    .limit(5000)
    .toArray();
  return cloudCopies(entries);
}

/** The computers whose cards the caller may see in this space: their own, and the ones their owner opened to the project. */
async function visible(db: Db, space: LibrarySpace, clientId: string): Promise<{ records: DeviceRecord[]; places: PlaceRecord[] }> {
  const places = db.collection<PlaceRecord>('places');
  let opened: PlaceRecord[] = [];
  if (!space.personal) {
    type Project = { clientId?: string; sharedWith?: { clientId?: string }[] };
    const project = await db.collection<Project>('projects').findOne({ _id: new ObjectId(space.id) }, { projection: { clientId: 1, sharedWith: 1 } });
    // someone who left the project takes their computers with them
    const onIt = new Set([project?.clientId, ...(project?.sharedWith ?? []).map(member => member.clientId)].filter(Boolean));
    opened = ((await places.find({ kind: 'device', projects: space.id, clientId: { $ne: clientId } }, noId).toArray()) as PlaceRecord[]).filter(place => onIt.has(place.clientId));
  }
  const mine = (await places.find({ kind: 'device', clientId }, noId).toArray()) as PlaceRecord[];
  const records = (await db
    .collection<DeviceRecord>(DEVICES)
    .find({ $or: [{ clientId }, ...opened.map(place => ({ clientId: place.clientId, label: place.label }))] }, noId)
    .sort({ reportedAt: -1 })
    .toArray()) as DeviceRecord[];
  return { records, places: [...mine, ...opened] };
}

export const deviceDB = {
  /** One part of a computer's report. The last part (`done`) drops the cards that were not in it. */
  async report(clientId: string, report: DeviceReport): Promise<{ saved: number; files?: number; bytes?: number } | { error: string; status: number }> {
    const db = await database();
    const cards = db.collection<CardRecord>(CARDS);
    const own = { clientId, device: report.device };
    if ((await cards.countDocuments({ ...own, run: report.run })) + report.cards.length > MAX_DEVICE_CARDS) return { error: `A computer reports at most ${MAX_DEVICE_CARDS} files`, status: 413 };
    if (report.cards.length)
      await cards.bulkWrite(
        report.cards.map(card => ({ replaceOne: { filter: { ...own, sha256: card.sha256 }, replacement: { ...card, ...own, text: searchTextOf(card), run: report.run }, upsert: true } })),
        { ordered: false },
      );
    if (!report.done) return { saved: report.cards.length };
    await cards.deleteMany({ ...own, run: { $ne: report.run } });
    const sums = await cards.aggregate<{ _id: string; files: number; bytes: number }>([{ $match: own }, { $group: { _id: '$kind', files: { $sum: 1 }, bytes: { $sum: '$bytes' } } }]).toArray();
    const record: DeviceRecord = {
      clientId,
      label: report.device,
      files: sums.reduce((n, row) => n + row.files, 0),
      bytes: sums.reduce((n, row) => n + row.bytes, 0),
      kinds: Object.fromEntries(sums.map(row => [row._id, row.files])),
      reportedAt: new Date().toISOString(),
    };
    await db.collection<DeviceRecord>(DEVICES).replaceOne({ clientId, label: report.device }, record, { upsert: true });
    return { saved: report.cards.length, files: record.files, bytes: record.bytes };
  },

  /** Takes a computer's cards out of MediaMake. Its files are untouched. */
  async forget(clientId: string, label: string): Promise<{ forgotten: number }> {
    const db = await database();
    const gone = await db.collection(CARDS).deleteMany({ clientId, device: label });
    await db.collection(DEVICES).deleteOne({ clientId, label });
    return { forgotten: gone.deletedCount };
  },

  /** The computers the caller may look into from this space, the latest report first. */
  async list(space: LibrarySpace, clientId: string): Promise<DeviceView[]> {
    const db = await database();
    const { records, places } = await visible(db, space, clientId);
    if (!records.length) return [];
    const others = [...new Set(records.map(record => record.clientId).filter(id => id !== clientId))];
    const [copies, users] = await Promise.all([
      copiesIn(db, space.id),
      others.length ? db.collection<{ clientId: string; name?: string; githubLogin?: string; email?: string }>('users').find({ clientId: { $in: others } }, { projection: { _id: 0, clientId: 1, name: 1, githubLogin: 1, email: 1 } }).toArray() : [],
    ]);
    const names = new Map(users.map(user => [user.clientId, user.name || user.githubLogin || user.email?.split('@')[0] || 'A member']));
    const shas = [...copies.keys()];
    return Promise.all(
      records.map(async (record): Promise<DeviceView> => {
        const place = places.find(p => p.clientId === record.clientId && p.label === record.label);
        const mine = record.clientId === clientId;
        return {
          id: `${record.clientId}/${record.label}`,
          label: record.label,
          name: place?.name ?? record.label,
          mine,
          ...(!mine && { owner: names.get(record.clientId) ?? 'A member' }),
          files: record.files,
          bytes: record.bytes,
          linked: shas.length ? await db.collection(CARDS).countDocuments({ clientId: record.clientId, device: record.label, sha256: { $in: shas } }) : 0,
          kinds: record.kinds,
          reportedAt: record.reportedAt,
        };
      }),
    );
  },

  /** One computer's files that fit, each with where it is: on the computer only, or also in this space's Cloud Library. */
  async files(space: LibrarySpace, clientId: string, device: { owner: string; label: string }, ask: DeviceAsk): Promise<{ total: number; results: DeviceFile[] } | { error: string; status: number }> {
    const db = await database();
    const { records } = await visible(db, space, clientId);
    if (!records.some(record => record.clientId === device.owner && record.label === device.label)) return { error: 'No such computer here: its owner opens it to a project with mm access open', status: 404 };
    const copies = await copiesIn(db, space.id);
    const filter: Record<string, unknown> = { clientId: device.owner, device: device.label };
    if (ask.kind) filter.kind = ask.kind;
    const words = searchWords(ask.q);
    // the words are letters and digits only (searchWords), so each is safe as a pattern
    if (words.length) filter.$and = words.map(word => ({ text: { $regex: word } }));
    if (ask.where) filter.sha256 = ask.where === 'both' ? { $in: [...copies.keys()] } : { $nin: [...copies.keys()] };
    const cards = db.collection<CardRecord>(CARDS);
    const [total, rows] = await Promise.all([cards.countDocuments(filter), cards.find(filter, { projection: { _id: 0, clientId: 0, device: 0, text: 0, run: 0 } }).sort({ title: 1, name: 1 }).skip(ask.skip).limit(ask.limit).toArray()]);
    return {
      total,
      results: (rows as unknown as DeviceCard[]).map(card => {
        const cloud = copies.get(card.sha256);
        return { ...card, where: cloud ? 'both' : 'device', ...(cloud && { cloud }) };
      }),
    };
  },
};
