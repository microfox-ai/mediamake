'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { X } from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

// ─── Diff algorithm (LCS-based line diff) ────────────────────────────────────

type DiffLine =
  | { type: 'unchanged'; text: string }
  | { type: 'added'; text: string }
  | { type: 'removed'; text: string };

function computeDiff(original: string, modified: string): DiffLine[] {
  const a = original.split('\n');
  const b = modified.split('\n');
  const m = a.length;
  const n = b.length;

  // Wagner-Fischer LCS table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: 'unchanged', text: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: b[j - 1] });
      j--;
    } else {
      result.push({ type: 'removed', text: a[i - 1] });
      i--;
    }
  }
  return result.reverse();
}

// Build left/right line arrays from unified diff
function splitDiff(diff: DiffLine[]): { left: DiffLine[]; right: DiffLine[] } {
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];
  for (const line of diff) {
    if (line.type === 'unchanged') {
      left.push(line);
      right.push(line);
    } else if (line.type === 'removed') {
      left.push(line);
      right.push({ type: 'unchanged', text: '' }); // empty placeholder on right
    } else {
      left.push({ type: 'unchanged', text: '' }); // empty placeholder on left
      right.push(line);
    }
  }
  return { left, right };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DiffPaneProps {
  fileName: string;
  original: string;
  modified: string;
  onClose: () => void;
  /** Optional action buttons rendered in the header (used by AllChangesPane). */
  extraActions?: Array<{ label: string; onClick: () => void; className: string }>;
  /** Override panel labels (default: "Original (last saved)" / "Current (unsaved)") */
  originalLabel?: string;
  modifiedLabel?: string;
  /** Hide the top-level diff header (used when embedded inside VcsCommitDiffPane). */
  hideHeader?: boolean;
}

export function DiffPane({
  fileName,
  original,
  modified,
  onClose,
  extraActions,
  originalLabel = 'Original (last saved)',
  modifiedLabel = 'Current (unsaved)',
  hideHeader = false,
}: DiffPaneProps) {
  const { left, right } = useMemo(() => {
    const diff = computeDiff(original, modified);
    return splitDiff(diff);
  }, [original, modified]);

  const addedCount = right.filter((l) => l.type === 'added').length;
  const removedCount = left.filter((l) => l.type === 'removed').length;

  // Synced scroll
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const syncScroll = (from: 'left' | 'right') => () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const src = from === 'left' ? leftScrollRef.current : rightScrollRef.current;
    const dst = from === 'left' ? rightScrollRef.current : leftScrollRef.current;
    if (src && dst) dst.scrollTop = src.scrollTop;
    requestAnimationFrame(() => { isSyncing.current = false; });
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Diff header */}
      {!hideHeader && (
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted px-4 py-2">
          <span className="text-[11px] text-foreground/60 font-medium">Diff: {fileName}</span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-green-600 dark:text-green-400">+{addedCount} added</span>
            <span className="text-red-600 dark:text-red-400">-{removedCount} removed</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="rounded border border-border px-1.5 py-0.5">Saved</span>
            <span className="text-muted-foreground/40">←→</span>
            <span className="rounded border border-violet-500/30 px-1.5 py-0.5 text-violet-600 dark:text-violet-400">Current</span>
            {extraActions?.map((a) => (
              <button key={a.label} onClick={a.onClick} className={a.className}>
                {a.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="ml-3 rounded p-1 text-muted-foreground hover:text-foreground transition-colors" title="Close diff">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Two-pane diff */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Left — original */}
        <ResizablePanel defaultSize={50} minSize={25}>
          <div className="flex h-full flex-col">
            <div className="shrink-0 border-b border-border bg-background px-4 py-1 text-[10px] text-muted-foreground">
              {originalLabel}
            </div>
            <DiffSidePanel lines={left} side="left" scrollRef={leftScrollRef} onScroll={syncScroll('left')} />
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-border transition-colors hover:bg-violet-500/40" />

        {/* Right — modified */}
        <ResizablePanel defaultSize={50} minSize={25}>
          <div className="flex h-full flex-col">
            <div className="shrink-0 border-b border-border bg-background px-4 py-1 text-[10px] text-violet-600 dark:text-violet-400/70">
              {modifiedLabel}
            </div>
            <DiffSidePanel lines={right} side="right" scrollRef={rightScrollRef} onScroll={syncScroll('right')} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// ─── Side panel ───────────────────────────────────────────────────────────────

function DiffSidePanel({
  lines,
  side,
  scrollRef,
  onScroll,
}: {
  lines: DiffLine[];
  side: 'left' | 'right';
  scrollRef?: RefObject<HTMLDivElement | null>;
  onScroll?: () => void;
}) {
  return (
    <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto font-mono text-[12px] leading-5">
      {lines.map((line, idx) => {
        const isEmpty = line.text === '';
        const isAdded = line.type === 'added';
        const isRemoved = line.type === 'removed';

        return (
          <div
            key={idx}
            className={cn(
              'flex min-h-[20px] border-b border-border/30 pl-2 pr-4',
              isAdded && side === 'right' && 'bg-green-500/10',
              isRemoved && side === 'left' && 'bg-red-500/10',
              isEmpty && 'bg-muted/20',
            )}
          >
            {/* Line number */}
            <span className="mr-3 w-8 shrink-0 select-none text-right text-[10px] text-muted-foreground/40">
              {isEmpty ? '' : idx + 1}
            </span>
            {/* Change marker */}
            <span className={cn(
              'mr-2 w-3 shrink-0 text-center select-none',
              isAdded && side === 'right' && 'text-green-500 dark:text-green-400',
              isRemoved && side === 'left' && 'text-red-500 dark:text-red-400',
            )}>
              {isAdded && side === 'right' ? '+' : isRemoved && side === 'left' ? '−' : ' '}
            </span>
            {/* Line content */}
            <span className={cn(
              'whitespace-pre-wrap break-all',
              isAdded && side === 'right' && 'text-green-700 dark:text-green-200/80',
              isRemoved && side === 'left' && 'text-red-700 dark:text-red-200/80',
              line.type === 'unchanged' && 'text-foreground/55',
            )}>
              {line.text || '\u00a0'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
