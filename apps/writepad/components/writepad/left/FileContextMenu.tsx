'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  FilePlus, FolderPlus, Pencil, Trash2, Copy, FileText, FolderOpen,
  Clipboard, ClipboardCopy, Link, Layers, ExternalLink,
} from 'lucide-react';
import type { FileNode } from './types';

// ─── Single-node actions ──────────────────────────────────────────────────────

export interface FileContextMenuActions {
  onOpen?: (node: FileNode) => void;
  onNewFile?: (parentId: string) => void;
  onNewFolder?: (parentId: string) => void;
  onRename?: (node: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  onCopyPath?: (node: FileNode) => void;
  onCopyFile?: (node: FileNode) => void;
  onCopyRelativePath?: (node: FileNode) => void;
  /** Copy a shareable URL that opens this exact file on the current branch. */
  onCopyLink?: (node: FileNode) => void;
}

// ─── Multi-selection actions ──────────────────────────────────────────────────

export interface FileMultiSelectionActions {
  /** Open all selected files (folders are skipped). */
  onOpenAll: () => void;
  /** Delete all selected nodes (with confirmation). */
  onDeleteAll: () => void;
  /** Copy names of all selected nodes to clipboard. */
  onCopyNames: () => void;
  /** Copy file contents of all selected file nodes (folders skipped). */
  onCopyAllContents: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FileContextMenuProps {
  node: FileNode;
  children: React.ReactNode;
  actions: FileContextMenuActions;
  /**
   * When provided and length > 1 AND this node is included,
   * render the multi-selection context menu instead of the single-node menu.
   */
  selectedNodes?: FileNode[];
  multiActions?: FileMultiSelectionActions;
}

export function FileContextMenu({
  node,
  children,
  actions,
  selectedNodes,
  multiActions,
}: FileContextMenuProps) {
  const isFile = node.type === 'file';
  const isMultiMode =
    selectedNodes &&
    selectedNodes.length > 1 &&
    multiActions &&
    selectedNodes.some((n) => n.id === node.id);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      {isMultiMode ? (
        /* ── Multi-selection menu ─────────────────────────────────────────── */
        <ContextMenuContent className="w-56">
          <ContextMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers size={12} />
            <span>
              {selectedNodes!.length} items selected
              {selectedNodes!.filter((n) => n.type === 'file').length > 0 && (
                <span className="ml-1 text-[10px]">
                  ({selectedNodes!.filter((n) => n.type === 'file').length} file
                  {selectedNodes!.filter((n) => n.type === 'file').length !== 1 ? 's' : ''})
                </span>
              )}
            </span>
          </ContextMenuLabel>

          <ContextMenuSeparator />

          {selectedNodes!.some((n) => n.type === 'file') && (
            <ContextMenuItem onClick={() => multiActions!.onOpenAll()}>
              <ExternalLink size={13} /> Open All Files
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem
            variant="destructive"
            onClick={() => multiActions!.onDeleteAll()}
          >
            <Trash2 size={13} /> Delete {selectedNodes!.length} items
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Copy size={13} /> Copy
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44">
              <ContextMenuItem
                onClick={() => {
                  const names = selectedNodes!.map((n) => n.name).join('\n');
                  navigator.clipboard.writeText(names).catch(() => {});
                  multiActions!.onCopyNames();
                }}
              >
                <Clipboard size={13} /> Copy Names
              </ContextMenuItem>
              {selectedNodes!.some((n) => n.type === 'file') && (
                <ContextMenuItem onClick={() => multiActions!.onCopyAllContents()}>
                  <ClipboardCopy size={13} /> Copy All Contents
                </ContextMenuItem>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      ) : (
        /* ── Single-node menu ─────────────────────────────────────────────── */
        <ContextMenuContent className="w-52">
          <ContextMenuLabel className="flex items-center gap-1.5 text-xs">
            {isFile ? <FileText size={12} /> : <FolderOpen size={12} />}
            <span className="max-w-[140px] truncate">{node.name}</span>
          </ContextMenuLabel>

          <ContextMenuSeparator />

          {isFile && (
            <ContextMenuItem onClick={() => actions.onOpen?.(node)}>
              <FileText size={13} /> Open File
            </ContextMenuItem>
          )}

          {!isFile && (
            <>
              <ContextMenuItem onClick={() => actions.onNewFile?.(node.id)}>
                <FilePlus size={13} /> New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => actions.onNewFolder?.(node.id)}>
                <FolderPlus size={13} /> New Folder
              </ContextMenuItem>
            </>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem onClick={() => actions.onRename?.(node)}>
            <Pencil size={13} /> Rename…
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => actions.onDelete?.(node)}>
            <Trash2 size={13} /> Delete
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Copy size={13} /> Copy
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44">
              <ContextMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(node.name).catch(() => {});
                  actions.onCopyPath?.(node);
                }}
              >
                <Clipboard size={13} /> Copy Name
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(node.name).catch(() => {});
                  actions.onCopyRelativePath?.(node);
                }}
              >
                <Link size={13} /> Copy Relative Path
              </ContextMenuItem>
              {isFile && (
                <ContextMenuItem
                  onClick={() => {
                    if (node.content !== undefined) {
                      navigator.clipboard.writeText(node.content).catch(() => {});
                    }
                    actions.onCopyFile?.(node);
                  }}
                >
                  <ClipboardCopy size={13} /> Copy File Contents
                </ContextMenuItem>
              )}
              {isFile && actions.onCopyLink && (
                <ContextMenuItem onClick={() => actions.onCopyLink!(node)}>
                  <Link size={13} /> Copy File Link
                </ContextMenuItem>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
