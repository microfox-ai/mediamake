/**
 * Ratings: any member rates any skill, MCP or app from 1 to 5 stars, once
 * (rating again changes it), wherever the item is shown: its page, its
 * dialog, or from Claude through mm-use's rate_item. Everyone sees an
 * item's average and how many rated it; nobody sees who gave what. Words go
 * with a rating as feedback (lib/feedback), which only its writer and the
 * admins read. This file is the record and the rules, with no database.
 */

const ITEM_ID = /^(skill|mcp|app)\/[a-z0-9][a-z0-9-]{0,63}$/;

export interface Rating {
  itemId: string;
  clientId: string;
  /** 1 to 5. */
  stars: number;
  /** The version they used, when they said. */
  version?: string;
  /** Where it came in: 'web' from a page, 'mm-use' from Claude. */
  source: string;
  createdAt: string;
  updatedAt: string;
}

/** What everyone sees of an item's ratings. */
export interface RatingSummary {
  /** One decimal, e.g. 4.6. */
  average: number;
  count: number;
}

export type RatingInput = Pick<Rating, 'itemId' | 'stars' | 'source'> & { version?: string };

export function parseRating(body: unknown): RatingInput | { error: string } {
  const { itemId, stars, version, source } = (body ?? {}) as Record<string, unknown>;
  if (typeof itemId !== 'string' || !ITEM_ID.test(itemId)) return { error: 'itemId must be a skill, MCP or app, such as skill/pack-brand-kit' };
  if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 1 || stars > 5) return { error: 'stars must be a whole number from 1 to 5' };
  const v = typeof version === 'string' ? version.trim().slice(0, 80) : '';
  const from = typeof source === 'string' && /^[a-z0-9-]{1,30}$/.test(source) ? source : 'api';
  return { itemId, stars, ...(v && { version: v }), source: from };
}

/** An item's average from its star counts; null when nobody rated it. */
export function summaryOf(stars: number[]): RatingSummary | null {
  if (!stars.length) return null;
  const total = stars.reduce((sum, value) => sum + value, 0);
  return { average: Math.round((total / stars.length) * 10) / 10, count: stars.length };
}

/** `4.6 (12)`, as a card writes it. */
export function ratingLabel(rating: RatingSummary): string {
  return `${rating.average.toFixed(1)} (${rating.count})`;
}

/** Each item with what members rated it. */
export function withRatings<T extends { id: string }>(items: T[], ratings: Map<string, RatingSummary>): T[] {
  if (!ratings.size) return items;
  return items.map(item => (ratings.has(item.id) ? { ...item, rating: ratings.get(item.id)! } : item));
}
