/**
 * Video Scene Worker - Download video from URL, split by scene, upload segments to S3
 *
 * Runs in Lambda; ffmpeg/ffprobe are provided by the Lambda layer (e.g. /opt/bin).
 * Use ffmpeg/ffprobe directly without path configuration.
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
import { uploadFile } from '../../../../lib/sparkboard/upload';
import { getDatabase } from '../../../../lib/mongodb';
import type { MediaFile } from '../../../types/media';

function runCmd(params: {
  cmd: string;
  args: string[];
  timeoutMs?: number;
}): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  const { cmd, args, timeoutMs = 60_000 } = params;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let stdout = '';
    let stderr = '';
    const t = timeoutMs
      ? setTimeout(() => {
          child.kill('SIGKILL');
        }, timeoutMs)
      : null;

    child.stdout?.on('data', (d) => (stdout += d.toString('utf8')));
    child.stderr?.on('data', (d) => (stderr += d.toString('utf8')));
    child.on('error', (e) => {
      if (t) clearTimeout(t);
      reject(e);
    });
    child.on('close', (code) => {
      if (t) clearTimeout(t);
      resolve({ stdout, stderr, exitCode: code });
    });
  });
}

/** Get duration (seconds) from a local video file using ffprobe. */
async function getDuration(filePath: string): Promise<number> {
  const { stdout, exitCode } = await runCmd({
    cmd: 'ffprobe',
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
    timeoutMs: 30_000,
  });
  if (exitCode !== 0) throw new Error(`ffprobe failed: ${stdout || 'no output'}`);
  const json = JSON.parse(stdout || '{}') as { format?: { duration?: string } };
  const d = Number(json?.format?.duration);
  if (!Number.isFinite(d) || d <= 0) throw new Error('Could not get video duration');
  return d;
}

/**
 * Get scene change timestamps (seconds) using ffmpeg select=gt(scene,threshold),showinfo.
 */
async function getSceneTimestamps(
  inputPath: string,
  threshold: number,
  durationSeconds: number,
): Promise<number[]> {
  const { stderr, exitCode } = await runCmd({
    cmd: 'ffmpeg',
    args: [
      '-i',
      inputPath,
      '-vf',
      `select='gt(scene\\,${threshold})',showinfo`,
      '-f',
      'null',
      '-',
    ],
    timeoutMs: 120_000,
  });
  if (exitCode !== 0 && exitCode !== 1) {
    throw new Error(`ffmpeg scene detection failed (exit ${exitCode}): ${stderr.slice(-500)}`);
  }
  const ptsTimes: number[] = [];
  const regex = /pts_time:([\d.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(stderr)) !== null) {
    const t = parseFloat(m[1]);
    if (Number.isFinite(t) && t > 0 && t < durationSeconds) ptsTimes.push(t);
  }
  return [...new Set(ptsTimes)].sort((a, b) => a - b);
}

/**
 * Try multiple scene thresholds (all using ffmpeg's scene detection) until we
 * get a reasonable number of cuts for the given duration.
 *
 * This avoids hard‑coded fixed segments and keeps everything driven by
 * ffmpeg's scene metric.
 */
async function getAdaptiveSceneTimestamps(
  inputPath: string,
  baseThreshold: number,
  durationSeconds: number,
): Promise<number[]> {
  // Clamp base threshold to sane bounds
  const clampedBase = Math.min(0.9, Math.max(0.02, baseThreshold || 0.3));

  // Try from stricter to more sensitive thresholds.
  const candidates = Array.from(
    new Set(
      [
        clampedBase * 1.5,
        clampedBase,
        clampedBase * 0.75,
        clampedBase * 0.5,
        clampedBase * 0.35,
        clampedBase * 0.25,
        clampedBase * 0.15,
        clampedBase * 0.1,
      ].map((t) => Math.min(0.9, Math.max(0.02, t))),
    ),
  );

  // Target more scenes for longer videos; these are soft goals.
  const idealPerMinute = 3; // ~3 scene cuts per minute of content
  const idealCount = Math.max(1, Math.round((durationSeconds / 60) * idealPerMinute));

  let best: number[] = [];

  for (const t of candidates) {
    const cuts = await getSceneTimestamps(inputPath, t, durationSeconds);
    if (cuts.length === 0) {
      // keep searching with more sensitive thresholds
      continue;
    }

    best = cuts;

    // If we are close enough to the target, stop early.
    if (cuts.length >= Math.max(2, Math.floor(idealCount * 0.6))) {
      break;
    }
  }

  return best;
}

