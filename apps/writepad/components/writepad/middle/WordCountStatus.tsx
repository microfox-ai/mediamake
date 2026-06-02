'use client';

/**
 * WordCountStatus — bottom bar word count, reading time, and per-file target.
 *
 * - Reading time: wordCount ÷ 200 wpm (average reading speed for prose)
 * - Target: stored in localStorage keyed by fileId; click to set/clear
 * - Progress: shown as "wordCount / target" with colour that shifts as you approach the goal
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Target, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Reading time ─────────────────────────────────────────────────────────────

const WPM = 200;

function formatReadingTime(words: number): string {
  if (words < 1) return '< 1 min';
  const mins = Math.round(words / WPM);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min read`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m read` : `${h}h read`;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEY = (fileId: string) => `wp_word_target_${fileId}`;

function loadTarget(fileId: string): number | null {
  try {
    const raw = localStorage.getItem(LS_KEY(fileId));
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function saveTarget(fileId: string, target: number | null) {
  try {
    if (target == null) localStorage.removeItem(LS_KEY(fileId));
    else localStorage.setItem(LS_KEY(fileId), String(target));
  } catch {}
}

// ─── Progress colour ──────────────────────────────────────────────────────────

function progressClass(ratio: number): string {
  if (ratio >= 1) return 'text-emerald-400';
  if (ratio >= 0.8) return 'text-amber-400';
  return 'text-white/50';
}

function progressBarClass(ratio: number): string {
  if (ratio >= 1) return 'bg-emerald-400';
  if (ratio >= 0.8) return 'bg-amber-400';
  return 'bg-violet-400/70';
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WordCountStatusProps {
  wordCount: number;
  fileId: string;
}

export function WordCountStatus({ wordCount, fileId }: WordCountStatusProps) {
  const [target, setTarget] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load target from localStorage whenever fileId changes
  useEffect(() => {
    setTarget(loadTarget(fileId));
    setEditing(false);
    setDraft('');
  }, [fileId]);

  const openEditor = useCallback(() => {
    setDraft(target != null ? String(target) : '');
    setEditing(true);
  }, [target]);

  const commitEdit = useCallback(() => {
    const n = parseInt(draft, 10);
    const next = Number.isFinite(n) && n > 0 ? n : null;
    setTarget(next);
    saveTarget(fileId, next);
    setEditing(false);
  }, [draft, fileId]);

  const clearTarget = useCallback(() => {
    setTarget(null);
    saveTarget(fileId, null);
    setEditing(false);
  }, [fileId]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const readingTime = formatReadingTime(wordCount);
  const ratio = target ? Math.min(wordCount / target, 1) : 0;
  const pct = Math.min(ratio * 100, 100);

  return (
    <span className="flex items-center gap-2 text-[10px] text-white/50 select-none">

      {/* ── Word count ──────────────────────────────────────────────── */}
      {target == null ? (
        <span>{formatNumber(wordCount)} words</span>
      ) : (
        <span className={cn('font-mono tabular-nums', progressClass(ratio))}>
          {formatNumber(wordCount)}&thinsp;/&thinsp;{formatNumber(target)}
        </span>
      )}

      {/* ── Progress bar (only when target set) ─────────────────────── */}
      {target != null && (
        <span className="relative inline-block w-14 h-1 rounded-full bg-white/10 overflow-hidden">
          <span
            className={cn('absolute left-0 top-0 h-full rounded-full transition-all duration-300', progressBarClass(ratio))}
            style={{ width: `${pct}%` }}
          />
        </span>
      )}

      {/* ── Reading time ─────────────────────────────────────────────── */}
      <span className="text-white/30">·</span>
      <span>{readingTime}</span>

      {/* ── Target button / inline editor ────────────────────────────── */}
      {editing ? (
        <span className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            min={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder="target"
            className="w-20 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80 outline-none focus:border-violet-400/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={commitEdit}
            className="rounded p-0.5 text-emerald-400/70 hover:text-emerald-400 transition-colors"
            title="Set target"
          >
            <Check size={11} />
          </button>
          {target != null && (
            <button
              onClick={clearTarget}
              className="rounded p-0.5 text-red-400/50 hover:text-red-400 transition-colors"
              title="Clear target"
            >
              <X size={11} />
            </button>
          )}
        </span>
      ) : (
        <button
          onClick={openEditor}
          title={target != null ? `Word target: ${formatNumber(target)} — click to change` : 'Set word count target'}
          className={cn(
            'flex items-center gap-0.5 rounded px-1 py-0.5 transition-colors',
            target != null
              ? 'text-white/30 hover:text-white/60'
              : 'text-white/20 hover:text-white/50',
          )}
        >
          <Target size={10} />
          {target != null && (
            <span className={progressClass(ratio)}>
              {Math.round(pct)}%
            </span>
          )}
        </button>
      )}
    </span>
  );
}
