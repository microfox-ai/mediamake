/**
 * Picks a poster's treatments from the picture itself. `thumbs look <job>` (and `render`, for a
 * style with `"treatments": "auto"`) measures the hero picture as auto-exposure will show it,
 * scores every treatment against what it sees (light, contrast, colour, skin, neon, highlights,
 * texture, the edges) and the job's mood, keeps the ones that suit it, and tunes them to it
 * (duotone colours from its own palette, less vignette where the edges are already dark, less
 * grain on a noisy picture…). The result is written into poster.json, so IDs never move.
 *
 * Pure functions (Node runs them on raw RGB pixels). Keep `.ts` imports.
 */
import type { Mood } from './exposure.ts';
import type { Color } from './spec.ts';
import type { Tune } from './treatments.ts';

/** What a picture looks like, all 0..1 unless noted. */
export type Features = {
  /** mean luma and its spread (contrast) */
  mean: number;
  contrast: number;
  /** share of near-black (< 0.1) and bright (> 0.85) pixels */
  dark: number;
  bright: number;
  /** mean saturation of the lit pixels, and Hasler–Süsstrunk colourfulness (0 grey … ~1 very colourful) */
  saturation: number;
  colourful: number;
  /** red minus blue of the lit pixels (−1 cold … 1 warm) */
  warmth: number;
  /** how many hues share the colour (0 one hue … 1 all of them), and the main one in degrees */
  hueSpread: number;
  hue: number | null;
  /** share of vivid, bright pixels (neon, fire, lights) and of skin tones */
  neon: number;
  skin: number;
  /** fine detail (mean luma gradient) and sensor/film noise in flat areas */
  detail: number;
  noise: number;
  /** border brightness over centre brightness (low: the picture is already vignetted) */
  edges: number;
  /** main colours, darkest first: hex, share of the picture, luma, saturation */
  palette: { color: Color; share: number; luma: number; saturation: number }[];
};

export type Pick = { name: string; score: number; why: string[]; tune?: Tune };

