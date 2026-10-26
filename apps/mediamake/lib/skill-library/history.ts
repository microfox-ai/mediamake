import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Source folders (a repo, ~/.claude/skills, a projects folder) and the
 * viewer's pins, kept in IndexedDB like the revision screens' history. Chrome
 * asks for permission again on each visit unless "Allow on every visit" was chosen.
 */
export interface SourceEntry {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  addedAt: number;
}

interface SkillLibraryDB extends DBSchema {
  sources: { key: string; value: SourceEntry };
  prefs: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<SkillLibraryDB>> | null = null;

function getDb() {
  dbPromise ??= openDB<SkillLibraryDB>('mediamake-skill-library', 1, {
    upgrade(db) {
      db.createObjectStore('sources', { keyPath: 'id' });
      db.createObjectStore('prefs');
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

export async function loadSources(): Promise<SourceEntry[]> {
  const all = await (await getDb()).getAll('sources');
  return all.sort((a, b) => a.addedAt - b.addedAt);
}

/** Adds a folder, or returns the entry it already has. */
export async function addSource(handle: FileSystemDirectoryHandle): Promise<{ entry: SourceEntry; existed: boolean }> {
  const db = await getDb();
  for (const e of await loadSources()) if (await sameFolder(e.handle, handle)) return { entry: e, existed: true };
  const entry = { id: crypto.randomUUID(), name: handle.name, handle, addedAt: Date.now() };
  await db.put('sources', entry);
  return { entry, existed: false };
}

export async function removeSource(id: string): Promise<void> {
  await (await getDb()).delete('sources', id);
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
    // private window or blocked storage: the pref lives for this visit only
  }
}
