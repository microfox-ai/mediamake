'use client';

/**
 * InlineDiffPane — Cursor-style inline diff for AI-proposed edits.
 *
 * Shows the full file with the proposed change highlighted inline:
 * - Red rows  (−) = lines being removed
 * - Green rows (+) = lines being added
 * - Accept / Decline buttons float over the hunk
 * - Scrolls to the hunk on mount
 */

import { useRef, useEffect } from 'react';
import { X, Check, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineDiffPaneProps {
  fileName: string;
  /** Original (current) file content. */
  fileContent: string;
  /** 1-indexed, inclusive. For insert_lines this is the afterLine number. */
  startLine: number;
  endLine: number;
  tool: 'edit_lines' | 'insert_lines' | 'delete_lines';
  originalLines: string[];
  newLines: string[];
  description?: string;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export function InlineDiffPane({
  fileName,
  fileContent,
  startLine,
  endLine,
  tool,
  originalLines,
  newLines,
  description,
  onAccept,
  onDecline,
  onClose,
}: InlineDiffPaneProps) {
  const hunkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hunkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const allLines = fileContent.split('\n');

  // Lines before the hunk
  const beforeLines = allLines.slice(0, startLine - 1);
  // Lines after the hunk
  const afterLines = tool === 'insert_lines'
    ? allLines.slice(startLine)          // insert: nothing removed, just insert after startLine
    : allLines.slice(endLine);           // edit/delete: skip replaced/deleted lines

  // For insert, originalLines is always [] — we just show the green additions
  const removed = tool === 'insert_lines' ? [] : originalLines.length
    ? originalLines
    : allLines.slice(startLine - 1, endLine); // fallback: slice from file content

  const added = tool === 'delete_lines' ? [] : newLines;

  const removedCount = removed.length;
  const addedCount = added.length;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted px-4 py-2 text-[11px]">
        <span className="font-medium text-violet-600 dark:text-violet-400">AI Edit</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-foreground/70">{fileName}</span>
        {description && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="max-w-[300px] truncate text-[10px] italic text-muted-foreground">{description}</span>
          </>
        )}
        <div className="ml-1 flex items-center gap-2 text-[10px]">
          {removedCount > 0 && <span className="text-red-600 dark:text-red-400">−{removedCount}</span>}
          {addedCount > 0 && <span className="text-green-600 dark:text-green-400">+{addedCount}</span>}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onDecline}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400"
          >
            <XCircle size={11} />
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/25"
          >
            <Check size={11} />
            Accept
          </button>
          <button
            onClick={onClose}
            className="ml-1 rounded p-1 text-muted-foreground/50 transition-colors hover:text-foreground"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* File body */}
      <div className="flex-1 overflow-y-auto font-mono text-[12px] leading-5">

        {/* Lines before the hunk */}
        {beforeLines.map((line, i) => (
          <Row key={`pre-${i}`} lineNumber={i + 1} text={line} kind="context" />
        ))}

        {/* The hunk */}
        <div ref={hunkRef} className="relative">
          {/* Floating Accept/Decline on the right edge of the hunk */}
          <div className="absolute right-4 top-1 z-10 flex items-center gap-1">
            <button
              onClick={onDecline}
              title="Decline"
              className="flex items-center gap-0.5 rounded border border-red-500/25 bg-background/95 px-1.5 py-0.5 text-[10px] text-red-500 dark:text-red-400 shadow transition-colors hover:bg-red-500/10"
            >
              <XCircle size={9} />
              Decline
            </button>
            <button
              onClick={onAccept}
              title="Accept"
              className="flex items-center gap-0.5 rounded border border-emerald-500/25 bg-background/95 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 shadow transition-colors hover:bg-emerald-500/15"
            >
              <Check size={9} />
              Accept
            </button>
          </div>

          {/* Removed lines */}
          {removed.map((line, i) => (
            <Row key={`rem-${i}`} lineNumber={startLine + i} text={line} kind="removed" />
          ))}

          {/* Added lines */}
          {added.map((line, i) => (
            <Row
              key={`add-${i}`}
              lineNumber={tool === 'insert_lines' ? startLine + i + 1 : startLine + i}
              text={line}
              kind="added"
            />
          ))}
        </div>

        {/* Lines after the hunk */}
        {afterLines.map((line, i) => (
          <Row
            key={`post-${i}`}
            lineNumber={(tool === 'insert_lines' ? startLine + added.length : endLine) + 1 + i}
            text={line}
            kind="context"
          />
        ))}
      </div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({
  lineNumber,
  text,
  kind,
}: {
  lineNumber: number;
  text: string;
  kind: 'context' | 'removed' | 'added';
}) {
  return (
    <div
      className={cn(
        'flex min-h-[20px] select-text border-b border-border/25 pr-4',
        kind === 'removed' && 'bg-red-500/10',
        kind === 'added' && 'bg-emerald-500/10',
        kind === 'context' && 'opacity-45',
      )}
    >
      {/* Gutter: line number */}
      <span className="w-10 shrink-0 select-none pr-3 pt-px text-right text-[10px] text-muted-foreground/40">
        {lineNumber}
      </span>
      {/* Marker */}
      <span
        className={cn(
          'w-4 shrink-0 select-none text-center',
          kind === 'removed' && 'text-red-500',
          kind === 'added' && 'text-emerald-500',
          kind === 'context' && 'text-transparent',
        )}
      >
        {kind === 'removed' ? '−' : kind === 'added' ? '+' : ' '}
      </span>
      {/* Content */}
      <span
        className={cn(
          'whitespace-pre-wrap break-all',
          kind === 'removed' && 'text-red-700 dark:text-red-200/80',
          kind === 'added' && 'text-emerald-700 dark:text-emerald-200/80',
          kind === 'context' && 'text-foreground',
        )}
      >
        {text || '\u00a0'}
      </span>
    </div>
  );
}
