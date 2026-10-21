/**
 * Manifest: the normalized facts about a project, written by scripts/prepare.ts.
 * Scenes read only from this, never from raw input files.
 *
 * Kept free of Remotion/React imports so the Node prepare script can import it.
 * All times are in seconds, absolute from the start of the song.
 */
import { z } from 'zod';

export const WordSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
});

export const LyricLineSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number(),
  end: z.number(),
  words: z.array(WordSchema),
});

export const SectionSchema = z.object({
  label: z.string(),
  from: z.number(),
  to: z.number(),
});

export const BeatSchema = z.object({
  t: z.number(),
  strength: z.number(),
});

export const ManifestSchema = z.object({
  version: z.literal(1),
  slug: z.string(),
  title: z.string(),
  artist: z.string().optional(),
  preparedAt: z.string(),
  audio: z.object({
    /** Static path relative to projects/ (e.g. "my-song/input/song.mp3") or an absolute URL. */
    src: z.string(),
    duration: z.number(),
  }),
  // Required: every project is built on a timed transcription of the song.
  lyrics: z.array(LyricLineSchema).min(1),
  sections: z.array(SectionSchema),
  beats: z.object({
    bpm: z.number().nullable(),
    list: z.array(BeatSchema),
  }),
  /** Loudness envelope, 0..1, sampled at `energy.rate` values per second. */
  energy: z.object({
    rate: z.number(),
    values: z.array(z.number()),
  }),
  /** Every other file in input/, by filename → static path (or URL after publishing). */
  assets: z.record(z.string(), z.string()),
  brief: z.string().optional(),
});

export type Word = z.infer<typeof WordSchema>;
export type LyricLine = z.infer<typeof LyricLineSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;

/** Optional input/project.json, the only hand-written config besides lyrics. */
export const ProjectInputSchema = z.object({
  title: z.string().optional(),
  artist: z.string().optional(),
  /** Defaults to the first audio file found in input/. */
  audio: z.string().optional(),
  /** Explicit sections; when omitted they are derived from gaps in the lyrics. */
  sections: z.array(SectionSchema).optional(),
});

export type ProjectInput = z.infer<typeof ProjectInputSchema>;
