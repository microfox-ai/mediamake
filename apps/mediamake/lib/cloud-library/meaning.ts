/**
 * Search by meaning (docs/library.md › Search by meaning). MongoDB stays the truth and answers the
 * exact questions (every unreleased song, every song without a transcript). An Upstash Vector hybrid
 * index only ranks by meaning ("the sad sea song"): it holds each entry's card, its long texts in
 * pieces and its timed transcript in pieces, one namespace a collection, and is rebuilt from the
 * records at any time (`mm library reindex`).
 *
 * Pure: what goes in the index and how its answers are read. ./meaning-store talks to Upstash.
 */
import type { CollectionRecord, EntryRecord } from './index';

/** A piece of long text is about this long, cut at line ends. */
export const PIECE_CHARS = 700;
/** A piece of a timed transcript covers about this many seconds. */
export const PIECE_SECONDS = 30;
/** An entry sends at most this many records, so one long file cannot fill the index. */
export const MAX_RECORDS = 120;

export interface MeaningRecord {
  id: string;
  /** The text Upstash embeds. */
  data: string;
  metadata: {
    entry: string;
    title: string;
    /** card: the entry's card. text: a piece of a long field. transcript: a timed piece of a file. */
    kind: 'card' | 'text' | 'transcript';
    /** The field or the file slot the piece is from. */
    what?: string;
    /** Seconds, for a timed piece. */
    from?: number;
    to?: number;
  };
}

/** A collection's namespace in the index: one a collection, so sharing or removing one is one name. */
export const namespaceOf = (space: string, collection: string) => `${space}-${collection}`;

/** Every record of one entry starts with this, so they are removed together. */
export const prefixOf = (entry: string) => `${entry}#`;

/** The entry a record's id belongs to. */
export const entryOfId = (id: string) => id.slice(0, Math.max(0, id.indexOf('#')));

/** Long text in pieces of about PIECE_CHARS, cut at line ends (a verse stays whole when it fits). */
export function textPieces(text: string, size = PIECE_CHARS): string[] {
  const pieces: string[] = [];
  let now = '';
  for (const block of text.replace(/\r/g, '').split(/\n{2,}/)) {
    for (const line of block.length > size ? block.split('\n') : [block]) {
      const part = line.trim();
      if (!part) continue;
      if (now && now.length + part.length + 1 > size) {
        pieces.push(now);
        now = '';
      }
      // a single line longer than a piece is cut by length
      for (let at = 0; at < part.length; at += size) {
        const cut = part.slice(at, at + size);
        if (cut.length === size) pieces.push(cut);
        else now = now ? `${now}\n${cut}` : cut;
      }
    }
  }
  if (now) pieces.push(now);
  return pieces;
}

/** A transcript's timed words, however the file names them (the shapes `readPart` reads). */
export function timedWords(content: string): { start: number; end: number; text: string }[] {
  try {
    const raw = JSON.parse(content);
    const words = Array.isArray(raw) ? raw : (raw?.words ?? raw?.transcripts?.[0]?.words ?? raw?.transcript?.words);
    if (!Array.isArray(words)) return [];
    return words
      .map((word: { start?: unknown; end?: unknown; text?: unknown; word?: unknown }) => ({ start: Number(word.start), end: Number(word.end ?? word.start), text: String(word.text ?? word.word ?? '').trim() }))
      .filter(word => Number.isFinite(word.start) && word.text);
  } catch {
    return [];
  }
}

/** Timed words in pieces of about PIECE_SECONDS, each with the seconds it covers. */
export function timedPieces(words: { start: number; end: number; text: string }[], seconds = PIECE_SECONDS): { from: number; to: number; text: string }[] {
  const pieces: { from: number; to: number; text: string }[] = [];
  for (const word of words) {
    const last = pieces.at(-1);
    if (last && word.start - last.from < seconds) {
      last.text += ` ${word.text}`;
      last.to = Math.max(last.to, word.end);
    } else pieces.push({ from: word.start, to: word.end, text: word.text });
  }
  return pieces.map(piece => ({ from: Math.floor(piece.from), to: Math.ceil(piece.to), text: piece.text.replace(/\s+/g, ' ') }));
}

/**
 * What one entry puts in the index: its card, its long fields in pieces, and each text or timed
 * file given in `texts` (by slot) in pieces. Every piece starts with the entry's title, so a piece
 * found alone still says what it is from.
 */
export function recordsOf(collection: Pick<CollectionRecord, 'template'>, entry: Pick<EntryRecord, 'slug' | 'title' | 'card' | 'fields'>, texts: Record<string, string> = {}): MeaningRecord[] {
  const base = { entry: entry.slug, title: entry.title };
  const records: MeaningRecord[] = [{ id: `${prefixOf(entry.slug)}card`, data: entry.card, metadata: { ...base, kind: 'card' } }];
  for (const field of collection.template.fields) {
    const value = entry.fields[field.key];
    if (field.kind !== 'longtext' || typeof value !== 'string' || !value.trim()) continue;
    textPieces(value).forEach((piece, n) => records.push({ id: `${prefixOf(entry.slug)}f:${field.key}:${n}`, data: `${entry.title} · ${field.label}\n${piece}`, metadata: { ...base, kind: 'text', what: field.key } }));
  }
  for (const [slot, content] of Object.entries(texts)) {
    const words = timedWords(content);
    if (words.length) timedPieces(words).forEach((piece, n) => records.push({ id: `${prefixOf(entry.slug)}t:${slot}:${n}`, data: `${entry.title} · ${slot}\n${piece.text}`, metadata: { ...base, kind: 'transcript', what: slot, from: piece.from, to: piece.to } }));
    else if (!content.trim().startsWith('{') && !content.trim().startsWith('[')) textPieces(content).forEach((piece, n) => records.push({ id: `${prefixOf(entry.slug)}t:${slot}:${n}`, data: `${entry.title} · ${slot}\n${piece}`, metadata: { ...base, kind: 'text', what: slot } }));
  }
  return records.slice(0, MAX_RECORDS);
}

export interface MeaningHit {
  id: string;
  score: number;
  metadata?: MeaningRecord['metadata'];
  data?: string;
}

export interface Ranked {
  entry: string;
  score: number;
  /** The best piece that is not the card: where in the entry the meaning was found. */
  found?: { what?: string; text: string; from?: number; to?: number };
}

/** The index's answers as entries, best first: an entry's score is its best record's, and it keeps its best piece. */
export function rank(hits: MeaningHit[]): Ranked[] {
  const byEntry = new Map<string, Ranked>();
  for (const hit of [...hits].sort((a, b) => b.score - a.score)) {
    const entry = hit.metadata?.entry ?? entryOfId(hit.id);
    if (!entry) continue;
    const seen = byEntry.get(entry) ?? { entry, score: hit.score };
    if (!seen.found && hit.metadata && hit.metadata.kind !== 'card' && hit.data) {
      const text = hit.data.split('\n').slice(1).join('\n').slice(0, 300);
      seen.found = { what: hit.metadata.what, text, ...(hit.metadata.from !== undefined && { from: hit.metadata.from, to: hit.metadata.to }) };
    }
    byEntry.set(entry, seen);
  }
  return [...byEntry.values()].sort((a, b) => b.score - a.score);
}
