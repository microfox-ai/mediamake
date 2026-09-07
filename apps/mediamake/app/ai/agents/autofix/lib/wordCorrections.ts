/**
 * Safe, timestamp-preserving application of word-level corrections.
 *
 * The spelling fixer never lets the model re-emit the transcript. The model
 * returns a list of `{index, from, to}` edits and this module applies them in
 * code, so:
 *   - every `absoluteStart` / `absoluteEnd` is byte-identical to the input,
 *   - the number of caption lines never changes,
 *   - an edit that does not match the word actually at that index is rejected
 *     rather than silently corrupting the transcript.
 */

import type { Caption, CaptionWord } from '@/app/types/transcription';
import { flattenWords, type FlatWord } from './segmentation';

export interface WordCorrection {
  index: number;
  from: string;
  to: string;
  reason?: string;
  confidence?: number;
}

export interface AppliedWordChange {
  type: string;
  index: number;
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
  /** Max edit distance still treated as a spelling fix when not in the reference. */
  maxEditDistance?: number;
  changeType?: string;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Punctuation we are willing to move around. Apostrophes are NOT in here — */
/** "'bout" and "gon'" are real word shapes in slang lyrics. */
const LEADING_PUNCT = /^[¿¡("“«\[]+/;
const TRAILING_PUNCT = /[,.!?;:…)"”»\]]+$/;

export function normalizeToken(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9']/g, '')
    .replace(/'/g, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
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
export function transferSurface(original: string, replacement: string): string {
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
  if (originalCore.length > 1 && originalCore === originalCore.toUpperCase()) {
    cased = bareCore.toUpperCase();
  } else if (
    originalCore.length > 0 &&
    originalCore[0] === originalCore[0].toUpperCase() &&
    originalCore[0] !== originalCore[0].toLowerCase() &&
    bareCore.length > 0 &&
    bareCore[0] === bareCore[0].toLowerCase()
  ) {
    cased = bareCore[0].toUpperCase() + bareCore.slice(1);
  }

  return `${keepLead}${replLead}${cased}${replTrail}${keepTrail}`;
}

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
    maxEditDistance = 2,
    changeType = 'spelling_fix',
  } = opts;

  const words = flattenWords(captions);
  const changes: AppliedWordChange[] = [];
  const rejected: RejectedWordCorrection[] = [];
  const removals = new Set<number>();
  const seen = new Set<number>();

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
    const index = Math.trunc(Number(correction.index));
    const to = typeof correction.to === 'string' ? correction.to.trim() : '';
    const from = typeof correction.from === 'string' ? correction.from.trim() : '';

    if (!Number.isFinite(index) || index < 0 || index >= words.length) {
      reject(correction, 'word index out of range');
      continue;
    }
    if (seen.has(index)) {
      reject(correction, 'duplicate correction for the same word');
      continue;
    }

    const word = words[index];

    // The model must prove it is looking at the right word.
    if (normalizeToken(from) !== normalizeToken(word.text)) {
      reject(correction, `"from" does not match word at index (actual: "${word.text}")`);
      continue;
    }

    // --- removal -----------------------------------------------------------
    if (to === '') {
      if (!allowRemovals) {
        reject(correction, 'word removal is disabled');
        continue;
      }
      if ((captionWordCount.get(word.sourceCaptionIndex) ?? 0) <= 1) {
        reject(correction, 'removal would empty a caption line');
        continue;
      }
      removals.add(index);
      captionWordCount.set(
        word.sourceCaptionIndex,
        (captionWordCount.get(word.sourceCaptionIndex) ?? 1) - 1,
      );
      seen.add(index);
      changes.push({
        type: changeType,
        index,
        original: word.text,
        fixed: '(removed)',
        reason: correction.reason || 'Removed hallucinated word',
        confidence: correction.confidence ?? 0.85,
      });
      continue;
    }

    // --- replacement -------------------------------------------------------
    if (/\s/.test(to)) {
      reject(correction, 'replacement contains whitespace (would change word count)');
      continue;
    }

    const nextText = transferSurface(word.text, to);
    if (nextText === word.text) {
      reject(correction, 'no-op');
      continue;
    }

    const normFrom = normalizeToken(word.text);
    const normTo = normalizeToken(to);
    if (!normTo) {
      reject(correction, 'replacement has no word characters');
      continue;
    }

    if (referenceVocabulary && referenceVocabulary.size > 0) {
      const inReference = referenceVocabulary.has(normTo);
      const nearMiss = levenshtein(normFrom, normTo) <= maxEditDistance;
      if (!inReference && !nearMiss) {
        reject(
          correction,
          'replacement is neither in the reference lyrics nor a close spelling of the original',
        );
        continue;
      }
    }

    seen.add(index);
    changes.push({
      type: changeType,
      index,
      original: word.text,
      fixed: nextText,
      reason: correction.reason || 'Spelling corrected',
      confidence: correction.confidence ?? 0.9,
    });
    word.text = nextText;
  }

  const survivors = words.filter(w => !removals.has(w.index));
  const fixedCaptions = rebuildCaptionsPreservingGrouping(survivors, captions);

  return {
    captions: fixedCaptions,
    changes,
    rejected,
    removedCount: removals.size,
  };
}
