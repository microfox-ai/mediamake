/**
 * Shared sentence-structure engine.
 *
 * Used by both the `/autofix/sentence-structure` agent and the transcriber
 * worker so there is exactly one implementation of the segmentation logic.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';
import { z } from 'zod';
import type { Caption } from '@/app/types/transcription';
import {
  DEFAULT_STRUCTURE_PROFILE_ID,
  resolveStructureParams,
  type SplitDensity,
  type StructureProfile,
  type StructureProfileParams,
} from './structureProfiles';
import {
  buildCaptions,
  chunkWords,
  deterministicGroups,
  detectSegmentationChanges,
  describeCurrentLines,
  enforceProfile,
  flattenWords,
  formatWordsForPrompt,
  groupsFromLineStarts,
  measureWordsPerSecond,
  summariseSegmentation,
  type CaptionChange,
  type FlatWord,
  type Group,
  type ModelUsage,
  type SegmentationStats,
} from './segmentation';

const STRUCTURE_MODEL = 'gemini-2.5-pro';

const LineStartsSchema = z.object({
  lineStarts: z
    .array(z.number().int())
    .describe(
      'Ascending word indices. Each index is the FIRST word of a caption line.',
    ),
});

export interface SentenceStructureOptions {
  structureStyle?: string;
  splitDensity?: SplitDensity;
  maxCharsPerLine?: number;
  maxWordsPerLine?: number;
  userRequest?: string;
  /** Extra context (song title, lyrics) that helps the model read the delivery. */
  referenceLyrics?: string;
  /** Skip the model entirely and segment from timings only. */
  deterministicOnly?: boolean;
}

export interface SentenceStructureResult {
  fixedCaptions: Caption[];
  changes: CaptionChange[];
  confidence: number;
  profile: StructureProfile;
  params: StructureProfileParams;
  stats: SegmentationStats;
  wordsPerSecond: number;
  usedModel: boolean;
  usage: ModelUsage[];
  summary: string;
}

function buildSystemPrompt(
  profile: StructureProfile,
  params: StructureProfileParams,
  wordsPerSecond: number,
): string {
  return dedent`
    You are a caption segmentation engine. You decide where caption lines BREAK.
    You never rewrite, reorder, add or delete words — you only choose break points.

    DELIVERY STYLE: ${profile.label}
    ${profile.guidance}

    MEASURED DELIVERY: ${wordsPerSecond.toFixed(2)} words/second.

    LINE BUDGET FOR THIS STYLE
    - Aim for ~${params.targetChars} characters and ~${params.targetWords} words per line.
    - Never exceed ${params.maxChars} characters or ${params.maxWords} words on a line.
    - A line should stay on screen roughly ${params.minLineDuration.toFixed(1)}s–${params.maxLineDuration.toFixed(1)}s.
    - Any gap of ${params.hardGapSeconds.toFixed(2)}s or more MUST end a line.
    - A gap of ${params.softGapSeconds.toFixed(2)}s or more is a strong break candidate.
    ${
      params.keepRepeatsWhole
        ? '- Repeated hook/chant phrases must be broken IDENTICALLY every time they recur.'
        : ''
    }

    HOW TO READ THE INPUT
    Each row is: INDEX <tab> WORD <tab> start-end <tab> gap:SECONDS <tab> markers
    - "gap" is the silence AFTER that word. This is your single strongest signal.
    - <pause> / <<PAUSE>> mark noticeable and long silences.
    - <held> marks a sustained/held word (common in singing).

    RULES
    1. Break on the delivery, not on written grammar — the audio timing wins.
    2. Never break between two words with almost no gap unless the line is at its limit.
    3. Never leave a single dangling word on a line unless it is followed by a long silence.
    4. Keep a rhyme word, a name, or a number at the END of its line, not orphaned onto the next.
    5. Prefer breaking BEFORE a conjunction or discourse marker, never immediately after one.
    6. Every word must belong to exactly one line — your indices must cover the whole range.

    OUTPUT
    Return only \`lineStarts\`: the ascending list of word indices that begin a line.
    The first index in the given range must always be included.
  `;
}

