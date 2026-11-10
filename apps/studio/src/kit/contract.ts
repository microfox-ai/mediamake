/**
 * The contract between a project (projects/<slug>/video/index.tsx) and the kit.
 *
 * A project is a list of layers. Each layer places one scene on the timeline,
 * anchored to a manifest section label, the whole song, or explicit seconds.
 * Layers render in order, so later layers draw on top and may overlap earlier ones.
 */
import type React from 'react';
import type { Manifest, Section } from './manifest';

/** Every scene receives the manifest and the section it was placed in, plus its own props. */
export type SceneProps<P = {}> = P & {
  manifest: Manifest;
  section: Section;
};

export type SceneComponent<P = {}> = React.ComponentType<SceneProps<P>>;

/**
 * Where a layer sits:
 * - a section label from manifest.sections ("intro", "chorus-1", ...)
 * - 'all' for the full song
 * - explicit seconds, for anything sections don't cover
 */
export type At = string | { from: number; to: number };

export type Layer<P = any> = {
  scene: SceneComponent<P>;
  at: At;
  props?: P;
  /** Label shown in the Studio timeline. Defaults to the section label. */
  name?: string;
};

export type ProjectDefinition = {
  /** Must equal the project folder name; used as the composition id. */
  id: string;
  /** The project folder (manifest, edits, media) when it differs from `id`: a short cut from a project
   *  is its own composition ('<slug>-<short>-9x16') over the same folder. */
  slug?: string;
  fps: number;
  width: number;
  height: number;
  /** Seconds of video after the song ends (end credits, outros). Place layers there with `{ from, to }`. */
  tail?: number;
  /** Play only this stretch of the song (seconds): the video starts at `from` and ends at `to`, layers
   *  keep their song times. `fadeIn` / `fadeOut`: seconds of audio fade at the ends (default 0 / 0.4). */
  window?: { from: number; to: number; fadeIn?: number; fadeOut?: number };
  /** false: the song isn't played under the layers (a layer brings its own sound, e.g. a finished render) */
  audio?: boolean;
  layers: Layer[];
};

export const defineProject = (project: ProjectDefinition): ProjectDefinition =>
  project;

/**
 * A layer's props reach its scene through a spread (`<Scene {...props} />`, ProjectVideo.tsx), and React
 * takes a prop named `key` out of it before the scene sees it, in Studio and in renders alike (React 19:
 * `ref` is an ordinary prop now). So a scene never names a prop `key`; this lists the layers that pass
 * one anyway, for a warning.
 */
export const droppedPropWarnings = (layers: Layer[]): string[] =>
  layers.flatMap((l, i) =>
    l.props && typeof l.props === 'object' && 'key' in l.props
      ? [
          `layer ${i + 1}${l.name ? ` (${l.name})` : ''}: its \`key\` prop never reaches the scene (React keeps the ` +
            "name for itself). OverlayVideo's luma key is `luma`: rename it there to key the clip.",
        ]
      : [],
  );

/** Typed layer helper: checks `props` against the scene's own prop type. */
export const layer = <P>(l: Layer<P>): Layer<P> => l;

export const resolveAt = (
  at: At,
  manifest: Manifest,
  name?: string,
): Section => {
  if (typeof at !== 'string') {
    return { label: name ?? `${at.from}s-${at.to}s`, from: at.from, to: at.to };
  }
  if (at === 'all') {
    return { label: 'all', from: 0, to: manifest.audio.duration };
  }
  const section = manifest.sections.find(s => s.label === at);
  if (!section) {
    const labels = manifest.sections.map(s => s.label).join(', ');
    throw new Error(
      `Unknown section "${at}" in ${manifest.slug}. Available: ${labels}`,
    );
  }
  return section;
};