/** Extract segment [start, end) to outputPath using -c copy. */
async function extractSegment(
  inputPath: string,
  outputPath: string,
  startSeconds: number,
  endSeconds: number,
): Promise<void> {
  const { stderr, exitCode } = await runCmd({
    cmd: 'ffmpeg',
    args: [
      '-i',
      inputPath,
      '-ss',
      String(startSeconds),
      '-to',
      String(endSeconds),
      '-c',
      'copy',
      '-y',
      outputPath,
    ],
    timeoutMs: 120_000,
  });
  if (exitCode !== 0) {
    throw new Error(`ffmpeg segment extract failed: ${stderr.slice(-500)}`);
  }
}

/** Download a remote file (e.g. mp4) to a local path using HTTP/HTTPS streaming. */
async function downloadVideoToFile(url: string, destPath: string): Promise<void> {
  const doDownload = (currentUrl: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const client = currentUrl.startsWith('https') ? https : http;
      const file = fs.createWriteStream(destPath);

      const request = client.get(currentUrl, (response) => {
        // Follow redirects
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          fs.rmSync(destPath, { force: true });
          doDownload(response.headers.location).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.rmSync(destPath, { force: true });
          reject(
            new Error(`Download failed with status ${response.statusCode ?? 'unknown'}`),
          );
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      });

      request.on('error', (err) => {
        file.close();
        fs.rmSync(destPath, { force: true });
        reject(err);
      });
    });

  await doDownload(url);
}

const InputSchema = z.object({
  /** Direct URL to a video file (e.g. mp4, mov). Must be publicly accessible. */
  videoUrl: z.string().url(),
  clientId: z.string().optional().default('default'),
  folder: z.string().optional(),
  sceneThreshold: z.number().min(0).max(1).optional().default(0.3),
  tags: z.array(z.string()).optional().default(['video-splitter']),
  projectId: z.string().optional().nullable(),
  /** Optional title to store with resulting media entries; falls back to filename. */
  title: z.string().optional(),
});

