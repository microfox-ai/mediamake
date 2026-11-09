/**
 * Treatments: whole-picture looks applied over a finished composition (text included, like a
 * filter on a printed poster). A treatment is a grade (brightness, contrast, saturation…), optional
 * picture filters (duotone, posterize, chromatic split, bloom) and texture layers on top (grain,
 * dust, paper, halftone, light leaks…). "plain" is the composition as it is.
 *
 * Pure data, like spec.ts (Node runs it too). Promote a look here when it works on a real job.
 */
import { palette } from './presets/common.ts';
import type { Color, Grade, Layer, Params } from './spec.ts';

/** What <Thumbnail> applies over the layers. */
export type Post = {
  grade?: Grade;
  /** luma mapped onto these colours, dark → light (two or more, evenly spaced) */
  duotone?: Color[];
  /** tone curve per channel (tableValues from 0 to 1), e.g. a split-tone grade */
  curves?: { r?: number[]; g?: number[]; b?: number[] };
  /** colour levels per channel (4–6 reads as a print) */
  posterize?: number;
  /** red/blue split in px */
  chroma?: number;
  /** glow of the highlights, 0..1 */
  bloom?: number;
  /** texture layers on top of everything */
  over: Layer[];
};

export type Treatment = { name: string; about: string; build: (p: Params) => Post };

/**
 * A treatment fitted to one picture (look.ts writes it per treatment into a style's `tune`):
 * multipliers on its vignette, grain, tint and bloom, and the picture's own duotone colours.
 */
export type Tune = { vignette?: number; grain?: number; tint?: number; bloom?: number; duotone?: Color[] };

