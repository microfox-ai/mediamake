/**
 * Shared collections (docs/library.md › Shared collections). A collection belongs to the space it
 * was made in. Its owner can open it to a project (everyone on it) or to one person; they use the
 * collection itself, never a copy, so every change the owner makes reaches them at once.
 *
 * In the Library it was opened to, the collection has a name of its own there (`as`): `songs`, or
 * `songs-anime-music-zone` when that Library has a `songs` already. Every route takes that name
 * with the receiving space, so a shared collection is asked for like any other.
 */
import { SLUG, slugOf, type EntryRecord } from './index';

export const SHARE_ROLES = ['viewer', 'editor'] as const;
/** viewer: search, read, preview and fetch. editor: also add, change and delete. */
export type ShareRole = (typeof SHARE_ROLES)[number];

export interface ShareRecord {
  /** The space the collection belongs to. */
  from: string;
  /** The collection's id there. */
  collection: string;
  /** The space it was opened to: a project, or a person's personal space. */
  to: string;
  kind: 'project' | 'person';
  role: ShareRole;
  /** invited: the other side has not said yes. Nothing of the collection shows there until then. */
  state: 'invited' | 'accepted';
  /** The collection's id in the receiving space, set when the invitation is accepted. */
  as?: string;
  /** Entries marked "Internal only" are shown too. Off unless the owner ticks it. */
  internal?: boolean;
  by: string;
  at: string;
  acceptedBy?: string;
  acceptedAt?: string;
}

/** An entry's card as the receiving space reads it: under the collection's id there, with who shares it. */
export const cardThrough = (card: string, collection: string, entry: string, as: string, by: string): string => card.replace(`id ${collection}/${entry} ·`, `id ${as}/${entry} · shared by ${by} ·`);

/** What an invitation says before it is accepted. */
export const INVITATION = "This is the owner's live collection. It changes when they change it.";

/**
 * The id a shared collection gets in the Library it was opened to: its own, or with the sharing
 * space's name when that id is taken there (by a collection of that Library, or another shared one).
 */
export function aliasFor(slug: string, sourceName: string, taken: ReadonlySet<string>): string {
  if (!taken.has(slug)) return slug;
  const base = `${slug}-${slugOf(sourceName, 'shared')}`.slice(0, 72).replace(/-+$/, '');
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (SLUG.test(candidate) && !taken.has(candidate)) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

/** What someone can do through a share: an editor share makes editors of the receiving space's owner and editors only. */
export const roleThrough = (share: Pick<ShareRecord, 'role'>, roleThere: 'owner' | 'editor' | 'viewer'): ShareRole => (share.role === 'editor' && roleThere !== 'viewer' ? 'editor' : 'viewer');

/** An entry its owner keeps to their own space: marked "Internal only", and the share does not say otherwise. */
export const hiddenFromShare = (entry: Pick<EntryRecord, 'fields'>, share: Pick<ShareRecord, 'internal'>): boolean => !share.internal && typeof entry.fields?.use === 'string' && /^internal only$/i.test(entry.fields.use.trim());

/** The same rule as a database filter. */
export const visibleThrough = (share: Pick<ShareRecord, 'internal'>): Record<string, unknown> => (share.internal ? {} : { 'fields.use': { $not: /^internal only$/i } });

export interface ShareAsk {
  collection: string;
  /** A project's id, or a person's email address: one of the two. */
  project?: string;
  email?: string;
  role: ShareRole;
  internal: boolean;
}

/** `{ collection, project | email, role?, internal? }`. */
export function parseShareAsk(body: unknown): ShareAsk | { error: string } {
  const ask = (body ?? {}) as Record<string, unknown>;
  const collection = String(ask.collection ?? '').toLowerCase();
  if (!SLUG.test(collection)) return { error: 'collection is the id of the collection to share' };
  const project = typeof ask.project === 'string' && /^[0-9a-f]{24}$/i.test(ask.project) ? ask.project.toLowerCase() : undefined;
  const email = typeof ask.email === 'string' && /^[^\s@]{1,100}@[^\s@]{1,150}\.[^\s@]{2,}$/.test(ask.email.trim()) ? ask.email.trim().toLowerCase() : undefined;
  if (!project === !email) return { error: 'Share with one project (project: its id) or one person (email: their address)' };
  const role = ask.role === undefined ? 'viewer' : ask.role;
  if (role !== 'viewer' && role !== 'editor') return { error: 'role is "viewer" (reads and fetches) or "editor" (also adds and changes)' };
  return { collection, ...(project && { project }), ...(email && { email }), role, internal: ask.internal === true };
}

/** A project's own notes on a shared entry: they stay in that project and never touch the source. */
export interface ShareNotes {
  /** 1 to 5, or none. */
  rating?: number;
  tags: string[];
  /** The productions it was used in. */
  usedIn: string[];
}

const words = (value: unknown, max: number, each: number): string[] =>
  Array.isArray(value) ? [...new Set(value.map(item => (typeof item === 'string' ? item.replace(/\s+/g, ' ').trim().slice(0, each) : '')).filter(Boolean))].slice(0, max) : [];

export function cleanNotes(body: unknown): ShareNotes {
  const ask = (body ?? {}) as Record<string, unknown>;
  const rating = Number(ask.rating);
  return { ...(Number.isInteger(rating) && rating >= 1 && rating <= 5 && { rating }), tags: words(ask.tags, 30, 40), usedIn: words(ask.usedIn, 100, 120) };
}

export const emptyNotes = (notes: ShareNotes): boolean => !notes.rating && !notes.tags.length && !notes.usedIn.length;

/** How a share reads in a list: who has it, what they may do, and what they fetched. */
export interface ShareView {
  to: string;
  kind: 'project' | 'person';
  /** The project's name, or the person's. */
  name: string;
  role: ShareRole;
  state: 'invited' | 'accepted';
  internal: boolean;
  at: string;
  /** Bytes fetched through this share in the days asked for, and by how many people. */
  fetchedBytes: number;
  fetches: number;
  people: number;
}

/** A collection someone opened to this space, before it is accepted. */
export interface InvitationView {
  from: string;
  collection: string;
  name: string;
  /** Who shares it: the project's name, or the person's. */
  by: string;
  noun: string;
  entries: number;
  role: ShareRole;
  /** What accepting means, in plain words. */
  says: string;
}

/** What one share fetched, from the usage lines of its collection. */
export function fetchedThrough(lines: { via?: string; clientId: string; action: string; bytes?: number }[]): Record<string, { fetchedBytes: number; fetches: number; people: number }> {
  const sums: Record<string, { fetchedBytes: number; fetches: number; who: Set<string> }> = {};
  for (const line of lines) {
    if (!line.via || line.action !== 'fetch') continue;
    const sum = (sums[line.via] ??= { fetchedBytes: 0, fetches: 0, who: new Set() });
    sum.fetchedBytes += line.bytes ?? 0;
    sum.fetches += 1;
    sum.who.add(line.clientId);
  }
  return Object.fromEntries(Object.entries(sums).map(([via, sum]) => [via, { fetchedBytes: sum.fetchedBytes, fetches: sum.fetches, people: sum.who.size }]));
}
