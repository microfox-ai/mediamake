import { slugOf, type CatalogVideo, type ItemVideo } from './types';

/**
 * Videos on catalog items (see CatalogVideo): YouTube links, their
 * thumbnails, and the colour a card shows before it has one. Pure, so the
 * pages, the admin API and the tests share it.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Path sections whose next part is the video id: /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>. */
const ID_SECTIONS = new Set(['embed', 'shorts', 'live', 'v']);

/**
 * The video id in a YouTube link, or null when it isn't a link to one video:
 * youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ and /live/ links, on
 * www., m. and music. too, with or without https://.
 */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  const [, first, second] = url.pathname.split('/');
  let id: string | null = null;
  if (host === 'youtu.be') id = first ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : ID_SECTIONS.has(first) ? (second ?? null) : null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/**
 * Where an item's video plays for viewers: a course on its own page, which
 * plays its lessons in order; anything else on its item page (/access).
 */
export function watchPath(id: string) {
  // ids are `<kind>/<slug>` in [a-z0-9-]: safe in a query as they are
  return id.startsWith('course/') ? `/courses/${slugOf(id)}` : `/access?item=${id}`;
}

/** The video's page on YouTube. */
export function youtubeUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** The player to embed: no related videos from other channels at the end. */
export function youtubeEmbedUrl(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

/** YouTube's own thumbnail, the default when none is uploaded. */
export function youtubeThumbnail(id: string) {
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

/**
 * The thumbnail every video has: maxresdefault exists only for HD uploads,
 * and YouTube answers a 120×90 grey image for the others.
 */
export function youtubeFallbackThumbnail(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** Swaps YouTube's grey 120×90 "no maxres" image for the thumbnail every video has. */
export function onYouTubeThumbnailLoad(event: { currentTarget: HTMLImageElement }) {
  const img = event.currentTarget;
  const id = /img\.youtube\.com\/vi\/([A-Za-z0-9_-]{11})\/maxresdefault\.jpg$/.exec(img.src)?.[1];
  if (id && img.naturalWidth <= 120) img.src = youtubeFallbackThumbnail(id);
}

/**
 * The thumbnail to show for a video: the uploaded one, else YouTube's, else
 * (a course) its first lesson's that has one.
 */
export function videoThumbnail(video: Pick<CatalogVideo, 'thumbnail' | 'youtubeId' | 'lessons'>, videos?: Map<string, CatalogVideo>): string | undefined {
  if (video.thumbnail) return video.thumbnail;
  if (video.youtubeId) return youtubeThumbnail(video.youtubeId);
  for (const lesson of video.lessons ?? []) {
    const found = videos?.get(lesson);
    if (found?.thumbnail || found?.youtubeId) return videoThumbnail({ thumbnail: found.thumbnail, youtubeId: found.youtubeId });
  }
  return undefined;
}

/** What a card carries of a stored video (see ItemVideo). */
export function toItemVideo(video: CatalogVideo, videos?: Map<string, CatalogVideo>): ItemVideo {
  return {
    ...(video.youtubeId && { youtubeId: video.youtubeId }),
    title: video.title,
    description: video.description,
    ...(videoThumbnail(video, videos) && { thumbnail: videoThumbnail(video, videos) }),
    ...(video.lessons && { lessons: video.lessons }),
  };
}

/** The items with `video` set on the ones that have one. */
export function withVideos<T extends { id: string; video?: ItemVideo }>(items: T[], videos: CatalogVideo[]): T[] {
  const byId = new Map(videos.map(video => [video.id, video]));
  return items.map(item => {
    const video = byId.get(item.id);
    return video ? { ...item, video: toItemVideo(video, byId) } : item;
  });
}

/** A card's summary from a video's description: its first paragraph, at most `max` characters. */
export function summaryFrom(description: string, max = 500) {
  const first = description.trim().split(/\n\s*\n/)[0].replace(/\s+/g, ' ');
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

/** A stable hue (0–359) for an item: the same id always gets the same colour. */
export function itemHue(id: string) {
  // FNV-1a: small, and spreads similar names (pack-brand-kit, pack-youtube) apart
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 360;
}

/** The background a card shows instead of a thumbnail: a gradient in the item's own colour, dark enough for white text. */
export function placeholderBackground(id: string) {
  const hue = itemHue(id);
  return `linear-gradient(135deg, hsl(${hue} 62% 42%), hsl(${(hue + 35) % 360} 66% 30%))`;
}
