/**
 * The thumbnail contract. A job (thumbnails/jobs/<job>/thumbs.json) lists styles, each with
 * variants; a variant is a preset plus params (cheap to write) or a raw layer list (anything), and
 * small patches on top. resolveJob() turns it into flat layer lists that <Thumbnail> draws.
 *
 * Pure data and functions, no React or remotion imports: scripts/thumbs.ts runs this file in Node
 * (lint, index.json), Remotion bundles it for the compositions. Keep imports with `.ts` extensions.
 */
import { PRESETS } from './presets/index.ts';

/** The thumbnail frame: YouTube's 1280×720 (16:9). Every coordinate in a spec is in these pixels. */
export const CANVAS = { w: 1280, h: 720 } as const;
/** Where YouTube draws the video length on every thumbnail: keep logos and words out of it. */
export const TIMESTAMP_ZONE: Box = [1080, 640, 200, 80];

export type Box = [x: number, y: number, w: number, h: number];
export type Point = [x: number, y: number];
export type Color = string;
export type Anchor = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';

/** The picture a variant is built on. `photo` and `cutout` layers without a src use it, with the same framing, so they line up. */
export type Hero = {
  src?: string;
  /** transparent PNG of the subject, the same size as src (thumbnails/tools/cutout.py) */
  cut?: string;
  /** object-position of the cover fit, 0..1 (default centre) */
  focus?: Point;
  /** extra scale about the focus point (1 = cover) */
  zoom?: number;
  /** move in px after scaling */
  offset?: Point;
  flip?: boolean;
};

export type Grade = { saturate?: number; contrast?: number; brightness?: number; hue?: number; blur?: number; grayscale?: number; sepia?: number };
export type Shadow = { x?: number; y?: number; blur?: number; color?: Color };
export type Glow = { color: Color; size?: number };

type Base = {
  /** stable id, used by patch / remove / under (presets name theirs: bg, photo, title, cut, logo-0, …) */
  id?: string;
  opacity?: number;
  blend?: string;
  rotate?: number;
  hidden?: boolean;
};

export type PhotoLayer = Base & {
  /** photo: the hero picture · cutout: the hero's cut · image: any other picture (sticker, icon, second photo) */
  type: 'photo' | 'cutout' | 'image';
  src?: string;
  box?: Box;
  fit?: 'cover' | 'contain';
  focus?: Point;
  zoom?: number;
  offset?: Point;
  flip?: boolean;
  grade?: Grade;
  /** map dark→light onto two colours */
  duotone?: [Color, Color];
  /** fade the picture out toward one side, over `size` (a fraction of the box, default 0.5) */
  fade?: { side: 'left' | 'right' | 'top' | 'bottom'; size?: number };
  /** sticker outline around the opaque pixels (cutouts) */
  outline?: { width: number; color: Color };
  glow?: Glow;
  shadow?: Shadow;
  radius?: number;
  border?: { width: number; color: Color };
};

export type FillLayer = Base & {
  type: 'fill';
  box?: Box;
  color?: Color;
  /** any CSS background (gradients, several layers) */
  background?: string;
  /** sun rays from a point */
  rays?: { at?: Point; count?: number; color: Color; duty?: number };
};

export type ShapeLayer = Base & {
  type: 'shape';
  kind: 'rect' | 'circle' | 'ring' | 'burst' | 'stripes' | 'arrow' | 'line';
  box?: Box;
  /** arrow / line ends */
  from?: Point;
  to?: Point;
  color?: Color;
  background?: string;
  stroke?: { width: number; color: Color };
  radius?: number;
  skew?: number;
  /** ring / line / arrow width; stripes: stripe width */
  thickness?: number;
  /** burst points */
  points?: number;
  /** stripes angle */
  angle?: number;
  shadow?: Shadow;
  glow?: Glow;
};

/** One line of a headline. `*word*` inside it takes the accent colour. */
export type Line = string | { t: string; color?: Color; scale?: number; font?: string; weight?: number; fill?: string };

