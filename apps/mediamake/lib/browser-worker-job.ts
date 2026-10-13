/**
 * Browser-side worker status loop.
 * Same contract as the billing page (`useWorkflowJob`): POST to queue a job,
 * then poll GET until the job is completed or failed.
 */

export type PolledWorkerJob = {
  jobId?: string;
  workerId?: string;
  status?: string;
  output?: unknown;
  error?: { message?: string; stack?: string };
  metadata?: {
    progressMessage?: string;
    [key: string]: unknown;
  };
  progressMessage?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jobProgressLabel(job: PolledWorkerJob): string {
  const fromMeta =
    typeof job.metadata?.progressMessage === "string"
      ? job.metadata.progressMessage
      : undefined;
  const direct =
    typeof job.progressMessage === "string" ? job.progressMessage : undefined;
  if (fromMeta || direct) return fromMeta || direct || "Working…";
  if (job.status === "queued") return "Queued…";
  if (job.status === "running") return "Running…";
  return "Working…";
}

/**
 * Poll a status URL until the job completes, fails, or the timeout elapses.
 * 404s are ignored (the record can land a moment after dispatch).
 */
export async function pollWorkerJob(args: {
  url: string;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  onStatus?: (job: PolledWorkerJob) => void;
  /**
   * Extra check before treating `completed` as done.
   * Use this when the job status can flip before `output` is written.
   */
  isComplete?: (job: PolledWorkerJob) => boolean;
}): Promise<PolledWorkerJob> {
  const interval = args.pollIntervalMs ?? 1500;
  const timeout = args.pollTimeoutMs ?? 300_000;
  const started = Date.now();
  let lastError: string | null = null;

  while (Date.now() - started < timeout) {
    let res: Response;
    try {
      res = await fetch(args.url);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await sleep(interval);
      continue;
    }

    if (res.ok) {
      const job = (await res.json()) as PolledWorkerJob;
      args.onStatus?.(job);
      if (job.status === "failed") {
        throw new Error(job.error?.message || "Worker failed");
      }
      if (job.status === "completed" && (args.isComplete ? args.isComplete(job) : true)) {
        return job;
      }
    } else if (res.status !== 404) {
      const body = await res.json().catch(() => ({}));
      lastError =
        (typeof body?.error === "string" && body.error) ||
        `Status check failed (${res.status})`;
    }

    await sleep(interval);
  }

  throw new Error(lastError || "Worker timed out");
}

/**
 * Dispatch a workflow worker and wait for it in the browser.
 * Mirrors billing's `useWorkflowJob({ type: "worker" })`.
 */
export async function runWorkflowWorker(args: {
  workerId: string;
  input?: Record<string, unknown>;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  onStatus?: (job: PolledWorkerJob) => void;
}): Promise<{ jobId: string; status: string; output: unknown }> {
  const res = await fetch(`/api/workflows/workers/${args.workerId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: args.input ?? {}, await: false }),
  });
  const started = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (typeof started?.error === "string" && started.error) ||
        `Failed to start worker (${res.status})`,
    );
  }
  const jobId = typeof started?.jobId === "string" ? started.jobId : "";
  if (!jobId) throw new Error("Worker did not return a job id");

  args.onStatus?.({ jobId, status: "queued", workerId: args.workerId });

  const job = await pollWorkerJob({
    url: `/api/workflows/workers/${args.workerId}/${encodeURIComponent(jobId)}`,
    pollIntervalMs: args.pollIntervalMs,
    pollTimeoutMs: args.pollTimeoutMs,
    onStatus: args.onStatus,
  });

  return {
    jobId,
    status: job.status || "completed",
    output: job.output,
  };
}
