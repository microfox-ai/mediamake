import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { LocalMediaRecord, LocalMediaRoot } from './types';

/**
 * IndexedDB store for the local media library. Per browser profile and per
 * origin: local media imported on one machine (or one deployment URL) is
 * never visible anywhere else.
 */
interface LocalMediaDB extends DBSchema {
  items: {
    key: string;
    value: LocalMediaRecord;
    indexes: { createdAt: number; rootId: string };
  };
  roots: {
    key: string;
    value: LocalMediaRoot;
  };
}

const DB_NAME = 'mediamake-local-media';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LocalMediaDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<LocalMediaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('items')) {
          const items = db.createObjectStore('items', { keyPath: 'id' });
          items.createIndex('createdAt', 'createdAt');
          items.createIndex('rootId', 'rootId');
        }
        if (!db.objectStoreNames.contains('roots')) {
          db.createObjectStore('roots', { keyPath: 'id' });
        }
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function loadLocalMediaLibrary(): Promise<{
  items: LocalMediaRecord[];
  roots: LocalMediaRoot[];
}> {
  const db = await getDb();
  const [items, roots] = await Promise.all([db.getAll('items'), db.getAll('roots')]);
  return { items, roots };
}

export async function saveLocalMediaImport(
  roots: LocalMediaRoot[],
  items: LocalMediaRecord[],
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['items', 'roots'], 'readwrite');
  await Promise.all([
    ...roots.map((root) => tx.objectStore('roots').put(root)),
    ...items.map((item) => tx.objectStore('items').put(item)),
    tx.done,
  ]);
}

export async function putLocalMediaItems(items: LocalMediaRecord[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDb();
  const tx = db.transaction('items', 'readwrite');
  await Promise.all([...items.map((item) => tx.store.put(item)), tx.done]);
}

/**
 * Removes items from the library (the files on disk are untouched) and
 * drops roots nothing references any more.
 */
export async function deleteLocalMediaItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const tx = db.transaction(['items', 'roots'], 'readwrite');
  const items = tx.objectStore('items');
  await Promise.all(ids.map((id) => items.delete(id)));
  const remaining = await items.getAll();
  const usedRoots = new Set(remaining.map((item) => item.rootId));
  const roots = await tx.objectStore('roots').getAllKeys();
  await Promise.all(
    roots.filter((id) => !usedRoots.has(id)).map((id) => tx.objectStore('roots').delete(id)),
  );
  await tx.done;
}

/** Drops roots no item references (e.g. after a relink moved an item). */
export async function pruneLocalMediaRoots(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['items', 'roots'], 'readwrite');
  const remaining = await tx.objectStore('items').getAll();
  const usedRoots = new Set(remaining.map((item) => item.rootId));
  const roots = await tx.objectStore('roots').getAllKeys();
  await Promise.all(
    roots.filter((id) => !usedRoots.has(id)).map((id) => tx.objectStore('roots').delete(id)),
  );
  await tx.done;
}
