import { tierLabel, type MemberTier } from '../memberships/tiers';
import type { GalleryTile } from './gallery';
import { levelInfo, type ItemAdvice, type Readiness } from './types';
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
  /** An editors' pick: an admin's choice for the top of Explore. */
  editorsPick?: boolean;
  /** Not recommended or deprecated (see ItemAdvice); none: recommended. */
  advice?: Exclude<ItemAdvice, 'recommended'>;
  /** Why: shown on its card and page with the advice. */
  adviceNote?: string;
  /** The item to use instead, by id (`mcp/elevenlabs`). */
  insteadOf?: string;
  updatedAt: string;
  updatedBy?: string;
}

/** The parts of a listing an admin sets. */
export type ListingFields = Pick<ItemListing, 'tags' | 'media' | 'description' | 'headshot' | 'icon' | 'readme' | 'editorsPick' | 'advice' | 'adviceNote' | 'insteadOf'>;

export const MAX_LISTING_DESCRIPTION = 300;
export const MAX_ADVICE_NOTE = 300;
export const MAX_LISTING_README = 32 * 1024;

/** True when nothing is left in a listing: its record goes. */
export function isEmptyListing(listing: ListingFields): boolean {
  return (
    !listing.tags.length &&
    !listing.media.length &&
    !listing.description &&
    !listing.headshot &&
    !listing.icon &&
    !listing.readme &&
    !listing.editorsPick &&
    !listing.advice
  );
}

export const MAX_LISTING_TAGS = 12;
export const MAX_LISTING_MEDIA = 12;

/** The picture types a listing takes: a headshot, an icon, a screenshot. */
export const LISTING_PICTURE_TYPE = /^image\/(png|jpeg|webp|gif|avif)$/;

/** A picture as a listing keeps it: an https link. */
export const isPictureLink = (value: string) => /^https:\/\/\S{1,1000}$/.test(value);

/**
 * The part of a listing the people who look after an item set themselves (its authors, see
 * ./authors): its description, its pictures (the headshot and, for an MCP or an app, the icon), its
 * tags, its README and its screenshots. What is an admin's stays theirs: the editors' pick and the
 * advice (and, outside the listing, its level, tier, health and archive).
 */
export type AuthorListing = Partial<Pick<ItemListing, 'description' | 'headshot' | 'icon' | 'readme' | 'tags' | 'media'>>;
export const LISTING_PICTURES = ['headshot', 'icon'] as const;

/** One screenshot or video as it is sent, checked: a picture or a video by https link, with a caption. */
function parseMedia(value: unknown): { media: ListingMedia[] } | { error: string } {
  if (!Array.isArray(value)) return { error: 'media must be a list of { kind, url, title? }' };
  if (value.length > MAX_LISTING_MEDIA) return { error: `at most ${MAX_LISTING_MEDIA} pictures and videos` };
  const media: ListingMedia[] = [];
  for (const [i, entry] of value.entries()) {
    const one = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    if (one.kind !== 'image' && one.kind !== 'video') return { error: `media.${i}.kind is image or video` };
    const url = typeof one.url === 'string' ? one.url.trim() : '';
    if (!isPictureLink(url)) return { error: `media.${i}.url must be an https link` };
    if (one.title !== undefined && typeof one.title !== 'string') return { error: `media.${i}.title must be text` };
    const title = typeof one.title === 'string' ? one.title.trim() : '';
    if (title.length > 120) return { error: `media.${i}.title: keep it under 120 characters` };
    media.push({ kind: one.kind, url, ...(title && { title }) });
  }
  return { media };
}

/**
 * A change to that part as it is sent: `description` (text, in a line or two), `headshot` and `icon`
 * (each an https link), `readme` (Markdown), `tags` (a list of words; the item's own, `ownTags`, are
 * not kept again) and `media` (its screenshots, in order). One given replaces what was there, an empty
 * one clears it, one left out stays. A skill has no icon. Nothing else of a listing is read.
 */
