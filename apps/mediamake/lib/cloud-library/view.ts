/**
 * What the Library's page (components/cloud-library) works out from the routes' answers: the shapes
 * it reads, where a dropped file goes, which fields a form changed, and how things are worded.
 * Pure, so the page and the tests share it.
 */
import type { InvitationView, ShareRole } from './shares';
import { fileTypeOf, learnKey, type EntryRecord, type FieldKind, type FieldValue, type FileType, type Prices, type UsageSum } from './index';

export interface FieldView {
  key: string;
  label: string;
  kind: FieldKind;
  group: string;
  options?: string[];
  learns?: string;
  neverGuess?: boolean;
  hint?: string;
  /** group: the keys it is known to hold, with their labels (lib/cloud-library › GroupKey). */
  keys?: { key: string; label: string; kind?: 'text' | 'date' | 'link'; hint?: string }[];
}
export interface SlotView {
  key: string;
  label: string;
  accepts: FileType[];
  many: boolean;
  hint?: string;
}
export interface CollectionView {
  slug: string;
  name: string;
  template: string;
  noun: string;
  /** The field that names an entry. */
  titleField: string;
  about: string;
  entries: number;
  updatedAt: string;
  fields: FieldView[];
  slots: SlotView[];
  learned: Record<string, string[]>;
  /** Its picture, as a link the page can show (a stored one is signed for an hour). */
  headshot?: string;
  guide?: string;
  prefs?: string;
  /** The owner sees how many spaces it is opened to. */
  sharedWith?: number;
  /** Listed in Explore by its owner, with the rights they wrote. */
  listing?: { about: string; rights: string };
  /** The owner sees how many requests for access wait. */
  requests?: number;
  /** Another space's collection, opened to this one: who shares it, and what this space may do in it. */
  shared?: { by: string; from: string; collection: string; role: ShareRole };
  /** The grid's columns as the space chose them, in order (./index CollectionRecord `columns`). */
  columns?: string[];
}
export interface SpaceView {
  id: string;
  name: string;
  personal: boolean;
  role: 'owner' | 'editor' | 'viewer';
}
export interface SpaceOverview {
  space: SpaceView;
  collections: CollectionView[];
  /** Collections opened to this space that nobody accepted yet. */
  invitations?: InvitationView[];
  /** The server has the search index: the page offers search by meaning. */
  byMeaning?: boolean;
}
export interface TemplateCard {
  id: string;
  name: string;
  noun: string;
  about: string;
  fields: number;
  slots: number;
}
/** An entry as a list shows it. */
export interface EntryRow {
  ref: string;
  title: string;
  card: string;
  rev: number;
  updatedAt: string;
  agent?: boolean;
  facts: Record<string, string | string[]>;
  has: Record<string, number>;
  /** The grid's chosen columns that are not short facts, each as one line (a list asked with `cells`). */
  cells?: Record<string, string>;
  /** A signed link to one of its pictures, for its card and its folder (a list asked with `pictures`). */
  picture?: string;
  space?: string;
  spaceId?: string;
  /** The entry is in a collection another space shares. */
  sharedBy?: string;
  /** From a search by meaning: how well it fits (0 to 1) and the piece of its text that fits. */
  score?: number;
  found?: { what?: string; text: string; from?: number; to?: number };
}
export interface EntryAnswer {
  entry: EntryRecord;
  statistics: { platform: string; day: string; numbers: Record<string, number>; source?: string; syncedAt?: string }[];
}
export interface UsageRow extends UsageSum {
  name: string;
  cost: number;
}
export interface UsageAll {
  since: string;
  prices: Prices;
  /** A space's id → the name a person knows it by. */
  spaceNames: Record<string, string>;
  note: string;
  stored: { space: string; bytes: number; files: number; costPerMonth: number }[];
  byPerson: UsageRow[];
  byDevice: UsageRow[];
  bySpace: UsageRow[];
  byCollection: UsageRow[];
}

export const canChange = (space: Pick<SpaceView, 'role'> | null | undefined): boolean => space?.role === 'owner' || space?.role === 'editor';

/**
 * The space as it stands for one collection. In a shared collection nobody here is its owner: an
 * editor share lets this space's owner and editors change it, and everyone else reads.
 */
export const spaceFor = (space: SpaceView, collection: Pick<CollectionView, 'shared'> | null | undefined): SpaceView =>
  collection?.shared ? { ...space, role: collection.shared.role === 'editor' && canChange(space) ? 'editor' : 'viewer' } : space;

