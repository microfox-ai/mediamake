/**
 * Analyze Audio Worker — download audio, decode to PCM with ffmpeg, run energy/FFT analysis.
 *
 * Replaces the Vercel `/api/analyze-audio` ffprobe/ffmpeg path (binaries fail on serverless).
 * Runs in the `ffmpeg` group so the FFmpeg Lambda layer is available.
 *
 * Output shape matches the legacy API used by shake-effect-range / beatstitch:
 *   { analysis, durationInSeconds, summary }
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import {
  analyzeAudioPcm,
  buildAnalysisSummary,
  s16leToFloat32,
} from './lib/audio-analysis';

const AnalysisFrameSchema = z.object({
  timestamp: z.number(),
  intensity: z.number(),
  frequency: z.number(),
  beatType: z.enum(['low', 'mid', 'high']),
  spectralCentroid: z.number(),
  spectralRolloff: z.number(),
  zeroCrossingRate: z.number(),
  mfcc: z.array(z.number()),
});

const InputSchema = z.object({
  audioSrc: z.string().url().describe('URL of the audio file to analyze'),
  /** Cap download size (bytes). Default 80MB. */
  maxBytes: z
    .number()
    .int()
    .min(128 * 1024)
    .max(200 * 1024 * 1024)
    .optional()
    .default(80 * 1024 * 1024),
  /** Target sample rate for PCM decode. */
  sampleRate: z.number().int().min(8000).max(48000).optional().default(22050),
});

const OutputSchema = z.object({
  analysis: z.array(AnalysisFrameSchema),
  durationInSeconds: z.number(),
  summary: z.object({
    totalBeats: z.number(),
    averageIntensity: z.number(),
    lowBeats: z.number(),
    midBeats: z.number(),
    highBeats: z.number(),
  }),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 900,
  memorySize: 2048,
  group: 'ffmpeg',
  layers: ['arn:aws:lambda:${aws:region}:${aws:accountId}:layer:ffmpeg:1'],
};

function isLambda() {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function resolveBinary(name: 'ffmpeg' | 'ffprobe'): string {
  const envKey = name === 'ffmpeg' ? 'FFMPEG_PATH' : 'FFPROBE_PATH';
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;

  if (isLambda()) {
    // Layer typically puts binaries on PATH and/or under /opt/bin
    const layerPath = `/opt/bin/${name}`;
    if (fs.existsSync(layerPath)) return layerPath;
    return name;
  }

  try {
    if (name === 'ffmpeg') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const installer = require('@ffmpeg-installer/ffmpeg');
      if (installer?.path && fs.existsSync(installer.path))
        return installer.path;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const installer = require('@ffprobe-installer/ffprobe');
      if (installer?.path && fs.existsSync(installer.path))
        return installer.path;
    }
  } catch {
    // fall through to PATH
  }

  return name;
}

function runCmd(params: {
  cmd: string;
  args: string[];
  timeoutMs?: number;
}): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  const { cmd, args, timeoutMs = 120_000 } = params;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    const t = setTimeout(() => child.kill('SIGKILL'), timeoutMs);

    child.stdout?.on('data', d => (stdout += d.toString('utf8')));
    child.stderr?.on('data', d => (stderr += d.toString('utf8')));
    child.on('error', e => {
      clearTimeout(t);
      reject(e);
    });
    child.on('close', code => {
      clearTimeout(t);
      resolve({ stdout, stderr, exitCode: code });
    });
  });
}

async function downloadToFile(
  url: string,
  dest: string,
  maxBytes: number,
): Promise<number> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(
      `Failed to download audio: ${res.status} ${res.statusText}`,
    );
  }

  const contentLength = Number(res.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    throw new Error(
      `Audio too large (${contentLength} bytes > max ${maxBytes})`,
    );
  }

  const reader = res.body.getReader();
  const file = fs.createWriteStream(dest);
  let bytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        file.destroy();
        throw new Error(
          `Audio too large while downloading (> ${maxBytes} bytes)`,
        );
      }
      file.write(Buffer.from(value));
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      file.end(() => resolve());
      file.on('error', reject);
    });
  }

  return bytes;
}

async function probeDurationAndSampleRate(
  filePath: string,
): Promise<{ duration: number; sampleRate: number }> {
  const ffprobe = resolveBinary('ffprobe');
  const { stdout, stderr, exitCode } = await runCmd({
    cmd: ffprobe,
    args: [
      '-v',
      'error',
      '-hide_banner',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ],
    timeoutMs: 60_000,
  });

  if (exitCode !== 0) {
    throw new Error(
      `ffprobe failed: ${(stderr || stdout || 'unknown').slice(-500)}`,
    );
  }

  const json = JSON.parse(stdout || '{}') as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; sample_rate?: string }>;
  };

  const duration = Number(json.format?.duration);
  const audioStream =
    json.streams?.find(s => s.codec_type === 'audio') ?? json.streams?.[0];
  const sampleRate = Number(audioStream?.sample_rate) || 44100;

  return {
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    sampleRate,
  };
}

export default createWorker<typeof InputSchema, Output>({
  id: 'analyze-audio',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({
    input,
    ctx,
  }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const parsed = InputSchema.parse(input);
    const tmpDir = path.join(
      os.tmpdir(),
      `analyze-audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, 'input.bin');
    const pcmPath = path.join(tmpDir, 'audio.s16le');

    try {
      await ctx.jobStore?.update({
        status: 'running',
        progressMessage: 'Downloading audio…',
      });

      await downloadToFile(parsed.audioSrc, inputPath, parsed.maxBytes);

      await ctx.jobStore?.update({ progressMessage: 'Probing audio…' });
      const probed = await probeDurationAndSampleRate(inputPath);
      const targetRate = parsed.sampleRate || probed.sampleRate || 22050;

      await ctx.jobStore?.update({ progressMessage: 'Decoding PCM…' });
      const ffmpeg = resolveBinary('ffmpeg');
      const decode = await runCmd({
        cmd: ffmpeg,
        args: [
          '-y',
          '-i',
          inputPath,
          '-ac',
          '1',
          '-ar',
          String(targetRate),
          '-f',
          's16le',
          pcmPath,
        ],
        timeoutMs: 180_000,
      });

      if (decode.exitCode !== 0) {
        throw new Error(
          `ffmpeg decode failed: ${(decode.stderr || decode.stdout || '').slice(-600)}`,
        );
      }

      await ctx.jobStore?.update({
        progressMessage: 'Analyzing energy frames…',
      });
      const pcmBuffer = await fsp.readFile(pcmPath);
      const samples = s16leToFloat32(pcmBuffer);
      const analysis = analyzeAudioPcm(samples, targetRate);

      const durationFromSamples = samples.length / targetRate;
      const durationInSeconds =
        probed.duration > 0 ? probed.duration : durationFromSamples;

      const output: Output = {
        analysis,
        durationInSeconds,
        summary: buildAnalysisSummary(analysis),
      };

      await ctx.jobStore?.update({
        status: 'completed',
        progressMessage: `Analyzed ${analysis.length} frames`,
      });

      return output;
    } finally {
      try {
        await fsp.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  },
});
