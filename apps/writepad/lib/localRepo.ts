/**
 * localRepo.ts — IndexedDB-backed local file + commit storage.
 *
 * Treats the browser like a git working directory:
 *   - Files are persisted locally across page refreshes
 *   - Server is the "remote" — the user explicitly fetches/pulls/pushes
 *   - Commits are staged locally and only sent to the server on Push
 *   - Branches can be created locally and pushed to server independently
 *
 * DB layout (version 3)
 * ─────────────────────
 * DB name  : writepad_local_repo
 *
 * Store "files"
 *   keyPath : "localKey"  (`${projectId}::${fileId}`)
 *   index   : "by_project" on "projectId"
 *
 * Store "localCommits"
 *   keyPath : "localKey"  (`${projectId}::${branchName}::${localId}`)
 *   index   : "by_project_branch" on ["projectId", "branchName"]
 *
 * Store "meta"
 *   keyPath : "key"  (arbitrary string key, stores any JSON blob)
 *   Used for pulledHead: key = `ph_${projectId}_${branchName}`
 *
 * Store "localBranches"  [new in v3]
 *   keyPath : "localKey"  (`${projectId}::${branchName}`)
 *   index   : "by_project" on "projectId"
 *   Tracks branches that exist only locally (not yet pushed to server).
 */

const DB_NAME = 'writepad_local_repo';
const DB_VERSION = 3;
const FILES_STORE = 'files';
const COMMITS_STORE = 'localCommits';
const META_STORE = 'meta';
const BRANCHES_STORE = 'localBranches';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface LocalFile {
  projectId: string;
  fileId: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content: string;
  /** AI-staged draft — null if none. Kept locally, never synced to server. */
  draft: string | null;
  order: number;
}

/**
 * A commit created locally (not yet pushed to the server).
 */
export interface LocalCommit {
  /** Temporary client-generated ID (used as sort key + IDB key). */
  localId: string;
  projectId: string;
  branchName: string;
  message: string;
  files: LocalCommitFile[];
  createdAt: string; // ISO timestamp
}

export interface LocalCommitFile {
  fileId: string;
  name?: string;
  type?: 'file' | 'folder';
  parentId?: string | null;
  content?: string;
  order?: number;
  deleted?: boolean;
}

/**
 * Metadata for a branch that exists only locally (not yet pushed to server).
 * Stored in IDB; removed when the branch is pushed.
 */
export interface LocalBranchMeta {
  projectId: string;
  branchName: string;
  /**
   * The server branch this local branch should be forked from when pushed.
   * If this was created from another local branch, this is that branch's
   * serverSourceBranch (transitively resolved to a real server branch).
   */
  serverSourceBranch: string;
  createdAt: string;
}

// ─── DB singleton ─────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'localKey' });
        filesStore.createIndex('by_project', 'projectId', { unique: false });
      }

      if (oldVersion < 2) {
        const commitsStore = db.createObjectStore(COMMITS_STORE, { keyPath: 'localKey' });
        commitsStore.createIndex('by_project_branch', ['projectId', 'branchName'], { unique: false });
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }

      if (oldVersion < 3) {
        const branchesStore = db.createObjectStore(BRANCHES_STORE, { keyPath: 'localKey' });
        branchesStore.createIndex('by_project', 'projectId', { unique: false });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      _db.onclose = () => { _db = null; };
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─── Key helpers ──────────────────────────────────────────────────────────────

function fileKey(projectId: string, fileId: string) {
  return `${projectId}::${fileId}`;
}
function commitKey(projectId: string, branchName: string, localId: string) {
  return `${projectId}::${branchName}::${localId}`;
}
function pulledHeadKey(projectId: string, branchName: string) {
  return `ph_${projectId}_${branchName}`;
}
function localBranchKey(projectId: string, branchName: string) {
  return `${projectId}::${branchName}`;
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function loadLocalFiles(projectId: string): Promise<LocalFile[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILES_STORE, 'readonly');
      const req = tx.objectStore(FILES_STORE).index('by_project').getAll(IDBKeyRange.only(projectId));
      req.onsuccess = () =>
        resolve((req.result as (LocalFile & { localKey: string })[]).map(({ localKey: _k, ...f }) => f));
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

export async function hasLocalFiles(projectId: string): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(FILES_STORE, 'readonly');
      const req = tx.objectStore(FILES_STORE).index('by_project').count(IDBKeyRange.only(projectId));
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    });
  } catch { return false; }
}