/** The page's address for a space, a collection and an entry: what the breadcrumb links to. */
/**
 * The Library's All view: every collection of every space the account can open, each with its
 * space, the personal space's first. A collection another space shares shows once, under the
 * space it belongs to, when the account can open that space too. `q` keeps the ones whose name,
 * description or space name holds every word.
 */
export function allCollections(spaces: SpaceOverview[], q = ''): { space: SpaceView; collection: CollectionView }[] {
  const mine = new Set(spaces.map(s => s.space.id));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return [...spaces]
    .sort((a, b) => Number(b.space.personal) - Number(a.space.personal))
    .flatMap(({ space, collections }) => collections.filter(c => !c.shared || !mine.has(c.shared.from)).map(collection => ({ space, collection })))
    .filter(({ space, collection }) => {
      const text = `${collection.name} ${collection.about} ${space.name}`.toLowerCase();
      return words.every(word => text.includes(word));
    });
}

export function libraryHref(at: { space?: string | null; collection?: string | null; entry?: string | null }): string {
  const params = new URLSearchParams();
  if (at.space) params.set('space', at.space);
  if (at.collection) params.set('c', at.collection);
  if (at.collection && at.entry) params.set('e', at.entry);
  const query = params.toString();
  return query ? `/app/library?${query}` : '/app/library';
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(bytes >= 1e8 ? 0 : 1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

/** `2026-11-19T10:00:00Z` → `19 Nov 2026`. */
export function dayText(iso: string | undefined): string {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);

/**
 * The slot a dropped file goes in, by its type and its name. A name that says the slot wins
 * ("… stems …", "artwork.png"); then the first single slot of its type that is still free; then a
 * slot that holds several; else "other". `taken` is the single slots already filled in this drop.
 */
export function slotFor(name: string, contentType: string, slots: SlotView[], taken: ReadonlySet<string> = new Set()): string {
  const type = fileTypeOf(name, contentType);
  const fits = slots.filter(slot => slot.accepts.includes(type));
  if (!fits.length) return 'other';
  const inName = new Set(words(name.replace(/\.[^.]+$/, '')));
  const said = fits.find(slot => [...words(slot.key), ...words(slot.label)].some(word => inName.has(word) || inName.has(word.replace(/s$/, ''))) && (slot.many || !taken.has(slot.key)));
  if (said) return said.key;
  const free = fits.find(slot => !slot.many && !taken.has(slot.key));
  if (free) return free.key;
  return fits.find(slot => slot.many)?.key ?? 'other';
}

/** Where each file of one drop goes: single slots are filled once, in the order the files came. */
export function placeFiles(files: { name: string; type?: string }[], slots: SlotView[], filled: ReadonlySet<string> = new Set()): string[] {
  const taken = new Set(filled);
  return files.map(file => {
    const slot = slotFor(file.name, file.type ?? '', slots, taken);
    if (slots.some(s => s.key === slot && !s.many)) taken.add(slot);
    return slot;
  });
}

const isEmpty = (value: unknown): boolean => value == null || value === '' || (Array.isArray(value) && !value.length) || (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value as object).length);

/** Rows a person left half filled are dropped: a link with no address, a part with no name. */
export function tidyValue(kind: FieldKind, value: unknown): unknown {
  if (typeof value === 'string') return value.trim();
  if (!Array.isArray(value)) {
    if (kind === 'group' && value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key, v]) => key.trim() && !isEmpty(v)));
    return value;
  }
  if (kind === 'tags') return [...new Set(value.map(item => String(item).trim()).filter(Boolean))];
  if (kind === 'links' || kind === 'playlists') return value.filter(row => row && String(row.platform ?? '').trim() && String(row.url ?? '').trim());
  if (kind === 'parts') return value.filter(row => row && String(row.name ?? '').trim());
  return value;
}

/**
 * What a form sends: only the fields that differ from what was read, an emptied one as "" (which
 * clears it). Nothing changed: an empty object.
 */
export function changedFields(fields: FieldView[], before: Record<string, FieldValue | undefined>, after: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const next = tidyValue(field.kind, after[field.key]);
    const prev = before[field.key];
    if (isEmpty(next)) {
      if (!isEmpty(prev)) out[field.key] = '';
    } else if (JSON.stringify(next) !== JSON.stringify(prev)) out[field.key] = next;
  }
  return out;
}

