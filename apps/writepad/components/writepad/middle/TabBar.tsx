'use client';

import { X, GitCompare, GitBranch, Save, RotateCcw, Copy, FileText, Link, ClipboardCopy, FileDiff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { OpenTab } from './types';

export interface DiffTabInfo {
  label: string;
  kind: 'diff' | 'commit' | 'all-changes';
  onClose: () => void;
}

interface TabBarProps {
  tabs: OpenTab[];
  activeFileId: string | null;
  unsavedIds: Set<string>;
  draftedIds?: Set<string>;
  onSelect: (fileId: string) => void;
  onClose: (fileId: string) => void;
  /** When set, a special diff/commit tab is shown as active at the end of the tab list. */
  diffTab?: DiffTabInfo | null;
  /** Batch-close multiple tabs at once (for "close others", "close all", etc.) */
  onCloseTabs?: (fileIds: string[]) => void;
  /** Save the file for this tab. */
  onSaveTab?: (fileId: string) => void;
  /** Revert draft/unsaved changes for this tab. */
  onRevertTab?: (fileId: string) => void;
  /** Open the diff view for this tab's file. */
  onOpenDiff?: (fileId: string) => void;
  /** Copy a shareable link to this file. */
  onCopyLink?: (fileId: string) => void;
}

export function TabBar({
  tabs,
  activeFileId,
  unsavedIds,
  draftedIds,
  onSelect,
  onClose,
  diffTab,
  onCloseTabs,
  onSaveTab,
  onRevertTab,
  onOpenDiff,
  onCopyLink,
}: TabBarProps) {
  if (tabs.length === 0 && !diffTab) return null;

  return (
    <div className="flex shrink-0 items-center overflow-x-auto bg-muted border-b border-border">
      {tabs.map((tab, idx) => {
        const isActive = !diffTab && tab.fileId === activeFileId;
        const isUnsaved = unsavedIds.has(tab.fileId);
        const isDrafted = draftedIds?.has(tab.fileId) ?? false;
        const hasChanges = isUnsaved || isDrafted;

        // ── Compute close-group targets ──────────────────────────────────
        const otherIds = tabs.filter((t) => t.fileId !== tab.fileId).map((t) => t.fileId);
        const toRightIds = tabs.slice(idx + 1).map((t) => t.fileId);
        const savedIds = tabs
          .filter((t) => !unsavedIds.has(t.fileId) && !(draftedIds?.has(t.fileId) ?? false))
          .map((t) => t.fileId);
        const allIds = tabs.map((t) => t.fileId);

        return (
          <ContextMenu key={tab.fileId}>
            <ContextMenuTrigger asChild>
              <div
                onClick={() => onSelect(tab.fileId)}
                className={cn(
                  'group relative flex shrink-0 cursor-pointer items-center gap-1.5 border-r border-border px-3 py-2 text-[12px] transition-colors',
                  isActive
                    ? 'border-t border-t-violet-500 bg-background text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <span className="max-w-[120px] truncate">{tab.name}</span>

                <button
                  onClick={(e) => { e.stopPropagation(); onClose(tab.fileId); }}
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors',
                    hasChanges
                      ? 'text-muted-foreground'
                      : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground',
                  )}
                  title="Close tab"
                >
                  {isUnsaved ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 group-hover:hidden" />
                      <X size={11} className="hidden group-hover:block" />
                    </>
                  ) : isDrafted ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 group-hover:hidden" title="Has draft changes" />
                      <X size={11} className="hidden group-hover:block" />
                    </>
                  ) : (
                    <X size={11} />
                  )}
                </button>
              </div>
            </ContextMenuTrigger>

            {/* ── Tab context menu ──────────────────────────────────────── */}
            <ContextMenuContent className="w-56">
              {/* File name header */}
              <ContextMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText size={12} className="shrink-0" />
                <span className="truncate">{tab.name}</span>
              </ContextMenuLabel>

              <ContextMenuSeparator />

              {/* Close group */}
              <ContextMenuItem onClick={() => onClose(tab.fileId)}>
                Close
                <ContextMenuShortcut>Ctrl+W</ContextMenuShortcut>
              </ContextMenuItem>

              <ContextMenuItem
                disabled={otherIds.length === 0}
                onClick={() => onCloseTabs?.(otherIds)}
              >
                Close Others
              </ContextMenuItem>

              <ContextMenuItem
                disabled={toRightIds.length === 0}
                onClick={() => onCloseTabs?.(toRightIds)}
              >
                Close to the Right
              </ContextMenuItem>

              <ContextMenuItem
                disabled={savedIds.length === 0}
                onClick={() => onCloseTabs?.(savedIds)}
              >
                Close Saved
              </ContextMenuItem>

              <ContextMenuItem
                disabled={allIds.length === 0}
                onClick={() => onCloseTabs?.(allIds)}
              >
                Close All
              </ContextMenuItem>

              <ContextMenuSeparator />

              {/* File actions */}
              <ContextMenuItem
                disabled={!hasChanges}
                onClick={() => { if (hasChanges) onSaveTab?.(tab.fileId); }}
              >
                <Save size={13} />
                Save
                <ContextMenuShortcut>Ctrl+S</ContextMenuShortcut>
              </ContextMenuItem>

              <ContextMenuItem
                disabled={!hasChanges}
                onClick={() => { if (hasChanges) onRevertTab?.(tab.fileId); }}
              >
                <RotateCcw size={13} />
                Revert Changes
              </ContextMenuItem>

              {onOpenDiff && (
                <ContextMenuItem
                  disabled={!hasChanges}
                  onClick={() => { if (hasChanges) onOpenDiff(tab.fileId); }}
                >
                  <FileDiff size={13} />
                  View Diff
                </ContextMenuItem>
              )}

              <ContextMenuSeparator />

              {/* Copy actions */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Copy size={13} />
                  Copy
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-44">
                  <ContextMenuItem
                    onClick={() => navigator.clipboard.writeText(tab.name).catch(() => {})}
                  >
                    <FileText size={13} />
                    Copy Name
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => navigator.clipboard.writeText(tab.content).catch(() => {})}
                  >
                    <ClipboardCopy size={13} />
                    Copy Content
                  </ContextMenuItem>
                  {onCopyLink && (
                    <ContextMenuItem onClick={() => onCopyLink(tab.fileId)}>
                      <Link size={13} />
                      Copy File Link
                    </ContextMenuItem>
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}

      {/* Diff / commit virtual tab — always "active" */}
      {diffTab && (
        <div
          className={cn(
            'group relative flex shrink-0 items-center gap-1.5 border-r border-border px-3 py-2 text-[12px]',
            'border-t-2 bg-background text-foreground',
            diffTab.kind === 'commit'
              ? 'border-t-violet-500'
              : 'border-t-amber-500',
          )}
        >
          {diffTab.kind === 'commit' ? (
            <GitBranch size={11} className="shrink-0 text-violet-400" />
          ) : (
            <GitCompare size={11} className="shrink-0 text-amber-500" />
          )}
          <span className="max-w-[160px] truncate italic">{diffTab.label}</span>
          <button
            onClick={diffTab.onClose}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-60 transition-colors hover:opacity-100 text-muted-foreground hover:text-foreground"
            title="Close diff"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
