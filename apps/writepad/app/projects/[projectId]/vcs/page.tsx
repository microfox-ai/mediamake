'use client';

/**
 * VCS Branch Graph
 *
 * Visualises the full commit DAG for a project: branches as vertical lanes,
 * commits as nodes, parent edges as bezier curves.  Clicking a commit shows a
 * detail panel with changed files and a link to open the diff in the editor.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import {
  ArrowLeft,
  RefreshCw,
  GitBranch,
  GitMerge,
  GitCommit,
  User,
  Clock,
  FileText,
  FilePlus,
  FileMinus,
  Pencil,
  ExternalLink,
  Loader2,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  headCommitId: string | null;
  createdBy: string;
  createdAt: string;
}

interface Commit {
  id: string;
  branchName: string;
  message: string;
  authorClientId: string;
  parentCommitId: string | null;
  mergeParentCommitId: string | null;
  createdAt: string;
}

interface CommitChange {
  id: string;
  fileId: string;
  changeType: 'add' | 'modify' | 'delete' | 'rename';
  snapshot: { name: string; content: string; type: string } | null;
  previousFileId: string | null;
}

interface CommitDetail extends Commit {
  changes: CommitChange[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BRANCH_COLORS = [
  '#8b5cf6', // violet  (main)
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#a855f7', // purple
  '#84cc16', // lime
  '#14b8a6', // teal
];

const ROW_H = 52;
const COL_W = 28;
const NODE_R = 6;
const GRAPH_PAD = 16;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function branchColor(colIndex: number): string {
  return BRANCH_COLORS[colIndex % BRANCH_COLORS.length]!;
}

function shortId(id: string) {
  return id.slice(0, 7);
}

function shortUser(clientId: string) {
  return clientId.slice(0, 10);
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function absTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** SVG path connecting two points — straight vertical or S-curve for cross-lane. */
function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  if (x1 === x2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  // Bezier S-curve: control points pull toward each column at the midpoint
  const mid = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
}

// ─── Graph SVG ────────────────────────────────────────────────────────────────

interface GraphSvgProps {
  commits: Commit[];
  branchCols: Record<string, number>;
  selectedId: string | null;
  headCommitIds: Set<string>;
  onSelect: (c: Commit) => void;
}

