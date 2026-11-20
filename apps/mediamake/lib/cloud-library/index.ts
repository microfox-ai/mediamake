/**
 * The Cloud Library (docs/library.md): one structured, searchable home for the files a space reuses.
 *
 * Three things a person meets:
 * - a collection (Songs): made from a template, which says its fields and its file slots. Guided,
 *   never strict: nothing is required, and a value that fits no field is kept under `extra`;
 * - an entry (one song): its fields, its files in named slots, and a card;
 * - a file: bytes stored once under their SHA-256, with the facts read from them.
 *
 * The card is what a search answers with and what an AI reads instead of the files: a few lines of
 * plain text built from the template, with no AI call.
 *
 * Pure: no database, no network, so the app, the routes and the tests share it. ./store keeps it in
 * MongoDB, ./storage has the bytes.
 */

export const LIBRARY_SCHEMA = 'mediamake.cloud-library/v1';

/* ---------- templates ---------- */

export const FIELD_KINDS = ['text', 'longtext', 'choice', 'date', 'number', 'tags', 'links', 'playlists', 'parts', 'group'] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

export const FILE_TYPES = ['audio', 'video', 'image', 'text', 'json', 'document', 'other'] as const;
export type FileType = (typeof FILE_TYPES)[number];

export interface TemplateField {
  key: string;
  label: string;
  kind: FieldKind;
  /** The heading it sits under on the entry (Identity, Release, Words). */
  group: string;
  /** choice: what it may be. */
  options?: string[];
  /**
   * A list that learns: every value used in the collection is offered the next time, most used
   * first, under this name. Fields that share a name share the list (store links, playlists and
   * statistics all learn "platform").
   */
  learns?: string;
  /** One line for whoever fills it in, person or AI. */
  hint?: string;
  /** An AI never fills it from a guess: only from a file, a tag or the person. */
  neverGuess?: boolean;
  /**
   * group: the keys it is known to hold, shown first, in this order, with their labels. Any other
   * key is kept too. A `link` key is shown as a link and searched as `where=<field>.<key>=…`.
   */
  keys?: GroupKey[];
}

export interface GroupKey {
  key: string;
  label: string;
  kind?: 'text' | 'date' | 'link';
  hint?: string;
}

export interface TemplateSlot {
  key: string;
  label: string;
  accepts: FileType[];
  /** One file (a new one replaces it, the old one stays in the entry's history) or several. */
  many: boolean;
  hint?: string;
}

export interface Template {
  id: string;
  version: number;
  name: string;
  /** What one entry is called: "song". */
  noun: string;
  about: string;
  /** The field that names an entry. */
  titleField: string;
  fields: TemplateField[];
  slots: TemplateSlot[];
  /** How an AI fills this collection: Markdown, given with the collection's overview. */
  guide: string;
  /** Field keys an earlier version had and this one dropped: a collection made from that version no longer shows them (its entries keep their values). */
  retired?: string[];
}

/* ---------- records ---------- */

export interface StoreLink {
  platform: string;
  url: string;
}
export interface PlaylistLink extends StoreLink {
  name?: string;
  added?: string;
}
export interface SongPart {
  name: string;
  start?: number;
  end?: number;
  what?: string;
  energy?: string;
}
export type FieldValue = string | number | string[] | StoreLink[] | PlaylistLink[] | SongPart[] | Record<string, string | string[]>;

/** A file in a slot: the bytes are `library_files`' (by sha256), this is its place in one entry. */
export interface SlotFile {
  sha256: string;
  name: string;
  size: number;
  type: FileType;
  contentType: string;
  addedAt: string;
  by: string;
  /** What it was made from, for a result that cost time or money (a transcript from this master). */
  madeFrom?: { sha256: string; tool?: string; params?: string };
}

export interface HistoryLine {
  at: string;
  by: string;
  agent?: boolean;
  /** A field's old and new value, or a slot's old and new file. */
  changes: { what: string; from?: unknown; to?: unknown }[];
}

export interface EntryRecord {
  schema: typeof LIBRARY_SCHEMA;
  /** The space it belongs to: a project's id (the personal space is a project too). */
  space: string;
  collection: string;
  slug: string;
  title: string;
  fields: Record<string, FieldValue>;
  /** Values that fit no field of the template: kept, shown, searchable. */
  extra: Record<string, unknown>;
  slots: Record<string, SlotFile[]>;
  card: string;
  rev: number;
  /** Saved by an AI session, not typed by a person. */
  agent?: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt?: string;
  history: HistoryLine[];
}

export interface CollectionRecord {
  schema: typeof LIBRARY_SCHEMA;
  space: string;
  slug: string;
  name: string;
  template: Template;
  /** The owner's corrections for whoever fills it: Markdown, shown under the template's guide. */
  prefs: string;
  /** Its picture on the collection's card (16:9 reads best): an image this space stores, or an https link. */
  headshot?: { sha256?: string; name?: string; url?: string };
  /** Listed in Explore by the owner of its space (./listing). */
  listing?: { about: string; rights: string; at: string; by: string };
  /**
   * The grid's columns, in order, as the space chose them: field keys, `<field>.<key>` for one part of a
   * field (a group's key, a platform's link), `has:<slot>` for a file slot and `updatedAt`. Left out: the title, the short fields, the slots and the day (./view `sheetColumns`).
   */
  columns?: string[];
  /** The lists that learn: list name → value → how often it was used. */
  learned: Record<string, Record<string, number>>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  deletedAt?: string;
}

