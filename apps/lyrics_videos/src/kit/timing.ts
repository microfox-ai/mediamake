/**
 * Pure timing helpers over the manifest (no React), for scenes that need times other
 * than "now": the beat before a word, the bar a line starts in, a line found by its text.
 * All times are absolute song seconds.
 *
 * Find lyric lines by content (`findLine(m, 'genjutsu choke')`), never by hard-coded
 * times: then the scene keeps working when timings are re-aligned.
 */
import type { LyricLine, Manifest } from './manifest';

const lastAtOrBefore = (list: number[], t: number): number => {
  let lo = 0;
  let hi = list.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid] <= t) {
      idx = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return idx;
};

const beatTimes = (m: Manifest) => m.beats.list.map(b => b.t);
const cache = new WeakMap<Manifest, { beats: number[]; downbeats: number[] }>();
const grid = (m: Manifest) => {
  let g = cache.get(m);
  if (!g) {
    g = { beats: beatTimes(m), downbeats: m.beats.downbeats ?? [] };
    cache.set(m, g);
  }
  return g;
};

/** Continuous beat index at time t (3.5 = halfway between beats 3 and 4). */
export const beatAt = (m: Manifest, t: number): number => {
  const { beats } = grid(m);
  if (beats.length < 2) return 0;
  const i = lastAtOrBefore(beats, t);
  if (i < 0) return (t - beats[0]) / (beats[1] - beats[0]);
  if (i >= beats.length - 1) {
    const p = beats[beats.length - 1] - beats[beats.length - 2];
    return beats.length - 1 + (t - beats[beats.length - 1]) / p;
  }
  return i + (t - beats[i]) / (beats[i + 1] - beats[i]);
};

/** Time of (possibly fractional) beat index i. */
export const timeOfBeat = (m: Manifest, i: number): number => {
  const { beats } = grid(m);
  if (!beats.length) return 0;
  const k = Math.max(0, Math.min(beats.length - 2, Math.floor(i)));
  const p = (beats[k + 1] ?? beats[k] + 0.5) - beats[k];
  return beats[k] + (i - k) * p;
};

/** Continuous bar index at time t (bar k starts at downbeats[k]). */
export const barAt = (m: Manifest, t: number): number => {
  const { downbeats } = grid(m);
  if (downbeats.length < 2) return beatAt(m, t) / (m.beats.beatsPerBar ?? 4);
  const i = lastAtOrBefore(downbeats, t);
  if (i < 0) return (t - downbeats[0]) / (downbeats[1] - downbeats[0]);
  const next = downbeats[i + 1] ?? downbeats[i] + (downbeats[i] - downbeats[i - 1]);
  return i + (t - downbeats[i]) / (next - downbeats[i]);
};

/** Time of bar index k (fractional allowed). */
export const timeOfBar = (m: Manifest, k: number): number => {
  const { downbeats } = grid(m);
  if (downbeats.length < 2) return timeOfBeat(m, k * (m.beats.beatsPerBar ?? 4));
  const i = Math.max(0, Math.min(downbeats.length - 2, Math.floor(k)));
  return downbeats[i] + (k - i) * (downbeats[i + 1] - downbeats[i]);
};

/** Latest beat (or downbeat) at or before t. */
export const beatBefore = (m: Manifest, t: number, downbeat = false): number => {
  const list = downbeat ? grid(m).downbeats : grid(m).beats;
  const i = lastAtOrBefore(list, t + 0.02);
  return i >= 0 ? list[i] : 0;
};

/** Nearest beat (or downbeat) to t. */
export const nearestBeat = (m: Manifest, t: number, downbeat = false): number => {
  const list = downbeat ? grid(m).downbeats : grid(m).beats;
  const i = lastAtOrBefore(list, t);
  const a = list[i] ?? list[0] ?? t;
  const b = list[i + 1] ?? a;
  return Math.abs(t - a) <= Math.abs(b - t) ? a : b;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The nth lyric line containing `query` (case/punctuation-insensitive). Throws if absent. */
export const findLine = (m: Manifest, query: string, nth = 0): LyricLine => {
  const q = norm(query);
  const hits = m.lyrics.filter(l => norm(l.text).includes(q));
  const line = hits[nth];
  if (!line)
    throw new Error(`No lyric line #${nth} containing "${query}" (${hits.length} found)`);
  return line;
};

/** All lines containing `query`. */
export const findLines = (m: Manifest, query: string): LyricLine[] => {
  const q = norm(query);
  return m.lyrics.filter(l => norm(l.text).includes(q));
};

/** pdoom-video's cut rule: the last beat at/before the first word of the matching line. */
export const cutBefore = (m: Manifest, query: string, nth = 0, downbeat = false): number =>
  beatBefore(m, findLine(m, query, nth).words[0]?.start ?? findLine(m, query, nth).start, downbeat);

/** Onsets of a kind ('kick' | 'snare' | 'hat' | 'vocal') in [t0, t1). */
export const onsetsIn = (m: Manifest, kind: string, t0: number, t1: number): [number, number][] =>
  (m.onsets?.[kind] ?? []).filter(([t]) => t >= t0 && t < t1);

/** Envelope value at t (0..1), linear interpolation. 'rms' falls back to manifest.energy. */
export const envelopeAt = (m: Manifest, name: string, t: number): number => {
  const series = m.envelopes?.series[name];
  const values = series ?? (name === 'rms' ? m.energy.values : undefined);
  const fps = series ? m.envelopes!.fps : m.energy.rate;
  if (!values?.length) return 0;
  const x = Math.max(0, t * fps);
  const i = Math.floor(x);
  const a = values[Math.min(i, values.length - 1)];
  const b = values[Math.min(i + 1, values.length - 1)];
  return a + (b - a) * (x - i);
};

/** Decaying pulse from the most recent onset of `kind` before t: strength * e^(-since*decay). */
export const hitAt = (m: Manifest, kind: string, t: number, decay = 8): number => {
  const list = m.onsets?.[kind];
  if (!list?.length) return 0;
  let lo = 0;
  let hi = list.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid][0] <= t) {
      idx = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (idx < 0) return 0;
  const [ot, s] = list[idx];
  return s * Math.exp(-(t - ot) * decay);
};
