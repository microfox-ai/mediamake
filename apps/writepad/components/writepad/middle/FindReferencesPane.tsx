'use client';

/**
 * FindReferencesPane — collapsible bottom panel showing "Find All References" results.
 * Displays all occurrences of a wiki term across project files.
 */

import { X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RefResult } from './types';

interface FindReferencesPaneProps {
  term: string;
  results: RefResult[];
  onResultClick: (fileId: string, lineNumber: number) => void;
  onClose: () => void;
}

export function FindReferencesPane({
  term,
  results,
  onResultClick,
  onClose,
}: FindReferencesPaneProps) {
  // Group results by file
  const byFile = new Map<string, { filePath: string; fileId: string; items: RefResult[] }>();
  for (const r of results) {
    if (!byFile.has(r.fileId)) {
      byFile.set(r.fileId, { filePath: r.filePath, fileId: r.fileId, items: [] });
    }
    byFile.get(r.fileId)!.items.push(r);
  }

  const fileGroups = Array.from(byFile.values());
  const totalCount = results.length;

  return (
    <div className="shrink-0 flex flex-col border-t border-border bg-card" style={{ height: '180px' }}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-foreground/80">References</span>
          <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
            &quot;{term}&quot;
          </span>
          <span className="text-[10px] text-muted-foreground">
            {totalCount === 0
              ? 'no results'
              : `${totalCount} reference${totalCount !== 1 ? 's' : ''} in ${fileGroups.length} file${fileGroups.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {totalCount === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground/50">
            No references found
          </div>
        ) : (
          <div className="py-0.5">
            {fileGroups.map(({ fileId, filePath, items }) => (
              <div key={fileId}>
                {/* File header */}
                <div className="flex items-center gap-1.5 px-3 py-1 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
                  <FileText size={11} className="text-muted-foreground/50 shrink-0" />
                  <span className="text-[11px] font-medium text-foreground/70 truncate">{filePath}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/50">{items.length}</span>
                </div>

                {/* Line results */}
                {items.map((r) => (
                  <button
                    key={`${r.fileId}-${r.lineNumber}`}
                    onClick={() => onResultClick(r.fileId, r.lineNumber)}
                    className={cn(
                      'w-full flex items-baseline gap-2 px-6 py-0.5 text-left',
                      'hover:bg-accent transition-colors group',
                    )}
                  >
                    <span className="shrink-0 w-8 text-right text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground/70 font-mono">
                      {r.lineNumber}
                    </span>
                    <span className="text-[11px] text-foreground/70 truncate font-mono leading-5">
                      <HighlightedLine text={r.lineText} term={term} />
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Highlight the term within a line of text ─────────────────────────────────
// split() with a capturing group puts the matched segments at odd indices.
function HighlightedLine({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedTerm})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="bg-violet-500/20 text-violet-300 rounded-sm px-px not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
