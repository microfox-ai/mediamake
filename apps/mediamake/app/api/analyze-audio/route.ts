/**
 * POST /api/analyze-audio
 *
 * Public contract for presets/actions (shake-effect-range, beatstitch, etc.):
 *   { audioSrc } → { analysis, durationInSeconds, summary }
 *
 * Heavy ffmpeg/ffprobe work runs on the `analyze-audio` Lambda worker
 * (ffmpeg group + layer). Vercel never shells out to ffprobe.
 *
 * - development (WORKERS_LOCAL_MODE !== 'false'): runs the worker handler in-process
 * - production: dispatches remote worker and polls the job store
 */

import { NextRequest, NextResponse } from 'next/server';
import { dispatchWorker } from '@microfox/ai-worker';
import { getJob, setJob } from '@/app/api/workflows/stores/jobStore';

export const maxDuration = 300;
export const runtime = 'nodejs';

const WORKER_ID = 'analyze-audio';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wantsLocalExecution() {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.WORKERS_LOCAL_MODE !== 'false'
  );
}

async function pollJobOutput(jobId: string, timeoutMs: number) {
  const started = Date.now();
  let delay = 800;

  while (Date.now() - started < timeoutMs) {
    const job = await getJob(jobId);
    if (job?.status === 'completed') {
      return job.output;
    }
    if (job?.status === 'failed') {
      throw new Error(job.error?.message || 'analyze-audio worker failed');
    }
    await sleep(delay);
    delay = Math.min(delay + 400, 4000);
  }

  throw new Error('analyze-audio worker timed out');
}

export async function GET() {
  return NextResponse.json({
    message: 'Audio analysis endpoint - use POST with audioSrc',
    worker: WORKER_ID,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const audioSrc =
      typeof body?.audioSrc === 'string' ? body.audioSrc.trim() : '';

    if (!audioSrc) {
      return NextResponse.json(
        { error: 'audioSrc is required' },
        { status: 400 },
      );
    }

    const input = { audioSrc };

    // Local / `next dev`: run handler in-process (uses local ffmpeg if installed).
    // Dynamic import keeps the worker binary path out of the Vercel serverless bundle.
    if (wantsLocalExecution()) {
      const { default: analyzeAudioWorker } = await import(
        '@/app/ai/workers/ffmpeg/analyze-audio.worker'
      );
      const parsed = analyzeAudioWorker.inputSchema.parse(input);
      const output = await analyzeAudioWorker.handler({
        input: parsed,
        ctx: {
          jobId: `local-${WORKER_ID}-${Date.now()}`,
          workerId: WORKER_ID,
        } as any,
      });

      const response = NextResponse.json(output);
      response.headers.set('Cache-Control', 'public, max-age=86400');
      return response;
    }

    // Production: Lambda worker (ffmpeg layer) + job-store poll.
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    try {
      await setJob(jobId, {
        jobId,
        workerId: WORKER_ID,
        status: 'queued',
        input,
        metadata: { source: 'api/analyze-audio' },
      });
    } catch (setJobError: any) {
      console.warn(
        '[analyze-audio] Failed to create job record (continuing):',
        setJobError?.message || String(setJobError),
      );
    }

    await dispatchWorker(WORKER_ID, input, {
      mode: 'remote',
      jobId,
      metadata: { source: 'api/analyze-audio' },
    });

    const output = await pollJobOutput(jobId, 280_000);
    if (!output || !Array.isArray((output as any).analysis)) {
      throw new Error('analyze-audio worker returned invalid output');
    }

    const response = NextResponse.json(output);
    response.headers.set('Cache-Control', 'public, max-age=86400');
    return response;
  } catch (error: any) {
    console.error('Error analyzing audio:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze audio',
        message: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
