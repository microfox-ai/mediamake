/**
 * What the Library's page (components/cloud-library) works out from the routes' answers: the shapes
 * it reads, where a dropped file goes, which fields a form changed, and how things are worded.
 * Pure, so the page and the tests share it.
 */
import { fileTypeOf, type EntryRecord, type FieldKind, type FieldValue, type FileType, type Prices, type UsageSum } from './index';

export interface FieldView {
  key: string;
  label: string;
  kind: FieldKind;
  group: string;
  options?: string[];
  learns?: string;
  neverGuess?: boolean;
  hint?: string;
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
  guide?: string;
  prefs?: string;
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
  space?: string;
  spaceId?: string;
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

/** The page's address for a space, a collection and an entry: what the breadcrumb links to. */
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

/** Seconds as `1:05`. */
export const clock = (seconds: number | undefined): string => (seconds == null || !Number.isFinite(seconds) ? '' : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`);

/** The filters a collection offers at the end of its breadcrumb: each choice field, and each slot as "has it" or "lacks it". */
export function filtersOf(collection: Pick<CollectionView, 'fields' | 'slots'>): { choices: FieldView[]; slots: SlotView[] } {
  return { choices: collection.fields.filter(field => field.kind === 'choice' && field.options?.length), slots: collection.slots };
}

/** The query of an entries list, from what is typed and picked. */
export function listQuery(at: { space: string; collection?: string | null; q?: string; where?: Record<string, string>; files?: string; limit?: number }): string {
  const params = new URLSearchParams({ space: at.space, limit: String(at.limit ?? 200) });
  if (at.collection) params.set('collection', at.collection);
  if (at.q?.trim()) params.set('q', at.q.trim());
  for (const [key, value] of Object.entries(at.where ?? {})) if (value) params.append('where', `${key}=${value}`);
  // files: "has:<slot>" or "lacks:<slot>"
  const files = /^(has|lacks):([a-z0-9-]+)$/.exec(at.files ?? '');
  if (files) params.set(files[1], files[2]);
  return params.toString();
}

export const dollars = (amount: number): string => (amount > 0 && amount < 0.01 ? '< $0.01' : `$${amount.toFixed(2)}`);
