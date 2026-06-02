/**
 * Subtitle Burner Worker — hard-burns an SRT/VTT subtitle track into a video using FFmpeg.
 *
 * Downloads a video + subtitle file, burns the subtitles in with ffmpeg's subtitles filter,
 * uploads the result to S3, and saves a MediaFile record.
 *
 * Runs in the `ffmpeg` group so the FFmpeg Lambda layer is available.
 */

import { createWorker, type WorkerConfig } from '@microfox/ai-worker';
import type { WorkerHandlerParams } from '@microfox/ai-worker/handler';
import { z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as https from 'node:https';
import * as http from 'node:http';
import { spawn } from 'node:child_process';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../../../../lib/mongodb';
import { uploadFile } from '../../../../lib/sparkboard/upload';
import type { MediaFile } from '../../../types/media';

const InputSchema = z.object({
  videoUrl: z.string().url(),
  subtitleUrl: z.string().url().optional(),
  /** Inline SRT content (alternative to subtitleUrl) */
  srtContent: z.string().optional(),
  /** Subtitle style overrides applied via FFmpeg force_style */
  style: z.object({
    fontName: z.string().optional().default('Arial'),
    fontSize: z.number().int().min(8).max(96).optional().default(24),
    primaryColor: z.string().optional().default('&H00FFFFFF'), // ASS color format
    outlineColor: z.string().optional().default('&H00000000'),
    outline: z.number().min(0).max(4).optional().default(2),
    bold: z.boolean().optional().default(false),
    alignment: z.number().int().min(1).max(9).optional().default(2), // 2 = bottom center
    marginV: z.number().int().optional().default(20),
  }).optional(),
  /** Output encoding: copy keeps original streams, re-encode transcodes to h264/aac */
  outputCodec: z.enum(['copy', 'h264']).optional().default('h264'),
  clientId: z.string().optional().default('default'),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default(['subtitle-burner']),
});

const OutputSchema = z.object({
  status: z.enum(['completed', 'failed']),
  videoUrl: z.string().optional(),
  mediaFileId: z.string().optional(),
  message: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 900,
  memorySize: 3072,
  group: 'ffmpeg',
  layers: ['arn:aws:lambda:${aws:region}:${aws:accountId}:layer:ffmpeg:1'],
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

void sleep; // suppress unused warning — available for future retries

function runCmd(cmd: string, args: string[], timeoutMs = 300_000): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let stdout = '';
    let stderr = '';
    const t = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) => { clearTimeout(t); reject(e); });
    child.on('close', (code) => { clearTimeout(t); resolve({ stdout, stderr, exitCode: code }); });
  });
}

function downloadToFile(url: string, dest: string): Promise<void> {
  const doDownload = (currentUrl: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const client = currentUrl.startsWith('https') ? https : http;
      const file = fs.createWriteStream(dest);
      const req = client.get(currentUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.rmSync(dest, { force: true });
          doDownload(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.rmSync(dest, { force: true });
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      });
      req.on('error', (e) => { file.close(); fs.rmSync(dest, { force: true }); reject(e); });
    });
  return doDownload(url);
}

function buildForceStyle(style: Partial<NonNullable<Input['style']>>): string {
  const parts: string[] = [
    `Fontname=${style.fontName ?? 'Arial'}`,
    `Fontsize=${style.fontSize ?? 24}`,
    `PrimaryColour=${style.primaryColor ?? '&H00FFFFFF'}`,
    `OutlineColour=${style.outlineColor ?? '&H00000000'}`,
    `Outline=${style.outline ?? 2}`,
    `Bold=${style.bold ? 1 : 0}`,
    `Alignment=${style.alignment ?? 2}`,
    `MarginV=${style.marginV ?? 20}`,
  ];
  return parts.join(',');
}

export default createWorker<typeof InputSchema, Output>({
  id: 'subtitle-burner',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    if (!input.subtitleUrl && !input.srtContent) {
      return { status: 'failed', message: 'Either subtitleUrl or srtContent must be provided' };
    }

    const tmpDir = path.join(
      os.tmpdir(),
      `subtitle-burner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );

    try {
      fs.mkdirSync(tmpDir, { recursive: true });

      const videoPath = path.join(tmpDir, 'input.mp4');
      const srtPath = path.join(tmpDir, 'subtitles.srt');
      const outputPath = path.join(tmpDir, 'output.mp4');

      // Download video
      console.log('[subtitle-burner] Downloading video…');
      await downloadToFile(input.videoUrl, videoPath);

      // Get or write subtitle file
      if (input.subtitleUrl) {
        console.log('[subtitle-burner] Downloading subtitles…');
        await downloadToFile(input.subtitleUrl, srtPath);
      } else {
        fs.writeFileSync(srtPath, input.srtContent!, 'utf8');
      }

      // Escape the srt path for FFmpeg's subtitles filter (colons must be escaped on Linux)
      const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
      const forceStyle = buildForceStyle(input.style ?? {});
      const subtitlesFilter = `subtitles='${escapedSrt}':force_style='${forceStyle}'`;

      const videoCodecArgs: string[] = input.outputCodec === 'copy'
        ? ['-c:v', 'libx264', '-crf', '18', '-preset', 'fast'] // subtitles filter always requires re-encode
        : ['-c:v', 'libx264', '-crf', '23', '-preset', 'fast'];

      const ffmpegArgs = [
        '-i', videoPath,
        '-vf', subtitlesFilter,
        ...videoCodecArgs,
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-y',
        outputPath,
      ];

      console.log('[subtitle-burner] Running ffmpeg…');
      const { stderr, exitCode } = await runCmd('ffmpeg', ffmpegArgs);

      if (exitCode !== 0) {
        return { status: 'failed', message: `ffmpeg failed (exit ${exitCode}): ${stderr.slice(-600)}` };
      }

      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        return { status: 'failed', message: 'ffmpeg produced an empty output file' };
      }

      const videoBuffer = fs.readFileSync(outputPath);
      const fileId = `sub_burned_${new ObjectId().toString()}_${Date.now()}`;
      const folder = `mediamake/${input.clientId ?? 'default'}/subtitle-burned`;

      const s3Url = await uploadFile({
        id: fileId,
        buffer: videoBuffer,
        contentType: 'video/mp4',
        fileExtension: '.mp4',
        folder,
      });
      if (!s3Url) return { status: 'failed', message: 'S3 upload failed' };

      const db = await getDatabase();
      const doc: MediaFile = {
        tags: input.tags ?? ['subtitle-burner'],
        clientId: input.clientId ?? 'default',
        ...(input.projectId ? { projectId: input.projectId } : {}),
        contentType: 'video',
        contentMimeType: 'video/mp4',
        contentSubType: 'subtitle-burned',
        contentSource: 'url',
        contentSourceUrl: input.videoUrl,
        metadata: {
          sourceVideoUrl: input.videoUrl,
          subtitleUrl: input.subtitleUrl,
          hasSrtContent: Boolean(input.srtContent),
          style: input.style,
          outputCodec: input.outputCodec,
        },
        fileName: `${fileId}.mp4`,
        fileSize: videoBuffer.length,
        filePath: s3Url,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<MediaFile>('mediaFiles').insertOne(doc);
      console.log('[subtitle-burner] Saved mediaFile', String(result.insertedId));

      return { status: 'completed', videoUrl: s3Url, mediaFileId: String(result.insertedId) };
    } catch (err) {
      return {
        status: 'failed',
        message: err instanceof Error ? err.message : String(err),
      };
    } finally {
      try {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch { /* ignore cleanup errors */ }
    }
  },
});
