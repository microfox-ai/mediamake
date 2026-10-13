/**
 * Browser loader for server audio analysis.
 *
 * 1. POST /api/analyze-audio — returns a job id, or a cached analysis id.
 * 2. Poll job status (the worker can run for several minutes).
 * 3. GET /api/audio-analyses/:id — the frame list lives in Mongo, not on the job.
 */

import type { AudioAnalysisClientDoc } from "./audio-analysis-types";
import { jobProgressLabel, pollWorkerJob } from "./browser-worker-job";

const memoryCache = new Map<string, AudioAnalysisClientDoc>();
const inflight = new Map<string, Promise<AudioAnalysisClientDoc>>();

/** analyze-audio Lambda timeout is 900s; give the poll a little extra. */
const ANALYZE_POLL_TIMEOUT_MS = 960_000;
const ANALYZE_POLL_INTERVAL_MS = 1500;

async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => ({}));
}

export async function fetchAudioAnalysisDoc(
  analysisId: string,
): Promise<AudioAnalysisClientDoc> {
  const res = await fetch(
    `/api/audio-analyses/${encodeURIComponent(analysisId)}`,
  );
  const body = await readJson(res);
  if (!res.ok) {
    throw new Error(
      (typeof body?.error === "string" && body.error) ||
        `Failed to load audio analysis (${res.status})`,
    );
  }
  if (!Array.isArray(body?.analysis)) {
    throw new Error("Audio analysis document has no frames");
  }
  return body as AudioAnalysisClientDoc;
}

export async function loadAudioAnalysisBySrc(
  audioSrc: string,
  options?: {
    force?: boolean;
    onStatus?: (message: string) => void;
  },
): Promise<AudioAnalysisClientDoc> {
  const src = audioSrc.trim();
  if (!src) throw new Error("audioSrc is required");

  if (!options?.force) {
    const cached = memoryCache.get(src);
    if (cached) return cached;
    const pending = inflight.get(src);
    if (pending) return pending;
  }

  const promise = loadUncached(src, options).then((doc) => {
    memoryCache.set(src, doc);
    return doc;
  });

  inflight.set(src, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(src);
  }
}

async function loadUncached(
  audioSrc: string,
  options?: {
    force?: boolean;
    onStatus?: (message: string) => void;
  },
): Promise<AudioAnalysisClientDoc> {
  const onStatus = options?.onStatus;
  onStatus?.("Starting audio analysis…");

  const res = await fetch("/api/analyze-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioSrc,
      async: true,
      force: options?.force === true,
    }),
  });
  const started = await readJson(res);
  if (!res.ok) {
    throw new Error(
      (typeof started?.error === "string" && started.error) ||
        started?.message ||
        `Failed to start audio analysis (${res.status})`,
    );
  }

  if (started?.status === "completed" && typeof started.analysisId === "string") {
    onStatus?.("Loading saved analysis…");
    return fetchAudioAnalysisDoc(started.analysisId);
  }

  const jobId = typeof started?.jobId === "string" ? started.jobId : "";
  if (!jobId) throw new Error("Audio analysis did not return a job id");

  onStatus?.("Queued…");
  let completedWithoutId = 0;
  const job = await pollWorkerJob({
    url: `/api/analyze-audio?jobId=${encodeURIComponent(jobId)}`,
    pollIntervalMs: ANALYZE_POLL_INTERVAL_MS,
    pollTimeoutMs: ANALYZE_POLL_TIMEOUT_MS,
    onStatus: (snapshot) => onStatus?.(jobProgressLabel(snapshot)),
    isComplete: (snapshot) => {
      const output = snapshot.output as { analysisId?: string } | undefined;
      if (typeof output?.analysisId === "string") return true;
      completedWithoutId += 1;
      if (completedWithoutId >= 5) {
        throw new Error("Audio analysis finished without an analysis id");
      }
      return false;
    },
  });

  const output = job.output as { analysisId?: string } | undefined;
  const analysisId =
    typeof output?.analysisId === "string" ? output.analysisId : "";
  if (!analysisId) {
    throw new Error("Audio analysis finished without an analysis id");
  }

  onStatus?.("Loading analysis…");
  return fetchAudioAnalysisDoc(analysisId);
}
