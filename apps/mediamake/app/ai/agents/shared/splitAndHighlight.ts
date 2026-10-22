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

export const LINE_LENGTHS = [
  'xx-short',
  'x-short',
  'short',
  'medium',
  'large',
  'x-large',
  'xx-large',
] as const;

export type CaptionLayout = (typeof CAPTION_LAYOUTS)[number];
export type LineLength = (typeof LINE_LENGTHS)[number];

const frameChoiceSchema = z
  .enum(CAPTION_LAYOUTS)
  .describe(
    'The frame every card uses while staticFrameChoice is true. vertical_box is a 3:4 vertical rectangle. horizontal_box is a 16:9 horizontal rectangle. square_box is a 1:1 square.',
  );

const staticFrameChoiceSchema = z
  .boolean()
  .default(true)
  .describe(
    'Defaults to true. Every card uses frameChoice. A later pass may set this false so each card can choose its own frame.',
  );

/** 0, blank, and missing are the same: derive the cap from the frame at run time. */
export function normalizeStoredMaxLines(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'string' && value.trim() === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

export const SplitAndHighlightParamsSchema = z.object({
  frameChoice: frameChoiceSchema,
  maxLines: z
    .preprocess(normalizeStoredMaxLines, z.number().int().min(0))
    .default(0)
    .describe(
      'Maximum lines on one card. 0 and empty are the same. The limit is then taken from frameChoice: vertical_box is 5, horizontal_box is 2, square_box is 4.',
    ),
  fontScaling: z
    .number()
    .positive()
    .default(2)
    .describe(
      'How many times larger a bold word is drawn compared with a normal word. A bold word of N letters occupies about N × fontScaling of horizontal space.',
    ),
  highlight: z
    .boolean()
    .default(true)
    .describe(
      'On by default. Bold the word that carries each phrase. Turn off to leave every word plain.',
    ),
  minLines: z
    .preprocess(normalizeStoredMaxLines, z.number().int().min(0))
    .default(0)
    .describe(
      'Minimum lines on one card. 0 and empty leave the count to the model. When this is higher than the maximum, every card uses this many lines.',
    ),
  staticFrameChoice: staticFrameChoiceSchema,
});

export type SplitAndHighlightParams = z.infer<
  typeof SplitAndHighlightParamsSchema
>;

export interface SplitAndHighlightOptions extends Omit<
  SplitAndHighlightParams,
  'fontScaling' | 'maxLines' | 'minLines' | 'highlight'
> {
  /**
   * Maximum lines on one card.
   * 0, blank, and omitted are the same: the cap is taken from frameChoice
   * when the prompt is built.
   */
  maxLines?: number | null | string;
  /**
   * Minimum lines on one card.
   * 0, blank, and omitted leave the count to the model.
   * A value above the maximum makes every card use that many lines.
   */
  minLines?: number | null | string;
  /**
   * Bold the word that carries each phrase.
   * Omitted and true are the same. False leaves every word plain.
   */
  highlight?: boolean;
  /** Sentence structure only. Split-and-highlight does not set this. */
  lineLength?: LineLength;
  /** Used by split-and-highlight. Sentence structure does not set this. */
  fontScaling?: number;
  userRequest?: string;
  /**
   * Keep every caption card. Only the htmlText metadata is rewritten.
   * Card count, words, and timestamps stay on the source captions.
   * Used by split-and-highlight for the line breaks and bold words inside each caption.
   */
  preserveCards?: boolean;
  /**
   * Sentence structure. Only decide where one caption ends and the next begins.
   * No in-card line breaks and no bold words. fontScaling is ignored.
   */
  captionSplitsOnly?: boolean;
}

/** Params for the sentence-structure pass. fontScaling and maxLines are not inputs. */
export const SentenceStructureParamsSchema = z.object({
  frameChoice: frameChoiceSchema,
  lineLength: z
    .enum(LINE_LENGTHS)
    .default('medium')
    .describe(
      'How much text sits on one caption. xx-short suggests 1–2 words. x-short suggests 2–3 words. short, medium, and large stay as they are. x-large and xx-large hold longer thoughts. These are suggestions. Meaning decides the break.',
    ),
  staticFrameChoice: staticFrameChoiceSchema,
});

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
  {
    maxLines: number;
    frameShape: string;
    shape: string;
    mediumExample: string;
  }
> = {
  vertical_box: {
    maxLines: 5,
    frameShape: 'VERTICAL RECTANGLE, 3:4. Narrow and tall.',
    shape: 'VERTICAL RECTANGLE, 3:4. Narrow and tall. Up to 5 lines.',
    mediumExample:
      'A<br/>sudden<br/>blinding<br/><b>sunburst</b><br/><br/>to<br/>blind the<br/><b>tyrant\'s</b><br/>gaze',
  },
  horizontal_box: {
    maxLines: 2,
    frameShape:
      'HORIZONTAL RECTANGLE, 16:9. The width is the ceiling, not a target. A line stays as short as the phrase. A line can stay plain. Not every line needs a highlighted word.',
    shape:
      'HORIZONTAL RECTANGLE, 16:9. At most 2 lines on a card. The width is the ceiling, not a target. A line stays as short as the phrase. One of the two lines can be plain. Both lines do not need a highlighted word.',
    mediumExample:
      'A sudden blinding<br/><b>sunburst</b><br/><br/>to blind the<br/><b>tyrant\'s gaze</b>',
  },
  square_box: {
    maxLines: 4,
    frameShape: 'SQUARE, 1:1. Between the tall frame and the wide frame.',
    shape:
      'SQUARE, 1:1. Between the tall frame and the wide frame. Up to 4 lines.',
    mediumExample:
      'A<br/>sudden blinding<br/><b>sunburst</b><br/><br/>to blind the<br/><b>tyrant\'s</b><br/>gaze',
  },
};

/** Positive maxLines wins. 0 and empty use the frame's own cap. */
function resolveMaxLines(maxLines: unknown, frame: CaptionLayout): number {
  const stored = normalizeStoredMaxLines(maxLines);
  if (stored === 0) return LAYOUT_SPEC[frame].maxLines;
  return stored;
}

/** 0 means the model chooses how few lines a card needs. */
function resolveLineBounds(
  options: SplitAndHighlightOptions,
  frame: CaptionLayout,
): { minLines: number; maxLines: number } {
  const maxLines = resolveMaxLines(options.maxLines, frame);
  const minLines = normalizeStoredMaxLines(options.minLines);
  if (minLines <= 0) return { minLines: 0, maxLines };
  return { minLines, maxLines: Math.max(maxLines, minLines) };
}

function lineCountRule(minLines: number, maxLines: number): string {
  if (minLines > 0 && minLines >= maxLines) {
    return `${minLines} lines on every card. Do not use fewer.`;
  }
  if (minLines > 0) {
    return `Use at least ${minLines} lines and at most ${maxLines} lines on one card.`;
  }
  return `${maxLines} lines is the ceiling on one card. Use fewer when the clause is shorter.`;
}

function highlightsEnabled(options: SplitAndHighlightOptions): boolean {
  return options.highlight !== false;
}

const SHORT_SQUARE_EXAMPLE =
  'where stifling walls<br/>sought to hold the spirit down .<br/>I bore the heavy shell<br/>across the shifting sand<br/>to learn the martial pulse<br/>of an unforgiving land.<br/>No lunar beast slumbers<br/>beneath my skin .<br/>Just brittle bones<br/>where the quiet wars begin .<br/>I traded whispered prayers';

/** How many words belong on one caption card. Sentence structure uses this. */
const CAPTION_SIZE_SPEC: Record<LineLength, string> = {
  'xx-short':
    'XX-SHORT — suggested length is 1 or 2 words: one image, one verb, or one name. Suggestion only. Keep "stifling walls" together if splitting them loses the image. Go longer whenever a shorter cut would break the sentence.',
  'x-short':
    'X-SHORT — suggested length is 2 or 3 words, one fragment. Suggestion only. "where stifling walls" can stay one caption if that is the meaning. Go longer whenever a shorter cut would break the sentence.',
  short:
    'SHORT — one phrase, or two short phrases. Cut at punctuation and where the meaning turns. A wide frame does not make the caption longer.',
  medium: 'MEDIUM — a caption can hold a clause.',
  large:
    'LARGE — a caption can hold a longer clause, and still ends on a period or a finished comma.',
  'x-large':
    'X-LARGE — longer than large. A caption holds a full sentence, or two clauses that belong together. Split on a period, question mark, exclamation mark, or a major turn.',
  'xx-large':
    'XX-LARGE — the longest captions. Keep a whole sentence, and the next sentence when they are one thought. Split only when the topic actually changes. Fewest cards.',
};

function captionSizeReminder(lineLength: LineLength): string {
  if (lineLength === 'xx-short') {
    return 'Suggested length: about 1 or 2 words. Keep a longer group when a shorter cut would break the meaning.';
  }
  if (lineLength === 'x-short') {
    return 'Suggested length: about 2 or 3 words. Keep a longer group when a shorter cut would break the meaning.';
  }
  if (lineLength === 'x-large') {
    return 'Hold a full sentence on one caption when it is one thought.';
  }
  if (lineLength === 'xx-large') {
    return 'Hold a sentence or two on one caption. Split only when the topic changes.';
  }
  return '';
}

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

/**
 * Sentence text plus how long the card is on screen.
 * Per-word gaps are omitted so the model does not break on silence.
 */
export function formatTimedCaptions(captions: Caption[]): string {
  return captions
    .map((caption, index) => {
      const start = caption.absoluteStart ?? caption.start ?? 0;
      const end = caption.absoluteEnd ?? caption.end ?? start;
      const words = caption.words ?? [];
      const text =
        words.length > 0
          ? words.map(word => word.text).join(' ')
          : (caption.text ?? '');
      return `CARD ${index + 1} (${seconds(end - start)} on screen)\n${text}`;
    })
    .join('\n\n');
}

function frameDirection(options: SplitAndHighlightOptions): string {
  const frame = frameForCard(options, 0);
  const spec = LAYOUT_SPEC[frame];
  const { minLines, maxLines } = resolveLineBounds(options, frame);
  const highlights = highlightsEnabled(options);
  const example = highlights
    ? spec.mediumExample
    : spec.mediumExample.replace(/<\/?b>/gi, '');
  const lineRule = lineCountRule(minLines, maxLines);
  const shared = dedent`
    ${spec.frameShape}
    ${lineRule}
    ${
      frame === 'horizontal_box'
        ? options.preserveCards
          ? highlights
            ? 'Stay inside the card you were given. A line can stay plain. Only one line needs a highlight.'
            : 'Stay inside the card you were given. Do not bold any word.'
          : highlights
            ? 'A new card starts when the line ceiling is full. A line can stay plain. Only one line needs a highlight.'
            : 'A new card starts when the line ceiling is full. Do not bold any word.'
        : ''
    }

    Shape example for "${frame}", phrase "A sudden blinding sunburst to blind the tyrant's gaze":
    ${example}
    That example shows a possible wrap. It does not override punctuation, and it does not override the line count.${
      frame === 'horizontal_box' && highlights
        ? ' On a horizontal card, a line may have no bold word.'
        : ''
    }
  `;

  if (options.staticFrameChoice !== false) {
    return dedent`
      STATIC FRAME — every card uses ${frame}. This is the default.
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

function buildCaptionSplitPrompt(
  sourceHtml: string,
  options: SplitAndHighlightOptions,
  timedSource: string,
): { system: string; prompt: string } {
  const frame = frameForCard(options, 0);
  const lineLength = options.lineLength ?? 'medium';
  const spec = LAYOUT_SPEC[frame];

  const system = dedent`
    You split a transcript into caption cards. You do not design the lines inside a card, and you do not highlight words.
    A later pass splits each caption into lines and chooses bold words. Your only job is where one caption ends and the next begins.

    MARKUP — return only the html, nothing else
    - One html string. No preface, no markdown fences.
    - <br/><br/> starts a new caption card.
    - Do not use a single <br/>. Do not use <b>.
    - Do not add, delete, reorder, or rewrite words. Punctuation stays on the word it arrived on.
    - A punctuation mark that ends a caption stays at the end of that caption. Never start the next caption with . , ! ? ; : or an ellipsis.

    WHERE A CAPTION ENDS
    - Meaning first, then punctuation. A finished thought is its own caption.
    - A period, question mark, or exclamation mark ends the caption. "land." is the last word of that caption. The next word starts the next caption.
    - A comma, semicolon, colon, or dash can end a caption when the clause is complete. The mark stays on that caption.
    - Do not cut a pronoun away from its verb, or a preposition away from its phrase, to chase a shorter length.
    - On-screen time is context only. Do not cut on a silence or a gap.

    SIZE — the selected length is a suggestion. Meaning decides the break. Stay near the suggestion, and go longer when a shorter cut would break the sentence. It sets how much text belongs in one caption, not how the words wrap inside it.
    - Frame ${frame}: ${spec.shape}
    - Selected length: ${lineLength}.
    - ${CAPTION_SIZE_SPEC[lineLength]}
    - A wide frame does not make the caption longer.
    - ${spec.maxLines} is a hint for how many phrases fit. Use fewer when the thought is shorter.
    ${options.staticFrameChoice !== false ? `- Every caption uses ${frame}.` : `- This pass still uses ${frame} for every caption.`}
  `;

  const prompt = dedent`
    SENTENCES (on-screen time is context only — do not cut on it):
    ${timedSource}

    CURRENT ARRANGEMENT:
    ${sourceHtml}

    Split these into caption cards for ${frame} with ${lineLength} captions.
    ${captionSizeReminder(lineLength)}
    Use only <br/><br/> between captions. No line breaks inside a caption. No bold.
    Keep every word, in this order. Keep each punctuation mark at the end of its caption.
    Return only the html.
    ${options.userRequest ? `\nADDITIONAL DIRECTION: ${options.userRequest}` : ''}
  `;

  return { system, prompt };
}

/** Drop in-card breaks and bold so a caption-split result is one plain caption per card. */
export function htmlForCaptionSplits(html: string): string {
  return normalizeMotionHtml(html)
    .replace(/<\/?b>/gi, '')
    .split('<br/><br/>')
    .map(card => card.replace(/<br\/>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('<br/><br/>');
}

export function buildSplitAndHighlightPrompt(
  sourceHtml: string,
  options: SplitAndHighlightOptions,
  timedSource: string,
): { system: string; prompt: string } {
  const scale = options.fontScaling ?? 2;
  const frame = frameForCard(options, 0);
  const { minLines, maxLines } = resolveLineBounds(options, frame);
  const highlights = highlightsEnabled(options);
  const lineRule = lineCountRule(minLines, maxLines);

  const markupRule = highlights
    ? dedent`
      - <b>...</b> marks a word drawn large. Those words render at ${scale}× body size.
      - A bold word takes about ${scale}× the horizontal space of the same letters at body size.
    `
    : '- Do not use <b>. Every word stays at body size.';
  const highlightRules = highlights
    ? dedent`
      - Bold the word that carries the phrase: the image, the quality, the verb, the name. Not the last noun just because it ends the line.
      - "unforgiving" is the word in "of an unforgiving land", not "land".
      - "heavy" and "shell" are the weight in "I bore the heavy shell". Bold them as a pair, or bold "shell" alone. Do not bold a filler word.
      - Skip articles and filler ("the", "an", "of"). Never bold a piece of a word.
      - On a horizontal card, one line may carry the highlight and another line may be entirely plain. Do not bold a word on a later line just to balance the first.
      - The bold word owns the line.
      - Either the whole line is the bold phrase: "I bore the<br/><b>heavy shell</b>"
      - Or the bold word is alone and the words before it stay on the previous line: "I bore the heavy<br/><b>shell</b>"
      - "I bore the<br/>heavy <b>shell</b>" is wrong. A plain word must not sit beside the bold word.
      - "of an unforgiving land" becomes "Of an<br/><b>unforgiving</b><br/>land". The meaningful word is alone. "land" is not the word to scale.
    `
    : '- Do not bold any word. Do not use <b>. Every line stays plain.';
  const cardRule = options.preserveCards
    ? dedent`
      CARD BOUNDARIES ARE FIXED
      - Each CARD below is already one caption. Keep that exact number of cards, in this order.
      - Do not merge cards, split a card into new cards, or move a word onto another card.
      - <br/><br/> only separates those existing cards. Do not add or remove a separator.
      - <br/> (one break) only splits lines inside the current card.
    `
    : dedent`
      - <br/><br/> (two breaks) starts a new caption card.
      - <br/> (one break) splits lines inside the current card.
    `;

  const system = dedent`
    You are a motion-graphics animator laying out caption cards. This is not subtitling and it is not a transcript cleanup.
    Split the sentence the way a title card is read: on meaning, then on punctuation. The frame only decides how narrow the lines are.

    MARKUP — return only the html, nothing else
    - One html string for the entire piece. No preface, no explanation, no markdown fences, no timings.
    ${cardRule}
    ${markupRule}
    - Do not add, delete, reorder, merge, or rewrite words. Keep each word's punctuation attached to it.
    - No other tags. No <p>, <div>, <strong>, <i>, or markdown.

    PUNCTUATION — never break this
    - A mark ends the line it belongs to. It is the last thing on that line.
    - Never start a line or a card with . , ! ? ; : — or an ellipsis.
    - "down ." then a new line "I bore..." is correct. A new line that starts with ". I bore" is wrong.
    - "land." ends its line. "skin ." ends its line. "begin ." ends its line. The next line starts with the next word.
    - If the mark is its own word, it still stays on the line before it, after a space: "spirit down ."
    - Use a single <br/> after that line. Do not open a new card just to hold the mark.

    SENTENCE MEANING — this decides where those lines break
    - Break at a finished phrase: a subject, then what it does, then where it happens.
    - "where stifling walls" is one line. "sought to hold the spirit down ." is the next, because that is the verb phrase and it ends on the period.
    - "I bore the heavy shell" / "across the shifting sand" / "to learn the martial pulse" / "of an unforgiving land."
    - "No lunar beast slumbers" / "beneath my skin ."
    - "Just brittle bones" / "where the quiet wars begin ."
    - Keep a preposition with the phrase it opens: "across the shifting sand", "of an unforgiving land.", "beneath my skin .", "where the quiet wars begin ."
    - Do not fill a line with the next phrase just because there is room. Stop when the phrase, or its punctuation, is complete.

    LINE BREAKS — copy this break pattern. Do not lengthen a line because the frame is wide. ${lineRule}${options.preserveCards ? ' Keep the extra phrases inside this card. Do not start a new card.' : ' Then the next phrase starts a new card.'}
    ${SHORT_SQUARE_EXAMPLE}

    ON-SCREEN TIME
    Each card notes how long it is visible. That is only a hint for how many lines a viewer can read.
    Do not break on silence, word duration, or gaps. A pause is not a line break. Meaning and punctuation are.

    FRAME
    ${frameDirection(options)}
    ${lineRule} That does not move a break off a punctuation mark or out of a clause.

    HIGHLIGHTS
    ${highlightRules}
  `;

  const prompt = dedent`
    SENTENCES (on-screen time is context only — do not cut on it):
    ${timedSource}

    CURRENT ARRANGEMENT:
    ${sourceHtml}

    ${
      options.preserveCards
        ? `Rewrite line breaks${highlights ? ' and bold words' : ''} inside each existing card for ${frame}. ${lineRule} Do not change which words belong to which card.`
        : `Redesign every card for ${frame}. ${lineRule}`
    }
    ${
      highlights
        ? `Bold words are ${scale}× body size. Break on phrase meaning. Put every punctuation mark at the end of that line. Never start a line with a mark. The bold word is alone or the whole line is bold. Do not leave a plain word next to it. Bold the word that carries the phrase, not the last noun.`
        : 'Do not bold any word. Break on phrase meaning. Put every punctuation mark at the end of that line. Never start a line with a mark.'
    }
    ${
      frame === 'horizontal_box'
        ? `This is a horizontal frame. ${lineRule} Cut at punctuation and at the phrase. Do not stretch a line to fill the width.${highlights ? ' A line can have no highlight.' : ''}`
        : ''
    }
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

function isPunctuationOnly(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && /^[\p{P}\p{S}]+$/u.test(trimmed);
}

/** A mark that arrived as its own word stays on the previous line, at the end. */
function pinPunctuationToPreviousLine(marks: WordMark[]): WordMark[] {
  return marks.map((entry, index) => {
    if (index === 0 || !isPunctuationOnly(entry.word.text)) return entry;
    return { ...entry, lineBreakBefore: false, cardBreakBefore: false };
  });
}

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

  return pinPunctuationToPreviousLine(
    words.map((word, index) => {
      const mark = marks[index];
      return {
        word,
        bold: mark?.bold ?? false,
        lineBreakBefore: mark?.lineBreakBefore ?? false,
        cardBreakBefore: mark?.cardBreakBefore ?? false,
      };
    }),
  );
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

function withHtmlText(caption: Caption, htmlText: string): Caption {
  if (!htmlText.trim()) return caption;
  return {
    ...caption,
    metadata: {
      ...(caption.metadata ?? {}),
      htmlText,
    },
  };
}

/** Line breaks inside one existing card. A card separator never starts a new card. */
function htmlForCaptionWords(segmentHtml: string, words: CaptionWord[]): string {
  if (words.length === 0) return '';
  const marks = marksForSourceWords(segmentHtml, words).map((entry, index) => ({
    ...entry,
    cardBreakBefore: false,
    lineBreakBefore:
      index === 0 ? false : entry.lineBreakBefore || entry.cardBreakBefore,
  }));
  return buildCardHtml(marks);
}

/**
 * Map model HTML onto the source cards.
 * Words, timings, and card count stay. Only htmlText changes.
 */
export function htmlTextForExistingCaptions(
  html: string,
  sourceCaptions: Caption[],
): Caption[] {
  const normalized = normalizeMotionHtml(html);
  const segments = normalized
    .split(/(?:<br\/>\s*){2,}/i)
    .map(segment => segment.trim())
    .filter(Boolean);

  if (segments.length === sourceCaptions.length) {
    return sourceCaptions.map((caption, index) =>
      withHtmlText(
        caption,
        htmlForCaptionWords(segments[index], caption.words ?? []),
      ),
    );
  }

  const marks = marksForSourceWords(
    normalized,
    sourceCaptions.flatMap(caption => caption.words ?? []),
  );
  let offset = 0;
  return sourceCaptions.map(caption => {
    const count = caption.words?.length ?? 0;
    const slice = marks.slice(offset, offset + count);
    offset += count;
    return withHtmlText(caption, htmlForCaptionWordsFromMarks(slice));
  });
}

function htmlForCaptionWordsFromMarks(marks: WordMark[]): string {
  if (marks.length === 0) return '';
  return buildCardHtml(
    marks.map((entry, index) => ({
      ...entry,
      cardBreakBefore: false,
      lineBreakBefore:
        index === 0 ? false : entry.lineBreakBefore || entry.cardBreakBefore,
    })),
  );
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
  const timedSource = formatTimedCaptions(captions);
  const { system, prompt } = options.captionSplitsOnly
    ? buildCaptionSplitPrompt(sourceHtml, options, timedSource)
    : buildSplitAndHighlightPrompt(sourceHtml, options, timedSource);
  const result = await generateText({
    model: google(SPLIT_HIGHLIGHT_MODEL),
    system,
    prompt,
    maxRetries: 2,
  });

  const extracted = normalizeMotionHtml(
    extractHtmlFromModelText(result.text) || sourceHtml,
  );
  const plainHtml =
    options.highlight === false && !options.captionSplitsOnly
      ? extracted.replace(/<\/?b>/gi, '')
      : extracted;
  const modelHtml = options.captionSplitsOnly
    ? htmlForCaptionSplits(plainHtml)
    : plainHtml;
  const fixedCaptions = options.preserveCards
    ? htmlTextForExistingCaptions(modelHtml || sourceHtml, captions)
    : captionsFromMotionHtml(modelHtml || sourceHtml, captions);
  const htmlText = serializeCaptionsToHtml(fixedCaptions);
  const changes = collectChanges(captions, fixedCaptions);
  const { minLines, maxLines } = resolveLineBounds(options, frame);
  const staticFrame = options.staticFrameChoice !== false;
  const highlights = highlightsEnabled(options);
  const lineNote =
    minLines > 0 && minLines >= maxLines
      ? `${minLines} lines`
      : minLines > 0
        ? `${minLines}–${maxLines} lines`
        : `up to ${maxLines} lines`;
  const highlightNote = highlights
    ? `bold words at ${options.fontScaling ?? 2}×`
    : 'no highlights';
  const summary = options.captionSplitsOnly
    ? `Split ${captions.length} captions into ${fixedCaptions.length} for ${frame} (${options.lineLength ?? 'medium'}, ${staticFrame ? 'one frame for every caption' : 'per-caption frames reserved'}).`
    : options.preserveCards
      ? `Updated htmlText on ${fixedCaptions.length} caption cards for ${frame} (${lineNote}, ${highlightNote}).`
      : dedent`
      Arranged ${captions.length} caption cards into ${fixedCaptions.length} for ${frame}
      (${lineNote}, ${highlightNote}, ${staticFrame ? 'one frame for every card' : 'per-card frames reserved'}).
    `
          .replace(/\s+/g, ' ')
          .trim();

  return {
    htmlText,
    fixedCaptions,
    changes,
    confidence: 0.86,
    usage: result.usage,
    staticFrameChoice: staticFrame,
    summary,
  };
}
