import {
  EDITS_SCHEMA,
  type Edits,
  type ElementEdit,
  type LyricManifest,
  type WordEdit,
} from './types';

/* Pure updates on an edits document. Every function returns a new document. */

const TRANSFORM_KEYS = ['x', 'y', 'scale', 'rotate', 'font'] as const;

const round = (n: number, places: number) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** Drops neutral values; null when nothing that changes the picture is left. */
function tidy(e: ElementEdit): ElementEdit | null {
  const out: ElementEdit = {};
  if (e.x) out.x = round(e.x, 1);
  if (e.y) out.y = round(e.y, 1);
  if (e.scale !== undefined && Math.abs(e.scale - 1) > 1e-4) out.scale = round(e.scale, 4);
  if (e.rotate) out.rotate = round(e.rotate, 2);
  if (e.font) out.font = e.font;
  if (!TRANSFORM_KEYS.some(k => out[k] !== undefined)) return null;
  if (e.label) out.label = e.label;
  if (e.at !== undefined) out.at = round(e.at, 3);
  return out;
}

export function setElementEdit(
  edits: Edits,
  id: string,
  patch: Partial<ElementEdit>,
  meta: { label?: string; at?: number } = {},
): Edits {
  const prev = edits.elements[id] ?? {};
  const next = tidy({
    ...prev,
    ...patch,
    label: prev.label ?? meta.label,
    at: prev.at ?? meta.at,
  });
  const elements = { ...edits.elements };
  if (next) elements[id] = next;
  else delete elements[id];
  return { ...edits, elements };
}

export function resetElement(edits: Edits, id: string): Edits {
  if (!edits.elements[id]) return edits;
  const elements = { ...edits.elements };
  delete elements[id];
  return { ...edits, elements };
}

/** `value` undefined removes the edit, so the scene's own value comes back. */
export function setPropEdit(
  edits: Edits,
  layer: string,
  path: string,
  value: unknown,
): Edits {
  const layerPatch = { ...(edits.props[layer] ?? {}) };
  if (value === undefined) delete layerPatch[path];
  else layerPatch[path] = value;
  const props = { ...edits.props };
  if (Object.keys(layerPatch).length) props[layer] = layerPatch;
  else delete props[layer];
  return { ...edits, props };
}

/** Path of one field of the object at `propsPath` ('' = the layer's props themselves). */
export const fieldPath = (propsPath: string, field: string) =>
  propsPath ? `${propsPath}.${field}` : field;

/** Removes the edits of an element's fields. */
export const resetPropFields = (
  edits: Edits,
  layer: string,
  propsPath: string,
  fields: string[],
): Edits =>
  fields.reduce((e, f) => setPropEdit(e, layer, fieldPath(propsPath, f), undefined), edits);

export const countEdits = (edits: Edits) =>
  Object.keys(edits.elements).length +
  Object.values(edits.props).reduce((n, p) => n + Object.keys(p).length, 0) +
  Object.keys(edits.assets ?? {}).length +
  Object.keys(edits.words ?? {}).length +
  (edits.lyricsOffset ? 1 : 0);

/** The key of a sung word in `words`, as the kit's wordKey. */
export const wordKey = (lineId: string, index: number) => `${lineId}:${index}`;

/**
 * Sets the times of several words at once (one undo step); a patch of undefined drops the word's
 * edit. A time equal to the word's own (after the offset) is not kept.
 */
export function setWordEdits(
  edits: Edits,
  patches: Record<string, (WordEdit & { was: { start: number; end: number } }) | undefined>,
): Edits {
  const words = { ...(edits.words ?? {}) };
  const offset = edits.lyricsOffset ?? 0;
  for (const [key, p] of Object.entries(patches)) {
    if (!p) {
      delete words[key];
      continue;
    }
    const out: WordEdit = {};
    if (p.start !== undefined && Math.abs(p.start - (p.was.start + offset)) > 5e-4)
      out.start = round(p.start, 3);
    if (p.end !== undefined && Math.abs(p.end - (p.was.end + offset)) > 5e-4) out.end = round(p.end, 3);
    if (out.start === undefined && out.end === undefined) delete words[key];
    else words[key] = p.text ? { ...out, text: p.text } : out;
  }
  return { ...edits, words };
}

export function setLyricsOffset(edits: Edits, seconds: number): Edits {
  const next = round(seconds, 3);
  if ((edits.lyricsOffset ?? 0) === next) return edits;
  const out: Edits = { ...edits, lyricsOffset: next };
  if (!next) delete out.lyricsOffset;
  return out;
}

/** The manifest with swapped files in place of the ones it names, as the kit's swapManifestAssets. */
export function swapManifestAssets(m: LyricManifest, swaps: Record<string, string> | undefined): LyricManifest {
  if (!swaps || !Object.keys(swaps).length) return m;
  const swap = (path: string) => swaps[path] ?? path;
  return {
    ...m,
    audio: { ...m.audio, src: swap(m.audio.src) },
    assets: Object.fromEntries(Object.entries(m.assets ?? {}).map(([k, v]) => [k, swap(v)])),
  };
}

/** Swaps a file for another (`to`), or puts the original back (`to` undefined). */
export function setAssetSwap(edits: Edits, from: string, to: string | undefined): Edits {
  const assets = { ...(edits.assets ?? {}) };
  if (to === undefined || to === from) delete assets[from];
  else assets[from] = to;
  return { ...edits, assets };
}

const sortKeys = <T>(o: Record<string, T>) =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

/** Stable text, so saving the same edits twice writes the same file. */
export const serializeEdits = (edits: Edits) =>
  `${JSON.stringify(
    {
      schema: EDITS_SCHEMA,
      elements: sortKeys(edits.elements),
      props: sortKeys(
        Object.fromEntries(Object.entries(edits.props).map(([k, v]) => [k, sortKeys(v)])),
      ),
      // left out until there is one, so files from before swaps stay as they were
      ...(Object.keys(edits.assets ?? {}).length ? { assets: sortKeys(edits.assets) } : {}),
      ...(Object.keys(edits.words ?? {}).length ? { words: sortKeys(edits.words) } : {}),
      ...(edits.lyricsOffset ? { lyricsOffset: edits.lyricsOffset } : {}),
    },
    null,
    2,
  )}\n`;