export const HISTORY_KEPT = 100;
export const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const SHA256 = /^[0-9a-f]{64}$/;
export const MAX_TEXT = 200_000;
export const MAX_LIST = 200;

/** A collection's name as its owner writes it: one line, at most 80 characters. */
export const collectionName = (raw: unknown): string => (typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 80) : '');

/** Whether what was typed to delete a collection is its name (any case, spaces at the ends aside). */
export const deleteConfirmed = (name: string, typed: unknown): boolean => typeof typed === 'string' && !!name.trim() && typed.trim().toLowerCase() === name.trim().toLowerCase();

/** `Nakama! (Remaster)` → `nakama-remaster`. A title in another script keeps its letters out and falls back to `fallback`. */
export function slugOf(text: string, fallback = 'untitled'): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return slug || fallback;
}

/**
 * A new entry's id, from its title. A title with no Latin letters or digits (Telugu, Japanese) takes
 * the template's Latin-letters field when it has one, else the noun and a short mark of the title,
 * so two such titles never share an id.
 */
export function newSlug(template: Pick<Template, 'noun' | 'titleField'>, title: string, fields: Record<string, unknown> = {}): string {
  const latin = fields[`${template.titleField}Latin`];
  const slug = slugOf(title, '') || (typeof latin === 'string' ? slugOf(latin, '') : '');
  if (slug) return slug;
  let mark = 2166136261;
  for (const char of title) mark = Math.imul(mark ^ char.codePointAt(0)!, 16777619) >>> 0;
  return `${slugOf(template.noun, 'entry')}-${mark.toString(36)}`;
}

/** `songs/nakama` → its two parts, or null. */
export function parseRef(ref: unknown): { collection: string; entry: string } | null {
  const [collection, entry, ...rest] = String(ref ?? '').trim().toLowerCase().split('/');
  return !rest.length && SLUG.test(collection ?? '') && SLUG.test(entry ?? '') ? { collection, entry } : null;
}

export function fileTypeOf(name: string, contentType = ''): FileType {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (contentType.startsWith('audio/') || ['wav', 'mp3', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'opus'].includes(ext)) return 'audio';
  if (contentType.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'm4v'].includes(ext)) return 'video';
  if (contentType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'tif', 'tiff'].includes(ext)) return 'image';
  if (contentType === 'application/json' || ext === 'json') return 'json';
  if (contentType.startsWith('text/') || ['txt', 'md', 'srt', 'vtt', 'lrc', 'csv'].includes(ext)) return 'text';
  if (['pdf', 'doc', 'docx'].includes(ext)) return 'document';
  return 'other';
}

const CONTENT_TYPES: Record<string, string> = {
  wav: 'audio/wav', mp3: 'audio/mpeg', flac: 'audio/flac', aiff: 'audio/aiff', aif: 'audio/aiff', m4a: 'audio/mp4', ogg: 'audio/ogg', opus: 'audio/opus',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', m4v: 'video/x-m4v',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', tif: 'image/tiff', tiff: 'image/tiff',
  json: 'application/json', txt: 'text/plain', md: 'text/markdown', srt: 'text/plain', vtt: 'text/vtt', lrc: 'text/plain', csv: 'text/csv', pdf: 'application/pdf',
};
export const contentTypeOf = (name: string) => CONTENT_TYPES[name.toLowerCase().split('.').pop() ?? ''] ?? 'application/octet-stream';

/* ---------- lists that learn ---------- */

/** What two spellings of one value share: `YouTube Music`, `Youtube music` and `youtube-music` are one. */
export const learnKey = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * The spelling the collection already uses for `value`, else `value` tidied. So the second song's
 * "youtube music" is saved as the first song's "YouTube Music".
 */
export function knownSpelling(known: Record<string, number> | undefined, value: string): string {
  const tidy = value.trim().replace(/\s+/g, ' ');
  const key = learnKey(tidy);
  if (!key) return '';
  const hit = Object.entries(known ?? {})
    .filter(([name]) => learnKey(name) === key)
    .sort((a, b) => b[1] - a[1])[0];
  return hit ? hit[0] : tidy;
}

/** A learning list as a dropdown shows it: most used first, then by name. */
export function learnedOptions(known: Record<string, number> | undefined): string[] {
  return Object.entries(known ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

/** Every learning value an entry's fields use, by list. */
export function learnedIn(template: Template, fields: Record<string, FieldValue>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const field of template.fields) {
    if (!field.learns) continue;
    const value = fields[field.key];
    const values =
      typeof value === 'string'
        ? [value]
        : Array.isArray(value)
          ? value.map(item => (typeof item === 'string' ? item : 'platform' in item ? item.platform : '')).filter(Boolean)
          : [];
    if (values.length) out[field.learns] = [...new Set([...(out[field.learns] ?? []), ...values])];
  }
  return out;
}

/** The lists after an entry went from `before` to `after`: counts move with the values. */
export function relearn(learned: CollectionRecord['learned'], template: Template, before: Record<string, FieldValue> | null, after: Record<string, FieldValue> | null): CollectionRecord['learned'] {
  const next: CollectionRecord['learned'] = Object.fromEntries(Object.entries(learned).map(([list, values]) => [list, { ...values }]));
  const move = (fields: Record<string, FieldValue> | null, by: number) => {
    if (!fields) return;
    for (const [list, values] of Object.entries(learnedIn(template, fields))) {
      next[list] ??= {};
      for (const value of values) next[list][value] = Math.max(0, (next[list][value] ?? 0) + by);
    }
  };
  move(before, -1);
  move(after, 1);
  for (const list of Object.keys(next)) for (const [value, count] of Object.entries(next[list])) if (!count) delete next[list][value];
  return next;
}

/* ---------- cleaning what is saved ---------- */

const text = (value: unknown, max = 500) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '');
const isUrl = (value: string) => /^https?:\/\/[^\s]+$/i.test(value);
const ISRC = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

