/*
 * Shapes shared with the lyric kit (apps/lyrics_videos/src/kit/edits.tsx). The editor never
 * imports the kit at build time: it compiles the kit from the project folder, so these mirror it.
 */

export const EDITS_SCHEMA = 'lyrics_videos.edits/v1';

export type ElementEdit = {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  font?: string;
  label?: string;
  at?: number;
};

export type Edits = {
  schema: typeof EDITS_SCHEMA;
  elements: Record<string, ElementEdit>;
  /** layer key → props path → value */
  props: Record<string, Record<string, unknown>>;
};

export const emptyEdits = (): Edits => ({
  schema: EDITS_SCHEMA,
  elements: {},
  props: {},
});

export type ProjectEntry = {
  slug: string;
  title?: string;
  artist?: string;
  hasManifest: boolean;
  hasEdits: boolean;
  modified: number;
};

export type CodeFile = { path: string; mtime: number };

/** The parts of a lyric manifest the editor reads (the kit validates the rest). */
export type LyricManifest = {
  slug: string;
  title: string;
  artist?: string;
  audio: { src: string; duration: number };
  sections: { label: string; from: number; to: number }[];
  lyrics: { id: string; text: string; start: number; end: number }[];
  assets: Record<string, string>;
  [key: string]: unknown;
};

/** What a project's video/index.tsx default-exports (see src/kit/contract.ts). */
export type ProjectDefinition = {
  id: string;
  fps: number;
  width: number;
  height: number;
  tail?: number;
  layers: {
    scene: React.ComponentType<Record<string, unknown>> & { displayName?: string };
    at: string | { from: number; to: number };
    props?: Record<string, unknown>;
    name?: string;
  }[];
};

/** The kit functions the editor calls, from the compiled src/kit. */
export type KitApi = {
  makeProjectVideo: (
    project: ProjectDefinition,
  ) => React.ComponentType<{ manifest: LyricManifest | null; edits?: Edits | null }>;
  layerKeys: (layers: ProjectDefinition['layers']) => string[];
  applyPropEdits: <P>(props: P, patch?: Record<string, unknown>) => P;
  getPath: (obj: unknown, path: string) => unknown;
  parseEdits: (raw: unknown) => Edits;
  resolveAt: (
    at: ProjectDefinition['layers'][number]['at'],
    manifest: LyricManifest,
    name?: string,
  ) => { label: string; from: number; to: number };
};
