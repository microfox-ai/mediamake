/**
 * ff: the ffmpeg and ffprobe the review scripts run (the system's when installed, else the npm
 * ones), a runner that returns ffmpeg's log (where filters such as blackdetect report), and one
 * probe for a media file.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const which = (bin: string, fallback: string) => {
  try {
    return execFileSync('which', [bin], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || fallback;
  } catch {
    return fallback;
  }
};

export const FFMPEG = which('ffmpeg', ffmpegInstaller.path);
export const FFPROBE = which('ffprobe', ffprobeInstaller.path);

/** Runs ffmpeg and returns its log (stderr). Throws with the last lines of the log when it fails. */
export function ffmpegLog(args: string[]): string {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const tail = (r.stderr ?? '').trim().split('\n').slice(-6).join('\n');
    throw new Error(`ffmpeg exited with ${r.status}:\n${tail}`);
  }
  return r.stderr ?? '';
}

export type MediaInfo = {
  /** container duration, seconds */
  duration: number;
  video?: { width: number; height: number; fps: number; duration: number };
  audio?: { duration: number; channels: number; sampleRate: number };
};

export function probeMedia(file: string): MediaInfo {
  const out = execFileSync(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,width,height,r_frame_rate,duration,channels,sample_rate:format=duration',
    '-of', 'json',
    file,
  ]).toString();
  const info = JSON.parse(out) as {
    streams?: { codec_type: string; width?: number; height?: number; r_frame_rate?: string; duration?: string; channels?: number; sample_rate?: string }[];
    format?: { duration?: string };
  };
  const duration = Number(info.format?.duration) || 0;
  const v = info.streams?.find(s => s.codec_type === 'video');
  const a = info.streams?.find(s => s.codec_type === 'audio');
  const [num, den] = (v?.r_frame_rate ?? '30/1').split('/').map(Number);
  return {
    duration,
    video: v
      ? {
          width: v.width ?? 0,
          height: v.height ?? 0,
          fps: Math.round((num / (den || 1)) * 1000) / 1000 || 30,
          duration: Number(v.duration) || duration,
        }
      : undefined,
    audio: a ? { duration: Number(a.duration) || duration, channels: a.channels ?? 0, sampleRate: Number(a.sample_rate) || 0 } : undefined,
  };
}