export interface Cleaned {
  fields: Record<string, FieldValue>;
  /** Keys that are no field of the template. */
  extra: Record<string, unknown>;
  /** What looks wrong, in words. Nothing here stops a save. */
  warnings: string[];
}

function cleanLinks(raw: unknown, label: string, known: Record<string, number> | undefined, warnings: string[], playlists: boolean): (StoreLink | PlaylistLink)[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.entries(raw as Record<string, unknown>).flatMap(([platform, url]) => (Array.isArray(url) ? url : [url]).map(u => (u && typeof u === 'object' ? { platform, ...(u as object) } : { platform, url: u }))) : [];
  const out: PlaylistLink[] = [];
  for (const item of list.slice(0, MAX_LIST)) {
    const row = (item ?? {}) as Record<string, unknown>;
    const platform = knownSpelling(known, text(row.platform, 60));
    const url = text(row.url, 2000);
    if (!platform || !url) {
      warnings.push(`${label}: a link needs a platform and a url, so one was left out`);
      continue;
    }
    if (!isUrl(url)) warnings.push(`${label}: "${url}" does not look like a link`);
    if (!playlists && out.some(link => learnKey(link.platform) === learnKey(platform))) {
      warnings.push(`${label}: ${platform} is there twice, the later link was kept`);
      out.splice(out.findIndex(link => learnKey(link.platform) === learnKey(platform)), 1);
    }
    const name = playlists ? text(row.name, 200) : '';
    const added = playlists ? text(row.added, 30) : '';
    out.push({ platform, url, ...(name && { name }), ...(added && { added }) });
  }
  return out;
}

function cleanField(field: TemplateField, raw: unknown, learned: CollectionRecord['learned'], warnings: string[]): FieldValue | undefined {
  const known = field.learns ? learned[field.learns] : undefined;
  switch (field.kind) {
    case 'text': {
      const value = text(raw);
      if (!value) return undefined;
      if (field.key === 'isrc') {
        const code = value.toUpperCase().replace(/[-\s]/g, '');
        if (!ISRC.test(code)) warnings.push(`${field.label}: "${value}" is not the form of an ISRC (two letters, three letters or digits, seven digits)`);
        return code;
      }
      return known ? knownSpelling(known, value) : value;
    }
    case 'longtext':
      return typeof raw === 'string' && raw.trim() ? raw.replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT) : undefined;
    case 'choice': {
      const value = text(raw, 80);
      if (!value) return undefined;
      const option = (field.options ?? []).find(o => learnKey(o) === learnKey(value));
      if (!option) warnings.push(`${field.label}: "${value}" is not one of ${(field.options ?? []).join(', ')}, kept as written`);
      return option ?? value;
    }
    case 'date': {
      const value = text(raw, 30);
      if (!value) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) warnings.push(`${field.label}: "${value}" is not a date written as 2026-11-19`);
      return value;
    }
    case 'number': {
      const value = typeof raw === 'number' ? raw : Number(text(raw, 40));
      if (raw === '' || raw == null || !Number.isFinite(value)) return undefined;
      return value;
    }
    case 'tags': {
      const list = (Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []).map(item => knownSpelling(known, text(item, 80))).filter(Boolean);
      const unique = list.filter((item, i) => list.findIndex(other => learnKey(other) === learnKey(item)) === i).slice(0, MAX_LIST);
      return unique.length ? unique : undefined;
    }
    case 'links':
    case 'playlists': {
      const links = cleanLinks(raw, field.label, known, warnings, field.kind === 'playlists');
      return links.length ? links : undefined;
    }
    case 'parts': {
      const parts: SongPart[] = [];
      for (const item of (Array.isArray(raw) ? raw : []).slice(0, MAX_LIST)) {
        const row = (item ?? {}) as Record<string, unknown>;
        const name = text(row.name, 80);
        if (!name) continue;
        const start = Number(row.start);
        const end = Number(row.end);
        const what = text(row.what, 2000);
        const energy = text(row.energy, 40);
        parts.push({ name, ...(Number.isFinite(start) && row.start != null && { start }), ...(Number.isFinite(end) && row.end != null && { end }), ...(what && { what }), ...(energy && { energy }) });
      }
      return parts.length ? parts : undefined;
    }
    case 'group': {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
      const out: Record<string, string | string[]> = {};
      for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_LIST)) {
        const name = text(key, 80);
        const kept = Array.isArray(value) ? value.map(item => text(item)).filter(Boolean) : text(value, 5000);
        if (name && (Array.isArray(kept) ? kept.length : kept)) out[name] = kept;
      }
      for (const known of field.keys ?? []) {
        const value = out[known.key];
        if (known.kind === 'link' && typeof value === 'string' && !isUrl(value)) warnings.push(`${field.label}: ${known.label} "${value}" does not look like a link`);
      }
      return Object.keys(out).length ? out : undefined;
    }
  }
}

