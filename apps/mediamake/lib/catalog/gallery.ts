import type { ReadyProof } from './types';
import { parseYouTubeId, youtubeThumbnail, youtubeUrl } from './video';

/**
 * The "Made with this" gallery on an item's page, like a store listing's
 * screenshots: every production recorded as its proof (see ReadyProof), and
 * nothing else. The item's trailer (its intro video) is not something made
 * with it, so it is never a tile: it plays above the README. Pure, so the page, the
 * admin editor's preview and the tests share it.
 */

export interface GalleryTile {
  key: string;
  /** youtube: plays in place. video: an uploaded clip. image: a picture. link: only a title, and a link when it has one. */
  kind: 'youtube' | 'video' | 'image' | 'link';
  title: string;
  description?: string;
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

/** The productions as tiles, in the order they were recorded. The item's trailer is never one: it plays above its README. */
export function galleryTiles(proof: ReadyProof[]): GalleryTile[] {
  return proof.map((entry, i) => proofTile(entry, `proof-${i}`));
}
