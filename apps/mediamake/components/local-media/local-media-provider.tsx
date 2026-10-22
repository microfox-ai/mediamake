'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  deleteLocalMediaItems,
  loadLocalMediaLibrary,
  pruneLocalMediaRoots,
  putLocalMediaItems,
  saveLocalMediaImport,
} from '@/lib/local-media/db';
import {
  detectLocalContentType,
  getLocalMediaSupport,
  handlesFromDrop,
  isNotFoundError,
  isSameLocalFile,
  isSupportedMediaName,
  mimeTypeFor,
  pickLocalFiles,
  pickLocalFolder,
  pickSingleLocalFile,
  queryReadPermission,
  requestReadPermission,
  scanLocalFolder,
  type LocalMediaSupport,
  type ScannedFile,
} from '@/lib/local-media/file-access';
import { localRecordToMediaFile, type LocalMediaFile } from '@/lib/local-media/media-file';
import { probeLocalMedia } from '@/lib/local-media/probe';
import {
  installFileRelay,
  invalidateLocalMediaCache,
  startLocalMediaWorker,
  type FileRelayAnswer,
  type LocalMediaWorkerState,
} from '@/lib/local-media/sw-bridge';
import type {
  LocalMediaCandidate,
  LocalMediaRecord,
  LocalMediaRoot,
  LocalMediaStatus,
} from '@/lib/local-media/types';
import { uploadLocalFileToCloud, type CloudCopy } from '@/lib/local-media/upload';

export interface LocalImportSelection {
  roots: LocalMediaRoot[];
  candidates: LocalMediaCandidate[];
  /** Folder name when a single folder was chosen. */
  folderName?: string;
}

export interface LocalMediaContextValue {
  support: LocalMediaSupport;
  workerState: LocalMediaWorkerState;
  loaded: boolean;
  records: LocalMediaRecord[];
  statuses: Record<string, LocalMediaStatus>;
  /** MediaFile-shaped items, newest first. */
  files: LocalMediaFile[];
  needsPermissionCount: number;
  missingCount: number;

  /** Folder picker + scan. Null if the user closed the picker. */
  chooseFolder: (options?: { recursive?: boolean }) => Promise<LocalImportSelection | null>;
  /** Multi-file picker. Null if the user closed the picker. */
  chooseFiles: () => Promise<LocalImportSelection | null>;
  /** Call synchronously from a drop handler. */
  selectionFromDrop: (dataTransfer: DataTransfer) => Promise<LocalImportSelection>;
  importSelection: (
    selection: LocalImportSelection,
    candidates: LocalMediaCandidate[],
    options: { tags: string[]; projectId?: string },
    onProgress?: (done: number, total: number) => void,
  ) => Promise<{ added: number; skipped: number }>;
  /** Re-asks Chrome for access. Must run from a click. */
  reconnect: () => Promise<{ restored: number; stillBlocked: number }>;
  /** Points an item at a new file on disk; keeps its id and URL. */
  relink: (id: string) => Promise<boolean>;
  remove: (ids: string[]) => Promise<void>;
  update: (
    ids: string[],
    patch: { tags?: string[]; projectId?: string | null; name?: string },
  ) => Promise<void>;
  uploadToCloud: (
    ids: string[],
    options?: {
      clientId?: string;
      signal?: AbortSignal;
      onProgress?: (p: { loaded: number; total: number; currentName: string; index: number }) => void;
    },
  ) => Promise<Map<string, CloudCopy>>;
  getRecord: (id: string) => LocalMediaRecord | undefined;
  refreshStatuses: () => Promise<void>;
}

const LocalMediaContext = createContext<LocalMediaContextValue | null>(null);

const STATUS_CHECK_CONCURRENCY = 8;
const PROBE_CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function computeStatuses(
  records: LocalMediaRecord[],
  roots: LocalMediaRoot[],
): Promise<Record<string, LocalMediaStatus>> {
  const rootById = new Map(roots.map((root) => [root.id, root]));
  const rootPermission = new Map<string, PermissionState>();
  await Promise.all(
    roots.map(async (root) => rootPermission.set(root.id, await queryReadPermission(root.handle))),
  );
  const entries = await mapWithConcurrency(records, STATUS_CHECK_CONCURRENCY, async (record) => {
    const root = rootById.get(record.rootId);
    const permission = root
      ? rootPermission.get(root.id)
      : await queryReadPermission(record.handle);
    if (permission !== 'granted') return [record.id, 'needs-permission'] as const;
    try {
      await record.handle.getFile();
      return [record.id, 'ready'] as const;
    } catch (err) {
      return [record.id, isNotFoundError(err) ? 'missing' : 'needs-permission'] as const;
    }
  });
  return Object.fromEntries(entries);
}

