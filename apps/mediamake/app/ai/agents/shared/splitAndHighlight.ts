/**
 * Motion-graphics line split + highlight.
 *
 * One HTML document describes the whole caption set:
 * - `<br/><br/>` starts a new caption card
 * - a single `<br/>` splits lines inside that card
 * - `<b>` marks words that render larger than the body copy
 *
 * The model only places those marks. Word text and timestamps stay on the
 * source captions.
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';
import { z } from 'zod/v4';
import type { Caption, CaptionWord } from '@/app/types/transcription';
import { tokenizeCaptionHtml } from '@/lib/captions/html-text';
import {
  detectSegmentationChanges,
  type CaptionChange,
} from '@/app/ai/agents/autofix/lib/segmentation';

export const SPLIT_HIGHLIGHT_MODEL = 'gemini-2.5-pro';

export const CAPTION_LAYOUTS = [
  'vertical_box',
  'horizontal_box',
  'square_box',
] as const;

export type CaptionLayout = (typeof CAPTION_LAYOUTS)[number];

export const SplitAndHighlightParamsSchema = z.object({
  frameChoice: z
    .enum(CAPTION_LAYOUTS)
    .describe(
      'The frame every card is drawn in while staticFrameChoice is true. vertical_box: tall stack, up to 5 lines. horizontal_box: wide card, up to 2 lines. square_box: compact block, up to 3 lines.',
    ),
  fontScaling: z
    .number()
    .positive()
    .default(2)
    .describe(
      'How many times larger a bold word is drawn compared with a normal word. A bold word of N letters occupies about N × fontScaling of horizontal space.',
    ),
  staticFrameChoice: z
    .boolean()
    .default(true)
    .describe(
      'When true, every card uses frameChoice. Keep this true. A later pass may set it false so each card can choose its own frame.',
    ),
});

export type SplitAndHighlightParams = z.infer<
  typeof SplitAndHighlightParamsSchema
>;

export interface SplitAndHighlightOptions extends SplitAndHighlightParams {
  userRequest?: string;
}

export interface SplitAndHighlightResult {
  htmlText: string;
  fixedCaptions: Caption[];
  changes: CaptionChange[];
  confidence: number;
  usage: unknown;
  staticFrameChoice: boolean;
  summary: string;
}

const LAYOUT_SPEC: Record<
  CaptionLayout,
  { maxLines: number; direction: string }
> = {
  vertical_box: {
    maxLines: 5,
    direction: dedent`
      VERTICAL BOX — a tall stack, at most 5 lines.
      Build a staircase: a short quiet line, then the line that lands. Lines do not need matching widths.
      Bold words are drawn at fontScaling times body size, so each one's visual width is about (letter count × fontScaling).
      Put scaled words on their own line when sharing the line with body copy would overflow.
    `,
  },
  horizontal_box: {
    maxLines: 2,
    direction: dedent`
      HORIZONTAL BOX — a wide card, at most 2 lines.
      A 1-line card is one phrase. A 2-line card is a setup and a landing, not a paragraph.
      Bold words are larger by fontScaling. Their combined scaled width has to stay inside the wide line.
    `,
  },
  square_box: {
    maxLines: 3,
    direction: dedent`
      SQUARE BOX — a compact block, at most 3 lines.
      Keep the block close to even. The combined visual width of bold words on a line (each word's letters × fontScaling) should stay near the other lines.
    `,
  },
};

/**
 * Frame for one card.
 * staticFrameChoice keeps every card on frameChoice.
 * A later pass can return a different frame per card when the flag is false.
 */