export type TextLayer = Base & {
  type: 'text';
  /** lines top to bottom (a string splits on \n) */
  lines: Line[] | string;
  /** where the lines fit; with `attach`, only x and width count (default: the target's) */
  box?: Box;
  /**
   * Sit against another text layer's measured letters instead of a fixed y: a kicker above the
   * hero, a sub below it, an overlay between its first two lines (below it when it has one line).
   */
  attach?: { to: string; side: 'above' | 'below' | 'between'; gap?: number };
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  font?: string;
  weight?: number;
  italic?: boolean;
  /** each: every line fills the width (stacked poster) · block: one size, the largest that fits · none: `size` as given */
  fit?: 'each' | 'block' | 'none';
  /** cap in px (or the size with fit none) */
  size?: number;
  /** space between lines' letters, in em of the smaller line (default 0.15) */
  gap?: number;
  /** letter spacing in em */
  tracking?: number;
  /** spread the letters of each line across the box width (K I S U K E   U R A H A R A) */
  spread?: boolean;
  upper?: boolean;
  color?: Color;
  accent?: Color;
  /** CSS background clipped to the letters (gradient or url(...) texture) */
  fill?: string;
  stroke?: { width: number; color: Color };
  /** stacked 3D depth behind the letters */
  extrude?: { depth: number; color: Color; angle?: number };
  shadow?: Shadow;
  glow?: Glow;
  skew?: number;
  /** a band behind each line; knockout cuts the words out of it (only short words in very heavy fonts) */
  plate?: { color?: Color; background?: string; padX?: number; padY?: number; radius?: number; skew?: number; knockout?: boolean };
};

export type LogoLayer = Base & {
  type: 'logo';
  src: string;
  anchor?: Anchor;
  /** centre point instead of an anchor */
  at?: Point;
  width?: number;
  margin?: number;
  glow?: Glow;
  shadow?: Shadow;
  /** a backing shape for contrast */
  plate?: { color: Color; pad?: number; shape?: 'circle' | 'pill' | 'rect' };
};

export type FxLayer = Base & {
  type: 'fx';
  kind: 'vignette' | 'grain' | 'light' | 'halftone' | 'scanlines' | 'tint' | 'letterbox' | 'speedlines';
  strength?: number;
  color?: Color;
  at?: Point;
  size?: number;
  box?: Box;
};

/** A component from the job's custom/<component>.tsx (default export), for looks the layers can't make. */
export type CustomLayer = Base & { type: 'custom'; component: string; box?: Box; props?: Record<string, unknown> };

export type Layer = PhotoLayer | FillLayer | ShapeLayer | TextLayer | LogoLayer | FxLayer | CustomLayer;
/** A layer added on top of a preset, optionally slipped under another one. */
export type AddedLayer = Layer & { under?: string };

/** A text role's font: family (as listed in the job's fonts), weight, italic. */
export type FontRole = { font?: string; weight?: number; italic?: boolean; tracking?: number; color?: Color };

/** How the picture is graded: natural (as is), punch (saturated, contrasty), dark (moody, crushed), mono (B&W), duotone (palette.dark → palette.accent). */
export type GradeMode = 'natural' | 'punch' | 'dark' | 'mono' | 'duotone';

/** Params every preset understands; presets document their own extras. */
export type Params = {
  /** the hero word(s): 1–3 words is the norm; `*word*` takes the accent */
  words?: Line[] | string;
  /** small, widely tracked line above the hero (THE NAME MEANS, I AM THE) */
  kicker?: string;
  /** line below the hero: a name, a phrase (Ultimate Sacrifice, CID KAGENOU) */
  sub?: string;
  /** a word in the accent colour spread across the hero (A N D E R S O N) */
  overlay?: string;
  palette?: { bg?: Color; ink?: Color; accent?: Color; accent2?: Color; dark?: Color };
  /** the hero's type, and the kicker's / sub's / overlay's (each falls back to the hero's family) */
  heroType?: FontRole;
  kickerType?: FontRole;
  subType?: FontRole;
  overlayType?: FontRole;
  grade?: GradeMode;
  /** a glow behind the hero word */
  textGlow?: Color;
  /** film grain 0..1 */
  grain?: number;
  logos?: { src: string; anchor?: Anchor; at?: Point; width?: number; plate?: LogoLayer['plate']; glow?: Glow }[];
  /** which side the words go on, for presets that split the frame */
  side?: 'left' | 'right';
  [extra: string]: unknown;
};