/** A field's value as one line of text, for a details row. */
export function valueLine(kind: FieldKind, value: FieldValue | undefined): string {
  if (isEmpty(value)) return '';
  if (kind === 'links' || kind === 'playlists') return (value as { platform: string }[]).map(row => row.platform).join(', ');
  if (kind === 'parts') return (value as { name: string }[]).map(row => row.name).join(', ');
  if (kind === 'group')
    return Object.entries(value as Record<string, string | string[]>)
      .map(([key, v]) => `${key}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join(' · ');
  return Array.isArray(value) ? (value as string[]).join(', ') : String(value);
}

/**
 * A group's rows as an entry shows them: its known keys first, in the template's order and by their
 * labels, then the rest by their own names. A link row carries the link when it is one that opens.
 */
export function groupRows(field: Pick<FieldView, 'keys'>, value: unknown): { key: string; label: string; text: string; href?: string }[] {
  const group = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, string | string[]>) : {};
  const known = field.keys ?? [];
  const text = (v: string | string[]) => (Array.isArray(v) ? v.join(', ') : String(v));
  const rows = known
    .filter(k => group[k.key] !== undefined && text(group[k.key]).trim())
    .map(k => {
      const value = text(group[k.key]).trim();
      return { key: k.key, label: k.label, text: value, ...(k.kind === 'link' && /^https?:\/\/[^\s"'<>]+$/i.test(value) && { href: value }) };
    });
  const rest = Object.entries(group)
    .filter(([key]) => !known.some(k => k.key === key))
    .map(([key, v]) => ({ key, label: key, text: text(v) }));
  return [...rows, ...rest];
}

/** Seconds as `1:05`. */
export const clock = (seconds: number | undefined): string => (seconds == null || !Number.isFinite(seconds) ? '' : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`);

/** The filters a collection offers at the end of its breadcrumb: each choice field, and each slot as "has it" or "lacks it". */
export function filtersOf(collection: Pick<CollectionView, 'fields' | 'slots'>): { choices: FieldView[]; slots: SlotView[] } {
  return { choices: collection.fields.filter(field => field.kind === 'choice' && field.options?.length), slots: collection.slots };
}

/** The query of an entries list, from what is typed and picked. */
export function listQuery(at: { space: string; collection?: string | null; q?: string; where?: Record<string, string>; files?: string; limit?: number; meaning?: boolean; cells?: string[]; pictures?: boolean }): string {
  const params = new URLSearchParams({ space: at.space, limit: String(at.limit ?? 200) });
  const cells = (at.cells ?? []).filter(key => !key.startsWith('has:') && key !== 'updatedAt');
  if (cells.length) params.set('cells', cells.join(','));
  if (at.pictures) params.set('pictures', '1');
  if (at.collection) params.set('collection', at.collection);
  if (at.q?.trim()) params.set('q', at.q.trim());
  // by meaning only with words: without them it is the plain list
  if (at.meaning && at.q?.trim()) params.set('meaning', '1');
  for (const [key, value] of Object.entries(at.where ?? {})) if (value) params.append('where', `${key}=${value}`);
  // files: "has:<slot>" or "lacks:<slot>"
  const files = /^(has|lacks):([a-z0-9-]+)$/.exec(at.files ?? '');
  if (files) params.set(files[1], files[2]);
  return params.toString();
}

export const dollars = (amount: number): string => (amount > 0 && amount < 0.01 ? '< $0.01' : `$${amount.toFixed(2)}`);

/* ---------- the views of a collection ---------- */

/**
 * How a collection's entries are laid out. Each behaves its own way: the grid ('sheet', the default) is a
 * table with the columns the space chose, cards ('grid') show a picture, folders group by a field.
 * The ids stay as they were, so links made before keep their view.
 */
export const VIEWS = ['grid', 'list', 'sheet', 'folders'] as const;
export type LibraryView = (typeof VIEWS)[number];
export const DEFAULT_VIEW: LibraryView = 'sheet';
export const viewOf = (value: unknown): LibraryView => (VIEWS.includes(value as LibraryView) ? (value as LibraryView) : DEFAULT_VIEW);

export interface SheetColumn {
  /** A field's key, `has:<slot>` for a file slot, or `updatedAt`. */
  key: string;
  label: string;
  kind: 'field' | 'slot' | 'date';
  /** A field column's kind of value, which says how its cell is edited. */
  field?: FieldKind;
  /** A part of a field (`distrokid.upc`, `storeLinks.spotify`): the field it is inside. */
  parent?: { key: string; label: string };
}

type WithParts = Pick<CollectionView, 'fields' | 'slots' | 'titleField'> & { learned?: CollectionView['learned'] };

/**
 * The parts of a field that can be columns of their own: each key a group is known to hold, and each
 * platform a list of links has learned (its cell is that platform's link).
 */
export function partColumns(field: FieldView, learned: CollectionView['learned'] = {}): SheetColumn[] {
  const parent = { key: field.key, label: field.label };
  if (field.kind === 'group') return (field.keys ?? []).map(part => ({ key: `${field.key}.${part.key}`, label: part.label, kind: 'field' as const, field: part.kind === 'date' ? ('date' as const) : ('text' as const), parent }));
  if (field.kind !== 'links' || !field.learns) return [];
  const seen = new Set<string>();
  return (learned[field.learns] ?? []).flatMap(platform => {
    const key = learnKey(platform);
    if (!/^[a-z0-9]{1,60}$/.test(key) || seen.has(key)) return [];
    seen.add(key);
    return [{ key: `${field.key}.${key}`, label: platform, kind: 'field' as const, field: 'text' as const, parent }];
  });
}

/** Field kinds a grid shows as their own value; the rest arrive as one line (`cells`). */
export const SHORT_KINDS: FieldKind[] = ['text', 'choice', 'date', 'number', 'tags'];

/** Every column a grid can show: each field (the title first) with its parts after it, each file slot, and the day it changed. */
export function columnChoices(collection: WithParts): SheetColumn[] {
  const title = collection.fields.find(field => field.key === collection.titleField);
  return [
    ...[...(title ? [title] : []), ...collection.fields.filter(field => field.key !== collection.titleField)].flatMap(field => [{ key: field.key, label: field.label, kind: 'field' as const, field: field.kind }, ...partColumns(field, collection.learned)]),
    ...collection.slots.map(slot => ({ key: `has:${slot.key}`, label: slot.label, kind: 'slot' as const })),
    { key: 'updatedAt', label: 'Changed', kind: 'date' as const },
  ];
}

/**
 * A grid's columns. The space's own choice when it made one (the title always first; a key the
 * template no longer has is dropped), else the title, the other short fields, a column a file slot,
 * then when it last changed. A part of a field (`distrokid.upc`) is a column like any other.
 */
export function sheetColumns(collection: WithParts & Pick<CollectionView, 'columns'>): SheetColumn[] {
  const choices = columnChoices(collection);
  const byKey = new Map(choices.map(column => [column.key, column]));
  if (collection.columns?.length) {
    const chosen = collection.columns.map(key => byKey.get(key)).filter((column): column is SheetColumn => !!column && column.key !== collection.titleField);
    const title = byKey.get(collection.titleField);
    return [...(title ? [title] : []), ...chosen];
  }
  // a part of a field is a column only when it was chosen
  return choices.filter(column => column.kind !== 'field' || (!column.parent && SHORT_KINDS.includes(column.field!)));
}

/** What a sheet's cell holds, as text ("" when empty). A slot's cell is how many files it has; a long field's is its one line. */
export function cellText(row: Pick<EntryRow, 'facts' | 'has' | 'updatedAt' | 'title' | 'cells'>, column: SheetColumn, titleField = 'title'): string {
  if (column.kind === 'date') return dayText(row.updatedAt);
  if (column.kind === 'slot') return row.has[column.key.slice(4)] ? String(row.has[column.key.slice(4)]) : '';
  const value = row.facts[column.key] ?? row.cells?.[column.key] ?? (column.key === titleField ? row.title : undefined);
  return value === undefined ? '' : Array.isArray(value) ? value.join(', ') : value;
}

/** How a cell is edited on a double-click: in the cell itself, in a dialog, or not at all. */
export function cellEditor(column: SheetColumn): 'inline' | 'choice' | 'dialog' | null {
  if (column.kind !== 'field' || !column.field) return null;
  // a part is changed where its field is: the field's own editor, whole
  if (column.parent) return 'dialog';
  if (column.field === 'choice') return 'choice';
  if (column.field === 'text' || column.field === 'number' || column.field === 'date') return 'inline';
  return 'dialog';
}

/** Rows in a column's order. Empty cells go last either way, and numbers sort as numbers. */
export function sortRows<T extends Pick<EntryRow, 'facts' | 'has' | 'updatedAt' | 'title' | 'cells'>>(rows: T[], column: SheetColumn, direction: 'asc' | 'desc', titleField = 'title'): T[] {
  const keyOf = (row: T) => (column.kind === 'date' ? row.updatedAt : cellText(row, column, titleField));
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const [x, y] = [keyOf(a), keyOf(b)];
    if (!x || !y) return x ? -1 : y ? 1 : 0;
    return sign * x.localeCompare(y, 'en', { numeric: true, sensitivity: 'base' });
  });
}