/**
 * What a save sent, read against the template. Guided, never strict: a value that doesn't fit is
 * kept as written with a warning, a key the template doesn't know goes to `extra`, and `null` (or
 * an empty value) clears a field. Only the keys that were sent are in the answer.
 */
export function cleanFields(template: Template, input: unknown, learned: CollectionRecord['learned'] = {}): Cleaned & { cleared: string[] } {
  const warnings: string[] = [];
  const fields: Record<string, FieldValue> = {};
  const extra: Record<string, unknown> = {};
  const cleared: string[] = [];
  const byKey = new Map(template.fields.map(field => [field.key, field]));
  for (const [key, raw] of Object.entries((input && typeof input === 'object' && !Array.isArray(input) ? input : {}) as Record<string, unknown>)) {
    const field = byKey.get(key);
    if (!field) {
      if (raw == null || raw === '') cleared.push(key);
      else if (JSON.stringify(raw).length <= 20_000) extra[text(key, 80) || 'other'] = raw;
      else warnings.push(`${key}: too long to keep as an extra value (a file slot suits it better)`);
      continue;
    }
    const value = cleanField(field, raw, learned, warnings);
    if (value === undefined) cleared.push(key);
    else fields[key] = value;
  }
  return { fields, extra, warnings, cleared };
}

/* ---------- the card ---------- */

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
const sizeOf = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${Math.round(bytes / 1e6)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);

function fieldLine(field: TemplateField, value: FieldValue): string {
  if (field.kind === 'longtext') return `${field.label}: ${String(value).split(/\s+/).filter(Boolean).length} words`;
  if (field.kind === 'links') return `${field.label}: ${(value as StoreLink[]).map(link => link.platform).join(', ')}`;
  if (field.kind === 'playlists') {
    const byPlatform = new Map<string, number>();
    for (const link of value as PlaylistLink[]) byPlatform.set(link.platform, (byPlatform.get(link.platform) ?? 0) + 1);
    return `${field.label}: ${[...byPlatform].map(([platform, count]) => `${platform} (${count})`).join(', ')}`;
  }
  if (field.kind === 'parts') return `${field.label}: ${(value as SongPart[]).map(part => (part.start != null ? `${part.name} ${clock(part.start)}` : part.name)).join(', ')}`;
  if (field.kind === 'group') return `${field.label}: ${Object.entries(value as Record<string, string | string[]>).map(([key, v]) => `${key} ${Array.isArray(v) ? v.join(', ') : v}`).join('; ').slice(0, 300)}`;
  if (Array.isArray(value)) return `${field.label}: ${(value as string[]).join(', ')}`;
  return `${field.label}: ${value}`;
}

/**
 * An entry's card: what it is, what it has and what it lacks, in a few plain lines. Built from the
 * template alone, so it costs nothing and is the same wherever it is made.
 */
export function cardOf(collection: Pick<CollectionRecord, 'slug' | 'name' | 'template'>, entry: Pick<EntryRecord, 'slug' | 'title' | 'fields' | 'slots' | 'extra' | 'updatedAt'>): string {
  const { template } = collection;
  const lines = [`${entry.title} · ${template.noun} · ${collection.name}`];
  for (const field of template.fields) {
    if (field.key === template.titleField) continue;
    const value = entry.fields[field.key];
    if (value !== undefined) lines.push(fieldLine(field, value));
  }
  const has: string[] = [];
  const lacks: string[] = [];
  for (const slot of template.slots) {
    const files = entry.slots[slot.key] ?? [];
    if (!files.length) lacks.push(slot.label.toLowerCase());
    else has.push(slot.many ? `${slot.label.toLowerCase()} (${files.length}, ${sizeOf(files.reduce((sum, file) => sum + file.size, 0))})` : `${slot.label.toLowerCase()} (${files[0].name.split('.').pop()}, ${sizeOf(files[0].size)})`);
  }
  const other = Object.entries(entry.slots).filter(([key, files]) => files.length && !template.slots.some(slot => slot.key === key));
  if (other.length) has.push(`other files (${other.reduce((sum, [, files]) => sum + files.length, 0)})`);
  if (has.length) lines.push(`Has: ${has.join(', ')}`);
  if (lacks.length) lines.push(`Missing: ${lacks.join(', ')}`);
  const extras = Object.keys(entry.extra ?? {});
  if (extras.length) lines.push(`Also: ${extras.join(', ')}`);
  lines.push(`id ${collection.slug}/${entry.slug} · changed ${entry.updatedAt.slice(0, 10)}`);
  return lines.join('\n');
}

/* ---------- saving ---------- */

export interface SaveAsk {
  /** The entry to change. Left out: a new one, named by its title. */
  slug?: string;
  fields?: unknown;
  /** Files already stored (./storage), each into a slot. */
  files?: { slot: string; file: SlotFile }[];
  /** Files to take out of a slot, by sha256. */
  removeFiles?: { slot: string; sha256: string }[];
  /** The `rev` the change was made from. Sent with a change, it is refused when someone saved in between. */
  rev?: number;
  agent?: boolean;
}

