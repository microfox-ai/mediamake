'use client';

import { useState } from 'react';
import { Search, GitBranch, FilePlus, FolderPlus, SearchCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileTreeNode } from './FileTreeNode';
import { GlobalSearch } from './GlobalSearch';
import { FileOperationDialog, type DialogState } from './FileOperationDialog';
import { flattenFiles } from '@/components/writepad/utils';
import type { FileNode } from './types';
import type { FileContextMenuActions } from './FileContextMenu';
import type { OpenTab } from '@/components/writepad/middle/types';

interface FileExplorerProps {
  files: FileNode[];
  activeFileId: string | null;
  unsavedIds: Set<string>;
  draftedIds: Set<string>;
  openTabs: OpenTab[];
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
}

type PanelView = 'explorer' | 'search';

export function FileExplorer({
  files,
  activeFileId,
  unsavedIds,
  draftedIds,
  openTabs,
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
}: FileExplorerProps) {
  const [view, setView] = useState<PanelView>('explorer');
  const [search, setSearch] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  const changedFiles =
    showDiff && (unsavedIds.size > 0 || draftedIds.size > 0)
      ? flattenFiles(files).filter((f) => unsavedIds.has(f.id) || draftedIds.has(f.id))
      : [];

  // ── Context menu actions (routed to dialogs / parent callbacks) ──────────

  const actions: FileContextMenuActions = {
    onOpen: (node) => onFileOpen(node),
    onNewFile: (parentId) => setDialog({ type: 'new-file', parentId }),
    onNewFolder: (parentId) => setDialog({ type: 'new-folder', parentId }),
    onRename: (node) => setDialog({ type: 'rename', node }),
    onDelete: (node) => setDialog({ type: 'delete', node }),
    onCopyPath: (node) => navigator.clipboard.writeText(node.name).catch(() => {}),
    onCopyRelativePath: (node) => navigator.clipboard.writeText(node.name).catch(() => {}),
    onCopyFile: (node) => { if (node.content !== undefined) navigator.clipboard.writeText(node.content).catch(() => {}); },
  };

  return (
    <div className="flex h-full flex-col bg-card select-none">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-1">
        {/* View tabs */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setView('explorer')}
            className={cn(
              'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest transition-colors',
              view === 'explorer' ? 'text-foreground/80' : 'text-muted-foreground/50 hover:text-muted-foreground',
            )}
          >
            Explorer
          </button>
          <button
            onClick={() => setView('search')}
            className={cn(
              'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest transition-colors',
              view === 'search' ? 'text-foreground/80' : 'text-muted-foreground/50 hover:text-muted-foreground',
            )}
          >
            Search
          </button>
        </div>

        {/* Action buttons (explorer only) */}
        {view === 'explorer' && (
          <div className="flex items-center gap-0.5">
            <button
              title="Toggle diff — unsaved changes"
              onClick={() => setShowDiff((x) => !x)}
              className={cn('rounded p-1 transition-colors', showDiff ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground/40 hover:text-muted-foreground')}
            >
              <GitBranch size={13} />
            </button>
            <button
              title="New File"
              onClick={() => setDialog({ type: 'new-file', parentId: null })}
              className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <FilePlus size={13} />
            </button>
            <button
              title="New Folder"
              onClick={() => setDialog({ type: 'new-folder', parentId: null })}
              className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <FolderPlus size={13} />
            </button>
            <button
              title="Global search"
              onClick={() => setView('search')}
              className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <SearchCode size={13} />
            </button>
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

          {/* File tree */}
          <div className="flex-1 overflow-y-auto py-0.5">
            {files.map((node) => (
              <FileTreeNode
                key={node.id}
                node={node}
                depth={0}
                activeFileId={activeFileId}
                unsavedIds={unsavedIds}
                searchQuery={search}
                onSelect={onFileOpen}
                actions={actions}
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
