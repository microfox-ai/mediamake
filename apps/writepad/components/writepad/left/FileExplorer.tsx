'use client';

import { useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Search, GitBranch, FilePlus, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileTreeNode } from './FileTreeNode';
import { GlobalSearch } from './GlobalSearch';
import { AgentsPanel } from './AgentsPanel';
import { FileOperationDialog, type DialogState } from './FileOperationDialog';
import { flattenFiles } from '@/components/writepad/utils';
import type { FileNode } from './types';
import type { FileContextMenuActions, FileMultiSelectionActions } from './FileContextMenu';

// ─── Sibling-name helpers ─────────────────────────────────────────────────────

function getSiblingNames(nodes: FileNode[], parentId: string | null, excludeId?: string): string[] {
  function findLevel(ns: FileNode[]): FileNode[] | null {
    if (parentId === null) return ns;
    for (const n of ns) {
      if (n.id === parentId) return n.children ?? [];
      if (n.children) {
        const found = findLevel(n.children);
        if (found !== null) return found;
      }
    }
    return null;
  }
  return (findLevel(nodes) ?? [])
    .filter((n) => n.id !== excludeId)
    .map((n) => n.name);
}

function findSiblingLevel(nodes: FileNode[], targetId: string): FileNode[] | null {
  if (nodes.some((n) => n.id === targetId)) return nodes;
  for (const n of nodes) {
    if (n.children) {
      if (n.children.some((c) => c.id === targetId)) return n.children;
      const found = findSiblingLevel(n.children, targetId);
      if (found !== null) return found;
    }
  }
  return null;
}

