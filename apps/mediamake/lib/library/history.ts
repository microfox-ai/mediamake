import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * The picked _LIBRARY folder and the viewer's settings (and edits still waiting), kept in
 * IndexedDB like the revision screens' history. Chrome asks again for read access on a new
 * visit unless "Allow on every visit" was chosen.
 */
interface LibraryDB extends DBSchema {
  root: { key: string; value: FileSystemDirectoryHandle };
  prefs: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<LibraryDB>> | null = null;

function getDb() {
  dbPromise ??= openDB<LibraryDB>('mediamake-library', 1, {
    upgrade(db) {
      db.createObjectStore('root');
      db.createObjectStore('prefs');
    },
  }).catch(err => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

export async function loadRoot(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return (await (await getDb()).get('root', 'library')) ?? null;
  } catch {
    return null;
  }
}

export async function saveRoot(handle: FileSystemDirectoryHandle | null): Promise<void> {
  try {
    const db = await getDb();
    if (handle) await db.put('root', handle, 'library');
    else await db.delete('root', 'library');
  } catch {
    // private window: the folder is picked again next visit
  }
}

export async function loadPref<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await (await getDb()).get('prefs', key);
    return v === undefined ? fallback : (v as T);
  } catch {
    return fallback;
  }
}

export async function savePref(key: string, value: unknown): Promise<void> {
  try {
    await (await getDb()).put('prefs', value, key);
  } catch {
    // blocked storage: the setting lives for this visit only
  }
}
