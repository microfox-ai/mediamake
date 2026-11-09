/**
 * preview: 10-second previews instead of whole review renders (refactor step B1, P3; the user's rule:
 * a preview is a 10 s stretch, never the whole video; the whole video renders once, for the master).
 *
 * `mm render <slug> --preview[=<what>,…]` renders the 10 s around each thing named, at half size, and
 * joins them into one review file, out/<slug>/preview/<slug>.mp4, with a shot map whose shots keep
 * their ids, so comments in Video Revision land on the right shot. What can be named:
 *
 *   h1.3        a shot (video/shots.json, or one per lyric line)        → the 10 s around it
 *   hook-1, h1  a section by label or id                                → its first 10 s
 *   47.5, 1:23  a second of the song                                     → the 10 s around it
 *   40-55       a stretch of the song in seconds, as named
 *
 * With nothing named, the stretches come from the latest revision's comments (the main video's, the
 * last preview's or a live review's): the 10 s around each point and range comment, where the fixes
 * just went. With no revision yet, the first hook or chorus. Stretches that overlap or nearly touch
 * are merged. --seconds=<n> changes the length (default 10). A video no longer than 1.5 stretches (15 s)
 * is its own preview, whole.
 *
 * The map also lists each stretch (`stretches`: where it sits in the preview and in the song) and a
 * marker where each one starts, and a stretch's comments keep their shot ids, so the next round maps
 * them back onto the song.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FFMPEG, probeMedia } from './ff.ts';
import { readJson, writeJsonAtomic } from './locks.ts';
import { buildVideoMap, mapPathFor, songTimeline, type PreviewStretch, type VideoMap } from './map.ts';
import { DIRS } from './paths.ts';
import { readRevisions, REVISIONS_SUFFIX, type Revision } from './revision-files.ts';

export type Stretch = { frames: [number, number]; why: string[] };
export type PreviewPlan = { fps: number; durationInFrames: number; stretches: Stretch[]; source: string };
/** song seconds; `whole`: render as named; `start`: its first `seconds` (a section) */
type Span = { from: number; to: number; why: string; whole?: boolean; start?: boolean };

/** fps and length of a composition, from the bundle (a browser, once) and kept beside it until the manifest or edits change. */
export async function compositionInfo(serveUrl: string, id: string, slug: string): Promise<{ fps: number; durationInFrames: number; width: number; height: number }> {
  const stat = (f: string) => {
    const s = fs.statSync(path.join(DIRS.projects, slug, f), { throwIfNoEntry: false });
    return s ? `${s.size}:${Math.round(s.mtimeMs)}` : 'x';
  };
  const key = `${id}|${stat('manifest.json')}|${stat('video/edits.json')}`;
  const file = path.join(serveUrl, '.compositions.json');
  const known = readJson<Record<string, { fps: number; durationInFrames: number; width: number; height: number }>>(file) ?? {};
  if (known[key]) return known[key];
  const { selectComposition } = await import('@remotion/renderer');
  const c = await selectComposition({
    serveUrl,
    id,
    inputProps: {},
    chromiumOptions: { gl: 'angle' },
    browserExecutable: process.env.MM_BROWSER ?? null,
    timeoutInMilliseconds: 100000,
    logLevel: 'error',
  });
  const info = { fps: c.fps, durationInFrames: c.durationInFrames, width: c.width, height: c.height };
  try {
    writeJsonAtomic(file, { ...known, [key]: info });
  } catch {
    // a read-only bundle: ask again next time
  }
  return info;
}

const clock = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

const parseTime = (s: string): number | null => {
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(s.trim());
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null;
};

/** Each target as a span of song seconds. */
function resolveTargets(slug: string, targets: string[]): Span[] {
  const { sections, shots } = songTimeline(slug);
  return targets.map((raw): Span => {
    const t = raw.trim();
    const range = /^(\d+(?:\.\d+)?|\d+:\d+(?:\.\d+)?)-(\d+(?:\.\d+)?|\d+:\d+(?:\.\d+)?)$/.exec(t);
    if (range) {
      const [a, b] = [parseTime(range[1])!, parseTime(range[2])!];
      if (!(b > a)) throw new Error(`--preview=${t}: the end comes before the start`);
      return { from: a, to: b, why: t, whole: true };
    }
    const at = parseTime(t);
    if (at !== null) return { from: at, to: at, why: `${t} s` };
    const shot = shots.find(s => s.id === t);
    if (shot) return { from: shot.from, to: shot.to, why: `shot ${shot.id}` };
    const section = sections.find(s => s.id === t || s.label === t);
    if (section) return { from: section.from, to: section.to, why: `section ${section.label}`, start: true };
    throw new Error(`--preview=${t}: not a shot, section or time of ${slug} (shots look like ${shots.slice(0, 3).map(s => s.id).join(', ')}; sections ${sections.map(s => s.id).join(', ')})`);
  });
}

