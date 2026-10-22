/**
 * Shared spelling engine.
 *
 * Design constraint from the transcriber: timing comes from the audio. So the
 * model is never allowed to re-emit the transcript — it only proposes span
 * edits keyed by word index, and `applyWordCorrections` applies them in code.
 * Word-for-word fixes keep every timestamp; a heard word written as two words
 * (or two written as one) shares the heard words' own time. Caption lines are
 * never re-split or merged here; that is the sentence structure fixer's job.
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

const MAX_SPAN_WORDS = 4;
const MAX_REPLACEMENT_WORDS = 6;

const CorrectionsSchema = z.object({
  corrections: z
    .array(
      z.object({
        start: z.number().int().describe('Index of the first heard word being replaced'),
        end: z
          .number()
          .int()
          .describe('Index of the last heard word being replaced. Equal to start for one word.'),
        from: z
          .string()
          .describe(
            'The heard words at start..end copied exactly, space-separated (proof of alignment)',
          ),
        to: z
          .string()
          .describe(
            'The written words that replace them, space-separated. Usually one word. Empty string means delete hallucinated words.',
          ),
        reason: z.string().describe('Short reason, quoting the written lyric line if used'),
        confidence: z.number().min(0).max(1),
      }),
    )
    .describe('Only genuine corrections. Return an empty array if nothing is wrong.'),
  keptAsHeard: z
    .array(
      z.object({
        start: z.number().int().describe('Index of the first word of the passage'),
        end: z.number().int().describe('Index of the last word of the passage'),
        note: z
          .string()
          .describe(
            'One plain sentence for the user saying why it was left as heard, e.g. "Not in the written lyrics, but clearly sung as an echo."',
          ),
      }),
    )
    .describe(
      'Passages deliberately left unchanged that the user should confirm. Empty array if none.',
    ),
});

export interface SpellingReviewNote {
  start: number;
  end: number;
  /** Start of the passage, in seconds. */
  time: number;
  /** The passage as it stands in the captions. */
  heard: string;
  note: string;
}

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
  /** Language the transcription service detected or was given (e.g. "en", "hin", "ja"). */
  language?: string;
}

export interface SpellingFixResult {
  fixedCaptions: Caption[];
  changes: AppliedWordChange[];
  rejected: RejectedWordCorrection[];
  /** Passages left as heard that the user should confirm. */
  reviewNotes: SpellingReviewNote[];
  proposedCount: number;
  removedCount: number;
  usedReference: boolean;
  confidence: number;
  usage: ModelUsage[];
  summary: string;
}

const SHORT_WORD_SECONDS = 0.12;

