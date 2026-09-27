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

const DEFAULT_NEW_WORD_DURATION = 1;
const MIN_WORD_GAP = 0.01;

/**
 * Build htmlText from timed words.
 * - If `prevHtmlText` is empty → single plain line, nothing bold.
 * - If present → keep prior bold flags + `<br/>` breaks, swap in new word texts.
 */
export function syncHtmlTextFromWords(
  words: Array<{ text?: string }>,
  prevHtmlText?: string | null,
): string {
  const wordTexts = words.map(w => String(w.text ?? ''));
  if (wordTexts.length === 0) return '';

  if (!prevHtmlText?.trim()) {
    return wordTexts.map(t => escapeHtml(t)).join(' ');
  }

  const tokens = tokenizeCaptionHtml(prevHtmlText);
  const boldByIndex: boolean[] = [];
  const breakBeforeIndex = new Set<number>();
  let wi = 0;
  let pendingBreak = false;
  for (const token of tokens) {
    if (token.type === 'break') {
      pendingBreak = true;
      continue;
    }
    if (pendingBreak && wi > 0) breakBeforeIndex.add(wi);
    pendingBreak = false;
    boldByIndex[wi] = token.bold;
    wi++;
  }

  const parts: string[] = [];
  for (let i = 0; i < wordTexts.length; i++) {
    if (i > 0) {
      parts.push(breakBeforeIndex.has(i) ? '<br/>' : ' ');
    }
    const escaped = escapeHtml(wordTexts[i]);
    parts.push(boldByIndex[i] ? `<b>${escaped}</b>` : escaped);
  }
  return parts.join('');
}

function letterWeight(text: string): number {
  return Math.max(1, text.replace(/\s+/g, '').length);
}

function getWordAbs(
  word: Record<string, unknown> | undefined,
): { start: number; end: number } {
  if (!word) return { start: 0, end: 0 };
  const start = Number(word.absoluteStart ?? word.start ?? 0) || 0;
  const end = Number(word.absoluteEnd ?? word.end ?? start) || start;
  return { start, end: Math.max(end, start) };
}

function resolveLineScope(
  prevWords: Array<Record<string, unknown>>,
  lineBounds?: { start?: number; end?: number },
): { start: number; end: number } {
  if (
    typeof lineBounds?.start === 'number' &&
    typeof lineBounds?.end === 'number' &&
    lineBounds.end > lineBounds.start
  ) {
    return { start: lineBounds.start, end: lineBounds.end };
  }
  if (prevWords.length === 0) {
    return { start: 0, end: DEFAULT_NEW_WORD_DURATION };
  }
  const first = getWordAbs(prevWords[0]);
  const last = getWordAbs(prevWords[prevWords.length - 1]);
  return {
    start: first.start,
    end: Math.max(last.end, first.start + MIN_WORD_GAP),
  };
}

function withRelativeTiming(
  words: Array<Record<string, unknown>>,
  lineStart: number,
): Array<Record<string, unknown>> {
  return words.map(w => {
    const a = Number(w.absoluteStart ?? 0) || 0;
    const b = Number(w.absoluteEnd ?? a) || a;
    return {
      ...w,
      absoluteStart: a,
      absoluteEnd: b,
      start: a - lineStart,
      end: b - lineStart,
      duration: Math.max(0, b - a),
    };
  });
}

/** Split [spanStart, spanEnd] across items by letter length. */
function distributeByLetterLength(
  items: Array<{ text: string; base?: Record<string, unknown> }>,
  spanStart: number,
  spanEnd: number,
): Array<Record<string, unknown>> {
  if (items.length === 0) return [];
  const span = Math.max(spanEnd - spanStart, items.length * MIN_WORD_GAP);
  const weights = items.map(i => letterWeight(i.text));
  const totalW = weights.reduce((a, b) => a + b, 0) || items.length;
  let t = spanStart;
  const out: Array<Record<string, unknown>> = [];
  for (let i = 0; i < items.length; i++) {
    const isLast = i === items.length - 1;
    const dur = isLast
      ? Math.max(MIN_WORD_GAP, spanEnd - t)
      : Math.max(MIN_WORD_GAP, (weights[i]! / totalW) * span);
    const absoluteStart = t;
    const absoluteEnd = isLast ? spanEnd : t + dur;
    // Avoid overshoot before last
    const clampedEnd = Math.min(absoluteEnd, spanEnd - (items.length - 1 - i) * MIN_WORD_GAP);
    const end = isLast ? spanEnd : Math.max(absoluteStart + MIN_WORD_GAP, clampedEnd);
    const base = items[i]!.base;
    out.push({
      ...(base ?? {
        id: `w_${Date.now().toString(36)}_${i}`,
        confidence: 1,
      }),
      text: items[i]!.text,
      absoluteStart,
      absoluteEnd: end,
    });
    t = end;
  }
  return out;
}

