/**
 * POST /api/analyze-audio
 *   { audioSrc, async?: true, force?: boolean }
 *   → { jobId, status: "queued" }
 *   or, when a stored doc already exists:
 *   → { status: "completed", analysisId, durationInSeconds, summary, frameCount, cached: true }
 *
 * GET /api/analyze-audio?jobId=
 *   Job status. `output` is only `{ analysisId, durationInSeconds, summary, frameCount }`.
 *   Frames are loaded with GET /api/audio-analyses/:id.
 *
 * The worker can run for many minutes. Callers should poll this GET (same idea as
 * the billing page polling a workflow job) instead of holding one request open.
 *
 * - development (WORKERS_LOCAL_MODE !== 'false'): runs the handler in-process
 * - production: dispatches the analyze-audio Lambda and polls the job store
 */

import { NextRequest, NextResponse } from "next/server";
import { dispatchWorker } from "@microfox/ai-worker";
import { getJob, setJob, updateJob } from "@/app/api/workflows/stores/jobStore";
import type { JobRecord } from "@/app/api/workflows/stores/jobStore";
import {
  findLatestAudioAnalysis,
  toAudioAnalysisJobOutput,
} from "@/lib/audio-analysis-store";

export const maxDuration = 60;
export const runtime = "nodejs";

const WORKER_ID = "analyze-audio";

type MemoryJob = {
  jobId: string;
  workerId: string;
  status: JobRecord["status"];
  input?: unknown;
  output?: unknown;
  error?: { message: string; stack?: string };
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

/** In-process jobs for `next dev`, where the Lambda worker is not dispatched. */
const memoryJobs = new Map<string, MemoryJob>();

function wantsLocalExecution() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.WORKERS_LOCAL_MODE !== "false"
  );
}

function mergeJob(prev: MemoryJob | undefined, jobId: string, patch: Partial<JobRecord>): MemoryJob {
  const now = new Date().toISOString();
  const status = patch.status || prev?.status || "queued";
  const completedAt =
    patch.completedAt ||
    prev?.completedAt ||
    (status === "completed" || status === "failed" ? now : undefined);
  return {
    jobId,
    workerId: patch.workerId || prev?.workerId || WORKER_ID,
    status,
    input: patch.input !== undefined ? patch.input : prev?.input,
    output: patch.output !== undefined ? patch.output : prev?.output,
    error: patch.error !== undefined ? patch.error : prev?.error,
    metadata: { ...(prev?.metadata || {}), ...(patch.metadata || {}) },
    createdAt: prev?.createdAt || now,
    updatedAt: now,
    completedAt,
  };
}

function patchFromWorkerUpdate(patch: Record<string, unknown>): Partial<JobRecord> {
  const progressMessage =
    typeof patch.progressMessage === "string" ? patch.progressMessage : undefined;
  const incomingMeta =
    patch.metadata && typeof patch.metadata === "object"
      ? (patch.metadata as Record<string, unknown>)
      : {};
  const next: Partial<JobRecord> = {};
  if (typeof patch.status === "string") {
    next.status = patch.status as JobRecord["status"];
  }
  if (patch.output !== undefined) next.output = patch.output;
  if (patch.error && typeof patch.error === "object") {
    next.error = patch.error as JobRecord["error"];
  }
  next.metadata = {
    ...incomingMeta,
    ...(progressMessage ? { progressMessage } : {}),
  };
  return next;
}

async function writeJob(jobId: string, patch: Partial<JobRecord>, create: boolean) {
  if (wantsLocalExecution()) {
    memoryJobs.set(jobId, mergeJob(memoryJobs.get(jobId), jobId, patch));
    return;
  }

  if (create) {
    await setJob(jobId, {
      jobId,
      workerId: WORKER_ID,
      status: patch.status || "queued",
      input: patch.input,
      output: patch.output,
      error: patch.error,
      metadata: patch.metadata,
    });
    return;
  }

  await updateJob(jobId, patch);
}

