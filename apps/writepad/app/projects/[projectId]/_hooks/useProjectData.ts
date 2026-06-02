'use client';

/**
 * useProjectData — Local-first project state backed by IndexedDB.
 *
 * Storage model (git analogy)
 * ──────────────────────────
 *   IndexedDB       ←  local working directory (persists across page loads)
 *   server VCS      ←  remote repository (user explicitly fetches / pulls / pushes)
 *   headSnapshot    ←  remote HEAD (used for VCS status & pull baseline)
 *
 * File states (still maintained for UI indicators)
 *   unsaved  — in-memory content differs from the last locally-saved version
 *   draft    — AI-staged edit (localStorage, not server)
 *   saved    — persisted to IndexedDB (no longer a server write)
 *
 * What still calls the server
 * ──────────────────────────
 *   addFile / addFolder / renameNode / deleteNode / moveNode
 *     → server manages file entity IDs and metadata in project_files
 *   VCS commit (in useVcsStore) → server writes committed content to project_files
 *   VCS checkout / restore / merge (in useVcsStore) → server updates project_files
 *     but we immediately apply the result locally via applySnapshotToLocal
 *
 * What no longer calls the server
 * ────────────────────────────────
 *   saveFile / saveDraft / setFileDraft / revertFileDraft / applyAIDraftEdit
 *     → all local-only; content stays in IndexedDB until VCS commit
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { FileNode } from '@/components/writepad/left/types';
import type { OpenTab } from '@/components/writepad/middle/types';
import type { AIChange } from '@/components/writepad/right/types';
import {
  loadLocalFiles,
  saveLocalFiles,
  upsertLocalFile,
  deleteLocalFile,
  hasLocalFiles,
  type LocalFile,
} from '@/lib/localRepo';
import type { HeadSnapshotArray, PullFileUpdate } from './useVcsStore';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Raw file as returned by the server /files endpoint. */
interface ServerFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content: string;
  draft: string | null;
  order: number;
}

interface UIState {
  openTabIds: string[];
  activeFileId: string | null;
  activeChatId: string | null;
}

export interface ProjectDataState {
  loading: boolean;
  error: string | null;
  projectName: string;
  files: FileNode[];
  openTabs: OpenTab[];
  activeFileId: string | null;
  activeTab: OpenTab | null;
  unsavedIds: Set<string>;
  draftedIds: Set<string>;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  openFile: (node: FileNode) => void;
  closeTab: (fileId: string) => void;
  /** Batch-close multiple tabs; active file switches to nearest remaining tab. */
  closeTabs: (fileIds: string[]) => void;
  setActiveFileId: (id: string) => void;
  updateContent: (fileId: string, content: string) => void;
  saveFile: (fileId: string) => void;
  saveAll: () => void;
  saveDraft: (fileId: string) => void;
  revertFileDraft: (fileId: string) => void;
  applyAIDraftEdit: (change: AIChange) => void;
  addFile: (parentId: string | null, name: string) => void;
  addFolder: (parentId: string | null, name: string) => void;
  renameNode: (nodeId: string, newName: string) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string | null) => void;
  getFileContent: (fileId: string) => string;
  getAllFiles: () => Array<{
    fileId: string;
    fileName: string;
    content: string;
    type: 'file' | 'folder';
    parentId: string | null;
  }>;
  refreshFiles: () => Promise<void>;
  /**
   * Apply a VCS snapshot (from checkout / merge / revert / pull) to the local
   * working directory.  Updates IndexedDB and React state in one shot.
   *
   * @param updates  Array from useVcsStore — snapshot=null means delete the file.
   */
  applySnapshotToLocal: (updates: PullFileUpdate[]) => Promise<void>;
  setFileDraft: (fileId: string, newDraft: string) => Promise<void>;
}

// ─── localStorage UI persistence ──────────────────────────────────────────────

const uiKey = (projectId: string) => `writepad_ui_${projectId}`;

