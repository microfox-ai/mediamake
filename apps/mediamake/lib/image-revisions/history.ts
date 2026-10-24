import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Recently opened image sets and source folders (e.g.
 * apps/lyrics_videos/out), kept in IndexedDB like the video
 * revisions' history but in their own database. Chrome still asks for
 * permission again unless the user chose "Allow on every visit".
 */
export interface RecentJob {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  openedAt: number;
}

export interface SourceEntry {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  addedAt: number;
}

interface ImageRevisionsDB extends DBSchema {
  recent: { key: string; value: RecentJob };
  sources: { key: string; value: SourceEntry };
}

const MAX_RECENT = 30;
let dbPromise: Promise<IDBPDatabase<ImageRevisionsDB>> | null = null;

function getDb() {
  // the name predates /image-revision; kept so sources added on /thumbnail-revision survive
  dbPromise ??= openDB<ImageRevisionsDB>('mediamake-thumbnail-revisions', 1, {
    upgrade(db) {
      db.createObjectStore('recent', { keyPath: 'id' });
      db.createObjectStore('sources', { keyPath: 'id' });
    },
  }).catch(err => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

async function sameFolder(a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle) {
  try {
    return await a.isSameEntry(b);
  } catch {
    return false;
  }
}

export async function loadRecent(): Promise<RecentJob[]> {
  const all = await (await getDb()).getAll('recent');
  return all.sort((a, b) => b.openedAt - a.openedAt);
}

export async function rememberJob(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await getDb();
  const all = await loadRecent();
  let existing: RecentJob | undefined;
  for (const e of all) if (await sameFolder(e.handle, handle)) existing = e;
  await db.put('recent', {
    id: existing?.id ?? crypto.randomUUID(),
    name: handle.name,
    handle,
    openedAt: Date.now(),
  });
  const fresh = await loadRecent();
  await Promise.all(fresh.slice(MAX_RECENT).map(old => db.delete('recent', old.id)));
}

export async function forgetRecent(id: string): Promise<void> {
  await (await getDb()).delete('recent', id);
}

export async function loadSources(): Promise<SourceEntry[]> {
  const all = await (await getDb()).getAll('sources');
  return all.sort((a, b) => a.addedAt - b.addedAt);
}

export async function addSource(handle: FileSystemDirectoryHandle): Promise<SourceEntry> {
  const db = await getDb();
  for (const e of await loadSources()) if (await sameFolder(e.handle, handle)) return e;
  const entry = { id: crypto.randomUUID(), name: handle.name, handle, addedAt: Date.now() };
  await db.put('sources', entry);
  return entry;
}

export async function removeSource(id: string): Promise<void> {
  await (await getDb()).delete('sources', id);
}