const OutputSchema = z.object({
  title: z.string().optional(),
  sceneUrls: z.array(z.string()),
  segmentCount: z.number(),
  mediaFiles: z.array(z.any()).optional(),
  error: z.string().optional(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export const workerConfig: WorkerConfig = {
  timeout: 900,
  memorySize: 2048,
  group: 'ffmpeg',
  layers: ['arn:aws:lambda:${aws:region}:${aws:accountId}:layer:ffmpeg:1'],
};

export default createWorker<typeof InputSchema, Output>({
  id: 'video-splitter',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async ({ input }: WorkerHandlerParams<Input, Output>): Promise<Output> => {
    const {
      videoUrl,
      clientId = 'default',
      sceneThreshold = 0.3,
      tags = ['video-splitter'],
      projectId,
      title: inputTitle,
    } = input;
    const folder = input.folder ?? `mediamake/${clientId}/video-scenes`;
    const tmpDir = path.join(
      os.tmpdir(),
      `video-splitter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    const videoPath = path.join(tmpDir, 'video.mp4');

    try {
      fs.mkdirSync(tmpDir, { recursive: true });

      // 1) Download the video from the provided URL
      await downloadVideoToFile(videoUrl, videoPath);

      if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size === 0) {
        throw new Error('Downloaded file is missing or empty');
      }

      // Derive title and synthetic video id for metadata
      const urlObj = new URL(videoUrl);
      const inferredTitle = decodeURIComponent(path.basename(urlObj.pathname)) || 'Unknown';
      const title = inputTitle || inferredTitle;
      const videoId = new ObjectId().toString();

      // 2) Get duration via ffprobe
      const duration = await getDuration(videoPath);

      // 3) Scene detection (adaptive, but always based on ffmpeg scene values)
      const sceneTimes = await getAdaptiveSceneTimestamps(
        videoPath,
        sceneThreshold,
        duration,
      );
      const segments: { start: number; end: number }[] = [];

      // Build segments from scene boundaries.
      let prev = 0;
      for (const t of sceneTimes) {
        if (t - prev >= 0.5) segments.push({ start: prev, end: t });
        prev = t;
      }
      if (duration - prev >= 0.5) segments.push({ start: prev, end: duration });

      // Absolute minimum safeguard – never return zero segments.
      if (segments.length === 0) {
        segments.push({ start: 0, end: duration });
      }

      const db = await getDatabase();
      const collection = db.collection<MediaFile>('mediaFiles');
      // Ensure we have a parent media document representing the source video
      let parentId: ObjectId | null = null;
      const existingParent = await collection.findOne({
        clientId,
        contentType: 'video',
        $or: [{ contentSourceUrl: videoUrl }, { filePath: videoUrl }],
      });
      if (existingParent?._id) {
        parentId = existingParent._id as ObjectId;
      } else {
        const parentDoc: MediaFile = {
          _id: new ObjectId(),
          tags,
          clientId,
          ...(projectId != null ? { projectId } : {}),
          contentType: 'video',
          contentMimeType: 'video/mp4',
          contentSubType: 'external',
          contentSource: 'url',
          contentSourceUrl: videoUrl,
          metadata: {
            title,
            videoId,
            sourceUrl: videoUrl,
            isParent: true,
          },
          fileName: inferredTitle,
          // Do not re-upload original; keep external URL as filePath
          filePath: videoUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await collection.insertOne(parentDoc);
        parentId = parentDoc._id as ObjectId;
      }

      // 4) Extract each segment, upload to S3, and save to MongoDB
      const sceneUrls: string[] = [];
      const mediaFiles: MediaFile[] = [];
      const splitBatchId = new ObjectId().toString();

      for (let i = 0; i < segments.length; i++) {
        const { start, end } = segments[i];
        const segmentPath = path.join(tmpDir, `scene_${String(i + 1).padStart(3, '0')}.mp4`);
        await extractSegment(videoPath, segmentPath, start, end);
        const buffer = fs.readFileSync(segmentPath);
        const fileSize = buffer.length;
        const id = `${videoId}_scene_${i + 1}_${Date.now()}`;
        const url = await uploadFile({
          id,
          buffer,
          contentType: 'video/mp4',
          fileExtension: '.mp4',
          folder,
        });
        if (url) {
          sceneUrls.push(url);
          const fileName = `scene_${String(i + 1).padStart(3, '0')}.mp4`;
          const doc: MediaFile = {
            _id: new ObjectId(),
            tags,
            clientId,
            ...(projectId != null ? { projectId } : {}),
            ...(parentId ? { parentMediaId: parentId } : {}),
            contentType: 'video',
            contentMimeType: 'video/mp4',
            contentSubType: 'mp4',
            contentSource: 'url',
            contentSourceUrl: videoUrl,
            metadata: {
              splitBatchId,
              title,
              videoId,
              sceneIndex: i + 1,
              segmentStart: start,
              segmentEnd: end,
              sourceUrl: videoUrl,
            },
            fileName,
            fileSize,
            filePath: url,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await collection.insertOne(doc);
          mediaFiles.push(doc);
        }
      }

      return { title, sceneUrls, segmentCount: sceneUrls.length, mediaFiles };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      return { sceneUrls: [], segmentCount: 0, mediaFiles: [], error: message };
    } finally {
      try {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  },
});

