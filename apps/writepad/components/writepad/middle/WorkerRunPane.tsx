'use client';

/**
 * WorkerRunPane — generic middle-pane host for any registered worker.
 *
 * Two modes:
 *   - mode: 'trigger'   → render the worker's TriggerForm; on submit, dispatch
 *                          via useWorkflowJob and switch to mode: 'view'
 *   - mode: 'view'      → poll the existing worker job via useWorkflowJob (or
 *                          show a previously-fetched job snapshot) and render
 *                          the worker's OutputViewer
 *
 * All trigger / status-poll / output-fetch flows go through the existing
 * `/api/workflows/workers/...` endpoints via the canonical `useWorkflowJob`
 * hook — this component does NOT add its own API surface.
 */

import { useEffect, useMemo, useState } from 'react';
import { X as XIcon, AlertTriangle } from 'lucide-react';
import { useWorkflowJob } from '@/hooks/useWorkflowJob';
import { getWorkerEntry } from '@/lib/workers/registry';
import { useSession } from '@/components/session-provider';
import type { FileNode } from '@/components/writepad/left/types';

export type WorkerRunPaneMode =
  | { kind: 'trigger'; workerId: string }
  | { kind: 'view'; workerId: string; jobId: string };

interface WorkerRunPaneProps {
  projectId: string;
  /** Project files — passed through to TriggerForms that need scope picking. */
  files: FileNode[];
  /** filePath → fileId reverse map for the OutputViewer's jump-to-location. */
  filePathToFileId: Record<string, string>;
  mode: WorkerRunPaneMode;
  /** Close the pane and return to the editor. */
  onClose: () => void;
  /** Open a file in the editor at a 1-based line number. */
  onJumpToLocation?: (fileId: string, lineNumber: number) => void;
  /**
   * Called when the user triggers a new run — parent uses it to switch the
   * pane into view mode for the just-created jobId.
   */
  onTriggered?: (jobId: string, workerId: string) => void;
  /** Switch this pane back to trigger mode (called when user clicks Re-run). */
  onRequestRerun?: (workerId: string) => void;
}

export function WorkerRunPane({
  projectId,
  files,
  filePathToFileId,
  mode,
  onClose,
  onJumpToLocation,
  onTriggered,
  onRequestRerun,
}: WorkerRunPaneProps) {
  const entry = getWorkerEntry(mode.workerId);

  if (!entry) {
    return (
      <div className="flex h-full flex-col bg-background">
        <Header label="Unknown worker" onClose={onClose} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <AlertTriangle size={20} className="text-destructive/70" />
          <p className="text-[11px] text-destructive">
            No registry entry for worker &ldquo;{mode.workerId}&rdquo;
          </p>
        </div>
      </div>
    );
  }

  if (mode.kind === 'trigger') {
    return (
      <TriggerHost
        projectId={projectId}
        files={files}
        entry={entry}
        onClose={onClose}
        onTriggered={onTriggered}
      />
    );
  }

  return (
    <ViewHost
      projectId={projectId}
      filePathToFileId={filePathToFileId}
      entry={entry}
      jobId={mode.jobId}
      onClose={onClose}
      onJumpToLocation={onJumpToLocation}
      onRequestRerun={onRequestRerun ? () => onRequestRerun(entry.workerId) : undefined}
    />
  );
}

// ── Trigger host ─────────────────────────────────────────────────────────────

interface TriggerHostProps {
  projectId: string;
  files: FileNode[];
  entry: NonNullable<ReturnType<typeof getWorkerEntry>>;
  onClose: () => void;
  onTriggered?: (jobId: string, workerId: string) => void;
}

