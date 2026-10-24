/**
 * Music poster presets: square album artwork, designed on a 1000×1000 canvas (rendered at 3000).
 * Text is optional: without `words` a cover is the picture alone. No logo unless `logos` is set.
 * The looks (film, noir, riso…) come from treatments, not from these.
 */
import type { Box, Layer } from '../spec.ts';
import { type Preset, gradeOf, headline, logos, palette, present, tone } from './common.ts';

const hasText = (p: { words?: unknown }) => p.words !== undefined && p.words !== '' && !(Array.isArray(p.words) && !p.words.length);

/**
 * cover: the picture full bleed; optional title (words) with the artist as sub, at the bottom or
 * top over a soft shade. Extras: y 'top' | 'bottom' (default bottom), height (title band, default 150).
 */
export const cover: Preset = {
  about: 'Full-bleed picture; optional title and artist at the bottom or top over a soft shade.',
  needs: ['src'],
  ids: ['bg', 'photo', 'shade', 'kicker', 'title', 'overlay', 'sub', 'logo-N'],
  build: p => {
    const c = palette(p);
    const text = hasText(p);
    const top = p.y === 'top';
    const h = typeof p.height === 'number' ? p.height : 150;
    const region: Box = [70, top ? 110 : 860 - h - (p.sub ? 60 : 0), 860, h];
    const { title, kicker, sub, overlay } = headline(p, region, { fit: 'block', kickerSize: 24, subSize: 40 });
    return present<Layer>(
      { id: 'bg', type: 'fill', color: c.dark },
      { id: 'photo', type: 'photo', ...gradeOf(p.grade ?? 'natural', p) },
      text && { id: 'shade', type: 'fill', background: `linear-gradient(to ${top ? 'bottom' : 'top'}, ${tone(c.dark, 0.7)} 0%, transparent 42%)` },
      text && kicker,
      text && title,
      text && overlay,
      text && sub,
      ...logos(p, ['tl', 'tr'], 120),
    );
  },
};

/**
 * cover-behind: the title huge across the cover, behind the subject (needs a cutout), the artist in
 * front below it. Extras: y 'top' | 'middle' | 'bottom' (default top), height (default 230), rim (glow colour).
 */
export const coverBehind: Preset = {
  about: 'Title huge across the cover, behind the cut-out subject; artist in front.',
  needs: ['src', 'cut'],
  ids: ['bg', 'photo', 'title', 'cut', 'kicker', 'overlay', 'sub', 'logo-N'],
  build: (p, hero) => {
    const c = palette(p);
    const h = typeof p.height === 'number' ? p.height : 230;
    const y = p.y === 'bottom' ? 860 - h : p.y === 'middle' ? 500 - h / 2 : 90;
    const { title, kicker, sub, overlay } = headline(p, [30, y, 940, h], { fit: 'block', kickerSize: 24, subSize: 40 });
    const graded = gradeOf(p.grade ?? 'natural', p);
    return present<Layer>(
      { id: 'bg', type: 'fill', color: c.dark },
      { id: 'photo', type: 'photo', ...graded },
      title,
      hero.cut && { id: 'cut', type: 'cutout', ...graded, glow: typeof p.rim === 'string' ? { color: p.rim, size: 20 } : undefined },
      kicker,
      overlay,
      sub,
      ...logos(p, ['tl', 'tr'], 120),
    );
  },
};

/**
 * cover-frame: a framed print. The picture inset on a plain ground, the title and artist in the
 * margin underneath, left-aligned. Extras: paper (ground colour, default palette bg), border (px, default 70).
 */
export const coverFrame: Preset = {
  about: 'Framed print: the picture inset on a plain ground, title and artist in the margin below.',
  needs: ['src'],
  ids: ['bg', 'photo', 'title', 'sub', 'kicker', 'logo-N'],
  build: p => {
    const c = palette(p);
    const m = typeof p.border === 'number' ? p.border : 70;
    const text = hasText(p);
    const photoH = text ? 1000 - m * 2 - 150 : 1000 - m * 2;
    const { title, kicker, sub } = headline(p, [m, m + photoH + 34, 1000 - m * 2, 70], { align: 'left', fit: 'block', kickerSize: 20, subSize: 30 });
    return present<Layer>(
      { id: 'bg', type: 'fill', color: typeof p.paper === 'string' ? p.paper : c.bg },
      { id: 'photo', type: 'photo', box: [m, m, 1000 - m * 2, photoH], ...gradeOf(p.grade ?? 'natural', p) },
      text && title,
      text && sub,
      text && kicker,
      ...logos(p, ['tr'], 110),
    );
  },
};
