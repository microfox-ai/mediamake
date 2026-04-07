'use client';

import { useMemo, useState } from 'react';
import { Check, X, ChevronDown, ChevronRight, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Diff algorithm (LCS) ─────────────────────────────────────────────────────

type RawLine =
  | { type: 'unchanged'; text: string }
  | { type: 'added'; text: string }
  | { type: 'removed'; text: string };

function lcsMatrix(a: string[], b: string[]): number[][] {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp;
}

function computeRawDiff(saved: string[], draft: string[]): RawLine[] {
  const dp = lcsMatrix(saved, draft);
  const result: RawLine[] = [];
  let i = saved.length, j = draft.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && saved[i - 1] === draft[j - 1]) {
      result.push({ type: 'unchanged', text: saved[i - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: draft[j - 1] }); j--;
    } else {
      result.push({ type: 'removed', text: saved[i - 1] }); i--;
    }
  }
  return result.reverse();
}

// ─── Hunk builder ─────────────────────────────────────────────────────────────

interface Hunk {
  /** Stable key based on content — used to track accepted hunks. */
  id: string;
  savedLines: string[];
  draftLines: string[];
  /** 0-indexed start of the added lines inside the DRAFT content array. */
  draftStartIdx: number;
  /** Context lines just before this hunk (for display). */
  contextBefore: string[];
}

/** View line for rendering */
type ViewLine =
  | { kind: 'context'; text: string; lineNo: number }
  | { kind: 'removed'; text: string; hunkIdx: number }
  | { kind: 'added'; text: string; hunkIdx: number }
  | { kind: 'hunk-buttons'; hunkIdx: number };

function buildHunks(savedContent: string, draftContent: string): { hunks: Hunk[]; viewLines: ViewLine[] } {
  const savedLines = savedContent.split('\n');
  const draftLines = draftContent.split('\n');
  const raw = computeRawDiff(savedLines, draftLines);

  const hunks: Hunk[] = [];
  let draftIdx = 0;
  let contextWindow: string[] = [];

  // Pass 1: group consecutive changed lines into hunks
  let i = 0;
  while (i < raw.length) {
    const line = raw[i];
    if (line.type === 'unchanged') {
      contextWindow.push(line.text);
      if (contextWindow.length > 3) contextWindow.shift();
      draftIdx++;
      i++;
    } else {
      // Start of a hunk — collect all consecutive removed/added lines
      const hunkStartDraftIdx = draftIdx;
      const savedChunk: string[] = [];
      const draftChunk: string[] = [];
      while (i < raw.length && raw[i].type !== 'unchanged') {
        if (raw[i].type === 'removed') savedChunk.push(raw[i].text);
        else { draftChunk.push(raw[i].text); draftIdx++; }
        i++;
      }
      hunks.push({
        id: `${hunkStartDraftIdx}:${savedChunk.join('\n')}::${draftChunk.join('\n')}`,
        savedLines: savedChunk,
        draftLines: draftChunk,
        draftStartIdx: hunkStartDraftIdx,
        contextBefore: [...contextWindow],
      });
      contextWindow = [];
    }
  }

  // Pass 2: build view lines (context collapsed to 3 lines)
  const viewLines: ViewLine[] = [];
  // We'll iterate the raw diff again, tracking which hunk we're in
  let draftLineNo = 0;
  let hunkIdx = 0;
  let rawI = 0;
  let lastWasUnchanged = false;
  let contextBuffer: { text: string; lineNo: number }[] = [];

  function flushContext() {
    if (contextBuffer.length === 0) return;
    // Show at most 3 lines before next hunk
    const toShow = contextBuffer.slice(-3);
    if (contextBuffer.length > 3) {
      viewLines.push({ kind: 'context', text: `··· ${contextBuffer.length - 3} more lines ···`, lineNo: -1 });
    }
    for (const c of toShow) viewLines.push({ kind: 'context', text: c.text, lineNo: c.lineNo });
    contextBuffer = [];
  }

  while (rawI < raw.length) {
    const line = raw[rawI];
    if (line.type === 'unchanged') {
      if (!lastWasUnchanged) flushContext();
      contextBuffer.push({ text: line.text, lineNo: draftLineNo + 1 });
      draftLineNo++;
      lastWasUnchanged = true;
      rawI++;
    } else {
      flushContext();
      lastWasUnchanged = false;
      // Collect current hunk
      while (rawI < raw.length && raw[rawI].type !== 'unchanged') {
        const l = raw[rawI];
        if (l.type === 'removed') viewLines.push({ kind: 'removed', text: l.text, hunkIdx });
        else { viewLines.push({ kind: 'added', text: l.text, hunkIdx }); draftLineNo++; }
        rawI++;
      }
      viewLines.push({ kind: 'hunk-buttons', hunkIdx });
      hunkIdx++;
    }
  }
  // Trailing context (show last 3)
  const trailing = contextBuffer.slice(-3);
  if (contextBuffer.length > 3) viewLines.push({ kind: 'context', text: `··· ${contextBuffer.length - 3} more lines ···`, lineNo: -1 });
  for (const c of trailing) viewLines.push({ kind: 'context', text: c.text, lineNo: c.lineNo });

  return { hunks, viewLines };
}

