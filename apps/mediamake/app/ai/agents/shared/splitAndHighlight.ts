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

export const LINE_LENGTHS = ['short', 'medium', 'large'] as const;

export type CaptionLayout = (typeof CAPTION_LAYOUTS)[number];
export type LineLength = (typeof LINE_LENGTHS)[number];

export const SplitAndHighlightParamsSchema = z.object({
  frameChoice: z
    .enum(CAPTION_LAYOUTS)
    .describe(
      'The frame every card uses while staticFrameChoice is true. vertical_box is a 3:4 vertical rectangle. horizontal_box is a 16:9 horizontal rectangle. square_box is a 1:1 square.',
    ),
  lineLength: z
    .enum(LINE_LENGTHS)
    .default('medium')
    .describe(
      'How many words sit on a line. short, medium, or large. Meaning and punctuation still decide where a line is allowed to break.',
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
      'Defaults to true. Every card uses frameChoice. A later pass may set this false so each card can choose its own frame.',
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
  { maxLines: number; shape: string; mediumExample: string; largeExample: string }
> = {
  vertical_box: {
    maxLines: 5,
    shape: 'VERTICAL RECTANGLE, 3:4. Narrow and tall. Up to 5 lines.',
    mediumExample:
      'A<br/>sudden<br/>blinding<br/><b>sunburst</b><br/><br/>to<br/>blind the<br/><b>tyrant\'s</b><br/>gaze',
    largeExample:
      'A sudden blinding<br/><b>sunburst</b><br/>to blind the<br/><b>tyrant\'s</b><br/>gaze',
  },
  horizontal_box: {
    maxLines: 2,
    shape:
      'HORIZONTAL RECTANGLE, 16:9. Wide and short. At most 2 lines. A bold word can sit on the same line as the words around it.',
    mediumExample:
      'A sudden blinding<br/><b>sunburst</b><br/><br/>to blind the<br/><b>tyrant\'s gaze</b>',
    largeExample:
      'A sudden blinding <b>sunburst</b><br/>to <b>blind</b> the tyrant\'s gaze',
  },
  square_box: {
    maxLines: 4,
    shape:
      'SQUARE, 1:1. Between the tall frame and the wide frame. Up to 4 lines.',
    mediumExample:
      'A<br/>sudden blinding<br/><b>sunburst</b><br/><br/>to blind the<br/><b>tyrant\'s</b><br/>gaze',
    largeExample:
      'A sudden blinding<br/><b>sunburst</b><br/>to blind the<br/>tyrant\'s gaze',
  },
};

const LINE_LENGTH_SPEC: Record<LineLength, string> = {
  short:
    'SHORT LINES — fewer words than the medium example. One word a line on the tall frame, one or two on the square, two or three on the wide frame. A clause may split into two cards where the image turns, the way the medium example splits after sunburst.',
  medium:
    'MEDIUM LINES — follow the medium example. A turn in the image may start a new card, the way sunburst closes one card and "to blind..." opens the next.',
  large:
    'LARGE LINES — follow the large example. Keep one clause in one card. "A sudden blinding sunburst to blind the tyrant\'s gaze" is one card. Only a period, or a comma that finishes the thought, starts the next card. "year." still ends the card before "A sudden...". "gaze," still ends before "a solitary spark".',
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
  const lineLength = options.lineLength ?? 'medium';
  const example =
    lineLength === 'large' ? spec.largeExample : spec.mediumExample;
  const shared = dedent`
    ${spec.shape}
    ${LINE_LENGTH_SPEC[lineLength]}
    ${spec.maxLines} lines is the ceiling. Use fewer when the clause is shorter.

    ${lineLength === 'short' ? 'MEDIUM' : lineLength.toUpperCase()} wrap for "${frame}", phrase "A sudden blinding sunburst to blind the tyrant's gaze":
    ${example}
    Copy this rhythm: which words share a line, which word is bold, and whether sunburst ends the card.
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

export function buildSplitAndHighlightPrompt(
  sourceHtml: string,
  options: SplitAndHighlightOptions,
  timedSource: string,
): { system: string; prompt: string } {
  const scale = options.fontScaling ?? 2;
  const frame = frameForCard(options, 0);
  const lineLength = options.lineLength ?? 'medium';

  const system = dedent`
    You are a motion-graphics animator laying out caption cards. This is not subtitling and it is not a transcript cleanup.
    Split the sentence the way a title card is read: on meaning, then on punctuation. The frame only decides how narrow the lines are.

    MARKUP — return only the html, nothing else
    - One html string for the entire piece. No preface, no explanation, no markdown fences, no timings.
    - <br/><br/> (two breaks) starts a new caption card.
    - <br/> (one break) splits lines inside the current card.
    - <b>...</b> marks a word drawn large. Those words render at ${scale}× body size.
    - A bold word takes about ${scale}× the horizontal space of the same letters at body size.
    - Do not add, delete, reorder, merge, or rewrite words. Keep each word's punctuation attached to it.
    - No other tags. No <p>, <div>, <strong>, <i>, or markdown.

    SENTENCE STRUCTURE — this decides every break
    - Read the sentence. A finished thought becomes its own card. A clause inside that thought becomes its own line.
    - A period, question mark, or exclamation mark ends the card. The word that carries the mark is the last word of that card. "death." ends the card. The next sentence starts the next card.
    - A comma, semicolon, colon, dash, or ellipsis ends the line it sits on. "dirt," ends that line. "burn," ends that line. The next line starts at the next word.
    - Never start a line or a card with a punctuation mark. ", I am the" is wrong. The comma stays on the word before it.
    - Never leave the first word of the next sentence hanging on the previous card. "death. I" then "knew" is wrong. "death." closes the card. "I knew" opens the next card and stays together.
    - Never strand a pronoun or an article away from the words it belongs to. "I" stays with "knew" or "am". "the" stays with the noun after it.
    - A purpose clause or a new image can start a new card even without a period: "sunburst" ends one card, "to blind the tyrant's gaze" is the next.
    - Do not break a clause just because a word is short, and do not keep two sentences on one line because they are brief.

    ON-SCREEN TIME
    Each card notes how long it is visible. That is only a hint for how many lines a viewer can read.
    Do not break on silence, word duration, or gaps. A pause is not a line break. Meaning and punctuation are.

    FRAME AND LINE LENGTH
    ${frameDirection({ ...options, lineLength })}
    Line length is ${lineLength}. It changes how many words share a line. It does not move a break off a punctuation mark or out of a clause.

    HIGHLIGHTS
    - Bold the word the line is built to land on: the image, the name, the verb, the turn.
    - On a wide line, a tight landing phrase may be bold together ("tyrant's gaze") when those words are one hit.
    - On a tall or square line, the hero word is usually alone on its line.
    - Skip articles and filler. Never bold a piece of a word. Never start a line with a comma inside the bold.
  `;

  const prompt = dedent`
    SENTENCES (on-screen time is context only — do not cut on it):
    ${timedSource}

    CURRENT ARRANGEMENT:
    ${sourceHtml}

    Redesign every card for ${frame} with ${lineLength} lines. Bold words are ${scale}× body size.
    Break on the sentence: meaning first, then punctuation. Keep every mark on the line it closes.
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
      (${options.lineLength ?? 'medium'} lines, up to ${layout.maxLines}, bold words at ${options.fontScaling ?? 2}×, ${staticFrame ? 'one frame for every card' : 'per-card frames reserved'}).
    `
      .replace(/\s+/g, ' ')
      .trim(),
  };
}