export function parseAuthorListing(body: unknown, kind: string, ownTags: string[] = []): { change: AuthorListing } | { error: string } {
  const sent = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const change: AuthorListing = {};
  if (sent.description !== undefined) {
    if (typeof sent.description !== 'string') return { error: 'description must be text, or empty to clear it' };
    const description = sent.description.trim();
    if (description.length > MAX_LISTING_DESCRIPTION) return { error: `Keep the description under ${MAX_LISTING_DESCRIPTION} characters` };
    change.description = description;
  }
  for (const key of LISTING_PICTURES) {
    const value = sent[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') return { error: `${key} must be an https link to a picture, or empty to clear it` };
    const link = value.trim();
    if (link && !isPictureLink(link)) return { error: `${key} must be an https link to a picture` };
    change[key] = link;
  }
  if (sent.readme !== undefined) {
    if (typeof sent.readme !== 'string') return { error: 'readme must be Markdown text, or empty to clear it' };
    if (sent.readme.length > MAX_LISTING_README) return { error: `Keep the README under ${Math.round(MAX_LISTING_README / 1024)} KB` };
    change.readme = sent.readme.trim();
  }
  if (sent.tags !== undefined) {
    if (!Array.isArray(sent.tags)) return { error: 'tags must be a list of words' };
    // the item's own tags (a skill's category) are not stored again
    const tags = parseTags(sent.tags).filter(tag => !ownTags.includes(tag));
    if (tags.length > MAX_LISTING_TAGS) return { error: `at most ${MAX_LISTING_TAGS} tags` };
    change.tags = tags;
  }
  if (sent.media !== undefined) {
    const parsed = parseMedia(sent.media);
    if ('error' in parsed) return parsed;
    change.media = parsed.media;
  }
  if (Object.values(change).every(value => value === undefined)) return { error: 'Give description, headshot, icon, readme, tags or media' };
  if (change.icon && kind === 'skill') return { error: 'Only an MCP or an app has an icon' };
  return { change };
}

/** A listing with that part changed: everything else on it stays as it is. */
export function withAuthorListing(current: ListingFields | null | undefined, change: AuthorListing): ListingFields {
  const next = (key: 'description' | 'headshot' | 'icon' | 'readme') => (change[key] === undefined ? current?.[key] : change[key] || undefined);
  return {
    tags: change.tags ?? current?.tags ?? [],
    media: change.media ?? current?.media ?? [],
    description: next('description'),
    headshot: next('headshot'),
    icon: next('icon'),
    readme: next('readme'),
    editorsPick: current?.editorsPick,
    advice: current?.advice,
    adviceNote: current?.adviceNote,
    insteadOf: current?.insteadOf,
  };
}

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
 * in place of the summary, its headshot, its icon, whether it is an editors' pick, and its advice
 * (not recommended or deprecated) with why and what to use instead.
 */
export function withListing<
  T extends { id: string; tags?: string[]; summary?: string; headshot?: string; icon?: string; editorsPick?: boolean; advice?: ItemListing['advice']; adviceNote?: string; insteadOf?: string },
>(items: T[], listings: Pick<ItemListing, 'id' | 'tags' | 'description' | 'headshot' | 'icon' | 'editorsPick' | 'advice' | 'adviceNote' | 'insteadOf'>[]): T[] {
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
      ...(listing.editorsPick && { editorsPick: true }),
      ...(listing.advice && { advice: listing.advice, ...(listing.adviceNote && { adviceNote: listing.adviceNote }), ...(listing.insteadOf && { insteadOf: listing.insteadOf }) }),
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
 * (only when it is), Deprecated or Not recommended (only when it is), its level
 * (Alpha, Beta or Production), the membership that opens it, its version, its
 * size and how many items it works with.
 */
export function listingBadges(item: {
  level: Readiness | undefined;
  advice?: ItemAdvice;
  failed?: boolean;
  tier: MemberTier;
  version?: string;
  size?: { bytes: number; files?: number };
  deps?: number;
}): ListingBadge[] {
  const badges: ListingBadge[] = [];
  if (item.failed) badges.push({ label: 'Failed', tone: 'bad', title: 'It is broken right now' });
  if (item.advice === 'deprecated') badges.push({ label: 'Deprecated', tone: 'bad', title: 'On its way out: use what its page names instead' });
  if (item.advice === 'not-recommended') badges.push({ label: 'Not recommended', tone: 'bad', title: 'It works, but there is a better way' });
  const level = levelInfo(item.level);
  badges.push({ label: level.label, tone: level.id === 'ready' ? 'good' : level.id === 'alpha' ? 'bad' : 'warn', title: level.about });
  badges.push({ label: tierLabel(item.tier), tone: 'plain', title: item.tier === 'public' ? 'Open to everyone' : `Opens with a ${tierLabel(item.tier)} membership and above` });
  if (item.version) badges.push({ label: `v${item.version.replace(/^v/, '')}`, tone: 'plain', title: 'Its latest version' });
  if (item.size?.bytes) {
    const files = item.size.files;
    badges.push({ label: sizeLabel(item.size.bytes), tone: 'plain', title: files ? `${files} file${files === 1 ? '' : 's'}` : 'Its latest package' });
  }
  if (item.deps) badges.push({ label: `${item.deps} dependenc${item.deps === 1 ? 'y' : 'ies'}`, tone: 'plain', title: 'Other skills, MCPs and apps it works with' });
  return badges;
}