function loadUIState(projectId: string): UIState {
  if (typeof window === 'undefined') return { openTabIds: [], activeFileId: null, activeChatId: null };
  try {
    const raw = localStorage.getItem(uiKey(projectId));
    return raw ? (JSON.parse(raw) as UIState) : { openTabIds: [], activeFileId: null, activeChatId: null };
  } catch {
    return { openTabIds: [], activeFileId: null, activeChatId: null };
  }
}

function saveUIState(projectId: string, state: UIState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(uiKey(projectId), JSON.stringify(state)); } catch { /* ignore */ }
}

// ─── Tree builder ──────────────────────────────────────────────────────────────

function sortNodes(nodes: FileNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  for (const node of nodes) {
    if (node.children) sortNodes(node.children);
  }
}

function buildTree(flat: LocalFile[]): FileNode[] {
  const map = new Map<string, FileNode>();
  const roots: FileNode[] = [];
  for (const f of flat) {
    map.set(f.fileId, {
      id: f.fileId, name: f.name, type: f.type,
      content: f.type === 'file' ? (f.draft ?? f.content) : undefined,
      children: f.type === 'folder' ? [] : undefined,
    });
  }
  for (const f of flat) {
    const node = map.get(f.fileId)!;
    if (f.parentId && map.has(f.parentId)) map.get(f.parentId)!.children!.push(node);
    else roots.push(node);
  }
  sortNodes(roots);
  return roots;
}

export function flattenFiles(nodes: FileNode[]): FileNode[] {
  const out: FileNode[] = [];
  for (const n of nodes) {
    if (n.type === 'file') out.push(n);
    if (n.children) out.push(...flattenFiles(n.children));
  }
  return out;
}

// ─── Apply AI edit helper ──────────────────────────────────────────────────────

function applyEditToContent(base: string, change: AIChange): string {
  const lines = base.split('\n');
  let result: string[];
  if (change.tool === 'edit_lines') {
    result = [...lines.slice(0, change.startLine - 1), ...change.newLines, ...lines.slice(change.endLine)];
  } else if (change.tool === 'insert_lines') {
    result = [...lines.slice(0, change.startLine), ...change.newLines, ...lines.slice(change.startLine)];
  } else {
    result = [...lines.slice(0, change.startLine - 1), ...lines.slice(change.endLine)];
  }
  return result.join('\n');
}

// ─── server file → LocalFile ───────────────────────────────────────────────────

