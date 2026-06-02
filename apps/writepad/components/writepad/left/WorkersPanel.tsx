'use client';

/**
 * WorkersPanel — generic left-sidebar panel for ALL background workers.
 *
 * Features:
 *   - "+ New" dropdown listing every entry from WORKER_REGISTRY
 *   - Advanced filters:
 *       · Status (All / Queued / Running / Completed / Failed)
 *       · Worker (All / per-worker pills, only those with at least one run)
 *       · Time range (All / Today / Last 7 days / Last 30 days)
 *   - Sort: newest first, oldest first, worker label A→Z, duration desc
 *   - Group by: none, worker, date
 *   - Free-text search across jobId / progress message / worker label
 *
 * Triggering, status polling, and output rendering all happen elsewhere
 * (TriggerForm + WorkerRunPane + useWorkflowJob). This panel is a pure
 * list/filter UI.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronDown,
  ArrowDownUp,
  Filter as FilterIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { WORKER_REGISTRY, getWorkerEntry } from '@/lib/workers/registry';

interface WorkerRunSummary {
  jobId: string;
  workerId: string;
  status: string;
  progress?: number;
  progressMessage?: string;
  metadata?: Record<string, unknown>;
  output?: unknown;
  error?: { message: string };
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

type StatusFilter = 'all' | 'queued' | 'running' | 'completed' | 'failed';
type TimeFilter = 'all' | '24h' | '7d' | '30d';
type SortOrder = 'newest' | 'oldest' | 'worker' | 'duration';
type GroupBy = 'none' | 'worker' | 'date';

interface WorkersPanelProps {
  projectId: string;
  /** Currently-open run (highlighted in the list). */
  activeJobId?: string | null;
  /** Open a worker run in the middle pane. */
  onOpenRun: (workerId: string, jobId: string) => void;
  /** Open a trigger form for the given worker in the middle pane. */
  onOpenTrigger: (workerId: string) => void;
  /**
   * Increments whenever the parent has just-triggered a new run. The panel
   * uses this as a signal to refetch its job list.
   */
  refetchSignal?: number;
}

const STATUS_FILTERS: { id: StatusFilter; label: string; statuses: string[] }[] = [
  { id: 'all', label: 'All', statuses: [] },
  { id: 'queued', label: 'Queued', statuses: ['queued'] },
  { id: 'running', label: 'Running', statuses: ['running'] },
  { id: 'completed', label: 'Done', statuses: ['completed'] },
  { id: 'failed', label: 'Failed', statuses: ['failed', 'partial'] },
];

const TIME_FILTERS: { id: TimeFilter; label: string; ms: number | null }[] = [
  { id: 'all', label: 'All time', ms: null },
  { id: '24h', label: 'Last 24 h', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
];

const SORT_OPTIONS: { id: SortOrder; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'worker', label: 'Worker A → Z' },
  { id: 'duration', label: 'Longest first' },
];

const GROUP_OPTIONS: { id: GroupBy; label: string }[] = [
  { id: 'none', label: 'Flat list' },
  { id: 'worker', label: 'Group by worker' },
  { id: 'date', label: 'Group by date' },
];

const TERMINAL = new Set(['completed', 'failed', 'partial']);

