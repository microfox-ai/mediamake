/**
 * The access register in MongoDB (`places`): one document per place, as ./register describes it.
 * A computer is its owner's; a cloud environment belongs to the projects whose space repos it holds.
 */
import { getDatabase } from '@/lib/mongodb';
import type { SetupItem } from './cloud-setup';
import { accessView, applyPlaceAction, applyPlaceReport, type AccessView, type PlaceAction, type PlaceRecord, type PlaceReport, placeId } from './register';
import { projectOf, projectSpaceId, type SpaceItemRecord, type SpaceRecord } from './space';
import { projectsOf } from './store';

const COL = 'places';
const noId = { projection: { _id: 0 } } as const;
/** Repo names differ only by case on GitHub. */
const SAME_NAME = { locale: 'en', strength: 2 } as const;

let indexed: Promise<unknown> | null = null;
async function places() {
  const db = await getDatabase();
  indexed ??= Promise.all([db.collection(COL).createIndex({ id: 1 }, { unique: true }), db.collection(COL).createIndex({ projects: 1 }), db.collection(COL).createIndex({ clientId: 1 })]).catch(() => null);
  await indexed;
  return { db, col: db.collection<PlaceRecord>(COL) };
}

export const registerDB = {
  /** Saves what one computer or cloud session reported about itself. */
  async report(clientId: string, report: PlaceReport): Promise<PlaceRecord> {
    const { db, col } = await places();
    const id = placeId(report.kind, clientId, report.label);
    const before = await col.findOne({ id }, noId);
    // a cloud environment's projects: the ones whose space is one of its repos, and that the reporter is on
    let projects: string[] = [];
    if (report.kind === 'cloud' && report.repos?.length) {
      const mine = new Set((await projectsOf(db, clientId)).map(project => projectSpaceId(project.id)));
      const spaces = await db.collection<SpaceRecord>('spaces').find({ repo: { $in: report.repos } }, { projection: { _id: 0, id: 1 }, collation: SAME_NAME }).toArray();
      projects = spaces.filter(space => mine.has(space.id)).map(space => projectOf(space.id)!);
    }
    const next = applyPlaceReport(before as PlaceRecord | null, clientId, report, projects);
    await col.replaceOne({ id }, next, { upsert: true });
    return next;
  },

  /** An account's own places, newest report first. */
  async mine(clientId: string): Promise<PlaceRecord[]> {
    const { col } = await places();
    return (await col.find({ clientId }, noId).sort({ reportedAt: -1 }).toArray()) as PlaceRecord[];
  },

  /** What a place's owner asked. Null when the account has no such place. */
  async act(clientId: string, ask: PlaceAction): Promise<PlaceRecord | { error: string } | { forgotten: true } | null> {
    const { col } = await places();
    const place = (await col.findOne({ id: ask.place, clientId }, noId)) as PlaceRecord | null;
    if (!place) return null;
    if (ask.action === 'forget') {
      await col.deleteOne({ id: place.id });
      return { forgotten: true };
    }
    const next = applyPlaceAction(place, clientId, ask);
    if ('error' in next) return next;
    await col.replaceOne({ id: place.id }, next);
    return next;
  },

  /** The places a project's page may show one of its people: the project's, and the viewer's own computers. Never a place of someone who left. */
  async placesFor(projects: string[], clientId: string, onIt: Set<string>): Promise<PlaceRecord[]> {
    const { col } = await places();
    const list = (await col.find({ $or: [{ projects: { $in: projects } }, { clientId, kind: 'device' }] }, noId).toArray()) as PlaceRecord[];
    return list.filter(place => place.clientId === clientId || onIt.has(place.clientId));
  },

  /** A project's register for one of its people. The caller checked they are on the project. */
  async forProject(project: string, clientId: string): Promise<AccessView> {
    const { db, col } = await places();
    const [list, items, doc] = await Promise.all([
      col.find({ $or: [{ projects: project }, { clientId, kind: 'device' }] }, noId).toArray(),
      db.collection<SpaceItemRecord>('space_items').find({ space: projectSpaceId(project) }, noId).toArray(),
      projectsOf(db, clientId).then(all => all.find(p => p.id === project)),
    ]);
    const ids = [...new Set([...list.map(place => place.clientId), ...(doc?.people.map(person => person.clientId) ?? [])])];
    const users = ids.length
      ? await db.collection<{ clientId: string; name?: string; githubLogin?: string; email?: string }>('users').find({ clientId: { $in: ids } }, { projection: { _id: 0, clientId: 1, name: 1, githubLogin: 1, email: 1 } }).toArray()
      : [];
    const names = Object.fromEntries(users.map(user => [user.clientId, user.name || user.githubLogin || user.email?.split('@')[0] || 'A member']));
    // someone who left the project takes their places with them
    const onIt = new Set([clientId, ...(doc?.people.map(person => person.clientId) ?? [])]);
    return accessView({
      project,
      me: clientId,
      places: (list as PlaceRecord[]).filter(place => onIt.has(place.clientId)),
      items: items.map((item): SetupItem => ({ kind: item.kind, name: item.name, title: item.title, needs: item.needs })),
      names,
      admins: (doc?.people ?? []).filter(person => person.role === 'owner').map(person => names[person.clientId] ?? 'The owner'),
    });
  },
};
