import type { ReadyProof } from './types';
import { parseYouTubeId, youtubeThumbnail, youtubeUrl } from './video';

/**
 * The "Made with this" gallery on an item's page, like a store listing's
 * screenshots: the item's trailer first (its intro video), then every
 * production recorded as its proof (see ReadyProof). Pure, so the page, the
 * admin editor's preview and the tests share it.
 */

export interface GalleryTile {
  key: string;
  /** youtube: plays in place. video: an uploaded clip. image: a picture. link: only a title, and a link when it has one. */
  kind: 'youtube' | 'video' | 'image' | 'link';
  title: string;
  description?: string;
  /** The item's own trailer, shown first and labelled so. */
  trailer?: boolean;
  youtubeId?: string;
  /** The clip (video) or the picture (image). */
  src?: string;
  /** What the tile shows before it plays, and in the strip. */
  poster?: string;
  /** Where the production can be seen. */
  href?: string;
}

/** One production as a tile: an uploaded clip first, else its YouTube link, else its picture, else its link. */
export function proofTile(entry: ReadyProof, key: string): GalleryTile {
  const base = { key, title: entry.title, ...(entry.url && { href: entry.url }) };
  if (entry.video) return { ...base, kind: 'video', src: entry.video, ...(entry.image && { poster: entry.image }) };
  const youtubeId = entry.url ? parseYouTubeId(entry.url) : null;
  if (youtubeId) return { ...base, kind: 'youtube', youtubeId, poster: entry.image || youtubeThumbnail(youtubeId), href: youtubeUrl(youtubeId) };
  if (entry.image) return { ...base, kind: 'image', src: entry.image, poster: entry.image };
  return { ...base, kind: 'link' };
}

/** The trailer (when the item has a video that plays), then the productions in the order they were recorded. */
export function galleryTiles(
  video: { youtubeId?: string; title: string; description?: string; thumbnail?: string } | null | undefined,
  proof: ReadyProof[],
): GalleryTile[] {
  const tiles: GalleryTile[] = [];
  if (video?.youtubeId) {
    tiles.push({
      key: 'trailer',
      kind: 'youtube',
      trailer: true,
      title: video.title,
      ...(video.description && { description: video.description }),
      youtubeId: video.youtubeId,
      poster: video.thumbnail || youtubeThumbnail(video.youtubeId),
      href: youtubeUrl(video.youtubeId),
    });
  }
  proof.forEach((entry, i) => tiles.push(proofTile(entry, `proof-${i}`)));
  return tiles;
}