export function frameForCard(
  options: SplitAndHighlightOptions,
  _cardIndex: number,
): CaptionLayout {
  return options.frameChoice;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Pull the html body out of a generateText reply. */
export function extractHtmlFromModelText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

/** Collapse model / editor HTML into `<br/>` and `<b>` only. */
export function normalizeMotionHtml(html: string): string {
  return html
    .replace(/<\s*strong\b[^>]*>/gi, '<b>')
    .replace(/<\/\s*strong\s*>/gi, '</b>')
    .replace(/<\s*em\b[^>]*>|<\/\s*em\s*>|<\s*i\b[^>]*>|<\/\s*i\s*>/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]*\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    .replace(/<br\s*\/?\s*>/gi, '<br/>')
    .replace(/<\/?p[^>]*>/gi, '')
    .trim();
}

function captionInnerHtml(caption: Caption): string {
  const existing = caption.metadata?.htmlText;
  if (typeof existing === 'string' && existing.trim()) {
    // A stored caption uses a single <br/> for in-card splits. Double breaks
    // would be read as a new card, so collapse them here.
    return normalizeMotionHtml(existing).replace(/(?:<br\/>\s*){2,}/g, '<br/>');
  }

  const words = caption.words?.map(word => word.text).filter(Boolean) ?? [];
  if (words.length > 0) return words.map(escapeHtml).join(' ');
  return escapeHtml(caption.text ?? '').trim();
}

/**
 * One document for the whole caption list.
 * Double `<br/>` between cards, single `<br/>` inside a card, `<b>` kept.
 */
export function serializeCaptionsToHtml(captions: Caption[]): string {
  return captions
    .map(captionInnerHtml)
    .map(html => html.trim())
    .filter(Boolean)
    .join('<br/><br/>');
}

function seconds(value: number): string {
  return `${Math.max(0, value).toFixed(2)}s`;
}

/** Timed cards for the model. Markup stays out of this block so timings are not copied into htmlText. */
export function formatTimedCaptions(captions: Caption[]): string {
  return captions
    .map((caption, index) => {
      const start = caption.absoluteStart ?? caption.start ?? 0;
      const end = caption.absoluteEnd ?? caption.end ?? start;
      const words = caption.words ?? [];
      const wordLines =
        words.length > 0
          ? words.map((word, wordIndex) => {
              const duration =
                word.duration ?? word.absoluteEnd - word.absoluteStart;
              const next = words[wordIndex + 1];
              const gap = next
                ? next.absoluteStart - word.absoluteEnd
                : end - word.absoluteEnd;
              return `  ${seconds(duration)}  gap ${seconds(gap)}  ${word.text}`;
            })
          : [`  ${caption.text ?? ''}`];

      return [
        `CARD ${index + 1}  ${seconds(start)}–${seconds(end)}  (${seconds(end - start)} on screen)`,
        ...wordLines,
      ].join('\n');
    })
    .join('\n\n');
}

function frameDirection(options: SplitAndHighlightOptions): string {
  const frame = frameForCard(options, 0);
  const spec = LAYOUT_SPEC[frame];
  const shared = dedent`
    ${spec.direction}
    ${spec.maxLines} lines is the ceiling, not a quota. A short phrase or a brief card uses fewer lines.
  `;

  if (options.staticFrameChoice !== false) {
    return dedent`
      STATIC FRAME — every card uses ${frame}.
      Do not switch frames between cards or between lines.
      ${shared}
    `;
  }

  return dedent`
    staticFrameChoice is false, so a later pass may give each card its own frame.
    This pass still draws every card as ${frame}. Do not emit frame tags.
    ${shared}
  `;
}

export function buildSplitAndHighlightPrompt(
  sourceHtml: string,
  options: SplitAndHighlightOptions,
  timedSource: string,
): { system: string; prompt: string } {
  const scale = options.fontScaling ?? 2;
  const frame = frameForCard(options, 0);

  const system = dedent`
    You are a motion-graphics animator laying out caption cards. This is not subtitling and it is not a transcript cleanup.
    A card is one moment on screen. A line break is a step for the eye. A bold word is the word that scales in on the beat.

    MARKUP — return only the html, nothing else
    - One html string for the entire piece. No preface, no explanation, no markdown fences, no timings.
    - <br/><br/> (two breaks) starts a new caption card.
    - <br/> (one break) splits lines inside the current card.
    - <b>...</b> marks a word drawn large. Those words render at ${scale}× body size.
    - A bold word takes about ${scale}× the horizontal space of the same letters at body size.
    - Do not add, delete, reorder, merge, or rewrite words.
    - No other tags. No <p>, <div>, <strong>, <i>, or markdown.

    TIMING
    Each card shows how long it stays on screen. Each word shows its duration and the silence after it.
    - Under 0.8s on screen: one line, one bold hit, even in a tall frame.
    - From 0.8s to 2s: at most 2 or 3 lines, and never more than the frame ceiling.
    - Longer than 2s: you may use the full ceiling.
    - A gap of about 0.25s or more is a line break. A gap of about 0.6s or more starts a new card.
    - Stack only as many lines as a viewer can read in that card's time. One glance.

    WHERE TO SPLIT
    - A period, question mark, or exclamation mark ends the card (<br/><br/>).
    - A comma, semicolon, colon, dash, or ellipsis usually ends a line (<br/>), not a card.
    - Also break where the meaning turns: a setup, then the payoff. Meaning can justify a break with no punctuation, and punctuation does not force a break when the words are still one idea.
    - The punctuation stays on the line it closes. "ready," ends that line. The next line starts at the next word.
    - Do not start a line with "and", "the", "to", "of", or "a" when that word can stay on the line before it.
    - The line should open on the word the animation is about to hit.

    FRAME
    ${frameDirection(options)}

    HIGHLIGHTS
    - Default to one <b> per line: the word that should land on the beat. Usually the landing word, the contrast, the name, or the number.
    - A second bold word on the same line only when the two words are the point together ("not today", "New York") and their scaled width still fits the frame.
    - Skip articles, prepositions, conjunctions, and filler unless the line has nothing else.
    - Never bold a piece of a word, and never bold the same occurrence twice.
    - A line that is only connective tissue stays unbolded.
  `;

  const prompt = dedent`
    TIMED CARDS (duration, then each word's duration and the gap after it):
    ${timedSource}

    CURRENT ARRANGEMENT:
    ${sourceHtml}

    Redesign every card in the ${frame} frame. Bold words are ${scale}× body size.
    Use the timings. Keep punctuation on the line it closes.
    One bold word per line unless a second word is part of the same hit and the frame still holds.
    Keep every word, in this order.
    Return only the html.
    ${options.userRequest ? `\nADDITIONAL DIRECTION: ${options.userRequest}` : ''}
  `;

  return { system, prompt };
}

type WordMark = {
  word: CaptionWord;
  bold: boolean;
  lineBreakBefore: boolean;
  cardBreakBefore: boolean;
};

function marksForSourceWords(html: string, words: CaptionWord[]): WordMark[] {
  const tokens = tokenizeCaptionHtml(normalizeMotionHtml(html));
  const marks: Array<{
    bold: boolean;
    lineBreakBefore: boolean;
    cardBreakBefore: boolean;
  }> = [];
  let pendingBreaks = 0;

  for (const token of tokens) {
    if (token.type === 'break') {
      pendingBreaks += 1;
      continue;
    }
    marks.push({
      bold: token.bold,
      cardBreakBefore: pendingBreaks >= 2 && marks.length > 0,
      lineBreakBefore: pendingBreaks === 1 && marks.length > 0,
    });
    pendingBreaks = 0;
  }

  return words.map((word, index) => {
    const mark = marks[index];
    return {
      word,
      bold: mark?.bold ?? false,
      lineBreakBefore: mark?.lineBreakBefore ?? false,
      cardBreakBefore: mark?.cardBreakBefore ?? false,
    };
  });
}

function buildCardHtml(card: WordMark[]): string {
  return card
    .map((entry, index) => {
      const escaped = escapeHtml(entry.word.text);
      const marked = entry.bold ? `<b>${escaped}</b>` : escaped;
      if (index === 0) return marked;
      return `${entry.lineBreakBefore ? '<br/>' : ' '}${marked}`;
    })
    .join('');
}

export function captionsFromMotionHtml(
  html: string,
  sourceCaptions: Caption[],
): Caption[] {
  const sourceWords = sourceCaptions.flatMap(caption => caption.words ?? []);
  if (sourceWords.length === 0) return [];

  const marked = marksForSourceWords(html, sourceWords);
  const cards: WordMark[][] = [];
  let current: WordMark[] = [];

  for (const entry of marked) {
    if (entry.cardBreakBefore && current.length > 0) {
      cards.push(current);
      current = [];
    }
    current.push({ ...entry, cardBreakBefore: false });
  }
  if (current.length > 0) cards.push(current);

  return cards.map((card, captionIndex) => {
    const first = card[0].word;
    const last = card[card.length - 1].word;
    const captionWords: CaptionWord[] = card.map(entry => ({
      ...entry.word,
      start: entry.word.absoluteStart - first.absoluteStart,
      end: entry.word.absoluteEnd - first.absoluteStart,
    }));
    const htmlText = buildCardHtml(card);

    return {
      id: `caption-${captionIndex}`,
      text: captionWords.map(word => word.text).join(' '),
      start: first.absoluteStart,
      absoluteStart: first.absoluteStart,
      end: last.absoluteEnd,
      absoluteEnd: last.absoluteEnd,
      duration: last.absoluteEnd - first.absoluteStart,
      words: captionWords,
      metadata: {
        htmlText,
      },
    };
  });
}

function collectChanges(before: Caption[], after: Caption[]): CaptionChange[] {
  const structural = detectSegmentationChanges(
    before,
    after,
    'caption_layout',
  );
  if (structural.length > 0) return structural;

  const highlightChanges: CaptionChange[] = [];
  const max = Math.max(before.length, after.length);
  for (let i = 0; i < max; i++) {
    const original = String(before[i]?.metadata?.htmlText ?? '');
    const fixed = String(after[i]?.metadata?.htmlText ?? '');
    if (original === fixed) continue;
    highlightChanges.push({
      type: 'caption_highlight',
      line: i,
      original: original || '(none)',
      fixed: fixed || '(none)',
      reason: 'Highlight or in-card line split changed',
      confidence: 0.9,
    });
  }
  return highlightChanges;
}

export async function runSplitAndHighlight(
  captions: Caption[],
  options: SplitAndHighlightOptions,
): Promise<SplitAndHighlightResult> {
  const sourceHtml = serializeCaptionsToHtml(captions);
  if (!sourceHtml.trim()) {
    return {
      htmlText: '',
      fixedCaptions: captions,
      changes: [],
      confidence: 0,
      usage: null,
      staticFrameChoice: options.staticFrameChoice !== false,
      summary: 'No caption text to arrange',
    };
  }

  const frame = frameForCard(options, 0);
  const { system, prompt } = buildSplitAndHighlightPrompt(
    sourceHtml,
    options,
    formatTimedCaptions(captions),
  );
  const result = await generateText({
    model: google(SPLIT_HIGHLIGHT_MODEL),
    system,
    prompt,
    maxRetries: 2,
  });

  const modelHtml = normalizeMotionHtml(
    extractHtmlFromModelText(result.text) || sourceHtml,
  );
  const fixedCaptions = captionsFromMotionHtml(
    modelHtml || sourceHtml,
    captions,
  );
  const htmlText = serializeCaptionsToHtml(fixedCaptions);
  const changes = collectChanges(captions, fixedCaptions);
  const layout = LAYOUT_SPEC[frame];
  const staticFrame = options.staticFrameChoice !== false;

  return {
    htmlText,
    fixedCaptions,
    changes,
    confidence: 0.86,
    usage: result.usage,
    staticFrameChoice: staticFrame,
    summary: dedent`
      Arranged ${captions.length} caption cards into ${fixedCaptions.length} for ${frame}
      (up to ${layout.maxLines} lines, bold words at ${options.fontScaling ?? 2}×, ${staticFrame ? 'one frame for every card' : 'per-card frames reserved'}).
    `
      .replace(/\s+/g, ' ')
      .trim(),
  };
}
