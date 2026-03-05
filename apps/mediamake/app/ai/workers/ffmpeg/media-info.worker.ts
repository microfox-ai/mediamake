/**
 * Media Info Worker - Analyze media files using ffprobe
 *
 * A worker that analyzes media files using ffprobe.
 * Downloads a media file, runs ffprobe to extract metadata, and returns
 * a clean summary with duration, size, bitRate, resolution, fps, and more.
 *
 * Lambda setup:
 * - Attach an ffmpeg/ffprobe Lambda Layer that provides /opt/bin/ffprobe
 * - Set env: FFPROBE_PATH=/opt/bin/ffprobe (optional; defaults to /opt/bin/ffprobe on Lambda)
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';

const InputSchema = z.object({
  mediaUrl: z.string().url().describe('URL of the media file to analyze'),
  /**
   * Hard cap to avoid downloading huge files in this example worker.
   */
  // Allow reasonably large files; callers can still override this.
  maxBytes: z
    .number()
    .int()
    .min(128 * 1024)
    .max(100 * 1024 * 1024)
    .optional()
    .default(50 * 1024 * 1024),
  timeoutMs: z.number().int().min(1000).max(120_000).optional().default(30_000),
});

const OutputSchema = z.object({
  mediaUrl: z.string().url(),
  ffprobePath: z.string(),
  ffprobeVersion: z.string().optional(),
  bytesDownloaded: z.number(),
  mediaInfo: z.object({
    duration: z.number().nullable(),
    size: z.number().nullable(),
    bitRate: z.number().nullable(),
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    displayAspectRatio: z.string().nullable(),
    frameRate: z.string().nullable(),
  }),
  streams: z.object({
    hasVideo: z.boolean(),
    hasAudio: z.boolean(),
  }),
  notes: z.array(z.string()),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

function isLambda() {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function getFfprobePathCandidates(): string[] {
  const fromEnv = process.env.FFPROBE_PATH?.trim();
  const candidates: string[] = [];
  if (fromEnv) candidates.push(fromEnv);

  // Common Lambda Layer install locations (varies by layer author)
  if (isLambda()) {
    candidates.push(
      '/opt/bin/ffprobe',
      '/opt/ffmpeg/ffprobe',
      '/opt/ffmpeg/bin/ffprobe',
      '/opt/ffprobe/bin/ffprobe',
      '/opt/ffprobe/ffprobe',
    );
  }

  // Fallback to PATH (local dev, or layers that extend PATH)
  candidates.push('ffprobe');
  return candidates;
}

class MediaTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaTooLargeError';
  }
}

async function downloadToTmp(url: string, maxBytes: number): Promise<{ filePath: string; bytes: number }> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download media: ${res.status} ${res.statusText}`);
  }

  const contentLengthHeader = res.headers.get('content-length');
  if (contentLengthHeader) {
    const n = Number(contentLengthHeader);
    if (Number.isFinite(n) && n > maxBytes) {
      throw new MediaTooLargeError(`media too large (content-length=${n} > maxBytes=${maxBytes})`);
    }
  }

  const arrayBuf = await res.arrayBuffer();
  const bytes = arrayBuf.byteLength;
  if (bytes > maxBytes) {
    throw new MediaTooLargeError(`media too large (downloaded=${bytes} > maxBytes=${maxBytes})`);
  }

  const ext = (() => {
    try {
      const u = new URL(url);
      const p = u.pathname;
      const e = p.includes('.') ? p.split('.').pop() : undefined;
      return e && e.length <= 6 ? `.${e}` : '';
    } catch {
      return '';
    }
  })();

  const filePath = path.join(
    os.tmpdir(),
    `ffprobe-input-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`,
  );
  await fs.writeFile(filePath, Buffer.from(arrayBuf));
  return { filePath, bytes };
}

function truncate(s: string, max = 1500): string {
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…(truncated)` : s;
}

