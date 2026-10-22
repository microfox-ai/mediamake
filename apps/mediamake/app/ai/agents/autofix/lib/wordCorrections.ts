/**
 * Safe, timing-preserving application of word-level corrections.
 *
 * The spelling fixer never lets the model re-emit the transcript. The model
 * returns a list of `{start, end, from, to}` span edits and this module applies
 * them in code, so:
 *   - a span replaced word-for-word keeps every original timestamp,
 *   - a span whose word count changes (one heard word written as two, or two
 *     heard words written as one) is re-timed strictly inside the time the
 *     heard words occupied — nothing outside the span moves,
 *   - the number of caption lines never changes, and a span may not cross one,
 *   - an edit that does not match the words actually at those indices is
 *     rejected rather than silently corrupting the transcript.
 */

import type { Caption, CaptionWord } from '@/app/types/transcription';
import { flattenWords, type FlatWord } from './segmentation';

export interface WordCorrection {
  /** First heard word index being replaced. */
  start: number;
  /** Last heard word index being replaced, inclusive. Defaults to `start`. */
  end?: number;
  /** The heard words at `start..end`, space-separated. */
  from: string;
  /** The written words replacing them, space-separated. Empty deletes the span. */
  to: string;
  reason?: string;
  confidence?: number;
}

export interface AppliedWordChange {
  type: string;
  index: number;
  endIndex: number;
  /** Start of the heard span, in seconds. */
  time: number;
  original: string;
  fixed: string;
  reason: string;
  confidence: number;
}

export interface RejectedWordCorrection extends WordCorrection {
  rejectedBecause: string;
}