async function readJob(jobId: string): Promise<MemoryJob | JobRecord | null> {
  if (wantsLocalExecution()) {
    return memoryJobs.get(jobId) || null;
  }
  return getJob(jobId);
}

function jobJson(job: MemoryJob | JobRecord) {
  const metadata = (job.metadata || {}) as { progressMessage?: string };
  const topLevel = (job as { progressMessage?: string }).progressMessage;
  const progressMessage =
    (typeof metadata.progressMessage === "string" && metadata.progressMessage) ||
    (typeof topLevel === "string" && topLevel) ||
    undefined;
  return {
    jobId: job.jobId,
    workerId: job.workerId,
    status: job.status,
    output: job.output,
    error: job.error,
    metadata: {
      ...metadata,
      ...(progressMessage ? { progressMessage } : {}),
    },
    progressMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
  };
}

async function runLocal(jobId: string, audioSrc: string) {
  try {
    const { default: analyzeAudioWorker } = await import(
      "@/app/ai/workers/ffmpeg/analyze-audio.worker"
    );
    const parsed = analyzeAudioWorker.inputSchema.parse({ audioSrc });
    const output = await analyzeAudioWorker.handler({
      input: parsed,
      ctx: {
        jobId,
        workerId: WORKER_ID,
        jobStore: {
          update: async (patch: Record<string, unknown>) => {
            await writeJob(jobId, patchFromWorkerUpdate(patch), false);
          },
        },
      } as any,
    });

    await writeJob(
      jobId,
      {
        status: "completed",
        output,
        metadata: { progressMessage: "Analysis saved" },
      },
      false,
    );
  } catch (error: any) {
    await writeJob(
      jobId,
      {
        status: "failed",
        error: { message: error?.message || String(error) },
        metadata: { progressMessage: "Analysis failed" },
      },
      false,
    );
  }
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId")?.trim() || "";
  if (!jobId) {
    return NextResponse.json({
      message:
        "Audio analysis endpoint. POST { audioSrc } to start. Poll GET ?jobId= for status, then GET /api/audio-analyses/:analysisId for frames.",
      worker: WORKER_ID,
    });
  }

  try {
    const job = await readJob(jobId);
    if (!job) {
      return NextResponse.json({ error: `Job "${jobId}" not found` }, { status: 404 });
    }
    return NextResponse.json(jobJson(job));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to read job" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const audioSrc =
      typeof body?.audioSrc === "string" ? body.audioSrc.trim() : "";
    const force = body?.force === true;

    if (!audioSrc) {
      return NextResponse.json({ error: "audioSrc is required" }, { status: 400 });
    }

    if (!force) {
      try {
        const existing = await findLatestAudioAnalysis(audioSrc);
        if (existing && (existing.frameCount ?? 0) > 0) {
          return NextResponse.json({
            status: "completed",
            ...toAudioAnalysisJobOutput(existing),
          });
        }
      } catch (cacheError: any) {
        console.warn(
          "[analyze-audio] cache lookup failed (continuing):",
          cacheError?.message || String(cacheError),
        );
      }
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await writeJob(
      jobId,
      {
        status: "queued",
        input: { audioSrc },
        metadata: {
          source: "api/analyze-audio",
          progressMessage: "Queued",
        },
      },
      true,
    );

    if (wantsLocalExecution()) {
      void runLocal(jobId, audioSrc);
      return NextResponse.json({
        jobId,
        workerId: WORKER_ID,
        status: "queued",
      });
    }

    await dispatchWorker(WORKER_ID, { audioSrc }, {
      mode: "remote",
      jobId,
      metadata: { source: "api/analyze-audio" },
    });

    return NextResponse.json({
      jobId,
      workerId: WORKER_ID,
      status: "queued",
    });
  } catch (error: any) {
    console.error("Error starting audio analysis:", error);
    return NextResponse.json(
      {
        error: "Failed to start audio analysis",
        message: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
