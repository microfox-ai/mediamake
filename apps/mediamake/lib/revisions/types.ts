/*
 * File formats for the revisions screen. See components/revisions/README.md.
 * All times are seconds from the start of the video.
 */

export const MAP_SCHEMA = 'mediamake.video-map/v1';
export const REVISION_SCHEMA = 'mediamake.revision/v1';

export interface MapSection {
  id: string;
  label: string;
  from: number;
  to: number;
}

export interface MapShot {
  id: string;
  /** Section id (or label) the shot belongs to. */
  section?: string;
  from: number;
  to: number;
  label?: string;
  lyric?: string;
}

export interface MapMarker {
  id: string;
  time: number;
  label?: string;
}

export interface VideoMap {
  schema: string;
  video?: string;
  /** Where the renderer wrote the video, so Claude can find it again. */
  source?: { path?: string; project?: string };
  fps?: number;
  duration?: number;
  width?: number;
  height?: number;
  sections: MapSection[];
  shots: MapShot[];
  markers: MapMarker[];
}

export type RevisionStatus = 'draft' | 'ready' | 'resolved';
export type CommentStatus = 'open' | 'done';

interface CommentBase {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  status: CommentStatus;
  /** Written by Claude when it handles the comment. */
  reply?: string;
}

export interface ShotRef {
  id: string;
  label?: string;
  section?: string;
  from: number;
  to: number;
}

export interface PointComment extends CommentBase {
  kind: 'point';
  time: number;
  frame: number;
  shot: ShotRef | null;
  /** Path relative to the revisions folder, e.g. "rev-001/c01_h1.3_f000372.jpg". */
  snapshot?: string;
}

export interface RangeComment extends CommentBase {
  kind: 'range';
  from: number;
  to: number;
  fromFrame: number;
  /** Last frame of the range, inclusive. */
  toFrame: number;
  /** Ids of every shot the range touches, in order. */
  shots: string[];
}

export type RevisionComment = PointComment | RangeComment;

export interface RevisionVideoInfo {
  file: string;
  size: number;
  lastModified: number;
  duration: number;
  fps: number;
  width?: number;
  height?: number;
}

export interface Revision {
  schema: string;
  id: string;
  title: string;
  status: RevisionStatus;
  video: RevisionVideoInfo;
  /** Map file the shot ids came from, if any. */
  map: string | null;
  createdAt: string;
  updatedAt: string;
  comments: RevisionComment[];
}

export interface TimeRange {
  from: number;
  to: number;
}