/** Depth-first pre-order traversal — returns all node IDs in visual tree order. */
function flattenAllNodeIds(nodes: FileNode[]): string[] {
  const result: string[] = [];
  function walk(ns: FileNode[]) {
    for (const n of ns) {
      result.push(n.id);
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return result;
}

/** Collect FileNode objects for a set of IDs (depth-first). */
function collectNodes(nodes: FileNode[], ids: Set<string>): FileNode[] {
  const result: FileNode[] = [];
  function walk(n: FileNode) {
    if (ids.has(n.id)) result.push(n);
    if (n.children) n.children.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FileExplorerProps {
  projectId: string;
  activeAgentId: string | null;
  files: FileNode[];
  activeFileId: string | null;
  unsavedIds: Set<string>;
  draftedIds: Set<string>;
  currentBranch?: string;
  onFileOpen: (node: FileNode) => void;
  onOpenDiff: (fileId: string) => void;
  onSearchSelect: (fileId: string, offset: number, query: string) => void;
  onReplaceOne?: (fileId: string, newContent: string, offset: number, query: string) => void;
  onReplaceAll?: (replacements: { fileId: string; newContent: string }[]) => void;
  onAddFile: (parentId: string | null, name: string) => void;
  onAddFolder: (parentId: string | null, name: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
  onMove: (nodeId: string, newParentId: string | null) => void;
  onOpenAgent: (agentId: string) => void;
  vcsPanel?: ReactNode;
}

type PanelView = 'explorer' | 'search' | 'agents' | 'vcs';

export function FileExplorer({
  projectId,
  activeAgentId,
  files,
  activeFileId,
  unsavedIds,
  draftedIds,
  currentBranch,
  onFileOpen,
  onOpenDiff,
  onSearchSelect,
  onReplaceOne,
  onReplaceAll,
  onAddFile,
  onAddFolder,
  onRename,
  onDelete,
  onMove,
  onOpenAgent,
  vcsPanel,
}: FileExplorerProps) {
  const [view, setView] = useState<PanelView>('explorer');
  const [search, setSearch] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  // ── Multi-selection state ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIdRef = useRef<string | null>(null);

  /** Flat list of all node IDs in visual depth-first order — used for Shift+Click range. */
  const allNodeIds = useMemo(() => flattenAllNodeIds(files), [files]);

  /** The actual FileNode objects for every selected ID — passed to context menu. */
  const selectedNodes = useMemo(
    () => collectNodes(files, selectedIds),
    [files, selectedIds],
  );

  /** Handle a click on any tree node (file or folder). */
  const handleNodeClick = useCallback(
    (node: FileNode, e: React.MouseEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (isCtrl) {
        // Toggle this node's selection without touching others
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(node.id)) next.delete(node.id);
          else next.add(node.id);
          return next;
        });
        lastClickedIdRef.current = node.id;
      } else if (isShift && lastClickedIdRef.current) {
        // Range-select between last clicked and current
        const lastIdx = allNodeIds.indexOf(lastClickedIdRef.current);
        const curIdx = allNodeIds.indexOf(node.id);
        if (lastIdx !== -1 && curIdx !== -1) {
          const start = Math.min(lastIdx, curIdx);
          const end = Math.max(lastIdx, curIdx);
          setSelectedIds(new Set(allNodeIds.slice(start, end + 1)));
        }
      } else {
        // Plain click — single select + open file
        setSelectedIds(new Set([node.id]));
        lastClickedIdRef.current = node.id;
        if (node.type === 'file') onFileOpen(node);
        // Folder expansion is handled internally by FileTreeNode
      }
    },
    [allNodeIds, onFileOpen],
  );

  // ── Context-menu actions (single-node) ───────────────────────────────────

  const actions: FileContextMenuActions = {
    onOpen: (node) => onFileOpen(node),
    onNewFile: (parentId) =>
      setDialog({ type: 'new-file', parentId, existingNames: getSiblingNames(files, parentId) }),
    onNewFolder: (parentId) =>
      setDialog({ type: 'new-folder', parentId, existingNames: getSiblingNames(files, parentId) }),
    onRename: (node) => {
      const level = findSiblingLevel(files, node.id) ?? [];
      setDialog({ type: 'rename', node, existingNames: level.filter((n) => n.id !== node.id).map((n) => n.name) });
    },
    onDelete: (node) => setDialog({ type: 'delete', node }),
    onCopyPath: (node) => navigator.clipboard.writeText(node.name).catch(() => {}),
    onCopyRelativePath: (node) => navigator.clipboard.writeText(node.name).catch(() => {}),
    onCopyFile: (node) => {
      if (node.content !== undefined) navigator.clipboard.writeText(node.content).catch(() => {});
    },
    onCopyLink: (node) => {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('file', node.id);
      if (currentBranch) url.searchParams.set('branch', currentBranch);
      navigator.clipboard.writeText(url.toString()).catch(() => {});
    },
  };

  // ── Multi-selection context-menu actions ─────────────────────────────────

  const multiActions: FileMultiSelectionActions = useMemo(
    () => ({
      onOpenAll: () => {
        for (const node of selectedNodes) {
          if (node.type === 'file') onFileOpen(node);
        }
      },
      onDeleteAll: () => {
        const count = selectedNodes.length;
        const names = selectedNodes.map((n) => `  • ${n.name}`).join('\n');
        if (
          !window.confirm(
            `Delete ${count} item${count !== 1 ? 's' : ''}?\n\n${names}\n\nThis cannot be undone.`,
          )
        ) return;
        // Delete each selected node. Deleting a folder auto-removes its children on the server.
        for (const node of selectedNodes) onDelete(node.id);
        setSelectedIds(new Set());
      },
      onCopyNames: () => {
        // already handled in FileContextMenu; this is a hook for extras if needed
      },
      onCopyAllContents: () => {
        const contents = selectedNodes
          .filter((n) => n.type === 'file')
          .map((n) => `// ${n.name}\n${n.content ?? ''}`)
          .join('\n\n');
        navigator.clipboard.writeText(contents).catch(() => {});
      },
    }),
    [selectedNodes, onFileOpen, onDelete],
  );

  const changedFiles =
    showDiff && (unsavedIds.size > 0 || draftedIds.size > 0)
      ? flattenFiles(files).filter((f) => unsavedIds.has(f.id) || draftedIds.has(f.id))
      : [];

  return (
    <div className="flex h-full flex-col bg-card select-none">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border">
        <div className="flex items-center px-2 py-1">
          <div className="flex items-center gap-0.5">
            {(['explorer', 'search', 'agents'] as PanelView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest transition-colors',
                  view === v
                    ? 'text-foreground/80'
                    : 'text-muted-foreground/50 hover:text-muted-foreground',
                )}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            {vcsPanel && (
              <button
                onClick={() => setView('vcs')}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest transition-colors',
                  view === 'vcs'
                    ? 'text-foreground/80'
                    : 'text-muted-foreground/50 hover:text-muted-foreground',
                )}
              >
                VCS
              </button>
            )}
          </div>
        </div>

        {/* Explorer-only second-row toolbar */}
        {view === 'explorer' && (
          <div className="flex items-center gap-0.5 border-t border-border/50 px-2 py-1">
            <button
              title="Toggle diff — unsaved changes"
              onClick={() => setShowDiff((x) => !x)}
              className={cn(
                'rounded p-1 transition-colors',
                showDiff ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground/40 hover:text-muted-foreground',
              )}
            >
              <GitBranch size={13} />
            </button>
            <button
              title="New File"
              onClick={() =>
                setDialog({ type: 'new-file', parentId: null, existingNames: getSiblingNames(files, null) })
              }
              className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <FilePlus size={13} />
            </button>
            <button
              title="New Folder"
              onClick={() =>
                setDialog({ type: 'new-folder', parentId: null, existingNames: getSiblingNames(files, null) })
              }
              className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <FolderPlus size={13} />
            </button>

            {/* Selection count indicator */}
            {selectedIds.size > 1 && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {view === 'search' ? (
        <GlobalSearch
          files={files}
          onSelect={onSearchSelect}
          onReplaceOne={onReplaceOne}
          onReplaceAll={onReplaceAll}
        />
      ) : view === 'vcs' && vcsPanel ? (
        <div className="min-h-0 flex-1">{vcsPanel}</div>
      ) : view === 'agents' ? (
        <div className="min-h-0 flex-1">
          <AgentsPanel projectId={projectId} activeAgentId={activeAgentId} onOpenAgent={onOpenAgent} />
        </div>
      ) : (
        <>
          {/* File name filter */}
          <div className="shrink-0 border-b border-border px-2 py-1.5">
            <div className="flex items-center gap-1.5 rounded bg-muted px-2 py-1">
              <Search size={11} className="text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Filter files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
            </div>
          </div>

          {/* Diff panel — unsaved + drafted changes */}
          {showDiff && changedFiles.length > 0 && (
            <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-2">
              <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                Changes — {changedFiles.length} file{changedFiles.length > 1 ? 's' : ''}
              </p>
              {changedFiles.map((f) => {
                const isUnsaved = unsavedIds.has(f.id);
                const isDrafted = draftedIds.has(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => onOpenDiff(f.id)}
                    className="flex w-full items-center gap-1.5 rounded py-0.5 px-1 text-[10px] text-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
                    title="Open diff view"
                  >
                    <span className={`font-mono ${isUnsaved ? 'text-amber-400' : 'text-violet-400'}`}>M</span>
                    <span className="flex-1 truncate text-left">{f.name}</span>
                    <div className="flex items-center gap-1">
                      {isUnsaved && (
                        <span className="rounded bg-amber-500/15 px-1 text-[9px] text-amber-400">unsaved</span>
                      )}
                      {isDrafted && !isUnsaved && (
                        <span className="rounded bg-violet-500/15 px-1 text-[9px] text-violet-400">draft</span>
                      )}
                      {isDrafted && isUnsaved && (
                        <span className="rounded bg-violet-500/15 px-1 text-[9px] text-violet-400">+draft</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi-select hint */}
          {selectedIds.size > 0 && (
            <div className="shrink-0 flex items-center justify-between border-b border-border/50 bg-primary/5 px-3 py-1">
              <span className="text-[10px] text-primary/80">
                {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
                <span className="ml-1 text-muted-foreground">— right-click for options</span>
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                title="Clear selection"
              >
                ✕
              </button>
            </div>
          )}

          {/* File tree */}
          <div
            className="flex-1 overflow-y-auto py-0.5"
            onClick={(e) => {
              // Clear selection when clicking the empty container area (not a node)
              if (e.target === e.currentTarget) setSelectedIds(new Set());
            }}
          >
            {files.map((node) => (
              <FileTreeNode
                key={node.id}
                node={node}
                depth={0}
                activeFileId={activeFileId}
                unsavedIds={unsavedIds}
                searchQuery={search}
                selectedIds={selectedIds}
                selectedNodes={selectedNodes}
                onNodeClick={handleNodeClick}
                actions={actions}
                multiActions={multiActions}
                onMove={onMove}
              />
            ))}
          </div>
        </>
      )}

      {/* ── File operation dialog ───────────────────────────────────────── */}
      <FileOperationDialog
        state={dialog}
        onClose={() => setDialog(null)}
        onNewFile={onAddFile}
        onNewFolder={onAddFolder}
        onRename={onRename}
        onDelete={onDelete}
      />
    </div>
  );
}
