/*
 * The Stem Player (/stem-player) plays folders of audio from one playhead: the stems of a song
 * together, or the versions of a song one after the other (a remaster ladder, made by
 * make-music-remaster-loudness in <song folder>/remaster/v<N>/). A versions folder is reviewed too: it
 * writes the same revision files as /file-revision (mediamake.image-revision/v1, see
 * lib/file-revisions/types.ts): the final is the version the user picked, a note on a version is a
 * comment on its ID, and a note at a moment is a pinned comment with `t`. See
 * components/stem-player/README.md.
 */

export const REMASTER_SCHEMA = 'mediamake.remaster/v1';

/**
 * Formats a browser decodes, best first: lossless before lossy, and the quickest to decode first.
 * A stem that comes in several (Suno's zips hold a WAV and an MP3 of each) is listed once, in the
 * first of these it has.
 */
export const AUDIO_FORMATS = ['wav', 'flac', 'm4a', 'mp3', 'ogg', 'oga', 'opus', 'aac'];

/** What the remaster scripts know about one version of the ladder (every field but `file` optional). */
export interface RemasterVersionInfo {
  /** The audio file's name in the ladder folder. */
  file: string;
  /** A one-letter or one-digit key for switching (A, B, 9…); derived from the name when missing. */
  key?: string;
  /** Short name on its row (derived from the file name when missing). */
  label?: string;
  /** What this version is (what changed from the original). */
  note?: string;
  /** Integrated loudness, LUFS. */
  lufs?: number;
  /** True peak, dBTP. */
  truePeak?: number;
  /** Loudness range, LU. */
  lra?: number;
  /** Peak to loudness ratio, dB. */
  plr?: number;
}

/**
 * <ladder folder>/remaster.json, written by the remaster scripts (optional: the screen measures
 * loudness itself without it, and lists the folder's audio files as they are).
 */
export interface RemasterIndex {
  schema?: string;
  /** The song's title. */
  title?: string;
  /** The song folder's name. */
  song?: string;
  /** The ladder folder's absolute path on the machine that made it: Show in Finder / Copy path. */
  path?: string;
  /** The song folder's absolute path. */
  songPath?: string;
  /** The skill that made the ladder (make-music-remaster-loudness unless said otherwise; ladders made before 2026-11-24 say make-loudness-remaster). */
  workflow?: string;
  /** What this ladder tries (e.g. "clarity only, level matched at -15.4 LUFS"). */
  note?: string;
  versions: RemasterVersionInfo[];
}

/** Measured in the browser from the decoded audio. */
export interface MeasuredLevels {
  /** Integrated loudness (ITU-R BS.1770-4), LUFS. */
  lufs: number;
  /** Sample peak, dBFS (not a true peak: between-sample peaks run up to ~0.5 dB higher). */
  peak: number;
}

export interface LoopRange {
  start: number;
  end: number;
}

/** Versions further apart than this are flagged: the louder one sounds better by itself. */
export const LEVEL_WARN_LU = 1;

/** A track quieter than this is left out when levels are matched (near silence: matching to it would bury the rest). */
export const QUIET_LUFS = -50;

/** Decoded audio kept in memory, in bytes: past it the tracks used longest ago are freed. */
export const MEMORY_BUDGET = 1.5 * 1024 ** 3;
