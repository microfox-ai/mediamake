/**
 * prepare: projects/<slug>/input/  →  projects/<slug>/manifest.json
 *
 * Requires input/<song>.(mp3|wav|...) and input/lyrics.json (timed transcription).
 *
 * Deterministic analysis, so scene timing never relies on guesses:
 *   - audio duration (ffprobe)
 *   - beats, bpm and a loudness envelope (ffmpeg decode + onset detection)
 *   - lyrics normalized to absolute-second lines with word timings
 *   - sections from input/project.json, or derived from gaps and repeats in the lyrics
 *
 * Usage: npm run prepare-project -w lyrics_videos -- <slug>
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { z } from 'zod';
import {
  ManifestSchema,
  ProjectInputSchema,
  type Beat,
  type LyricLine,
  type Manifest,
  type Section,
} from '../src/kit/manifest.ts';

const PROJECTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../projects',
);
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i;
const RESERVED = new Set(['lyrics.json', 'project.json', 'brief.md']);
const SAMPLE_RATE = 22050;
const HOP = 512; // ≈23ms analysis window
const ENERGY_RATE = 20; // envelope values per second

// ---------- lyrics ----------

// Accepts the caption format used elsewhere in mediamake ({ text, absoluteStart, words[] }),
// simpler { text, start, end } lines, or either wrapped in { lines } / { captions }.
const RawWordSchema = z.object({
  text: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
  absoluteStart: z.number().optional(),
  absoluteEnd: z.number().optional(),
});
const RawLineSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
  absoluteStart: z.number().optional(),
  absoluteEnd: z.number().optional(),
  words: z.array(RawWordSchema).optional(),
});
const RawLyricsSchema = z.union([
  z.array(RawLineSchema),
  z.object({ lines: z.array(RawLineSchema) }).transform(v => v.lines),
  z.object({ captions: z.array(RawLineSchema) }).transform(v => v.captions),
]);

const round = (n: number, digits = 3) =>
  Math.round(n * 10 ** digits) / 10 ** digits;

const normalizeLyrics = (
  raw: unknown,
  duration: number,
  warn: (m: string) => void,
): LyricLine[] => {
  const lines = RawLyricsSchema.parse(raw);
  const starts = lines.map(l => l.absoluteStart ?? l.start);
  if (starts.some(s => s === undefined)) {
    throw new Error(
      'lyrics.json: every line needs a start (or absoluteStart) in seconds',
    );
  }

  const out = lines.map((l, i): LyricLine => {
    const start = starts[i]!;
    const nextStart = starts[i + 1];
    const end =
      l.absoluteEnd ??
      l.end ??
      (nextStart !== undefined
        ? nextStart - 0.1
        : Math.min(duration, start + 4));
    const text = l.text.trim();

    let words: LyricLine['words'];
    if (l.words?.length) {
      // Caption-format words carry absoluteStart; plain words are taken as absolute already.
      words = l.words.map(w => ({
        text: w.text,
        start: round(w.absoluteStart ?? w.start ?? start),
        end: round(w.absoluteEnd ?? w.end ?? end),
      }));
    } else {
      // No word timings: spread the line across its words, weighted by length.
      const tokens = text.split(/\s+/).filter(Boolean);
      const total = tokens.reduce((n, w) => n + w.length + 1, 0);
      let cursor = start;
      words = tokens.map(w => {
        const d = ((w.length + 1) / total) * (end - start);
        const word = { text: w, start: round(cursor), end: round(cursor + d) };
        cursor += d;
        return word;
      });
    }

    if (end > duration + 0.5)
      warn(
        `lyric line ${i} ends at ${end.toFixed(2)}s, after the audio (${duration.toFixed(2)}s)`,
      );
    if (nextStart !== undefined && end > nextStart + 0.05)
      warn(`lyric line ${i} overlaps the next line`);
    return {
      id: l.id ?? `line-${i}`,
      text,
      start: round(start),
      end: round(end),
      words,
    };
  });
  return out.sort((a, b) => a.start - b.start);
};

// ---------- sections ----------

const NEW_GROUP_GAP = 2.5; // seconds of silence that starts a new lyric group
const BREAK_GAP = 6; // a longer gap becomes its own "break" section
const MIN_EDGE = 0.5; // shortest intro/outro worth its own section

const normalizeText = (lines: LyricLine[]) =>
  lines.map(l => l.text.toLowerCase().replace(/[^a-z0-9 ]/g, '')).join(' ');

const deriveSections = (lyrics: LyricLine[], duration: number): Section[] => {
  const groups: LyricLine[][] = [[lyrics[0]]];
  for (let i = 1; i < lyrics.length; i++) {
    if (lyrics[i].start - lyrics[i - 1].end > NEW_GROUP_GAP) groups.push([]);
    groups[groups.length - 1].push(lyrics[i]);
  }

  // Groups whose text repeats elsewhere are almost always the chorus.
  const texts = groups.map(normalizeText);
  const repeated = texts.map((t, i) =>
    texts.some((o, j) => j !== i && o === t),
  );
  const counters: Record<string, number> = {};
  const nextLabel = (kind: string) =>
    `${kind}-${(counters[kind] = (counters[kind] ?? 0) + 1)}`;

  const sections: Section[] = [];
  let cursor = 0;
  const firstStart = groups[0][0].start;
  if (firstStart >= MIN_EDGE) {
    sections.push({ label: 'intro', from: 0, to: firstStart });
    cursor = firstStart;
  }

  groups.forEach((g, i) => {
    const groupEnd = g[g.length - 1].end;
    const nextStart = groups[i + 1]?.[0].start;
    const label = nextLabel(repeated[i] ? 'chorus' : 'verse');
    if (nextStart !== undefined && nextStart - groupEnd > BREAK_GAP) {
      sections.push({ label, from: cursor, to: groupEnd });
      sections.push({
        label: nextLabel('break'),
        from: groupEnd,
        to: nextStart,
      });
      cursor = nextStart;
    } else if (nextStart !== undefined) {
      sections.push({ label, from: cursor, to: nextStart });
      cursor = nextStart;
    } else if (duration - groupEnd >= MIN_EDGE) {
      sections.push({ label, from: cursor, to: groupEnd });
      sections.push({ label: 'outro', from: groupEnd, to: duration });
    } else {
      sections.push({ label, from: cursor, to: duration });
    }
  });

  return sections.map(s => ({ ...s, from: round(s.from), to: round(s.to) }));
};

// ---------- audio ----------

const probeDuration = (file: string): number => {
  const out = execFileSync(ffprobe.path, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    file,
  ]);
  const duration = parseFloat(out.toString().trim());
  if (!Number.isFinite(duration))
    throw new Error(`ffprobe could not read a duration from ${file}`);
  return duration;
};

const decodeMono = (file: string): Float32Array => {
  const buf = execFileSync(
    ffmpeg.path,
    [
      '-v',
      'error',
      '-i',
      file,
      '-ac',
      '1',
      '-ar',
      String(SAMPLE_RATE),
      '-f',
      'f32le',
      '-',
    ],
    { maxBuffer: 1024 * 1024 * 1024 },
  );
  return new Float32Array(
    buf.buffer,
    buf.byteOffset,
    Math.floor(buf.byteLength / 4),
  );
};

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};

const analyzeAudio = (samples: Float32Array) => {
  const hopSeconds = HOP / SAMPLE_RATE;
  const rms: number[] = [];
  for (let i = 0; i + HOP <= samples.length; i += HOP) {
    let sum = 0;
    for (let j = i; j < i + HOP; j++) sum += samples[j] * samples[j];
    rms.push(Math.sqrt(sum / HOP));
  }

  // Onset strength: rise in energy over the recent past.
  const onset = rms.map((v, i) => {
    const prev = (rms[i - 1] ?? v) + (rms[i - 2] ?? v) + (rms[i - 3] ?? v);
    return Math.max(0, v - prev / 3);
  });

  // Peak picking against a moving average, with a minimum gap between beats.
  const avgWindow = Math.round(1 / hopSeconds);
  const peakRadius = Math.round(0.1 / hopSeconds);
  const minGap = 0.2;
  const raw: Beat[] = [];
  for (let i = 0; i < onset.length; i++) {
    const lo = Math.max(0, i - avgWindow);
    const hi = Math.min(onset.length, i + avgWindow);
    let mean = 0;
    for (let j = lo; j < hi; j++) mean += onset[j];
    mean /= hi - lo;
    let isPeak = onset[i] > mean * 1.5 + 1e-4;
    for (
      let j = Math.max(0, i - peakRadius);
      isPeak && j <= Math.min(onset.length - 1, i + peakRadius);
      j++
    ) {
      if (onset[j] > onset[i]) isPeak = false;
    }
    const t = i * hopSeconds;
    if (isPeak && (!raw.length || t - raw[raw.length - 1].t >= minGap))
      raw.push({ t, strength: onset[i] });
  }
  const norm =
    percentile(
      raw.map(b => b.strength),
      0.95,
    ) || 1;
  const beats = raw.map(b => ({
    t: round(b.t),
    strength: round(Math.min(1, b.strength / norm), 2),
  }));

  // Tempo: autocorrelation of the onset envelope over 70–180 bpm.
  const autocorr = (lag: number) => {
    let acc = 0;
    for (let i = lag; i < onset.length; i++) acc += onset[i] * onset[i - lag];
    return acc;
  };
  let total = 0;
  for (const v of onset) total += v * v;
  let bestLag = 0;
  let best = 0;
  for (
    let lag = Math.round(60 / 180 / hopSeconds);
    lag <= Math.round(60 / 70 / hopSeconds);
    lag++
  ) {
    const acc = autocorr(lag);
    if (acc > best) {
      best = acc;
      bestLag = lag;
    }
  }
  let bpm: number | null = null;
  if (total > 0 && best / total >= 0.1) {
    // Parabolic interpolation around the peak: the hop size alone quantizes tempo by ~5 bpm.
    const [a, b, c] = [autocorr(bestLag - 1), best, autocorr(bestLag + 1)];
    const denom = a - 2 * b + c;
    const offset =
      denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0;
    bpm = 60 / ((bestLag + offset) * hopSeconds);
  }

  // Loudness envelope at ENERGY_RATE values per second, normalized to 0..1.
  const perBucket = Math.max(1, Math.round(1 / ENERGY_RATE / hopSeconds));
  const buckets: number[] = [];
  for (let i = 0; i < rms.length; i += perBucket) {
    const slice = rms.slice(i, i + perBucket);
    buckets.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  const peak = percentile(buckets, 0.98) || 1;
  const energy = {
    rate: 1 / (perBucket * hopSeconds),
    values: buckets.map(v => round(Math.min(1, v / peak), 3)),
  };

  return { beats: { bpm: bpm ? round(bpm, 1) : null, list: beats }, energy };
};

// ---------- main ----------

const listFiles = (dir: string, base = dir): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('.')) return [];
    const full = path.join(dir, e.name);
    return e.isDirectory()
      ? listFiles(full, base)
      : [path.relative(base, full)];
  });

const titleCase = (slug: string) =>
  slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Compact numeric arrays so the manifest stays readable. */
