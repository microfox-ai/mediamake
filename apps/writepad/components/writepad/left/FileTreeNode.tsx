'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileContextMenu, type FileContextMenuActions, type FileMultiSelectionActions } from './FileContextMenu';
import type { FileNode } from './types';

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  activeFileId: string | null;
  unsavedIds: Set<string>;
  searchQuery: string;
  /** IDs of all currently-selected nodes (for visual highlight). */
  selectedIds: Set<string>;
  /** Selected FileNode objects — used by the multi-selection context menu. */
  selectedNodes: FileNode[];
  /** Click handler that receives the node and the raw MouseEvent for modifier detection. */
  onNodeClick: (node: FileNode, e: React.MouseEvent) => void;
  actions: FileContextMenuActions;
  multiActions?: FileMultiSelectionActions;
  onMove: (nodeId: string, newParentId: string | null) => void;
}

function nodeMatchesSearch(node: FileNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (node.name.toLowerCase().includes(q)) return true;
  if (node.type === 'folder') {
    return node.children?.some((c) => nodeMatchesSearch(c, query)) ?? false;
  }
  return false;
}

export function FileTreeNode({
  node,
  depth,
  activeFileId,
  unsavedIds,
  searchQuery,
  selectedIds,
  selectedNodes,
  onNodeClick,
  actions,
  multiActions,
  onMove,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  if (!nodeMatchesSearch(node, searchQuery)) return null;

  const indent = depth * 12;
  const isSelected = selectedIds.has(node.id);

  // ── Drag handlers ────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent) => {
    // Don't start drag on ctrl/shift (modifier = selection intent)
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === node.id) return;
    const targetParentId = node.type === 'folder' ? node.id : null;
    onMove(draggedId, targetParentId);
  };

  // ── Folder ───────────────────────────────────────────────────────────────

  if (node.type === 'folder') {
    return (
      <div>
        <FileContextMenu
          node={node}
          actions={{ ...actions, onOpen: undefined }}
          selectedNodes={selectedNodes}
          multiActions={multiActions}
        >
          <div
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={(e) => {
              onNodeClick(node, e);
              // Toggle expansion only on plain click (not Ctrl/Shift/Meta)
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                setExpanded((x) => !x);
              }
            }}
            style={{ paddingLeft: `${8 + indent}px` }}
            className={cn(
              'flex w-full items-center gap-1.5 rounded-sm py-[3px] pr-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer',
              isSelected && 'bg-primary/10 text-foreground ring-1 ring-inset ring-primary/15',
              dragOver && 'bg-violet-500/10 ring-1 ring-inset ring-violet-500/40',
            )}
          >
            <span className="shrink-0 text-muted-foreground/40">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <span className="shrink-0 text-amber-600/70 dark:text-amber-400/70">
              {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
            </span>
            <span className="truncate font-medium">{node.name}</span>
          </div>
        </FileContextMenu>

        {expanded &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              unsavedIds={unsavedIds}
              searchQuery={searchQuery}
              selectedIds={selectedIds}
              selectedNodes={selectedNodes}
              onNodeClick={onNodeClick}
              actions={actions}
              multiActions={multiActions}
              onMove={onMove}
            />
          ))}
      </div>
    );
  }

  // ── File ─────────────────────────────────────────────────────────────────

  const isActive = node.id === activeFileId;
  const isUnsaved = unsavedIds.has(node.id);

  return (
    <FileContextMenu
      node={node}
      actions={{ ...actions, onOpen: () => actions.onOpen?.(node) }}
      selectedNodes={selectedNodes}
      multiActions={multiActions}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => onNodeClick(node, e)}
        style={{ paddingLeft: `${8 + indent}px` }}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-sm py-[3px] pr-2 text-left text-xs transition-colors cursor-pointer',
          isActive && !isSelected
            ? 'bg-primary/15 text-foreground'
            : isActive && isSelected
            ? 'bg-primary/25 text-foreground ring-1 ring-inset ring-primary/25'
            : isSelected
            ? 'bg-primary/10 text-foreground ring-1 ring-inset ring-primary/15'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          dragOver && 'bg-violet-500/10',
        )}
      >
        {/* Spacer aligns file icons with folder icons */}
        <span className="shrink-0 w-3" />
        <span className="shrink-0 text-sky-600/70 dark:text-sky-400/70">
          <FileText size={13} />
        </span>
        <span className="flex-1 truncate">{node.name}</span>
        {isUnsaved && (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="Unsaved" />
        )}
      </div>
    </FileContextMenu>
  );
}
