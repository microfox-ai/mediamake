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
  /** files swapped for others: the path the project names → the replacement ("slug/input/swaps/x.png") */
  assets: Record<string, string>;
};

export const emptyEdits = (): Edits => ({
  schema: EDITS_SCHEMA,
  elements: {},
  props: {},
  assets: {},
});

/** An image, clip or sound in a project, by the path staticFile() takes ("slug/input/cover.jpg"). */
export type MediaFile = {
  path: string;
  kind: 'image' | 'video' | 'audio';
  size: number;
};

const MEDIA_KINDS: [RegExp, MediaFile['kind']][] = [
  [/\.(png|jpe?g|webp|gif|avif|svg)$/i, 'image'],
  [/\.(mp4|webm|mov|m4v)$/i, 'video'],
  [/\.(mp3|wav|m4a|aac|ogg|oga|flac)$/i, 'audio'],
];

export const mediaKindOf = (path: string): MediaFile['kind'] | null =>
  MEDIA_KINDS.find(([re]) => re.test(path))?.[1] ?? null;

/** A scene's knobs (apps/lyrics_videos/src/kit/knobs.ts): props a person tweaks, with how to show them. */
export type Knob = { label?: string; hint?: string } & (
  | { type: 'number'; min?: number; max?: number; step?: number; unit?: string; default?: number }
  | { type: 'color'; default?: string }
  | { type: 'select'; options: readonly string[]; default?: string }
  | { type: 'toggle'; default?: boolean }
  | { type: 'text'; multiline?: boolean; default?: string }
  | { type: 'asset'; accept: MediaFile['kind']; default?: string }
);
export type Knobs = Record<string, Knob>;

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

/** Element edits the video applies without re-rendering its scenes (src/kit/edits.tsx). */
export type LiveElementEdits = {
  get: () => Record<string, ElementEdit>;
  set: (elements: Record<string, ElementEdit>) => void;
  subscribe: (listener: () => void) => () => void;
};

/** The kit functions the editor calls, from the compiled src/kit. */
export type KitApi = {
  makeProjectVideo: (project: ProjectDefinition) => React.ComponentType<{
    manifest: LyricManifest | null;
    edits?: Edits | null;
    liveEdits?: LiveElementEdits | null;
  }>;
  /** missing in kits from before live edits: those re-render the video on every change */
  createLiveElementEdits?: (initial?: Record<string, ElementEdit>) => LiveElementEdits;
  layerKeys: (layers: ProjectDefinition['layers']) => string[];
  applyPropEdits: <P>(props: P, patch?: Record<string, unknown>) => P;
  getPath: (obj: unknown, path: string) => unknown;
  parseEdits: (raw: unknown) => Edits;
  /** missing in kits from before knobs */
  knobsOf?: (scene: unknown) => Knobs | null;
  resolveAt: (
    at: ProjectDefinition['layers'][number]['at'],
    manifest: LyricManifest,
    name?: string,
  ) => { label: string; from: number; to: number };
};
