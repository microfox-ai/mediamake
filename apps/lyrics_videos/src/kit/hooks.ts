/**
 * Hooks every scene can use. They all work in absolute song time, so a scene
 * doesn't need to know where its Sequence starts.
 */
import { createContext, useContext } from 'react';
import { staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Beat, LyricLine, Manifest, Section, Word } from './manifest';
import { barAt, beatAt, envelopeAt, hitAt, timeOfBar } from './timing';

export const ManifestContext = createContext<Manifest | null>(null);
export const SectionContext = createContext<Section | null>(null);

let swaps: Record<string, string> = {};

/**
 * Files swapped in mediamake's editor (edits.json `assets`: the path a project names → the file
 * that replaces it). The project video sets them before its scenes render, so `asset()` and the
 * manifest hand every scene the replacement, in Studio, stills and renders alike.
 */
export const setAssetSwaps = (next: Record<string, string> | undefined) => {
  swaps = next ?? {};
};

/**
 * Resolves a manifest path ("slug/input/x.png") or URL to something <Img>/<Audio> can load. Load
 * every image, clip and sound through it (not `staticFile()` directly), so a file swapped in the
 * editor is swapped everywhere.
 */
export const asset = (src: string): string => {
  const path = swaps[src] ?? src;
  return /^(https?:|data:|blob:)/.test(path) ? path : staticFile(path);
};

/** The manifest with swapped files in place of the ones it names (the song, `assets`). */
export const swapManifestAssets = <M extends Pick<Manifest, 'audio' | 'assets'>>(
  manifest: M,
  next: Record<string, string> | undefined,
): M => {
  if (!next || !Object.keys(next).length) return manifest;
  const swap = (path: string) => next[path] ?? path;
  return {
    ...manifest,
    audio: { ...manifest.audio, src: swap(manifest.audio.src) },
    assets: Object.fromEntries(Object.entries(manifest.assets ?? {}).map(([k, v]) => [k, swap(v)])),
  };
};

/** The key of a sung word in edits.json `words`: "<line id>:<word index>". */
export const wordKey = (lineId: string, index: number) => `${lineId}:${index}`;

/**
 * The manifest with its sung words retimed (edits.json `lyricsOffset`, then `words`). A line keeps
 * hold of its words: when its first word starts earlier or its last ends later, the line does too,
 * and a line that started or ended with its word moves with it.
 */
export const retimeManifestWords = <M extends Pick<Manifest, 'lyrics'>>(
  manifest: M,
  words: Record<string, { start?: number; end?: number }> | undefined,
  offset = 0,
): M => {
  const hasWords = !!words && Object.keys(words).length > 0;
  if (!hasWords && !offset) return manifest;
  const r = (n: number) => Math.round(n * 1000) / 1000;
  const lyrics = manifest.lyrics.map(line => {
    let changed = !!offset;
    const lineStart = line.start + offset;
    const lineEnd = line.end + offset;
    const retimed = line.words.map((w, i) => {
      const e = words?.[wordKey(line.id, i)];
      if (e) changed = true;
      const start = e?.start ?? w.start + offset;
      const end = Math.max(start + 0.01, e?.end ?? w.end + offset);
      return start === w.start && end === w.end ? w : { ...w, start: r(start), end: r(end) };
    });
    if (!changed) return line;
    const first = line.words[0];
    const last = line.words[line.words.length - 1];
    let start = lineStart;
    let end = lineEnd;
    if (first) {
      const was = first.start + offset;
      const now = retimed[0].start;
      start = Math.abs(lineStart - was) < 0.02 ? now : Math.min(lineStart, now);
    }
    if (last) {
      const was = last.end + offset;
      const now = retimed[retimed.length - 1].end;
      end = Math.abs(lineEnd - was) < 0.02 ? now : Math.max(lineEnd, now);
    }
    return { ...line, start: r(start), end: r(Math.max(end, start + 0.01)), words: retimed };
  });
  return { ...manifest, lyrics };
};

export const useManifest = (): Manifest => {
  const manifest = useContext(ManifestContext);
  if (!manifest)
    throw new Error('useManifest() must be used inside a project composition');
  return manifest;
};

/** Absolute song time in seconds, regardless of Sequence nesting. */
export const useSongTime = (): number => {
  const section = useContext(SectionContext);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (section?.from ?? 0) + frame / fps;
};

/** The current section, plus how far through it we are (0..1) and seconds remaining. */
export const useSection = () => {
  const section = useContext(SectionContext);
  if (!section) throw new Error('useSection() must be used inside a layer');
  const t = useSongTime();
  const length = Math.max(0.001, section.to - section.from);
  return {
    ...section,
    progress: Math.min(1, Math.max(0, (t - section.from) / length)),
    elapsed: t - section.from,
    remaining: section.to - t,
  };
};