/** The revisions a preview can come from: the main video's, the last preview's and a live review's. */
function latestRevision(slug: string): { revision: Revision; kind: 'main' | 'preview' | 'live' } | null {
  const out = path.join(DIRS.out, slug);
  const places = [
    { dir: path.join(out, `${slug}${REVISIONS_SUFFIX}`), kind: 'main' as const },
    { dir: path.join(out, 'preview', `${slug}${REVISIONS_SUFFIX}`), kind: 'preview' as const },
    { dir: path.join(out, `live${REVISIONS_SUFFIX}`), kind: 'live' as const },
  ];
  const all = places.flatMap(p => readRevisions(p.dir).map(revision => ({ revision, kind: p.kind })));
  return all.sort((a, b) => a.revision.updatedAt.localeCompare(b.revision.updatedAt)).at(-1) ?? null;
}

/** Song seconds for a time in the reviewed video: the same for the main video and live review, through the stretches for a preview. */
function songTimeOf(t: number, kind: 'main' | 'preview' | 'live', stretches: PreviewStretch[] | null): number | null {
  if (kind !== 'preview') return t;
  const s = stretches?.find(x => t >= x.from - 1e-6 && t < x.to + 1e-6);
  return s ? s.songFrom + (t - s.from) : null;
}

/** Spans from the latest revision's point and range comments (general notes have no time). */
function spansFromRevision(slug: string): { spans: Span[]; source: string } | null {
  const latest = latestRevision(slug);
  if (!latest) return null;
  const { revision, kind } = latest;
  const { shots } = songTimeline(slug);
  // the preview's stretches, when the reviewed file is still the one on disk
  let stretches: PreviewStretch[] | null = null;
  if (kind === 'preview') {
    const video = path.join(DIRS.out, slug, 'preview', `${slug}.mp4`);
    const map = readJson<VideoMap>(mapPathFor(video));
    const size = fs.statSync(video, { throwIfNoEntry: false })?.size;
    if (map?.stretches && size === revision.video.size) stretches = map.stretches;
  }
  const byShot = (id: string) => shots.find(s => s.id === id);
  const spans: Span[] = [];
  for (const c of revision.comments) {
    if (c.kind === 'point') {
      const at = songTimeOf(c.time, kind, stretches);
      const shot = c.shot ? byShot(c.shot.id) : undefined;
      if (at !== null) spans.push({ from: at, to: at, why: `${c.id}${shot ? ` (${shot.id})` : ''}` });
      else if (shot) spans.push({ from: shot.from, to: shot.to, why: `${c.id} (${shot.id})` });
    } else if (c.kind === 'range') {
      const [a, b] = [songTimeOf(c.from, kind, stretches), songTimeOf(c.to, kind, stretches)];
      if (a !== null && b !== null && b > a) spans.push({ from: a, to: b, why: c.id });
      else {
        const hit = c.shots.map(byShot).filter(s => s !== undefined);
        if (hit.length) spans.push({ from: Math.min(...hit.map(s => s.from)), to: Math.max(...hit.map(s => s.to)), why: c.id });
      }
    }
  }
  const where = kind === 'main' ? `out/${slug}/${slug}.revisions` : kind === 'preview' ? `out/${slug}/preview/${slug}.revisions` : `out/${slug}/live.revisions`;
  return spans.length ? { spans, source: `${revision.id}'s comments (${where})` } : null;
}

/** The first hook or chorus (the stretch a first look is usually judged on), else the start. */
function fallbackSpan(slug: string): Span {
  const { sections } = songTimeline(slug);
  const hook = sections.find(s => /hook|chorus|drop/i.test(s.label));
  return hook ? { from: hook.from, to: hook.to, why: `the first hook or chorus (${hook.label})`, start: true } : { from: 0, to: 0, why: 'the start', start: true };
}

/**
 * The stretches to render: each span widened or cut to `seconds` (a named range stays as named),
 * clamped to the video, merged when they overlap or are less than a second apart.
 */
