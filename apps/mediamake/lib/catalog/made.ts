import { proofTile, type GalleryTile } from './gallery';

/**
 * What members made with an item: its "Made with this" beside the productions
 * an admin recorded as its proof (ReadyProof). Anyone who can use the item
 * may add what they made with it: a title, and a link or a picture when it
 * has one. Kept in MongoDB `catalog_made` by the item's details key
 * (./made-store), so a store item and one in a member's space have them
 * alike. Whoever added one can take it back; an admin can remove any. Nobody
 * sees who added what. Pure, so the pages, the route and the tests share it.
 */

export interface MadeEntry {
  /** Its own id. */
  id: string;
  /** The item's details key: `catalog:skill/<name>`, `space:<spaceId>:skill/<name>`, `linked:<id>`. */
  key: string;
  /** What was made, e.g. "Nakama! lyric video". */
  title: string;
  /** Where it can be seen (a YouTube link plays in the gallery). */
  url?: string;
  /** A picture of it, by its https link. */
  image?: string;
  /** Who added it (a client id). Never sent to a page. */
  by: string;
  at: string;
}

/** One entry as a page gets it: without who added it, and `mine` for the viewer's own. */
export interface MadeShown {
  id: string;
  title: string;
  url?: string;
  image?: string;
  at: string;
  mine?: boolean;
}

/** How many an item keeps, and how many of them one member may add. */
export const MAX_MADE = 60;
export const MAX_MADE_EACH = 10;

const KEY = /^(catalog:(skill|mcp|app)\/[a-z0-9][a-z0-9-]{0,63}|space:[\w:./@ -]{1,200}:(skill|mcp|app)\/[\w.-]{1,100}|linked:[\w-]{1,100})$/;
const HTTPS = /^https:\/\/[^\s<>"']{4,2000}$/;

export const isMadeKey = (key: unknown): key is string => typeof key === 'string' && KEY.test(key);

/** A new entry as the route takes it: a title, and a link and a picture when it has them (https). */
export function parseMade(body: unknown): { key: string; title: string; url?: string; image?: string } | { error: string } {
  const { key, title, url, image } = (body ?? {}) as Record<string, unknown>;
  if (!isMadeKey(key)) return { error: 'key names a skill, MCP or app' };
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) return { error: 'Say what you made, in 200 characters or fewer' };
  const link = (value: unknown, what: string): string | undefined | { error: string } => {
    if (value === undefined || value === null || value === '') return undefined;
    return typeof value === 'string' && HTTPS.test(value.trim()) ? value.trim() : { error: `${what} must be an https link` };
  };
  const parsedUrl = link(url, 'The link');
  if (typeof parsedUrl === 'object') return parsedUrl;
  const parsedImage = link(image, 'The picture');
  if (typeof parsedImage === 'object') return parsedImage;
  return { key, title: title.trim(), ...(parsedUrl && { url: parsedUrl }), ...(parsedImage && { image: parsedImage }) };
}

/** The entries as a page gets them, the newest first. */
export function madeShown(entries: MadeEntry[], viewer?: string | null): MadeShown[] {
  return [...entries]
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(entry => ({
      id: entry.id,
      title: entry.title,
      ...(entry.url && { url: entry.url }),
      ...(entry.image && { image: entry.image }),
      at: entry.at,
      ...(viewer && entry.by === viewer && { mine: true }),
    }));
}

/** The entries as gallery tiles (a YouTube link plays, a picture shows, else a titled link), keyed `made-<id>`. */
export function madeTiles(entries: MadeShown[]): GalleryTile[] {
  return entries.map(entry => ({ ...proofTile({ title: entry.title, url: entry.url, image: entry.image }, `made-${entry.id}`), description: 'Added by a member' }));
}

/** The entry a tile shows, by the tile's key; undefined for a tile that is not a member's. */
export const madeIdOf = (tileKey: string): string | undefined => (tileKey.startsWith('made-') ? tileKey.slice('made-'.length) : undefined);
