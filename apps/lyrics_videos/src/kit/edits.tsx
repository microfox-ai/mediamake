/**
 * Edits made in mediamake's /remotion-editor. They are saved beside the project as
 * video/edits.json, and every render picks them up (Studio, stills, render-project).
 *
 * - elements: move, scale, rotate or re-font anything a scene marks with `editable()`. Applied to
 *   the DOM after each frame through the CSS `translate`, `scale` and `rotate` properties. Those
 *   stack with the scene's own `transform`, so its animation keeps running underneath.
 * - props: values written into a layer's props before it renders, keyed by path
 *   ("lockups.3.rows.0.1.text"). The editor only offers the fields a scene lists in `editable()`.
 *
 * Every layer can be moved as a whole (`layer:<key>`) without touching its scene.
 */
import type React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  continueRender,
  delayRender,
  getStaticFiles,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { getAvailableFonts } from '@remotion/google-fonts';
import type { At, Layer } from './contract';

export const EDITS_SCHEMA = 'lyrics_videos.edits/v1';

export type ElementEdit = {
  /** px, in the parent's space */
  x?: number;
  y?: number;
  scale?: number;
  /** degrees */
  rotate?: number;
  /** Google Fonts family that replaces the element's font ("Bebas Neue") */
  font?: string;
  /** what the element showed when it was edited, to spot an edit that now lands on something else */
  label?: string;
  /** song time (s) the edit was made at, to find it again */
  at?: number;
};

export type Edits = {
  schema: typeof EDITS_SCHEMA;
  elements?: Record<string, ElementEdit>;
  /** layer key → props path → value */
  props?: Record<string, Record<string, unknown>>;
};

export type EditableOptions = {
  /** shown in the editor; defaults to the element's text */
  label?: string;
  /** path inside the layer's props of the object this element shows ('' = the props themselves) */
  props?: string;
  /** keys of that object the editor may change, e.g. ['text', 'font', 'size'] */
  fields?: string[];
};

/**
 * Marks an element the editor can select: `<div {...editable(`lockup:${key}`)} />`. Use a block or
 * inline-block element (CSS transforms skip plain inline spans) that doesn't set the CSS
 * `translate`, `scale` or `rotate` properties itself. Ids must stay the same from frame to frame;
 * elements sharing an id move together (a picture and its cutout).
 */
export const editable = (
  id: string,
  o: EditableOptions = {},
): Record<`data-edit-${string}`, string> => {
  const attrs: Record<`data-edit-${string}`, string> = { 'data-edit-id': id };
  if (o.label) attrs['data-edit-label'] = o.label;
  if (o.props !== undefined) attrs['data-edit-props'] = o.props;
  if (o.fields?.length) attrs['data-edit-fields'] = o.fields.join(',');
  return attrs;
};

const atLabel = (at: At) => (typeof at === 'string' ? at : `${at.from}s-${at.to}s`);

/** One stable key per layer: its name or section label, with #2, #3… for repeats. */
export const layerKeys = (layers: Layer[]): string[] => {
  const seen = new Map<string, number>();
  return layers.map(l => {
    const base = l.name ?? atLabel(l.at);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  });
};

// ---------------------------------------------------------------- props

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

export const getPath = (obj: unknown, path: string): unknown =>
  path
    ? path.split('.').reduce<unknown>((o, k) => (isObject(o) ? o[k] : undefined), obj)
    : obj;

const setPath = (obj: Record<string, unknown>, keys: string[], value: unknown): unknown => {
  const [k, ...rest] = keys;
  const child = rest.length ? setPath(obj[k] as Record<string, unknown>, rest, value) : value;
  if (Array.isArray(obj)) {
    const copy = obj.slice();
    copy[Number(k)] = child;
    return copy;
  }
  return { ...obj, [k]: child };
};

/**
 * `props` with the edited values written in. Parts that don't change keep their identity (scenes
 * memoize on them), and a path that no longer exists (the cues changed) is skipped.
 */
export const applyPropEdits = <P,>(props: P, patch?: Record<string, unknown>): P => {
  if (!patch) return props;
  let out: unknown = props ?? {};
  for (const [path, value] of Object.entries(patch)) {
    const keys = path.split('.');
    const parent = getPath(out, keys.slice(0, -1).join('.'));
    if (!isObject(parent) || !isObject(out)) continue;
    out = setPath(out, keys, value);
  }
  return out as P;
};

// ---------------------------------------------------------------- elements

type StyledElement = HTMLElement | SVGElement;
type TransformProp = 'translate' | 'scale' | 'rotate';

const touched = new WeakMap<StyledElement, Set<TransformProp>>();
const fonted = new WeakSet<StyledElement>();
const originalFont = new WeakMap<StyledElement, string>();

const setProp = (el: StyledElement, prop: TransformProp, value: string) => {
  let set = touched.get(el);
  // never touched by an edit: leave whatever the scene does alone
  if (!value && !set?.has(prop)) return;
  if (el.style[prop] !== value) el.style[prop] = value;
  if (!set) touched.set(el, (set = new Set()));
  if (value) set.add(prop);
  else set.delete(prop);
};