/** The fields a collection can be put in folders by: a choice, or a list that learns (an artist, a label, genres). */
export function folderFields(collection: Pick<CollectionView, 'fields'>): FieldView[] {
  return collection.fields.filter(field => field.kind === 'choice' || (!!field.learns && (field.kind === 'text' || field.kind === 'tags')));
}

export const NOT_SET = 'Not set';

/**
 * Entries as folders by one field, the fullest first and "Not set" last. An entry with several
 * values (two genres) is in each of their folders.
 */
export function foldersOf<T extends Pick<EntryRow, 'facts'>>(rows: T[], field: string): { name: string; rows: T[] }[] {
  const folders = new Map<string, T[]>();
  for (const row of rows) {
    const value = row.facts[field];
    const names = Array.isArray(value) ? value : value ? [value] : [];
    for (const name of names.length ? names : [NOT_SET]) folders.set(name, [...(folders.get(name) ?? []), row]);
  }
  return [...folders].map(([name, list]) => ({ name, rows: list })).sort((a, b) => Number(a.name === NOT_SET) - Number(b.name === NOT_SET) || b.rows.length - a.rows.length || a.name.localeCompare(b.name));
}

/**
 * The prompt a person copies from the Add dialog and gives to Claude, so the entry is added from a
 * computer with `mm library` instead of through the browser: where it goes, the guide to read
 * first, the slots, and the rule that nothing is saved before they agree.
 */
