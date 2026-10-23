/**
 * Beatmap: the timing data beat-driven atoms read.
 *
 * Same shape as the lyric-video pipeline's `analysis/audio.json` where they overlap
 * (`beats`, `beat_strength` → `beatStrength`, `downbeats`, `onsets` as [t, strength]),
 * so a beatmap made by that pipeline can be pasted in unchanged.
 * Every time is in seconds from the start of the audio file.
 */

/** [time in seconds, strength 0-1] */
export type BeatmapHit = [number, number];

export const BEATMAP_ONSET_KINDS = ['kick', 'snare', 'hat', 'accent'] as const;
export type BeatmapOnsetKind = (typeof BEATMAP_ONSET_KINDS)[number];

export interface Beatmap {
  version: 1;
  /** Audio the map was made from. Atoms re-analyze when their audio differs. */
  src?: string;
  /** browser = the analyze action, render = computed inside the atom, pipeline = lyric-video audio.json. */
  source?: 'browser' | 'render' | 'pipeline';
  duration: number;
  bpm: number;
  beatsPerBar: number;
  beats: number[];
  /** 0-1 per beat, same length as `beats`. */
  beatStrength: number[];
  downbeats: number[];
  /**
   * kick (<150 Hz attacks), snare (1.5-5 kHz attacks), hat (>7 kHz attacks),
   * accent (any strong attack of the full mix, weighted by loudness).
   * Other keys (e.g. `vocal` from the pipeline) are kept and selectable.
   */
  onsets: Partial<Record<BeatmapOnsetKind, BeatmapHit[]>> & Record<string, BeatmapHit[]>;
  /** Loudness 0-1, smoothed and normalised to its 99th percentile. */
  energy?: { fps: number; values: number[] };
}