export type LyricsState = {
  /** The line being sung now, or the most recent one during short gaps. */
  line: LyricLine | null;
  lineIndex: number;
  word: Word | null;
  wordIndex: number;
  /** 0..1 through the current line. */
  lineProgress: number;
  /** True while inside [line.start, line.end]. */
  isSinging: boolean;
  next: LyricLine | null;
};

/** Current lyric line and word. `holdGap` keeps the previous line on screen through short pauses. */
export const useLyrics = (holdGap = 0.6): LyricsState => {
  const { lyrics } = useManifest();
  const t = useSongTime();

  let lineIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].start <= t) lineIndex = i;
    else break;
  }
  const candidate = lineIndex >= 0 ? lyrics[lineIndex] : null;
  const isSinging = !!candidate && t <= candidate.end;
  const line =
    candidate && (isSinging || t - candidate.end <= holdGap) ? candidate : null;

  let wordIndex = -1;
  if (line) {
    for (let i = 0; i < line.words.length; i++) {
      if (line.words[i].start <= t) wordIndex = i;
      else break;
    }
  }

  return {
    line,
    lineIndex: line ? lineIndex : -1,
    word: line && wordIndex >= 0 ? line.words[wordIndex] : null,
    wordIndex,
    lineProgress: line
      ? Math.min(1, (t - line.start) / Math.max(0.001, line.end - line.start))
      : 0,
    isSinging,
    next: lyrics[lineIndex + 1] ?? null,
  };
};

export type BeatState = {
  bpm: number | null;
  last: Beat | null;
  index: number;
  /** Seconds since the last beat. */
  since: number;
  /** 1 on the beat, decaying exponentially to 0. Good for scale/glow pulses. */
  pulse: number;
};

export const useBeat = (decay = 6): BeatState => {
  const { beats } = useManifest();
  const t = useSongTime();
  const list = beats.list;

  // Binary search for the last beat at or before t.
  let lo = 0;
  let hi = list.length - 1;
  let index = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].t <= t) {
      index = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const last = index >= 0 ? list[index] : null;
  const since = last ? t - last.t : Infinity;
  return {
    bpm: beats.bpm,
    last,
    index,
    since,
    pulse: last ? Math.exp(-since * decay) * last.strength : 0,
  };
};

/** Song loudness at the current time, 0..1, linearly interpolated. */
export const useEnergy = (): number => {
  const { energy } = useManifest();
  const t = useSongTime();
  const x = t * energy.rate;
  const i = Math.floor(x);
  const a = energy.values[Math.min(i, energy.values.length - 1)] ?? 0;
  const b = energy.values[Math.min(i + 1, energy.values.length - 1)] ?? a;
  return a + (b - a) * (x - i);
};

export type BarState = {
  /** Bar index (bar k starts at manifest.beats.downbeats[k]). */
  index: number;
  /** 0..1 through the current bar. */
  progress: number;
  /** Beat within the bar, 0-based (0 = the downbeat). */
  beatInBar: number;
  /** 0..1 through the current beat. */
  beatProgress: number;
  /** 1 on the downbeat, decaying. */
  downbeatPulse: number;
};

/** Where we are in the bar. Needs the analysis grid (falls back to beats / 4 without it). */
export const useBar = (decay = 4): BarState => {
  const m = useManifest();
  const t = useSongTime();
  const bar = barAt(m, t);
  const beat = beatAt(m, t);
  const index = Math.floor(bar);
  const sinceDownbeat = t - timeOfBar(m, index);
  return {
    index,
    progress: bar - index,
    beatInBar: Math.floor(beat - beatAt(m, timeOfBar(m, index)) + 1e-6),
    beatProgress: beat - Math.floor(beat),
    downbeatPulse: sinceDownbeat >= 0 ? Math.exp(-sinceDownbeat * decay) : 0,
  };
};

/**
 * An analysis envelope at the current time, 0..1: 'rms' | 'low' | 'mid' | 'high' (mix
 * bands) or 'vocal' | 'drums' | 'bass' | 'other' (stems). 'rms' works without analysis.
 */
export const useEnvelope = (name: string): number => envelopeAt(useManifest(), name, useSongTime());

/** Decaying pulse (strength x e^(-since*decay)) from the last 'kick' | 'snare' | 'hat' | 'vocal' onset. */
export const useHit = (kind: string, decay = 8): number => hitAt(useManifest(), kind, useSongTime(), decay);
