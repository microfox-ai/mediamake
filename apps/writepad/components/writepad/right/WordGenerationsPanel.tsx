'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, X, ChevronDown, FileText, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORD_HELPERS } from '@/components/writepad/middle/wordHelpers';
import type { WordGeneration, WordHelperEntry, WordFileRef } from './types';

interface WordGenerationsPanelProps {
  projectId: string;
  activeFileId: string | null;
  activeFileName: string | null;
}

const HELPER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  WORD_HELPERS.map((h) => [h.id, h.label]),
);

const HELPER_TYPE_COLORS: Record<string, string> = {
  synonyms:    'bg-blue-500/15 text-blue-300 border-blue-500/20',
  rhymes:      'bg-pink-500/15 text-pink-300 border-pink-500/20',
  antonyms:    'bg-red-500/15 text-red-300 border-red-500/20',
  stronger:    'bg-orange-500/15 text-orange-300 border-orange-500/20',
  simpler:     'bg-green-500/15 text-green-300 border-green-500/20',
  formal:      'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  casual:      'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
  descriptors: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  related:     'bg-teal-500/15 text-teal-300 border-teal-500/20',
  emotional:   'bg-rose-500/15 text-rose-300 border-rose-500/20',
  metaphors:   'bg-purple-500/15 text-purple-300 border-purple-500/20',
  alliterative:'bg-lime-500/15 text-lime-300 border-lime-500/20',
};

const HELPER_TYPE_TAB_COLORS: Record<string, string> = {
  synonyms:    'text-blue-300 border-blue-400 bg-blue-500/10',
  rhymes:      'text-pink-300 border-pink-400 bg-pink-500/10',
  antonyms:    'text-red-300 border-red-400 bg-red-500/10',
  stronger:    'text-orange-300 border-orange-400 bg-orange-500/10',
  simpler:     'text-green-300 border-green-400 bg-green-500/10',
  formal:      'text-indigo-300 border-indigo-400 bg-indigo-500/10',
  casual:      'text-yellow-300 border-yellow-400 bg-yellow-500/10',
  descriptors: 'text-cyan-300 border-cyan-400 bg-cyan-500/10',
  related:     'text-teal-300 border-teal-400 bg-teal-500/10',
  emotional:   'text-rose-300 border-rose-400 bg-rose-500/10',
  metaphors:   'text-purple-300 border-purple-400 bg-purple-500/10',
  alliterative:'text-lime-300 border-lime-400 bg-lime-500/10',
};

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Entry suggestions (used inside the tab pane) ───────────────────────────────

function SuggestionsView({ entry }: { entry: WordHelperEntry }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? entry.suggestions : entry.suggestions.slice(0, 8);

  return (
    <div className="flex flex-wrap gap-1 pt-1">
      {shown.map((s) => {
        const isChosen = s === entry.chosenSuggestion;
        return (
          <span
            key={s}
            className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] transition-colors',
              isChosen
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 font-medium'
                : 'border-border bg-muted/60 text-muted-foreground',
            )}
          >
            {s}
            {isChosen && <span className="ml-0.5 text-[8px] opacity-70">✓</span>}
          </span>
        );
      })}
      {entry.suggestions.length > 8 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-0.5 rounded border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
        >
          {expanded ? 'Show less' : `+${entry.suggestions.length - 8} more`}
          <ChevronDown size={9} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}

// ── Word row with expandable tab view ─────────────────────────────────────────

