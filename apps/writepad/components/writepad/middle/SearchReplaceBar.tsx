'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CodeMirrorEditorHandle } from './CodeMirrorEditor';

interface SearchReplaceBarProps {
  content: string;
  onChange: (next: string) => void;
  onClose: () => void;
  /** Ref to the CodeMirror editor — drives real in-editor highlighting & navigation. */
  editorRef: React.RefObject<CodeMirrorEditorHandle | null>;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function SearchReplaceBar({ content, onChange, onClose, editorRef }: SearchReplaceBarProps) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);

  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { findInputRef.current?.focus(); }, []);

  // Push search query into CodeMirror for real highlighting whenever params change.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (find) {
      editor.setSearch(find, caseSensitive, useRegex);
    } else {
      editor.clearSearch();
    }
  }, [find, caseSensitive, useRegex, editorRef]);

  // Clear CM highlighting when bar unmounts.
  useEffect(() => {
    return () => { editorRef.current?.clearSearch(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildRegex = useCallback(
    (flags = 'g') => {
      try {
        const pattern = useRegex ? find : escapeRegex(find);
        return new RegExp(pattern, caseSensitive ? flags : flags + 'i');
      } catch {
        return null;
      }
    },
    [find, caseSensitive, useRegex],
  );

  const matches = (() => {
    if (!find) return [];
    const re = buildRegex('g');
    if (!re) return [];
    return Array.from(content.matchAll(re));
  })();

  const matchCount = matches.length;
  const currentMatch = matchCount > 0 ? matchIndex % matchCount : -1;

  const handleNext = useCallback(() => {
    setMatchIndex((i) => (i + 1) % Math.max(matchCount, 1));
    editorRef.current?.findNextMatch();
  }, [matchCount, editorRef]);

  const handlePrev = useCallback(() => {
    setMatchIndex((i) => (i - 1 + matchCount) % Math.max(matchCount, 1));
    editorRef.current?.findPrevMatch();
  }, [matchCount, editorRef]);

  const handleReplaceOne = () => {
    if (!find || matchCount === 0) return;
    const idx = currentMatch >= 0 ? currentMatch : 0;
    let count = 0;
    const updated = content.replace(
      new RegExp(useRegex ? find : escapeRegex(find), caseSensitive ? 'g' : 'gi'),
      (m) => (count++ === idx ? replace : m),
    );
    onChange(updated);
  };

  const handleReplaceAll = () => {
    if (!find) return;
    const re = buildRegex('g');
    if (!re) return;
    onChange(content.replace(re, replace));
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted px-3 py-2">
      {/* Find + Replace inputs */}
      <div className="flex items-center gap-1">
        <input
          ref={findInputRef}
          type="text"
          placeholder="Find"
          value={find}
          onChange={(e) => { setFind(e.target.value); setMatchIndex(0); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter') { e.shiftKey ? handlePrev() : handleNext(); }
          }}
          className="w-40 rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-violet-500/60"
        />
        <input
          type="text"
          placeholder="Replace"
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          className="w-40 rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-violet-500/60"
        />
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCaseSensitive((x) => !x)}
          title="Match case"
          className={cn(
            'rounded px-1.5 py-0.5 text-[11px] transition-colors',
            caseSensitive ? 'bg-violet-500/20 text-violet-400' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Aa
        </button>
        <button
          onClick={() => setUseRegex((x) => !x)}
          title="Use regular expression"
          className={cn(
            'rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors',
            useRegex ? 'bg-violet-500/20 text-violet-400' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          .*
        </button>
      </div>

      {/* Count + navigation */}
      <div className="flex items-center gap-1">
        <span className="min-w-[70px] text-[11px] text-muted-foreground">
          {find ? (matchCount > 0 ? `${currentMatch + 1} of ${matchCount}` : 'No results') : ''}
        </span>
        <button onClick={handlePrev} disabled={matchCount === 0}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          title="Previous (Shift+Enter)">
          <ChevronUp size={14} />
        </button>
        <button onClick={handleNext} disabled={matchCount === 0}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          title="Next (Enter)">
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Replace actions */}
      <div className="flex items-center gap-1">
        <button onClick={handleReplaceOne} disabled={matchCount === 0}
          className="rounded bg-accent/50 px-2 py-0.5 text-[11px] text-foreground/70 hover:bg-accent hover:text-foreground disabled:opacity-30 transition-colors">
          Replace
        </button>
        <button onClick={handleReplaceAll} disabled={!find}
          className="rounded bg-accent/50 px-2 py-0.5 text-[11px] text-foreground/70 hover:bg-accent hover:text-foreground disabled:opacity-30 transition-colors">
          Replace All
        </button>
      </div>

      <button onClick={onClose}
        className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
        title="Close (Escape)">
        <X size={13} />
      </button>
    </div>
  );
}
