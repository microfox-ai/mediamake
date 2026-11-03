import { wordKey } from './edits';
import type { LyricManifest, WordEdit } from './types';

/* The beat grid and the sung words, as the beat and word lanes draw them (editor and live review). */

export type LaneWord = {
  key: string;
  text: string;
  /** times in manifest.json */
  raw: { start: number; end: number };
  start: number;
  end: number;
  conf?: number;
  edited: boolean;
};

export const lowerBound = (list: number[], t: number) => {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

/** The words in song order with their times after the offset and the word edits, as the kit plays them. */
export function laneWords(
  manifest: LyricManifest | null,
  edits: Record<string, WordEdit> | undefined,
  offset: number,
): LaneWord[] {
  const out: LaneWord[] = [];
  for (const line of manifest?.lyrics ?? []) {
    (line.words ?? []).forEach((w, i) => {
      const key = wordKey(line.id, i);
      const e = edits?.[key];
      const start = e?.start ?? w.start + offset;
      out.push({
        key,
        text: w.text,
        raw: { start: w.start, end: w.end },
        start,
        end: Math.max(start + 0.01, e?.end ?? w.end + offset),
        conf: w.conf,
        edited: !!e,
      });
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Beat times and bar starts from the manifest's grid (bars of 4 beats when it has no downbeats). */
export function beatGrid(manifest: LyricManifest | null) {
  const beats = (manifest?.beats?.list ?? []).map(b => b.t);
  const per = manifest?.beats?.beatsPerBar ?? 4;
  const downbeats = manifest?.beats?.downbeats?.length
    ? manifest.beats.downbeats
    : beats.filter((_, i) => i % per === 0);
  return { beats, downbeats };
}

/** Grid positions between `from` and `to`: beats, or beats split in 2 or 4. */
export function subdivisions(beats: number[], from: number, to: number, parts: number): number[] {
  const out: number[] = [];
  const first = Math.max(0, lowerBound(beats, from) - 1);
  for (let i = first; i < beats.length - 1 && beats[i] <= to; i++) {
    for (let k = 0; k < parts; k++) out.push(beats[i] + ((beats[i + 1] - beats[i]) * k) / parts);
  }
  if (beats.length && beats[beats.length - 1] <= to) out.push(beats[beats.length - 1]);
  return out;
}

/** Beats between two times on the grid (fractional), for a range's length in beats. */
export function beatsBetween(beats: number[], from: number, to: number): number | null {
  if (beats.length < 2) return null;
  const at = (t: number) => {
    const i = Math.min(beats.length - 2, Math.max(0, lowerBound(beats, t) - 1));
    return i + (t - beats[i]) / (beats[i + 1] - beats[i]);
  };
  return at(to) - at(from);
}