// ─── Decline helper ───────────────────────────────────────────────────────────

function buildDeclinedContent(draftContent: string, hunk: Hunk): string {
  const lines = draftContent.split('\n');
  return [
    ...lines.slice(0, hunk.draftStartIdx),
    ...hunk.savedLines,
    ...lines.slice(hunk.draftStartIdx + hunk.draftLines.length),
  ].join('\n');
}

// ─── Component ────────────────────────────────────────────────────────────────

interface InlineDiffViewProps {
  savedContent: string;
  draftContent: string;
  fileId: string;
  fileName: string;
  onDeclineHunk: (fileId: string, newDraftContent: string) => void;
  onClose: () => void;
}

export function InlineDiffView({ savedContent, draftContent, fileId, fileName, onDeclineHunk, onClose }: InlineDiffViewProps) {
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [collapsedHunks, setCollapsedHunks] = useState<Set<number>>(new Set());

  const { hunks, viewLines } = useMemo(
    () => buildHunks(savedContent, draftContent),
    [savedContent, draftContent],
  );

  const pendingHunks = hunks.filter((h) => !acceptedIds.has(h.id));
  const allReviewed = pendingHunks.length === 0;

  function acceptHunk(hunkIdx: number) {
    const h = hunks[hunkIdx];
    if (!h) return;
    setAcceptedIds((prev) => new Set([...prev, h.id]));
  }

  function declineHunk(hunkIdx: number) {
    const h = hunks[hunkIdx];
    if (!h) return;
    const newContent = buildDeclinedContent(draftContent, h);
    setAcceptedIds(new Set()); // reset since line positions shift after content change
    onDeclineHunk(fileId, newContent);
  }

  function acceptAll() {
    setAcceptedIds(new Set(hunks.map((h) => h.id)));
  }

  function declineAll() {
    onDeclineHunk(fileId, savedContent);
  }

  const addedCount = hunks.reduce((n, h) => n + h.draftLines.length, 0);
  const removedCount = hunks.reduce((n, h) => n + h.savedLines.length, 0);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted px-4 py-2">
        <GitMerge size={13} className="text-violet-400 shrink-0" />
        <span className="text-[11px] font-medium text-foreground/70">{fileName}</span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-emerald-600 dark:text-emerald-400">+{addedCount}</span>
          <span className="text-red-600 dark:text-red-400">-{removedCount}</span>
          <span className="text-muted-foreground/50">· {pendingHunks.length} hunk{pendingHunks.length !== 1 ? 's' : ''} pending</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {!allReviewed && (
            <>
              <button
                onClick={acceptAll}
                className="flex items-center gap-1 rounded border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                <Check size={10} /> Accept All
              </button>
              <button
                onClick={declineAll}
                className="flex items-center gap-1 rounded border border-red-500/30 px-2 py-0.5 text-[10px] text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <X size={10} /> Decline All
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Exit Review
          </button>
        </div>
      </div>

      {/* All reviewed */}
      {allReviewed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground/50">
          <Check size={20} className="text-emerald-500/60" />
          <p className="text-sm">All changes reviewed</p>
          <p className="text-xs">Press <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">Ctrl+S</kbd> to save the draft</p>
          <button onClick={onClose} className="mt-2 rounded border border-border px-3 py-1 text-xs hover:bg-muted transition-colors">
            Back to editor
          </button>
        </div>
      ) : (
        /* Diff body */
        <div className="flex-1 overflow-y-auto font-mono text-[12px] leading-[1.6]">
          {viewLines.map((line, idx) => {
            if (line.kind === 'context') {
              return (
                <div key={idx} className={cn('flex px-4 py-px', line.lineNo === -1 && 'bg-muted/20')}>
                  <span className="mr-3 w-8 shrink-0 text-right text-[10px] text-muted-foreground/30 select-none">
                    {line.lineNo > 0 ? line.lineNo : ''}
                  </span>
                  <span className="mr-2 w-3 shrink-0 select-none"> </span>
                  <span className={cn('whitespace-pre-wrap break-all', line.lineNo === -1 ? 'text-muted-foreground/40 italic text-[10px]' : 'text-foreground/50')}>
                    {line.text || '\u00a0'}
                  </span>
                </div>
              );
            }

            if (line.kind === 'removed') {
              const isAccepted = acceptedIds.has(hunks[line.hunkIdx]?.id ?? '');
              if (isAccepted) return null;
              return (
                <div key={idx} className="flex bg-red-500/10 px-4 py-px border-l-2 border-red-500/40">
                  <span className="mr-3 w-8 shrink-0 text-right text-[10px] text-muted-foreground/30 select-none"></span>
                  <span className="mr-2 w-3 shrink-0 text-center text-red-500 dark:text-red-400 select-none">−</span>
                  <span className="whitespace-pre-wrap break-all text-red-700 dark:text-red-300/80">{line.text || '\u00a0'}</span>
                </div>
              );
            }

            if (line.kind === 'added') {
              const isAccepted = acceptedIds.has(hunks[line.hunkIdx]?.id ?? '');
              if (isAccepted) return null;
              return (
                <div key={idx} className="flex bg-emerald-500/10 px-4 py-px border-l-2 border-emerald-500/40">
                  <span className="mr-3 w-8 shrink-0 text-right text-[10px] text-muted-foreground/30 select-none"></span>
                  <span className="mr-2 w-3 shrink-0 text-center text-emerald-500 dark:text-emerald-400 select-none">+</span>
                  <span className="whitespace-pre-wrap break-all text-emerald-700 dark:text-emerald-300/80">{line.text || '\u00a0'}</span>
                </div>
              );
            }

            if (line.kind === 'hunk-buttons') {
              const hunk = hunks[line.hunkIdx];
              const isAccepted = hunk && acceptedIds.has(hunk.id);
              const isCollapsed = collapsedHunks.has(line.hunkIdx);
              if (isAccepted) return null;
              return (
                <div key={idx} className="flex items-center gap-1.5 border-b border-border/30 bg-muted/30 px-4 py-1">
                  <button
                    onClick={() => setCollapsedHunks((s) => { const n = new Set(s); n.has(line.hunkIdx) ? n.delete(line.hunkIdx) : n.add(line.hunkIdx); return n; })}
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                  </button>
                  <span className="text-[10px] text-muted-foreground/50">
                    {hunk ? `${hunk.savedLines.length > 0 ? `-${hunk.savedLines.length}` : ''}${hunk.draftLines.length > 0 ? ` +${hunk.draftLines.length}` : ''}` : ''}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => acceptHunk(line.hunkIdx)}
                      className="flex items-center gap-0.5 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                    >
                      <Check size={10} /> Accept
                    </button>
                    <button
                      onClick={() => declineHunk(line.hunkIdx)}
                      className="flex items-center gap-0.5 rounded bg-red-500/10 px-2 py-0.5 text-[10px] text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <X size={10} /> Decline
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