type UnmarkedCandidate = Omit<LocalMediaCandidate, 'alreadyImported'>;

async function candidateFromHandle(
  handle: FileSystemFileHandle,
  relativePath: string,
): Promise<ScannedFile | null> {
  try {
    const file = await handle.getFile();
    if (!isSupportedMediaName(file.name)) return null;
    return {
      handle,
      name: file.name,
      relativePath,
      contentType: detectLocalContentType(file.name, file.type),
      size: file.size,
      lastModified: file.lastModified,
      mimeType: mimeTypeFor(file.name, file.type),
    };
  } catch {
    return null;
  }
}

export function LocalMediaProvider({ children }: { children: ReactNode }) {
  const [support, setSupport] = useState<LocalMediaSupport>({ supported: false, reason: 'server' });
  const [workerState, setWorkerState] = useState<LocalMediaWorkerState>('unsupported');
  const [loaded, setLoaded] = useState(false);
  const [records, setRecords] = useState<LocalMediaRecord[]>([]);
  const [roots, setRoots] = useState<LocalMediaRoot[]>([]);
  const [statuses, setStatuses] = useState<Record<string, LocalMediaStatus>>({});
  const [origin, setOrigin] = useState('');

  // The worker's file requests arrive outside React; read the latest state.
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const rootsRef = useRef(roots);
  rootsRef.current = roots;

  const refreshStatuses = useCallback(async () => {
    const next = await computeStatuses(recordsRef.current, rootsRef.current);
    setStatuses(next);
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    const detected = getLocalMediaSupport();
    setSupport(detected);
    if (!detected.supported) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setWorkerState('starting');
    void startLocalMediaWorker().then((state) => {
      if (!cancelled) setWorkerState(state);
    });

    void loadLocalMediaLibrary()
      .then(async ({ items, roots: loadedRoots }) => {
        if (cancelled) return;
        recordsRef.current = items;
        rootsRef.current = loadedRoots;
        setRecords(items);
        setRoots(loadedRoots);
        setStatuses(Object.fromEntries(items.map((item) => [item.id, 'checking' as const])));
        setLoaded(true);
        const next = await computeStatuses(items, loadedRoots);
        if (!cancelled) setStatuses(next);
      })
      .catch((err) => {
        console.error('[local-media] could not open the local library', err);
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Serve the worker's file requests from our handles.
  useEffect(() => {
    if (!support.supported) return;
    return installFileRelay(async (id): Promise<FileRelayAnswer> => {
      const record = recordsRef.current.find((item) => item.id === id);
      if (!record) return { error: 'missing' };
      if ((await queryReadPermission(record.handle)) !== 'granted') {
        setStatuses((s) => (s[id] === 'needs-permission' ? s : { ...s, [id]: 'needs-permission' }));
        return { error: 'permission' };
      }
      try {
        return { file: await record.handle.getFile() };
      } catch (err) {
        if (isNotFoundError(err)) {
          setStatuses((s) => (s[id] === 'missing' ? s : { ...s, [id]: 'missing' }));
          return { error: 'missing' };
        }
        return { error: 'unknown' };
      }
    });
  }, [support.supported]);

  // Coming back to the tab is the usual moment files were moved or access
  // was granted elsewhere.
  useEffect(() => {
    if (!support.supported || !loaded) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshStatuses();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [support.supported, loaded, refreshStatuses]);

  const markAlreadyImported = useCallback(
    async (found: UnmarkedCandidate[]): Promise<LocalMediaCandidate[]> => {
      const existing = recordsRef.current;
      return Promise.all(
        found.map(async (candidate) => {
          const lookalikes = existing.filter(
            (r) => r.name === candidate.name && r.size === candidate.size,
          );
          let alreadyImported = false;
          for (const record of lookalikes) {
            if (await isSameLocalFile(record.handle, candidate.handle)) {
              alreadyImported = true;
              break;
            }
          }
          return { ...candidate, alreadyImported };
        }),
      );
    },
    [],
  );

  const chooseFolder = useCallback<LocalMediaContextValue['chooseFolder']>(
    async ({ recursive = true } = {}) => {
      let dir: FileSystemDirectoryHandle;
      try {
        dir = await pickLocalFolder();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return null;
        throw err;
      }
      const root: LocalMediaRoot = {
        id: newId(),
        kind: 'directory',
        name: dir.name,
        handle: dir,
        createdAt: Date.now(),
      };
      const scanned = await scanLocalFolder(dir, { recursive });
      const found = scanned.map((c) => ({ ...c, rootId: root.id }));
      return {
        roots: [root],
        candidates: await markAlreadyImported(found),
        folderName: dir.name,
      };
    },
    [markAlreadyImported],
  );

  const chooseFiles = useCallback<LocalMediaContextValue['chooseFiles']>(async () => {
    let handles: FileSystemFileHandle[];
    try {
      handles = await pickLocalFiles();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      throw err;
    }
    return selectionFromHandles(handles, markAlreadyImported);
  }, [markAlreadyImported]);

  const selectionFromDrop = useCallback<LocalMediaContextValue['selectionFromDrop']>(
    (dataTransfer) => {
      const pending = handlesFromDrop(dataTransfer);
      return pending.then((handles) => selectionFromHandles(handles, markAlreadyImported));
    },
    [markAlreadyImported],
  );

  const importSelection = useCallback<LocalMediaContextValue['importSelection']>(
    async (selection, chosen, { tags, projectId }, onProgress) => {
      const fresh = chosen.filter((c) => !c.alreadyImported);
      const skipped = chosen.length - fresh.length;
      if (fresh.length === 0) return { added: 0, skipped };

      let done = 0;
      onProgress?.(0, fresh.length);
      const now = Date.now();
      const newRecords = await mapWithConcurrency(fresh, PROBE_CONCURRENCY, async (candidate, index) => {
        const file = await candidate.handle.getFile();
        const metadata = await probeLocalMedia(file, candidate.contentType);
        done += 1;
        onProgress?.(done, fresh.length);
        const record: LocalMediaRecord = {
          id: newId(),
          name: candidate.name,
          relativePath: candidate.relativePath,
          rootId: candidate.rootId,
          handle: candidate.handle,
          mimeType: candidate.mimeType,
          contentType: candidate.contentType,
          size: candidate.size,
          lastModified: candidate.lastModified,
          // Keep the folder order when sorted newest-first.
          createdAt: now + (fresh.length - index),
          updatedAt: now,
          tags,
          ...(projectId ? { projectId } : {}),
          metadata,
        };
        return record;
      });

      const usedRootIds = new Set(newRecords.map((r) => r.rootId));
      const usedRoots = selection.roots.filter((r) => usedRootIds.has(r.id));
      await saveLocalMediaImport(usedRoots, newRecords);

      setRoots((prev) => {
        const next = [...prev, ...usedRoots.filter((r) => !prev.some((p) => p.id === r.id))];
        rootsRef.current = next;
        return next;
      });
      setRecords((prev) => {
        const next = [...prev, ...newRecords];
        recordsRef.current = next;
        return next;
      });
      setStatuses((prev) => ({
        ...prev,
        ...Object.fromEntries(newRecords.map((r) => [r.id, 'ready' as const])),
      }));
      return { added: newRecords.length, skipped };
    },
    [],
  );

  const reconnect = useCallback<LocalMediaContextValue['reconnect']>(async () => {
    const blockedIds = new Set(
      recordsRef.current.filter((r) => statuses[r.id] === 'needs-permission').map((r) => r.rootId),
    );
    // Roots with the most files first: if Chrome only allows one prompt per
    // click, the first one restores the most.
    const counts = new Map<string, number>();
    for (const r of recordsRef.current) counts.set(r.rootId, (counts.get(r.rootId) ?? 0) + 1);
    const pending = rootsRef.current
      .filter((root) => blockedIds.has(root.id))
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));

    let restored = 0;
    for (const root of pending) {
      const state = await requestReadPermission(root.handle);
      if (state === 'granted') restored += 1;
      else break; // dismissed, or the click's activation is used up
    }
    invalidateLocalMediaCache();
    const next = await computeStatuses(recordsRef.current, rootsRef.current);
    setStatuses(next);
    const stillBlocked = new Set(
      recordsRef.current.filter((r) => next[r.id] === 'needs-permission').map((r) => r.rootId),
    ).size;
    return { restored, stillBlocked };
  }, [statuses]);

  const relink = useCallback<LocalMediaContextValue['relink']>(async (id) => {
    const record = recordsRef.current.find((r) => r.id === id);
    if (!record) return false;
    let handle: FileSystemFileHandle;
    try {
      handle = await pickSingleLocalFile();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      throw err;
    }
    const file = await handle.getFile();
    const contentType = detectLocalContentType(file.name, file.type);
    const root: LocalMediaRoot = {
      id: newId(),
      kind: 'file',
      name: file.name,
      handle,
      createdAt: Date.now(),
    };
    const metadata = await probeLocalMedia(file, contentType);
    const updated: LocalMediaRecord = {
      ...record,
      name: file.name,
      relativePath: file.name,
      rootId: root.id,
      handle,
      mimeType: mimeTypeFor(file.name, file.type),
      contentType,
      size: file.size,
      lastModified: file.lastModified,
      updatedAt: Date.now(),
      metadata,
      // A different file: an earlier cloud copy no longer matches it.
      cloud: undefined,
    };
    await saveLocalMediaImport([root], [updated]);
    await pruneLocalMediaRoots();
    invalidateLocalMediaCache(id);
    const usedRootIds = new Set(
      recordsRef.current.map((r) => (r.id === id ? root.id : r.rootId)),
    );
    setRoots((prev) => {
      const next = [...prev, root].filter((r) => usedRootIds.has(r.id));
      rootsRef.current = next;
      return next;
    });
    setRecords((prev) => {
      const next = prev.map((r) => (r.id === id ? updated : r));
      recordsRef.current = next;
      return next;
    });
    setStatuses((s) => ({ ...s, [id]: 'ready' }));
    return true;
  }, []);

  const remove = useCallback<LocalMediaContextValue['remove']>(async (ids) => {
    if (ids.length === 0) return;
    await deleteLocalMediaItems(ids);
    ids.forEach((id) => invalidateLocalMediaCache(id));
    const drop = new Set(ids);
    const nextRecords = recordsRef.current.filter((r) => !drop.has(r.id));
    const used = new Set(nextRecords.map((r) => r.rootId));
    const nextRoots = rootsRef.current.filter((root) => used.has(root.id));
    recordsRef.current = nextRecords;
    rootsRef.current = nextRoots;
    setRecords(nextRecords);
    setRoots(nextRoots);
    setStatuses((s) => {
      const next = { ...s };
      ids.forEach((id) => delete next[id]);
      return next;
    });
  }, []);

  const update = useCallback<LocalMediaContextValue['update']>(async (ids, patch) => {
    const targets = new Set(ids);
    const changed = recordsRef.current
      .filter((r) => targets.has(r.id))
      .map((r) => {
        const next: LocalMediaRecord = { ...r, updatedAt: Date.now() };
        if (patch.tags) next.tags = patch.tags;
        // Display name only; the URL id (and the file on disk) are unchanged.
        if (patch.name?.trim()) next.name = patch.name.trim();
        if (patch.projectId === null) delete next.projectId;
        else if (patch.projectId !== undefined) next.projectId = patch.projectId;
        return next;
      });
    await putLocalMediaItems(changed);
    const byId = new Map(changed.map((r) => [r.id, r]));
    setRecords((prev) => {
      const next = prev.map((r) => byId.get(r.id) ?? r);
      recordsRef.current = next;
      return next;
    });
  }, []);

  const uploadToCloud = useCallback<LocalMediaContextValue['uploadToCloud']>(
    async (ids, { clientId, signal, onProgress } = {}) => {
      const result = new Map<string, CloudCopy>();
      const targets = ids
        .map((id) => recordsRef.current.find((r) => r.id === id))
        .filter((r): r is LocalMediaRecord => Boolean(r));
      const total = targets.reduce((sum, r) => sum + (r.cloud ? 0 : r.size), 0);
      let uploadedBefore = 0;

      for (const [index, record] of targets.entries()) {
        if (record.cloud) {
          result.set(record.id, { url: record.cloud.url, mediaId: record.cloud.mediaId });
          continue;
        }
        if ((await queryReadPermission(record.handle)) !== 'granted') {
          throw new Error(`${record.name} needs access again — reconnect local media first.`);
        }
        let file: File;
        try {
          file = await record.handle.getFile();
        } catch (err) {
          if (isNotFoundError(err)) {
            setStatuses((s) => ({ ...s, [record.id]: 'missing' }));
            throw new Error(`${record.name} is missing on disk — relink it first.`);
          }
          throw err;
        }
        const copy = await uploadLocalFileToCloud(record, file, {
          clientId,
          signal,
          onProgress: (loaded) =>
            onProgress?.({
              loaded: uploadedBefore + loaded,
              total,
              currentName: record.name,
              index,
            }),
        });
        uploadedBefore += record.size;
        result.set(record.id, copy);
        const updated: LocalMediaRecord = {
          ...record,
          cloud: { url: copy.url, mediaId: copy.mediaId, uploadedAt: Date.now() },
          updatedAt: Date.now(),
        };
        await putLocalMediaItems([updated]);
        setRecords((prev) => {
          const next = prev.map((r) => (r.id === record.id ? updated : r));
          recordsRef.current = next;
          return next;
        });
      }
      return result;
    },
    [],
  );

  const getRecord = useCallback(
    (id: string) => recordsRef.current.find((r) => r.id === id),
    [],
  );

  const files = useMemo(
    () =>
      origin
        ? [...records]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((record) =>
              localRecordToMediaFile(record, origin, statuses[record.id] ?? 'checking'),
            )
        : [],
    [records, statuses, origin],
  );

  const needsPermissionCount = useMemo(
    () => Object.values(statuses).filter((s) => s === 'needs-permission').length,
    [statuses],
  );
  const missingCount = useMemo(
    () => Object.values(statuses).filter((s) => s === 'missing').length,
    [statuses],
  );

  const value = useMemo<LocalMediaContextValue>(
    () => ({
      support,
      workerState,
      loaded,
      records,
      statuses,
      files,
      needsPermissionCount,
      missingCount,
      chooseFolder,
      chooseFiles,
      selectionFromDrop,
      importSelection,
      reconnect,
      relink,
      remove,
      update,
      uploadToCloud,
      getRecord,
      refreshStatuses,
    }),
    [
      support,
      workerState,
      loaded,
      records,
      statuses,
      files,
      needsPermissionCount,
      missingCount,
      chooseFolder,
      chooseFiles,
      selectionFromDrop,
      importSelection,
      reconnect,
      relink,
      remove,
      update,
      uploadToCloud,
      getRecord,
      refreshStatuses,
    ],
  );

  return <LocalMediaContext.Provider value={value}>{children}</LocalMediaContext.Provider>;
}

/** Picked/dropped handles → candidates (folders are scanned). */
async function selectionFromHandles(
  handles: FileSystemHandle[],
  markAlreadyImported: (found: UnmarkedCandidate[]) => Promise<LocalMediaCandidate[]>,
): Promise<LocalImportSelection> {
  const roots: LocalMediaRoot[] = [];
  const found: UnmarkedCandidate[] = [];
  for (const handle of handles) {
    const root: LocalMediaRoot = {
      id: newId(),
      kind: handle.kind === 'directory' ? 'directory' : 'file',
      name: handle.name,
      handle: handle as FileSystemDirectoryHandle | FileSystemFileHandle,
      createdAt: Date.now(),
    };
    if (handle.kind === 'directory') {
      const inFolder = await scanLocalFolder(handle as FileSystemDirectoryHandle);
      if (inFolder.length === 0) continue;
      roots.push(root);
      found.push(
        ...inFolder.map((c) => ({
          ...c,
          relativePath: `${root.name}/${c.relativePath}`,
          rootId: root.id,
        })),
      );
    } else {
      const candidate = await candidateFromHandle(handle as FileSystemFileHandle, handle.name);
      if (!candidate) continue;
      roots.push(root);
      found.push({ ...candidate, rootId: root.id });
    }
  }
  return {
    roots,
    candidates: await markAlreadyImported(found),
    folderName:
      roots.length === 1 && roots[0].kind === 'directory' ? roots[0].name : undefined,
  };
}

const unsupportedValue: LocalMediaContextValue = {
  support: { supported: false, reason: 'server' },
  workerState: 'unsupported',
  loaded: true,
  records: [],
  statuses: {},
  files: [],
  needsPermissionCount: 0,
  missingCount: 0,
  chooseFolder: async () => null,
  chooseFiles: async () => null,
  selectionFromDrop: async () => ({ roots: [], candidates: [] }),
  importSelection: async () => ({ added: 0, skipped: 0 }),
  reconnect: async () => ({ restored: 0, stillBlocked: 0 }),
  relink: async () => false,
  remove: async () => undefined,
  update: async () => undefined,
  uploadToCloud: async () => new Map(),
  getRecord: () => undefined,
  refreshStatuses: async () => undefined,
};

/** Local media library. Outside a LocalMediaProvider it is simply empty. */
export function useLocalMedia(): LocalMediaContextValue {
  return useContext(LocalMediaContext) ?? unsupportedValue;
}
