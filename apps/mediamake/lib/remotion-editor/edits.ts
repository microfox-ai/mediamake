import { EDITS_SCHEMA, type Edits, type ElementEdit } from './types';

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
  Object.values(edits.props).reduce((n, p) => n + Object.keys(p).length, 0);

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
    },
    null,
    2,
  )}\n`;
