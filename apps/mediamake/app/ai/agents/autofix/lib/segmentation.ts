/**
 * Word-level segmentation utilities for the Sentence Structure Fixer.
 *
 * WHY THIS EXISTS
 * ---------------
 * The old fixer asked the model to re-emit every word with its timestamps in a
 * `word[1.20-1.45]<$>` format. That is thousands of tokens of pure transcription
 * for the model to copy perfectly, and any drift silently dropped words (the
 * parser skips anything that fails its regex) or corrupted timings.
 *
 * Here the model never touches the words. It only answers ONE question: which
 * word indices start a new caption line. Everything else — words, order, and
 * every timestamp — is rebuilt from the original data in code, so a bad model
 * response can produce a worse *segmentation*, never a broken transcript.
 */

import type { Caption, CaptionWord } from '@/app/types/transcription';
import type { StructureProfileParams } from './structureProfiles';

export interface FlatWord {
  index: number;
  text: string;
  absoluteStart: number;
  absoluteEnd: number;
  duration: number;
  /** Silence between this word's end and the next word's start (0 for last). */
  gapAfter: number;
  confidence: number;
  /** Index of the caption this word came from, for reference only. */
  sourceCaptionIndex: number;
}

/** Inclusive word-index range describing one caption line. */
export type Group = [start: number, end: number];

/** Whatever the AI SDK reports back; normalised downstream by `appendUsage`. */
export type ModelUsage = Record<string, unknown>;

/** Shape the autofix UI renders in its change list. */
export interface CaptionChange {
  type: string;
  original: string;
  fixed: string;
  reason: string;
  confidence: number;
  /** Caption line the change applies to, when it is a line-level change. */
  line?: number;
}

// ---------------------------------------------------------------------------
// Flattening
// ---------------------------------------------------------------------------

export function flattenWords(captions: Caption[]): FlatWord[] {
  const flat: FlatWord[] = [];

  captions.forEach((caption, captionIndex) => {
    const words: CaptionWord[] = Array.isArray(caption?.words)
      ? caption.words
      : [];
    for (const word of words) {
      const absoluteStart = Number(word.absoluteStart);
      const absoluteEnd = Number(word.absoluteEnd);
      const text = typeof word.text === 'string' ? word.text.trim() : '';
      if (!text || !Number.isFinite(absoluteStart) || !Number.isFinite(absoluteEnd)) {
        continue;
      }
      flat.push({
        index: flat.length,
        text,
        absoluteStart,
        absoluteEnd,
        duration: Math.max(0, absoluteEnd - absoluteStart),
        gapAfter: 0,
        confidence:
          typeof word.confidence === 'number' ? word.confidence : 0.9,
        sourceCaptionIndex: captionIndex,
      });
    }
  });

  for (let i = 0; i < flat.length - 1; i++) {
    flat[i].gapAfter = Math.max(0, flat[i + 1].absoluteStart - flat[i].absoluteEnd);
  }

  return flat;
}

/** Words per second across the spoken portion — drives tempo adaptation. */
export function measureWordsPerSecond(words: FlatWord[]): number {
  if (words.length < 2) return 0;
  const span = words[words.length - 1].absoluteEnd - words[0].absoluteStart;
  if (span <= 0) return 0;
  return words.length / span;
}

// ---------------------------------------------------------------------------
// Group helpers
// ---------------------------------------------------------------------------

const groupText = (words: FlatWord[], [s, e]: Group) =>
  words
    .slice(s, e + 1)
    .map(w => w.text)
    .join(' ');

const groupChars = (words: FlatWord[], g: Group) => groupText(words, g).length;

const groupWordCount = ([s, e]: Group) => e - s + 1;

const groupDuration = (words: FlatWord[], [s, e]: Group) =>
  Math.max(0, words[e].absoluteEnd - words[s].absoluteStart);

export function groupsFromLineStarts(
  lineStarts: number[],
  wordCount: number,
): Group[] {
  const starts = Array.from(
    new Set(
      lineStarts
        .map(n => Math.trunc(Number(n)))
        .filter(n => Number.isFinite(n) && n >= 0 && n < wordCount),
    ),
  ).sort((a, b) => a - b);

  if (starts[0] !== 0) starts.unshift(0);

  const groups: Group[] = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = (i + 1 < starts.length ? starts[i + 1] : wordCount) - 1;
    if (end >= start) groups.push([start, end]);
  }
  return groups;
}

