/**
 * Browser capabilities passed into every action `execute`.
 *
 * Actions run in the browser. Heavy workers return ids; this runtime polls
 * status (same loop as the billing page) and then fetches the stored document.
 * Local steps — fetching JSON, decoding audio — live here too.
 */

import type { ActionBrowser } from "../types";
import { fetchAudioAnalysisDoc, loadAudioAnalysisBySrc } from "@/lib/audio-analysis-client";
import { analyzeAudioInBrowser } from "@/lib/browser-audio-analysis";
import { jobProgressLabel, runWorkflowWorker } from "@/lib/browser-worker-job";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (typeof body?.error === "string" && body.error) ||
      (typeof body?.message === "string" && body.message) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export function createActionBrowser(args: {
  onProgress?: (message: string) => void;
}): ActionBrowser {
  let lastReportAt = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let latest = "";

  const reportProgress = (message: string) => {
    latest = message;
    const now = Date.now();
    if (now - lastReportAt >= 400) {
      lastReportAt = now;
      args.onProgress?.(message);
      return;
    }
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      lastReportAt = Date.now();
      args.onProgress?.(latest);
    }, 400);
  };

  return {
    reportProgress,
    runWorker: async ({ workerId, input, pollIntervalMs, pollTimeoutMs }) => {
      reportProgress(`Starting ${workerId}…`);
      return runWorkflowWorker({
        workerId,
        input,
        pollIntervalMs,
        pollTimeoutMs,
        onStatus: (job) => reportProgress(jobProgressLabel(job)),
      });
    },
    fetchJson,
    fetchAudioAnalysis: async (analysisId) => {
      reportProgress("Loading analysis…");
      return fetchAudioAnalysisDoc(analysisId);
    },
    analyzeAudioOnServer: (audioSrc) =>
      loadAudioAnalysisBySrc(audioSrc, { onStatus: reportProgress }),
    analyzeAudioInBrowser: (audioSrc) =>
      analyzeAudioInBrowser(audioSrc, reportProgress),
  };
}