function GraphSvg({ commits, branchCols, selectedId, headCommitIds, onSelect }: GraphSvgProps) {
  const colCount = Math.max(1, Object.keys(branchCols).length);
  const svgW = GRAPH_PAD * 2 + colCount * COL_W;
  const svgH = commits.length * ROW_H;

  const commitIndex = useMemo(() => {
    const m = new Map<string, number>();
    commits.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [commits]);

  const commitMap = useMemo(() => {
    const m = new Map<string, Commit>();
    commits.forEach((c) => m.set(c.id, c));
    return m;
  }, [commits]);

  const colX = useCallback((col: number) => GRAPH_PAD + col * COL_W + COL_W / 2, []);
  const rowY = useCallback((row: number) => row * ROW_H + ROW_H / 2, []);

  // Build edge data
  const edges = useMemo(() => {
    const list: Array<{
      x1: number; y1: number; x2: number; y2: number;
      color: string; dashed: boolean;
    }> = [];
    for (const commit of commits) {
      const row1 = commitIndex.get(commit.id);
      if (row1 === undefined) continue;
      const col1 = branchCols[commit.branchName] ?? 0;
      const x1 = colX(col1);
      const y1 = rowY(row1);

      // Primary parent edge
      if (commit.parentCommitId) {
        const parent = commitMap.get(commit.parentCommitId);
        if (parent) {
          const row2 = commitIndex.get(parent.id);
          if (row2 !== undefined) {
            const col2 = branchCols[parent.branchName] ?? 0;
            list.push({ x1, y1, x2: colX(col2), y2: rowY(row2), color: branchColor(col1), dashed: false });
          }
        }
      }
      // Merge parent edge
      if (commit.mergeParentCommitId) {
        const parent = commitMap.get(commit.mergeParentCommitId);
        if (parent) {
          const row2 = commitIndex.get(parent.id);
          if (row2 !== undefined) {
            const col2 = branchCols[parent.branchName] ?? 0;
            list.push({ x1, y1, x2: colX(col2), y2: rowY(row2), color: branchColor(col2), dashed: true });
          }
        }
      }
    }
    return list;
  }, [commits, branchCols, commitIndex, commitMap, colX, rowY]);

  return (
    <svg
      width={svgW}
      height={svgH}
      className="shrink-0 overflow-visible"
      style={{ minHeight: svgH }}
    >
      {/* ── Edges ── */}
      {edges.map((e, i) => (
        <path
          key={i}
          d={edgePath(e.x1, e.y1, e.x2, e.y2)}
          stroke={e.color}
          strokeWidth={1.5}
          strokeDasharray={e.dashed ? '4 3' : undefined}
          fill="none"
          opacity={0.65}
        />
      ))}

      {/* ── Nodes ── */}
      {commits.map((commit, row) => {
        const col = branchCols[commit.branchName] ?? 0;
        const x = colX(col);
        const y = rowY(row);
        const color = branchColor(col);
        const isSelected = commit.id === selectedId;
        const isMerge = !!commit.mergeParentCommitId;
        const isHead = headCommitIds.has(commit.id);

        return (
          <g
            key={commit.id}
            onClick={() => onSelect(commit)}
            style={{ cursor: 'pointer' }}
          >
            {/* Selection ring */}
            {isSelected && (
              <circle cx={x} cy={y} r={NODE_R + 4} fill={color} opacity={0.2} />
            )}
            {/* Outer ring for HEAD */}
            {isHead && (
              <circle cx={x} cy={y} r={NODE_R + 2} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />
            )}
            {/* Main circle */}
            <circle
              cx={x} cy={y} r={NODE_R}
              fill={color}
              stroke={isSelected ? 'white' : 'transparent'}
              strokeWidth={1.5}
            />
            {/* Merge diamond indicator */}
            {isMerge && (
              <circle cx={x} cy={y} r={NODE_R - 3} fill="white" opacity={0.4} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Commit detail panel ──────────────────────────────────────────────────────

function CommitDetailPanel({
  commit,
  projectId,
  branches,
  onClose,
}: {
  commit: Commit;
  projectId: string;
  branches: Branch[];
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<CommitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/vcs/commits/${commit.id}`)
      .then((r) => r.json())
      .then((d) => setDetail(d as CommitDetail))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [commit.id, projectId]);

  const branch = branches.find((b) => b.name === commit.branchName);
  const branchCols: Record<string, number> = useMemo(() => {
    const cols: Record<string, number> = { main: 0 };
    let i = 1;
    branches.forEach((b) => { if (b.name !== 'main') cols[b.name] = i++; });
    return cols;
  }, [branches]);
  const col = branchCols[commit.branchName] ?? 0;
  const color = branchColor(col);

  const changeIcon = (ct: CommitChange['changeType']) => {
    if (ct === 'add') return <FilePlus size={12} className="text-emerald-500" />;
    if (ct === 'delete') return <FileMinus size={12} className="text-red-500" />;
    if (ct === 'rename') return <Pencil size={12} className="text-amber-500" />;
    return <FileText size={12} className="text-blue-400" />;
  };

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <GitCommit size={14} className="shrink-0" style={{ color }} />
          <span className="font-mono text-xs text-muted-foreground">{shortId(commit.id)}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Message */}
        <div>
          <p className="text-sm font-semibold leading-snug text-foreground">{commit.message}</p>
          {!!commit.mergeParentCommitId && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-400">
              <GitMerge size={9} /> Merge commit
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User size={11} className="shrink-0" />
            <span className="font-mono">{shortUser(commit.authorClientId)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock size={11} className="shrink-0" />
            <span title={absTime(commit.createdAt)}>{absTime(commit.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <GitBranch size={11} className="shrink-0" />
            <span className="font-medium" style={{ color }}>{commit.branchName}</span>
          </div>
          {commit.parentCommitId && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ChevronRight size={11} className="shrink-0" />
              <span className="font-mono text-[10px]">parent: {shortId(commit.parentCommitId)}</span>
            </div>
          )}
        </div>

        {/* Changed files */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Files changed {detail ? `(${detail.changes.length})` : ''}
          </p>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-1">
              {(detail?.changes ?? []).map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                >
                  {changeIcon(ch.changeType)}
                  <span className="flex-1 truncate font-mono text-foreground/80">
                    {ch.snapshot?.name ?? ch.fileId}
                  </span>
                  <span className={cn(
                    'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase',
                    ch.changeType === 'add' && 'bg-emerald-500/15 text-emerald-500',
                    ch.changeType === 'delete' && 'bg-red-500/15 text-red-500',
                    ch.changeType === 'modify' && 'bg-blue-500/15 text-blue-400',
                    ch.changeType === 'rename' && 'bg-amber-500/15 text-amber-500',
                  )}>
                    {ch.changeType}
                  </span>
                </div>
              ))}
              {detail?.changes.length === 0 && (
                <p className="py-2 text-xs text-muted-foreground/60">No file changes recorded.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer: open in editor with commit pre-loaded */}
      <div className="border-t border-border px-4 py-3 space-y-2">
        <Link
          href={`/projects/${projectId}?commit=${commit.id}&branch=${encodeURIComponent(commit.branchName)}`}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ExternalLink size={12} />
          Open Commit Diff in Editor
        </Link>
        <Link
          href={`/projects/${projectId}?branch=${encodeURIComponent(commit.branchName)}`}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          Open Editor on this Branch
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function VcsGraphContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.projectId as string) ?? '';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [visibleBranches, setVisibleBranches] = useState<Set<string>>(new Set());
  const [authorFilter, setAuthorFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const graphRef = useRef<HTMLDivElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d: { name?: string }) => { if (d.name) setProjectName(d.name); })
      .catch(() => {});
  }, [projectId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/vcs/graph`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json() as { branches: Branch[]; commits: Commit[] };
      setBranches(d.branches);
      setCommits(d.commits);
      setVisibleBranches(new Set(d.branches.map((b) => b.name)));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  // ── Computed ───────────────────────────────────────────────────────────────

  // Branch → column index (main always 0)
  const branchCols = useMemo<Record<string, number>>(() => {
    const cols: Record<string, number> = {};
    let i = 0;
    // main first
    if (branches.some((b) => b.name === 'main')) cols['main'] = i++;
    branches.forEach((b) => { if (b.name !== 'main') cols[b.name] = i++; });
    return cols;
  }, [branches]);

  // Set of all branch HEAD commit IDs (to render special marker)
  const headCommitIds = useMemo(
    () => new Set(branches.map((b) => b.headCommitId).filter(Boolean) as string[]),
    [branches],
  );

  // All unique authors
  const allAuthors = useMemo(
    () => [...new Set(commits.map((c) => c.authorClientId))],
    [commits],
  );

  // Filtered + sorted commits (newest at top)
  const filteredCommits = useMemo(() => {
    let list = [...commits].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (visibleBranches.size < branches.length) {
      list = list.filter((c) => visibleBranches.has(c.branchName));
    }
    if (authorFilter) {
      list = list.filter((c) => c.authorClientId.includes(authorFilter));
    }
    return list;
  }, [commits, visibleBranches, authorFilter, branches.length]);

  // Visible branch columns for filtered view
  const visibleBranchCols = useMemo(() => {
    const activeBranches = [...visibleBranches];
    const cols: Record<string, number> = {};
    let i = 0;
    if (activeBranches.includes('main')) cols['main'] = i++;
    activeBranches.forEach((b) => { if (b !== 'main') cols[b] = i++; });
    return cols;
  }, [visibleBranches]);

  const graphWidth = Math.max(1, Object.keys(visibleBranchCols).length) * COL_W + GRAPH_PAD * 2;

  const toggleBranch = (name: string) => {
    setVisibleBranches((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else next.add(name);
      return next;
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-background">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <span className="text-muted-foreground text-xs">/</span>
          {projectName && (
            <>
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">{projectName}</span>
              <span className="text-muted-foreground text-xs">/</span>
            </>
          )}
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <GitBranch size={14} className="text-violet-500" />
            Branch Graph
          </span>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {filteredCommits.length} commits · {branches.length} branches
            </span>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-t border-border/50 px-4 py-2 overflow-x-auto">
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Branches:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {branches.map((b) => {
              const col = branchCols[b.name] ?? 0;
              const active = visibleBranches.has(b.name);
              return (
                <button
                  key={b.name}
                  onClick={() => toggleBranch(b.name)}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all',
                    active
                      ? 'border-transparent text-white'
                      : 'border-border bg-transparent text-muted-foreground hover:border-border/80',
                  )}
                  style={active ? { backgroundColor: branchColor(col) } : {}}
                >
                  <GitBranch size={9} />
                  {b.name}
                  {b.headCommitId && active && (
                    <span className="ml-0.5 rounded-full bg-white/20 px-1 text-[9px]">HEAD</span>
                  )}
                </button>
              );
            })}
          </div>

          {allAuthors.length > 1 && (
            <>
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground ml-2">Author:</span>
              <select
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-foreground outline-none"
              >
                <option value="">All</option>
                {allAuthors.map((a) => (
                  <option key={a} value={a}>{shortUser(a)}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {loading && !commits.length ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      ) : filteredCommits.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground/50">
          <GitBranch size={40} />
          <p className="text-sm font-medium">No commits yet</p>
          <p className="text-xs">Make your first commit in the project editor.</p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* ── Graph column ─────────────────────────────────────────────── */}
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

            {/* Branch column headers */}
            <div
              className="shrink-0 border-b border-border bg-muted/20 flex items-center gap-0"
              style={{ paddingLeft: graphWidth }}
            >
              <div className="flex items-center gap-6 px-4 py-1.5">
                {[...visibleBranches].map((bname) => {
                  const col = visibleBranchCols[bname] ?? 0;
                  return (
                    <span
                      key={bname}
                      className="text-[10px] font-semibold"
                      style={{ color: branchColor(col) }}
                    >
                      {bname}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Scrollable graph rows */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden" ref={graphRef}>
              <div className="relative" style={{ height: filteredCommits.length * ROW_H }}>
                {/* SVG layer for edges + nodes */}
                <div className="absolute left-0 top-0" style={{ width: graphWidth, height: filteredCommits.length * ROW_H }}>
                  <GraphSvg
                    commits={filteredCommits}
                    branchCols={visibleBranchCols}
                    selectedId={selectedCommit?.id ?? null}
                    headCommitIds={headCommitIds}
                    onSelect={setSelectedCommit}
                  />
                </div>

                {/* HTML overlay: commit rows */}
                {filteredCommits.map((commit, row) => {
                  const col = visibleBranchCols[commit.branchName] ?? 0;
                  const color = branchColor(col);
                  const isSelected = commit.id === selectedCommit?.id;
                  const isMerge = !!commit.mergeParentCommitId;
                  const isHead = headCommitIds.has(commit.id);

                  return (
                    <div
                      key={commit.id}
                      onClick={() => setSelectedCommit(isSelected ? null : commit)}
                      className={cn(
                        'absolute flex cursor-pointer items-center gap-3 pr-4 transition-colors',
                        isSelected ? 'bg-accent/60' : 'hover:bg-muted/40',
                      )}
                      style={{
                        top: row * ROW_H,
                        left: graphWidth,
                        right: 0,
                        height: ROW_H,
                      }}
                    >
                      {/* Branch indicator line */}
                      <div className="shrink-0 h-4 w-0.5 rounded-full" style={{ backgroundColor: color }} />

                      {/* Commit info */}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {isMerge && (
                            <GitMerge size={10} className="shrink-0 text-violet-400" />
                          )}
                          <span className={cn('truncate text-sm font-medium', isSelected ? 'text-foreground' : 'text-foreground/90')}>
                            {commit.message}
                          </span>
                          {isHead && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                              style={{ backgroundColor: color }}
                            >
                              HEAD
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="font-mono" style={{ color }}>{commit.branchName}</span>
                          <span className="flex items-center gap-0.5">
                            <User size={8} />
                            {shortUser(commit.authorClientId)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Clock size={8} />
                            {relTime(commit.createdAt)}
                          </span>
                          <span className="font-mono opacity-50">{shortId(commit.id)}</span>
                        </div>
                      </div>

                      <ChevronRight
                        size={14}
                        className={cn(
                          'shrink-0 transition-transform text-muted-foreground/40',
                          isSelected && 'rotate-90 text-foreground/60',
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Commit detail panel ───────────────────────────────────────── */}
          {selectedCommit && (
            <div className="w-80 shrink-0">
              <CommitDetailPanel
                key={selectedCommit.id}
                commit={selectedCommit}
                projectId={projectId}
                branches={branches}
                onClose={() => setSelectedCommit(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function VcsGraphPage() {
  return (
    <ProtectedPage>
      <VcsGraphContent />
    </ProtectedPage>
  );
}
