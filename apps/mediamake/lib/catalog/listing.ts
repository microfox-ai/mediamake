import { tierLabel, type MemberTier } from '../memberships/tiers';
import type { GalleryTile } from './gallery';
import { parseYouTubeId, youtubeThumbnail, youtubeUrl } from './video';

/**
 * An item's store listing, in MongoDB `catalog_listing`: what an admin adds
 * to it. Its tags and screenshots (pictures and videos of the item itself,
 * by link, like an app store listing's), a description for people, its
 * headshot (the 16:9 picture its cards show), an MCP's or an app's icon,
 * and a README for an item that has no README.md of its own (an MCP, an
 * app). Kept apart from the items, like the archive and the video, so a
 * skill from the repo can have one too. A repo skill's README.md says the
 * same things in its frontmatter (docs/item-readme.md); what an admin sets
 * here wins. Set on the item's release page (`set_listing`); shown on the
 * item's own page and in its dialog.
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
  /** What it is, for people, in a line or two: shown instead of the item's own summary. */
  description?: string;
  /** Its headshot: a 16:9 picture by https link. */
  headshot?: string;
  /** An MCP's or an app's icon: a square picture by https link. */
  icon?: string;
  /** Its README in Markdown, for an item without a README.md of its own. */
  readme?: string;
  updatedAt: string;
  updatedBy?: string;
}

/** The parts of a listing an admin sets. */
export type ListingFields = Pick<ItemListing, 'tags' | 'media' | 'description' | 'headshot' | 'icon' | 'readme'>;

export const MAX_LISTING_DESCRIPTION = 300;
export const MAX_LISTING_README = 32 * 1024;

/** True when nothing is left in a listing: its record goes. */
export function isEmptyListing(listing: ListingFields): boolean {
  return !listing.tags.length && !listing.media.length && !listing.description && !listing.headshot && !listing.icon && !listing.readme;
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

/**
 * Each item as its listing shows it: the listing's tags after its own (each once), its description
 * in place of the summary, its headshot and its icon.
 */
export function withListing<T extends { id: string; tags?: string[]; summary?: string; headshot?: string; icon?: string }>(
  items: T[],
  listings: Pick<ItemListing, 'id' | 'tags' | 'description' | 'headshot' | 'icon'>[],
): T[] {
  const byId = new Map(listings.map(listing => [listing.id, listing]));
  return items.map(item => {
    const listing = byId.get(item.id);
    if (!listing) return item;
    return {
      ...item,
      ...(listing.tags?.length && { tags: [...new Set([...(item.tags ?? []), ...listing.tags])] }),
      ...(listing.description && { summary: listing.description }),
      ...(listing.headshot && { headshot: listing.headshot }),
      ...(listing.icon && { icon: listing.icon }),
    };
  });
}

/** The picture a card shows for an item: its headshot, else its video's thumbnail. None: the card draws its title on its own colour. */
export function headshotOf(item: { headshot?: string; video?: { thumbnail?: string } | null }): string | undefined {
  return item.headshot ?? item.video?.thumbnail ?? undefined;
}

/** `68 KB`, `1.4 MB`: an item's size on its listing. */
export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return mb < 1024 ? `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(1)} GB`;
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

/** One badge under an item's title: where it stands, who it opens for, its version, its size, what it works with. */
export interface ListingBadge {
  label: string;
  tone: 'good' | 'warn' | 'bad' | 'plain';
  /** What it means, in one line. */
  title?: string;
}

/**
 * The badges of a store item, in the order every listing shows them: Failed
 * (only when it is), Beta or Ready, the membership that opens it, its
 * version, its size and how many items it works with.
 */
export function listingBadges(item: {
  beta: boolean;
  failed?: boolean;
  tier: MemberTier;
  version?: string;
  size?: { bytes: number; files?: number };
  deps?: number;
}): ListingBadge[] {
  const badges: ListingBadge[] = [];
  if (item.failed) badges.push({ label: 'Failed', tone: 'bad', title: 'It is broken right now' });
  badges.push(
    item.beta
      ? { label: 'Beta', tone: 'warn', title: 'Published, not yet proven by a finished production made with it' }
      : { label: 'Ready', tone: 'good', title: 'Proven by a finished production made with it' },
  );
  badges.push({ label: tierLabel(item.tier), tone: 'plain', title: item.tier === 'public' ? 'Open to everyone' : `Opens with a ${tierLabel(item.tier)} membership and above` });
  if (item.version) badges.push({ label: `v${item.version.replace(/^v/, '')}`, tone: 'plain', title: 'Its latest version' });
  if (item.size?.bytes) {
    const files = item.size.files;
    badges.push({ label: sizeLabel(item.size.bytes), tone: 'plain', title: files ? `${files} file${files === 1 ? '' : 's'}` : 'Its latest package' });
  }
  if (item.deps) badges.push({ label: `${item.deps} dependenc${item.deps === 1 ? 'y' : 'ies'}`, tone: 'plain', title: 'Other skills, MCPs and apps it works with' });
  return badges;
}
