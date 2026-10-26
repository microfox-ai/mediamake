/**
 * map: write `<video>.map.json` beside a rendered video: every shot with a stable id, plus the
 * sections. mediamake's Revisions screen (/revisions) reads it to show shots on the timeline and
 * tag each review comment with the shot it is about. render-project runs this after every render.
 *
 * Usage: npm run map -w lyrics_videos -- <slug> [--video=out/<slug>/<slug>.mp4] [--frames=a-b]
 *   --video    a render other than the default output (relative to apps/lyrics_videos or absolute)
 *   --frames   the --frames range that render was made with, so times line up with the clip
 *
 * Shots come from projects/<slug>/video/shots.json when the project has one:
 *   [{ "id": "h1.3", "from": 4.7, "to": 6.87, "label": "Reticle on W19 eye", "lyric": "…", "section": "hook-1" }]
 * (song seconds; ids stay stable between renders, split a shot as v1.1a / v1.1b). Without it, every
 * lyric line starts a shot inside its manifest section, which is right for simple projects only.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { z } from 'zod';
import { ManifestSchema, type Manifest } from '../src/kit/manifest.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const which = (bin: string, fallback: string) => {
  try {
    return execFileSync('which', [bin]).toString().trim() || fallback;
  } catch {
    return fallback;
  }
};
const FFPROBE = which('ffprobe', ffprobeInstaller.path);

const ShotSchema = z.object({
  id: z.string(),
  from: z.number(),
  to: z.number(),
  label: z.string().optional(),
  lyric: z.string().optional(),
  section: z.string().optional(),
});
type Shot = z.infer<typeof ShotSchema>;

type MapSection = { id: string; label: string; from: number; to: number };

export type VideoMap = {
  schema: 'mediamake.video-map/v1';
  video: string;
  source: { path: string; project: string; shots: string };
  fps: number;
  duration: number;
  width: number;
  height: number;
  sections: MapSection[];
  shots: Shot[];
  markers: { id: string; time: number; label?: string }[];
};

const round = (n: number) => Math.round(n * 1000) / 1000;

function probe(video: string) {
  const out = execFileSync(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate:format=duration',
    '-of', 'json',
    video,
  ]).toString();
  const info = JSON.parse(out) as {
    streams: { width: number; height: number; r_frame_rate: string }[];
    format: { duration: string };
  };
  const stream = info.streams[0];
  const [num, den] = stream.r_frame_rate.split('/').map(Number);
  return {
    fps: Math.round((num / (den || 1)) * 1000) / 1000,
    width: stream.width,
    height: stream.height,
    duration: Number(info.format.duration),
  };
}

/** "hook-1" → "h1", "verse-1a" → "v1a", "pre-chorus-2" → "pc2", "outro" → "o". */
function abbreviate(label: string): string {
  const parts = label.toLowerCase().split(/[-_\s]+/).filter(Boolean);
  const words = parts.filter(p => /^[a-z]+$/.test(p)).map(p => p[0]);
  const rest = parts.filter(p => !/^[a-z]+$/.test(p));
  return words.join('') + rest.join('') || label;
}

function sectionIds(manifest: Manifest): Map<string, string> {
  const ids = new Map<string, string>();
  const count = new Map<string, number>();
  for (const s of manifest.sections) {
    const id = abbreviate(s.label);
    count.set(id, (count.get(id) ?? 0) + 1);
  }
  // Two sections that abbreviate the same (bridge / break) keep their full label.
  for (const s of manifest.sections) {
    const id = abbreviate(s.label);
    ids.set(s.label, count.get(id)! > 1 ? s.label : id);
  }
  return ids;
}

/** One shot per lyric line within each section; the stretch before the first line is its own shot. */
function shotsFromLyrics(manifest: Manifest, ids: Map<string, string>): Shot[] {
  const shots: Shot[] = [];
  for (const section of manifest.sections) {
    const lines = manifest.lyrics.filter(l => l.start >= section.from + 0.3 && l.start < section.to - 0.3);
    const cuts = [section.from, ...lines.map(l => l.start)];
    cuts.forEach((from, i) => {
      const to = cuts[i + 1] ?? section.to;
      if (to - from < 0.05) return;
      const line = i === 0 ? manifest.lyrics.find(l => l.start >= from - 0.3 && l.start < from + 0.3) : lines[i - 1];
      shots.push({
        id: `${ids.get(section.label)}.${shots.filter(s => s.section === section.label).length + 1}`,
        from,
        to,
        lyric: line?.text ?? '(instrumental)',
        section: section.label,
      });
    });
  }
  return shots;
}

