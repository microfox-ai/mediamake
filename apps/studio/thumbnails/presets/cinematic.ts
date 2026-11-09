/**
 * The cinematic presets, from the references in thumbnails/inspiration/ (anime and motivation
 * edits): a full-bleed picture with one dominant hue, and a three-tier headline (kicker, hero, sub).
 */
import type { Box, Layer } from '../spec.ts';
import { type Preset, gradeOf, grain, headline, logos, palette, present, tone } from './common.ts';

const band = (y: unknown, top: number, middle: number, bottom: number) => (y === 'top' ? top : y === 'bottom' ? bottom : middle);

/**
 * behind: one giant word across the frame, behind the subject (ITACHI, GOAT, ATOMIC, DEMON).
 * Extras: y 'top' | 'middle' | 'bottom' (where the word sits), height (px of the word band, default 300),
 * rim (a colour glowing around the subject), heroFill (CSS background clipped to the word, e.g. a metallic gradient).
 */
export const behind: Preset = {
  about: 'Giant word across the frame, half hidden behind the subject; kicker above, name or phrase below.',
  needs: ['src', 'cut'],
  ids: ['bg', 'photo', 'shade', 'title', 'cut', 'kicker', 'overlay', 'sub', 'logo-N', 'grain'],
  build: (p, hero) => {
    const c = palette(p);
    const h = typeof p.height === 'number' ? p.height : 300;
    const region: Box = [36, band(p.y, 100, 170, 300), 1208, h];
    const { title, kicker, sub, overlay } = headline(p, region, {
      fit: 'block',
      heroStyle: typeof p.heroFill === 'string' ? { fill: p.heroFill } : {},
    });
    const graded = gradeOf(p.grade ?? 'dark', p);
    return present<Layer>(
      { id: 'bg', type: 'fill', color: c.dark },
      { id: 'photo', type: 'photo', ...graded },
      { id: 'shade', type: 'fx', kind: 'vignette', strength: 0.55 },
      title,
      hero.cut && { id: 'cut', type: 'cutout', ...graded, glow: typeof p.rim === 'string' ? { color: p.rim, size: 22 } : undefined },
      kicker,
      overlay,
      sub,
      ...logos(p, ['bc', 'tl']),
      ...grain(p),
    );
  },
};

/**
 * lower: the title in front of the picture, in the lower third (RELEASE THE BEAST, YOU'RE WRONG,
 * MONSTER OF GOD). Extras: align 'center' | 'left', y 'middle' | 'bottom' (default bottom), height (of the hero band, default 190).
 */
export const lower: Preset = {
  about: 'Title in front, lower third, over a darkened bottom; kicker, an accent overlay word and a sub line.',
  needs: ['src'],
  ids: ['bg', 'photo', 'shade', 'floor', 'kicker', 'title', 'overlay', 'sub', 'logo-N', 'grain'],
  build: p => {
    const c = palette(p);
    const left = p.align === 'left';
    const h = typeof p.height === 'number' ? p.height : 190;
    // the hero's letters end at `bottom`, leaving room for a sub and YouTube's timestamp corner
    const bottom = p.y === 'middle' ? 470 : 620 - (p.sub ? 75 : 0) - (p.overlay ? 50 : 0);
    const region: Box = left ? [70, bottom - h, 760, h] : [140, bottom - h, 1000, h];
    const { title, kicker, sub, overlay } = headline(p, region, {
      align: left ? 'left' : 'center',
      fit: 'each',
      heroStyle: { valign: 'bottom', shadow: { y: 6, blur: 24, color: 'rgba(0,0,0,0.75)' } },
    });
    return present<Layer>(
      { id: 'bg', type: 'fill', color: c.dark },
      { id: 'photo', type: 'photo', ...gradeOf(p.grade ?? 'dark', p) },
      { id: 'shade', type: 'fx', kind: 'vignette', strength: 0.5 },
      { id: 'floor', type: 'fill', background: `linear-gradient(to bottom, transparent 40%, ${tone(c.dark, 0.88)} 100%)` },
      kicker,
      title,
      overlay,
      sub,
      ...logos(p, ['tl', 'tr']),
      ...grain(p),
    );
  },
};

/**
 * side: the subject on one side, a text block on the other (I CAN, JUST GRIND). Extras: side
 * 'left' | 'right' (the text's side, default left), bar (false hides the accent bar), width and height (text block, default 560 × 210).
 */
export const side: Preset = {
  about: 'Subject on one side, a stacked text block on the other with an accent bar; the picture darkens toward the text.',
  needs: ['src'],
  ids: ['bg', 'photo', 'shade', 'kicker', 'title', 'overlay', 'sub', 'bar', 'logo-N', 'grain'],
  build: p => {
    const c = palette(p);
    const right = p.side === 'right';
    const w = typeof p.width === 'number' ? p.width : 560;
    const h = typeof p.height === 'number' ? p.height : 210;
    const region: Box = [right ? 1280 - 80 - w : 80, 355 - h / 2, w, h];
    const { title, kicker, sub, overlay } = headline(p, region, { align: right ? 'right' : 'left', fit: 'each', kickerSize: 26, subSize: 30 });
    if (sub) Object.assign(sub, { tracking: sub.tracking ?? 0.5, upper: true, fit: 'none' });
    const barX = right ? 1280 - 80 + 26 : 80 - 34;
    return present<Layer>(
      { id: 'bg', type: 'fill', color: c.dark },
      { id: 'photo', type: 'photo', ...gradeOf(p.grade ?? 'dark', p) },
      { id: 'shade', type: 'fill', background: `linear-gradient(to ${right ? 'left' : 'right'}, ${tone(c.dark, 0.85)} 0%, ${tone(c.dark, 0.35)} 45%, transparent 70%)` },
      kicker,
      title,
      overlay,
      sub,
      p.bar !== false && { id: 'bar', type: 'shape', kind: 'rect', box: [barX, region[1] - (p.kicker ? 55 : 20), 8, region[3] + (p.kicker ? 55 : 20) + (p.sub ? 60 : 20)], color: c.accent },
      ...logos(p, [right ? 'tr' : 'tl', right ? 'tl' : 'tr']),
      ...grain(p),
    );
  },
};
