/** Helpers every preset shares: grades, the type roles, the headline stack and logo placement. */
import type { Anchor, Box, Color, FontRole, Grade, GradeMode, Hero, Layer, LogoLayer, Params, PhotoLayer, TextLayer } from '../spec.ts';

export type Preset = {
  /** one line: the look, and when to use it */
  about: string;
  /** what it needs from the hero: a picture, a cutout of it, or nothing */
  needs: ('src' | 'cut')[];
  /** layer ids it makes, for patch / remove / under */
  ids: string[];
  build: (p: Params, hero: Hero) => Layer[];
};

export const DEFAULT_FONT = 'Anton';

export const palette = (p: Params) => ({
  bg: p.palette?.bg ?? '#0b0b10',
  ink: p.palette?.ink ?? '#ffffff',
  accent: p.palette?.accent ?? '#ff2a2a',
  accent2: p.palette?.accent2 ?? p.palette?.accent ?? '#ff2a2a',
  dark: p.palette?.dark ?? '#050507',
});

export const gradeOf = (mode: GradeMode | undefined, p: Params): Pick<PhotoLayer, 'grade' | 'duotone'> => {
  const c = palette(p);
  const grades: Record<GradeMode, Pick<PhotoLayer, 'grade' | 'duotone'>> = {
    natural: {},
    punch: { grade: { saturate: 1.35, contrast: 1.15, brightness: 1.02 } },
    dark: { grade: { saturate: 1.1, contrast: 1.2, brightness: 0.78 } },
    mono: { grade: { grayscale: 1, contrast: 1.3, brightness: 0.95 } },
    duotone: { duotone: [c.dark, c.accent], grade: { contrast: 1.15 } satisfies Grade },
  };
  return grades[mode ?? 'punch'];
};

/** A text role's font with the hero's family as the fallback. */
export const type = (p: Params, role: 'heroType' | 'kickerType' | 'subType' | 'overlayType', fallback: FontRole = {}): FontRole => {
  const hero = p.heroType ?? {};
  const own = (p[role] as FontRole | undefined) ?? {};
  return { ...fallback, font: own.font ?? fallback.font ?? hero.font ?? DEFAULT_FONT, ...stripUndefined(own) };
};

const stripUndefined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

const textFrom = (role: FontRole): Partial<TextLayer> => stripUndefined({ font: role.font, weight: role.weight, italic: role.italic, tracking: role.tracking, color: role.color });

/**
 * The cinematic headline stack from the references: a small tracked kicker, the hero word(s),
 * an optional overlay word spread across the hero in the accent, and a sub line.
 * `region` is where the hero sits; the kicker goes just above it and the sub just below.
 */
export const headline = (
  p: Params,
  region: Box,
  o: { align?: TextLayer['align']; fit?: TextLayer['fit']; kickerSize?: number; subSize?: number; heroStyle?: Partial<TextLayer> } = {},
) => {
  const c = palette(p);
  const [x, y, w, h] = region;
  const align = o.align ?? 'center';
  const kickerSize = o.kickerSize ?? 30;
  const subSize = o.subSize ?? 62;
  const glow = typeof p.textGlow === 'string' ? { color: p.textGlow, size: 40 } : undefined;
  const title: TextLayer = {
    id: 'title',
    type: 'text',
    lines: p.words ?? 'WORD',
    box: region,
    align,
    fit: o.fit ?? 'each',
    color: c.ink,
    accent: c.accent,
    glow,
    upper: typeof p.upper === 'boolean' ? p.upper : undefined,
    ...textFrom(type(p, 'heroType')),
    ...o.heroStyle,
  };
  // kicker, sub and overlay sit against the hero's measured letters (attach), whatever the font
  const kicker: TextLayer | undefined = p.kicker
    ? { id: 'kicker', type: 'text', lines: [p.kicker], box: [x, y, w, kickerSize * 1.4], attach: { to: 'title', side: 'above', gap: kickerSize * 0.9 }, align, fit: 'none', size: kickerSize, tracking: 0.55, color: c.ink, ...textFrom(type(p, 'kickerType')) }
    : undefined;
  const sub: TextLayer | undefined = p.sub
    ? {
        id: 'sub',
        type: 'text',
        lines: [p.sub],
        box: [x + (align === 'center' ? w * 0.1 : 0), y, align === 'center' ? w * 0.8 : w, subSize * 1.15],
        attach: { to: overlayBelow(p) ? 'overlay' : 'title', side: 'below', gap: subSize * 0.45 },
        align,
        fit: 'block',
        size: subSize,
        upper: false,
        color: c.ink,
        shadow: { y: 4, blur: 18, color: 'rgba(0,0,0,0.7)' },
        ...textFrom(type(p, 'subType')),
      }
    : undefined;
  // between the hero's first two lines (A N D E R S O N), or just under a one-line hero
  const overlay: TextLayer | undefined = p.overlay
    ? { id: 'overlay', type: 'text', lines: [p.overlay], box: [x, y, w, 44], attach: { to: 'title', side: 'between', gap: 22 }, align: 'center', fit: 'none', size: 36, spread: true, color: c.accent, ...textFrom(type(p, 'overlayType')) }
    : undefined;
  return { title, kicker, sub, overlay };
};

/** A one-line hero puts the overlay under it, so the sub goes under the overlay. */
const overlayBelow = (p: Params) => !!p.overlay && (typeof p.words === 'string' ? !p.words.includes('\n') : (p.words?.length ?? 1) < 2);

export const present =<T>(...items: (T | undefined | false | '')[]) => items.filter(Boolean) as T[];

/** Logo layers from params; each preset passes where it would put the first, second, … logo. */
export const logos = (p: Params, defaults: Anchor[], width = 150): LogoLayer[] =>
  (p.logos ?? []).map((l, i) => ({
    id: `logo-${i}`,
    type: 'logo',
    src: l.src,
    anchor: l.at ? undefined : (l.anchor ?? defaults[i] ?? defaults[defaults.length - 1] ?? 'tl'),
    at: l.at,
    width: l.width ?? width,
    plate: l.plate,
    glow: l.glow,
    shadow: { y: 3, blur: 12, color: 'rgba(0,0,0,0.6)' },
  }));

export const grain = (p: Params, fallback = 0.18): Layer[] => {
  const g = typeof p.grain === 'number' ? p.grain : fallback;
  return g > 0 ? [{ id: 'grain', type: 'fx', kind: 'grain', strength: g }] : [];
};

export const tone = (c: Color, a: number) => {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map(x => x + x).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
