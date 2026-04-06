import { useState, useCallback, useMemo, useEffect } from 'react';
import type { FileNode } from '@/components/writepad/left/types';
import type { OpenTab } from '@/components/writepad/middle/types';
import { flattenFiles } from '@/components/writepad/utils';

export { flattenFiles };

// ─── Tree mutation helpers ────────────────────────────────────────────────────

function insertNode(nodes: FileNode[], parentId: string | null, newNode: FileNode): FileNode[] {
  if (parentId === null) return [...nodes, newNode];
  return nodes.map((n) => {
    if (n.id === parentId && n.type === 'folder')
      return { ...n, children: [...(n.children ?? []), newNode] };
    if (n.children) return { ...n, children: insertNode(n.children, parentId, newNode) };
    return n;
  });
}

function renameInTree(nodes: FileNode[], nodeId: string, newName: string): FileNode[] {
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, name: newName };
    if (n.children) return { ...n, children: renameInTree(n.children, nodeId, newName) };
    return n;
  });
}

function deleteFromTree(nodes: FileNode[], nodeId: string): FileNode[] {
  return nodes
    .filter((n) => n.id !== nodeId)
    .map((n) => (n.children ? { ...n, children: deleteFromTree(n.children, nodeId) } : n));
}

function moveInTree(nodes: FileNode[], nodeId: string, newParentId: string | null): FileNode[] {
  let extracted: FileNode | null = null;
  function extract(list: FileNode[]): FileNode[] {
    return list
      .filter((n) => { if (n.id === nodeId) { extracted = n; return false; } return true; })
      .map((n) => (n.children ? { ...n, children: extract(n.children) } : n));
  }
  const withoutNode = extract(nodes);
  if (!extracted) return nodes;
  return insertNode(withoutNode, newParentId, extracted!);
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface ProjectState {
  files: FileNode[];
  openTabs: OpenTab[];
  activeFileId: string | null;
  activeTab: OpenTab | null;
  unsavedIds: Set<string>;
  openFile: (node: FileNode) => void;
  closeTab: (fileId: string) => void;
  setActiveFileId: (id: string) => void;
  updateContent: (fileId: string, content: string) => void;
  saveFile: (fileId: string) => void;
  saveAll: () => void;
  addFile: (parentId: string | null, name: string) => void;
  addFolder: (parentId: string | null, name: string) => void;
  renameNode: (nodeId: string, newName: string) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string | null) => void;
}

export function useProjectState(initialFiles: FileNode[]): ProjectState {
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const allFiles = flattenFiles(initialFiles);
    if (allFiles.length > 0) {
      const first = allFiles[0];
      const tab: OpenTab = {
        fileId: first.id,
        name: first.name,
        content: first.content ?? '',
        savedContent: first.content ?? '',
      };
      setOpenTabs([tab]);
      setActiveFileId(first.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFile = useCallback((node: FileNode) => {
    if (node.type !== 'file') return;
    setOpenTabs((prev) => {
      if (prev.some((t) => t.fileId === node.id)) return prev;
      return [...prev, { fileId: node.id, name: node.name, content: node.content ?? '', savedContent: node.content ?? '' }];
    });
    setActiveFileId(node.id);
  }, []);

  const closeTab = useCallback((fileId: string) => {
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.fileId === fileId);
      const next = prev.filter((t) => t.fileId !== fileId);
      if (activeFileId === fileId) setActiveFileId(next[idx]?.fileId ?? next[idx - 1]?.fileId ?? null);
      return next;
    });
    setUnsavedIds((prev) => { const s = new Set(prev); s.delete(fileId); return s; });
  }, [activeFileId]);

  const updateContent = useCallback((fileId: string, content: string) => {
    setOpenTabs((prev) => prev.map((t) => (t.fileId === fileId ? { ...t, content } : t)));
    setUnsavedIds((prev) => new Set([...prev, fileId]));
  }, []);

  const saveFile = useCallback((fileId: string) => {
    setOpenTabs((prev) => prev.map((t) => (t.fileId === fileId ? { ...t, savedContent: t.content } : t)));
    setUnsavedIds((prev) => { const s = new Set(prev); s.delete(fileId); return s; });
  }, []);

  const saveAll = useCallback(() => {
    setOpenTabs((prev) => prev.map((t) => ({ ...t, savedContent: t.content })));
    setUnsavedIds(new Set());
  }, []);

  const addFile = useCallback((parentId: string | null, name: string) => {
    setFiles((prev) => insertNode(prev, parentId, { id: makeId(), name, type: 'file', content: '' }));
  }, []);

  const addFolder = useCallback((parentId: string | null, name: string) => {
    setFiles((prev) => insertNode(prev, parentId, { id: makeId(), name, type: 'folder', children: [] }));
  }, []);

  const renameNode = useCallback((nodeId: string, newName: string) => {
    setFiles((prev) => renameInTree(prev, nodeId, newName));
    setOpenTabs((prev) => prev.map((t) => (t.fileId === nodeId ? { ...t, name: newName } : t)));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setFiles((prev) => deleteFromTree(prev, nodeId));
    // Close the tab if open
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.fileId !== nodeId);
      if (activeFileId === nodeId) setActiveFileId(next[0]?.fileId ?? null);
      return next;
    });
    setUnsavedIds((prev) => { const s = new Set(prev); s.delete(nodeId); return s; });
  }, [activeFileId]);

  const moveNode = useCallback((nodeId: string, newParentId: string | null) => {
    setFiles((prev) => moveInTree(prev, nodeId, newParentId));
  }, []);

  const activeTab = useMemo(
    () => openTabs.find((t) => t.fileId === activeFileId) ?? null,
    [openTabs, activeFileId],
  );

  return {
    files, openTabs, activeFileId, activeTab, unsavedIds,
    openFile, closeTab, setActiveFileId, updateContent, saveFile, saveAll,
    addFile, addFolder, renameNode, deleteNode, moveNode,
  };
}
