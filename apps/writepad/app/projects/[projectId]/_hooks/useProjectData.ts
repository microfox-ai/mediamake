'use client';

/**
 * useProjectData — API-backed project state with localStorage UI persistence.
 *
 * Three file states:
 *   unsaved  — in-memory content (lost on refresh, prompt before leaving)
 *   draft    — staged changes (AI edits land here automatically; manual "Save Draft" too)
 *   saved    — committed to DB
 *
 * AI edits use applyAIDraftEdit() → applies sequentially to draft via functional
 * state update so concurrent edits don't race.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { FileNode } from '@/components/writepad/left/types';
import type { OpenTab } from '@/components/writepad/middle/types';
import type { AIChange } from '@/components/writepad/right/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content: string;
  /** Staged draft content from DB, null if no draft exists. */
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
  /** fileIds with unsaved edits (content !== draftContent ?? savedContent). */
  unsavedIds: Set<string>;
  /** fileIds with staged draft changes (draftContent !== null && !== savedContent). */
  draftedIds: Set<string>;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  openFile: (node: FileNode) => void;
  closeTab: (fileId: string) => void;
  setActiveFileId: (id: string) => void;
  updateContent: (fileId: string, content: string) => void;
  /** Commit current editor content to saved state in DB. Clears draft. */
  saveFile: (fileId: string) => void;
  saveAll: () => void;
  /** Stage current editor content as draft (without committing to saved). */
  saveDraft: (fileId: string) => void;
  /** Revert draft to saved state, clearing all AI edits for this file. */
  revertFileDraft: (fileId: string) => void;
  /**
   * Apply an AI-proposed edit to the draft state.
   * Uses functional state update so sequential calls don't race.
   */
  applyAIDraftEdit: (change: AIChange) => void;
  addFile: (parentId: string | null, name: string) => void;
  addFolder: (parentId: string | null, name: string) => void;
  renameNode: (nodeId: string, newName: string) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string | null) => void;
  getFileContent: (fileId: string) => string;
  getAllFiles: () => Array<{ fileId: string; fileName: string; content: string; type: 'file' | 'folder'; parentId: string | null }>;
  /** Re-fetch files from server (call after AI creates/deletes files). */
  refreshFiles: () => Promise<void>;
  /** Directly set draft content for a file (used by inline diff decline). */
  setFileDraft: (fileId: string, newDraft: string) => Promise<void>;
}

// ─── localStorage ─────────────────────────────────────────────────────────────

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

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(flat: FlatFile[]): FileNode[] {
  const map = new Map<string, FileNode>();
  const roots: FileNode[] = [];
  for (const f of flat) {
    map.set(f.id, {
      id: f.id, name: f.name, type: f.type,
      content: f.type === 'file' ? (f.draft ?? f.content) : undefined,
      children: f.type === 'folder' ? [] : undefined,
    });
  }
  for (const f of flat) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) map.get(f.parentId)!.children!.push(node);
    else roots.push(node);
  }
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

