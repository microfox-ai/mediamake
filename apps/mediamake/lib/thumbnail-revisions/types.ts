/*
 * File formats for the thumbnail revisions screen. See
 * components/thumbnail-revisions/README.md. The job folder is written by
 * apps/lyrics_videos/scripts/thumbs.ts; revisions are written by this page.
 */
import type { CommentStatus, RevisionStatus } from '@/lib/revisions/types';

export const THUMB_REVISION_SCHEMA = 'mediamake.thumbnail-revision/v1';

/** out/thumbnails/<job>/index.json, written by `npm run thumbs -- render`. */
export interface ThumbIndex {
  job: string;
  title?: string;
  brand?: string;
  size: [number, number];
  styles: {
    id: string;
    name: string;
    idea?: string;
    variants: { id: string; file: string; note?: string }[];
  }[];
  sheets?: string[];
  /** IDs copied to final/ by `thumbs pick`. */
  picked?: string[];
  /** IDs locked by `thumbs keep`. */
  kept?: string[];
}

export type ThumbAction = 'final' | 'keep' | 'drop';

/** A point on one thumbnail, as fractions of its width and height. */
export interface ThumbPin {
  thumb: string;
  x: number;
  y: number;
}

export interface ThumbComment {
  id: string;
  /** The thumbnails it is about (one or many). */
  thumbs: string[];
  text: string;
  /** Set when the comment points at a spot on one thumbnail. */
  pin?: ThumbPin;
  /** Zoomed crop around the pin, relative to the revisions folder. */
  snapshot?: string;
  createdAt: string;
  updatedAt?: string;
  status: CommentStatus;
  /** Written by Claude when it handles the comment. */
  reply?: string;
}

export interface ThumbRevision {
  schema: string;
  id: string;
  title: string;
  status: RevisionStatus;
  job: string;
  createdAt: string;
  updatedAt: string;
  /** Chosen for upload: one final, or two or three for YouTube's Test & Compare. */
  final: string[];
  /** Lock as they are (`thumbs keep`). */
  keep: string[];
  /** Not worth iterating on. */
  drop: string[];
  comments: ThumbComment[];
  /** lastModified of each render when the revision was last edited, to spot re-renders. */
  renders: Record<string, number>;
}

/** YouTube's Test & Compare takes up to three thumbnails. */
export const MAX_FINAL = 3;
