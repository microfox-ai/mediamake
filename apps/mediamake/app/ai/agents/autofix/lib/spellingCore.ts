/**
 * Shared spelling engine.
 *
 * Design constraint from the transcriber: timestamps must survive untouched.
 * So the model is never allowed to re-emit the transcript — it only proposes
 * single-word edits keyed by word index, and `applyWordCorrections` applies
 * them in code. A line is never re-split, merged or re-timed here; that is the
 * sentence structure fixer's job.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';
import { z } from 'zod';
import type { Caption } from '@/app/types/transcription';
import {
  chunkWords,
  flattenWords,
  type FlatWord,
  type Group,
  type ModelUsage,
} from './segmentation';
import {
  applyWordCorrections,
  type AppliedWordChange,
  type RejectedWordCorrection,
  type WordCorrection,
} from './wordCorrections';
import { parseReferenceLyrics, type ReferenceLyrics } from './lyricsReference';

const SPELLING_MODEL = 'gemini-2.5-pro';
const SPELLING_MODEL_NO_REFERENCE = 'gemini-2.5-flash';

const CorrectionsSchema = z.object({
  corrections: z
    .array(
      z.object({
        index: z.number().int().describe('Index of the word being corrected'),
        from: z
          .string()
          .describe('The word exactly as it appears at that index (proof of alignment)'),
        to: z
          .string()
          .describe(
            'The corrected single word. Empty string means delete a hallucinated word.',
          ),
        reason: z.string().describe('Short reason, citing the reference lyrics if used'),
        confidence: z.number().min(0).max(1),
      }),
    )
    .describe('Only genuine corrections. Return an empty array if nothing is wrong.'),
});

export interface SpellingFixOptions {
  /** Suno lyrics (raw). When present, they are the authority on wording. */
  referenceLyrics?: string | ReferenceLyrics;
  /** Allow deletion of hallucinated words. */
  allowWordRemoval?: boolean;
  /** Ignore the reference lyrics even if present. */
  useReference?: boolean;
  userRequest?: string;
  /** Reject corrections below this confidence. */
  minConfidence?: number;
}

export interface SpellingFixResult {
  fixedCaptions: Caption[];
  changes: AppliedWordChange[];
  rejected: RejectedWordCorrection[];
  proposedCount: number;
  removedCount: number;
  usedReference: boolean;
  confidence: number;
  usage: ModelUsage[];
  summary: string;
}

const SHORT_WORD_SECONDS = 0.12;

/**
 * One line per caption with `#index word` tokens, so the model can see line
 * context (which matters for homophones) without being able to restructure it.
 */
function formatWordsForSpelling(words: FlatWord[], range: Group): string {
  const [s, e] = range;
  const lines: string[] = [];
  let current: string[] = [];
  let currentCaption = -1;

  for (let i = s; i <= e; i++) {
    const w = words[i];
    if (w.sourceCaptionIndex !== currentCaption) {
      if (current.length) lines.push(current.join(' '));
      current = [];
      currentCaption = w.sourceCaptionIndex;
    }
    const short = w.duration < SHORT_WORD_SECONDS ? '!' : '';
    current.push(`#${w.index}${short}:${w.text}`);
  }
  if (current.length) lines.push(current.join(' '));

  return lines.join('\n');
}

function buildSystemPrompt(
  reference: ReferenceLyrics | undefined,
  allowWordRemoval: boolean,
): string {
  return dedent`
    You are correcting an automatic speech-to-text transcription of a song.
    The audio was transcribed by ElevenLabs Scribe, which mishears slang, coined
    words, names and ad-libs.

    ${
      reference
        ? dedent`
          You are given the WRITTEN LYRICS the song was generated from. Those lyrics
          are the AUTHORITY on which word was sung and how it is spelled. The
          transcription is the authority on timing. Your job is to make the
          transcription's WORDS agree with the written lyrics — nothing else.
        `
        : dedent`
          No reference lyrics are available, so correct only unambiguous spelling
          errors and obvious mishearings you can justify from the surrounding line.
        `
    }

    ABSOLUTE CONSTRAINTS — these protect word-level timestamps:
    - You may only replace ONE word with ONE word. Never return a replacement
      containing a space.
    - You may NOT merge words, split words, reorder words, or add new words.
    - You may NOT change how words are grouped into lines. Line breaks are not
      your concern, even if they look wrong.
    - Every correction must reference the word index you were given, and \`from\`
      must be that word copied exactly.
    ${
      allowWordRemoval
        ? `- You MAY delete a word by returning an empty string for \`to\`, but ONLY for a
      clear hallucination: a word absent from the reference lyrics that also
      duplicates its neighbour or is a nonsense token. Words marked with "!" are
      suspiciously short (<${SHORT_WORD_SECONDS}s) and are the usual suspects.`
        : '- You may NOT delete words. Never return an empty `to`.'
    }

    WHAT TO FIX
    1. Mishearings: the transcription has a word that sounds like the lyric but is
       not it ("sinner" → "centre", "raw" → "war"). Replace with the lyric word.
    2. Spelling of slang and coined words: match the reference exactly. If the
       lyrics write "tryna", "gon'", "'bout", "finna", "ridin'", keep that spelling —
       do NOT normalise slang into standard English.
    3. Proper nouns, brand names, place names, artist names: take the reference spelling.
    4. Homophones chosen wrongly ("their/there", "your/you're", "to/too").
    5. Numbers and units written inconsistently with the reference.

    WHAT TO LEAVE ALONE
    - Ad-libs and vocal noises ("yeah", "uh", "woo", "skrrt") that are absent from
      the written lyrics — singers improvise, that is not an error.
    - Repeated words that are genuinely sung twice.
    - Punctuation and capitalisation. They are handled elsewhere and are restored
      automatically.
    - Anything you are not confident about. A missed correction is cheap; a wrong
      one corrupts the transcript.

    ALIGNMENT NOTE
    The reference lyrics and the transcription may drift apart (repeated choruses,
    skipped sections, extra ad-libs). Match on local context, not on position.
    If you cannot confidently align a passage, return no corrections for it.

    INPUT FORMAT
    Each transcription line is one caption. Tokens look like \`#12:word\`, where 12
    is the word index you must cite. A \`!\` after the index (\`#12!:word\`) marks an
    unusually short word.

    Return an empty \`corrections\` array if nothing needs fixing.
  `;
}

