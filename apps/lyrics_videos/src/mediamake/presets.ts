/**
 * Runs mediamake editor presets inside a lyrics_videos scene.
 *
 * presets.json is written by `npm run sync-presets -w lyrics_videos` from apps/mediamake. Each entry
 * holds the preset's function source, which the mediamake editor also runs with `new Function`, so
 * a preset renders here exactly as it does in the editor.
 */
import type { RenderableComponentData } from '@microfox/remotion';
import presets from './presets.json';

export type MediamakePresetId = keyof typeof presets;

type PresetEntry = {
  id: string;
  title: string;
  defaultInputParams?: Record<string, unknown>;
  presetFunction: string;
};

const entries = presets as Record<MediamakePresetId, PresetEntry>;
const compiled = new Map<string, (data: unknown, props: unknown) => unknown>();

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** Deep merge for preset params: objects merge, arrays and scalars replace. */
export const mergeParams = <T extends Record<string, unknown>>(
  base: T,
  over: Record<string, unknown> | undefined,
): T => {
  if (!over) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(over)) {
    if (value === undefined) continue;
    out[key] =
      isPlainObject(value) && isPlainObject(out[key])
        ? mergeParams(out[key] as Record<string, unknown>, value)
        : value;
  }
  return out as T;
};

/** The editor's defaults for a preset, without its sample data (captions, audio). */
export const presetDefaults = (id: MediamakePresetId): Record<string, unknown> => {
  const { inputCaptions: _c, audio: _a, ...rest } = (entries[id].defaultInputParams ?? {}) as Record<
    string,
    unknown
  >;
  return rest;
};

/** Runs a preset with its defaults merged under `params`. Returns the raw preset output. */
export const runPreset = (
  id: MediamakePresetId,
  params: Record<string, unknown>,
  props: Record<string, unknown> = {},
): unknown => {
  let fn = compiled.get(id);
  if (!fn) {
    const source = entries[id]?.presetFunction;
    if (!source) throw new Error(`Unknown mediamake preset "${id}". Run npm run sync-presets.`);
    fn = new Function('data', 'props', `return (${source})(data, props);`) as (
      data: unknown,
      props: unknown,
    ) => unknown;
    compiled.set(id, fn);
  }
  return fn(mergeParams(presetDefaults(id), params), props);
};

/**
 * The renderable tree of a preset output. Full and children presets return
 * `{ output: { childrenData } }`; container presets (definePreset) return `{ children }`.
 */
export const presetTree = (output: unknown): RenderableComponentData[] => {
  if (!isPlainObject(output)) return [];
  const inner = output.output;
  if (isPlainObject(inner) && Array.isArray(inner.childrenData)) {
    return inner.childrenData as RenderableComponentData[];
  }
  if (Array.isArray(output.children)) return output.children as RenderableComponentData[];
  return [];
};

/**
 * Puts a timeline node's `containerProps.style` (the editor's layout box) on the root of a preset
 * tree, the way the editor does: `--mm-*` keys are editor bookkeeping and are dropped, and a box
 * replaces the root's `inset-0`.
 */
export const applyContainerLayout = (
  tree: RenderableComponentData[],
  containerProps: { style?: Record<string, unknown> } | undefined,
): RenderableComponentData[] => {
  const raw = containerProps?.style;
  if (!raw || !tree.length) return tree;
  const layout = Object.fromEntries(
    Object.entries(raw).filter(([key, v]) => !key.startsWith('--mm-') && v !== undefined && v !== ''),
  );
  if (!Object.keys(layout).length) return tree;
  const [first, ...rest] = tree;
  const data = (first.data ?? {}) as { containerProps?: { className?: string; style?: Record<string, unknown> } };
  const existing = data.containerProps ?? {};
  const className = existing.className?.replace(/\binset-0\b/g, ' ').replace(/\s+/g, ' ').trim();
  return [
    {
      ...first,
      data: {
        ...data,
        containerProps: { ...existing, className, style: { ...existing.style, ...layout } },
      },
    } as RenderableComponentData,
    ...rest,
  ];
};