function serverToLocal(projectId: string, f: ServerFile): LocalFile {
  return {
    projectId,
    fileId: f.id,
    name: f.name,
    type: f.type,
    parentId: f.parentId,
    content: f.content,
    draft: f.draft ?? null,
    order: f.order,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useProjectData(projectId: string): ProjectDataState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [flatFiles, setFlatFiles] = useState<LocalFile[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeFileId, setActiveFileIdState] = useState<string | null>(null);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);

  const flatFilesRef = useRef<LocalFile[]>([]);
  flatFilesRef.current = flatFiles;

  const openTabsRef = useRef<OpenTab[]>([]);
  openTabsRef.current = openTabs;

  // Debounced IndexedDB persist — write local edits to IndexedDB 1.5 s after idle
  const idbTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const scheduleIdbPersist = useCallback((fileId: string) => {
    const existing = idbTimers.current.get(fileId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      idbTimers.current.delete(fileId);
      const flat = flatFilesRef.current.find((f) => f.fileId === fileId);
      if (flat) upsertLocalFile(flat).catch(console.error);
    }, 1500);
    idbTimers.current.set(fileId, timer);
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  // Strategy: try IndexedDB first (instant); if empty → fetch from server + seed IndexedDB.

  useEffect(() => {
    if (!projectId) return;

    async function load() {
      try {
        // 1. Always fetch project metadata (name) from server — cheap
        const projectRes = await fetch(`/api/projects/${projectId}`);
        const projectData = await projectRes.json() as { name?: string; error?: string };
        if (projectData.error) { setError(projectData.error); return; }
        setProjectName(projectData.name ?? '');

        // 2. Try local IndexedDB first
        const hasLocal = await hasLocalFiles(projectId);
        let localFiles: LocalFile[];

        if (hasLocal) {
          localFiles = await loadLocalFiles(projectId);
        } else {
          // First visit: seed from server
          const filesRes = await fetch(`/api/projects/${projectId}/files`);
          const serverFiles: ServerFile[] = await filesRes.json();
          localFiles = (serverFiles ?? []).map((f) => serverToLocal(projectId, f));
          // Persist to IndexedDB so next load is instant
          await saveLocalFiles(projectId, localFiles);
        }

        setFlatFiles(localFiles);

        const ui = loadUIState(projectId);
        setActiveChatIdState(ui.activeChatId);

        const fileMap = new Map(localFiles.map((f) => [f.fileId, f]));
        const restoredTabs: OpenTab[] = (ui.openTabIds ?? [])
          .map((id) => {
            const f = fileMap.get(id);
            if (!f || f.type !== 'file') return null;
            const base = f.draft ?? f.content;
            return {
              fileId: f.fileId, name: f.name,
              content: base, savedContent: f.content, draftContent: f.draft ?? null,
            };
          })
          .filter(Boolean) as OpenTab[];

        if (restoredTabs.length > 0) {
          setOpenTabs(restoredTabs);
          const activeId = ui.activeFileId && fileMap.has(ui.activeFileId)
            ? ui.activeFileId
            : restoredTabs[0].fileId;
          setActiveFileIdState(activeId);
        } else {
          const first = localFiles.find((f) => f.type === 'file');
          if (first) {
            const base = first.draft ?? first.content;
            setOpenTabs([{
              fileId: first.fileId, name: first.name,
              content: base, savedContent: first.content, draftContent: first.draft ?? null,
            }]);
            setActiveFileIdState(first.fileId);
          }
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Persist UI state ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    saveUIState(projectId, {
      openTabIds: openTabs.map((t) => t.fileId),
      activeFileId,
      activeChatId,
    });
  }, [projectId, openTabs, activeFileId, activeChatId, loading]);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const files = useMemo(() => buildTree(flatFiles), [flatFiles]);
  const activeTab = useMemo(
    () => openTabs.find((t) => t.fileId === activeFileId) ?? null,
    [openTabs, activeFileId],
  );

  const unsavedIds = useMemo(() => {
    const s = new Set<string>();
    for (const t of openTabs) {
      const base = t.draftContent ?? t.savedContent;
      if (t.content !== base) s.add(t.fileId);
    }
    return s;
  }, [openTabs]);

  const draftedIds = useMemo(() => {
    const s = new Set<string>();
    for (const t of openTabs) {
      if (t.draftContent !== null && t.draftContent !== t.savedContent) s.add(t.fileId);
    }
    return s;
  }, [openTabs]);

  // ── Tab management ────────────────────────────────────────────────────────────

  const setActiveFileId = useCallback((id: string) => setActiveFileIdState(id), []);

  const openFile = useCallback((node: FileNode) => {
    if (node.type !== 'file') return;
    setOpenTabs((prev) => {
      if (prev.some((t) => t.fileId === node.id)) return prev;
      const flat = flatFilesRef.current.find((f) => f.fileId === node.id);
      const base = flat?.draft ?? node.content ?? '';
      return [...prev, {
        fileId: node.id, name: node.name,
        content: base,
        savedContent: flat?.content ?? node.content ?? '',
        draftContent: flat?.draft ?? null,
      }];
    });
    setActiveFileIdState(node.id);
  }, []);

  const closeTab = useCallback((fileId: string) => {
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.fileId === fileId);
      const next = prev.filter((t) => t.fileId !== fileId);
      setActiveFileIdState((active) =>
        active === fileId ? (next[idx]?.fileId ?? next[idx - 1]?.fileId ?? null) : active,
      );
      return next;
    });
  }, []);

  const closeTabs = useCallback((fileIds: string[]) => {
    const toClose = new Set(fileIds);
    setOpenTabs((prev) => {
      const next = prev.filter((t) => !toClose.has(t.fileId));
      setActiveFileIdState((active) => {
        if (!active || !toClose.has(active)) return active;
        return next[0]?.fileId ?? null;
      });
      return next;
    });
  }, []);

  const updateContent = useCallback((fileId: string, content: string) => {
    setOpenTabs((prev) => prev.map((t) => (t.fileId === fileId ? { ...t, content } : t)));
    // Also keep flatFiles in sync so getAllFiles() returns fresh content
    setFlatFiles((prev) =>
      prev.map((f) => (f.fileId === fileId ? { ...f, content } : f)),
    );
    scheduleIdbPersist(fileId);
  }, [scheduleIdbPersist]);

  // ── Save (local-only — no server write) ───────────────────────────────────────

  const saveFile = useCallback((fileId: string) => {
    const tab = openTabsRef.current.find((t) => t.fileId === fileId);
    if (!tab) return;
    const contentToSave = tab.content;

    // Clear any pending IDB persist timer — we're saving now
    const existing = idbTimers.current.get(fileId);
    if (existing) { clearTimeout(existing); idbTimers.current.delete(fileId); }

    setOpenTabs((prev) =>
      prev.map((t) =>
        t.fileId === fileId ? { ...t, savedContent: contentToSave, draftContent: null } : t,
      ),
    );
    setFlatFiles((prev) =>
      prev.map((f) => {
        if (f.fileId !== fileId) return f;
        const updated = { ...f, content: contentToSave, draft: null };
        upsertLocalFile(updated).catch(console.error);
        return updated;
      }),
    );
  }, [idbTimers]);

  const saveAll = useCallback(() => {
    for (const tab of openTabsRef.current) {
      const base = tab.draftContent ?? tab.savedContent;
      if (tab.content !== base || tab.draftContent !== null) {
        saveFile(tab.fileId);
      }
    }
  }, [saveFile]);

  // ── Draft management (local-only) ─────────────────────────────────────────────

  const saveDraft = useCallback((fileId: string) => {
    const tab = openTabsRef.current.find((t) => t.fileId === fileId);
    if (!tab) return;
    const newDraft = tab.content;

    setOpenTabs((prev) =>
      prev.map((t) => (t.fileId === fileId ? { ...t, draftContent: newDraft } : t)),
    );
    setFlatFiles((prev) =>
      prev.map((f) => {
        if (f.fileId !== fileId) return f;
        const updated = { ...f, draft: newDraft };
        upsertLocalFile(updated).catch(console.error);
        return updated;
      }),
    );
  }, []);

  const revertFileDraft = useCallback((fileId: string) => {
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.fileId === fileId ? { ...t, content: t.savedContent, draftContent: null } : t,
      ),
    );
    setFlatFiles((prev) =>
      prev.map((f) => {
        if (f.fileId !== fileId) return f;
        const updated = { ...f, draft: null };
        upsertLocalFile(updated).catch(console.error);
        return updated;
      }),
    );
  }, []);

  const applyAIDraftEdit = useCallback((change: AIChange) => {
    setOpenTabs((prev) => {
      const existing = prev.find((t) => t.fileId === change.fileId);
      let tabs = prev;

      if (!existing) {
        const flat = flatFilesRef.current.find((f) => f.fileId === change.fileId);
        if (flat && flat.type === 'file') {
          const base = flat.draft ?? flat.content;
          tabs = [...prev, {
            fileId: flat.fileId, name: flat.name,
            content: base, savedContent: flat.content, draftContent: flat.draft ?? null,
          }];
        }
      }

      return tabs.map((t) => {
        if (t.fileId !== change.fileId) return t;
        const base = t.draftContent ?? t.savedContent;
        const newContent = applyEditToContent(base, change);
        return { ...t, content: newContent, draftContent: newContent };
      });
    });

    setFlatFiles((prev) =>
      prev.map((f) => {
        if (f.fileId !== change.fileId) return f;
        const base = f.draft ?? f.content;
        const newDraft = applyEditToContent(base, change);
        const updated = { ...f, draft: newDraft };
        // Debounce IDB write — AI edits can be rapid
        scheduleIdbPersist(change.fileId);
        return updated;
      }),
    );
  }, [scheduleIdbPersist]);

  // ── Tree mutations — still call server for entity management ─────────────────

  const addFile = useCallback(async (parentId: string | null, name: string) => {
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'file', parentId }),
    });
    const { id } = await res.json() as { id: string };
    const newFile: LocalFile = {
      projectId, fileId: id, name, type: 'file',
      parentId, content: '', draft: null, order: Date.now(),
    };
    setFlatFiles((prev) => [...prev, newFile]);
    setOpenTabs((prev) => [...prev, {
      fileId: id, name, content: '', savedContent: '', draftContent: null,
    }]);
    setActiveFileIdState(id);
    await upsertLocalFile(newFile);
  }, [projectId]);

  const addFolder = useCallback(async (parentId: string | null, name: string) => {
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'folder', parentId }),
    });
    const { id } = await res.json() as { id: string };
    const newFolder: LocalFile = {
      projectId, fileId: id, name, type: 'folder',
      parentId, content: '', draft: null, order: Date.now(),
    };
    setFlatFiles((prev) => [...prev, newFolder]);
    await upsertLocalFile(newFolder);
  }, [projectId]);

  const renameNode = useCallback(async (nodeId: string, newName: string) => {
    setFlatFiles((prev) =>
      prev.map((f) => {
        if (f.fileId !== nodeId) return f;
        const updated = { ...f, name: newName };
        upsertLocalFile(updated).catch(console.error);
        return updated;
      }),
    );
    setOpenTabs((prev) => prev.map((t) => (t.fileId === nodeId ? { ...t, name: newName } : t)));
    await fetch(`/api/projects/${projectId}/files/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    }).catch(console.error);
  }, [projectId]);

  const deleteNode = useCallback(async (nodeId: string) => {
    const toRemove = new Set<string>();
    const queue = [nodeId];
    while (queue.length) {
      const id = queue.shift()!;
      toRemove.add(id);
      flatFilesRef.current
        .filter((f) => f.parentId === id)
        .forEach((f) => queue.push(f.fileId));
    }
    setFlatFiles((prev) => prev.filter((f) => !toRemove.has(f.fileId)));
    setOpenTabs((prev) => {
      const next = prev.filter((t) => !toRemove.has(t.fileId));
      setActiveFileIdState((active) =>
        active && toRemove.has(active) ? (next[0]?.fileId ?? null) : active,
      );
      return next;
    });
    // Remove from IndexedDB
    for (const id of toRemove) {
      deleteLocalFile(projectId, id).catch(console.error);
    }
    await fetch(`/api/projects/${projectId}/files/${nodeId}`, { method: 'DELETE' }).catch(console.error);
  }, [projectId]);

  const moveNode = useCallback(async (nodeId: string, newParentId: string | null) => {
    setFlatFiles((prev) =>
      prev.map((f) => {
        if (f.fileId !== nodeId) return f;
        const updated = { ...f, parentId: newParentId };
        upsertLocalFile(updated).catch(console.error);
        return updated;
      }),
    );
    await fetch(`/api/projects/${projectId}/files/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: newParentId }),
    }).catch(console.error);
  }, [projectId]);

  // ── Set draft directly (inline diff decline) ──────────────────────────────────

  const setFileDraft = useCallback(async (fileId: string, newDraft: string) => {
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.fileId === fileId ? { ...t, content: newDraft, draftContent: newDraft } : t,
      ),
    );
    setFlatFiles((prev) =>
      prev.map((f) => {
        if (f.fileId !== fileId) return f;
        const updated = { ...f, draft: newDraft };
        upsertLocalFile(updated).catch(console.error);
        return updated;
      }),
    );
  }, []);

  // ── Apply VCS snapshot to local working directory ─────────────────────────────
  // Called after: pull, checkout, merge, revert, restoreFilesFromHead.
  // Replaces local file content with the committed version from VCS HEAD.

  const applySnapshotToLocal = useCallback(async (updates: PullFileUpdate[]) => {
    const deleteIds = new Set(
      updates.filter((u) => u.snapshot === null).map((u) => u.fileId),
    );
    const upsertMap = new Map(
      updates
        .filter((u) => u.snapshot !== null)
        .map((u) => [u.fileId, u.snapshot!]),
    );

    // Batch IDB writes
    const idbOps: Promise<void>[] = [];

    setFlatFiles((prev) => {
      const next: LocalFile[] = [];
      for (const f of prev) {
        if (deleteIds.has(f.fileId)) {
          idbOps.push(deleteLocalFile(projectId, f.fileId));
          continue;
        }
        const snap = upsertMap.get(f.fileId);
        if (snap) {
          const updated: LocalFile = {
            ...f,
            name: snap.name,
            type: snap.type,
            parentId: snap.parentId,
            content: snap.content,
            draft: null, // clear any local draft — HEAD is now the baseline
            order: snap.order,
          };
          idbOps.push(upsertLocalFile(updated));
          next.push(updated);
        } else {
          next.push(f);
        }
      }
      // New files added by the snapshot that didn't exist locally
      for (const [fileId, snap] of upsertMap) {
        if (!prev.some((f) => f.fileId === fileId)) {
          const newFile: LocalFile = {
            projectId,
            fileId,
            name: snap.name,
            type: snap.type,
            parentId: snap.parentId,
            content: snap.content,
            draft: null,
            order: snap.order,
          };
          idbOps.push(upsertLocalFile(newFile));
          next.push(newFile);
        }
      }
      return next;
    });

    // Update open tabs to reflect snapshot changes
    setOpenTabs((prev) => {
      const next = prev.filter((t) => !deleteIds.has(t.fileId));
      return next.map((t) => {
        const snap = upsertMap.get(t.fileId);
        if (!snap) return t;
        return {
          ...t,
          name: snap.name,
          content: snap.content,
          savedContent: snap.content,
          draftContent: null,
        };
      });
    });

    // Close active tab if its file was removed
    setActiveFileIdState((active) => {
      if (!active || !deleteIds.has(active)) return active;
      return openTabsRef.current.find((t) => !deleteIds.has(t.fileId))?.fileId ?? null;
    });

    await Promise.all(idbOps).catch(console.error);
  }, [projectId]);

  // ── Soft file refresh (after AI creates/renames files server-side) ────────────
  // Merges server changes into local state without overwriting local content edits.

  const refreshFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      const serverFiles: ServerFile[] = await res.json();
      setFlatFiles((prev) => {
        const prevMap = new Map(prev.map((f) => [f.fileId, f]));
        const merged = serverFiles.map((sf) => {
          const existing = prevMap.get(sf.id);
          if (existing) {
            // Keep local content/draft; sync metadata changes (name, parentId, order)
            return { ...existing, name: sf.name, parentId: sf.parentId, order: sf.order };
          }
          return serverToLocal(projectId, sf);
        });
        // Persist any new files to IDB
        const newFiles = merged.filter((f) => !prevMap.has(f.fileId));
        for (const nf of newFiles) upsertLocalFile(nf).catch(console.error);
        return merged;
      });
    } catch { /* ignore */ }
  }, [projectId]);

  // ── Content accessors ──────────────────────────────────────────────────────────

  const getFileContent = useCallback((fileId: string): string => {
    const tab = openTabs.find((t) => t.fileId === fileId);
    if (tab) return tab.content;
    const flat = flatFilesRef.current.find((f) => f.fileId === fileId);
    return flat?.draft ?? flat?.content ?? '';
  }, [openTabs]);

  const getAllFiles = useCallback(() => {
    return flatFilesRef.current.map((f) => {
      const tab = openTabs.find((t) => t.fileId === f.fileId);
      return {
        fileId: f.fileId,
        fileName: f.name,
        type: f.type,
        parentId: f.parentId,
        content: f.type === 'file' ? (tab?.content ?? f.draft ?? f.content) : '',
      };
    });
  }, [openTabs]);

  const setActiveChatId = useCallback((id: string | null) => setActiveChatIdState(id), []);

  return {
    loading, error, projectName,
    files, openTabs, activeFileId, activeTab,
    unsavedIds, draftedIds,
    activeChatId, setActiveChatId,
    openFile, closeTab, closeTabs, setActiveFileId,
    updateContent, saveFile, saveAll,
    saveDraft, revertFileDraft, applyAIDraftEdit,
    addFile, addFolder, renameNode, deleteNode, moveNode,
    getFileContent, getAllFiles,
    refreshFiles,
    applySnapshotToLocal,
    setFileDraft,
  };
}