type AlignOp =
  | { type: 'keep'; oldIndex: number; newIndex: number }
  | { type: 'insert'; newIndex: number }
  | { type: 'delete'; oldIndex: number };

/** LCS-based alignment of old vs new word tokens (clean-token equality). */
function alignWordSequences(oldTexts: string[], newTexts: string[]): AlignOp[] {
  const n = oldTexts.length;
  const m = newTexts.length;
  const oldClean = oldTexts.map(t => cleanToken(t));
  const newClean = newTexts.map(t => cleanToken(t));

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldClean[i - 1] && oldClean[i - 1] === newClean[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  const opsRev: AlignOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      oldClean[i - 1] &&
      oldClean[i - 1] === newClean[j - 1]
    ) {
      opsRev.push({ type: 'keep', oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      opsRev.push({ type: 'insert', newIndex: j - 1 });
      j--;
    } else {
      opsRev.push({ type: 'delete', oldIndex: i - 1 });
      i--;
    }
  }
  return opsRev.reverse();
}

/**
 * Apply htmlText tokens onto timed words.
 * New words stay inside the line scope; space is taken only from the
 * immediate left/right neighbors (by letter length), not the whole line.
 */
export function syncWordsFromHtmlText(
  htmlText: string,
  prevWords: Array<Record<string, unknown>> = [],
  lineBounds?: { start?: number; end?: number },
): { text: string; words: Array<Record<string, unknown>> } {
  const tokens = tokenizeCaptionHtml(htmlText);
  const wordTokens = tokens.filter(
    (t): t is { type: 'word'; text: string; bold: boolean } => t.type === 'word',
  );
  const newTexts = wordTokens.map(t => t.text);
  const text = newTexts.join(' ').trim();
  const scope = resolveLineScope(prevWords, lineBounds);

  if (newTexts.length === 0) {
    return { text: '', words: [] };
  }

  // No previous words → fill the whole line by letter length
  if (prevWords.length === 0) {
    const distributed = distributeByLetterLength(
      newTexts.map(t => ({ text: t })),
      scope.start,
      scope.end,
    );
    return { text, words: withRelativeTiming(distributed, scope.start) };
  }

  // Same count → update texts only, keep timings (clamped into line)
  if (newTexts.length === prevWords.length) {
    const words = prevWords.map((prev, i) => {
      const { start, end } = getWordAbs(prev);
      return {
        ...prev,
        text: newTexts[i],
        absoluteStart: Math.max(scope.start, start),
        absoluteEnd: Math.min(scope.end, Math.max(end, start + MIN_WORD_GAP)),
      };
    });
    return { text, words: withRelativeTiming(words, scope.start) };
  }

  const oldTexts = prevWords.map(w => String(w.text ?? ''));
  const ops = alignWordSequences(oldTexts, newTexts);

  // Seed result slots from keeps; placeholders for inserts
  type Slot =
    | {
        kind: 'keep';
        text: string;
        base: Record<string, unknown>;
        start: number;
        end: number;
      }
    | { kind: 'insert'; text: string }
    | { kind: 'delete'; start: number; end: number; text: string };

  const slots: Slot[] = [];
  for (const op of ops) {
    if (op.type === 'keep') {
      const base = prevWords[op.oldIndex]!;
      const { start, end } = getWordAbs(base);
      slots.push({
        kind: 'keep',
        text: newTexts[op.newIndex]!,
        base: { ...base },
        start,
        end,
      });
    } else if (op.type === 'insert') {
      slots.push({ kind: 'insert', text: newTexts[op.newIndex]! });
    } else {
      const { start, end } = getWordAbs(prevWords[op.oldIndex]);
      slots.push({
        kind: 'delete',
        start,
        end,
        text: oldTexts[op.oldIndex]!,
      });
    }
  }

  // Absorb deletions into neighboring keep/insert groups later;
  // first collapse deletes by expanding adjacent keep timings.
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    if (s.kind !== 'delete') continue;
    const left = [...slots.slice(0, i)].reverse().find(x => x.kind === 'keep') as
      | Extract<Slot, { kind: 'keep' }>
      | undefined;
    const right = slots.slice(i + 1).find(x => x.kind === 'keep') as
      | Extract<Slot, { kind: 'keep' }>
      | undefined;
    if (left && right) {
      // Freed span split by letter length between left & right
      const freed = Math.max(0, s.end - s.start);
      if (freed > 0) {
        const lw = letterWeight(left.text);
        const rw = letterWeight(right.text);
        const mid = left.end + (freed * lw) / (lw + rw);
        // left already ends at s.start typically; extend left to mid, right starts at mid
        left.end = Math.max(left.end, Math.min(mid, right.start));
        right.start = Math.min(right.start, Math.max(mid, left.end));
      }
    } else if (left) {
      left.end = Math.max(left.end, s.end);
    } else if (right) {
      right.start = Math.min(right.start, s.start);
    }
  }

  const active = slots.filter(s => s.kind !== 'delete') as Array<
    Extract<Slot, { kind: 'keep' | 'insert' }>
  >;

  // Redistribute each insertion cluster using only left/right neighbors
  const result: Array<Record<string, unknown>> = [];
  let idx = 0;
  while (idx < active.length) {
    if (active[idx]!.kind === 'keep') {
      const k = active[idx] as Extract<Slot, { kind: 'keep' }>;
      // Peek if next are inserts — handled when we hit inserts with left keep
      if (idx + 1 < active.length && active[idx + 1]!.kind === 'insert') {
        // collect insert run
        let j = idx + 1;
        while (j < active.length && active[j]!.kind === 'insert') j++;
        const inserts = active.slice(idx + 1, j) as Array<
          Extract<Slot, { kind: 'insert' }>
        >;
        const right =
          j < active.length && active[j]!.kind === 'keep'
            ? (active[j] as Extract<Slot, { kind: 'keep' }>)
            : null;

        const spanStart = k.start;
        const spanEnd = right ? right.end : scope.end;
        const group = [
          { text: k.text, base: k.base },
          ...inserts.map(ins => ({ text: ins.text })),
          ...(right ? [{ text: right.text, base: right.base }] : []),
        ];
        const distributed = distributeByLetterLength(
          group,
          spanStart,
          Math.max(spanEnd, spanStart + group.length * MIN_WORD_GAP),
        );
        result.push(...distributed);
        idx = right ? j + 1 : j;
        continue;
      }

      result.push({
        ...k.base,
        text: k.text,
        absoluteStart: Math.max(scope.start, k.start),
        absoluteEnd: Math.min(scope.end, Math.max(k.end, k.start + MIN_WORD_GAP)),
      });
      idx++;
      continue;
    }

    // Leading inserts (before first keep)
    let j = idx;
    while (j < active.length && active[j]!.kind === 'insert') j++;
    const inserts = active.slice(idx, j) as Array<
      Extract<Slot, { kind: 'insert' }>
    >;
    const right =
      j < active.length && active[j]!.kind === 'keep'
        ? (active[j] as Extract<Slot, { kind: 'keep' }>)
        : null;
    const spanStart = scope.start;
    const spanEnd = right ? right.end : scope.end;
    const group = [
      ...inserts.map(ins => ({ text: ins.text })),
      ...(right ? [{ text: right.text, base: right.base }] : []),
    ];
    const distributed = distributeByLetterLength(
      group,
      spanStart,
      Math.max(spanEnd, spanStart + group.length * MIN_WORD_GAP),
    );
    result.push(...distributed);
    idx = right ? j + 1 : j;
  }

  // Final clamp into line scope
  const clamped = result.map(w => {
    const { start, end } = getWordAbs(w);
    const a = Math.max(scope.start, Math.min(start, scope.end - MIN_WORD_GAP));
    const b = Math.min(scope.end, Math.max(end, a + MIN_WORD_GAP));
    return { ...w, absoluteStart: a, absoluteEnd: b };
  });

  return { text, words: withRelativeTiming(clamped, scope.start) };
}

