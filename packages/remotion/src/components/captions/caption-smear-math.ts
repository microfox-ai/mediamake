// Pure timing helpers for CaptionSmear: caption doc -> on-screen beats -> per-frame envelope.

export interface CaptionBeat {
  text: string;
  /** Absolute seconds. */
  start: number;
  /** Absolute seconds; the beat is cut here (next beat start or linger limit). */
  end: number;
  index: number;
}

export interface CaptionBeatOptions {
  /** A beat with fewer letters than this pulls in the following word. */
  minChars?: number;
  maxWords?: number;
  /** Words further apart than this (seconds) are never joined. */
  maxJoinGap?: number;
  /** How long the last beat before a pause stays up after it is spoken. */
  linger?: number;
}

interface TimedWord {
  text: string;
  start: number;
  end: number;
  captionIndex: number;
}

const num = (value: unknown): number | undefined => {
  const n = Number(value);
  return value !== null && value !== '' && Number.isFinite(n) ? n : undefined;
};

const letterCount = (text: string) => text.replace(/[^\p{L}\p{N}]/gu, '').length;

const flattenWords = (captions: unknown): TimedWord[] => {
  if (!Array.isArray(captions)) return [];
  const words: TimedWord[] = [];
  captions.forEach((caption: any, captionIndex) => {
    if (!caption || typeof caption !== 'object' || !Array.isArray(caption.words)) return;
    const captionStart = num(caption.absoluteStart) ?? num(caption.start) ?? 0;
    for (const word of caption.words) {
      const text = String(word?.text ?? '').trim();
      if (!text) continue;
      const start = num(word.absoluteStart) ?? captionStart + (num(word.start) ?? 0);
      const end =
        num(word.absoluteEnd) ??
        (num(word.end) !== undefined ? captionStart + num(word.end)! : start + (num(word.duration) ?? 0));
      // Some transcripts pack several words into one entry; give each an even slice.
      const parts = text.split(/\s+/);
      const slice = Math.max(0, end - start) / parts.length;
      parts.forEach((part, i) => {
        words.push({ text: part, start: start + i * slice, end: start + (i + 1) * slice, captionIndex });
      });
    }
  });
  return words.sort((a, b) => a.start - b.start);
};

export function buildCaptionBeats(captions: unknown, options: CaptionBeatOptions = {}): CaptionBeat[] {
  const { minChars = 4, maxWords = 3, maxJoinGap = 0.35, linger = 0.8 } = options;
  const words = flattenWords(captions);
  const groups: TimedWord[][] = [];

  const canJoin = (a: TimedWord, b: TimedWord) =>
    a.captionIndex === b.captionIndex && b.start - a.end <= maxJoinGap;
  const groupLetters = (group: TimedWord[]) => letterCount(group.map((w) => w.text).join(''));

  let i = 0;
  while (i < words.length) {
    const group = [words[i++]];
    while (
      i < words.length &&
      group.length < maxWords &&
      groupLetters(group) < minChars &&
      canJoin(group[group.length - 1], words[i])
    ) {
      group.push(words[i++]);
    }
    const previous = groups[groups.length - 1];
    // A short word with nothing after it ("...over it") rides on the previous beat.
    if (
      group.length === 1 &&
      groupLetters(group) < minChars &&
      previous &&
      previous.length < maxWords &&
      canJoin(previous[previous.length - 1], group[0])
    ) {
      previous.push(group[0]);
      continue;
    }
    groups.push(group);
  }

  return groups.map((group, index) => {
    const start = group[0].start;
    const spokenEnd = Math.max(start, group[group.length - 1].end);
    const nextStart = groups[index + 1]?.[0].start ?? Infinity;
    const end = Math.max(start + 0.05, Math.min(nextStart, spokenEnd + linger));
    return { text: group.map((w) => w.text).join(' '), start, end, index };
  });
}

/** Beat on screen at `time`, or null between beats. `beats` must be sorted by start. */
export function findActiveBeat(beats: CaptionBeat[], time: number): CaptionBeat | null {
  let lo = 0;
  let hi = beats.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid].start <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found < 0) return null;
  return time < beats[found].end ? beats[found] : null;
}

export interface BeatEnvelope {
  /** Opacity of the stretched, vertically blurred entrance layer. */
  smear: number;
  /** 0 -> 1 across the smear phase. */
  smearProgress: number;
  /** Opacity of the sharp layer. */
  crisp: number;
  /** 0 -> 1 across the snap from smear into sharp text. */
  snap: number;
  /** 0 -> 1 as the word greys out before the next one. */
  dim: number;
  /** 0 -> 1 across the whole beat. */
  progress: number;
}

export interface BeatEnvelopeOptions {
  /** Max smear length in seconds. Longer beats still snap after this. */
  smearThreshold?: number;
}

export interface LetterSpacingSettleOptions {
  enabled?: boolean;
  /** 0 = no motion; 1 = default; higher = tighter start and more leftover at the cut. */
  impact?: number;
}

export interface LetterSpacingSettle {
  /** 0 = tightest start, 1 = fully expanded at rest (not reached while the beat is on). */
  progress: number;
  /** Em still left to open at progress 0. Subtracted from the target letter-spacing. */
  extraEm: number;
}

export const DEFAULT_SMEAR_THRESHOLD = 0.5;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const easeOutQuad = (p: number) => 1 - (1 - p) * (1 - p);

export function beatEnvelope(
  localTime: number,
  duration: number,
  options: BeatEnvelopeOptions = {},
): BeatEnvelope {
  const t = Math.max(0, localTime);
  const d = Math.max(0.05, duration);
  const cap = Math.max(0.04, options.smearThreshold ?? DEFAULT_SMEAR_THRESHOLD);
  const smearEnd = Math.min(cap, Math.max(0.06, d * 0.4), d * 0.85);
  const snapEnd = Math.min(d, smearEnd + Math.min(0.08, d * 0.15));
  const dimLength = d > 0.6 ? Math.min(0.35, d * 0.3) : 0;
  const dimStart = d - dimLength;

  const snap = snapEnd > smearEnd ? clamp01((t - smearEnd) / (snapEnd - smearEnd)) : t >= smearEnd ? 1 : 0;

  return {
    smear: 1 - snap,
    smearProgress: clamp01(t / smearEnd),
    crisp: snap,
    snap,
    dim: dimLength > 0 ? clamp01((t - dimStart) / dimLength) : 0,
    progress: clamp01(t / d),
  };
}

/**
 * Ease-out letter-spacing settle that is designed to finish after the beat ends,
 * so the next word cuts in while this one is still opening toward rest.
 */
export function letterSpacingSettle(
  localTime: number,
  duration: number,
  options: LetterSpacingSettleOptions = {},
): LetterSpacingSettle {
  const impact = Math.max(0, options.impact ?? 1);
  if (options.enabled === false || impact === 0) {
    return { progress: 1, extraEm: 0 };
  }

  const d = Math.max(0.05, duration);
  const overshoot = d * (0.28 + 0.22 * impact);
  const p = clamp01(Math.max(0, localTime) / (d + overshoot));

  return {
    progress: easeOutQuad(p),
    extraEm: 0.1 + 0.12 * impact,
  };
}

/** Letter-spacing in px. Tight at progress 0, expanded to `targetPx` at progress 1. */
export function applyLetterSpacingSettle(
  targetPx: number,
  fontSize: number,
  settle: LetterSpacingSettle,
): number {
  return targetPx - settle.extraEm * fontSize * (1 - settle.progress);
}