/**
 * One line per caption, prefixed with its start time, with `#index word`
 * tokens, so the model can see line context (which matters for homophones and
 * for spotting echoes) without being able to restructure it.
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
      current = [`[${w.absoluteStart.toFixed(1)}s]`];
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
  language?: string,
): string {
  const referenceIntro = reference
    ? dedent`
        You are given the WRITTEN LYRICS the user wrote for this song. They are the
        AUTHORITY on which words were sung and how they are spelled. The
        transcription is the authority on timing and on what was actually sung.
        Your job is to make the transcription's WORDS agree with the written
        lyrics wherever the two describe the same sung passage — nothing else.
      `
    : dedent`
        No written lyrics are available, so correct only unambiguous spelling
        errors and obvious mishearings you can justify from the surrounding line.
      `;

  const removalRule = allowWordRemoval
    ? dedent`
        - You MAY delete words by returning an empty string for \`to\`, but ONLY for a
          clear hallucination: a word absent from the written lyrics that also
          duplicates its neighbour or is a nonsense token. Words marked with "!" are
          suspiciously short (<${SHORT_WORD_SECONDS}s) and are the usual suspects.
          Never delete a whole sung line.
      `
    : '- You may NOT delete words. Never return an empty `to`.';

  const method = reference
    ? dedent`
        METHOD — work line by line:
        1. Align. For each transcription line, find the written lyric line it is
           singing. Match on the words and on local context, never on position:
           choruses repeat, sections get skipped or sung twice, and the written
           lyrics may be in a different order from the audio.
        2. Matched line → make the heard words read exactly like the written words
           for that line (see WHAT TO FIX).
        3. Unwritten line → a line with no counterpart in the written lyrics. This
           is NORMAL in songs: echoes and repeats of the previous line, backing
           vocals, call-and-response, ad-lib phrases, spoken intros/outros, an extra
           repetition of the hook. It was really sung, so it stays:
           - Do NOT rewrite it into some other written line, and do NOT delete it.
           - If it echoes or repeats a nearby written line, you may correct its
             misheard words to that line's spelling (e.g. a coined word or a name).
           - Otherwise only fix a word if it is clearly a misspelling of a word that
             appears in the written lyrics.
           - Add it to \`keptAsHeard\` so the user can confirm it.
        4. Written lyric that looks wrong → if the written lyrics have an odd word,
           typo-looking spelling or broken grammar ("infallible calculate" instead of
           "calculated") and the transcription already has that same word, KEEP IT.
           The user wrote it that way on purpose. Never "improve" a word that
           already matches the written lyrics. Add it to \`keptAsHeard\` only if it
           looks like it might be a mistake in the written lyrics.
      `
    : '';

  const languages = dedent`
    LANGUAGES — the song can be in any language, or mix several (Hinglish,
    Spanglish, Taglish, K-pop or J-pop with English hooks, Arabic with French…):
    - Work in the language of each line. NEVER translate a word into another language.
    - Keep each language's own slang, dialect and informal spellings. Do not
      normalise them into the standard form of that language.
    - Accents, tone marks and vowel signs are spelling: restore them exactly as the
      written lyrics have them (é, ñ, ü, ç, Vietnamese tones, Devanagari matras,
      Arabic hamza, Hebrew/Arabic letters in their right form).
    ${
      reference
        ? dedent`
            - Script: if the written lyrics use a different script or romanisation
              from the transcription (romanised Hindi "tera" vs Devanagari "तेरा",
              kanji vs hiragana, Cyrillic vs Latin), the written lyrics win — replace
              each heard word with the written lyrics' form of that same word, word
              for word, keeping the heard word boundaries wherever you can.
          `
        : '- Keep the script the transcription is already in.'
    }
    - Languages written without spaces (Chinese, Japanese, Thai, Lao, Khmer,
      Burmese): a heard "word" may be one character or a short chunk. Keep the
      transcription's granularity and replace token for token. Copy replacement
      characters from the written lyrics exactly; in \`to\`, a space only separates
      the new tokens and is never shown.
    - Right-to-left text (Arabic, Hebrew, Urdu, Persian): words are given and
      returned in reading order; copy them as written.
  `;

  return dedent`
    You are correcting an automatic speech-to-text transcription of a song.
    The audio was transcribed by ElevenLabs Scribe, which mishears slang, coined
    words, names and ad-libs, and sometimes hears one word as two or two as one.
    ${language ? `The transcription service reported the language as "${language}"; other languages may still appear.` : ''}

    ${referenceIntro}

    ${method}

    ${languages}

    CORRECTION SHAPE — timing is protected in code, so stay inside these rules:
    - A correction replaces a run of heard words, \`start\`..\`end\` (inclusive), with
      written words in \`to\`. \`from\` must be those heard words copied exactly.
    - Most corrections are one word for one word (\`start\` = \`end\`, \`to\` is one word).
    - One heard word that is two written words: replace that one word with both
      ("alright" → "all right", "outta" → "out of" when the lyrics say so).
    - Two heard words that are one written word: replace both with one word
      ("gen jutsu" → "genjutsu", "Sharin gan" → "Sharingan").
    - A short misheard phrase may be replaced by the written phrase it sounds like
      ("the sinners" → "this in us"), at most ${MAX_SPAN_WORDS} heard words →
      ${MAX_REPLACEMENT_WORDS} written words.
    - The heard words' own time is shared among the new words, so never use a
      correction to ADD words that were not sung or to move words between lines.
    - A correction must stay inside one transcription line.
    - Do not reorder words. Do not change how words are grouped into lines.
    ${removalRule}

    WHAT TO FIX
    1. Mishearings, in any language: the transcription has a word that sounds like
       the lyric but is not it ("sinner" → "centre", "raw" → "war"). Replace with
       the lyric word.
    2. Word boundaries that disagree with the written lyrics (split or merged words).
    3. Spelling of slang and coined words: match the written lyrics exactly. If the
       lyrics write "tryna", "gon'", "'bout", "pa'", "q", "nahi", keep that spelling —
       do NOT normalise slang into the standard language.
    4. Proper nouns, brand names, place names, artist names, anime/game terms: take
       the written spelling.
    5. Homophones chosen wrongly ("their/there", "your/you're", "to/too").
    6. Numbers and units written inconsistently with the written lyrics.

    WHAT TO LEAVE ALONE
    - Ad-libs and vocal noises in any language ("yeah", "uh", "woo", "skrrt",
      "ay", "oye", "arre", "ねえ", "얍") that are absent from the written lyrics —
      singers improvise, that is not an error.
    - Repeated words and repeated lines that are genuinely sung more than once.
    - Words that already match the written lyrics, even if they look ungrammatical.
    - Punctuation and capitalisation. They are handled elsewhere and are restored
      automatically.
    - Anything you are not confident about. A missed correction is cheap; a wrong
      one corrupts the transcript.

    KEPT AS HEARD (\`keptAsHeard\`)
    List passages you deliberately left alone that the user should confirm: whole
    unwritten lines (echoes, backing vocals, extra repeats) and written-lyric words
    that look like mistakes but match what was sung. Cite the word indices of the
    passage and write one plain sentence each, e.g. "Not in the written lyrics, but
    clearly sung as an echo, so I kept it." Write notes in English. Do not list
    ordinary ad-libs like "yeah" or "uh". Return an empty array if nothing needs
    confirming.

    INPUT FORMAT
    Each transcription line is one caption, starting with its start time like
    \`[127.8s]\`. Tokens look like \`#12:word\`, where 12 is the word index you must
    cite. A \`!\` after the index (\`#12!:word\`) marks an unusually short word.

    Return an empty \`corrections\` array if nothing needs fixing.
  `;
}

async function correctChunk(
  words: FlatWord[],
  chunk: Group,
  reference: ReferenceLyrics | undefined,
  opts: SpellingFixOptions,
): Promise<ChunkResult> {
  const prompt = dedent`
    ${
      reference
        ? `WRITTEN LYRICS (authoritative wording):\n${reference.text}\n`
        : ''
    }
    TRANSCRIPTION (one caption per line):
    ${formatWordsForSpelling(words, chunk)}
    ${opts.userRequest ? `\nUSER REQUEST: ${opts.userRequest}` : ''}

    List the corrections, and the passages kept as heard, for word indices ${chunk[0]}–${chunk[1]}.
  `;

  const result = await generateObject({
    model: google(reference ? SPELLING_MODEL : SPELLING_MODEL_NO_REFERENCE),
    schema: CorrectionsSchema,
    system: buildSystemPrompt(reference, opts.allowWordRemoval === true, opts.language),
    prompt,
    maxRetries: 2,
  });

  return {
    corrections: (result.object.corrections ?? []) as WordCorrection[],
    keptAsHeard: result.object.keptAsHeard ?? [],
    usage: result.usage as unknown as ModelUsage,
  };
}

interface ChunkResult {
  corrections: WordCorrection[];
  keptAsHeard: Array<{ start: number; end: number; note: string }>;
  usage: ModelUsage | null;
}

/**
 * Resolves the model's "kept as heard" passages against the original words, so
 * the quoted text and time always come from the captions, not from the model.
 */