async function correctChunk(
  words: FlatWord[],
  chunk: Group,
  reference: ReferenceLyrics | undefined,
  opts: SpellingFixOptions,
): Promise<{ corrections: WordCorrection[]; usage: ModelUsage | null }> {
  const prompt = dedent`
    ${
      reference
        ? `WRITTEN LYRICS (authoritative wording):\n${reference.text}\n`
        : ''
    }
    TRANSCRIPTION (one caption per line):
    ${formatWordsForSpelling(words, chunk)}
    ${opts.userRequest ? `\nUSER REQUEST: ${opts.userRequest}` : ''}

    List the single-word corrections for word indices ${chunk[0]}–${chunk[1]}.
  `;

  const result = await generateObject({
    model: google(reference ? SPELLING_MODEL : SPELLING_MODEL_NO_REFERENCE),
    schema: CorrectionsSchema,
    system: buildSystemPrompt(reference, opts.allowWordRemoval === true),
    prompt,
    maxRetries: 2,
  });

  return {
    corrections: (result.object.corrections ?? []) as WordCorrection[],
    usage: result.usage as unknown as ModelUsage,
  };
}

export async function runSpellingFix(
  captions: Caption[],
  opts: SpellingFixOptions = {},
): Promise<SpellingFixResult> {
  const words = flattenWords(captions);

  const reference =
    opts.useReference === false
      ? undefined
      : typeof opts.referenceLyrics === 'string'
        ? parseReferenceLyrics(opts.referenceLyrics)
        : opts.referenceLyrics;

  if (words.length === 0) {
    return {
      fixedCaptions: captions as Caption[],
      changes: [],
      rejected: [],
      proposedCount: 0,
      removedCount: 0,
      usedReference: false,
      confidence: 0,
      usage: [],
      summary: 'No words to correct',
    };
  }

  const chunks = chunkWords(words, 300);
  const usage: ModelUsage[] = [];
  const proposed: WordCorrection[] = [];

  const results = await Promise.all(
    chunks.map(async chunk => {
      try {
        return await correctChunk(words, chunk, reference, opts);
      } catch (error) {
        console.warn('[spellingFix] chunk failed, skipping window', chunk, error);
        return { corrections: [] as WordCorrection[], usage: null };
      }
    }),
  );

  for (const result of results) {
    if (result.usage) usage.push(result.usage);
    proposed.push(...result.corrections);
  }

  const minConfidence = opts.minConfidence ?? 0;
  const filtered = proposed.filter(
    c => (typeof c.confidence === 'number' ? c.confidence : 1) >= minConfidence,
  );

  const applied = applyWordCorrections(captions, filtered, {
    allowRemovals: opts.allowWordRemoval === true,
    referenceVocabulary: reference?.vocabulary,
    changeType: 'spelling_fix',
  });

  if (applied.rejected.length > 0) {
    console.log(
      '[spellingFix] rejected corrections:',
      applied.rejected.slice(0, 10),
      applied.rejected.length > 10 ? `(+${applied.rejected.length - 10} more)` : '',
    );
  }

  const replaced = applied.changes.length - applied.removedCount;

  return {
    fixedCaptions: applied.captions,
    changes: applied.changes,
    rejected: applied.rejected,
    proposedCount: proposed.length,
    removedCount: applied.removedCount,
    usedReference: Boolean(reference),
    confidence: reference ? 0.95 : 0.85,
    usage,
    summary: [
      `Fixed ${replaced} word${replaced !== 1 ? 's' : ''}`,
      applied.removedCount > 0
        ? `, removed ${applied.removedCount} hallucinated word${applied.removedCount !== 1 ? 's' : ''}`
        : '',
      reference ? ' using the Suno lyrics as reference' : '',
      applied.rejected.length > 0
        ? ` (${applied.rejected.length} unsafe suggestion${applied.rejected.length !== 1 ? 's' : ''} rejected)`
        : '',
      '. Timestamps unchanged.',
    ].join(''),
  };
}