async function segmentChunkWithModel(
  words: FlatWord[],
  chunk: Group,
  profile: StructureProfile,
  params: StructureProfileParams,
  wordsPerSecond: number,
  opts: SentenceStructureOptions,
): Promise<{ lineStarts: number[]; usage: ModelUsage | null }> {
  const [s, e] = chunk;

  const prompt = dedent`
    WORDS (index, text, timing, gap after):
    ${formatWordsForPrompt(words, chunk)}

    CURRENT LINE BREAKS (the segmentation you are improving; the number is the first word index):
    ${describeCurrentLines(words.slice(s, e + 1))}
    ${
      opts.referenceLyrics
        ? `\nWRITTEN LYRICS / SCRIPT (structure reference only — do not change any word):\n${opts.referenceLyrics}`
        : ''
    }
    ${opts.userRequest ? `\nUSER REQUEST: ${opts.userRequest}` : ''}

    Return the word indices between ${s} and ${e} that should START a caption line.
    Index ${s} must be the first entry.
  `;

  const result = await generateObject({
    model: google(STRUCTURE_MODEL),
    schema: LineStartsSchema,
    system: buildSystemPrompt(profile, params, wordsPerSecond),
    prompt,
    maxRetries: 2,
  });

  const lineStarts = (result.object.lineStarts ?? [])
    .map(n => Math.trunc(Number(n)))
    .filter(n => Number.isFinite(n) && n >= s && n <= e);

  return { lineStarts, usage: result.usage as unknown as ModelUsage };
}

export async function runSentenceStructureFix(
  captions: Caption[],
  opts: SentenceStructureOptions = {},
): Promise<SentenceStructureResult> {
  const words = flattenWords(captions);

  if (words.length === 0) {
    const { profile, params } = resolveStructureParams(opts.structureStyle);
    return {
      fixedCaptions: [],
      changes: [],
      confidence: 0,
      profile,
      params,
      stats: summariseSegmentation([], [], params),
      wordsPerSecond: 0,
      usedModel: false,
      usage: [],
      summary: 'No words to segment',
    };
  }

  const wordsPerSecond = measureWordsPerSecond(words);
  const { profile, params } = resolveStructureParams(opts.structureStyle, {
    density: opts.splitDensity,
    wordsPerSecond,
    maxCharsPerLine: opts.maxCharsPerLine,
    maxWordsPerLine: opts.maxWordsPerLine,
  });

  let groups: Group[];
  let usedModel = false;
  const usage: ModelUsage[] = [];

  if (opts.deterministicOnly) {
    groups = deterministicGroups(words, params);
  } else {
    const chunks = chunkWords(words);

    const results = await Promise.all(
      chunks.map(async chunk => {
        try {
          return await segmentChunkWithModel(
            words,
            chunk,
            profile,
            params,
            wordsPerSecond,
            opts,
          );
        } catch (error) {
          console.warn(
            '[sentenceStructure] chunk segmentation failed, falling back to timing-only for this window',
            chunk,
            error,
          );
          return { lineStarts: [] as number[], usage: null };
        }
      }),
    );

    const lineStarts: number[] = [];
    results.forEach((res, i) => {
      const [s, e] = chunks[i];
      if (res.usage) usage.push(res.usage);

      if (res.lineStarts.length > 0) {
        usedModel = true;
        lineStarts.push(...res.lineStarts);
      } else {
        // Only this window falls back — the rest of the model's work is kept.
        const local = words.slice(s, e + 1);
        for (const [ls] of deterministicGroups(local, params)) {
          lineStarts.push(ls + s);
        }
      }
      // Chunk boundaries were chosen at the largest silences, so they are
      // always real line starts.
      lineStarts.push(s);
    });

    groups = groupsFromLineStarts(lineStarts, words.length);
  }

  // The profile's numbers are enforced in code, whatever the model returned.
  groups = enforceProfile(groups, words, params);

  const fixedCaptions = buildCaptions(words, groups, captions);
  const changes = detectSegmentationChanges(captions, fixedCaptions);
  const stats = summariseSegmentation(words, groups, params);

  return {
    fixedCaptions,
    changes,
    confidence: usedModel ? 0.88 : 0.7,
    profile,
    params,
    stats,
    wordsPerSecond,
    usedModel,
    usage,
    summary: dedent`
      Re-segmented ${captions.length} → ${fixedCaptions.length} caption lines using "${profile.label}"${
        opts.splitDensity && opts.splitDensity !== 'auto'
          ? ` (${opts.splitDensity} divisions)`
          : ''
      }. Avg ${stats.avgChars} chars / ${stats.avgWords} words per line, max ${stats.maxChars} chars.
    `
      .replace(/\s+/g, ' ')
      .trim(),
  };
}

export { DEFAULT_STRUCTURE_PROFILE_ID };
