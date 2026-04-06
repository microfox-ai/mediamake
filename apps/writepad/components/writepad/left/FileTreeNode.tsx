'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileContextMenu, type FileContextMenuActions } from './FileContextMenu';
import type { FileNode } from './types';

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  activeFileId: string | null;
  unsavedIds: Set<string>;
  searchQuery: string;
  onSelect: (node: FileNode) => void;
  actions: FileContextMenuActions;
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
  onSelect,
  actions,
  onMove,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  if (!nodeMatchesSearch(node, searchQuery)) return null;

  const indent = depth * 12;

  // ── Drag handlers ────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent) => {
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
    // Drop onto a folder → move inside it. Drop onto a file → move next to it.
    const targetParentId = node.type === 'folder' ? node.id : null;
    onMove(draggedId, targetParentId);
  };

  // ── Folder ───────────────────────────────────────────────────────────────

  if (node.type === 'folder') {
    return (
      <div>
        <FileContextMenu node={node} actions={{ ...actions, onOpen: undefined }}>
          <div
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => setExpanded((x) => !x)}
            style={{ paddingLeft: `${8 + indent}px` }}
            className={cn(
              'flex w-full items-center gap-1.5 rounded-sm py-[3px] pr-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer',
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
              onSelect={onSelect}
              actions={actions}
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
    <FileContextMenu node={node} actions={{ ...actions, onOpen: () => onSelect(node) }}>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onSelect(node)}
        style={{ paddingLeft: `${8 + indent}px` }}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-sm py-[3px] pr-2 text-left text-xs transition-colors cursor-pointer',
          isActive
            ? 'bg-primary/15 text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          dragOver && 'bg-violet-500/10',
        )}
      >
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
