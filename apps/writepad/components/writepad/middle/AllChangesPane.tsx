'use client';

/**
 * AllChangesPane — shows ALL files with unsaved or draft changes.
 *
 * Left sidebar: list of changed files with their change type.
 * Right body: diff for the currently selected file.
 */

import { useState, useMemo } from 'react';
import { FileText, GitBranch, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiffPane } from './DiffPane';
import type { OpenTab } from './types';

interface ChangedFile {
  fileId: string;
  fileName: string;
  /** 'draft' = AI/staged edit, 'unsaved' = in-editor unsaved keystroke */
  kind: 'draft' | 'unsaved' | 'both';
  savedContent: string;
  modified: string;
}

interface AllChangesPaneProps {
  tabs: OpenTab[];
  unsavedIds: Set<string>;
  draftedIds: Set<string>;
  onClose: () => void;
  onSaveDraft: (fileId: string) => void;
  onRevertDraft: (fileId: string) => void;
}

export function AllChangesPane({
  tabs,
  unsavedIds,
  draftedIds,
  onClose,
  onSaveDraft,
  onRevertDraft,
}: AllChangesPaneProps) {
  const changedFiles = useMemo<ChangedFile[]>(() => {
    return tabs
      .filter((t) => unsavedIds.has(t.fileId) || draftedIds.has(t.fileId))
      .map((t) => {
        const hasDraft = draftedIds.has(t.fileId);
        const hasUnsaved = unsavedIds.has(t.fileId);
        return {
          fileId: t.fileId,
          fileName: t.name,
          kind: hasDraft && hasUnsaved ? 'both' : hasDraft ? 'draft' : 'unsaved',
          savedContent: t.savedContent,
          modified: t.draftContent ?? t.content,
        };
      });
  }, [tabs, unsavedIds, draftedIds]);

  const [selectedId, setSelectedId] = useState<string>(changedFiles[0]?.fileId ?? '');

  const selected = changedFiles.find((f) => f.fileId === selectedId) ?? changedFiles[0];

  if (changedFiles.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/50">
        <p className="text-sm">No unsaved or draft changes</p>
        <button onClick={onClose} className="text-xs underline hover:text-foreground transition-colors">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted px-4 py-2">
        <span className="text-[11px] font-medium text-foreground/70">
          All Changes
          <span className="ml-2 rounded bg-violet-500/15 px-1.5 text-[10px] text-violet-600 dark:text-violet-400">
            {changedFiles.length} file{changedFiles.length !== 1 ? 's' : ''}
          </span>
        </span>
        <button
          onClick={onClose}
          className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* File list sidebar */}
        <div className="flex w-52 shrink-0 flex-col border-r border-border bg-card overflow-y-auto">
          {changedFiles.map((f) => (
            <button
              key={f.fileId}
              onClick={() => setSelectedId(f.fileId)}
              className={cn(
                'flex w-full items-start gap-2 px-3 py-2 text-left text-[11px] transition-colors border-b border-border/50',
                selectedId === f.fileId
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <FileText size={12} className="mt-0.5 shrink-0 text-sky-600/70 dark:text-sky-400/70" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.fileName}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {(f.kind === 'draft' || f.kind === 'both') && (
                    <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
                      <GitBranch size={8} /> Draft
                    </span>
                  )}
                  {(f.kind === 'unsaved' || f.kind === 'both') && (
                    <span className="flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400">
                      <Circle size={7} className="fill-current" /> Unsaved
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Diff for selected file */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <DiffPane
              fileName={selected.fileName}
              original={selected.savedContent}
              modified={selected.modified}
              onClose={onClose}
              extraActions={
                draftedIds.has(selected.fileId)
                  ? [
                      {
                        label: 'Accept Draft',
                        onClick: () => onSaveDraft(selected.fileId),
                        className:
                          'rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors',
                      },
                      {
                        label: 'Revert Draft',
                        onClick: () => onRevertDraft(selected.fileId),
                        className:
                          'rounded bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/20 transition-colors',
                      },
                    ]
                  : []
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