function TriggerHost({
  projectId,
  files,
  entry,
  onClose,
  onTriggered,
}: TriggerHostProps) {
  const session = useSession();
  const clientId = session?.session?.clientId ?? '';
  const [error, setError] = useState<string | null>(null);

  const job = useWorkflowJob({
    type: 'worker',
    workerId: entry.workerId,
    autoPoll: false, // we'll hand off polling to the ViewHost via parent
    onError: (e) => setError(e.message),
  });

  // When the trigger succeeds and we have a jobId, hand off to view mode.
  useEffect(() => {
    if (job.jobId && onTriggered) {
      onTriggered(job.jobId, entry.workerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.jobId]);

  async function handleTrigger(input: Record<string, unknown>) {
    setError(null);
    await job.trigger(input);
  }

  const TriggerForm = entry.TriggerForm;

  return (
    <div className="flex h-full flex-col bg-background">
      <Header
        label={entry.label}
        Icon={entry.Icon}
        accent={entry.accent}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto">
        <TriggerForm
          projectId={projectId}
          files={files}
          clientId={clientId}
          onTrigger={handleTrigger}
          triggering={job.loading}
          error={error}
        />
      </div>
    </div>
  );
}

// ── View host (poll + render output) ─────────────────────────────────────────

interface ViewHostProps {
  projectId: string;
  filePathToFileId: Record<string, string>;
  entry: NonNullable<ReturnType<typeof getWorkerEntry>>;
  jobId: string;
  onClose: () => void;
  onJumpToLocation?: (fileId: string, lineNumber: number) => void;
  onRequestRerun?: () => void;
}

interface JobRecord {
  jobId: string;
  workerId: string;
  status: string;
  output?: unknown;
  error?: { message: string };
  metadata?: Record<string, unknown>;
  progress?: number;
  progressMessage?: string;
  createdAt?: string;
  completedAt?: string;
}

function ViewHost({
  projectId,
  filePathToFileId,
  entry,
  jobId,
  onClose,
  onJumpToLocation,
  onRequestRerun,
}: ViewHostProps) {
  // For an EXISTING job (no trigger needed), poll the workflow API directly.
  // useWorkflowJob's polling logic is keyed off trigger() — for a mounted
  // jobId we fetch + setInterval ourselves, but reuse the workflow endpoint.
  const [job, setJob] = useState<JobRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const TERMINAL = new Set(['completed', 'failed', 'partial']);

    async function poll() {
      try {
        const res = await fetch(
          `/api/workflows/workers/${entry.workerId}/${jobId}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as JobRecord;
        if (cancelled) return;
        setJob(data);
        if (TERMINAL.has(data.status)) return; // stop polling
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      }
      timer = setTimeout(poll, 2500);
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [entry.workerId, jobId]);

  const OutputViewer = entry.OutputViewer;

  // Build the placeholder job while loading
  const displayJob = useMemo<JobRecord>(
    () => job ?? { jobId, workerId: entry.workerId, status: 'queued' },
    [job, jobId, entry.workerId],
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <Header
        label={entry.label}
        Icon={entry.Icon}
        accent={entry.accent}
        statusBadge={displayJob.status}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto">
        {error && !job && (
          <div className="mx-auto max-w-2xl px-6 py-12">
            <div className="flex items-start gap-3 rounded border border-destructive/30 bg-destructive/10 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
              <p className="text-[11px] text-destructive">{error}</p>
            </div>
          </div>
        )}
        <OutputViewer
          projectId={projectId}
          job={displayJob}
          filePathToFileId={filePathToFileId}
          onJumpToLocation={onJumpToLocation}
          onRequestRerun={onRequestRerun}
        />
      </div>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  label: string;
  Icon?: import('lucide-react').LucideIcon;
  accent?: string;
  statusBadge?: string;
  onClose: () => void;
}

const STATUS_CLASS: Record<string, string> = {
  queued: 'bg-muted/40 text-muted-foreground',
  running: 'bg-cyan-500/15 text-cyan-400 animate-pulse',
  completed: 'bg-emerald-500/15 text-emerald-400',
  failed: 'bg-destructive/15 text-destructive',
  partial: 'bg-amber-500/15 text-amber-400',
};

function Header({ label, Icon, accent, statusBadge, onClose }: HeaderProps) {
  const accentClass =
    accent === 'cyan'
      ? 'text-cyan-400'
      : accent === 'violet'
        ? 'text-violet-400'
        : accent === 'amber'
          ? 'text-amber-400'
          : 'text-foreground';

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon size={14} className={`shrink-0 ${accentClass}`} />}
        <span className="truncate text-[12px] font-medium text-foreground">{label}</span>
        {statusBadge && (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
              STATUS_CLASS[statusBadge] ?? 'bg-muted/40 text-muted-foreground'
            }`}
          >
            {statusBadge}
          </span>
        )}
      </div>
      <button
        onClick={onClose}
        title="Close"
        className="rounded p-1 text-muted-foreground/50 hover:text-foreground transition-colors"
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}