export async function previewPlan(
  slug: string,
  serveUrl: string,
  targets: string[],
  opts: { seconds: number; composition?: string; fallbackOnly?: boolean },
): Promise<PreviewPlan> {
  const { fps, durationInFrames } = await compositionInfo(serveUrl, opts.composition ?? slug, slug);
  let spans: Span[];
  let source: string;
  if (targets.length) {
    spans = resolveTargets(slug, targets);
    source = 'what you named';
  } else {
    const fromRevision = opts.fallbackOnly ? null : spansFromRevision(slug);
    const fallback = fallbackSpan(slug);
    spans = fromRevision?.spans ?? [fallback];
    source = fromRevision?.source ?? `${fallback.why} (no revision yet; name a shot, section or time with --preview=…)`;
  }
  const L = opts.seconds;
  const end = durationInFrames / fps;
  // a video hardly longer than one stretch is its own preview
  if (end <= L * 1.5 && !opts.fallbackOnly) {
    return { fps, durationInFrames, stretches: [{ frames: [0, durationInFrames - 1], why: ['the whole video'] }], source: `the whole video (only ${end.toFixed(1)} s long)` };
  }
  const past = spans.filter(s => s.from >= end);
  if (past.length && targets.length) throw new Error(`--preview: ${past.map(s => s.why).join(', ')} is past the end of the video (${clock(end)})`);
  const windows = spans.filter(s => s.from < end).map(s => {
    let [a, b] = [s.from, s.to];
    if (s.whole) {
      // a named stretch, as named
    } else if (s.start) {
      b = a + L;
    } else if (b - a <= L) {
      const mid = (a + b) / 2;
      [a, b] = [mid - L / 2, mid + L / 2];
    } else {
      // a long shot or range: its first L seconds
      b = a + L;
    }
    // keep the length when it runs off either end
    if (a < 0) [a, b] = [0, Math.min(end, b - a)];
    if (b > end) [a, b] = [Math.max(0, a - (b - end)), end];
    return { a, b, why: [s.why] };
  });
  windows.sort((x, y) => x.a - y.a);
  const merged: typeof windows = [];
  for (const w of windows) {
    const last = merged.at(-1);
    if (last && w.a <= last.b + 1) {
      last.b = Math.max(last.b, w.b);
      last.why.push(...w.why);
    } else merged.push({ ...w, why: [...w.why] });
  }
  const stretches = merged.map(w => ({
    frames: [Math.max(0, Math.round(w.a * fps)), Math.min(durationInFrames - 1, Math.round(w.b * fps) - 1)] as [number, number],
    why: w.why,
  }));
  return { fps, durationInFrames, stretches: stretches.filter(s => s.frames[1] >= s.frames[0]), source };
}

export const describeStretch = (s: Stretch, fps: number) =>
  `${clock(s.frames[0] / fps)}–${clock((s.frames[1] + 1) / fps)} (frames ${s.frames[0]}-${s.frames[1]}): ${s.why.join(', ')}`;

/**
 * Joins the rendered stretches (one mp4 each, in order) into the preview and writes its map: every
 * stretch's shots and sections shifted to where it sits, a marker at each join and the stretch list.
 */
export function joinPreview(slug: string, parts: { file: string; stretch: Stretch }[], output: string, fps: number): VideoMap {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const tmp = output.replace(/\.mp4$/, '.part.mp4');
  if (parts.length === 1) fs.copyFileSync(parts[0].file, tmp);
  else {
    const list = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mm-preview-')), 'parts.txt');
    fs.writeFileSync(list, parts.map(p => `file '${p.file.replace(/'/g, "'\\''")}'`).join('\n'));
    // the picture is copied as rendered; the sound is encoded again so the joins don't click
    execFileSync(FFMPEG, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', tmp]);
    fs.rmSync(path.dirname(list), { recursive: true, force: true });
  }
  fs.renameSync(tmp, output);

  let offset = 0;
  const stretches: PreviewStretch[] = [];
  const map: VideoMap = { ...buildVideoMap(slug, output), sections: [], shots: [], markers: [] };
  const round = (n: number) => Math.round(n * 1000) / 1000;
  for (const [i, p] of parts.entries()) {
    const part = buildVideoMap(slug, p.file, { from: p.stretch.frames[0], to: p.stretch.frames[1] });
    const length = (p.stretch.frames[1] - p.stretch.frames[0] + 1) / fps;
    const shift = <T extends { from: number; to: number }>(x: T): T => ({ ...x, from: round(x.from + offset), to: round(Math.min(x.to, length) + offset) });
    map.sections.push(...part.sections.map(shift));
    map.shots.push(...part.shots.map(shift));
    const songFrom = p.stretch.frames[0] / fps;
    map.markers.push({ id: `stretch-${i + 1}`, time: round(offset), label: `${clock(songFrom)} in the song${p.stretch.why.length ? ` · ${p.stretch.why.join(', ')}` : ''}` });
    stretches.push({ from: round(offset), to: round(offset + length), songFrom: round(songFrom), songTo: round((p.stretch.frames[1] + 1) / fps), frames: p.stretch.frames, why: p.stretch.why });
    offset += length;
  }
  map.stretches = stretches;
  map.duration = round(probeMedia(output).duration || offset);
  writeJsonAtomic(mapPathFor(output), map);
  return map;
}
