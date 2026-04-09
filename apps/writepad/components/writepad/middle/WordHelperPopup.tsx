'use client';

/**
 * WordHelperPopup — floating chip list for word-helper suggestions.
 *
 * Rendered at a fixed screen position derived from the editor selection coords.
 * Clicking a chip replaces the selected word in the editor via onSelect().
 * Dismissed by clicking outside or pressing Escape.
 */

import { useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';
import { WORD_HELPERS } from './wordHelpers';

export interface WordHelperState {
  agentId: string;
  word: string;
  /** CodeMirror doc positions for the selection to replace. */
  from: number;
  to: number;
  coords: { top: number; left: number; bottom: number };
  suggestions: string[];
  loading: boolean;
  error?: string;
}

interface WordHelperPopupProps {
  state: WordHelperState;
  onSelect: (suggestion: string, from: number, to: number) => void;
  onClose: () => void;
}

const POPUP_WIDTH = 340;
const POPUP_MAX_HEIGHT = 220;

export function WordHelperPopup({ state, onSelect, onClose }: WordHelperPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const helper = WORD_HELPERS.find((h) => h.id === state.agentId);

  // Escape closes the popup
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [onClose]);

  // Click outside closes the popup
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Position below the selection; flip above if not enough space below.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

  let left = state.coords.left;
  let top = state.coords.bottom + 8;

  if (left + POPUP_WIDTH > vw - 12) left = vw - POPUP_WIDTH - 12;
  if (left < 8) left = 8;
  if (top + POPUP_MAX_HEIGHT > vh - 12) top = state.coords.top - POPUP_MAX_HEIGHT - 8;

  return (
    <div
      ref={popupRef}
      style={{ position: 'fixed', top, left, width: POPUP_WIDTH, zIndex: 9999 }}
      className="rounded-lg border border-border bg-popover shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-foreground">
            {helper?.label ?? state.agentId}
          </span>
          <span className="ml-1.5 text-[11px] text-muted-foreground">
            for{' '}
            <span className="font-medium text-violet-400">"{state.word}"</span>
          </span>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div
        className="overflow-y-auto p-2.5"
        style={{ maxHeight: POPUP_MAX_HEIGHT }}
      >
        {state.loading ? (
          <div className="flex items-center justify-center gap-2 py-5 text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Generating…</span>
          </div>
        ) : state.error ? (
          <p className="py-4 text-center text-xs text-destructive">{state.error}</p>
        ) : state.suggestions.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No suggestions found
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {state.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSelect(s, state.from, state.to)}
                className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-foreground transition-colors hover:border-violet-500/60 hover:bg-violet-500/10 hover:text-violet-300 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!state.loading && state.suggestions.length > 0 && (
        <div className="border-t border-border px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground/60">
            Click a word to replace · Esc to close
          </span>
        </div>
      )}
    </div>
  );
}
