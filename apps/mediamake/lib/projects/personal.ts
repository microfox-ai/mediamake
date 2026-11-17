import type { Db, ObjectId } from 'mongodb';

/**
 * A member's personal space keeps its files the way a project space does: in
 * a project of its own, which only they can open. It is made by itself the
 * first time their spaces are listed (Plus and above, like every cloud
 * project), counts against their storage like any project they own, and can
 * be neither shared, renamed nor deleted. Its skills, MCPs and apps are the
 * member's own space on GitHub (lib/space).
 */

export const PERSONAL_NAME = 'Personal';

/** What a request that would share, rename or delete a personal space is told. */
export const PERSONAL_ONLY_YOURS = 'Your personal space is only yours: it cannot be shared, renamed or deleted. Make a project space for work with other people.';

interface PersonalDoc {
  _id: ObjectId;
  clientId: string;
  personal?: boolean;
  displayName: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const isPersonal = (project: { personal?: boolean } | null | undefined): boolean => project?.personal === true;

/** The id of the account's personal project, made when there is none. */
export async function ensurePersonalProject(db: Db, clientId: string): Promise<string> {
  const now = new Date();
  const doc = await db
    .collection<PersonalDoc>('projects')
    .findOneAndUpdate({ clientId, personal: true }, { $setOnInsert: { clientId, personal: true, displayName: PERSONAL_NAME, tags: [], createdAt: now, updatedAt: now } }, { upsert: true, returnDocument: 'after' });
  if (!doc) throw new Error('Could not make the personal space');
  return String(doc._id);
}

/** The id of the account's personal project, or null when it has none yet. */
export async function personalProjectId(db: Db, clientId: string): Promise<string | null> {
  const doc = await db.collection<PersonalDoc>('projects').findOne({ clientId, personal: true }, { projection: { _id: 1 } });
  return doc ? String(doc._id) : null;
}
