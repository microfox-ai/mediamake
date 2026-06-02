'use client';

/**
 * ContinuityOutputViewer
 *
 * Custom output renderer for the continuity-orchestrator worker.
 * Rendered inside the generic WorkerRunPane (middle panel) once the job has
 * run far enough to have a `reportId` in its output (or metadata).
 *
 * The job's output is `{ reportId, totalIssues, totalFiles, totalShards, durationMs }`.
 * The full Issue array is stored in MongoDB `continuity_reports` and fetched
 * on demand by this component via the `[reportId]` GET route — that endpoint
 * is the worker's own persistence layer, not part of the workers framework.
 */

import { useEffect, useState } from 'react';
import {
  Loader2,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  ScrollText,
  GitCompare,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  FileText,
  HardHat,
  HourglassIcon,
  RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Issue,
  IssueCategory,
  IssueSeverity,
  ContinuityReportStats,
  ContinuityScope,
  FileLocation,
} from '@/lib/continuity/types';
import type { OutputViewerProps } from '@/lib/workers/registry';

interface ShardError {
  shardIndex: number;
  message: string;
}

/** Pull the build version stamp out of an errorMessage that starts with "[<version>] ". */
function extractBuildVersion(msg?: string): { version?: string; rest?: string } {
  if (!msg) return {};
  // Match "[version] rest" — split manually to avoid the `s` regex flag (ES2018+).
  if (!msg.startsWith('[')) return { rest: msg };
  const closeIdx = msg.indexOf(']');
  if (closeIdx <= 1) return { rest: msg };
  const version = msg.slice(1, closeIdx);
  const rest = msg.slice(closeIdx + 1).replace(/^\s+/, '');
  return { version, rest };
}

interface ReportData {
  id: string;
  projectId: string;
  jobId: string;
  scope: ContinuityScope;
  modelId: string;
  status: 'completed' | 'failed';
  issues: Issue[];
  stats: ContinuityReportStats;
  errorMessage?: string;
  shardErrors?: ShardError[];
  createdAt: string;
  completedAt: string;
}

const CATEGORY_META: Record<
  IssueCategory,
  { label: string; Icon: typeof HardHat; color: string }
> = {
  contradiction: { label: 'Contradictions', Icon: GitCompare, color: 'text-red-400' },
  age: { label: 'Age inconsistencies', Icon: User, color: 'text-amber-400' },
  timeline: { label: 'Timeline gaps', Icon: Clock, color: 'text-violet-400' },
  location: { label: 'Location issues', Icon: MapPin, color: 'text-emerald-400' },
  character: { label: 'Character details', Icon: User, color: 'text-cyan-400' },
  other: { label: 'Other', Icon: ScrollText, color: 'text-foreground/60' },
};

const SEVERITY_STYLE: Record<IssueSeverity, string> = {
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-muted/40 text-muted-foreground border-border',
};