export const lineStartsFromGroups = (groups: Group[]) => groups.map(g => g[0]);

// ---------------------------------------------------------------------------
// Deterministic enforcement passes
// ---------------------------------------------------------------------------

/** A real silence inside a line is always a line break. */
function splitOnHardGaps(
  groups: Group[],
  words: FlatWord[],
  p: StructureProfileParams,
): Group[] {
  const out: Group[] = [];
  for (const [s, e] of groups) {
    let start = s;
    for (let i = s; i < e; i++) {
      if (words[i].gapAfter >= p.hardGapSeconds) {
        out.push([start, i]);
        start = i + 1;
      }
    }
    out.push([start, e]);
  }
  return out;
}

/**
 * Picks the break point inside a group that a human editor would choose:
 * mostly "where the biggest pause is", nudged towards producing a first half
 * of roughly the target length.
 */
function bestBreak(
  words: FlatWord[],
  [s, e]: Group,
  p: StructureProfileParams,
): number | null {
  const minWords = Math.max(1, Math.min(p.minWords, Math.floor((e - s + 1) / 2)));
  const lo = s + minWords; // first index allowed to START the second line
  const hi = e - minWords + 1;
  if (lo > hi) return null;

  const maxGap = Math.max(
    0.001,
    ...words.slice(s, e).map(w => w.gapAfter),
  );

  let best: number | null = null;
  let bestScore = -Infinity;
  let chars = 0;

  for (let k = s; k <= e; k++) {
    chars += words[k].text.length + (k > s ? 1 : 0);
    const candidate = k + 1; // break BEFORE candidate
    if (candidate < lo || candidate > hi) continue;

    const gapScore = words[k].gapAfter / maxGap;
    const lengthScore =
      1 - Math.min(1, Math.abs(chars - p.targetChars) / Math.max(8, p.targetChars));

    const score = gapScore * 2 + lengthScore;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

/** Force-splits anything above the profile's hard caps. */
function splitOversized(
  groups: Group[],
  words: FlatWord[],
  p: StructureProfileParams,
): Group[] {
  const out: Group[] = [];
  const queue: Group[] = [...groups];
  let guard = words.length * 4;

  while (queue.length > 0 && guard-- > 0) {
    const g = queue.shift()!;
    const oversized =
      groupChars(words, g) > p.maxChars ||
      groupWordCount(g) > p.maxWords ||
      groupDuration(words, g) > p.maxLineDuration;

    // A single word is indivisible; anything larger is handed to `bestBreak`,
    // which enforces the profile's own minimum words per side.
    if (!oversized || groupWordCount(g) < 2) {
      out.push(g);
      continue;
    }

    const breakAt = bestBreak(words, g, p);
    if (breakAt === null) {
      out.push(g);
      continue;
    }
    queue.unshift([breakAt, g[1]]);
    queue.unshift([g[0], breakAt - 1]);
  }

  out.push(...queue);
  return out.sort((a, b) => a[0] - b[0]);
}

/** Pulls orphan fragments back into a neighbour when that stays legal. */
function mergeUndersized(
  groups: Group[],
  words: FlatWord[],
  p: StructureProfileParams,
): Group[] {
  const out = groups.map(g => [...g] as Group);

  const legal = (g: Group) =>
    groupChars(words, g) <= p.maxChars &&
    groupWordCount(g) <= p.maxWords &&
    groupDuration(words, g) <= p.maxLineDuration;

  let changed = true;
  let guard = out.length * 3;

  while (changed && guard-- > 0) {
    changed = false;

    for (let i = 0; i < out.length; i++) {
      const g = out[i];
      const undersized =
        groupWordCount(g) < p.minWords ||
        groupDuration(words, g) < p.minLineDuration;
      if (!undersized) continue;

      const prev = i > 0 ? out[i - 1] : null;
      const next = i + 1 < out.length ? out[i + 1] : null;

      // A silence that earned a hard break is never merged away.
      const gapBefore = prev ? words[prev[1]].gapAfter : Infinity;
      const gapAfter = next ? words[g[1]].gapAfter : Infinity;

      const canPrev =
        prev !== null &&
        gapBefore < p.hardGapSeconds &&
        legal([prev[0], g[1]] as Group);
      const canNext =
        next !== null &&
        gapAfter < p.hardGapSeconds &&
        legal([g[0], next[1]] as Group);

      if (!canPrev && !canNext) continue;

      const mergeWithPrev = canPrev && (!canNext || gapBefore <= gapAfter);
      if (mergeWithPrev) {
        out[i - 1] = [prev![0], g[1]];
        out.splice(i, 1);
      } else {
        out[i] = [g[0], next![1]];
        out.splice(i + 1, 1);
      }
      changed = true;
      break;
    }
  }

  return out;
}

/**
 * Applies every profile constraint to a candidate segmentation. Runs on both
 * the model's answer and the deterministic fallback, so the profile numbers are
 * guaranteed rather than merely requested.
 */
export function enforceProfile(
  groups: Group[],
  words: FlatWord[],
  p: StructureProfileParams,
): Group[] {
  if (words.length === 0) return [];
  let out = groups.length > 0 ? groups : [[0, words.length - 1] as Group];
  out = splitOnHardGaps(out, words, p);
  out = splitOversized(out, words, p);
  out = mergeUndersized(out, words, p);
  return out;
}

/**
 * Timing-only segmentation. Used when the model is unavailable or returns
 * something unusable — still respects the profile, just without any semantics.
 */
export function deterministicGroups(
  words: FlatWord[],
  p: StructureProfileParams,
): Group[] {
  if (words.length === 0) return [];

  const groups: Group[] = [];
  let start = 0;
  let chars = 0;

  for (let i = 0; i < words.length; i++) {
    chars += words[i].text.length + (i > start ? 1 : 0);
    const count = i - start + 1;
    const isLast = i === words.length - 1;

    const hardBreak = !isLast && words[i].gapAfter >= p.hardGapSeconds;
    const softBreak =
      !isLast &&
      words[i].gapAfter >= p.softGapSeconds &&
      count >= Math.max(p.minWords, Math.round(p.targetWords * 0.6));
    const full = count >= p.targetWords || chars >= p.targetChars;

    if (isLast || hardBreak || softBreak || full) {
      groups.push([start, i]);
      start = i + 1;
      chars = 0;
    }
  }

  return enforceProfile(groups, words, p);
}

// ---------------------------------------------------------------------------
// Prompt formatting
// ---------------------------------------------------------------------------

/**
 * Compact word table for the model. Gaps are the signal that matters most, so
 * they are called out explicitly instead of leaving the model to subtract
 * timestamps.
 */
export function formatWordsForPrompt(
  words: FlatWord[],
  range: Group,
): string {
  const [s, e] = range;
  const lines: string[] = [];

  for (let i = s; i <= e; i++) {
    const w = words[i];
    const marks: string[] = [];
    if (i < e && w.gapAfter >= 0.6) marks.push('<<PAUSE>>');
    else if (i < e && w.gapAfter >= 0.3) marks.push('<pause>');
    if (w.duration >= 0.9) marks.push('<held>');
    lines.push(
      `${w.index}\t${w.text}\t${w.absoluteStart.toFixed(2)}-${w.absoluteEnd.toFixed(2)}\tgap:${w.gapAfter.toFixed(2)}${marks.length ? `\t${marks.join(' ')}` : ''}`,
    );
  }

  return lines.join('\n');
}

/** Current line starts, so the model can see what it is being asked to improve. */
export function describeCurrentLines(words: FlatWord[]): string {
  const byCaption = new Map<number, FlatWord[]>();
  for (const w of words) {
    const list = byCaption.get(w.sourceCaptionIndex) ?? [];
    list.push(w);
    byCaption.set(w.sourceCaptionIndex, list);
  }
  return Array.from(byCaption.entries())
    .map(([, list]) => `[${list[0].index}] ${list.map(w => w.text).join(' ')}`)
    .join('\n');
}

/**
 * Splits a long transcript into model-sized windows, cutting at the largest
 * silence near each boundary so a window never starts mid-phrase.
 */
export function chunkWords(words: FlatWord[], chunkSize = 220): Group[] {
  if (words.length <= chunkSize) {
    return words.length ? [[0, words.length - 1]] : [];
  }

  const chunks: Group[] = [];
  let start = 0;

  while (start < words.length) {
    let end = Math.min(start + chunkSize - 1, words.length - 1);
    if (end < words.length - 1) {
      const searchFrom = Math.max(start, end - 40);
      let bestIdx = end;
      let bestGap = -1;
      for (let i = searchFrom; i <= end; i++) {
        if (words[i].gapAfter > bestGap) {
          bestGap = words[i].gapAfter;
          bestIdx = i;
        }
      }
      end = bestIdx;
    }
    chunks.push([start, end]);
    start = end + 1;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Rebuilding captions
// ---------------------------------------------------------------------------

/**
 * Rebuilds Caption objects from the original words. Field shape matches what
 * the existing autofix pipeline already writes (`parseAIOutputToCaptions`), so
 * downstream presets see nothing new.
 */
export function buildCaptions(
  words: FlatWord[],
  groups: Group[],
  originalCaptions: Caption[] = [],
): Caption[] {
  return groups.map(([s, e], captionIndex) => {
    const slice = words.slice(s, e + 1);
    const firstStart = slice[0].absoluteStart;

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

    const last = slice[slice.length - 1];
    const original = originalCaptions[captionIndex];

    return {
      id: original?.id || `caption-${captionIndex}`,
      text: slice.map(w => w.text).join(' '),
      start: captionWords[0].start,
      absoluteStart: firstStart,
      end: last.absoluteEnd,
      absoluteEnd: last.absoluteEnd,
      duration: last.absoluteEnd - firstStart,
      words: captionWords,
      ...(original?.metadata ? { metadata: original.metadata } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export interface SegmentationStats {
  lines: number;
  avgChars: number;
  maxChars: number;
  avgWords: number;
  maxWords: number;
  overLimit: number;
}

export function summariseSegmentation(
  words: FlatWord[],
  groups: Group[],
  p: StructureProfileParams,
): SegmentationStats {
  if (groups.length === 0) {
    return { lines: 0, avgChars: 0, maxChars: 0, avgWords: 0, maxWords: 0, overLimit: 0 };
  }
  const chars = groups.map(g => groupChars(words, g));
  const counts = groups.map(g => groupWordCount(g));
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    lines: groups.length,
    avgChars: round1(chars.reduce((a, b) => a + b, 0) / groups.length),
    maxChars: Math.max(...chars),
    avgWords: round1(counts.reduce((a, b) => a + b, 0) / groups.length),
    maxWords: Math.max(...counts),
    overLimit: groups.filter(
      (g, i) => chars[i] > p.maxChars || counts[i] > p.maxWords,
    ).length,
  };
}

/**
 * Line-level diff. Sentence-structure work never changes the words, so a
 * whole-text comparison always reports "no change" — this compares the line
 * boundaries instead, which is what actually moved.
 */
export function detectSegmentationChanges(
  originalCaptions: Caption[],
  fixedCaptions: Caption[],
  changeType = 'sentence_structure_fix',
  maxEntries = 60,
): CaptionChange[] {
  const before = originalCaptions.map(c => (c?.text ?? '').trim());
  const after = fixedCaptions.map(c => (c?.text ?? '').trim());

  if (before.length === after.length && before.every((t, i) => t === after[i])) {
    return [];
  }

  const changes: CaptionChange[] = [];
  const max = Math.max(before.length, after.length);

  for (let i = 0; i < max; i++) {
    if (before[i] === after[i]) continue;
    changes.push({
      type: changeType,
      line: i,
      original: before[i] ?? '(no line)',
      fixed: after[i] ?? '(line removed)',
      reason:
        before[i] === undefined
          ? 'New caption line created by re-segmentation'
          : after[i] === undefined
            ? 'Caption line merged into a neighbouring line'
            : 'Caption line boundaries changed',
      confidence: 0.9,
    });
    if (changes.length >= maxEntries) {
      changes.push({
        type: changeType,
        original: `${max - i - 1} more line(s)`,
        fixed: 're-segmented',
        reason: 'Truncated change list',
        confidence: 0.9,
      });
      break;
    }
  }

  return changes;
}