export type SaveResult = { entry: EntryRecord; created: boolean; warnings: string[]; changes: HistoryLine['changes'] } | { error: string; status: number };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const short = (value: unknown) => {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s && s.length > 120 ? `${s.slice(0, 117)}…` : s;
};

/**
 * One save applied to an entry (or to none, for a new one). Returns the entry as it should be kept,
 * with its history line and its card. A slot that holds one file gets the new one and the old one is
 * named in the history, so the owner can take it back.
 */
export function applySave(collection: CollectionRecord, current: EntryRecord | null, ask: SaveAsk, by: string, now = new Date()): SaveResult {
  const { template } = collection;
  const at = now.toISOString();
  if (current && ask.rev !== undefined && ask.rev !== current.rev) {
    return { error: `${current.title} was changed since you read it (it is at revision ${current.rev}, you sent ${ask.rev}): read it again, then save`, status: 409 };
  }
  const cleaned = cleanFields(template, ask.fields, collection.learned);
  const fields = { ...(current?.fields ?? {}), ...cleaned.fields };
  const extra = { ...(current?.extra ?? {}), ...cleaned.extra };
  // a value kept under extra before its template had the field moves into the field when it is saved there
  for (const key of Object.keys(cleaned.fields)) delete extra[key];
  for (const key of cleaned.cleared) {
    delete fields[key];
    delete extra[key];
  }
  const title = typeof fields[template.titleField] === 'string' ? (fields[template.titleField] as string) : (current?.title ?? '');
  if (!title) return { error: `A new ${template.noun} needs its ${template.fields.find(f => f.key === template.titleField)?.label.toLowerCase() ?? 'title'}`, status: 400 };

  const changes: HistoryLine['changes'] = [];
  for (const key of new Set([...Object.keys(cleaned.fields), ...Object.keys(cleaned.extra), ...cleaned.cleared])) {
    // a key saved into a field is compared with the field only: a value moving in from extra is a change (the field is set)
    const before = key in cleaned.fields ? current?.fields[key] : (current?.fields[key] ?? current?.extra[key]);
    const after = fields[key] ?? extra[key];
    if (!same(before, after)) changes.push({ what: key, ...(before !== undefined && { from: short(before) }), ...(after !== undefined && { to: short(after) }) });
  }

  const slots: Record<string, SlotFile[]> = Object.fromEntries(Object.entries(current?.slots ?? {}).map(([key, files]) => [key, [...files]]));
  const warnings = [...cleaned.warnings];
  for (const { slot, sha256 } of ask.removeFiles ?? []) {
    const gone = (slots[slot] ?? []).find(file => file.sha256 === sha256);
    if (!gone) continue;
    slots[slot] = slots[slot].filter(file => file.sha256 !== sha256);
    changes.push({ what: `file:${slot}`, from: `${gone.name} (${gone.sha256.slice(0, 12)})` });
  }
  for (const { slot, file } of ask.files ?? []) {
    const key = SLUG.test(slot) ? slot : 'other';
    const spec = template.slots.find(s => s.key === key);
    if (spec && !spec.accepts.includes(file.type)) warnings.push(`${spec.label} usually holds ${spec.accepts.join(' or ')}, and ${file.name} is ${file.type}: kept there anyway`);
    const held = slots[key] ?? [];
    if (held.some(f => f.sha256 === file.sha256)) continue;
    if (spec && !spec.many && held.length) {
      changes.push({ what: `file:${key}`, from: `${held[0].name} (${held[0].sha256.slice(0, 12)})`, to: `${file.name} (${file.sha256.slice(0, 12)})` });
      slots[key] = [file];
      const stale = template.slots.filter(s => (slots[s.key] ?? []).some(f => f.madeFrom?.sha256 === held[0].sha256));
      for (const s of stale) warnings.push(`The ${s.label.toLowerCase()} was made from the earlier ${spec.label.toLowerCase()}: check that it still fits the new one`);
    } else {
      changes.push({ what: `file:${key}`, to: `${file.name} (${file.sha256.slice(0, 12)})` });
      slots[key] = [...held, file];
    }
  }
  for (const key of Object.keys(slots)) if (!slots[key].length) delete slots[key];

  if (current && !changes.length) return { entry: current, created: false, warnings, changes };
  const line: HistoryLine = { at, by, ...(ask.agent && { agent: true }), changes };
  const entry: EntryRecord = {
    schema: LIBRARY_SCHEMA,
    space: collection.space,
    collection: collection.slug,
    slug: current?.slug ?? (ask.slug && SLUG.test(ask.slug) ? ask.slug : newSlug(template, title, fields)),
    title,
    fields,
    extra,
    slots,
    card: '',
    rev: (current?.rev ?? 0) + 1,
    ...((current ? current.agent : ask.agent) && { agent: true }),
    createdAt: current?.createdAt ?? at,
    createdBy: current?.createdBy ?? by,
    updatedAt: at,
    updatedBy: by,
    history: [...(current?.history ?? []), line].slice(-HISTORY_KEPT),
  };
  entry.card = cardOf(collection, entry);
  return { entry, created: !current, warnings, changes };
}

/**
 * The one sentence an AI says before it saves, with the real names, so a person always knows what
 * goes where: "Add the new song "Nakama!" to the Songs collection of the Get Into Zone space (cloud)?"
 */
