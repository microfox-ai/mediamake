/** Graphic presets: a type-only poster (a concept without a picture), the sticker look, the news band. */
import type { Box, Layer } from '../spec.ts';
import { type Preset, gradeOf, grain, headline, logos, palette, present, tone } from './common.ts';

/**
 * poster: typography is the picture (a concept with no image, or a quote). Extras: rays (true for
 * light rays from the centre), speed (true for manga speed lines). With a hero src it becomes a
 * faint duotone texture behind the words.
 */
export const poster: Preset = {
  about: 'Type-only poster: huge stacked words on a glowing gradient, optional rays or speed lines.',
  needs: [],
  ids: ['bg', 'photo', 'rays', 'speed', 'kicker', 'title', 'overlay', 'sub', 'shade', 'logo-N', 'grain'],
  build: (p, hero) => {
    const c = palette(p);
    const region: Box = [70, 150, 1140, 400];
    const { title, kicker, sub, overlay } = headline(p, region, { fit: 'each', heroStyle: { glow: { color: tone(c.accent, 0.6), size: 50 } } });
    return present<Layer>(
      { id: 'bg', type: 'fill', background: `radial-gradient(ellipse at 50% 45%, ${c.accent2} 0%, ${c.bg} 55%, ${c.dark} 100%)` },
      hero.src && { id: 'photo', type: 'photo', duotone: [c.dark, c.accent], opacity: 0.35, blend: 'screen' },
      p.rays === true && { id: 'rays', type: 'fill', rays: { at: [0.5, 0.45], count: 18, color: tone(c.ink, 0.07) } },
      p.speed === true && { id: 'speed', type: 'fx', kind: 'speedlines', strength: 0.5, color: c.ink },
      kicker,
      title,
      overlay,
      sub,
      { id: 'shade', type: 'fx', kind: 'vignette', strength: 0.6 },
      ...logos(p, ['tl', 'tr']),
      ...grain(p, 0.22),
    );
  },
};

/**
 * sticker: the subject cut out with a thick outline over a bright field, chunky 3D words on the
 * other side (vlogs, challenges, tech, gaming). Extras: side (text side, default left),
 * shift (px the subject moves away from the text, default 250), arrow (true: an arrow from the words to the subject).
 */
export const sticker: Preset = {
  about: 'Cut-out subject with a thick white outline on a bright rayed field, chunky stroked and extruded words.',
  needs: ['cut'],
  ids: ['bg', 'rays', 'cut', 'title', 'kicker', 'sub', 'arrow', 'logo-N'],
  build: (p, hero) => {
    const c = palette(p);
    const right = p.side === 'right';
    const shift = typeof p.shift === 'number' ? p.shift : 250;
    const region: Box = [right ? 650 : 50, 150, 580, 420];
    const { title, kicker, sub } = headline(p, region, {
      align: 'center',
      fit: 'each',
      kickerSize: 34,
      subSize: 52,
      heroStyle: { stroke: { width: 9, color: '#000' }, extrude: { depth: 14, color: '#000', angle: 50 }, rotate: right ? 4 : -4, gap: 0.18 },
    });
    if (kicker) Object.assign(kicker, { tracking: 0.1, plate: { color: '#000', padX: 14, padY: 6 } });
    const [ox, oy] = hero.offset ?? [0, 0];
    return present<Layer>(
      { id: 'bg', type: 'fill', background: `radial-gradient(circle at ${right ? 30 : 70}% 50%, ${c.accent2} 0%, ${c.bg} 70%)` },
      { id: 'rays', type: 'fill', rays: { at: [right ? 0.3 : 0.7, 0.5], count: 16, color: tone(c.ink, 0.12) } },
      hero.cut && { id: 'cut', type: 'cutout', offset: [ox + (right ? -shift : shift), oy], outline: { width: 12, color: '#fff' }, shadow: { x: 8, y: 14, blur: 0, color: 'rgba(0,0,0,0.35)' }, ...gradeOf('punch', p) },
      title,
      kicker,
      sub,
      p.arrow === true && { id: 'arrow', type: 'shape', kind: 'arrow', from: right ? [700, 560] : [580, 560], to: right ? [520, 470] : [760, 470], color: c.accent, thickness: 22, stroke: { width: 6, color: '#000' } },
      ...logos(p, [right ? 'tl' : 'tr', right ? 'bl' : 'bl']),
    );
  },
};

/**
 * band: the photo as it is (punchy), the words on a skewed colour band (news, documentary, tech).
 * Extras: y 'top' | 'bottom' (default bottom), knockout (true: words cut out of the band; short words, very heavy fonts only).
 */
export const band: Preset = {
  about: 'Full photo, words on a skewed accent band (optionally knocked out), small dark kicker tag above.',
  needs: ['src'],
  ids: ['bg', 'photo', 'shade', 'kicker', 'title', 'sub', 'logo-N', 'grain'],
  build: p => {
    const c = palette(p);
    const top = p.y === 'top' ? 90 : 450;
    const region: Box = [70, top, 700, 130];
    const { title, kicker, sub } = headline(p, region, {
      align: 'left',
      fit: 'block',
      kickerSize: 28,
      subSize: 40,
      // the accent word can't be the plate's colour
      heroStyle: { color: c.dark, accent: p.palette?.accent2 && p.palette.accent2 !== c.accent ? p.palette.accent2 : '#000', plate: { color: c.accent, padX: 26, padY: 4, skew: -10, knockout: p.knockout === true } },
    });
    if (kicker) Object.assign(kicker, { tracking: 0.2, plate: { color: c.dark, padX: 12, padY: 6, skew: -10 } });
    return present<Layer>(
      { id: 'bg', type: 'fill', color: c.dark },
      { id: 'photo', type: 'photo', ...gradeOf(p.grade ?? 'punch', p) },
      { id: 'shade', type: 'fx', kind: 'vignette', strength: 0.35 },
      kicker,
      title,
      sub,
      ...logos(p, ['tr', 'tl']),
      ...grain(p, 0.08),
    );
  },
};
