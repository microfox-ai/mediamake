'use client';

/**
 * VcsCommitDiffPane — VS Code / GitHub-style commit diff view.
 *
 * Layout:
 *   Left  — collapsible file list with change-type badges (A/M/D/R)
 *   Right — split before/after diff for the selected file
 *
 * "Before" content is fetched lazily from the parent commit when a file is
 * selected. No global loading state is set so the VCS panel stays interactive.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiffPane } from './DiffPane';
import type { VcsCommitViewData } from './types';

interface VcsCommitDiffPaneProps {
  projectId: string;
  data: VcsCommitViewData;
  onClose: () => void;
}

type ChangeType = 'add' | 'modify' | 'delete' | 'rename';

const CHANGE_COLOR: Record<ChangeType, string> = {
  add: 'text-emerald-500',
  modify: 'text-amber-500',
  delete: 'text-rose-500',
  rename: 'text-blue-500',
};

const CHANGE_BG: Record<ChangeType, string> = {
  add: 'bg-emerald-500/10',
  modify: 'bg-amber-500/10',
  delete: 'bg-rose-500/10',
  rename: 'bg-blue-500/10',
};

// ─── Before-content cache ─────────────────────────────────────────────────────
// Avoids re-fetching the same (fileId, parentCommitId) pair within the same
// pane instance.

function useBefore(
  projectId: string,
  fileId: string | null,
  changeType: ChangeType | null,
  parentCommitId: string | null,
) {
  const [before, setBefore] = useState('');
  const [loading, setLoading] = useState(false);
  const cache = useRef<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!fileId || !changeType) return;
    // 'add' has no before-content
    if (changeType === 'add' || !parentCommitId) { setBefore(''); return; }

    const cacheKey = `${fileId}:${parentCommitId}`;
    if (cache.current.has(cacheKey)) { setBefore(cache.current.get(cacheKey)!); return; }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/vcs/files/${fileId}/at/${parentCommitId}`,
        { cache: 'no-store' },
      );
      if (!res.ok) { setBefore(''); return; }
      const json = await res.json() as { snapshot?: { content?: string } | null };
      const content = json?.snapshot?.content ?? '';
      cache.current.set(cacheKey, content);
      setBefore(content);
    } catch {
      setBefore('');
    } finally {
      setLoading(false);
    }
  }, [projectId, fileId, changeType, parentCommitId]);

  useEffect(() => { load(); }, [load]);

  return { before, loading };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VcsCommitDiffPane({ projectId, data, onClose }: VcsCommitDiffPaneProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [fileListOpen, setFileListOpen] = useState(true);

  // Reset selection when a new commit is opened
  useEffect(() => { setSelectedIdx(0); }, [data.commitId]);

  const selected = data.changes[selectedIdx] ?? null;
  const { before, loading: loadingBefore } = useBefore(
    projectId,
    selected?.fileId ?? null,
    selected?.changeType ?? null,
    data.parentCommitId,
  );

  const after = selected?.snapshot?.content ?? '';
  const fileName = selected?.snapshot?.name ?? selected?.fileId ?? '';
  const changeType = selected?.changeType ?? 'modify';

  const addedCount = data.changes.filter((c) => c.changeType === 'add').length;
  const modifiedCount = data.changes.filter((c) => c.changeType === 'modify' || c.changeType === 'rename').length;
  const deletedCount = data.changes.filter((c) => c.changeType === 'delete').length;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[11px] font-semibold text-foreground/90">
            {data.commitMessage}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {addedCount > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">+{addedCount} added</span>
            )}
            {modifiedCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">~{modifiedCount} changed</span>
            )}
            {deletedCount > 0 && (
              <span className="text-rose-600 dark:text-rose-400">−{deletedCount} deleted</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Close commit diff"
        >
          <X size={13} />
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── File list sidebar ────────────────────────────────────────────── */}
        <div
          className={cn(
            'flex shrink-0 flex-col border-r border-border bg-card transition-all duration-150',
            fileListOpen ? 'w-52' : 'w-8',
          )}
        >
          {/* Sidebar toggle */}
          <button
            className="flex shrink-0 items-center gap-1 border-b border-border/50 px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setFileListOpen((v) => !v)}
            title={fileListOpen ? 'Collapse file list' : 'Expand file list'}
          >
            <ChevronRight
              size={11}
              className={cn('transition-transform', fileListOpen && 'rotate-90')}
            />
            {fileListOpen && (
              <span className="truncate font-medium uppercase tracking-wider text-[9px]">
                Files ({data.changes.length})
              </span>
            )}
          </button>

          {fileListOpen && (
            <div className="flex-1 overflow-y-auto">
              {data.changes.map((ch, idx) => {
                const name = ch.snapshot?.name ?? ch.fileId;
                const ct = ch.changeType;
                const isSelected = idx === selectedIdx;
                return (
                  <button
                    key={ch.fileId}
                    onClick={() => setSelectedIdx(idx)}
                    className={cn(
                      'flex w-full items-start gap-2 border-b border-border/30 px-2 py-1.5 text-left transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <FileText size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium leading-tight">{name}</p>
                      <span
                        className={cn(
                          'inline-block rounded px-1 py-px text-[9px] font-mono font-semibold uppercase',
                          CHANGE_COLOR[ct],
                          CHANGE_BG[ct],
                        )}
                      >
                        {ct}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Diff area ────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Per-file sub-header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-border/50 bg-muted/40 px-4 py-1.5">
                <span className="truncate text-[11px] text-foreground/70">{fileName}</span>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-px text-[9px] font-mono font-semibold uppercase',
                    CHANGE_COLOR[changeType],
                    CHANGE_BG[changeType],
                  )}
                >
                  {changeType}
                </span>
                {loadingBefore && (
                  <span className="text-[10px] text-muted-foreground animate-pulse">Loading…</span>
                )}
              </div>

              {loadingBefore ? (
                <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                  Fetching previous version…
                </div>
              ) : (
                <DiffPane
                  key={`${selected.fileId}-${data.commitId}`}
                  fileName={fileName}
                  original={before}
                  modified={after}
                  onClose={onClose}
                  hideHeader
                  originalLabel={changeType === 'add' ? 'Before (did not exist)' : 'Before this commit'}
                  modifiedLabel={changeType === 'delete' ? 'After (deleted — empty)' : 'After this commit'}
                />
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
              Select a file from the list to view its diff
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
