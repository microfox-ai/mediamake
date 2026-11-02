/**
 * What a media file is (ffprobe), and the small pictures the library keeps of it: a thumbnail per
 * item in .catalog/thumbs/<sha>.jpg (a waveform for audio) and, on request, a contact sheet.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type Probe = { width?: number; height?: number; duration?: number; fps?: number; hasAudio: boolean; codec?: string };

const ratio = (r?: string) => {
  if (!r || r === '0/0') return undefined;
  const [a, b] = r.split('/').map(Number);
  return b ? Math.round((a / b) * 100) / 100 : a || undefined;
};

type Stream = { codec_type: string; codec_name?: string; width?: number; height?: number; avg_frame_rate?: string; r_frame_rate?: string; duration?: string; disposition?: { attached_pic?: number } };

export const probe = (file: string, still = false): Probe | null => {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { maxBuffer: 1 << 24, timeout: 60_000 });
    const j = JSON.parse(out.toString()) as { streams?: Stream[]; format?: { duration?: string } };
    const v = j.streams?.find(s => s.codec_type === 'video' && s.disposition?.attached_pic !== 1);
    const a = j.streams?.find(s => s.codec_type === 'audio');
    const duration = Number(j.format?.duration) || Number(v?.duration) || Number(a?.duration) || undefined;
    return {
      width: v?.width,
      height: v?.height,
      duration: still ? undefined : duration && Math.round(duration * 100) / 100,
      fps: still || !v ? undefined : ratio(v.avg_frame_rate) ?? ratio(v.r_frame_rate),
      hasAudio: !!a,
      codec: v?.codec_name ?? a?.codec_name,
    };
  } catch {
    return null;
  }
};

const ffmpeg = (args: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'pipe', timeout: 120_000 });

/** A 360 px wide JPEG (a waveform for audio). False when ffmpeg can't read the file. */
export const thumbnail = (file: string, type: 'video' | 'image' | 'audio', duration: number | undefined, out: string) => {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    if (type === 'audio') ffmpeg(['-i', file, '-filter_complex', 'aformat=channel_layouts=mono,showwavespic=s=360x120:colors=#8fd3ff', '-frames:v', '1', out]);
    else if (type === 'video') ffmpeg(['-ss', String(Math.min((duration ?? 0) * 0.3, 8)), '-i', file, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', out]);
    else ffmpeg(['-i', file, '-frames:v', '1', '-vf', "scale='min(360,iw)':-2", '-q:v', '4', out]);
    return true;
  } catch {
    return false;
  }
};

const FONT = ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc'].find(f => fs.existsSync(f));
const label = (s: string) => s.replace(/[^A-Za-z0-9 ._#/-]/g, ' ').slice(0, 44);

/** A dark tile with the file's name, for what has no picture (a 3D model, a stems zip, a clip ffmpeg can't read). */
export const placeholder = (name: string, out: string) => {
  const text = FONT ? `drawtext=fontfile=${FONT}:text='${label(name)}':x=(w-tw)/2:y=(h-th)/2:fontsize=16:fontcolor=white` : 'null';
  ffmpeg(['-f', 'lavfi', '-i', 'color=c=0x1d1d1d:s=360x240', '-frames:v', '1', '-vf', text, '-pix_fmt', 'yuvj420p', out]);
  return out;
};

/**
 * A labelled grid of pictures (one cell each, its label underneath), for Claude to look at before
 * casting: `media find … --sheet` passes the items' thumbnails, `media show … --sheet` frames of one video.
 */
export const sheet = (cells: { image: string; label: string }[], out: string, columns = 6) => {
  if (!cells.length) return false;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-sheet-'));
  try {
    // one pixel format for every tile: a grayscale picture would otherwise restart the tile filter and cut the sheet short
    cells.forEach((c, i) => {
      const text = FONT ? `,drawtext=fontfile=${FONT}:text='${label(c.label)}':x=6:y=186:fontsize=15:fontcolor=white` : '';
      const tile = path.join(tmp, `${String(i).padStart(3, '0')}.jpg`);
      try {
        ffmpeg(['-i', c.image, '-frames:v', '1', '-vf', `scale=320:180:force_original_aspect_ratio=decrease,pad=320:208:(ow-iw)/2:(180-ih)/2:color=0x111111${text}`, '-pix_fmt', 'yuvj420p', '-q:v', '3', tile]);
      } catch {
        ffmpeg(['-f', 'lavfi', '-i', 'color=c=0x111111:s=320x208', '-frames:v', '1', '-vf', text ? text.slice(1) : 'null', '-pix_fmt', 'yuvj420p', tile]);
      }
    });
    const rows = Math.ceil(cells.length / columns);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    ffmpeg(['-framerate', '1', '-i', path.join(tmp, '%03d.jpg'), '-vf', `tile=${Math.min(columns, cells.length)}x${rows}:padding=4:color=0x000000`, '-frames:v', '1', '-q:v', '3', out]);
    return true;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
};

/** 12 frames across one video, for its contact sheet. */
export const frames = (file: string, duration: number, dir: string, count = 12) => {
  fs.mkdirSync(dir, { recursive: true });
  const shots: { image: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const t = (duration * (i + 0.5)) / count;
    const image = path.join(dir, `f${String(i).padStart(2, '0')}.jpg`);
    try {
      ffmpeg(['-ss', t.toFixed(2), '-i', file, '-frames:v', '1', '-vf', 'scale=320:-2', '-q:v', '4', image]);
      shots.push({ image, label: `${t.toFixed(1)} s` });
    } catch {
      // past the end of a short or broken file
    }
  }
  return shots;
};
