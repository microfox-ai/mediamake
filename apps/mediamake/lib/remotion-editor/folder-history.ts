import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Folders opened in /remotion-editor. A directory handle is structured-cloneable, so IndexedDB
 * keeps it across visits; Chrome still asks again for access unless the user chose "Allow on
 * every visit". Per browser and origin: localhost and the deployed site keep separate lists.
 */
export interface FolderEntry {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  openedAt: number;
}

interface EditorDB extends DBSchema {
  folders: { key: string; value: FolderEntry };
}

const MAX_FOLDERS = 8;

let dbPromise: Promise<IDBPDatabase<EditorDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<EditorDB>('mediamake-remotion-editor', 1, {
      upgrade(db) {
        db.createObjectStore('folders', { keyPath: 'id' });
      },
    }).catch(err => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function loadFolders(): Promise<FolderEntry[]> {
  const all = await (await getDb()).getAll('folders');
  return all.sort((a, b) => b.openedAt - a.openedAt);
}

/** Records the folder as just opened, reusing its entry when it was opened before. */
export async function rememberFolder(handle: FileSystemDirectoryHandle): Promise<FolderEntry> {
  const db = await getDb();
  const all = await loadFolders();
  let existing: FolderEntry | undefined;
  for (const entry of all) {
    if (await entry.handle.isSameEntry(handle).catch(() => false)) existing = entry;
  }
  const entry: FolderEntry = {
    id: existing?.id ?? crypto.randomUUID(),
    name: handle.name,
    handle,
    openedAt: Date.now(),
  };
  await db.put('folders', entry);
  const stale = (await loadFolders()).slice(MAX_FOLDERS);
  await Promise.all(stale.map(old => db.delete('folders', old.id)));
  return entry;
}

export async function forgetFolder(id: string): Promise<void> {
  await (await getDb()).delete('folders', id);
}
