/** Pure helpers for captions line/word timing edits. */

export const MIN_GAP = 0.01;

export type CaptionWord = {
  id?: string;
  text?: string;
  start?: number;
  end?: number;
  absoluteStart?: number;
  absoluteEnd?: number;
  duration?: number;
  confidence?: number;
  [key: string]: unknown;
};

export type CaptionLine = {
  id?: string;
  text?: string;
  start?: number;
  end?: number;
  absoluteStart?: number;
  absoluteEnd?: number;
  duration?: number;
  words?: CaptionWord[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type DragTarget =
  | { kind: "line"; lineIdx: number; edge: "move" | "left" | "right" }
  | {
      kind: "word";
      lineIdx: number;
      wordIdx: number;
      edge: "move" | "left" | "right";
    };

export function getLineBounds(line: CaptionLine): { start: number; end: number } {
  if (line.absoluteStart != null && line.absoluteEnd != null) {
    const start = Number(line.absoluteStart) || 0;
    const end = Number(line.absoluteEnd) || start;
    return { start, end: Math.max(end, start) };
  }
  const words = line.words ?? [];
  if (words.length > 0) {
    const start = Number(words[0]?.absoluteStart ?? line.start ?? 0) || 0;
    const end =
      Number(words[words.length - 1]?.absoluteEnd ?? line.end ?? start) ||
      start;
    return { start, end: Math.max(end, start) };
  }
  const start = Number(line.start ?? 0) || 0;
  const end = Number(line.end ?? start) || start;
  return { start, end: Math.max(end, start) };
}

export function getWordBounds(
  word: CaptionWord,
  line?: CaptionLine,
): { start: number; end: number } {
  if (word.absoluteStart != null || word.absoluteEnd != null) {
    const start = Number(word.absoluteStart ?? 0) || 0;
    const end = Number(word.absoluteEnd ?? start) || start;
    return { start, end: Math.max(end, start) };
  }
  const lineStart = line ? getLineBounds(line).start : 0;
  const start = lineStart + (Number(word.start) || 0);
  const end = lineStart + (Number(word.end ?? word.start) || 0);
  return { start, end: Math.max(end, start) };
}

/** Sync relative start/end/duration from absolute word timings; keep line range. */
export function recomputeLineFromWords(line: CaptionLine): CaptionLine {
  const lineBounds = getLineBounds(line);
  const words = (line.words ?? []).map((w) => ({ ...w }));

  if (words.length === 0) {
    return {
      ...line,
      absoluteStart: lineBounds.start,
      absoluteEnd: lineBounds.end,
      start: lineBounds.start,
      end: lineBounds.end,
      duration: Math.max(0, lineBounds.end - lineBounds.start),
    };
  }

  const normalized = words.map((w) => {
    const { start, end } = getWordBounds(w, line);
    const clampedStart = Math.max(
      lineBounds.start,
      Math.min(start, lineBounds.end - MIN_GAP),
    );
    const clampedEnd = Math.min(
      lineBounds.end,
      Math.max(end, clampedStart + MIN_GAP),
    );
    return {
      ...w,
      absoluteStart: clampedStart,
      absoluteEnd: clampedEnd,
      start: clampedStart - lineBounds.start,
      end: clampedEnd - lineBounds.start,
      duration: Math.max(0, clampedEnd - clampedStart),
    };
  });

  return {
    ...line,
    absoluteStart: lineBounds.start,
    absoluteEnd: lineBounds.end,
    start: lineBounds.start,
    end: lineBounds.end,
    duration: Math.max(0, lineBounds.end - lineBounds.start),
    text: normalized.map((w) => w.text ?? "").join(" ").trim() || line.text,
    words: normalized,
  };
}

export function shiftLine(line: CaptionLine, delta: number): CaptionLine {
  const { start, end } = getLineBounds(line);
  const words = (line.words ?? []).map((w) => {
    const b = getWordBounds(w, line);
    return {
      ...w,
      absoluteStart: b.start + delta,
      absoluteEnd: b.end + delta,
    };
  });
  return recomputeLineFromWords({
    ...line,
    absoluteStart: start + delta,
    absoluteEnd: end + delta,
    words,
  });
}

/**
 * Resize a line edge. The first word (left) or last word (right) always
 * meets the new line bound — extending or compressing with the line.
 */
export function applyLineEdge(
  line: CaptionLine,
  edge: "left" | "right" | "move",
  nextStart: number,
  nextEnd: number,
): CaptionLine {
  if (edge === "move") {
    const b = getLineBounds(line);
    return shiftLine(line, nextStart - b.start);
  }

  const words = (line.words ?? []).map((w) => ({ ...w }));
  let start = nextStart;
  let end = Math.max(nextEnd, start + MIN_GAP);

  if (words.length === 0) {
    return recomputeLineFromWords({
      ...line,
      absoluteStart: start,
      absoluteEnd: end,
    });
  }

  if (edge === "left") {
    start = Math.min(start, end - MIN_GAP);
    const first = words[0]!;
    const { end: origFirstEnd } = getWordBounds(first, line);
    const firstEnd = Math.max(origFirstEnd, start + MIN_GAP);
    words[0] = {
      ...first,
      absoluteStart: start,
      absoluteEnd: Math.min(firstEnd, end),
    };
    if ((words[0].absoluteEnd as number) - start < MIN_GAP) {
      words[0].absoluteEnd = start + MIN_GAP;
    }
    return recomputeLineFromWords({
      ...line,
      absoluteStart: start,
      absoluteEnd: end,
      words,
    });
  }

  end = Math.max(end, start + MIN_GAP);
  const last = words[words.length - 1]!;
  const { start: origLastStart } = getWordBounds(last, line);
  const lastStart = Math.min(origLastStart, end - MIN_GAP);
  words[words.length - 1] = {
    ...last,
    absoluteStart: Math.max(lastStart, start),
    absoluteEnd: end,
  };
  if (end - (words[words.length - 1].absoluteStart as number) < MIN_GAP) {
    words[words.length - 1].absoluteStart = end - MIN_GAP;
  }

  return recomputeLineFromWords({
    ...line,
    absoluteStart: start,
    absoluteEnd: end,
    words,
  });
}

/**
 * Edit a word edge/move. Words may overlap; only constraint is staying
 * inside the parent line range.
 */
export function applyWordEdge(
  line: CaptionLine,
  wordIdx: number,
  edge: "move" | "left" | "right",
  nextStart: number,
  nextEnd: number,
): CaptionLine {
  const words = (line.words ?? []).map((w) => ({ ...w }));
  const word = words[wordIdx];
  if (!word) return line;

  const lineBounds = getLineBounds(line);
  let start = nextStart;
  let end = nextEnd;

  if (edge === "move") {
    const dur = Math.max(MIN_GAP, end - start);
    start = Math.max(
      lineBounds.start,
      Math.min(lineBounds.end - dur, start),
    );
    end = start + dur;
  } else if (edge === "left") {
    const curEnd = getWordBounds(word, line).end;
    end = Math.min(curEnd, lineBounds.end);
    start = Math.max(lineBounds.start, Math.min(end - MIN_GAP, start));
  } else {
    const curStart = getWordBounds(word, line).start;
    start = Math.max(curStart, lineBounds.start);
    end = Math.min(lineBounds.end, Math.max(start + MIN_GAP, end));
  }

  start = Math.max(lineBounds.start, start);
  end = Math.min(lineBounds.end, end);
  if (end - start < MIN_GAP) {
    if (edge === "left") start = Math.max(lineBounds.start, end - MIN_GAP);
    else end = Math.min(lineBounds.end, start + MIN_GAP);
  }

  words[wordIdx] = {
    ...word,
    absoluteStart: start,
    absoluteEnd: end,
  };

  return recomputeLineFromWords({ ...line, words });
}

/** Move a block so its start lands on `at`, preserving duration. */
export function setBlockStartAt(
  start: number,
  end: number,
  at: number,
  minStart = 0,
  maxEnd = Infinity,
): { start: number; end: number } {
  const dur = Math.max(MIN_GAP, end - start);
  let newStart = at;
  let newEnd = newStart + dur;
  if (newEnd > maxEnd) {
    newEnd = maxEnd;
    newStart = Math.max(minStart, newEnd - dur);
  }
  if (newStart < minStart) {
    newStart = minStart;
    newEnd = newStart + dur;
  }
  return { start: newStart, end: newEnd };
}

/** Move a block so its end lands on `at`, preserving duration. */
export function setBlockEndAt(
  start: number,
  end: number,
  at: number,
  minStart = 0,
  maxEnd = Infinity,
): { start: number; end: number } {
  const dur = Math.max(MIN_GAP, end - start);
  let newEnd = at;
  let newStart = newEnd - dur;
  if (newStart < minStart) {
    newStart = minStart;
    newEnd = newStart + dur;
  }
  if (newEnd > maxEnd) {
    newEnd = maxEnd;
    newStart = Math.max(minStart, newEnd - dur);
  }
  return { start: newStart, end: newEnd };
}

/** Trim/extend start to `at`, keeping end fixed. */
export function trimBlockStartTo(
  start: number,
  end: number,
  at: number,
  minStart = 0,
  maxEnd = Infinity,
): { start: number; end: number } | null {
  const maxStart = Math.min(end - MIN_GAP, maxEnd - MIN_GAP);
  if (maxStart < minStart) return null;
  const newStart = Math.max(minStart, Math.min(at, maxStart));
  if (Math.abs(newStart - start) < 1e-9) return null;
  return { start: newStart, end };
}

/** Trim/extend end to `at`, keeping start fixed. */
export function trimBlockEndTo(
  start: number,
  end: number,
  at: number,
  minStart = 0,
  maxEnd = Infinity,
): { start: number; end: number } | null {
  const minEnd = Math.max(start + MIN_GAP, minStart + MIN_GAP);
  if (minEnd > maxEnd) return null;
  const newEnd = Math.min(maxEnd, Math.max(at, minEnd));
  if (Math.abs(newEnd - end) < 1e-9) return null;
  return { start, end: newEnd };
}
