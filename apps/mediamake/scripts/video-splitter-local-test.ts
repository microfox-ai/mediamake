import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as https from 'node:https';
import * as http from 'node:http';
import { spawn } from 'node:child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

function resolveBinary(name: 'ffmpeg' | 'ffprobe'): string {
  const envKey = name === 'ffmpeg' ? 'FFMPEG_PATH' : 'FFPROBE_PATH';
  const envPath = process.env[envKey];
  if (envPath && envPath.trim()) return envPath.trim();

  if (name === 'ffmpeg') return ffmpegInstaller.path;
  return ffprobeInstaller.path;
}

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

async function getDuration(filePath: string): Promise<number> {
  const { stdout, exitCode } = await runCmd({
    cmd: resolveBinary('ffprobe'),
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

async function getSceneTimestamps(
  inputPath: string,
  threshold: number,
  durationSeconds: number,
): Promise<number[]> {
  const { stderr, exitCode } = await runCmd({
    cmd: resolveBinary('ffmpeg'),
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

async function getAdaptiveSceneTimestamps(
  inputPath: string,
  baseThreshold: number,
  durationSeconds: number,
): Promise<number[]> {
  const clampedBase = Math.min(0.9, Math.max(0.02, baseThreshold || 0.3));

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

  const idealPerMinute = 3;
  const idealCount = Math.max(1, Math.round((durationSeconds / 60) * idealPerMinute));

  let best: number[] = [];

  for (const t of candidates) {
    const cuts = await getSceneTimestamps(inputPath, t, durationSeconds);
    if (cuts.length === 0) continue;
    best = cuts;
    if (cuts.length >= Math.max(2, Math.floor(idealCount * 0.6))) {
      break;
    }
  }

  return best;
}

async function downloadVideoToFile(url: string, destPath: string): Promise<void> {
  const doDownload = (currentUrl: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const client = currentUrl.startsWith('https') ? https : http;
      const file = fs.createWriteStream(destPath);

      const request = client.get(currentUrl, (response) => {
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

async function main() {
  const videoUrl = process.argv[2];
  const thresholdArg = process.argv[3];

  if (!videoUrl) {
    console.error(
      'Usage: npx tsx scripts/video-splitter-local-test.ts <videoUrl> [sceneThreshold]',
    );
    process.exit(1);
  }

  const baseThreshold = thresholdArg ? Number(thresholdArg) : 0.3;

  const tmpDir = path.join(
    os.tmpdir(),
    `video-splitter-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  const videoPath = path.join(tmpDir, 'video.mp4');

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    console.log(`Using ffprobe: ${resolveBinary('ffprobe')}`);
    console.log(`Using ffmpeg:  ${resolveBinary('ffmpeg')}`);
    console.log(`Downloading video from: ${videoUrl}`);
    await downloadVideoToFile(videoUrl, videoPath);

    if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size === 0) {
      throw new Error('Downloaded file is missing or empty');
    }

    const duration = await getDuration(videoPath);
    console.log(`Video duration: ${duration.toFixed(3)}s`);

    const sceneTimes = await getAdaptiveSceneTimestamps(videoPath, baseThreshold, duration);
    console.log(`Raw scene change timestamps (${sceneTimes.length}):`, sceneTimes);

    const segments: { start: number; end: number }[] = [];
    let prev = 0;
    for (const t of sceneTimes) {
      if (t - prev >= 0.5) segments.push({ start: prev, end: t });
      prev = t;
    }
    if (duration - prev >= 0.5) segments.push({ start: prev, end: duration });
    if (segments.length === 0) segments.push({ start: 0, end: duration });

    console.log(`Final segments (${segments.length}):`);
    segments.forEach((s, i) => {
      console.log(
        `  #${i + 1}: [${s.start.toFixed(3)}s -> ${s.end.toFixed(3)}s] length=${(
          s.end - s.start
        ).toFixed(3)}s`,
      );
    });
  } catch (err) {
    console.error('Error during local test:', err);
    process.exitCode = 1;
  } finally {
    try {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

void main();