// ─── Apply AI edit helper (pure) ──────────────────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectData(projectId: string): ProjectDataState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [flatFiles, setFlatFiles] = useState<FlatFile[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeFileId, setActiveFileIdState] = useState<string | null>(null);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);

  const flatFilesRef = useRef<FlatFile[]>([]);
  flatFilesRef.current = flatFiles;

  const openTabsRef = useRef<OpenTab[]>([]);
  openTabsRef.current = openTabs;

  // Debounced draft persist — avoids a flood of PUTs when AI applies many edits
  const draftTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const scheduleDraftPersist = useCallback((fileId: string) => {
    const existing = draftTimers.current.get(fileId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      draftTimers.current.delete(fileId);
      const flat = flatFilesRef.current.find((f) => f.id === fileId);
      if (flat && flat.draft !== null) {
        fetch(`/api/projects/${projectId}/files/${fileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: flat.draft }),
        }).catch(console.error);
      }
    }, 1500);
    draftTimers.current.set(fileId, timer);
  }, [projectId]);

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/files`).then((r) => r.json()),
    ])
      .then(([project, files]: [{ name?: string; error?: string }, FlatFile[]]) => {
        if (project.error) { setError(project.error); return; }
        setProjectName(project.name ?? '');
        setFlatFiles(files ?? []);

        const ui = loadUIState(projectId);
        setActiveChatIdState(ui.activeChatId);

        const fileMap = new Map((files ?? []).map((f) => [f.id, f]));
        const restoredTabs: OpenTab[] = (ui.openTabIds ?? [])
          .map((id) => {
            const f = fileMap.get(id);
            if (!f || f.type !== 'file') return null;
            const base = f.draft ?? f.content;
            return { fileId: f.id, name: f.name, content: base, savedContent: f.content, draftContent: f.draft ?? null };
          })
          .filter(Boolean) as OpenTab[];

        if (restoredTabs.length > 0) {
          setOpenTabs(restoredTabs);
          const activeId = ui.activeFileId && fileMap.has(ui.activeFileId)
            ? ui.activeFileId
            : restoredTabs[0].fileId;
          setActiveFileIdState(activeId);
        } else {
          const first = (files ?? []).find((f) => f.type === 'file');
          if (first) {
            const base = first.draft ?? first.content;
            setOpenTabs([{ fileId: first.id, name: first.name, content: base, savedContent: first.content, draftContent: first.draft ?? null }]);
            setActiveFileIdState(first.id);
          }
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Persist UI state ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    saveUIState(projectId, { openTabIds: openTabs.map((t) => t.fileId), activeFileId, activeChatId });
  }, [projectId, openTabs, activeFileId, activeChatId, loading]);

  // ── Derived ──────────────────────────────────────────────────────────────────

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

  // ── Tab management ───────────────────────────────────────────────────────────

  const setActiveFileId = useCallback((id: string) => setActiveFileIdState(id), []);

  const openFile = useCallback((node: FileNode) => {
    if (node.type !== 'file') return;
    setOpenTabs((prev) => {
      if (prev.some((t) => t.fileId === node.id)) return prev;
      const flat = flatFilesRef.current.find((f) => f.id === node.id);
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

  const updateContent = useCallback((fileId: string, content: string) => {
    setOpenTabs((prev) => prev.map((t) => (t.fileId === fileId ? { ...t, content } : t)));
  }, []);

  // ── Save (commit draft → saved, clear draft) ─────────────────────────────────

  const saveFile = useCallback(async (fileId: string) => {
    // Read current content from ref — avoids stale-closure bug when openTabs updates
    const tab = openTabsRef.current.find((t) => t.fileId === fileId);
    if (!tab) return;
    const contentToSave = tab.content;

    // Clear any pending draft-persist timer for this file
    const existing = draftTimers.current.get(fileId);
    if (existing) { clearTimeout(existing); draftTimers.current.delete(fileId); }

    setOpenTabs((prev) =>
      prev.map((t) =>
        t.fileId === fileId ? { ...t, savedContent: contentToSave, draftContent: null } : t,
      ),
    );
    setFlatFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content: contentToSave, draft: null } : f)),
    );
    await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: contentToSave, draft: null }),
    }).catch(console.error);
  }, [projectId, draftTimers]);

  const saveAll = useCallback(async () => {
    for (const tab of openTabsRef.current) {
      const base = tab.draftContent ?? tab.savedContent;
      if (tab.content !== base || tab.draftContent !== null) {
        await saveFile(tab.fileId);
      }
    }
  }, [saveFile]);

  // ── Draft management ─────────────────────────────────────────────────────────

  const saveDraft = useCallback(async (fileId: string) => {
    let newDraft = '';
    setOpenTabs((prev) => {
      return prev.map((t) => {
        if (t.fileId !== fileId) return t;
        newDraft = t.content;
        return { ...t, draftContent: t.content };
      });
    });
    setFlatFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, draft: newDraft } : f)),
    );
    await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: newDraft }),
    }).catch(console.error);
  }, [projectId]);

  const revertFileDraft = useCallback(async (fileId: string) => {
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.fileId === fileId ? { ...t, content: t.savedContent, draftContent: null } : t,
      ),
    );
    setFlatFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, draft: null } : f)),
    );
    await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: null }),
    }).catch(console.error);
  }, [projectId]);

  /**
   * Apply an AI edit to the draft state using a functional update — each
   * sequential call operates on the result of the previous one, eliminating
   * the race condition when multiple edits arrive for the same file.
   */
  const applyAIDraftEdit = useCallback((change: AIChange) => {
    // Open the file tab if not already open (so the edit is visible)
    setOpenTabs((prev) => {
      const existing = prev.find((t) => t.fileId === change.fileId);
      let tabs = prev;

      if (!existing) {
        const flat = flatFilesRef.current.find((f) => f.id === change.fileId);
        if (flat && flat.type === 'file') {
          const base = flat.draft ?? flat.content;
          tabs = [...prev, {
            fileId: flat.id, name: flat.name,
            content: base, savedContent: flat.content, draftContent: flat.draft ?? null,
          }];
        }
      }

      return tabs.map((t) => {
        if (t.fileId !== change.fileId) return t;
        // Apply to current draft (or saved if no draft) — respects prior edits
        const base = t.draftContent ?? t.savedContent;
        const newContent = applyEditToContent(base, change);
        return { ...t, content: newContent, draftContent: newContent };
      });
    });

    // Sync flatFiles so getFileContent / tree stays fresh
    setFlatFiles((prev) =>
      prev.map((f) => {
        if (f.id !== change.fileId) return f;
        const base = f.draft ?? f.content;
        const newDraft = applyEditToContent(base, change);
        return { ...f, draft: newDraft };
      }),
    );

    // Debounced persist — coalesces rapid sequential AI edits into a single PUT
    scheduleDraftPersist(change.fileId);
  }, [projectId, scheduleDraftPersist]);

  // ── Tree mutations ────────────────────────────────────────────────────────────

  const addFile = useCallback(async (parentId: string | null, name: string) => {
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'file', parentId }),
    });
    const { id } = await res.json() as { id: string };
    setFlatFiles((prev) => [...prev, { id, name, type: 'file', parentId, content: '', draft: null, order: Date.now() }]);
    setOpenTabs((prev) => [...prev, { fileId: id, name, content: '', savedContent: '', draftContent: null }]);
    setActiveFileIdState(id);
  }, [projectId]);

  const addFolder = useCallback(async (parentId: string | null, name: string) => {
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'folder', parentId }),
    });
    const { id } = await res.json() as { id: string };
    setFlatFiles((prev) => [...prev, { id, name, type: 'folder', parentId, content: '', draft: null, order: Date.now() }]);
  }, [projectId]);

  const renameNode = useCallback(async (nodeId: string, newName: string) => {
    setFlatFiles((prev) => prev.map((f) => (f.id === nodeId ? { ...f, name: newName } : f)));
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
      flatFilesRef.current.filter((f) => f.parentId === id).forEach((f) => queue.push(f.id));
    }
    setFlatFiles((prev) => prev.filter((f) => !toRemove.has(f.id)));
    setOpenTabs((prev) => {
      const next = prev.filter((t) => !toRemove.has(t.fileId));
      setActiveFileIdState((active) =>
        active && toRemove.has(active) ? (next[0]?.fileId ?? null) : active,
      );
      return next;
    });
    await fetch(`/api/projects/${projectId}/files/${nodeId}`, { method: 'DELETE' }).catch(console.error);
  }, [projectId]);

  const moveNode = useCallback(async (nodeId: string, newParentId: string | null) => {
    setFlatFiles((prev) =>
      prev.map((f) => (f.id === nodeId ? { ...f, parentId: newParentId } : f)),
    );
    await fetch(`/api/projects/${projectId}/files/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: newParentId }),
    }).catch(console.error);
  }, [projectId]);

  // ── Set draft directly (used by inline diff decline) ─────────────────────────

  const setFileDraft = useCallback(async (fileId: string, newDraft: string) => {
    setOpenTabs((prev) => prev.map((t) =>
      t.fileId === fileId ? { ...t, content: newDraft, draftContent: newDraft } : t,
    ));
    setFlatFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, draft: newDraft } : f));
    await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: newDraft }),
    }).catch(console.error);
  }, [projectId]);

  // ── File refresh (after AI creates files) ────────────────────────────────────

  const refreshFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      const files: FlatFile[] = await res.json();
      setFlatFiles((prev) => {
        const prevMap = new Map(prev.map((f) => [f.id, f]));
        // Keep local draft state for existing files; add new files at their server state
        return files.map((f) => {
          const existing = prevMap.get(f.id);
          return existing ? { ...f, draft: existing.draft } : f;
        });
      });
    } catch { /* ignore */ }
  }, [projectId]);

  // ── Content accessors ─────────────────────────────────────────────────────────

  const getFileContent = useCallback((fileId: string): string => {
    const tab = openTabs.find((t) => t.fileId === fileId);
    if (tab) return tab.content;
    const flat = flatFilesRef.current.find((f) => f.id === fileId);
    return flat?.draft ?? flat?.content ?? '';
  }, [openTabs]);

  const getAllFiles = useCallback(() => {
    return flatFilesRef.current.map((f) => {
      const tab = openTabs.find((t) => t.fileId === f.id);
      return {
        fileId: f.id,
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
    openFile, closeTab, setActiveFileId,
    updateContent, saveFile, saveAll,
    saveDraft, revertFileDraft, applyAIDraftEdit,
    addFile, addFolder, renameNode, deleteNode, moveNode,
    getFileContent, getAllFiles, refreshFiles, setFileDraft,
  };
}
