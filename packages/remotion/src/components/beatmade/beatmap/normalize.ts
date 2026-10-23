import { z } from 'zod';
import type { Beatmap, BeatmapHit } from './types';

const numbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)) : [];

const hitList = (value: unknown): BeatmapHit[] =>
  Array.isArray(value)
    ? value
        .filter((h) => Array.isArray(h) && typeof h[0] === 'number' && Number.isFinite(h[0]))
        .map((h) => [h[0], typeof h[1] === 'number' ? h[1] : 1] as BeatmapHit)
    : [];

/**
 * Accepts a beatmap from the analyze action or a lyric-video `analysis/audio.json`
 * (`beat_strength`, `beats_per_bar`, …) and returns the atom shape, or null.
 */
export function normalizeBeatmap(raw: unknown): Beatmap | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, any>;
  const beats = numbers(r.beats);
  const onsetsRaw = r.onsets && typeof r.onsets === 'object' ? (r.onsets as Record<string, unknown>) : {};
  const onsets: Beatmap['onsets'] = {};
  for (const [kind, list] of Object.entries(onsetsRaw)) onsets[kind] = hitList(list);
  if (beats.length === 0 && Object.values(onsets).every((l) => l.length === 0)) return null;

  const pipeline = 'beat_strength' in r || 'beats_per_bar' in r;
  if (pipeline && !onsets.accent) {
    // The pipeline has no accent list: the strongest of kick and snare stand in.
    onsets.accent = [...(onsets.kick ?? []), ...(onsets.snare ?? [])].sort((a, b) => a[0] - b[0]);
  }
  const rms = r.envelopes?.rms;
  const energy =
    r.energy && Array.isArray(r.energy.values)
      ? { fps: Number(r.energy.fps) || 20, values: numbers(r.energy.values) }
      : Array.isArray(rms)
        ? { fps: Number(r.fps) || 100, values: numbers(rms) }
        : undefined;

  return {
    version: 1,
    src: typeof r.src === 'string' ? r.src : undefined,
    source: pipeline ? 'pipeline' : r.source,
    duration: Number(r.duration) || (beats.length ? beats[beats.length - 1] : 0),
    bpm: Number(r.bpm) || 0,
    beatsPerBar: Number(r.beatsPerBar ?? r.beats_per_bar) || 4,
    beats,
    beatStrength: numbers(r.beatStrength ?? r.beat_strength),
    downbeats: numbers(r.downbeats),
    onsets,
    energy,
  };
}

/** Energy 0-1 at `t` seconds, or `fallback` when the map has none. */
export function energyAt(map: Beatmap | null | undefined, t: number, fallback = 1): number {
  const e = map?.energy;
  if (!e || e.values.length === 0) return fallback;
  const x = t * e.fps;
  const i = Math.floor(x);
  if (i < 0) return e.values[0];
  if (i >= e.values.length - 1) return e.values[e.values.length - 1];
  return e.values[i] + (e.values[i + 1] - e.values[i]) * (x - i);
}

export const BeatmapInput = z
  .object({
    version: z.number().optional(),
    src: z.string().optional(),
    bpm: z.number().optional(),
    beats: z.array(z.number()).optional(),
    downbeats: z.array(z.number()).optional(),
    onsets: z.record(z.string(), z.array(z.tuple([z.number(), z.number()]))).optional(),
  })
  .loose()
  .optional()
  .meta({ title: 'Beatmap' })
  .describe(
    'Beat timing for the audio, written by the Analyze Beats action (or a lyric-video analysis/audio.json). Leave empty and the atom analyzes the audio itself while rendering.',
  );
