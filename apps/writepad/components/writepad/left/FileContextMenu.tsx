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
  FilePlus, FolderPlus, Pencil, Trash2, Copy, FileText, FolderOpen, Clipboard, ClipboardCopy, Link,
} from 'lucide-react';
import type { FileNode } from './types';

export interface FileContextMenuActions {
  onOpen?: (node: FileNode) => void;
  onNewFile?: (parentId: string) => void;
  onNewFolder?: (parentId: string) => void;
  onRename?: (node: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  onCopyPath?: (node: FileNode) => void;
  onCopyFile?: (node: FileNode) => void;
  onCopyRelativePath?: (node: FileNode) => void;
}

interface FileContextMenuProps {
  node: FileNode;
  children: React.ReactNode;
  actions: FileContextMenuActions;
}

export function FileContextMenu({ node, children, actions }: FileContextMenuProps) {
  const isFile = node.type === 'file';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

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
            <ContextMenuItem onClick={() => { navigator.clipboard.writeText(node.name).catch(() => {}); actions.onCopyPath?.(node); }}>
              <Clipboard size={13} /> Copy Name
            </ContextMenuItem>
            <ContextMenuItem onClick={() => { navigator.clipboard.writeText(node.name).catch(() => {}); actions.onCopyRelativePath?.(node); }}>
              <Link size={13} /> Copy Relative Path
            </ContextMenuItem>
            {isFile && (
              <ContextMenuItem onClick={() => { if (node.content !== undefined) navigator.clipboard.writeText(node.content).catch(() => {}); actions.onCopyFile?.(node); }}>
                <ClipboardCopy size={13} /> Copy File Contents
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}