async function runCmdJson(params: {
  cmd: string;
  args: string[];
  timeoutMs: number;
}): Promise<{ stdout: string; stderr: string; exitCode: number | null; signal: NodeJS.Signals | null }> {
  const { cmd, args, timeoutMs } = params;
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let stdout = '';
    let stderr = '';
    let killedByTimeout = false;
    const t = setTimeout(() => {
      killedByTimeout = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d) => (stdout += d.toString('utf-8')));
    child.stderr.on('data', (d) => (stderr += d.toString('utf-8')));
    child.on('error', (e) => {
      clearTimeout(t);
      reject(
        new Error(
          `Failed to spawn command "${cmd}": ${String((e as any)?.message || e)} (args=${JSON.stringify(args)})`,
        ),
      );
    });
    child.on('close', (code, signal) => {
      clearTimeout(t);
      if (killedByTimeout) {
        stderr += `\n[timeout] killed after ${timeoutMs}ms`;
      }
      resolve({ stdout, stderr, exitCode: code, signal });
    });
  });
}

function safeNumber(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function parseFps(rate: any): string | null {
  if (!rate || typeof rate !== 'string') return null;
  const [a, b] = rate.split('/').map((s) => Number(s));
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  const fps = a / b;
  if (!Number.isFinite(fps)) return null;
  return fps.toFixed(2);
}

export const workerConfig: WorkerConfig = {
  timeout: 300,
  memorySize: 1024,
  group: "ffmpeg",
  layers: ['arn:aws:lambda:${aws:region}:${aws:accountId}:layer:ffmpeg:1'],
};

export default createWorker<typeof InputSchema, Output>({
  id: 'media-info',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input, ctx }: WorkerHandlerParams<Input, Output>) => {
    const start = Date.now();

    // Ensure defaults from Zod are applied even in remote (Lambda) mode.
    const parsed = InputSchema.parse(input);
    const mediaUrl = parsed.mediaUrl;
    const maxBytes = parsed.maxBytes;
    const timeoutMs = parsed.timeoutMs;

    await ctx.jobStore?.update({ status: 'running', progressMessage: 'Downloading media file...' });

    const notes: string[] = [];
    const ffprobeCandidates = getFfprobePathCandidates();
    let ffprobePath = ffprobeCandidates[0] ?? 'ffprobe';

    if (isLambda()) notes.push('Running in AWS Lambda environment');
    notes.push(`platform=${process.platform} arch=${process.arch} node=${process.version}`);
    notes.push(`tmpdir=${os.tmpdir()}`);
    if (process.env.FFPROBE_PATH) notes.push('FFPROBE_PATH provided via env');
    else if (isLambda()) notes.push('FFPROBE_PATH not set; trying common layer paths');

    // Pick a working ffprobe by trying `-version` across candidates.
    let ffprobeVersion: string | undefined = undefined;
    for (const candidate of ffprobeCandidates) {
      if (!candidate) continue;

      // Best-effort: confirm candidate exists (absolute paths only)
      if (candidate.startsWith('/')) {
        try {
          const st = await fs.stat(candidate);
          notes.push(`ffprobe stat ok: path=${candidate} mode=${st.mode.toString(8)} size=${st.size}`);
        } catch (e: any) {
          notes.push(`ffprobe stat missing: path=${candidate} err=${String(e?.message || e)}`);
          continue; // no file there
        }
      }

      try {
        const v = await runCmdJson({ cmd: candidate, args: ['-version'], timeoutMs: input.timeoutMs });
        const firstLine = v.stdout.split('\n')[0]?.trim() || '';
        if (v.exitCode === 0 && firstLine) {
          ffprobePath = candidate;
          ffprobeVersion = firstLine;
          break;
        }
        notes.push(
          `ffprobe -version not ok: path=${candidate} exit=${String(v.exitCode)} signal=${String(v.signal)} stderr=${truncate(v.stderr)}`,
        );
      } catch (e: any) {
        notes.push(`ffprobe -version failed: path=${candidate} err=${String(e?.message || e)}`);
      }
    }

    let filePath: string | null = null;
    let bytes = 0;

    try {
      const dl = await downloadToTmp(mediaUrl, maxBytes);
      filePath = dl.filePath;
      bytes = dl.bytes;
    } catch (err: any) {
      if (err instanceof MediaTooLargeError) {
        // Treat as a graceful, non-retriable outcome: mark job completed with explanatory notes.
        notes.push(err.message);

        const output: Output = {
          mediaUrl,
          ffprobePath,
          ffprobeVersion: undefined,
          bytesDownloaded: bytes,
          mediaInfo: {
            duration: null,
            size: null,
            bitRate: null,
            width: null,
            height: null,
            displayAspectRatio: null,
            frameRate: null,
          },
          streams: {
            hasVideo: false,
            hasAudio: false,
          },
          notes: [
            ...notes,
            'media too large – worker completed without running ffprobe',
            `Completed in ${Date.now() - start}ms`,
          ],
        };

        await ctx.jobStore?.update({
          status: 'completed',
          output,
        });

        return output;
      }

      // Unknown error: let it bubble so SQS/Lambda can retry or dead-letter.
      throw err;
    }

    try {
      if (filePath) {
        try {
          const st = await fs.stat(filePath);
          notes.push(`downloaded file: size=${st.size} path=${filePath}`);
        } catch {
          // ignore
        }
      }

      await ctx.jobStore?.update({ progressMessage: 'Running ffprobe...' });

      const probe = await runCmdJson({
        cmd: ffprobePath,
        args: ['-v', 'error', '-hide_banner', '-print_format', 'json', '-show_format', '-show_streams', filePath],
        timeoutMs,
      });

      if (probe.exitCode !== 0 || probe.exitCode == null) {
        throw new Error(
          `ffprobe failed (exit=${String(probe.exitCode)} signal=${String(probe.signal)}): ` +
            `${truncate(probe.stderr) || truncate(probe.stdout) || 'unknown error'}`,
        );
      }

      const json = JSON.parse(probe.stdout || '{}') as any;
      const streams: any[] = Array.isArray(json.streams) ? json.streams : [];
      const format: any = json.format || {};

      const videoStream = streams.find((s) => s?.codec_type === 'video');
      const audioStream = streams.find((s) => s?.codec_type === 'audio');

      if (!videoStream && !audioStream) {
        throw new Error('No video or audio stream found in the media');
      }

      // Extract format-level properties
      const duration = safeNumber(format?.duration);
      const size = safeNumber(format?.size);
      const bitRate = safeNumber(format?.bit_rate);

      // Extract video-specific properties
      const width = videoStream?.width != null ? Number(videoStream.width) : null;
      const height = videoStream?.height != null ? Number(videoStream.height) : null;
      const displayAspectRatio = videoStream?.display_aspect_ratio || null;
      const frameRate = parseFps(videoStream?.avg_frame_rate) ?? parseFps(videoStream?.r_frame_rate) ?? null;

      const output: Output = {
        mediaUrl,
        ffprobePath,
        ffprobeVersion,
        bytesDownloaded: bytes,
        mediaInfo: {
          duration,
          size,
          bitRate,
          width: Number.isFinite(width) ? (width as number) : null,
          height: Number.isFinite(height) ? (height as number) : null,
          displayAspectRatio: typeof displayAspectRatio === 'string' ? displayAspectRatio : null,
          frameRate,
        },
        streams: {
          hasVideo: Boolean(videoStream),
          hasAudio: Boolean(audioStream),
        },
        notes: [
          ...notes,
          `Completed in ${Date.now() - start}ms`,
          'Tip: In Lambda, ffprobe is typically provided by a Layer at /opt/bin/ffprobe.',
        ],
      };

      return output;
    } finally {
      // Cleanup best-effort (also on failure)
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch {
          // ignore
        }
      }
    }
  },
});