/** a and b mixed, t = 0 … 1 */
export const mixColor = (a: Color, b: Color, t: number): Color => {
  const p = (c: Color) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

const FX_TUNE = { vignette: 'vignette', grain: 'grain', tint: 'tint' } as const;

export const applyTune = (post: Post, tune?: Tune): Post => {
  if (!tune) return post;
  const over = post.over.map(l => {
    if (l.type !== 'fx' || l.strength === undefined) return l;
    const k = Object.entries(FX_TUNE).find(([, kind]) => kind === l.kind)?.[0] as keyof typeof FX_TUNE | undefined;
    const m = k && tune[k];
    return m === undefined || m === 0 || !k ? l : { ...l, strength: +(l.strength * m).toFixed(3) };
  });
  return {
    ...post,
    over,
    ...(post.bloom && tune.bloom ? { bloom: +(post.bloom * tune.bloom).toFixed(3) } : {}),
    ...(post.duotone && tune.duotone ? { duotone: tune.duotone } : {}),
  };
};

const grain = (strength: number): Layer => ({ id: 'post-grain', type: 'fx', kind: 'grain', strength });
const vignette = (strength: number): Layer => ({ id: 'post-vignette', type: 'fx', kind: 'vignette', strength });
/** raises the blacks to a soft charcoal (the faded, matte look) */
const lift = (color: Color, opacity: number): Layer => ({ id: 'post-lift', type: 'fill', color, blend: 'lighten', opacity });
const tint = (color: Color, strength: number): Layer => ({ id: 'post-tint', type: 'fx', kind: 'tint', color, strength });

export const TREATMENTS: Record<string, Treatment> = {
  film: {
    name: 'Film',
    about: 'warm, slightly faded 35 mm: lifted blacks, warm tint, grain, soft vignette',
    build: () => ({ grade: { contrast: 0.97, saturate: 0.9, sepia: 0.12, brightness: 1.03 }, over: [lift('#1d1914', 0.8), tint('#ff9a3c', 0.14), grain(0.3), vignette(0.28)] }),
  },
  matte: {
    name: 'Matte',
    about: 'flat and calm: low contrast, muted colour, charcoal blacks',
    build: () => ({ grade: { contrast: 0.9, saturate: 0.8, brightness: 1.04 }, over: [lift('#24211e', 0.9), grain(0.12)] }),
  },
  vivid: {
    name: 'Vivid',
    about: 'punchy: rich saturation and contrast, a little glow on the highlights',
    build: () => ({ grade: { saturate: 1.45, contrast: 1.15, brightness: 1.05 }, bloom: 0.35, over: [vignette(0.2)] }),
  },
  noir: {
    name: 'Noir',
    about: 'black and white, hard contrast, heavy grain and vignette',
    build: () => ({ grade: { grayscale: 1, contrast: 1.3, brightness: 1.1 }, over: [grain(0.35), vignette(0.32)] }),
  },
  duotone: {
    name: 'Duotone',
    about: 'the palette mapped dark → accent → ink: the accent sits low, so mid-tones and highlights stay light; light grain',
    build: p => {
      const c = palette(p);
      return { duotone: [c.dark, c.accent, mixColor(c.accent, c.ink, 0.55), c.ink], grade: { contrast: 1.1 }, over: [grain(0.2)] };
    },
  },
  riso: {
    name: 'Riso print',
    about: 'posterized colour, halftone dots and paper fibre, like a risograph print',
    build: () => ({ posterize: 6, grade: { saturate: 1.2, brightness: 1.15 }, over: [{ id: 'post-halftone', type: 'fx', kind: 'halftone', strength: 0.12, size: 6 }, { id: 'post-paper', type: 'fx', kind: 'paper', strength: 0.22 }] }),
  },
  vhs: {
    name: 'VHS',
    about: 'tape: red/blue split, scanlines, noise, boosted colour',
    build: () => ({ chroma: 4, grade: { saturate: 1.25, contrast: 1.05 }, over: [{ id: 'post-scan', type: 'fx', kind: 'scanlines', strength: 0.18, size: 4 }, grain(0.22)] }),
  },
  vintage: {
    name: 'Vintage',
    about: 'an old print: sepia, dust and scratches, paper, dark corners',
    build: () => ({ grade: { sepia: 0.45, contrast: 1.05, saturate: 0.8, brightness: 1.08 }, over: [{ id: 'post-dust', type: 'fx', kind: 'dust', strength: 0.6 }, { id: 'post-paper', type: 'fx', kind: 'paper', strength: 0.25 }, vignette(0.36)] }),
  },
  dream: {
    name: 'Dream',
    about: 'soft glow on the highlights and a warm light leak from a corner',
    build: () => ({ grade: { brightness: 1.08, saturate: 1.1, contrast: 0.95 }, bloom: 0.8, over: [{ id: 'post-leak', type: 'fx', kind: 'leak', strength: 0.55, color: '#ff7a3d', at: [0.92, 0.08] }] }),
  },
  cinema: {
    name: 'Cinema',
    about: 'teal shadows, warm skin and highlights: the film-poster split grade',
    build: () => ({
      grade: { contrast: 1.06, saturate: 1.08 },
      curves: { r: [0, 0.2, 0.5, 0.8, 1], g: [0, 0.25, 0.51, 0.77, 0.98], b: [0.07, 0.33, 0.5, 0.69, 0.88] },
      over: [grain(0.12), vignette(0.25)],
    }),
  },
  neon: {
    name: 'Neon',
    about: 'deep blacks, saturated colour that glows',
    build: () => ({ grade: { saturate: 1.55, contrast: 1.12 }, curves: { r: [0, 0.06, 0.5, 1], g: [0, 0.05, 0.48, 1], b: [0, 0.08, 0.52, 1] }, bloom: 0.6, over: [vignette(0.15), grain(0.1)] }),
  },
  pastel: {
    name: 'Pastel',
    about: 'airy and soft: lifted, low contrast, gentle colour, a pale glow',
    build: () => ({ grade: { saturate: 0.78, contrast: 0.86, brightness: 1.08 }, over: [{ id: 'post-haze', type: 'fill', color: '#ffeef3', blend: 'screen', opacity: 0.16 }, grain(0.08)] }),
  },
  night: {
    name: 'Night',
    about: 'cold blue night grade, moonlit highlights, grain',
    build: () => ({ grade: { saturate: 0.85, contrast: 1.08, brightness: 1.02 }, over: [tint('#2b6cff', 0.35), grain(0.2), vignette(0.3)] }),
  },
};

/** The default list for a poster style when not picked from the picture: plain plus every look. */
export const ALL_TREATMENTS = ['plain', ...Object.keys(TREATMENTS)];
