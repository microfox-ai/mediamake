/**
 * Caption htmlText helpers
 *
 * htmlText encodes highlight + line breaks in one string, e.g.:
 *   "<b>Hero</b> is the main character <br/> of everything"
 *
 * - <b>/<strong> → highlighted words (matched sequentially to caption.words)
 * - <br/> / paragraph breaks → splitParts / line breaks
 */

export type CaptionHtmlParseResult = {
  /** Plain-text line parts derived from <br/> / block breaks */
  splitParts: string[];
  /** Word indices (into the provided words array) marked bold */
  highlightedWordIndices: number[];
  /** Full plain text without tags */
  plainText: string;
};

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/gi,
    match => ENTITY_MAP[match.toLowerCase()] ?? match,
  );
}

function cleanToken(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

type HtmlToken =
  | { type: 'word'; text: string; bold: boolean }
  | { type: 'break' };

/**
 * Normalize TipTap / free-form HTML into ordered word + break tokens.
 */
export function tokenizeCaptionHtml(htmlText: string): HtmlToken[] {
  let html = decodeEntities(htmlText);

  // TipTap paragraphs → line breaks between blocks
  html = html
    .replace(/<\/p>\s*<p[^>]*>/gi, '<br/>')
    .replace(/<\/div>\s*<div[^>]*>/gi, '<br/>')
    .replace(/<\/h[1-6]>\s*<h[1-6][^>]*>/gi, '<br/>')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/<\/?h[1-6][^>]*>/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '<br/>');

  const tokens: HtmlToken[] = [];
  const regex =
    /<(br)\s*\/?\s*>|<\/?(strong|b|em|i)(?:\s[^>]*)?>|([^<]+)/gi;

  let boldDepth = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      tokens.push({ type: 'break' });
      continue;
    }

    if (match[2]) {
      const tag = match[2].toLowerCase();
      const isClose = match[0].startsWith('</');
      if (tag === 'strong' || tag === 'b') {
        boldDepth = Math.max(0, boldDepth + (isClose ? -1 : 1));
      }
      continue;
    }

    if (match[3]) {
      const parts = match[3].split(/\s+/).filter(Boolean);
      for (const part of parts) {
        tokens.push({
          type: 'word',
          text: part,
          bold: boldDepth > 0,
        });
      }
    }
  }

  return tokens;
}

/**
 * Parse caption metadata.htmlText against timed words.
 * Alignment is sequential (position-based), so repeated words and
 * substring collisions (e.g. "hero" vs "heroes") are handled correctly.
 */
export function parseCaptionHtmlText(
  htmlText: string | null | undefined,
  words: Array<{ text?: string }>,
): CaptionHtmlParseResult | null {
  if (!htmlText || typeof htmlText !== 'string' || !htmlText.trim()) {
    return null;
  }
  if (!Array.isArray(words) || words.length === 0) {
    return null;
  }

  const tokens = tokenizeCaptionHtml(htmlText);
  const highlightedWordIndices: number[] = [];
  const splitParts: string[] = [];
  let currentPart: string[] = [];
  let wordIndex = 0;

  const flushPart = () => {
    if (currentPart.length > 0) {
      splitParts.push(currentPart.join(' '));
      currentPart = [];
    }
  };

  for (const token of tokens) {
    if (token.type === 'break') {
      flushPart();
      continue;
    }

    if (wordIndex >= words.length) break;

    // Advance past empty / punctuation-only caption words
    while (
      wordIndex < words.length &&
      !cleanToken(words[wordIndex]?.text ?? '')
    ) {
      currentPart.push(words[wordIndex]?.text ?? '');
      wordIndex++;
    }
    if (wordIndex >= words.length) break;

    const captionWord = words[wordIndex];
    const captionClean = cleanToken(captionWord?.text ?? '');
    const tokenClean = cleanToken(token.text);

    // Prefer exact clean match; otherwise consume in order (agent/html order wins)
    const matched =
      !tokenClean ||
      !captionClean ||
      captionClean === tokenClean ||
      captionClean.startsWith(tokenClean) ||
      tokenClean.startsWith(captionClean);

    if (matched) {
      if (token.bold) {
        highlightedWordIndices.push(wordIndex);
      }
      currentPart.push(captionWord?.text ?? token.text);
      wordIndex++;
    } else {
      // Mismatch: still consume caption word to stay in sync
      if (token.bold) {
        highlightedWordIndices.push(wordIndex);
      }
      currentPart.push(captionWord?.text ?? token.text);
      wordIndex++;
    }
  }

  flushPart();

  // If html had fewer line breaks than words remaining, append leftovers to last part
  if (wordIndex < words.length) {
    const leftovers = words.slice(wordIndex).map(w => w.text ?? '');
    if (splitParts.length > 0) {
      splitParts[splitParts.length - 1] = [
        splitParts[splitParts.length - 1],
        ...leftovers,
      ]
        .filter(Boolean)
        .join(' ');
    } else if (leftovers.length > 0) {
      splitParts.push(leftovers.join(' '));
    }
  }

  const plainText = words.map(w => w.text ?? '').join(' ').trim();

  return {
    splitParts: splitParts.length > 0 ? splitParts : [plainText],
    highlightedWordIndices: [...new Set(highlightedWordIndices)],
    plainText,
  };
}