export type VariantSpec = {
  id?: string;
  /** what is different about this variant, shown under its tile */
  note?: string;
  preset?: string;
  params?: Params;
  hero?: Hero;
  /** raw layers (instead of a preset) */
  layers?: Layer[];
  /** layer id → fields to change */
  patch?: Record<string, Record<string, unknown>>;
  add?: AddedLayer[];
  remove?: string[];
};

export type StyleSpec = VariantSpec & { id: string; name: string; idea?: string; variants: VariantSpec[] };

export type FontSpec = { family: string; weight?: number; italic?: boolean; file?: string };

export type JobSpec = {
  job: string;
  title?: string;
  brand?: string;
  fonts?: FontSpec[];
  /** applies to every style and variant */
  defaults?: VariantSpec;
  styles: StyleSpec[];
};

export type ResolvedVariant = { id: string; style: string; styleName: string; note?: string; layers: Layer[] };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Deep merge for plain objects; arrays and everything else are replaced. */
export const merge = <T>(a: T, b: unknown): T => {
  if (!isObj(a) || !isObj(b)) return (b === undefined ? a : b) as T;
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = merge(out[k], v);
  return out as T;
};

/** The file name a font is stored under in the job's fonts/ (same scheme as the brand kits). */
export const fontFile = (f: FontSpec) => f.file ?? `${f.family.replace(/\s+/g, '')}-${f.weight ?? 400}${f.italic ? 'italic' : ''}.ttf`;

const applyHero = (layer: Layer, hero: Hero): Layer => {
  if (layer.type !== 'photo' && layer.type !== 'cutout') return layer;
  const src = layer.src ?? (layer.type === 'photo' ? hero.src : hero.cut);
  return { focus: hero.focus, zoom: hero.zoom, offset: hero.offset, flip: hero.flip, ...layer, src };
};

export const resolveVariant = (job: JobSpec, style: StyleSpec, variant: VariantSpec, index: number): ResolvedVariant => {
  const chain = [job.defaults ?? {}, style, variant];
  const pick = <K extends keyof VariantSpec>(k: K) => chain.reduce<VariantSpec[K] | undefined>((acc, s) => s[k] ?? acc, undefined);
  const params = chain.reduce<Params>((acc, s) => merge(acc, s.params ?? {}), {});
  const hero = chain.reduce<Hero>((acc, s) => merge(acc, s.hero ?? {}), {});
  const id = variant.id ?? `${style.id}${index + 1}`;

  let layers: Layer[];
  const raw = pick('layers');
  const presetName = pick('preset');
  if (raw) layers = structuredClone(raw);
  else if (presetName) {
    const preset = PRESETS[presetName];
    if (!preset) throw new Error(`${id}: no preset "${presetName}". Have: ${Object.keys(PRESETS).join(', ')}`);
    layers = preset.build(params, hero);
  } else throw new Error(`${id}: needs a preset or layers`);

  const remove = new Set(chain.flatMap(s => s.remove ?? []));
  layers = layers.filter(l => !l.id || !remove.has(l.id));
  for (const { under, ...layer } of chain.flatMap(s => s.add ?? [])) {
    const at = under ? layers.findIndex(l => l.id === under) : -1;
    if (at >= 0) layers.splice(at, 0, layer as Layer);
    else layers.push(layer as Layer);
  }
  for (const patch of chain.map(s => s.patch ?? {}))
    for (const [lid, fields] of Object.entries(patch)) {
      const i = layers.findIndex(l => l.id === lid);
      if (i < 0) throw new Error(`${id}: patch for unknown layer "${lid}". Layers: ${layers.map(l => l.id).filter(Boolean).join(', ')}`);
      layers[i] = merge(layers[i], fields);
    }
  return { id, style: style.id, styleName: style.name, note: variant.note, layers: layers.filter(l => !l.hidden).map(l => applyHero(l, hero)) };
};

export const resolveJob = (job: JobSpec): ResolvedVariant[] => job.styles.flatMap(style => style.variants.map((v, i) => resolveVariant(job, style, v, i)));
