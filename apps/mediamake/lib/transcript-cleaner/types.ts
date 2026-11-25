/*
 * The Transcript Cleaner: a song's timed words (<audio stem>.transcript.json, the format the transcript skills write:
 * `words` with text, start, end, type, stanza, line…) reviewed by ear on /transcript-cleaner. The screen never changes
 * the transcript: what the user marks, the word times they drag and the words they delete, rewrite or move to another
 * line are saved as a revision beside it, <audio stem>.transcript.revisions/rev-NNN.json (+ .md), for Claude to apply.
 * A song the user has checked through is marked clean there too (clean.json).
 */

export const TRANSCRIPT_SUFFIX = '.transcript.json';
export const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.flac', '.aiff', '.aif', '.ogg', '.aac'];

/** One sung word: `i` is its place among the transcript's words (type "word"), the index a revision names. */
export interface TWord {
  i: number;
  text: string;
  start: number;
  end: number;
  stanza?: number;
  line?: number;
  verified?: string;
  confidence?: number;
  /** Marked for deletion in the open revision (still shown, struck through). */
  deleted?: boolean;
  /** The stanza and line the transcript has it on, when the open revision moves it to another line. */
  home?: Place;
}

/** A line's place in the transcript: its stanza, and its line in that stanza (both from 1). */
export interface Place {
  stanza?: number;
  line?: number;
}

export interface TLine {
  key: string;
  stanza?: number;
  line?: number;
  text: string;
  words: TWord[];
  start: number;
  end: number;
  /** Why the transcript lists this line for checking, when it does. */
  check?: string[];
}

export interface TranscriptFile {
  words: Array<{ text: string; start: number; end: number; type?: string; stanza?: number; line?: number; verified?: string; confidence?: number }>;
  check?: Array<{ stanza?: number; line?: number; at?: number; text?: string; why?: string[] }>;
  source?: Record<string, unknown>;
}

/** A song found in the opened folder: one transcript and the audio beside it. */
export interface SongEntry {
  id: string;
  /** The transcript's name without ".transcript.json" (the audio's stem). */
  title: string;
  /** The folder that holds it, relative to the opened folder ('' for the folder itself). */
  folder: string;
  transcript: string;
  audio: string | null;
  /** The user marked this transcript clean (clean.json in its revisions folder). */
  clean?: boolean;
}

/** <song>.transcript.revisions/clean.json: the user went through the song and its transcript is right. */
export interface CleanMark {
  schema: 'mediamake.transcript-clean/v1';
  song: string;
  transcript: string;
  /** The words the transcript had when it was marked clean. */
  words: number;
  markedAt: string;
}

export const CLEAN_FILE = 'clean.json';

export type MarkKind = 'wrong-word' | 'wrong-timing' | 'missing-word' | 'extra-word' | 'note';

export const MARK_LABELS: Record<MarkKind, string> = {
  'wrong-word': 'Wrong word',
  'wrong-timing': 'Wrong timing',
  'missing-word': 'Missing word',
  'extra-word': 'Extra word (not sung)',
  note: 'Note',
};

export interface Mark {
  id: string;
  kind: MarkKind;
  /** The second of the song the mark is about (audio time). */
  at: number;
  word?: { i: number; text: string; start: number; end: number };
  line?: { stanza?: number; line?: number; text: string };
  /** What is sung instead, what to do: the user's words. */
  note: string;
  createdAt: string;
}

/** A word moved on the timeline: the times to write into the transcript. */
export interface TimingEdit {
  i: number;
  text: string;
  from: { start: number; end: number };
  to: { start: number; end: number };
}

/** A word to take out of the transcript (not sung). */
export interface WordDeletion {
  i: number;
  text: string;
  start: number;
  end: number;
}

/** A word whose text is wrong: what it should read. */
export interface WordRewrite {
  i: number;
  from: string;
  to: string;
}

/**
 * A word that belongs to another line (stanza + line): pushed to the next or the previous line, or moved by a split or
 * a join. `from` is the place the transcript has it on, `to` the place to write.
 */
export interface LineMove {
  i: number;
  text: string;
  from: Place;
  to: Place;
  /** The line it ends up on, as it reads with the revision's changes. */
  toLine: string;
  /**
   * Why it moves: split (it starts or is on a line split off the line before), join (its line was joined to the one
   * above), renumber (its whole line keeps its words and only its number changes, after a split or a join above it).
   * None: pushed to the next or previous line on its own.
   */
  by?: 'split' | 'join' | 'renumber';
}

/**
 * A line split in two or joined to the line above, in the order the user did them. What to write is in `lineMoves`
 * (every word whose stanza or line changes, the renumbered lines too); these say what happened, in words.
 *
 * Line numbers: a split makes the words from `i` on a new line, numbered one after the line they leave, and every later
 * line of that stanza moves down one. A join gives the line's words the place of the line above, and every later line
 * of the joined line's stanza moves up one. Stanza numbers never change.
 */
export interface LineEdit {
  kind: 'split' | 'join';
  /** split: the first word of the new line. join: the first word of the line joined to the one above. */
  i: number;
  text: string;
  /** The line split or joined, as it read before. */
  line: string;
  /** Its place before. */
  at: Place;
  /** split: the new line's place. join: the place of the line above, which it joins. */
  to: Place;
  /** split: the new line's words. join: the line above, as it read before. */
  toLine: string;
  /** How many later lines of the stanza were renumbered. */
  renumbered: number;
}

export interface TranscriptRevision {
  schema: 'mediamake.transcript-revision/v1';
  id: string;
  song: string;
  folder: string;
  transcript: string;
  audio: string | null;
  /** Absolute path of the song's folder, when the screen knows it (opened by path). */
  path?: string;
  /** open: the user is reviewing; ready: the user is done; done: Claude applied it. */
  status: 'open' | 'ready' | 'done';
  /** How far ahead of the sound the words were shown while reviewing (display only). */
  lead: number;
  createdAt: string;
  updatedAt: string;
  marks: Mark[];
  timings: TimingEdit[];
  /** Words to delete, rewrite or move to another line (older revisions lack these). */
  deleted?: WordDeletion[];
  rewrites?: WordRewrite[];
  lineMoves?: LineMove[];
  /** Lines split and joined, in order (their words are in lineMoves). */
  lineEdits?: LineEdit[];
}
