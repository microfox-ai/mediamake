/**
 * Collections listed in Explore (docs/library.md › Listed in Explore). The owner of a space can
 * list one of its collections: its card (name, what it is, how many entries), its template and a
 * sample of titles show in Explore to everyone who may use the Library, with the rights its owner
 * wrote. "Request access" goes to the owner, who accepts or declines. An accepted request becomes
 * an ordinary share (./shares): the live collection, never a copy.
 *
 * Pure: what a listing and a request hold. ./listing-store keeps them.
 */
import { SLUG } from './index';
import type { ShareRole } from './shares';

export interface Listing {
  /** What the collection is, in the owner's words. */
  about: string;
  /** What someone given access may do with what is in it, in the owner's words. Never made up for them. */
  rights: string;
  at: string;
  by: string;
}

export const MAX_ABOUT = 600;
export const MAX_RIGHTS = 600;
export const MAX_NOTE = 400;
/** How many titles a listing shows as its sample. */
export const SAMPLE = 5;

const line = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/[ \t]+/g, ' ').trim().slice(0, max) : '');

/** `{ about, rights }`. The rights are the owner's to write: a listing without them is refused. */
export function cleanListing(body: unknown): { about: string; rights: string } | { error: string } {
  const ask = (body ?? {}) as Record<string, unknown>;
  const about = line(ask.about, MAX_ABOUT);
  const rights = line(ask.rights, MAX_RIGHTS);
  if (!rights) return { error: 'Say what someone given access may do with it (rights), in your own words: "Use in videos on your own channels, credit Sample Channel"' };
  return { about, rights };
}

export interface RequestRecord {
  /** The space the collection belongs to, and its id there. */
  from: string;
  collection: string;
  /** The space that asks: the asker's personal space, or a project they own or edit. */
  to: string;
  by: string;
  note: string;
  state: 'asked' | 'declined';
  at: string;
  decidedAt?: string;
}

export interface RequestAsk {
  from: string;
  collection: string;
  /** The space to open it to. Left out: the asker's personal space. */
  to?: string;
  note: string;
}

export function parseRequest(body: unknown): RequestAsk | { error: string } {
  const ask = (body ?? {}) as Record<string, unknown>;
  const id = (value: unknown) => (typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value) ? value.toLowerCase() : undefined);
  const from = id(ask.from);
  const collection = String(ask.collection ?? '').toLowerCase();
  if (!from || !SLUG.test(collection)) return { error: 'Which collection? from (its space) and collection (its id), as the listing gives them' };
  if (ask.to !== undefined && !id(ask.to)) return { error: 'to is the id of the space to open it to' };
  return { from, collection, ...(id(ask.to) && { to: id(ask.to) }), note: line(ask.note, MAX_NOTE) };
}

/** A listed collection as Explore shows it. */
export interface ListedCard {
  from: string;
  collection: string;
  name: string;
  /** Who lists it: the project's name, or the person's. */
  by: string;
  noun: string;
  template: string;
  entries: number;
  about: string;
  rights: string;
  headshot?: string;
  /** A few titles, never one its owner keeps internal. */
  sample: string[];
  fields: string[];
  slots: string[];
  /** What the viewer has to do with it. */
  state: 'yours' | 'have' | 'invited' | 'asked' | 'declined' | 'none';
}

/** A request as the collection's owner reads it. */
export interface RequestView {
  to: string;
  /** Who asks, and for which space. */
  name: string;
  space: string;
  note: string;
  at: string;
}

/** What the viewer has to do with a listed collection, from what is on record. */
export function stateOf(input: { mine: boolean; share?: 'invited' | 'accepted'; request?: 'asked' | 'declined' }): ListedCard['state'] {
  if (input.mine) return 'yours';
  if (input.share === 'accepted') return 'have';
  if (input.share === 'invited') return 'invited';
  return input.request ?? 'none';
}

export const ROLE_ON_ACCEPT: ShareRole = 'viewer';
