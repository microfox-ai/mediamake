/**
 * Turns a beatmap into the moments an atom reacts to (cuts, punches).
 * Pure, so every frame recomputes the same list.
 */

import type { Beatmap, BeatmapHit } from './types';

export const BEAT_CUE_SOURCES = [
  'accent',
  'beats',
  'downbeats',
  'kick',
  'snare',
  'hat',
  'kick+snare',
] as const;
export type BeatCueSource = (typeof BEAT_CUE_SOURCES)[number];

export interface BeatCue {
  /** Seconds in the audio file, after the lead is applied. */
  t: number;
  /** 0-1 */
  strength: number;
  /** True when the cue sits on a bar's first beat (±60 ms). */
  downbeat: boolean;
}

export interface SelectCuesOptions {
  on?: BeatCueSource;
  /** Weakest hit kept, 0-1. Default 0.3. */
  threshold?: number;
  /** Shortest gap between cues; the stronger cue of a close pair wins. Default 0.25 s. */
  minGapSec?: number;
  /** Keep every n-th cue after filtering. Default 1. */
  every?: number;
  /** When no cue comes for this long, borrow beats from the grid. 0 = never. Default 0. */
  maxGapSec?: number;
  /** Fire this many seconds before the hit, so the picture lands with it. Default 0. */
  leadSec?: number;
  /** Only cues in [from, to) seconds of the audio. */
  from?: number;
  to?: number;
}

const near = (sorted: number[], t: number, tol: number) => {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (Math.abs(sorted[mid] - t) <= tol) return true;
    if (sorted[mid] < t) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
};

const candidates = (map: Beatmap, on: BeatCueSource): BeatmapHit[] => {
  if (on === 'beats') {
    return map.beats.map((t, i) => [t, map.beatStrength?.[i] ?? 1]);
  }
  if (on === 'downbeats') {
    const strength = new Map(map.beats.map((t, i) => [t, map.beatStrength?.[i] ?? 1]));
    return map.downbeats.map((t) => [t, strength.get(t) ?? 1]);
  }
  if (on === 'kick+snare') {
    return [...(map.onsets.kick ?? []), ...(map.onsets.snare ?? [])].sort((a, b) => a[0] - b[0]);
  }
  return map.onsets[on] ?? map.onsets.accent ?? [];
};

/** Greedy non-maximum suppression: strongest first, nothing within `gap` of a kept cue. */
const thin = (hits: BeatmapHit[], gap: number): BeatmapHit[] => {
  if (gap <= 0) return hits;
  const kept: number[] = [];
  const out: BeatmapHit[] = [];
  const order = hits.map((_, i) => i).sort((a, b) => hits[b][1] - hits[a][1] || hits[a][0] - hits[b][0]);
  for (const i of order) {
    const t = hits[i][0];
    let lo = 0;
    let hi = kept.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (kept[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    if ((lo < kept.length && kept[lo] - t < gap) || (lo > 0 && t - kept[lo - 1] < gap)) continue;
    kept.splice(lo, 0, t);
    out.push(hits[i]);
  }
  return out.sort((a, b) => a[0] - b[0]);
};

export function selectCues(map: Beatmap | undefined | null, options: SelectCuesOptions = {}): BeatCue[] {
  if (!map) return [];
  const on = options.on ?? 'accent';
  const threshold = options.threshold ?? 0.3;
  const minGap = Math.max(0, options.minGapSec ?? 0.25);
  const every = Math.max(1, Math.round(options.every ?? 1));
  const maxGap = Math.max(0, options.maxGapSec ?? 0);
  const lead = options.leadSec ?? 0;
  const from = options.from ?? -Infinity;
  const to = options.to ?? Infinity;

  let hits = candidates(map, on).filter(([t, s]) => s >= threshold && t >= from && t < to);
  hits = thin(hits, minGap).filter((_, i) => i % every === 0);

  const grid: BeatmapHit[] = map.beats
    .map((t, i): BeatmapHit => [t, map.beatStrength?.[i] ?? 0])
    .filter(([t]) => t >= from && t < to);
  if (maxGap > 0 && grid.length) {
    const filled: BeatmapHit[] = [];
    // Between two cues, take the latest grid beat that keeps each gap within maxGap.
    const fill = (start: number, end: number) => {
      let last = start;
      while (end - last > maxGap) {
        let pick: BeatmapHit | null = null;
        for (const b of grid) {
          if (b[0] > last + maxGap) break;
          if (b[0] > last + minGap && b[0] < end - minGap) pick = b;
        }
        if (!pick) break;
        filled.push(pick);
        last = pick[0];
      }
    };
    let prev = Number.isFinite(from) ? from : grid[0][0] - minGap;
    for (const h of hits) {
      fill(prev, h[0]);
      filled.push(h);
      prev = h[0];
    }
    fill(prev, Number.isFinite(to) ? to : grid[grid.length - 1][0] + minGap + 1e-3);
    hits = filled;
  }

  const downbeats = map.downbeats ?? [];
  return hits.map(([t, s]) => ({
    t: t - lead,
    strength: Math.max(0, Math.min(1, s)),
    downbeat: near(downbeats, t, 0.06),
  }));
}

/** Index of the last cue at or before `t`, or -1. */
export function lastCueIndex(cues: { t: number }[], t: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].t <= t) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi;
}