const stringify = (value: unknown) =>
  JSON.stringify(value, null, 2).replace(
    /\[\s+(-?[\d.]+(?:,\s+-?[\d.]+)*)\s+\]/g,
    (_, nums: string) => `[${nums.split(/,\s+/).join(', ')}]`,
  );

const main = () => {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: npm run prepare-project -w lyrics_videos -- <slug>');
    process.exit(1);
  }
  const projectDir = path.join(PROJECTS_DIR, slug);
  const inputDir = path.join(projectDir, 'input');
  if (!fs.existsSync(inputDir))
    throw new Error(`Missing ${path.relative(process.cwd(), inputDir)}/`);

  const warnings: string[] = [];
  const warn = (m: string) => warnings.push(m);
  const files = listFiles(inputDir);
  const readJson = (name: string) =>
    files.includes(name)
      ? JSON.parse(fs.readFileSync(path.join(inputDir, name), 'utf8'))
      : undefined;

  // Lyric videos are built on the song and its timed transcription; both are required.
  const projectInput = ProjectInputSchema.parse(readJson('project.json') ?? {});
  const audioFile = projectInput.audio ?? files.find(f => AUDIO_EXT.test(f));
  if (!audioFile || !files.includes(audioFile))
    throw new Error(
      'No song found in input/ (mp3, wav, m4a, ...). A song is required.',
    );
  const rawLyrics = readJson('lyrics.json');
  if (rawLyrics === undefined)
    throw new Error(
      'No input/lyrics.json. A timed transcription of the song is required (transcribe it first).',
    );
  const audioPath = path.join(inputDir, audioFile);

  const duration = probeDuration(audioPath);
  const { beats, energy } = analyzeAudio(decodeMono(audioPath));

  const lyrics = normalizeLyrics(rawLyrics, duration, warn);
  if (!lyrics.length) throw new Error('input/lyrics.json has no lines.');

  const sections = projectInput.sections ?? deriveSections(lyrics, duration);
  sections.forEach((s, i) => {
    if (s.to <= s.from) warn(`section "${s.label}" has no length`);
    if (i > 0 && Math.abs(s.from - sections[i - 1].to) > 0.05)
      warn(`gap or overlap before section "${s.label}"`);
  });

  const toStatic = (f: string) =>
    `${slug}/input/${f.split(path.sep).join('/')}`;
  const assets = Object.fromEntries(
    files
      .filter(f => f !== audioFile && !RESERVED.has(f))
      .map(f => [f.split(path.sep).join('/'), toStatic(f)]),
  );
  const briefPath = path.join(inputDir, 'brief.md');

  const manifest: Manifest = ManifestSchema.parse({
    version: 1,
    slug,
    title: projectInput.title ?? titleCase(slug),
    artist: projectInput.artist,
    preparedAt: new Date().toISOString(),
    audio: { src: toStatic(audioFile), duration: round(duration) },
    lyrics,
    sections,
    beats,
    energy,
    assets,
    brief: fs.existsSync(briefPath)
      ? fs.readFileSync(briefPath, 'utf8').trim()
      : undefined,
  });

  fs.writeFileSync(
    path.join(projectDir, 'manifest.json'),
    stringify(manifest) + '\n',
  );

  console.log(`✔ ${slug}/manifest.json`);
  console.log(`  audio     ${audioFile}  ${duration.toFixed(2)}s`);
  console.log(
    `  beats     ${beats.list.length}${beats.bpm ? `  ~${beats.bpm} bpm` : ''}`,
  );
  console.log(`  lyrics    ${lyrics.length} lines`);
  console.log(`  assets    ${Object.keys(assets).length}`);
  console.log(
    `  sections  ${projectInput.sections ? '(from project.json)' : '(derived)'}`,
  );
  for (const s of sections)
    console.log(
      `            ${s.label.padEnd(12)} ${s.from.toFixed(2)} → ${s.to.toFixed(2)}`,
    );
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
};

main();