function readShots(slug: string, manifest: Manifest, rel = 'video/shots.json'): Shot[] | null {
  const file = path.join(ROOT, 'projects', slug, rel);
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const shots = z.array(ShotSchema.passthrough()).parse(Array.isArray(raw) ? raw : raw.shots);
  return shots.map(({ id, from, to, label, lyric, section }) => ({
    id,
    from,
    to,
    label,
    lyric,
    // Fill in the section from time when the shot list does not say.
    section: section ?? manifest.sections.find(s => from >= s.from && from < s.to)?.label,
  }));
}

/** a short (make-video-music-remix-shorts): its shot list and where it starts in the song (seconds) */
export type MapShort = { shots: string; offset: number };

export function buildVideoMap(
  slug: string,
  videoPath: string,
  frames?: { from: number; to: number },
  short?: MapShort,
): VideoMap {
  const manifestPath = path.join(ROOT, 'projects', slug, 'manifest.json');
  const manifest = ManifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  const video = probe(videoPath);
  const ids = sectionIds(manifest);
  const explicit = readShots(slug, manifest, short?.shots);
  const songShots = explicit ?? shotsFromLyrics(manifest, ids);

  // A --frames render starts at frame `from`; shift everything into the clip's own time. A short
  // starts at its window's song time.
  const offset = (short?.offset ?? 0) + (frames ? frames.from / video.fps : 0);
  const end = frames ? (short?.offset ?? 0) + (frames.to + 1) / video.fps : short ? short.offset + video.duration : Infinity;
  const clip = <T extends { from: number; to: number }>(items: T[]): T[] =>
    items
      .filter(it => it.to > offset && it.from < end)
      .map(it => ({ ...it, from: round(Math.max(it.from, offset) - offset), to: round(Math.min(it.to, end) - offset) }));

  return {
    schema: 'mediamake.video-map/v1',
    video: path.basename(videoPath),
    source: { path: path.resolve(videoPath), project: slug, shots: explicit ? short?.shots ?? 'video/shots.json' : 'lyrics' },
    fps: video.fps,
    duration: round(video.duration),
    width: video.width,
    height: video.height,
    sections: clip(manifest.sections.map(s => ({ id: ids.get(s.label)!, label: s.label, from: s.from, to: s.to }))),
    // Shots use section ids, so they match the map's sections.
    shots: clip(songShots).map(s => ({ ...s, section: s.section ? ids.get(s.section) ?? s.section : undefined })),
    markers: [],
  };
}

export function mapPathFor(videoPath: string): string {
  const ext = path.extname(videoPath);
  return path.join(path.dirname(videoPath), `${path.basename(videoPath, ext)}.map.json`);
}

export function parseFramesFlag(flags: string[]): { from: number; to: number } | undefined {
  const flag = flags.find(f => f.startsWith('--frames='));
  if (!flag) return undefined;
  const [a, b] = flag.slice('--frames='.length).split('-').map(Number);
  if (!Number.isFinite(a)) return undefined;
  return { from: a, to: Number.isFinite(b) ? b : Number.MAX_SAFE_INTEGER };
}

export function writeVideoMap(slug: string, videoPath: string, frames?: { from: number; to: number }, short?: MapShort): string {
  const map = buildVideoMap(slug, videoPath, frames, short);
  const out = mapPathFor(videoPath);
  fs.writeFileSync(out, `${JSON.stringify(map, null, 2)}\n`);
  const shown = path.relative(process.cwd(), out);
  console.log(
    `Map: ${shown.startsWith('..') ? out : shown} (${map.shots.length} shots from ${map.source.shots}, ${map.sections.length} sections, ${map.fps} fps)`,
  );
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const flags = args.filter(a => a.startsWith('--'));
  const [slug] = args.filter(a => !a.startsWith('--'));
  if (!slug) {
    console.error('Usage: npm run map -w lyrics_videos -- <slug> [--video=path.mp4] [--frames=a-b]');
    process.exit(1);
  }
  const videoFlag = flags.find(f => f.startsWith('--video='))?.slice('--video='.length);
  const videoPath = path.resolve(ROOT, videoFlag ?? path.join('out', slug, `${slug}.mp4`));
  if (!fs.existsSync(videoPath)) {
    console.error(`No video at ${videoPath}. Render first, or pass --video=<path>.`);
    process.exit(1);
  }
  writeVideoMap(slug, videoPath, parseFramesFlag(flags));
}