export function askSentence(input: { noun: string; title: string; collection: string; space: string; created: boolean; uploads: { slot: string; size: number }[]; fields: string[] }): string {
  const head = input.created ? `Add the new ${input.noun} "${input.title}" to` : `Change the ${input.noun} "${input.title}" in`;
  const lines = [`${head} the ${input.collection} collection of the ${input.space} space (cloud)?`];
  const parts: string[] = [];
  if (input.uploads.length) parts.push(`Uploads: ${input.uploads.map(u => `${u.slot} (${sizeOf(u.size)})`).join(', ')}.`);
  if (input.fields.length) parts.push(`Fields: ${input.fields.join(', ')}.`);
  if (parts.length) lines.push(parts.join(' '));
  return lines.join('\n');
}

/* ---------- searching ---------- */

export interface SearchAsk {
  q?: string;
  collection?: string;
  /**
   * field=value, matched without case: `use=released`. A list or a group is matched as its JSON
   * (`distrokid=<albumuuid>` finds the song whose DistroKid link holds it), one key of a group as
   * `field.key` (`distrokid.link=…`), and a key the template doesn't know in the entry's `extra`.
   */
  where?: Record<string, string>;
  has?: string[];
  lacks?: string[];
  limit?: number;
  /** How many hits to skip: the next page of a long list. */
  offset?: number;
  /** Fields whose value each row carries as one line of text (`cells`), for the grid's chosen columns. */
  cells?: string[];
  /** Each row carries a signed link to one of its pictures (`picture`), for cards and folders. */
  pictures?: boolean;
}

/** A column: a field key (any case, `titleOriginal`), a part of a field (`distrokid.upc`), `has:<slot>`, or `updatedAt`. */
export const COLUMN = /^(has:)?[A-Za-z][A-Za-z0-9_.-]{0,79}$/;

/** The columns a space chose, cleaned: known shapes only, each once, at most 40. */
export function cleanColumns(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  return [...new Set(list.filter((key): key is string => typeof key === 'string' && COLUMN.test(key.trim())).map(key => key.trim()))].slice(0, 40);
}

const clockText = (seconds: unknown) => (typeof seconds === 'number' && Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '');