export async function saveLocalFiles(projectId: string, files: LocalFile[]): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await clearLocalProject(projectId);
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILES_STORE, 'readwrite');
      const store = tx.objectStore(FILES_STORE);
      for (const file of files) {
        store.put({ localKey: fileKey(projectId, file.fileId), ...file });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

export async function upsertLocalFile(file: LocalFile): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILES_STORE, 'readwrite');
      tx.objectStore(FILES_STORE).put({ localKey: fileKey(file.projectId, file.fileId), ...file });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

export async function deleteLocalFile(projectId: string, fileId: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILES_STORE, 'readwrite');
      tx.objectStore(FILES_STORE).delete(fileKey(projectId, fileId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

export async function clearLocalProject(projectId: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILES_STORE, 'readwrite');
      const store = tx.objectStore(FILES_STORE);
      const cursorReq = store.index('by_project').openKeyCursor(IDBKeyRange.only(projectId));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) { store.delete(cursor.primaryKey); cursor.continue(); }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

// ─── Local commits (unpushed) ─────────────────────────────────────────────────

/** Load all local (unpushed) commits for a project+branch, sorted oldest-first. */
export async function loadLocalCommits(
  projectId: string,
  branchName: string,
): Promise<LocalCommit[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COMMITS_STORE, 'readonly');
      const req = tx
        .objectStore(COMMITS_STORE)
        .index('by_project_branch')
        .getAll(IDBKeyRange.only([projectId, branchName]));
      req.onsuccess = () =>
        resolve(
          (req.result as (LocalCommit & { localKey: string })[])
            .map(({ localKey: _k, ...c }) => c)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        );
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

/** Persist a single local commit. */
export async function saveLocalCommit(commit: LocalCommit): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COMMITS_STORE, 'readwrite');
      tx.objectStore(COMMITS_STORE).put({
        localKey: commitKey(commit.projectId, commit.branchName, commit.localId),
        ...commit,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

/** Delete all local commits for a project+branch (called after a successful push). */
export async function clearLocalCommits(
  projectId: string,
  branchName: string,
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COMMITS_STORE, 'readwrite');
      const store = tx.objectStore(COMMITS_STORE);
      const cursorReq = store
        .index('by_project_branch')
        .openKeyCursor(IDBKeyRange.only([projectId, branchName]));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) { store.delete(cursor.primaryKey); cursor.continue(); }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

// ─── pulledHead persistence ───────────────────────────────────────────────────

/**
 * Load the persisted pulledHead for a project+branch.
 * Returns null when never saved (first visit / branch not yet pulled).
 * The stored value is treated as opaque JSON — cast at the call site.
 */
export async function loadPulledHead(
  projectId: string,
  branchName: string,
): Promise<unknown> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(pulledHeadKey(projectId, branchName));
      req.onsuccess = () => resolve((req.result as { key: string; data: unknown } | undefined)?.data ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

/**
 * Persist the pulledHead so it survives page reloads.
 * Pass the HeadSnapshotArray directly; it will be JSON-serialized.
 */
export async function savePulledHead(
  projectId: string,
  branchName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  head: any,
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put({ key: pulledHeadKey(projectId, branchName), data: head });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

// ─── Local branches ───────────────────────────────────────────────────────────

/** Persist a local-only branch's metadata. */
export async function saveLocalBranch(meta: LocalBranchMeta): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BRANCHES_STORE, 'readwrite');
      tx.objectStore(BRANCHES_STORE).put({
        localKey: localBranchKey(meta.projectId, meta.branchName),
        ...meta,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

/** Load a single local branch's metadata, or null if not found / not local. */
export async function loadLocalBranch(
  projectId: string,
  branchName: string,
): Promise<LocalBranchMeta | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BRANCHES_STORE, 'readonly');
      const req = tx.objectStore(BRANCHES_STORE).get(localBranchKey(projectId, branchName));
      req.onsuccess = () => {
        const row = req.result as (LocalBranchMeta & { localKey: string }) | undefined;
        if (!row) { resolve(null); return; }
        const { localKey: _k, ...meta } = row;
        resolve(meta);
      };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

/** Load all local-only branches for a project. */
export async function loadAllLocalBranches(projectId: string): Promise<LocalBranchMeta[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BRANCHES_STORE, 'readonly');
      const req = tx.objectStore(BRANCHES_STORE).index('by_project').getAll(IDBKeyRange.only(projectId));
      req.onsuccess = () =>
        resolve(
          (req.result as (LocalBranchMeta & { localKey: string })[]).map(({ localKey: _k, ...m }) => m),
        );
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

/** Remove a local branch record (called after a successful server push). */
export async function deleteLocalBranch(projectId: string, branchName: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BRANCHES_STORE, 'readwrite');
      tx.objectStore(BRANCHES_STORE).delete(localBranchKey(projectId, branchName));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}
