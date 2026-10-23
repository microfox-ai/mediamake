import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Recently reviewed videos, one entry per video (or per folder with no video
 * opened yet). The folder's directory handle is structured-cloneable, so
 * IndexedDB keeps it across reloads; Chrome still asks for permission again
 * unless the user chose "Allow on every visit".
 */
export interface RecentEntry {
  id: string;
  folderName: string;
  handle: FileSystemDirectoryHandle;
  video?: string;
  /** Absolute path of the video, when its map said so. */
  sourcePath?: string;
  openedAt: number;
}

interface RevisionsDB extends DBSchema {
  recent: {
    key: string;
    value: RecentEntry;
    indexes: { openedAt: number };
  };
}

const DB_NAME = 'mediamake-revisions';
const MAX_RECENT = 40;

let dbPromise: Promise<IDBPDatabase<RevisionsDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<RevisionsDB>(DB_NAME, 1, {
      upgrade(db) {
        const recent = db.createObjectStore('recent', { keyPath: 'id' });
        recent.createIndex('openedAt', 'openedAt');
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function loadRecent(): Promise<RecentEntry[]> {
  const db = await getDb();
  const all = await db.getAll('recent');
  return all.sort((a, b) => b.openedAt - a.openedAt);
}

async function sameFolder(a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return await a.isSameEntry(b);
  } catch {
    return false;
  }
}

export async function rememberVideo(
  handle: FileSystemDirectoryHandle,
  video?: string,
  sourcePath?: string,
): Promise<void> {
  const db = await getDb();
  const all = await loadRecent();
  const inFolder: RecentEntry[] = [];
  for (const entry of all) {
    if (await sameFolder(entry.handle, handle)) inFolder.push(entry);
  }
  // Reuse this video's entry, or a placeholder from opening the folder before any video.
  const existing = inFolder.find((e) => e.video === video) ?? (video ? inFolder.find((e) => !e.video) : undefined);
  const entry: RecentEntry = {
    id: existing?.id ?? crypto.randomUUID(),
    folderName: handle.name,
    handle,
    video,
    sourcePath: sourcePath ?? (existing?.video === video ? existing?.sourcePath : undefined),
    openedAt: Date.now(),
  };
  await db.put('recent', entry);
  // A folder-only placeholder is redundant once a video in it is listed.
  if (video) {
    await Promise.all(inFolder.filter((e) => !e.video && e.id !== entry.id).map((e) => db.delete('recent', e.id)));
  }
  const fresh = await loadRecent();
  await Promise.all(fresh.slice(MAX_RECENT).map((old) => db.delete('recent', old.id)));
}

export async function forgetRecent(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('recent', id);
}