export function ContinuityOutputViewer({
  projectId,
  job,
  filePathToFileId,
  onJumpToLocation,
  onRequestRerun,
}: OutputViewerProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pull the persisted reportId from job output / metadata.
  const reportId =
    (job.output as { reportId?: string } | undefined)?.reportId ??
    (job.metadata as { reportId?: string } | undefined)?.reportId ??
    null;

  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/projects/${projectId}/continuity-checks/${reportId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { report: ReportData };
        if (!cancelled) setReport(data.report);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, reportId]);

  // ── Job still running — show progress instead of report ─────────────────
  if (job.status === 'running' || job.status === 'queued') {
    return <RunningView job={job} />;
  }

  if (job.status === 'failed') {
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-6 py-12">
        {onRequestRerun && (
          <div className="flex justify-end">
            <button
              onClick={onRequestRerun}
              className="inline-flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-medium text-cyan-400 hover:bg-cyan-500/20"
            >
              <RotateCw size={11} />
              Re-run
            </button>
          </div>
        )}
        <div className="flex items-start gap-3 rounded border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
          <div className="text-[12px] text-destructive">
            <p className="font-medium">Continuity check failed</p>
            {job.error?.message && (
              <p className="mt-1 text-destructive/80">{job.error.message}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Completed but no reportId or still loading
  if (!reportId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground/50">
        <span className="text-[11px]">Job completed but no report was produced.</span>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground/50">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-[11px]">Loading report…</span>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <AlertTriangle size={20} className="text-destructive/70" />
        <p className="text-[11px] text-destructive">Failed to load report</p>
        <p className="text-[10px] text-muted-foreground/40">{loadError}</p>
      </div>
    );
  }
  if (!report) return null;

  return (
    <ReportBody
      report={report}
      filePathToFileId={filePathToFileId}
      onJumpToLocation={onJumpToLocation}
      onRequestRerun={onRequestRerun}
    />
  );
}

// ── Running view ─────────────────────────────────────────────────────────────

function RunningView({ job }: { job: OutputViewerProps['job'] }) {
  const meta = (job.metadata ?? {}) as {
    phase?: string;
    shardsCompleted?: number;
    totalShards?: number;
    partialIssueCount?: number;
    totalFiles?: number;
  };
  const progress =
    (job as { progress?: number }).progress ??
    (meta.totalShards
      ? Math.round(((meta.shardsCompleted ?? 0) / meta.totalShards) * 100)
      : undefined);
  const message = (job as { progressMessage?: string }).progressMessage;

  return (
    <div className="mx-auto max-w-xl px-6 py-12 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
        <HourglassIcon size={20} className="animate-pulse text-cyan-400" />
      </div>
      <h2 className="mt-4 text-[14px] font-medium text-foreground">
        Continuity check running…
      </h2>
      <p className="mt-1 text-[11px] text-muted-foreground/60">
        {message ?? `Phase: ${meta.phase ?? job.status}`}
      </p>

      {progress != null && (
        <div className="mx-auto mt-5 max-w-sm">
          <div className="h-2 overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground/50">{progress}%</p>
        </div>
      )}

      {meta.totalShards != null && (
        <p className="mt-3 text-[10px] text-muted-foreground/40">
          Shard {meta.shardsCompleted ?? 0} / {meta.totalShards}
          {meta.partialIssueCount != null && (
            <> · {meta.partialIssueCount} issues found so far</>
          )}
        </p>
      )}
    </div>
  );
}

// ── Report body ──────────────────────────────────────────────────────────────

function ReportBody({
  report,
  filePathToFileId,
  onJumpToLocation,
  onRequestRerun,
}: {
  report: ReportData;
  filePathToFileId: Record<string, string>;
  onJumpToLocation?: (fileId: string, lineNumber: number) => void;
  onRequestRerun?: () => void;
}) {
  const grouped = groupByCategory(report.issues);

  // Detect a suspiciously-fast completion: an AI call against any real model
  // takes seconds. < 2s with 0 issues across ≥1 shard almost certainly means
  // the model returned without doing real work (silent provider failure,
  // missing API key on Lambda, network block, etc.).
  const isSuspicious =
    report.status === 'completed' &&
    report.issues.length === 0 &&
    report.stats.totalShards > 0 &&
    report.stats.durationMs < 2000;

  const hasErrors =
    report.status === 'failed' ||
    !!(report.shardErrors && report.shardErrors.length > 0) ||
    isSuspicious;

  // Pull the worker build version out of errorMessage (if the orchestrator
  // stamped it). Lets the user verify the deployed Lambda is running the
  // expected code.
  const errorParts = extractBuildVersion(report.errorMessage);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      {/* ── Stats ────────────────────────────────────────────────── */}
      <section className="grid grid-cols-4 gap-2">
        <StatCard label="Issues" value={report.issues.length} />
        <StatCard label="Files scanned" value={report.stats.totalFiles} />
        <StatCard label="Shards" value={report.stats.totalShards} />
        <StatCard
          label="Duration"
          value={`${(report.stats.durationMs / 1000).toFixed(1)}s`}
          highlight={isSuspicious ? 'destructive' : undefined}
        />
      </section>

      {hasErrors && (
        <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-destructive" />
            <div className="flex-1 text-[12px] text-destructive">
              <p className="font-semibold">
                {report.status === 'failed'
                  ? 'Report did not complete successfully'
                  : isSuspicious
                    ? 'Suspiciously fast completion — likely silent failure'
                    : 'Some shards failed during analysis'}
              </p>
              {report.errorMessage && (
                <p className="mt-1 text-[11px] text-destructive/80">{errorParts.rest ?? report.errorMessage}</p>
              )}
              {errorParts.version && (
                <p className="mt-0.5 font-mono text-[9px] text-destructive/50">
                  worker build: {errorParts.version}
                </p>
              )}
              {isSuspicious && !report.errorMessage && (
                <p className="mt-1 text-[11px] text-destructive/80">
                  This run completed in {(report.stats.durationMs / 1000).toFixed(1)}s with 0 issues.
                  A real AI call against {report.modelId} normally takes several seconds. Most likely
                  the model call short-circuited without analysing your files.
                </p>
              )}
            </div>
            {onRequestRerun && (
              <button
                onClick={onRequestRerun}
                className="shrink-0 gap-1.5 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/20 inline-flex items-center"
              >
                <RotateCw size={10} />
                Re-run
              </button>
            )}
          </div>
          {report.shardErrors && report.shardErrors.length > 0 && (
            <details className="ml-6 text-[11px] text-destructive/80" open={report.shardErrors.length === 1}>
              <summary className="cursor-pointer font-medium hover:text-destructive">
                Error details ({report.shardErrors.length})
              </summary>
              <div className="mt-1.5 space-y-2 pl-2">
                {report.shardErrors.map((e, i) => (
                  <div
                    key={i}
                    className="rounded border border-destructive/20 bg-destructive/5 p-2"
                  >
                    <p className="mb-1 text-[10px] font-semibold text-destructive/70">
                      {e.shardIndex < 0 ? 'Fatal error' : `Shard ${e.shardIndex}`}
                    </p>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-destructive/80">
                      {e.message}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          )}
          <ul className="ml-6 list-disc pl-4 text-[10px] text-destructive/70 space-y-0.5">
            <li>Missing AI provider API key on the worker Lambda (GEMINI/ANTHROPIC/OPENAI_API_KEY)</li>
            <li>Worker not redeployed after recent code changes — run <code className="rounded bg-destructive/15 px-1 font-mono">npx ai-worker push</code></li>
            <li>Model name typo or model rejected the structured output schema</li>
            <li>Lambda hit network block / timeout / quota limit</li>
          </ul>
        </div>
      )}

      {report.issues.length === 0 && !hasErrors ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-6 py-12 text-center">
          <CheckCircle2 size={24} className="text-emerald-400/70" />
          <p className="text-[12px] font-medium text-emerald-400">
            No continuity issues found
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            The model didn&rsquo;t flag any contradictions, age, timeline, or location issues
            in the scanned files.
          </p>
        </div>
      ) : report.issues.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, issues]) => (
            <CategorySection
              key={cat}
              category={cat as IssueCategory}
              issues={issues}
              filePathToFileId={filePathToFileId}
              onJumpToLocation={onJumpToLocation}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: 'destructive';
}) {
  return (
    <div
      className={cn(
        'rounded border bg-card/50 px-3 py-2',
        highlight === 'destructive'
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-border',
      )}
    >
      <p
        className={cn(
          'text-[18px] font-semibold',
          highlight === 'destructive' ? 'text-destructive' : 'text-foreground',
        )}
      >
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50">
        {label}
      </p>
    </div>
  );
}

function CategorySection({
  category,
  issues,
  filePathToFileId,
  onJumpToLocation,
}: {
  category: IssueCategory;
  issues: Issue[];
  filePathToFileId: Record<string, string>;
  onJumpToLocation?: (fileId: string, lineNumber: number) => void;
}) {
  const meta = CATEGORY_META[category];
  const Icon = meta.Icon;

  return (
    <section>
      <h2
        className={cn(
          'mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider',
          meta.color,
        )}
      >
        <Icon size={12} />
        {meta.label}
        <span className="text-muted-foreground/40">({issues.length})</span>
      </h2>
      <div className="space-y-2">
        {issues.map((issue, idx) => (
          <IssueCard
            key={`${category}-${idx}`}
            issue={issue}
            filePathToFileId={filePathToFileId}
            onJumpToLocation={onJumpToLocation}
          />
        ))}
      </div>
    </section>
  );
}

function IssueCard({
  issue,
  filePathToFileId,
  onJumpToLocation,
}: {
  issue: Issue;
  filePathToFileId: Record<string, string>;
  onJumpToLocation?: (fileId: string, lineNumber: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-border bg-card/40 transition-colors hover:bg-card/60">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown size={11} className="mt-1 shrink-0 text-muted-foreground/50" />
        ) : (
          <ChevronRight size={11} className="mt-1 shrink-0 text-muted-foreground/50" />
        )}
        <span
          className={cn(
            'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider',
            SEVERITY_STYLE[issue.severity],
          )}
        >
          {issue.severity}
        </span>
        <span className="flex-1 text-[12px] font-medium text-foreground/90">
          {issue.title}
        </span>
        <span className="shrink-0 text-[9px] text-muted-foreground/40">
          {(issue.confidence * 100).toFixed(0)}%
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border/40 px-3 py-3">
          <p className="text-[11px] leading-relaxed text-foreground/70">
            {issue.description}
          </p>

          <div className="space-y-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Locations ({issue.locations.length})
            </p>
            <div className="space-y-1.5">
              {issue.locations.map((loc, idx) => (
                <LocationRow
                  key={idx}
                  loc={loc}
                  filePathToFileId={filePathToFileId}
                  onJumpToLocation={onJumpToLocation}
                />
              ))}
            </div>
          </div>

          {issue.suggestedResolution && (
            <div className="flex gap-2 rounded border border-violet-500/20 bg-violet-500/5 px-3 py-2">
              <Lightbulb size={11} className="mt-0.5 shrink-0 text-violet-400" />
              <div className="flex-1">
                <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-400/70">
                  Suggested resolution
                </p>
                <p className="text-[11px] leading-relaxed text-foreground/70">
                  {issue.suggestedResolution}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationRow({
  loc,
  filePathToFileId,
  onJumpToLocation,
}: {
  loc: FileLocation;
  filePathToFileId: Record<string, string>;
  onJumpToLocation?: (fileId: string, lineNumber: number) => void;
}) {
  const fileId = filePathToFileId[loc.filePath];

  function handleJump() {
    if (!fileId || !onJumpToLocation) return;
    onJumpToLocation(fileId, loc.lineStart);
  }

  return (
    <div className="rounded border border-border/40 bg-background/50 p-2">
      <button
        onClick={handleJump}
        disabled={!fileId || !onJumpToLocation}
        className={cn(
          'mb-1 flex w-full items-center gap-1 text-left text-[10px]',
          fileId
            ? 'text-cyan-400 hover:text-cyan-300'
            : 'cursor-not-allowed text-muted-foreground/40',
        )}
        title={fileId ? 'Jump to file' : 'File not found in project'}
      >
        <FileText size={10} />
        <span className="truncate font-mono">{loc.filePath}</span>
        <span className="shrink-0 text-muted-foreground/50">
          :{loc.lineStart}
          {loc.lineEnd !== loc.lineStart ? `–${loc.lineEnd}` : ''}
        </span>
      </button>
      {loc.quote && (
        <blockquote className="border-l-2 border-cyan-500/30 pl-2 font-mono text-[10px] italic leading-relaxed text-foreground/60">
          &ldquo;{loc.quote}&rdquo;
        </blockquote>
      )}
    </div>
  );
}

function groupByCategory(issues: Issue[]): Partial<Record<IssueCategory, Issue[]>> {
  const out: Partial<Record<IssueCategory, Issue[]>> = {};
  const sevOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...issues].sort((a, b) => {
    const sa = sevOrder[a.severity] - sevOrder[b.severity];
    if (sa !== 0) return sa;
    return b.confidence - a.confidence;
  });
  for (const issue of sorted) {
    const cat = issue.category;
    if (!out[cat]) out[cat] = [];
    out[cat]!.push(issue);
  }
  return out;
}
