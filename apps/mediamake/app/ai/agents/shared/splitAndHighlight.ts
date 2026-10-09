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

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';
import { z } from 'zod/v4';
import type { Caption, CaptionWord } from '@/app/types/transcription';
import {
  extractKeywordsFromHtmlText,
  parseCaptionHtmlText,
  tokenizeCaptionHtml,
} from '@/lib/captions/html-text';
import {
  detectSegmentationChanges,
  type CaptionChange,
} from '@/app/ai/agents/autofix/lib/segmentation';

export const SPLIT_HIGHLIGHT_MODEL = 'gemini-2.5-pro';

export const CAPTION_FLOWS = ['singular', 'mixed'] as const;
export const CAPTION_LAYOUTS = [
  'vertical_box',
  'horizontal_box',
  'square_box',
] as const;
export const MAX_CHARACTER_OPTIONS = [
  'any',
  '15-25',
  '25to35',
  '35to45',
  '45+',
] as const;

export type CaptionFlow = (typeof CAPTION_FLOWS)[number];
export type CaptionLayout = (typeof CAPTION_LAYOUTS)[number];
export type MaxCharactersOption = (typeof MAX_CHARACTER_OPTIONS)[number];

export const SplitAndHighlightParamsSchema = z.object({
  flow: z
    .enum(CAPTION_FLOWS)
    .optional()
    .default('singular')
    .describe(
      'singular: every caption card uses the same line count and emphasis pattern. mixed is reserved and currently runs as singular.',
    ),
  layout: z
    .enum(CAPTION_LAYOUTS)
    .describe(
      'vertical_box: 3–5 lines per card. horizontal_box: 1–2 lines. square_box: 2–3 lines.',
    ),
  fontScaling: z
    .number()
    .positive()
    .default(2)
    .describe(
      'How many times larger a bold word is drawn compared with a normal word. A bold word of N letters occupies about N × fontScaling of horizontal space.',
    ),
  maxCharacters: z
    .enum(MAX_CHARACTER_OPTIONS)
    .optional()
    .default('any')
    .describe(
      'Character budget for each visual line, counting a bold word at fontScaling × its letter count. any means no numeric cap.',
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
  /** mixed is accepted and stored, but only singular arrangement is applied. */
  flowApplied: 'singular';
  summary: string;
}

const HtmlTextSchema = z.object({
  htmlText: z
    .string()
    .describe(
      'The full caption document. <br/><br/> separates caption cards. A single <br/> splits lines inside a card. <b>...</b> marks highlighted words. Every source word appears once, in order.',
    ),
});

const LAYOUT_SPEC: Record<
  CaptionLayout,
  { minLines: number; maxLines: number; direction: string }
> = {
  vertical_box: {
    minLines: 3,
    maxLines: 5,
    direction: dedent`
      VERTICAL BOX — a tall stack, 3 to 5 lines on every card.
      The bold word is the visual anchor of the stack. It is drawn at fontScaling times body size, so its visual width is about (letter count × fontScaling).
      Choose the highlighted word so that visual width sits flush with the shorter companion lines: wide enough to feel like it owns the stack, narrow enough that it does not spill past them.
      Put the bold word on its own line when sharing the line with body copy would make the scaled word overflow.
      Companion lines should be similar visual widths to each other, so the stack reads as a designed block rather than a ragged subtitle.
    `,
  },
  horizontal_box: {
    minLines: 1,
    maxLines: 2,
    direction: dedent`
      HORIZONTAL BOX — a wide, short card, 1 or 2 lines only.
      A 1-line card is a single designed phrase. A 2-line card is a pair, not a paragraph.
      The bold word is larger by fontScaling, so pick a word whose scaled width still fits the card. Do not bold a long word that would blow out a short horizontal line.
      On a 2-line card, give the bold word the line where it can sit cleanly — often alone — and let the other line carry the smaller words.
    `,
  },
  square_box: {
    minLines: 2,
    maxLines: 3,
    direction: dedent`
      SQUARE BOX — a compact block, 2 or 3 lines on every card.
      Balance the scaled bold word against the other line or lines. Its visual width (letter count × fontScaling) should be close to those lines, so the square stays even.
      One highlighted word (or one tight adjacent phrase) per card. The second and third lines are body copy that frame it.
    `,
  },
};

const CHARACTER_BANDS: Record<
  MaxCharactersOption,
  { min: number | null; max: number | null; instruction: string }
> = {
  any: {
    min: null,
    max: null,
    instruction:
      'No numeric character cap. Still keep every line a deliberate width for the layout. Do not let a line run on just because it can.',
  },
  '15-25': {
    min: 15,
    max: 25,
    instruction:
      'Each visual line should land between 15 and 25 effective characters. Count a normal word by its letters. Count a bold word as letters × fontScaling.',
  },
  '25to35': {
    min: 25,
    max: 35,
    instruction:
      'Each visual line should land between 25 and 35 effective characters. Count a normal word by its letters. Count a bold word as letters × fontScaling.',
  },
  '35to45': {
    min: 35,
    max: 45,
    instruction:
      'Each visual line should land between 35 and 45 effective characters. Count a normal word by its letters. Count a bold word as letters × fontScaling.',
  },
  '45+': {
    min: 45,
    max: null,
    instruction:
      'Each visual line should be at least 45 effective characters. Count a normal word by its letters. Count a bold word as letters × fontScaling. Still break before a line becomes a paragraph.',
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

export function buildSplitAndHighlightPrompt(
  sourceHtml: string,
  options: SplitAndHighlightOptions,
): { system: string; prompt: string } {
  const layout = LAYOUT_SPEC[options.layout];
  const band = CHARACTER_BANDS[options.maxCharacters ?? 'any'];
  const scale = options.fontScaling;

  const system = dedent`
    You arrange captions for motion graphics. This is not subtitling and it is not a transcript cleanup.
    A motion-graphics card is a designed object: line count, line width, and which word is enlarged are the composition.
    Be meticulous. Every break and every highlight should look intentional when the bold words are drawn larger than the rest.

    MARKUP — this is the only language you may add
    - Return one htmlText string for the entire piece.
    - <br/><br/> (two breaks) starts a new caption card.
    - <br/> (one break) splits lines inside the current card.
    - <b>...</b> marks the highlighted word or a tight adjacent phrase. Those words render at ${scale}× the size of normal words.
    - A bold word therefore takes about ${scale}× the horizontal space of the same letters at body size. Design widths with that scale, not with raw character count alone.
    - Do not add, delete, reorder, merge, split, or rewrite words. Punctuation stays attached to the word it arrived on.
    - No other tags. No <p>, <div>, <strong>, <i>, or markdown.

    LAYOUT
    ${layout.direction}
    Every card uses ${layout.minLines} to ${layout.maxLines} visual lines. Singular flow: the same line count and the same emphasis pattern on every card, so the sequence feels like one system.

    LINE WIDTH
    ${band.instruction}

    HIGHLIGHTS
    - Usually one word. A short adjacent phrase only when the words belong together as a single title ("New York", "hold on").
    - Never bold a piece of a word, and never bold the same occurrence twice.
    - The highlighted word should be the one the card is built around — the image, the name, the turn — not a function word, unless the line is nothing but function words.
    - Do not highlight every card with the same part of speech just to be consistent. Consistency is the layout, not the dictionary.

    ${
      options.flow === 'mixed'
        ? 'Mixed flow (different styles per card) is not available yet. Arrange every card with the singular rules above.'
        : 'Flow is singular: one layout system for the whole piece.'
    }
  `;

  const prompt = dedent`
    CURRENT ARRANGEMENT (source of the words, and of any highlights or line splits already set):
    ${sourceHtml}

    Redesign this into motion-graphics cards for layout "${options.layout}" with fontScaling ${scale} and maxCharacters "${options.maxCharacters ?? 'any'}".
    Keep every word, in this order.
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
    const keyword = extractKeywordsFromHtmlText(htmlText);
    const parsed = parseCaptionHtmlText(htmlText, captionWords);

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
        ...(keyword ? { keyword } : {}),
        ...(parsed?.splitParts ? { splitParts: parsed.splitParts } : {}),
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
      flowApplied: 'singular',
      summary: 'No caption text to arrange',
    };
  }

  const { system, prompt } = buildSplitAndHighlightPrompt(sourceHtml, options);
  const result = await generateObject({
    model: google(SPLIT_HIGHLIGHT_MODEL),
    schema: HtmlTextSchema,
    system,
    prompt,
    maxRetries: 2,
  });

  const modelHtml = normalizeMotionHtml(result.object.htmlText || sourceHtml);
  const fixedCaptions = captionsFromMotionHtml(
    modelHtml || sourceHtml,
    captions,
  );
  const htmlText = serializeCaptionsToHtml(fixedCaptions);
  const changes = collectChanges(captions, fixedCaptions);
  const layout = LAYOUT_SPEC[options.layout];

  return {
    htmlText,
    fixedCaptions,
    changes,
    confidence: 0.86,
    usage: result.usage,
    flowApplied: 'singular',
    summary: dedent`
      Arranged ${captions.length} caption cards into ${fixedCaptions.length} for ${options.layout}
      (${layout.minLines}–${layout.maxLines} lines, bold words at ${options.fontScaling}×, max characters ${options.maxCharacters ?? 'any'}).
    `
      .replace(/\s+/g, ' ')
      .trim(),
  };
}