// SVG <text> sets its font as an attribute, which an inline style overrides
const fontTargets = (el: StyledElement): StyledElement[] => [
  el,
  ...el.querySelectorAll<StyledElement>('[style*="font-family"], [font-family]'),
];

const applyFont = (el: StyledElement, family?: string) => {
  if (!family && !fonted.has(el)) return;
  for (const t of fontTargets(el)) {
    if (family) {
      if (!originalFont.has(t)) originalFont.set(t, t.style.fontFamily);
      // the scene's font stays as the fallback while the new one loads
      const css = `"${family}", ${originalFont.get(t) || 'sans-serif'}`;
      if (t.style.fontFamily !== css) t.style.fontFamily = css;
    } else if (originalFont.has(t)) {
      t.style.fontFamily = originalFont.get(t)!;
      originalFont.delete(t);
    }
  }
  if (family) fonted.add(el);
  else fonted.delete(el);
};

/** Writes element edits onto every marked element under `root`, and clears ones that were removed. */
export const applyElementEdits = (
  root: ParentNode,
  elements: Record<string, ElementEdit> = {},
) => {
  root.querySelectorAll<StyledElement>('[data-edit-id]').forEach(el => {
    const e = elements[el.getAttribute('data-edit-id') ?? ''];
    setProp(el, 'translate', e && (e.x || e.y) ? `${e.x ?? 0}px ${e.y ?? 0}px` : '');
    setProp(el, 'scale', e?.scale !== undefined && e.scale !== 1 ? String(e.scale) : '');
    setProp(el, 'rotate', e?.rotate ? `${e.rotate}deg` : '');
    applyFont(el, e?.font);
  });
};

const fontLoads = new Map<string, Promise<void>>();

/** Loads a Google Fonts family by name; anything else is assumed to be installed already. */
const loadEditFont = (family: string): Promise<void> => {
  let p = fontLoads.get(family);
  if (!p) {
    const entry = getAvailableFonts().find(
      f => f.fontFamily === family || f.importName === family,
    );
    p = entry
      ? entry
          .load()
          .then(mod => {
            const { subsets } = mod.getInfo();
            return mod
              .loadFont(undefined, {
                subsets: subsets.includes('latin') ? ['latin'] : subsets.slice(0, 1),
                ignoreTooManyRequestsWarning: true,
              })
              .waitUntilDone();
          })
          .then(() => undefined, () => undefined)
      : Promise.resolve();
    fontLoads.set(family, p);
  }
  return p;
};

const useEditFonts = (elements?: Record<string, ElementEdit>) => {
  const families = useMemo(
    () =>
      [...new Set(Object.values(elements ?? {}).flatMap(e => (e.font ? [e.font] : [])))]
        .sort()
        .join('|'),
    [elements],
  );
  // a render waits for the fonts it starts with; later changes (in the editor) just load
  const [handle] = useState(() =>
    families ? delayRender(`Loading fonts from edits.json: ${families}`) : null,
  );
  const released = useRef(false);
  useEffect(() => {
    void Promise.all(families ? families.split('|').map(loadEditFont) : []).then(() => {
      if (handle !== null && !released.current) {
        released.current = true;
        continueRender(handle);
      }
    });
  }, [families, handle]);
};

/**
 * Applies element edits to everything inside its parent, after every frame. The project video
 * mounts one as the last child of its root. It finds that root through its own hidden marker: on
 * the first commit (every frame of a still or a render tab) a parent's ref isn't attached yet when
 * a child's layout effect runs.
 */
export const EditsApplier: React.FC<{ elements?: Record<string, ElementEdit> }> = ({
  elements,
}) => {
  const frame = useCurrentFrame();
  const marker = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = marker.current?.parentElement;
    if (root) applyElementEdits(root, elements);
  }, [frame, elements]);
  useEffect(() => {
    const root = marker.current?.parentElement;
    if (!root) return;
    // scenes that mount elements in a later commit (after measuring) get their edits too
    const observer = new MutationObserver(() => applyElementEdits(root, elements));
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [elements]);
  useEditFonts(elements);
  return <div ref={marker} style={{ display: 'none' }} />;
};

// ---------------------------------------------------------------- file

/** Reads edits.json leniently: anything malformed is dropped, never thrown. */
export const parseEdits = (raw: unknown): Edits => {
  const o = isObject(raw) ? raw : {};
  return {
    schema: EDITS_SCHEMA,
    elements: isObject(o.elements) ? (o.elements as Record<string, ElementEdit>) : {},
    props: isObject(o.props)
      ? (o.props as Record<string, Record<string, unknown>>)
      : {},
  };
};

/** projects/<slug>/video/edits.json, or null when the project has none. */
export const loadEdits = async (
  slug: string,
  signal?: AbortSignal,
): Promise<Edits | null> => {
  const file = `${slug}/video/edits.json`;
  // Studio and renders know the public folder: skip the request (and its 404 in the log) when
  // there is no edits.json. Elsewhere the list is empty and the file is just fetched.
  const known = getStaticFiles();
  if (known.length && !known.some(f => f.name === file)) return null;
  const res = await fetch(staticFile(file), {
    signal,
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  try {
    return parseEdits(await res.json());
  } catch {
    return null;
  }
};