function resolveReviewNotes(
  words: FlatWord[],
  kept: ChunkResult['keptAsHeard'],
): SpellingReviewNote[] {
  const notes: SpellingReviewNote[] = [];
  const seenStarts = new Set<number>();
  for (const item of kept) {
    const start = Math.trunc(Number(item.start));
    const end = Math.trunc(Number(item.end ?? item.start));
    const note = typeof item.note === 'string' ? item.note.trim() : '';
    if (!note || !Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (start < 0 || end < start || end >= words.length || seenStarts.has(start)) continue;
    seenStarts.add(start);
    notes.push({
      start,
      end,
      time: words[start].absoluteStart,
      heard: words
        .slice(start, end + 1)
        .map(w => w.text)
        .join(' '),
      note,
    });
  }
  return notes.sort((a, b) => a.start - b.start);
}

const MAX_NOTES_IN_SUMMARY = 6;

function describeReviewNotes(notes: SpellingReviewNote[]): string {
  if (notes.length === 0) return '';
  const lines = notes
    .slice(0, MAX_NOTES_IN_SUMMARY)
    .map(n => `“${n.heard}” at ${n.time.toFixed(1)}s: ${n.note}`);
  if (notes.length > MAX_NOTES_IN_SUMMARY) {
    lines.push(`+${notes.length - MAX_NOTES_IN_SUMMARY} more`);
  }
  return `\nLeft as heard, please confirm:\n${lines.join('\n')}`;
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
      reviewNotes: [],
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
  const kept: ChunkResult['keptAsHeard'] = [];

  const results = await Promise.all(
    chunks.map(async (chunk): Promise<ChunkResult> => {
      try {
        return await correctChunk(words, chunk, reference, opts);
      } catch (error) {
        console.warn('[spellingFix] chunk failed, skipping window', chunk, error);
        return { corrections: [], keptAsHeard: [], usage: null };
      }
    }),
  );

  for (const result of results) {
    if (result.usage) usage.push(result.usage);
    proposed.push(...result.corrections);
    kept.push(...result.keptAsHeard);
  }

  const minConfidence = opts.minConfidence ?? 0;
  const filtered = proposed.filter(
    c => (typeof c.confidence === 'number' ? c.confidence : 1) >= minConfidence,
  );

  const applied = applyWordCorrections(captions, filtered, {
    allowRemovals: opts.allowWordRemoval === true,
    referenceVocabulary: reference?.vocabulary,
    referenceCompact: reference?.compact,
    locale: opts.language,
    maxSpanWords: MAX_SPAN_WORDS,
    maxReplacementWords: MAX_REPLACEMENT_WORDS,
    changeType: 'spelling_fix',
  });

  if (applied.rejected.length > 0) {
    console.log(
      '[spellingFix] rejected corrections:',
      applied.rejected.slice(0, 10),
      applied.rejected.length > 10 ? `(+${applied.rejected.length - 10} more)` : '',
    );
  }

  const corrected = applied.changes.filter(c => c.fixed !== '(removed)');
  const retimed = corrected.filter(
    c => c.endIndex - c.index + 1 !== c.fixed.split(' ').length,
  ).length;
  const reviewNotes = resolveReviewNotes(words, kept);

  return {
    fixedCaptions: applied.captions,
    changes: applied.changes,
    rejected: applied.rejected,
    reviewNotes,
    proposedCount: proposed.length,
    removedCount: applied.removedCount,
    usedReference: Boolean(reference),
    confidence: reference ? 0.95 : 0.85,
    usage,
    summary: [
      `Fixed ${corrected.length} word${corrected.length !== 1 ? 's' : ''}`,
      applied.removedCount > 0
        ? `, removed ${applied.removedCount} hallucinated word${applied.removedCount !== 1 ? 's' : ''}`
        : '',
      reference ? ' against the written lyrics' : '',
      applied.rejected.length > 0
        ? ` (${applied.rejected.length} unsafe suggestion${applied.rejected.length !== 1 ? 's' : ''} rejected)`
        : '',
      retimed > 0
        ? `. Timings kept; ${retimed} split or merged word${retimed !== 1 ? 's' : ''} share their original time.`
        : '. Timings unchanged.',
      describeReviewNotes(reviewNotes),
    ].join(''),
  };
}
