/**
 * Knobs: the props of a scene a person would tweak (sizes, counts, timings, colours, files,
 * volumes), declared next to the scene so mediamake's editor can show them as sliders, pickers and
 * switches. A change is saved in video/edits.json (`props`, under the layer's key) and every render
 * applies it, like any other prop edit. Nothing changes for a scene that declares none: the editor
 * then offers the layer's own simple props.
 *
 *   export const Title = withKnobs(TitleScene, {
 *     size: { type: 'number', label: 'Text size', min: 40, max: 240, step: 2, default: 120 },
 *     color: { type: 'color', default: '#ffffff' },
 *     logo: { type: 'asset', accept: 'image' },
 *   });
 *
 * A key is a path into the layer's props ("rings.count" for `props.rings.count`). `default` is what
 * the scene uses when the layer leaves the prop out; keep it equal to the scene's own default.
 */
import type { SceneComponent } from './contract';

type KnobBase = {
  /** shown in the editor; defaults to the key */
  label?: string;
  /** one line on what it does */
  hint?: string;
};

export type Knob = KnobBase &
  (
    | { type: 'number'; min?: number; max?: number; step?: number; unit?: string; default?: number }
    | { type: 'color'; default?: string }
    | { type: 'select'; options: readonly string[]; default?: string }
    | { type: 'toggle'; default?: boolean }
    | { type: 'text'; multiline?: boolean; default?: string }
    /** a path to a file in the project ("slug/input/logo.png"), as `asset()` takes it */
    | { type: 'asset'; accept: 'image' | 'video' | 'audio'; default?: string }
  );

export type Knobs = Record<string, Knob>;

export type SceneWithKnobs<P> = SceneComponent<P> & { knobs: Knobs };

/** Attaches knobs to a scene (the same component, so `layer({ scene })` takes it as before). */
export const withKnobs = <P,>(scene: SceneComponent<P>, knobs: Knobs): SceneWithKnobs<P> =>
  Object.assign(scene, { knobs });

/** The knobs a scene declares, or null. */
export const knobsOf = (scene: unknown): Knobs | null => {
  const k = (scene as { knobs?: unknown } | null)?.knobs;
  return k && typeof k === 'object' ? (k as Knobs) : null;
};