function WordRow({
  gen,
  helperTypeFilter,
  onDelete,
}: {
  gen: WordGeneration;
  helperTypeFilter: string;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const entries = gen.entries ?? [];
  const files: WordFileRef[] = gen.files ?? [];

  // Default to the filter tab if set, else first entry
  const defaultTab = helperTypeFilter && entries.some((e) => e.helperType === helperTypeFilter)
    ? helperTypeFilter
    : entries[0]?.helperType ?? '';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync active tab when filter changes
  useEffect(() => {
    if (helperTypeFilter && entries.some((e) => e.helperType === helperTypeFilter)) {
      setActiveTab(helperTypeFilter);
    }
  }, [helperTypeFilter, entries]);

  const activeEntry = entries.find((e) => e.helperType === activeTab);
  const hasChosen = entries.some((e) => e.chosenSuggestion);

  return (
    <div className="group rounded-md border border-border/50 bg-card/50 hover:border-border transition-colors overflow-hidden">
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-2.5 py-2 text-left"
      >
        <ChevronDown
          size={11}
          className={cn('mt-0.5 shrink-0 text-muted-foreground/50 transition-transform', open && 'rotate-180')}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-violet-300 text-xs">{gen.word}</span>
            {hasChosen && (
              <span className="text-[8px] text-emerald-400/70">✓ used</span>
            )}
            {/* Helper type badges */}
            <div className="flex gap-1 flex-wrap">
              {entries.map((e) => (
                <span
                  key={e.helperType}
                  className={cn(
                    'rounded border px-1 py-0.5 text-[8px] font-medium',
                    HELPER_TYPE_COLORS[e.helperType] ?? 'bg-muted text-muted-foreground border-border',
                  )}
                >
                  {HELPER_TYPE_LABELS[e.helperType] ?? e.helperType}
                </span>
              ))}
            </div>
          </div>

          {/* Files list */}
          {files.length > 0 && (
            <div className="mt-0.5 flex flex-col gap-0.5">
              {files.map((f) => (
                <div key={f.fileId} className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
                  <FileText size={8} className="shrink-0" />
                  <span className="truncate">{f.filePath || f.fileId}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground/50 whitespace-nowrap">
            {formatRelativeTime(gen.updatedAt)}
          </span>
          {confirming ? (
            <>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="rounded px-1 py-0.5 text-[8px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
                className="rounded px-1 py-0.5 text-[8px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground/40 hover:text-red-400 transition-all"
              title="Delete word generations"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </button>

      {/* Expanded: tabs + suggestions */}
      {open && entries.length > 0 && (
        <div className="border-t border-border/40">
          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-border/40 bg-muted/20">
            {entries.map((e) => {
              const isActive = e.helperType === activeTab;
              const tabColor = HELPER_TYPE_TAB_COLORS[e.helperType] ?? 'text-muted-foreground border-muted bg-muted/20';
              return (
                <button
                  key={e.helperType}
                  onClick={() => setActiveTab(e.helperType)}
                  className={cn(
                    'shrink-0 px-2.5 py-1 text-[9px] font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? tabColor
                      : 'text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:bg-accent',
                  )}
                >
                  {HELPER_TYPE_LABELS[e.helperType] ?? e.helperType}
                  {e.chosenSuggestion && <span className="ml-1 text-emerald-400/80">✓</span>}
                </button>
              );
            })}
          </div>

          {/* Active entry suggestions */}
          {activeEntry && (
            <div className="px-2.5 pb-2.5">
              <SuggestionsView entry={activeEntry} />
              <div className="mt-1 text-[8px] text-muted-foreground/40">
                {formatRelativeTime(activeEntry.updatedAt)} · {activeEntry.suggestions.length} suggestions
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function WordGenerationsPanel({
  projectId,
  activeFileId,
  activeFileName,
}: WordGenerationsPanelProps) {
  const [generations, setGenerations] = useState<WordGeneration[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [helperTypeFilter, setHelperTypeFilter] = useState<string>('');
  const [fileFilter, setFileFilter] = useState<'all' | 'current'>('all');
  const [offset, setOffset] = useState(0);
  const debouncedQ = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  const LIMIT = 30;

  const fetchGenerations = useCallback(async (opts: {
    q: string; helperType: string; fileFilter: 'all' | 'current'; offset: number; append?: boolean;
  }) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    try {
      const url = new URL(`/api/projects/${projectId}/word-generations`, window.location.origin);
      if (opts.q) url.searchParams.set('q', opts.q);
      if (opts.helperType) url.searchParams.set('helperType', opts.helperType);
      if (opts.fileFilter === 'current' && activeFileId) url.searchParams.set('fileId', activeFileId);
      url.searchParams.set('limit', String(LIMIT));
      url.searchParams.set('offset', String(opts.offset));

      const res = await fetch(url.toString(), { signal: ac.signal });
      if (!res.ok) return;
      const data = await res.json() as { generations: WordGeneration[]; total: number };
      setTotal(data.total);
      setGenerations((prev) => opts.append ? [...prev, ...data.generations] : data.generations);
    } catch {
      // aborted or network error
    } finally {
      setLoading(false);
    }
  }, [projectId, activeFileId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(0);
      fetchGenerations({ q, helperType: helperTypeFilter, fileFilter, offset: 0 });
    }, q !== debouncedQ.current ? 300 : 0);
    debouncedQ.current = q;
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, helperTypeFilter, fileFilter, projectId]);

  const handleDelete = useCallback(async (genId: string) => {
    await fetch(`/api/projects/${projectId}/word-generations/${genId}`, { method: 'DELETE' })
      .catch(() => {});
    setGenerations((prev) => prev.filter((g) => g.id !== genId));
    setTotal((t) => Math.max(0, t - 1));
  }, [projectId]);

  const loadMore = useCallback(() => {
    const next = offset + LIMIT;
    setOffset(next);
    fetchGenerations({ q, helperType: helperTypeFilter, fileFilter, offset: next, append: true });
  }, [offset, q, helperTypeFilter, fileFilter, fetchGenerations]);

  const hasMore = total > generations.length;
  const helperTypes = useMemo(() => WORD_HELPERS.map((h) => ({ id: h.id, label: h.label })), []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Search bar */}
      <div className="shrink-0 border-b border-border px-2 py-2 space-y-1.5">
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search word, suggestion, or file…"
            className="w-full rounded border border-border bg-muted/40 pl-6 pr-6 py-1 text-[11px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setFileFilter('all')}
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors border',
              fileFilter === 'all'
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                : 'text-muted-foreground/60 border-transparent hover:bg-accent',
            )}
          >
            All files
          </button>
          {activeFileName && (
            <button
              onClick={() => setFileFilter('current')}
              className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors border max-w-[120px] truncate',
                fileFilter === 'current'
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                  : 'text-muted-foreground/60 border-transparent hover:bg-accent',
              )}
              title={activeFileName}
            >
              {activeFileName}
            </button>
          )}

          <div className="h-3 w-px bg-border/60 mx-0.5" />

          <button
            onClick={() => setHelperTypeFilter('')}
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors border',
              !helperTypeFilter
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                : 'text-muted-foreground/60 border-transparent hover:bg-accent',
            )}
          >
            All types
          </button>
          {helperTypes.map((ht) => (
            <button
              key={ht.id}
              onClick={() => setHelperTypeFilter(helperTypeFilter === ht.id ? '' : ht.id)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors border',
                helperTypeFilter === ht.id
                  ? cn(HELPER_TYPE_COLORS[ht.id], 'opacity-100')
                  : 'text-muted-foreground/50 border-transparent hover:bg-accent',
              )}
            >
              {ht.label}
            </button>
          ))}

          {(helperTypeFilter || fileFilter !== 'all' || q) && (
            <button
              onClick={() => { setQ(''); setHelperTypeFilter(''); setFileFilter('all'); }}
              className="ml-auto flex items-center gap-0.5 text-[9px] text-muted-foreground/50 hover:text-muted-foreground"
            >
              <RotateCcw size={9} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      <div className="shrink-0 px-3 py-1 text-[9px] text-muted-foreground/50 border-b border-border/40">
        {loading ? 'Loading…' : `${total} word${total !== 1 ? 's' : ''}`}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading && generations.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground/50">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <span className="text-2xl opacity-30">✨</span>
            <p className="text-xs text-muted-foreground/60">No word generations yet</p>
            <p className="text-[10px] text-muted-foreground/40">
              Select text and press{' '}
              <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">Alt+S</kbd>
              {' '}to get synonyms
            </p>
          </div>
        ) : (
          <>
            {generations.map((gen) => (
              <WordRow
                key={gen.id}
                gen={gen}
                helperTypeFilter={helperTypeFilter}
                onDelete={() => handleDelete(gen.id)}
              />
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full rounded border border-dashed border-border py-1.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
              >
                {loading ? 'Loading…' : `Load more (${total - generations.length} remaining)`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
