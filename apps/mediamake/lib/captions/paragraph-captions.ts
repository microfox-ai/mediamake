import { generateId } from '@microfox/datamotion';
import type { Caption } from '@/app/types/transcription';
import { extractKeywordsFromHtmlText } from '@/lib/captions/html-text';

const WORD_DURATION = 1;

/**
 * Keep paragraph structure. Each <p> is one caption sentence.
 * <b>/<strong> stay as highlights inside that sentence.
 */
export function normalizeSentenceHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<\s*strong\b[^>]*>/gi, '<b>')
    .replace(/<\/\s*strong\s*>/gi, '</b>')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function plainFromLine(lineHtml: string): string {
  return lineHtml
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Turn sentence-per-line HTML into timed captions. Each line is one sentence. */
export function captionsFromSentenceHtml(html: string): Caption[] {
  const normalized = normalizeSentenceHtml(html);
  const chunks = normalized
    .split(/<\/p>\s*<p[^>]*>/i)
    .map(chunk => chunk.replace(/<\/?p[^>]*>/gi, '').replace(/\s+/g, ' ').trim())
    .filter(chunk => plainFromLine(chunk).length > 0);

  let abs = 0;
  return chunks.map(lineHtml => {
    const plain = plainFromLine(lineHtml);
    const tokens = plain.split(/\s+/).filter(Boolean);
    const lineStart = abs;
    const words = tokens.map(text => {
      const start = abs;
      const end = abs + WORD_DURATION;
      abs = end;
      return {
        id: generateId(),
        text,
        absoluteStart: start,
        absoluteEnd: end,
        start: start - lineStart,
        end: end - lineStart,
        duration: WORD_DURATION,
        confidence: 1,
      };
    });
    const absoluteEnd = words.length > 0 ? words[words.length - 1].absoluteEnd : lineStart + WORD_DURATION;
    if (words.length === 0) abs = absoluteEnd;
    const keyword = extractKeywordsFromHtmlText(lineHtml);
    return {
      id: generateId(),
      text: plain,
      absoluteStart: lineStart,
      absoluteEnd,
      start: lineStart,
      end: absoluteEnd,
      duration: absoluteEnd - lineStart,
      words,
      metadata: {
        htmlText: lineHtml,
        ...(keyword ? { keyword } : {}),
      },
    };
  });
}
