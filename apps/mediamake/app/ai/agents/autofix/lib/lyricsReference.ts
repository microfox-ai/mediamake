/**
 * Suno lyrics handling.
 *
 * A Suno track ships with the exact lyrics that were sung. ElevenLabs Scribe
 * does not know them, so it guesses at slang, ad-libs, names and coined words.
 * Those lyrics are therefore the ground truth for *what word was said* — while
 * the ElevenLabs output remains the ground truth for *when it was said*.
 */

import type { Transcription } from '@/app/types/transcription';
import { normalizeToken } from './wordCorrections';

/** Section markers Suno writes into lyrics, e.g. `[Verse 1]`, `[Chorus]`. */
const SECTION_TAG = /\[([^\]\n]{1,60})\]/g;
/** Production notes Suno sometimes appends, e.g. `(x2)`, `(2x)`. */
const REPEAT_NOTE = /\((?:x\s?\d+|\d+\s?x)\)/gi;

export interface ReferenceLyrics {
  /** Original text as stored. */
  raw: string;
  /** Section tags removed, blank lines collapsed — what the model reads. */
  text: string;
  /** Section names found, e.g. ['Intro', 'Verse 1', 'Chorus']. */
  sections: string[];
  /** Normalised token set used to validate proposed corrections. */
  vocabulary: Set<string>;
  wordCount: number;
}

/**
 * Pulls the Suno lyrics off a transcription document, wherever they were saved.
 */
export function getReferenceLyricsText(
  transcription: Partial<Transcription> | null | undefined,
): string | undefined {
  const step1 = transcription?.processingData?.step1;
  const step4 = transcription?.processingData?.step4;
  const candidates = [
    transcription?.sunoLyrics,
    step1?.sunoLyrics,
    step1?.lyrics,
    step4?.metadata?.sunoLyrics,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return undefined;
}

export function parseReferenceLyrics(raw: string): ReferenceLyrics {
  const sections: string[] = [];
  for (const match of raw.matchAll(SECTION_TAG)) {
    const name = match[1].trim();
    if (name && !sections.includes(name)) sections.push(name);
  }

  const text = raw
    .replace(SECTION_TAG, '\n')
    .replace(REPEAT_NOTE, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');

  const tokens = text.split(/\s+/).filter(Boolean);
  const vocabulary = new Set<string>();
  for (const token of tokens) {
    const normalized = normalizeToken(token);
    if (normalized) vocabulary.add(normalized);
  }

  return { raw, text, sections, vocabulary, wordCount: tokens.length };
}

export function getReferenceLyrics(
  transcription: Partial<Transcription> | null | undefined,
): ReferenceLyrics | undefined {
  const raw = getReferenceLyricsText(transcription);
  if (!raw) return undefined;
  const parsed = parseReferenceLyrics(raw);
  return parsed.wordCount > 0 ? parsed : undefined;
}