export interface ApplyOptions {
  /** Allow `to: ""` to delete a hallucinated word. */
  allowRemovals?: boolean;
  /**
   * Normalised tokens from the reference lyrics. When present, a replacement is
   * only accepted if the new word appears in the reference or is a near-miss
   * spelling of the original — this is what stops the model from "improving"
   * lyrics into something that was never sung.
   */
  referenceVocabulary?: Set<string>;
  /**
   * The reference lyrics normalised with all separators removed. Words in
   * scripts written without spaces (Chinese, Japanese, Thai…) are accepted when
   * they occur anywhere in it, since no tokenizer splits those reliably.
   */
  referenceCompact?: string;
  /** BCP 47 language tag of the song, for locale-aware casing. */
  locale?: string;
  /** Max edit distance still treated as a spelling fix when not in the reference. */
  maxEditDistance?: number;
  /** Longest heard span one correction may replace. */
  maxSpanWords?: number;
  /** Most written words one correction may produce. */
  maxReplacementWords?: number;
  changeType?: string;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/**
 * Punctuation we are willing to move around, in any script (¿ « 「 。 、 ، ؟ । …).
 * Apostrophes and hyphens are NOT in here — "'bout", "gon'" and "re-up" are
 * real word shapes in lyrics.
 */
const LEADING_PUNCT = new RegExp("^(?:(?![-'‘’ʼ])\\p{P})+", 'u');
const TRAILING_PUNCT = new RegExp("(?:(?![-'‘’ʼ])\\p{P})+$", 'u');

/**
 * Optional marks that writers commonly leave out: Latin/Greek/Cyrillic accents,
 * Hebrew niqqud, Arabic harakat and tatweel. Marks that change the word itself
 * (Devanagari matras, Thai vowels, kana dakuten) are kept.
 */
const OPTIONAL_MARKS = /[\u0300-\u036f\u0591-\u05c7\u0610-\u061a\u0640\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const NON_WORD = new RegExp('[^\\p{L}\\p{M}\\p{N}]', 'gu');

/** Scripts written without spaces between words. */
const UNSPACED_SCRIPT = new RegExp(
  '[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Thai}\\p{Script=Lao}\\p{Script=Khmer}\\p{Script=Myanmar}\\p{Script=Tibetan}]',
  'u',
);

export function normalizeToken(text: string): string {
  return text
    .normalize('NFKD')
    .replace(OPTIONAL_MARKS, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(NON_WORD, '');
}

export function isUnspacedScript(text: string): boolean {
  return UNSPACED_SCRIPT.test(text);
}

/** Length in characters, not UTF-16 units. */
export const charLength = (text: string) => Array.from(text).length;

export function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  const a = Array.from(left);
  const b = Array.from(right);
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Keeps the original word's punctuation and capitalisation when the model
 * returns a bare lowercase replacement.
 */
export function transferSurface(
  original: string,
  replacement: string,
  locale?: string,
): string {
  const upper = (s: string) => toLocaleUpper(s, locale);
  const lead = original.match(LEADING_PUNCT)?.[0] ?? '';
  const trail = original.match(TRAILING_PUNCT)?.[0] ?? '';
  const originalCore = original.slice(lead.length, original.length - trail.length);

  const core = replacement.trim();
  const replLead = core.match(LEADING_PUNCT)?.[0] ?? '';
  const replTrail = core.match(TRAILING_PUNCT)?.[0] ?? '';

  // If the model supplied its own punctuation, respect it and add none.
  const keepLead = replLead ? '' : lead;
  const keepTrail = replTrail ? '' : trail;

  const bareCore = core.slice(replLead.length, core.length - replTrail.length);

  let cased = bareCore;
  if (
    originalCore.length > 1 &&
    originalCore === upper(originalCore) &&
    originalCore !== originalCore.toLowerCase()
  ) {
    cased = upper(bareCore);
  } else if (
    originalCore.length > 0 &&
    originalCore[0] === upper(originalCore[0]) &&
    originalCore[0] !== originalCore[0].toLowerCase() &&
    bareCore.length > 0 &&
    bareCore[0] === bareCore[0].toLowerCase()
  ) {
    cased = upper(bareCore[0]) + bareCore.slice(1);
  }

  return `${keepLead}${replLead}${cased}${replTrail}${keepTrail}`;
}

/** Locale-aware upper case (Turkish "i" → "İ"); falls back for unknown tags. */
function toLocaleUpper(text: string, locale?: string): string {
  if (!locale) return text.toUpperCase();
  try {
    return text.toLocaleUpperCase(locale);
  } catch {
    return text.toUpperCase();
  }
}

/**
 * Span version of `transferSurface`. Word-for-word spans map position to
 * position; otherwise the span's leading punctuation and casing go on the first
 * new word and its trailing punctuation on the last.
 */
export function transferSurfaceSpan(
  originals: string[],
  replacements: string[],
  locale?: string,
): string[] {
  if (originals.length === replacements.length) {
    return replacements.map((r, i) => transferSurface(originals[i], r, locale));
  }

  const first = originals[0] ?? '';
  const last = originals[originals.length - 1] ?? '';
  const lead = first.match(LEADING_PUNCT)?.[0] ?? '';
  const trail = last.match(TRAILING_PUNCT)?.[0] ?? '';
  const firstCore = first.slice(lead.length, first.length - (first.match(TRAILING_PUNCT)?.[0].length ?? 0));
  const allCaps = firstCore.length > 1 && firstCore === firstCore.toUpperCase() && firstCore !== firstCore.toLowerCase();

  return replacements.map((r, i) => {
    const isFirst = i === 0;
    const isLast = i === replacements.length - 1;
    const core = isFirst ? firstCore : allCaps ? 'XX' : 'x';
    return transferSurface(`${isFirst ? lead : ''}${core}${isLast ? trail : ''}`, r, locale);
  });
}

const roundTime = (n: number) => Math.round(n * 1000) / 1000;

/**
 * New words for a replaced span. Same word count keeps every timestamp; a
 * different count shares the span's time by spoken length, so the span starts
 * and ends exactly where the heard words did.
 */
function retimeSpan(span: FlatWord[], texts: string[]): FlatWord[] {
  if (texts.length === span.length) {
    return span.map((w, i) => ({ ...w, text: texts[i] }));
  }
  if (texts.length === 0) return [];

  const spanStart = span[0].absoluteStart;
  const spanEnd = span[span.length - 1].absoluteEnd;
  const total = Math.max(0, spanEnd - spanStart);
  const weights = texts.map(t => Math.max(1, charLength(normalizeToken(t))));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const confidence = Math.min(...span.map(w => w.confidence));

  let cursor = spanStart;
  return texts.map((text, i) => {
    const absoluteStart = roundTime(cursor);
    const absoluteEnd =
      i === texts.length - 1 ? spanEnd : roundTime(cursor + (total * weights[i]) / weightSum);
    cursor = absoluteEnd;
    return {
      ...span[0],
      text,
      absoluteStart,
      absoluteEnd,
      duration: Math.max(0, absoluteEnd - absoluteStart),
      confidence,
    };
  });
}

const joinedTokens = (text: string) =>
  text
    .split(/\s+/)
    .map(normalizeToken)
    .join('');

// ---------------------------------------------------------------------------
// Caption rebuilding
// ---------------------------------------------------------------------------

/**
 * Rebuilds captions from a (possibly edited) flat word list, keeping every word
 * in the caption it came from. Absolute timings are copied through untouched;
 * only caption-relative bookkeeping is recomputed.
 */
export function rebuildCaptionsPreservingGrouping(
  words: FlatWord[],
  originalCaptions: Caption[],
): Caption[] {
  const grouped = new Map<number, FlatWord[]>();
  for (const w of words) {
    const list = grouped.get(w.sourceCaptionIndex) ?? [];
    list.push(w);
    grouped.set(w.sourceCaptionIndex, list);
  }

  const captions: Caption[] = [];

  originalCaptions.forEach((original, captionIndex) => {
    const slice = grouped.get(captionIndex);
    if (!slice || slice.length === 0) return;

    const firstStart = slice[0].absoluteStart;
    const last = slice[slice.length - 1];

    const captionWords: CaptionWord[] = slice.map((w, wordIndex) => ({
      id: `caption-${captionIndex}-word-${wordIndex}`,
      text: w.text,
      start: w.absoluteStart - firstStart,
      absoluteStart: w.absoluteStart,
      end: w.absoluteEnd - firstStart,
      absoluteEnd: w.absoluteEnd,
      duration: w.duration,
      confidence: w.confidence,
    }));

    captions.push({
      ...(original ?? {}),
      id: original?.id || `caption-${captionIndex}`,
      text: slice.map(w => w.text).join(' '),
      start: captionWords[0].start,
      absoluteStart: firstStart,
      end: last.absoluteEnd,
      absoluteEnd: last.absoluteEnd,
      duration: last.absoluteEnd - firstStart,
      words: captionWords,
    });
  });

  return captions;
}

// ---------------------------------------------------------------------------
// Applying corrections
// ---------------------------------------------------------------------------

export interface ApplyResult {
  captions: Caption[];
  changes: AppliedWordChange[];
  rejected: RejectedWordCorrection[];
  removedCount: number;
}

export function applyWordCorrections(
  captions: Caption[],
  corrections: WordCorrection[],
  opts: ApplyOptions = {},
): ApplyResult {
  const {
    allowRemovals = false,
    referenceVocabulary,
    referenceCompact = '',
    locale,
    maxEditDistance = 2,
    maxSpanWords = 4,
    maxReplacementWords = 6,
    changeType = 'spelling_fix',
  } = opts;

  const words = flattenWords(captions);
  const changes: AppliedWordChange[] = [];
  const rejected: RejectedWordCorrection[] = [];
  const edits = new Map<number, { end: number; texts: string[] }>();
  const taken = new Set<number>();
  let removedCount = 0;

  // Count words per caption so a removal can never empty a line.
  const captionWordCount = new Map<number, number>();
  for (const w of words) {
    captionWordCount.set(
      w.sourceCaptionIndex,
      (captionWordCount.get(w.sourceCaptionIndex) ?? 0) + 1,
    );
  }

  const reject = (c: WordCorrection, why: string) =>
    rejected.push({ ...c, rejectedBecause: why });

  for (const correction of corrections) {
    const start = Math.trunc(Number(correction.start));
    const end =
      correction.end === undefined || correction.end === null
        ? start
        : Math.trunc(Number(correction.end));
    const to = typeof correction.to === 'string' ? correction.to.trim() : '';
    const from = typeof correction.from === 'string' ? correction.from.trim() : '';

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end < start ||
      end >= words.length
    ) {
      reject(correction, 'word range out of bounds');
      continue;
    }
    if (end - start + 1 > maxSpanWords) {
      reject(correction, `span is longer than ${maxSpanWords} words`);
      continue;
    }

    const span = words.slice(start, end + 1);
    if (span.some(w => taken.has(w.index))) {
      reject(correction, 'overlaps another correction');
      continue;
    }
    const captionIndex = span[0].sourceCaptionIndex;
    if (span.some(w => w.sourceCaptionIndex !== captionIndex)) {
      reject(correction, 'span crosses a caption line');
      continue;
    }

    const heard = span.map(w => w.text);
    const heardText = heard.join(' ');

    // The model must prove it is looking at the right words. Tokens that are
    // pure punctuation normalise to nothing, so those are compared verbatim.
    const heardKey = joinedTokens(heardText);
    const matches = heardKey
      ? joinedTokens(from) === heardKey
      : from.replace(/\s+/g, '') === heardText.replace(/\s+/g, '');
    if (!matches) {
      reject(correction, `"from" does not match the words in range (actual: "${heardText}")`);
      continue;
    }

    // --- removal -----------------------------------------------------------
    if (to === '') {
      if (!allowRemovals) {
        reject(correction, 'word removal is disabled');
        continue;
      }
      const remaining = (captionWordCount.get(captionIndex) ?? 0) - span.length;
      if (remaining < 1) {
        reject(correction, 'removal would empty a caption line');
        continue;
      }
      captionWordCount.set(captionIndex, remaining);
      span.forEach(w => taken.add(w.index));
      edits.set(start, { end, texts: [] });
      removedCount += span.length;
      changes.push({
        type: changeType,
        index: start,
        endIndex: end,
        time: span[0].absoluteStart,
        original: heardText,
        fixed: '(removed)',
        reason: correction.reason || 'Removed hallucinated word',
        confidence: correction.confidence ?? 0.85,
      });
      continue;
    }

    // --- replacement -------------------------------------------------------
    const toTokens = to.split(/\s+/).filter(Boolean);
    if (toTokens.length > maxReplacementWords) {
      reject(correction, `replacement is longer than ${maxReplacementWords} words`);
      continue;
    }
    const normTokens = toTokens.map(normalizeToken);
    if (normTokens.some(t => !t)) {
      reject(correction, 'replacement has a word with no word characters');
      continue;
    }

    const nextTexts = transferSurfaceSpan(heard, toTokens, locale);
    if (nextTexts.join(' ') === heardText) {
      reject(correction, 'no-op');
      continue;
    }

    if (referenceVocabulary && referenceVocabulary.size > 0) {
      const inReference = normTokens.every(
        t =>
          referenceVocabulary.has(t) ||
          (isUnspacedScript(t) && referenceCompact.includes(t)),
      );
      const replacementKey = normTokens.join('');
      const nearMiss =
        !isUnspacedScript(replacementKey) &&
        levenshtein(heardKey, replacementKey) <= maxEditDistance;
      if (!inReference && !nearMiss) {
        reject(
          correction,
          'replacement is neither in the reference lyrics nor a close spelling of the original',
        );
        continue;
      }
    }

    span.forEach(w => taken.add(w.index));
    edits.set(start, { end, texts: nextTexts });
    changes.push({
      type: changeType,
      index: start,
      endIndex: end,
      time: span[0].absoluteStart,
      original: heardText,
      fixed: nextTexts.join(' '),
      reason: correction.reason || 'Spelling corrected',
      confidence: correction.confidence ?? 0.9,
    });
  }

  const nextWords: FlatWord[] = [];
  for (let i = 0; i < words.length; ) {
    const edit = edits.get(i);
    if (!edit) {
      nextWords.push(words[i]);
      i++;
      continue;
    }
    nextWords.push(...retimeSpan(words.slice(i, edit.end + 1), edit.texts));
    i = edit.end + 1;
  }

  changes.sort((a, b) => a.index - b.index);

  return {
    captions: rebuildCaptionsPreservingGrouping(nextWords, captions),
    changes,
    rejected,
    removedCount,
  };
}