export function WorkersPanel({
  projectId,
  activeJobId,
  onOpenRun,
  onOpenTrigger,
  refetchSignal = 0,
}: WorkersPanelProps) {
  const [runs, setRuns] = useState<WorkerRunSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  // ── Filter / sort / group state ───────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── New-run picker dropdown ───────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  // ── Fetch runs ────────────────────────────────────────────────────────────
  async function fetchRuns() {
    try {
      const url = `/api/projects/${projectId}/worker-runs?limit=200`;
      const res = await fetch(url);
      if (!res.ok) {
        setLoaded(true);
        return;
      }
      const data = (await res.json()) as { runs?: WorkerRunSummary[] };
      setRuns(data.runs ?? []);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }

  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refetchSignal]);

  // Auto-refresh every 4s while any run is non-terminal; every 30s otherwise.
  useEffect(() => {
    const hasActive = runs.some((r) => !TERMINAL.has(r.status));
    const interval = hasActive ? 4000 : 30000;
    const id = setInterval(fetchRuns, interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const statusList =
      STATUS_FILTERS.find((f) => f.id === statusFilter)?.statuses ?? [];
    const timeMs =
      TIME_FILTERS.find((f) => f.id === timeFilter)?.ms ?? null;
    const cutoff = timeMs ? Date.now() - timeMs : null;

    return runs.filter((r) => {
      if (statusList.length > 0 && !statusList.includes(r.status)) return false;
      if (workerFilter !== 'all' && r.workerId !== workerFilter) return false;
      if (cutoff != null) {
        const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        if (ts < cutoff) return false;
      }
      if (search) {
        const needle = search.toLowerCase();
        const entryLabel = getWorkerEntry(r.workerId)?.label ?? '';
        const hay = [
          r.jobId,
          r.progressMessage ?? '',
          r.workerId,
          entryLabel,
          r.error?.message ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [runs, statusFilter, workerFilter, timeFilter, search]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortOrder === 'newest') {
      arr.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    } else if (sortOrder === 'oldest') {
      arr.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
    } else if (sortOrder === 'worker') {
      arr.sort((a, b) => {
        const al = getWorkerEntry(a.workerId)?.label ?? a.workerId;
        const bl = getWorkerEntry(b.workerId)?.label ?? b.workerId;
        const cmp = al.localeCompare(bl);
        if (cmp !== 0) return cmp;
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      });
    } else if (sortOrder === 'duration') {
      arr.sort((a, b) => durationMs(b) - durationMs(a));
    }
    return arr;
  }, [filtered, sortOrder]);

  // ── Group ─────────────────────────────────────────────────────────────────
  const grouped = useMemo<{ key: string; label: string; runs: WorkerRunSummary[] }[]>(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', runs: sorted }];
    }
    if (groupBy === 'worker') {
      const map = new Map<string, WorkerRunSummary[]>();
      for (const r of sorted) {
        if (!map.has(r.workerId)) map.set(r.workerId, []);
        map.get(r.workerId)!.push(r);
      }
      return Array.from(map.entries()).map(([wid, list]) => ({
        key: wid,
        label: getWorkerEntry(wid)?.label ?? wid,
        runs: list,
      }));
    }
    // date grouping
    const map = new Map<string, WorkerRunSummary[]>();
    for (const r of sorted) {
      const k = dateBucket(r.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries()).map(([k, list]) => ({
      key: k,
      label: k,
      runs: list,
    }));
  }, [sorted, groupBy]);

  // ── Workers in use (for filter pills) ─────────────────────────────────────
  const workersInUse = useMemo(() => {
    const ids = new Set(runs.map((r) => r.workerId));
    return WORKER_REGISTRY.filter((w) => ids.has(w.workerId));
  }, [runs]);

  // ── Counts (for status pill badges) ──────────────────────────────────────
  const statusCounts = useMemo(() => {
    const within = runs.filter((r) => {
      if (workerFilter !== 'all' && r.workerId !== workerFilter) return false;
      const timeMs = TIME_FILTERS.find((f) => f.id === timeFilter)?.ms ?? null;
      if (timeMs) {
        const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        if (ts < Date.now() - timeMs) return false;
      }
      return true;
    });
    return STATUS_FILTERS.reduce<Record<StatusFilter, number>>((acc, f) => {
      acc[f.id] =
        f.statuses.length === 0
          ? within.length
          : within.filter((r) => f.statuses.includes(r.status)).length;
      return acc;
    }, {} as Record<StatusFilter, number>);
  }, [runs, workerFilter, timeFilter]);

  async function handleDelete(run: WorkerRunSummary) {
    const reportId = (run.metadata as { reportId?: string } | undefined)?.reportId
      ?? (run.output as { reportId?: string } | undefined)?.reportId;
    const confirmMsg =
      run.workerId === 'continuity-orchestrator' && reportId
        ? 'Delete this run and its persisted report?'
        : 'Remove this run from the list?';
    if (!window.confirm(confirmMsg)) return;
    if (run.workerId === 'continuity-orchestrator' && reportId) {
      await fetch(`/api/projects/${projectId}/continuity-checks/${reportId}`, {
        method: 'DELETE',
      });
    }
    setRuns((prev) => prev.filter((r) => r.jobId !== run.jobId));
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/70">
            Workers
          </span>
          <div className="relative" ref={pickerRef}>
            <Button
              size="sm"
              onClick={() => setPickerOpen((v) => !v)}
              className="h-6 gap-1 bg-cyan-500 px-2 text-[10px] text-white hover:bg-cyan-400"
            >
              <Plus size={11} />
              New
              <ChevronDown size={9} className="ml-0.5 -mr-0.5" />
            </Button>
            {pickerOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-border bg-popover shadow-lg">
                <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Available workers
                </div>
                <div className="max-h-72 overflow-y-auto pb-1">
                  {WORKER_REGISTRY.map((w) => (
                    <button
                      key={w.workerId}
                      onClick={() => {
                        setPickerOpen(false);
                        onOpenTrigger(w.workerId);
                      }}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent/40"
                    >
                      <w.Icon
                        size={14}
                        className={`mt-0.5 shrink-0 ${accentTextClass(w.accent)}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-foreground">{w.label}</p>
                        <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground/60">
                          {w.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Status filter row ─────────────────────────────────────── */}
        <div className="shrink-0 space-y-1 border-b border-border/40 px-2 py-2">
          <div className="flex flex-wrap items-center gap-0.5">
            {STATUS_FILTERS.map((f) => {
              const count = statusCounts[f.id] ?? 0;
              return (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                    statusFilter === f.id
                      ? 'bg-foreground/10 text-foreground'
                      : 'text-muted-foreground/50 hover:text-muted-foreground',
                  )}
                >
                  {f.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1 text-[9px]',
                        statusFilter === f.id ? 'bg-foreground/15' : 'bg-muted/60',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className={cn(
                'ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors',
                showAdvanced
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground/40 hover:text-muted-foreground',
              )}
              title="Advanced filters"
            >
              <FilterIcon size={9} />
              {showAdvanced ? 'Hide' : 'More'}
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-1.5 rounded bg-muted/60 px-2 py-1">
            <Search size={10} className="text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search runs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[10px] text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-muted-foreground/40 hover:text-foreground"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Advanced row (collapsible) */}
          {showAdvanced && (
            <div className="space-y-1.5 pt-1">
              {/* Worker filter */}
              {workersInUse.length > 0 && (
                <div className="flex flex-wrap items-center gap-0.5">
                  <span className="mr-1 text-[9px] uppercase tracking-wider text-muted-foreground/40">
                    Worker
                  </span>
                  <button
                    onClick={() => setWorkerFilter('all')}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[9px] transition-colors',
                      workerFilter === 'all'
                        ? 'bg-foreground/10 text-foreground'
                        : 'text-muted-foreground/40 hover:text-muted-foreground',
                    )}
                  >
                    All
                  </button>
                  {workersInUse.map((w) => (
                    <button
                      key={w.workerId}
                      onClick={() => setWorkerFilter(w.workerId)}
                      className={cn(
                        'flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] transition-colors',
                        workerFilter === w.workerId
                          ? `bg-foreground/10 ${accentTextClass(w.accent)}`
                          : 'text-muted-foreground/40 hover:text-muted-foreground',
                      )}
                    >
                      <w.Icon size={9} />
                      {w.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Time filter */}
              <div className="flex flex-wrap items-center gap-0.5">
                <span className="mr-1 text-[9px] uppercase tracking-wider text-muted-foreground/40">
                  When
                </span>
                {TIME_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTimeFilter(f.id)}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[9px] transition-colors',
                      timeFilter === f.id
                        ? 'bg-foreground/10 text-foreground'
                        : 'text-muted-foreground/40 hover:text-muted-foreground',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sort + Group */}
              <div className="flex items-center gap-1">
                <SmallSelect
                  Icon={ArrowDownUp}
                  value={sortOrder}
                  options={SORT_OPTIONS}
                  onChange={(v) => setSortOrder(v as SortOrder)}
                />
                <SmallSelect
                  value={groupBy}
                  options={GROUP_OPTIONS}
                  onChange={(v) => setGroupBy(v as GroupBy)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Run list ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {!loaded ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={14} className="animate-spin text-muted-foreground/40" />
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState hasAnyRuns={runs.length > 0} />
          ) : (
            <div>
              {grouped.map((group) => (
                <div key={group.key}>
                  {group.label && (
                    <div className="sticky top-0 z-10 border-b border-border/30 bg-card/95 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 backdrop-blur">
                      {group.label}
                      <span className="ml-1 text-muted-foreground/40">
                        ({group.runs.length})
                      </span>
                    </div>
                  )}
                  <div className="divide-y divide-border/30">
                    {group.runs.map((run) => (
                      <RunRow
                        key={run.jobId}
                        run={run}
                        active={run.jobId === activeJobId}
                        onOpen={() => onOpenRun(run.workerId, run.jobId)}
                        onDelete={() => handleDelete(run)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── Tiny inline select (no dropdown library) ──────────────────────────────────

interface SmallSelectProps<T extends string> {
  Icon?: import('lucide-react').LucideIcon;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}

function SmallSelect<T extends string>({ Icon, value, options, onChange }: SmallSelectProps<T>) {
  return (
    <label className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-foreground">
      {Icon && <Icon size={9} />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer bg-transparent outline-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-card text-foreground">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasAnyRuns }: { hasAnyRuns: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <p className="text-[11px] text-muted-foreground/40">
        {hasAnyRuns ? 'No runs match the current filters' : 'No runs yet'}
      </p>
      <p className="text-[10px] leading-relaxed text-muted-foreground/30">
        Click <span className="font-medium">+ New</span> to start a worker.
      </p>
    </div>
  );
}

// ── Run row ──────────────────────────────────────────────────────────────────

interface RunRowProps {
  run: WorkerRunSummary;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

function RunRow({ run, active, onOpen, onDelete }: RunRowProps) {
  const entry = getWorkerEntry(run.workerId);
  const Icon = entry?.Icon;
  const accent = entry?.accent;

  const StatusIcon =
    run.status === 'running' || run.status === 'queued'
      ? Loader2
      : run.status === 'failed'
        ? XCircle
        : run.status === 'partial'
          ? Clock
          : CheckCircle2;
  const statusColor =
    run.status === 'running' || run.status === 'queued'
      ? 'text-cyan-400'
      : run.status === 'failed'
        ? 'text-destructive'
        : run.status === 'partial'
          ? 'text-amber-400'
          : 'text-emerald-400/70';
  const isAnimated = run.status === 'running' || run.status === 'queued';

  const label = entry?.label ?? run.workerId;
  const dateLabel = formatRelative(run.createdAt);
  const dur = durationMs(run);

  // Subtitle priority: progress message → error → status + time
  const subtitle =
    run.progressMessage ??
    run.error?.message ??
    `${run.status}${dateLabel ? ` · ${dateLabel}` : ''}${
      dur > 0 ? ` · ${formatDuration(dur)}` : ''
    }`;

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/30',
        active && 'bg-cyan-500/10',
      )}
    >
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <StatusIcon
          size={11}
          className={cn('shrink-0', statusColor, isAnimated && 'animate-spin')}
        />
        {Icon && <Icon size={11} className={cn('shrink-0', accentTextClass(accent))} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[11px] font-medium text-foreground/80">{label}</span>
            {run.status === 'completed' && (
              <span className="text-[9px] text-muted-foreground/40">{dateLabel}</span>
            )}
          </div>
          <span className="truncate text-[9px] text-muted-foreground/50">{subtitle}</span>
        </div>
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="shrink-0 rounded p-1 text-muted-foreground/30 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 size={11} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-[10px]">
          Delete run
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function accentTextClass(accent?: string): string {
  if (accent === 'cyan') return 'text-cyan-400';
  if (accent === 'violet') return 'text-violet-400';
  if (accent === 'amber') return 'text-amber-400';
  return 'text-foreground/70';
}

function durationMs(r: WorkerRunSummary): number {
  if (!r.createdAt) return 0;
  const start = new Date(r.createdAt).getTime();
  const end = r.completedAt
    ? new Date(r.completedAt).getTime()
    : r.updatedAt
      ? new Date(r.updatedAt).getTime()
      : Date.now();
  return Math.max(0, end - start);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m}m ${rs}s`;
}

function formatRelative(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dateBucket(iso?: string): string {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (sameYesterday) return 'Yesterday';
  const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (daysAgo < 7) return 'Last 7 days';
  if (daysAgo < 30) return 'Last 30 days';
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}