/** Any field's value as one short line for a grid cell: text on one line, a list's names, a group's keys and values. */
export function cellLine(value: unknown, max = 160): string {
  if (value == null || value === '') return '';
  let line = '';
  if (typeof value === 'string') line = value.replace(/\s+/g, ' ').trim();
  else if (typeof value === 'number' || typeof value === 'boolean') line = String(value);
  else if (Array.isArray(value)) {
    line = value
      .map(item => {
        if (item == null) return '';
        if (typeof item !== 'object') return String(item);
        const row = item as Record<string, unknown>;
        if (typeof row.platform === 'string') return row.platform;
        if (typeof row.name === 'string') return `${row.name}${row.start != null ? ` ${clockText(row.start)}` : ''}`;
        return Object.values(row).filter(v => typeof v === 'string').join(' ');
      })
      .filter(Boolean)
      .join(', ');
  } else if (typeof value === 'object') {
    line = Object.entries(value as Record<string, unknown>)
      .map(([key, v]) => `${key}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
      .join(' · ');
  }
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/**
 * The value a column names: a field or a value kept under `extra`, one key of a group
 * (`distrokid.upc`), or one platform's link in a list of links (`storeLinks.spotify`, the platform
 * as the lists that learn compare it).
 */
export function columnValue(entry: Pick<EntryRecord, 'fields'> & { extra?: Record<string, unknown> }, key: string): unknown {
  const value = whereValue(entry, key);
  if (value !== undefined) return value;
  const dot = key.indexOf('.');
  const list = dot > 0 && Object.prototype.hasOwnProperty.call(entry.fields, key.slice(0, dot)) ? entry.fields[key.slice(0, dot)] : undefined;
  if (!Array.isArray(list)) return undefined;
  const sub = learnKey(key.slice(dot + 1));
  const links = (list as unknown[]).flatMap(row => {
    const link = row && typeof row === 'object' ? (row as { platform?: unknown; url?: unknown }) : null;
    return link && typeof link.platform === 'string' && typeof link.url === 'string' && link.url && learnKey(link.platform) === sub ? [link.url] : [];
  });
  return links.length ? links.join(', ') : undefined;
}

/** The cells a row carries: each asked-for column (a field, an extra value, or a part of one: `columnValue`) as one line. Empty ones are left out. */
export function cellsOf(entry: Pick<EntryRecord, 'fields'> & { extra?: Record<string, unknown> }, keys: string[]): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const key of keys) {
    if (key.startsWith('has:') || key === 'updatedAt') continue;
    const line = cellLine(columnValue(entry, key));
    if (line) cells[key] = line;
  }
  return cells;
}

/**
 * One of an entry's pictures, for its card and its folder: any image in any slot, picked by the
 * entry's own id, so the same entry shows the same picture every time while its neighbours differ.
 */
export function pictureOf(entry: Pick<EntryRecord, 'slots' | 'collection' | 'slug'>): SlotFile | undefined {
  const images = Object.values(entry.slots).flat().filter(file => file.type === 'image');
  if (!images.length) return undefined;
  let mark = 2166136261;
  for (const char of `${entry.collection}/${entry.slug}`) mark = Math.imul(mark ^ char.codePointAt(0)!, 16777619) >>> 0;
  return images[mark % images.length];
}

export function parseSearch(params: URLSearchParams): SearchAsk {
  const where: Record<string, string> = {};
  for (const pair of params.getAll('where')) {
    const at = pair.indexOf('=');
    if (at > 0) where[pair.slice(0, at).trim()] = pair.slice(at + 1).trim();
  }
  const list = (name: string) => params.getAll(name).flatMap(v => v.split(',')).map(v => v.trim().toLowerCase()).filter(v => SLUG.test(v));
  const collection = params.get('collection')?.trim().toLowerCase();
  return {
    q: params.get('q')?.trim().slice(0, 200) || undefined,
    collection: collection && SLUG.test(collection) ? collection : undefined,
    where,
    has: list('has'),
    lacks: list('lacks'),
    limit: Math.min(200, Math.max(1, Number(params.get('limit')) || 10)),
    offset: Math.max(0, Math.floor(Number(params.get('offset')) || 0)),
    ...(params.has('cells') && { cells: cleanColumns(params.getAll('cells').flatMap(v => v.split(','))) }),
    ...(['1', 'true'].includes(params.get('pictures') ?? '') && { pictures: true }),
  };
}

/** Whether an entry answers a search: every word of `q` in its card or lyrics-like text, and every filter. */
/**
 * What a list shows of an entry beside its title, with no second request: the short fields (a
 * choice, a date, a name, tags) and the slots that hold a file, each with how many.
 */
export function factsOf(entry: Pick<EntryRecord, 'fields' | 'slots'>): { facts: Record<string, string | string[]>; has: Record<string, number> } {
  const facts: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(entry.fields)) {
    if (typeof value === 'number') facts[key] = String(value);
    else if (typeof value === 'string') {
      if (value.length <= 80 && !value.includes('\n')) facts[key] = value;
    } else if (Array.isArray(value) && value.length && value.every(item => typeof item === 'string')) facts[key] = (value as string[]).slice(0, 12);
  }
  const has: Record<string, number> = {};
  for (const [slot, files] of Object.entries(entry.slots)) if (files.length) has[slot] = files.length;
  return { facts, has };
}

/** The value a `where` key names: a field, one key of a group (`distrokid.link`, any case), or a value kept under `extra`. */
export function whereValue(entry: Pick<EntryRecord, 'fields'> & { extra?: Record<string, unknown> }, key: string): unknown {
  const own = (record: object | undefined, name: string) => (record && Object.prototype.hasOwnProperty.call(record, name) ? (record as Record<string, unknown>)[name] : undefined);
  const value = own(entry.fields, key) ?? own(entry.extra, key);
  if (value !== undefined) return value;
  const dot = key.indexOf('.');
  if (dot < 1) return undefined;
  const group = own(entry.fields, key.slice(0, dot)) ?? own(entry.extra, key.slice(0, dot));
  if (!group || typeof group !== 'object' || Array.isArray(group)) return undefined;
  const sub = key.slice(dot + 1).toLowerCase();
  return Object.entries(group as Record<string, unknown>).find(([name]) => name.toLowerCase() === sub)?.[1];
}

export function matches(entry: Pick<EntryRecord, 'card' | 'fields' | 'slots' | 'title'> & { extra?: Record<string, unknown> }, ask: SearchAsk): boolean {
  for (const slot of ask.has ?? []) if (!(entry.slots[slot] ?? []).length && entry.fields[slot] === undefined) return false;
  for (const slot of ask.lacks ?? []) if ((entry.slots[slot] ?? []).length || entry.fields[slot] !== undefined) return false;
  for (const [key, wanted] of Object.entries(ask.where ?? {})) {
    const value = whereValue(entry, key);
    const hay = value === undefined || value === null ? '' : typeof value === 'string' || typeof value === 'number' ? String(value) : (JSON.stringify(value) ?? '');
    if (!hay.toLowerCase().includes(wanted.toLowerCase())) return false;
  }
  if (ask.q) {
    const hay = `${entry.card}\n${Object.values(entry.fields).filter(v => typeof v === 'string').join('\n')}`.toLowerCase();
    for (const word of ask.q.toLowerCase().split(/\s+/).filter(Boolean)) if (!hay.includes(word)) return false;
  }
  return true;
}

/* ---------- reading a part of a text or a timed transcript ---------- */

export interface ReadAsk {
  /** Lines `from` to `to`, counted from 1. */
  lines?: [number, number];
  /** Seconds `from` to `to`, for a transcript with timed words. */
  time?: [number, number];
}

export const MAX_READ = 60_000;

/** A text or JSON file's content, whole or the part asked for, and what was left out. */
export function readPart(content: string, type: FileType, ask: ReadAsk = {}): { text: string; note?: string } {
  if (ask.time && type === 'json') {
    try {
      const raw = JSON.parse(content);
      const words: { start?: number; end?: number; text?: string; word?: string }[] | undefined = Array.isArray(raw) ? raw : (raw?.words ?? raw?.transcripts?.[0]?.words ?? raw?.transcript?.words);
      if (Array.isArray(words)) {
        const [from, to] = ask.time;
        const hit = words.filter(word => typeof word.start === 'number' && word.start >= from && word.start <= to);
        return { text: JSON.stringify(hit), note: `${hit.length} of ${words.length} timed words, ${clock(from)} to ${clock(to)}` };
      }
    } catch {
      /* not JSON after all: fall through to the text */
    }
    return { text: content.slice(0, MAX_READ), note: 'This file has no timed words to cut by time: its start is given instead' };
  }
  if (ask.lines) {
    const all = content.split('\n');
    const from = Math.max(1, ask.lines[0]);
    const to = Math.min(all.length, Math.max(from, ask.lines[1]));
    return { text: all.slice(from - 1, to).join('\n').slice(0, MAX_READ), note: `lines ${from} to ${to} of ${all.length}` };
  }
  if (content.length > MAX_READ) return { text: content.slice(0, MAX_READ), note: `the first ${MAX_READ} of ${content.length} characters: ask for a part (lines, or seconds for a transcript)` };
  return { text: content };
}

/* ---------- usage: who used what, and what it costs ---------- */

export const USAGE_ACTIONS = ['upload', 'fetch', 'read', 'search', 'save', 'fill'] as const;
export type UsageAction = (typeof USAGE_ACTIONS)[number];

/** One line per action, in `library_usage`. Names and sizes only: never a file's content or a search's words. */
export interface UsageLine {
  at: string;
  /** `2026-11-19`, for sums by day. */
  day: string;
  clientId: string;
  /** The computer's label or the cloud session's place name, when the caller said. */
  device?: string;
  space: string;
  collection?: string;
  /** A shared collection: the space it was reached through. `space` is the owner's, whose storage it is. */
  via?: string;
  action: UsageAction;
  bytes?: number;
  /** fill: the model's tokens. */
  tokensIn?: number;
  tokensOut?: number;
}

/**
 * What each thing costs MediaMake, in US dollars. These are starting figures an admin corrects to
 * what is really paid (`library_prices` in MongoDB): they are not read from any bill.
 */
export interface Prices {
  storagePerGbMonth: number;
  downloadPerGb: number;
  searchPer1000: number;
  fillPerMillionTokensIn: number;
  fillPerMillionTokensOut: number;
}
export const DEFAULT_PRICES: Prices = { storagePerGbMonth: 0.02, downloadPerGb: 0.01, searchPer1000: 0.05, fillPerMillionTokensIn: 4, fillPerMillionTokensOut: 20 };

export interface UsageSum {
  uploads: number;
  uploadedBytes: number;
  fetches: number;
  fetchedBytes: number;
  reads: number;
  searches: number;
  saves: number;
  fills: number;
  tokensIn: number;
  tokensOut: number;
}
export const emptySum = (): UsageSum => ({ uploads: 0, uploadedBytes: 0, fetches: 0, fetchedBytes: 0, reads: 0, searches: 0, saves: 0, fills: 0, tokensIn: 0, tokensOut: 0 });

export function addUsage(sum: UsageSum, line: Pick<UsageLine, 'action' | 'bytes' | 'tokensIn' | 'tokensOut'>): UsageSum {
  const bytes = Number(line.bytes) || 0;
  if (line.action === 'upload') {
    sum.uploads += 1;
    sum.uploadedBytes += bytes;
  } else if (line.action === 'fetch') {
    sum.fetches += 1;
    sum.fetchedBytes += bytes;
  } else if (line.action === 'read') {
    sum.reads += 1;
    sum.fetchedBytes += bytes;
  } else if (line.action === 'search') sum.searches += 1;
  else if (line.action === 'save') sum.saves += 1;
  else if (line.action === 'fill') {
    sum.fills += 1;
    sum.tokensIn += Number(line.tokensIn) || 0;
    sum.tokensOut += Number(line.tokensOut) || 0;
  }
  return sum;
}

/** Usage summed by one of its keys (person, device, space, collection). */
export function sumBy(lines: UsageLine[], key: 'clientId' | 'device' | 'space' | 'collection'): Record<string, UsageSum> {
  const out: Record<string, UsageSum> = {};
  for (const line of lines) {
    const name = key === 'collection' ? (line.collection ? `${line.space}/${line.collection}` : '') : (line[key] ?? '');
    if (name) addUsage((out[name] ??= emptySum()), line);
  }
  return out;
}

/** What a sum of usage costs, estimated: downloads, searches and AI fills. Storage is costed apart (it stands, it isn't an action). */
export function costOf(sum: UsageSum, prices: Prices = DEFAULT_PRICES): number {
  const cost = (sum.fetchedBytes / 1e9) * prices.downloadPerGb + (sum.searches / 1000) * prices.searchPer1000 + (sum.tokensIn / 1e6) * prices.fillPerMillionTokensIn + (sum.tokensOut / 1e6) * prices.fillPerMillionTokensOut;
  return Math.round(cost * 10_000) / 10_000;
}

/** What keeping `bytes` for a month costs, estimated. */
export const storageCostOf = (bytes: number, prices: Prices = DEFAULT_PRICES) => Math.round((bytes / 1e9) * prices.storagePerGbMonth * 10_000) / 10_000;

export function cleanPrices(raw: unknown, base: Prices = DEFAULT_PRICES): Prices {
  const out = { ...base };
  for (const key of Object.keys(base) as (keyof Prices)[]) {
    const value = Number((raw as Record<string, unknown> | null)?.[key]);
    if (Number.isFinite(value) && value >= 0 && value < 10_000) out[key] = value;
  }
  return out;
}