export function addPrompt(space: Pick<SpaceView, 'id' | 'name' | 'personal'>, collection: Pick<CollectionView, 'slug' | 'name' | 'noun' | 'fields' | 'slots' | 'titleField'>, title = ''): string {
  const at = space.personal ? '' : ` --project=${space.id}`;
  const titleKey = collection.titleField;
  const never = collection.fields.filter(field => field.neverGuess).map(field => field.label.toLowerCase());
  const named = title.trim();
  return [
    `Add ${named ? `the ${collection.noun} "${named}"` : `a ${collection.noun}`} to my MediaMake Cloud Library: the ${collection.name} collection of the ${space.personal ? 'Personal' : space.name} space.`,
    '',
    `1. Read how the collection is filled: mm library guide ${collection.slug}${at}`,
    `2. Ask me for the files or the folder if I have not given them. Each file goes in one slot: ${collection.slots.map(slot => `${slot.key} (${slot.label.toLowerCase()}${slot.many ? ', several' : ''})`).join(', ')}.`,
    `3. Check it is not there already: mm library search "<the title>" --collection=${collection.slug}${at}`,
    `4. Run mm library save ${collection.slug}${at} --set ${titleKey}="${named || '<the title>'}" --set <field>=<value> --file <slot>=<path> without --yes, and show me the sentence it prints.`,
    '5. Add --yes only after I agree.',
    '',
    `Fill only what the files or I tell you.${never.length ? ` Never guess: ${never.join(', ')}.` : ''} Leave the rest empty.`,
  ].join('\n');
}

/* ---------- filling with Claude ---------- */

const TEXT_NAMES = /\.(txt|json|lrc|srt|vtt|md|csv|tsv|ya?ml)$/i;
/** The most a browser reads of one file to send to Claude: past it the file goes by name only. */
export const MAX_FILL_READ_BYTES = 1_000_000;

/** Whether a dropped file is text a browser can read for Claude (a transcript, lyrics, a release pack). */
export const readsAsText = (file: { name: string; type?: string }) => /^text\//.test(file.type ?? '') || file.type === 'application/json' || TEXT_NAMES.test(file.name);

/** "Artist", "Artist and Genres", "Artist, Genres and Lyrics". */
export function listOf(names: string[]): string {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** What Claude suggested, put only where the form is still empty. Answers the new values and the fields it filled. */
export function applyFill(fields: FieldView[], values: Record<string, unknown>, suggested: Record<string, unknown>): { values: Record<string, unknown>; filled: string[] } {
  const next = { ...values };
  const filled: string[] = [];
  for (const field of fields) {
    if (!(field.key in suggested)) continue;
    if (!isEmpty(tidyValue(field.kind, values[field.key]))) continue;
    next[field.key] = suggested[field.key];
    filled.push(field.key);
  }
  return { values: next, filled };
}

/** `1:05` for 65 seconds: where in a song a piece was found. */
export const clockOf = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
