import { z } from "zod";
import type { ActionDefinition, ActionExecuteResult } from "../types";
import { persistCaptionLines, readCaptionReference } from "./caption-reference";

const inputSchema = z.object({});

/** Same threshold as the transcriber timeline's Fill word gaps control. */
const MIN_GAP = 0.01;

type CaptionWord = {
  absoluteStart?: number;
  absoluteEnd?: number;
  start?: number;
  end?: number;
  duration?: number;
  [key: string]: unknown;
};

type CaptionLine = {
  absoluteStart?: number;
  start?: number;
  words?: CaptionWord[];
  [key: string]: unknown;
};

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Fill silence between neighboring words on one caption line.
 * The shorter word takes the gap. Equal lengths pull the next word's start back.
 * Matches handleFillWordGaps in the transcriber sentence timeline.
 */
export function fillWordGapsInLine(sentence: CaptionLine): {
  line: CaptionLine;
  filled: number;
} {
  const words = Array.isArray(sentence.words)
    ? sentence.words.map((word) => ({ ...word }))
    : [];
  if (words.length < 2) return { line: sentence, filled: 0 };

  const lineStart = num(sentence.absoluteStart, num(sentence.start));
  let filled = 0;

  const absoluteStart = (word: CaptionWord) =>
    word.absoluteStart != null
      ? num(word.absoluteStart)
      : lineStart + num(word.start);

  const absoluteEnd = (word: CaptionWord) => {
    if (word.absoluteEnd != null) return num(word.absoluteEnd);
    if (word.end != null) return lineStart + num(word.end);
    return absoluteStart(word);
  };

  for (let i = 0; i < words.length - 1; i++) {
    const currentWord = words[i];
    const nextWord = words[i + 1];
    const currentStart = absoluteStart(currentWord);
    const currentEnd = absoluteEnd(currentWord);
    const nextStart = absoluteStart(nextWord);
    const nextEnd = absoluteEnd(nextWord);
    const gap = nextStart - currentEnd;

    if (gap > MIN_GAP) {
      const currentDuration = currentEnd - currentStart;
      const nextDuration = nextEnd - nextStart;
      if (currentDuration < nextDuration) {
        currentWord.absoluteEnd = nextStart;
        currentWord.end = nextStart - lineStart;
        currentWord.duration = nextStart - currentStart;
      } else {
        nextWord.absoluteStart = currentEnd;
        nextWord.start = currentEnd - lineStart;
        nextWord.duration = nextEnd - currentEnd;
      }
      filled += 1;
    }
  }

  if (filled === 0) return { line: sentence, filled: 0 };
  return { line: { ...sentence, words }, filled };
}

export const captionFillWordGaps: ActionDefinition = {
  metadata: {
    id: "captionFillWordGaps",
    title: "Fill Word Gaps",
    description:
      "Fill silence between words inside each caption line. The shorter word takes the gap, the same way Fill word gaps works in the transcriber. Gaps between lines stay.",
    supportedReferenceTypes: ["captions"],
    tags: ["caption", "timing", "word-gaps"],
  },
  inputSchema,
  defaultInputParams: {},
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const value = readCaptionReference(ctx, "Fill word gaps");
    let filled = 0;
    const next = (value.captions as CaptionLine[]).map((sentence) => {
      const result = fillWordGapsInLine(sentence);
      filled += result.filled;
      return result.line;
    });
    await persistCaptionLines(value, next);

    return {
      outputs: [
        {
          label:
            filled === 0
              ? "No word gaps"
              : filled === 1
                ? "Filled 1 word gap"
                : `Filled ${filled} word gaps`,
          isFavorite: true,
          payload: { captions: next },
        },
      ],
    };
  },
  applyOutput: ({ currentData, output }) => {
    const payload = output.payload as { captions?: unknown[] };
    if (!Array.isArray(payload?.captions) || payload.captions.length === 0) {
      return currentData;
    }
    return {
      ...currentData,
      captions: payload.captions,
    };
  },
};
