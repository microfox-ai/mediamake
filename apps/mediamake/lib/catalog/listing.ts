import type { GalleryTile } from './gallery';
import { parseYouTubeId, youtubeThumbnail, youtubeUrl } from './video';

/**
 * An item's store listing, in MongoDB `catalog_listing`: the tags an admin
 * added and its screenshots (pictures and videos of the item itself, added by
 * link, like an app store listing's). Kept apart from the items, like the
 * archive and the video, so a skill from the repo can have one too. Set on
 * the item's release page (`set_listing`); shown on the item's own page.
 */

/** A picture or a video of the item, by its https link. A YouTube link plays in place; any other video is an MP4 or WebM. */
export interface ListingMedia {
  kind: 'image' | 'video';
  url: string;
  /** What it shows, in a few words. */
  title?: string;
}

export interface ItemListing {
  /** The item it belongs to, e.g. `skill/pack-brand-kit`. */
  id: string;
  /** Tags an admin added, beside the ones the item already has (a skill's category). */
  tags: string[];
  media: ListingMedia[];
  updatedAt: string;
  updatedBy?: string;
}

export const MAX_LISTING_TAGS = 12;
export const MAX_LISTING_MEDIA = 12;

/** A tag as stored: lowercase letters, digits and dashes ("Lyric Video" is `lyric-video`); null when nothing is left of it. */
export function parseTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const tag = value
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return tag && tag.length <= 30 ? tag : null;
}

/** Tags as typed, each once, in order; the ones that aren't tags are left out. */
export function parseTags(values: unknown[]): string[] {
  return [...new Set(values.map(parseTag).filter((tag): tag is string => !!tag))];
}

/** What a link is taken for when the admin doesn't say: a YouTube link or an MP4, WebM or MOV is a video, anything else a picture. */
export function mediaKindOf(url: string): ListingMedia['kind'] {
  if (parseYouTubeId(url)) return 'video';
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url.trim()) ? 'video' : 'image';
}

/** Each item with the tags its listing adds, after its own, each once. */
export function withListingTags<T extends { id: string; tags?: string[] }>(items: T[], listings: Pick<ItemListing, 'id' | 'tags'>[]): T[] {
  const added = new Map(listings.filter(listing => listing.tags?.length).map(listing => [listing.id, listing.tags]));
  return items.map(item => (added.has(item.id) ? { ...item, tags: [...new Set([...(item.tags ?? []), ...added.get(item.id)!])] } : item));
}

/** The screenshots as gallery tiles (see components/catalog/proof-gallery), in the order the admin put them. */
export function listingTiles(media: ListingMedia[]): GalleryTile[] {
  return media.map((entry, i) => {
    const key = `media-${i}`;
    const title = entry.title?.trim() || (entry.kind === 'video' ? 'Video' : `Screenshot ${i + 1}`);
    const youtubeId = entry.kind === 'video' ? parseYouTubeId(entry.url) : null;
    if (youtubeId) return { key, kind: 'youtube', title, youtubeId, poster: youtubeThumbnail(youtubeId), href: youtubeUrl(youtubeId) };
    if (entry.kind === 'video') return { key, kind: 'video', title, src: entry.url };
    return { key, kind: 'image', title, src: entry.url, poster: entry.url };
  });
}
