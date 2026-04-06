'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, X, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIChange } from './types';

interface AIChangeBlockProps {
  change: AIChange;
  status: 'applied' | 'declined';
  isHistorical: boolean;
  onApply: (change: AIChange) => void;
  onDecline: (change: AIChange) => void;
}

export function AIChangeBlock({ change, status, isHistorical, onApply, onDecline }: AIChangeBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const applied = useRef(false);

  // Auto-apply to draft exactly once on mount — but ONLY for freshly streamed
  // messages. Historical messages (loaded from DB) must never re-apply: the edit
  // is already in the file's draft, or the user already reverted it.
  useEffect(() => {
    if (!applied.current && !isHistorical) {
      applied.current = true;
      onApply(change);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toolLabel =
    change.tool === 'edit_lines' ? 'Edit' :
    change.tool === 'insert_lines' ? 'Insert' : 'Delete';

  const lineLabel =
    change.tool === 'insert_lines'
      ? `after line ${change.startLine}`
      : change.startLine === change.endLine
      ? `line ${change.startLine}`
      : `lines ${change.startLine}–${change.endLine}`;

  return (
    <div
      className={cn(
        'my-1.5 rounded-md border text-[11px] overflow-hidden',
        status === 'declined'
          ? 'border-border bg-muted/30 opacity-50'
          : 'border-violet-500/25 bg-card',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/60">
        <button
          onClick={() => setExpanded((x) => !x)}
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        <FileText size={11} className="shrink-0 text-violet-500/70 dark:text-violet-400/70" />
        <span className="text-foreground/70 font-medium truncate max-w-[100px]">{change.fileName}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground/60">{toolLabel}</span>
        <span className="text-muted-foreground/40 text-[10px]">{lineLabel}</span>

        <div className="ml-auto flex items-center gap-1 shrink-0">
          {status === 'declined' ? (
            <span className="rounded px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground/50">
              ✗ Reverted
            </span>
          ) : (
            <>
              <span className="rounded px-1.5 py-0.5 text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <Check size={9} /> Drafted
              </span>
              <button
                onClick={() => onDecline(change)}
                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Revert this file's draft to saved state"
              >
                <X size={9} /> Revert
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {change.description && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground border-b border-border/40 italic">
          {change.description}
        </div>
      )}

      {/* Diff preview */}
      {expanded && (
        <div className="overflow-x-auto font-mono text-[10px] leading-5 max-h-[180px] overflow-y-auto">
          {change.newLines.map((line, i) => (
            <div key={i} className="flex items-start bg-emerald-500/8 px-2 py-px">
              <span className="w-4 shrink-0 text-emerald-600/60 dark:text-emerald-400/60 select-none mr-2">+</span>
              <span className="text-emerald-700/80 dark:text-emerald-200/70 whitespace-pre-wrap break-all">{line}</span>
            </div>
          ))}
          {change.newLines.length === 0 && (
            <div className="px-3 py-2 text-muted-foreground/50">Lines {change.startLine}–{change.endLine} deleted</div>
          )}
        </div>
      )}
    </div>
  );
}
