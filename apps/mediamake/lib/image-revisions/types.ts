/*
 * File formats for the image revisions screen (/image-revision). See
 * components/image-revisions/README.md. An image set is any folder of images,
 * described by an index.json (written by the workflow that made the images:
 * apps/lyrics_videos/scripts/thumbs.ts, scripts/image-index.ts for any other
 * folder) or, without one, read straight from the folder. Revisions are
 * written by this page, beside the images.
 */
import type { CommentStatus, RevisionStatus } from '@/lib/revisions/types';

export const IMAGE_SET_SCHEMA = 'mediamake.image-set/v1';
export const IMAGE_REVISION_SCHEMA = 'mediamake.image-revision/v1';

/** One image of a set: `id` is how the user and Claude refer to it (A1, B3, hero-2…). */
export interface ImageItem {
  id: string;
  /** Path relative to the set's folder. */
  file: string;
  note?: string;
}

/** A row on the screen: a style of thumbnails, a layout of posters, a batch from a model. */
export interface ImageGroup {
  id: string;
  name: string;
  idea?: string;
  variants: ImageItem[];
}

/**
 * <folder>/index.json. Files may use `groups` / `items` instead of `styles` /
 * `variants` (the thumbnail engine's names); both are read the same way.
 */
export interface ImageSetIndex {
  schema?: string;
  /** The set's name (the folder's name). */
  job: string;
  /** thumbnail (1280×720) and poster (square album artwork) get their own rules; anything else is a plain image set. */
  kind?: string;
  title?: string;
  brand?: string;
  /** Pixel size when every image shares it; otherwise each tile takes its image's shape. */
  size?: [number, number];
  /** The skill or workflow that made the images, so Claude knows how to act on a revision (make-thumbnail, make-music-poster…). */
  workflow?: string;
  /** Where the images are made from (a spec, a prompt file), relative to the repo. */
  source?: string;
  /** Where this folder is, relative to the repo (browsers don't expose paths). */
  location?: string;
  /** The folder's absolute path on the machine that made it: Show in Finder / Copy path. */
  path?: string;
  /** The absolute path of what the images are made from (a spec, a prompt file). */
  sourcePath?: string;
  /** How many can be picked as final, and what a pick is called. */
  pick?: { max?: number; label?: string };
  styles: ImageGroup[];
  sheets?: string[];
  /** IDs the workflow copied to its finals (thumbs pick). */
  picked?: string[];
  /** IDs the workflow locked (thumbs keep). */
  kept?: string[];
}

export type ImageAction = 'final' | 'keep' | 'drop';

/** A point on one image, as fractions of its width and height. */
export interface ImagePin {
  image: string;
  x: number;
  y: number;
  /** the image's pixel size when pinned, so the spot can be given in pixels */
  size?: [number, number];
}

export interface ImageComment {
  id: string;
  /** The images it is about (one or many), by ID. */
  images: string[];
  text: string;
  /** Set when the comment points at a spot on one image. */
  pin?: ImagePin;
  /** Zoomed crop around the pin, relative to the revisions folder. */
  snapshot?: string;
  createdAt: string;
  updatedAt?: string;
  status: CommentStatus;
  /** Written by Claude when it handles the comment. */
  reply?: string;
}

export interface ImageRevision {
  schema: string;
  id: string;
  title: string;
  status: RevisionStatus;
  job: string;
  createdAt: string;
  updatedAt: string;
  /** Chosen as final: one cover, up to three thumbnails for YouTube's Test & Compare, or what the set allows. */
  final: string[];
  /** Lock as they are. */
  keep: string[];
  /** Not worth iterating on. */
  drop: string[];
  comments: ImageComment[];
  /** lastModified of each image when the revision was last edited, to spot re-renders. */
  renders: Record<string, number>;
}

/** YouTube's Test & Compare takes up to three thumbnails. */
export const MAX_FINAL = 3;

/** What differs between thumbnails, posters and any other image set on the review screen. */
export function formatOf(index: ImageSetIndex | null | undefined) {
  const kind = index?.kind;
  const poster = kind === 'poster';
  const thumbnail = kind === 'thumbnail' || (!kind && !!index?.size && index.size[0] === 1280 && index.size[1] === 720);
  const size = index?.size ?? (thumbnail ? [1280, 720] : undefined);
  return {
    poster,
    thumbnail,
    /** CSS aspect-ratio when every image shares a size; otherwise each image's own */
    aspect: size ? `${size[0]} / ${size[1]}` : undefined,
    ratio: size ? size[0] / size[1] : undefined,
    /** a poster has one cover; thumbnails one final or up to three for an A/B test */
    maxFinal: index?.pick?.max ?? (poster ? 1 : thumbnail ? MAX_FINAL : 99),
    finalLabel: index?.pick?.label ?? (poster ? 'Cover' : 'Final'),
    /** how wide it shows small: YouTube's feed, a streaming app's list, or just small */
    small: poster ? 160 : thumbnail ? 246 : 200,
    smallLabel: poster ? 'List size' : thumbnail ? 'Feed size' : 'Small',
    smallHint: poster ? "How it reads in a streaming app's list" : thumbnail ? "How it reads in YouTube's feed" : 'How it reads small',
    noun: poster ? 'posters' : thumbnail ? 'thumbnails' : 'images',
  };
}