/**
 * Extract bolded keyword phrase(s) from htmlText for legacy consumers.
 */
export function extractKeywordsFromHtmlText(
  htmlText: string | null | undefined,
): string {
  if (!htmlText?.trim()) return '';
  const tokens = tokenizeCaptionHtml(htmlText);
  const boldWords = tokens
    .filter((t): t is { type: 'word'; text: string; bold: boolean } =>
      t.type === 'word' && t.bold,
    )
    .map(t => t.text);
  return boldWords.join(' ');
}

/**
 * Build htmlText from legacy keyword + splitParts (or plain caption text).
 */
export function buildHtmlTextFromLegacy(options: {
  text?: string;
  keyword?: string;
  splitParts?: string[];
}): string {
  const { text = '', keyword = '', splitParts } = options;
  const lines =
    splitParts && splitParts.length > 0
      ? splitParts.map(p => p.trim()).filter(Boolean)
      : [text.trim()].filter(Boolean);

  if (lines.length === 0) return '';

  const keywordTokens = keyword
    .trim()
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean);

  // Track how many times each keyword token has been applied so repeats
  // in keyword still only bold the first sequential matches overall.
  let keywordCursor = 0;

  const boldLine = (line: string): string => {
    if (keywordTokens.length === 0) return escapeHtml(line);

    const words = line.split(/\s+/).filter(Boolean);
    return words
      .map(word => {
        const cleaned = cleanToken(word);
        if (
          keywordCursor < keywordTokens.length &&
          cleaned &&
          (cleaned === keywordTokens[keywordCursor] ||
            cleaned.includes(keywordTokens[keywordCursor]) ||
            keywordTokens[keywordCursor].includes(cleaned))
        ) {
          keywordCursor++;
          return `<b>${escapeHtml(word)}</b>`;
        }
        return escapeHtml(word);
      })
      .join(' ');
  };

  return lines.map(boldLine).join('<br/>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Resolve splitParts + highlight indices from caption metadata,
 * preferring htmlText over legacy keyword / splitParts.
 */
export function resolveCaptionHighlightMeta(
  metadata: Record<string, any> | null | undefined,
  words: Array<{ text?: string }>,
  options?: { disableMetadata?: boolean },
): {
  splitParts?: string[];
  highlightedWordIndices: number[];
  usedHtmlText: boolean;
} {
  if (options?.disableMetadata || !metadata) {
    return { highlightedWordIndices: [], usedHtmlText: false };
  }

  const parsed = parseCaptionHtmlText(metadata.htmlText, words);
  if (parsed) {
    return {
      splitParts: parsed.splitParts,
      highlightedWordIndices: parsed.highlightedWordIndices,
      usedHtmlText: true,
    };
  }

  // Legacy keyword matching (kept for older transcriptions)
  const highlightedWordIndices: number[] = [];
  if (metadata.keyword && String(metadata.keyword).length > 0) {
    const cleanKeywords = String(metadata.keyword)
      .toLowerCase()
      .split(/\s+/)
      .map((k: string) => k.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);

    // Sequential match: walk keywords in order against words once
    let keywordIdx = 0;
    words.forEach((word, index) => {
      if (keywordIdx >= cleanKeywords.length) return;
      const cleanWord = (word.text ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (!cleanWord) return;
      const target = cleanKeywords[keywordIdx];
      if (
        cleanWord === target ||
        cleanWord.includes(target) ||
        target.includes(cleanWord)
      ) {
        highlightedWordIndices.push(index);
        keywordIdx++;
      }
    });
  }

  return {
    splitParts: Array.isArray(metadata.splitParts)
      ? metadata.splitParts
      : undefined,
    highlightedWordIndices,
    usedHtmlText: false,
  };
}