/**
 * Apply plain full-line text onto timed words + rebuild htmlText.
 */
export function syncFromPlainText(
  plainText: string,
  prevWords: Array<Record<string, unknown>> = [],
  prevHtmlText?: string | null,
  lineBounds?: { start?: number; end?: number },
): {
  text: string;
  words: Array<Record<string, unknown>>;
  htmlText: string;
} {
  const tokens = plainText.trim().split(/\s+/).filter(Boolean);
  const synthetic = tokens.map(t => escapeHtml(t)).join(' ');
  const { text, words } = syncWordsFromHtmlText(
    synthetic,
    prevWords,
    lineBounds,
  );
  const htmlText = syncHtmlTextFromWords(words, prevHtmlText);
  return { text, words, htmlText };
}

/**
 * After words edit: refresh plain text + htmlText (+ legacy keyword/splitParts).
 */
export function syncCaptionFieldsFromWords(
  words: Array<Record<string, unknown>>,
  prevMetadata: Record<string, unknown> = {},
): {
  text: string;
  metadata: Record<string, unknown>;
} {
  const text = words
    .map(w => String(w.text ?? ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const prevHtml =
    typeof prevMetadata.htmlText === 'string' ? prevMetadata.htmlText : null;
  const htmlText = syncHtmlTextFromWords(words, prevHtml);
  const keyword = extractKeywordsFromHtmlText(htmlText);
  const parsed = parseCaptionHtmlText(htmlText, words);
  return {
    text,
    metadata: {
      ...prevMetadata,
      htmlText,
      keyword,
      ...(parsed?.splitParts ? { splitParts: parsed.splitParts } : {}),
    },
  };
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