const hex = (r: number, g: number, b: number): Color =>
  `#${[r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
const lumaOf = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const hsv = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max / 255 };
};
const r3 = (v: number) => +v.toFixed(3);

/** Features of an RGB image (`curve` maps each channel first: the picture as auto-exposure shows it). */
export const features = (rgb: Uint8Array, w: number, h: number, curve: (x: number) => number = x => x): Features => {
  const lut = Array.from({ length: 256 }, (_, i) => Math.round(curve(i / 255) * 255));
  const n = w * h;
  const Y = new Float32Array(n);
  let sum = 0, sum2 = 0, dark = 0, bright = 0, neon = 0, skin = 0;
  let lit = 0, satSum = 0, warmSum = 0;
  let rg = 0, rg2 = 0, yb = 0, yb2 = 0;
  const hues = new Array(12).fill(0);
  for (let i = 0; i < n; i++) {
    const r = lut[rgb[i * 3]], g = lut[rgb[i * 3 + 1]], b = lut[rgb[i * 3 + 2]];
    const y = lumaOf(r, g, b);
    Y[i] = y;
    sum += y;
    sum2 += y * y;
    if (y < 0.1) dark++;
    if (y > 0.85) bright++;
    const a = r - g, c = 0.5 * (r + g) - b;
    rg += a; rg2 += a * a; yb += c; yb2 += c * c;
    const { h: hue, s, v } = hsv(r, g, b);
    if (v > 0.15) {
      lit++;
      satSum += s;
      warmSum += (r - b) / 255;
    }
    if (s > 0.2 && v > 0.2) hues[Math.floor(hue / 30) % 12] += s * v;
    if (s > 0.6 && v > 0.55) neon++;
    // skin: warm hue, moderate saturation, in the YCbCr skin box
    const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
    if (y > 0.25 && s > 0.15 && s < 0.55 && hue > 8 && hue < 45 && cb > 77 && cb < 127 && cr > 133 && cr < 173) skin++;
  }
  const mean = sum / n;
  const contrast = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  const sd = (s: number, s2: number) => Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
  const colourful = (Math.hypot(sd(rg, rg2), sd(yb, yb2)) + 0.3 * Math.hypot(rg / n, yb / n)) / 100;
  const hueTotal = hues.reduce((x, y) => x + y, 0);
  const entropy = hueTotal ? -hues.reduce((e, v) => (v ? e + (v / hueTotal) * Math.log(v / hueTotal) : e), 0) / Math.log(12) : 0;
  // detail and noise from the luma gradient; noise is the Laplacian where the picture is flat
  const grads: number[] = [];
  const laps: number[] = [];
  let gradSum = 0;
  for (let yy = 1; yy < h - 1; yy++)
    for (let x = 1; x < w - 1; x++) {
      const i = yy * w + x;
      const gm = Math.abs(Y[i + 1] - Y[i - 1]) + Math.abs(Y[i + w] - Y[i - w]);
      gradSum += gm;
      if ((x + yy) % 3) continue; // a third of the pixels is plenty for the medians
      grads.push(gm);
      laps.push(Math.abs(4 * Y[i] - Y[i - 1] - Y[i + 1] - Y[i - w] - Y[i + w]));
    }
  const flat = [...grads].sort((a, b) => a - b)[Math.floor(grads.length * 0.4)] ?? 0;
  const flatLaps = laps.filter((_, k) => grads[k] <= flat).sort((a, b) => a - b);
  const noise = flatLaps[Math.floor(flatLaps.length / 2)] ?? 0;
  // the border (outer 12 %) against the centre (middle half)
  let edgeSum = 0, edgeN = 0, midSum = 0, midN = 0;
  const bx = Math.round(w * 0.12), by = Math.round(h * 0.12);
  for (let yy = 0; yy < h; yy++)
    for (let x = 0; x < w; x++) {
      const v = Y[yy * w + x];
      if (x < bx || x >= w - bx || yy < by || yy >= h - by) (edgeSum += v), edgeN++;
      else if (x > w / 4 && x < (3 * w) / 4 && yy > h / 4 && yy < (3 * h) / 4) (midSum += v), midN++;
    }
  return {
    mean: r3(mean),
    contrast: r3(contrast),
    dark: r3(dark / n),
    bright: r3(bright / n),
    saturation: r3(lit ? satSum / lit : 0),
    colourful: r3(colourful),
    warmth: r3(lit ? warmSum / lit : 0),
    hueSpread: r3(entropy),
    hue: hueTotal / n > 0.02 ? hues.indexOf(Math.max(...hues)) * 30 + 15 : null,
    neon: r3(neon / n),
    skin: r3(skin / n),
    detail: r3(gradSum / n),
    noise: r3(noise),
    edges: r3(midN && midSum ? edgeSum / edgeN / (midSum / midN) : 1),
    palette: palette(rgb, n, lut),
  };
};

/** Five main colours by k-means on a sample of the pixels, darkest first. */
const palette = (rgb: Uint8Array, n: number, lut: number[], k = 5) => {
  const step = Math.max(1, Math.floor(n / 6000));
  const px: [number, number, number][] = [];
  for (let i = 0; i < n; i += step) px.push([lut[rgb[i * 3]], lut[rgb[i * 3 + 1]], lut[rgb[i * 3 + 2]]]);
  const byLuma = [...px].sort((a, b) => lumaOf(...a) - lumaOf(...b));
  let centres = Array.from({ length: k }, (_, j) => byLuma[Math.floor(((j + 0.5) / k) * byLuma.length)]);
  let owner = new Array(px.length).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    owner = px.map(p => {
      let best = 0, bd = Infinity;
      centres.forEach((c, j) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bd) (bd = d), (best = j);
      });
      return best;
    });
    centres = centres.map((c, j) => {
      const mine = px.filter((_, i) => owner[i] === j);
      if (!mine.length) return c;
      return [0, 1, 2].map(ch => mine.reduce((s, p) => s + p[ch], 0) / mine.length) as [number, number, number];
    });
  }
  return centres
    .map((c, j) => ({ color: hex(...c), share: r3(owner.filter(o => o === j).length / px.length), luma: r3(lumaOf(...c)), saturation: r3(hsv(...c).s) }))
    .filter(c => c.share > 0)
    .sort((a, b) => a.luma - b.luma);
};

const mix = (a: Color, b: Color, t: number): Color => {
  const p = (c: Color) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return hex(...(x.map((v, i) => v + (y[i] - v) * t) as [number, number, number]));
};

/**
 * The picture's own duotone: its darkest colour deepened → its most characteristic colour (low, at a
 * third, so a deep accent doesn't darken the mid-tones) → halfway to → its lightest, lifted toward white.
 */
const duotoneOf = (f: Features): Color[] | undefined => {
  const lit = f.palette.filter(c => c.luma > 0.12);
  const accent = [...lit].sort((a, b) => b.saturation * Math.sqrt(b.share) - a.saturation * Math.sqrt(a.share))[0];
  if (!accent || accent.saturation < 0.25) return undefined;
  const darkest = f.palette[0];
  const lightest = f.palette[f.palette.length - 1];
  const light = mix(lightest.color, '#ffffff', 0.7);
  return [mix(darkest.color, '#000000', 0.55), accent.color, mix(accent.color, light, 0.55), light];
};

type Rule = (f: Features, mood: Mood) => [number, string][];
/** 0 below a, 1 above b, linear between */
const ramp = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
/** a reason with its weight; dropped when the weight rounds to nothing */
const by = (delta: number, why: string): [number, string][] => (Math.abs(delta) >= 0.01 ? [[delta, why]] : []);

/** Per treatment: what in the picture makes it a good or a bad fit. Scores start at 0.5. */
const RULES: Record<string, Rule> = {
  film: f => [
    ...by(0.15 * ramp(f.skin, 0.02, 0.08), 'skin tones: film is kind to faces'),
    ...by(f.saturation > 0.15 && f.saturation < 0.5 ? 0.1 : 0, 'natural colour to fade'),
    ...by(-0.15 * ramp(f.neon, 0.06, 0.15), 'neon colour goes muddy when faded'),
    ...by(-0.15 * ramp(f.dark, 0.45, 0.7), 'mostly black: lifted blacks turn it grey'),
    ...by(f.saturation < 0.08 ? -0.1 : 0, 'already grey: nothing for the warm tint'),
  ],
  matte: f => [
    ...by(0.2 * ramp(f.contrast, 0.2, 0.32), 'harsh contrast to calm down'),
    ...by(-0.3 * ramp(f.dark, 0.35, 0.6), 'mostly black: the charcoal wash flattens it'),
    ...by(-0.15 * (1 - ramp(f.contrast, 0.1, 0.16)), 'already flat'),
  ],
  vivid: f => [
    ...by(f.saturation > 0.08 ? 0.25 * (1 - ramp(f.saturation, 0.15, 0.4)) : 0, 'muted colour that can take a push'),
    ...by(-0.35 * ramp(f.saturation, 0.45, 0.65), 'already saturated: it would clip'),
    ...by(f.saturation <= 0.08 ? -0.45 : 0, 'grey: nothing to saturate'),
    ...by(-0.15 * ramp(f.neon, 0.1, 0.2), 'neon already at full strength'),
  ],
  noir: f => [
    ...by(0.2 * ramp(f.contrast, 0.15, 0.32), 'strong light and shadow for black and white'),
    ...by(0.1 * ramp(f.skin, 0.03, 0.1), 'a face: portraits shine in B&W'),
    ...by(-0.15 * ramp(f.colourful, 0.45, 0.8) * ramp(f.hueSpread, 0.4, 0.7), 'its many colours are the point'),
    ...by(f.saturation < 0.08 ? -0.15 : 0, 'already grey: close to plain'),
    ...by(-0.15 * (1 - ramp(f.contrast, 0.08, 0.14)), 'too flat for hard B&W'),
  ],
  duotone: f => [
    ...by(f.saturation < 0.12 ? 0.2 : 0.25 * (1 - ramp(f.hueSpread, 0.2, 0.6)), 'one main colour (or none): a duotone keeps its identity'),
    ...by(0.05 * ramp(f.contrast, 0.12, 0.2), 'clear shapes read well in two tones'),
    ...by(-0.1 * ramp(f.hueSpread, 0.7, 0.9) * ramp(f.colourful, 0.4, 0.7), 'many colours to lose'),
  ],
  riso: f => [
    ...by(0.15 * (1 - ramp(f.detail, 0.04, 0.09)), 'bold shapes: posterizing keeps them'),
    ...by(f.noise < 0.012 && f.saturation > 0.35 && f.detail < 0.07 ? 0.1 : 0, 'clean, flat colour (illustration-like)'),
    ...by(-0.3 * ramp(f.dark, 0.35, 0.6), 'mostly black: posterizing crushes the shadows'),
    ...by(-0.12 * ramp(f.skin, 0.03, 0.08) * ramp(f.detail, 0.05, 0.08), 'a detailed face goes blotchy'),
  ],
  vhs: (f, mood) => [
    ...by(0.25 * Math.max(ramp(f.neon, 0.02, 0.1), f.mean < 0.3 && f.saturation > 0.4 ? 0.8 : 0), 'neon or night colour, like tape'),
    ...by(mood === 'dark' ? 0.05 : 0, 'dark song'),
    ...by(-0.15 * ramp(f.noise, 0.02, 0.04), 'already noisy'),
    ...by(f.mean > 0.55 && f.saturation < 0.25 ? -0.2 : 0, 'bright and soft: tape looks out of place'),
  ],
  vintage: f => [
    ...by(0.12 * ramp(f.warmth, 0.02, 0.15), 'warm light suits sepia'),
    ...by(0.1 * (1 - ramp(f.saturation, 0.25, 0.5)), 'gentle colour'),
    ...by(-0.2 * ramp(f.neon, 0.06, 0.15), 'neon fights the old print'),
    ...by(-0.1 * ramp(-f.warmth, 0.05, 0.15), 'cold colour'),
    ...by(-0.15 * ramp(f.dark, 0.4, 0.65), 'mostly black under dust and paper'),
  ],
  dream: (f, mood) => [
    ...by(0.25 * ramp(f.bright, 0.005, 0.05), 'highlights for the bloom to catch'),
    ...by(f.bright < 0.004 ? -0.2 : 0, 'no highlights: the bloom has nothing to catch'),
    ...by(mood === 'bright' ? 0.1 : mood === 'dark' ? -0.12 : 0, `${mood} song`),
  ],
  night: (f, mood) => [
    ...by(0.12 * ramp(-f.warmth, 0.02, 0.15), 'cool colour already'),
    ...by(f.dark > 0.25 && f.dark < 0.7 ? 0.1 : 0, 'deep shadows with lit parts'),
    ...by(-0.12 * ramp(-f.warmth, 0.2, 0.35), 'already strongly blue: close to plain'),
    ...by(mood === 'bright' ? -0.2 : mood === 'dark' ? 0.1 : 0, `${mood} song`),
  ],
  cinema: f => [
    ...by(f.warmth > -0.05 ? 0.2 * ramp(f.skin, 0.03, 0.1) : 0, 'skin tones: the teal-orange grade is built for faces'),
    ...by(f.saturation > 0.12 && f.saturation < 0.5 ? 0.05 : 0, 'natural colour'),
    ...by(f.saturation < 0.08 ? -0.4 : 0, 'grey: no colour to split'),
    ...by(-0.15 * (1 - ramp(f.hueSpread, 0.25, 0.45)) * ramp(f.saturation, 0.4, 0.6), 'one strong colour: the split grade fights it'),
    ...by(-0.1 * ramp(f.neon, 0.1, 0.2), 'neon: the split grade muddies it'),
  ],
  neon: (f, mood) => [
    ...by(0.3 * ramp(f.neon, 0.02, 0.1), 'vivid lights to make glow'),
    ...by(0.1 * ramp(f.dark, 0.2, 0.5) * ramp(f.saturation, 0.3, 0.5), 'dark ground for glowing colour'),
    ...by(-0.3 * (1 - ramp(f.saturation, 0.15, 0.3)), 'too little colour to glow'),
    ...by(mood === 'bright' ? -0.1 : 0, 'bright song'),
  ],
  pastel: (f, mood) => [
    ...by(0.2 * ramp(f.mean, 0.35, 0.55), 'light picture: airy suits it'),
    ...by(mood === 'bright' ? 0.2 : mood === 'dark' ? -0.3 : 0, `${mood} song`),
    ...by(-0.35 * ramp(f.dark, 0.25, 0.5), 'mostly dark: pastel washes it out'),
    ...by(-0.1 * ramp(f.neon, 0.1, 0.2), 'neon fights the soft palette'),
  ],
};

/** Looks that do much the same thing: picking two from one family needs a clearly better score. */
const FAMILY: Record<string, string> = {
  film: 'faded', matte: 'faded', vintage: 'faded', pastel: 'faded',
  vivid: 'punch', neon: 'punch',
  noir: 'mono', duotone: 'mono',
  riso: 'texture', vhs: 'texture',
  dream: 'glow', cinema: 'grade', night: 'grade',
};

/** How to fit each look to this picture (multipliers on its effect strengths, its own duotone colours). */
const tuneFor = (name: string, f: Features): Tune | undefined => {
  const t: Tune = {};
  if (f.edges < 0.55) t.vignette = 0.3;
  else if (f.edges < 0.8) t.vignette = 0.65;
  if (f.noise > 0.03) t.grain = 0.4;
  else if (f.noise > 0.018) t.grain = 0.7;
  if (name === 'film' && f.warmth > 0.1) t.tint = 0.5;
  if (name === 'night' && f.warmth < -0.15) t.tint = 0.5;
  if ((name === 'dream' || name === 'vivid' || name === 'neon') && f.bright > 0.1) t.bloom = 0.6;
  if (name === 'duotone') {
    const d = duotoneOf(f);
    if (d) t.duotone = d;
  }
  return Object.keys(t).length ? t : undefined;
};

/** Every treatment scored for this picture and mood, best first. */
export const scoreTreatments = (f: Features, mood: Mood, names: string[]): Pick[] =>
  names
    .map(name => {
      const parts = RULES[name]?.(f, mood) ?? [];
      const score = r3(Math.min(1, Math.max(0, 0.5 + parts.reduce((s, [d]) => s + d, 0))));
      return { name, score, why: parts.map(([d, w]) => `${d > 0 ? '+' : '−'} ${w}`), tune: tuneFor(name, f) };
    })
    .sort((a, b) => b.score - a.score);

/**
 * The ones to make, best first: everything that fits (≥ 0.55 after a 0.1 penalty for each look
 * already picked from the same family, so the set stays varied), at least `min`, at most `max`.
 */
export const pickTreatments = (scored: Pick[], min = 4, max = 6) => {
  const left = [...scored];
  const picked: Pick[] = [];
  const effective = (p: Pick) => p.score - 0.1 * picked.filter(q => FAMILY[q.name] && FAMILY[q.name] === FAMILY[p.name]).length;
  while (left.length && picked.length < max) {
    left.sort((a, b) => effective(b) - effective(a));
    if (effective(left[0]) < 0.55 && picked.length >= min) break;
    picked.push(left.shift()!);
  }
  return picked;
};
