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
  duotone?: [Color, Color];
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

const grain = (strength: number): Layer => ({ id: 'post-grain', type: 'fx', kind: 'grain', strength });
const vignette = (strength: number): Layer => ({ id: 'post-vignette', type: 'fx', kind: 'vignette', strength });
/** raises the blacks to a soft charcoal (the faded, matte look) */
const lift = (color: Color, opacity: number): Layer => ({ id: 'post-lift', type: 'fill', color, blend: 'lighten', opacity });
const tint = (color: Color, strength: number): Layer => ({ id: 'post-tint', type: 'fx', kind: 'tint', color, strength });

export const TREATMENTS: Record<string, Treatment> = {
  film: {
    name: 'Film',
    about: 'warm, slightly faded 35 mm: lifted blacks, warm tint, grain, soft vignette',
    build: () => ({ grade: { contrast: 0.97, saturate: 0.9, sepia: 0.12, brightness: 1.03 }, over: [lift('#1d1914', 0.8), tint('#ff9a3c', 0.14), grain(0.3), vignette(0.4)] }),
  },
  matte: {
    name: 'Matte',
    about: 'flat and calm: low contrast, muted colour, charcoal blacks',
    build: () => ({ grade: { contrast: 0.9, saturate: 0.8, brightness: 1.04 }, over: [lift('#24211e', 0.9), grain(0.12)] }),
  },
  vivid: {
    name: 'Vivid',
    about: 'punchy: rich saturation and contrast, a little glow on the highlights',
    build: () => ({ grade: { saturate: 1.45, contrast: 1.15, brightness: 1.05 }, bloom: 0.35, over: [vignette(0.3)] }),
  },
  noir: {
    name: 'Noir',
    about: 'black and white, hard contrast, heavy grain and vignette',
    build: () => ({ grade: { grayscale: 1, contrast: 1.3, brightness: 1.1 }, over: [grain(0.35), vignette(0.45)] }),
  },
  duotone: {
    name: 'Duotone',
    about: 'two colours from the palette (dark → accent), light grain',
    build: p => {
      const c = palette(p);
      return { duotone: [c.dark, c.accent], grade: { contrast: 1.1 }, over: [grain(0.2)] };
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
    build: () => ({ grade: { sepia: 0.45, contrast: 1.05, saturate: 0.8, brightness: 1.08 }, over: [{ id: 'post-dust', type: 'fx', kind: 'dust', strength: 0.6 }, { id: 'post-paper', type: 'fx', kind: 'paper', strength: 0.25 }, vignette(0.5)] }),
  },
  dream: {
    name: 'Dream',
    about: 'soft glow on the highlights and a warm light leak from a corner',
    build: () => ({ grade: { brightness: 1.08, saturate: 1.1, contrast: 0.95 }, bloom: 0.8, over: [{ id: 'post-leak', type: 'fx', kind: 'leak', strength: 0.55, color: '#ff7a3d', at: [0.92, 0.08] }] }),
  },
  night: {
    name: 'Night',
    about: 'cold blue night grade, deeper shadows, grain',
    build: () => ({ grade: { saturate: 0.85, contrast: 1.1, brightness: 0.95 }, over: [tint('#2b6cff', 0.35), grain(0.2), vignette(0.45)] }),
  },
};

/** The default list for a poster style: plain plus all ten. */
export const ALL_TREATMENTS = ['plain', ...Object.keys(TREATMENTS)];
