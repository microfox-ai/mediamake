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

/** Resolves a manifest path ("slug/input/x.png") or URL to something <Img>/<Audio> can load. */
export const asset = (src: string): string =>
  /^(https?:|data:|blob:)/.test(src) ? src : staticFile(src);

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
