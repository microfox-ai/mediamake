/**
 * Motion typography for the story captions (make-anime-music-video): the stacked white words of a 'stack'
 * caption, drawn letter by letter on a canvas, each line moving the way its words mean (after the user's
 * Pinterest motion-type boards, 2026-11-03: T018 words rotating into place, T137 echo stacks and stretched
 * letters, T130 ALONE behind the subject with its reflection, T118 the white glitch title, T155 letters
 * flying together out of dust, T045 letters dripping light, T020 a focus wave, T025 letters out of particles).
 *
 * A caption's motion (`w.mo`) is an entrance (`in`, per letter, landing on the word's sung beat), any number of
 * holds (`hold`: per-letter wobbles, or effects on the whole set of words: echoes, reflection, light rays,
 * heat, glitch slices, shake on the drum hits) and an exit (`out`: per letter, or the words broken up as one
 * image: dust, shatter, split, smear, a dive through). Every letter has real motion blur (sub-frame samples)
 * and everything stays white: no text colours.
 *
 * Three canvases: T holds the letters (white, per-letter states), F is T after its masks and displacements
 * (glitch, heat, wave, band, erase), and the visible canvas composites F with its shadow, glow, copies,
 * pieces, particles and graphic marks over the footage.
 */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { random } from 'remotion';
import { STACK_FONTS, type StackFont } from './fonts';
import type { Bg, Cut, Mo, MoHold, MoIn, MoOut, Words } from './types';

const W = 1920;
const H = 1080;
const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const outCubic = (x: number) => 1 - (1 - c01(x)) ** 3;
const outExpo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * c01(x)));
const inCubic = (x: number) => c01(x) ** 3;
const inOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const outBack = (x: number, s = 1.70158) => {
  const p = c01(x) - 1;
  return 1 + (s + 1) * p ** 3 + s * p ** 2;
};
const outBounce = (x: number) => {
  // a heavy landing: one real bounce and a little one
  const p = c01(x);
  if (p < 0.6) return (p / 0.6) ** 2;
  if (p < 0.85) return 1 - 0.09 * Math.sin(((p - 0.6) / 0.25) * Math.PI);
  return 1 - 0.025 * Math.sin(((p - 0.85) / 0.15) * Math.PI);
};
/** smooth value noise in -1..1 */
const noise = (seed: string, x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(random(`${seed}${i}`), random(`${seed}${i + 1}`), u) * 2 - 1;
};
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$/\\<>';

// ---------------------------------------------------------------- layout

type Glyph = { ch: string; row: number; wi: number; li: number; nl: number; gi: number; x: number; y: number; adv: number; size: number; capH: number; hero: boolean };
type Row = { y: number; size: number; w: number; x0: number; capH: number; hero: boolean };
type Look = NonNullable<Words['look']>;
type Layout = {
  glyphs: Glyph[];
  rows: Row[];
  box: { x0: number; y0: number; x1: number; y1: number };
  cx: number;
  cy: number;
  words: string[];
  font: string;
  weight: number;
  track: number;
  /** the hero word's font size */
  size0: number;
  tier: NonNullable<Words['tier']>;
  look: Look;
  /** the dark pool under the words (0 = none) */
  dim: number;
  /** the letters' colour: white, or what the caption asks for (honoredone rev-003: "use black text for honored one") */
  ink: string;
};

let mctx: CanvasRenderingContext2D | null = null;
const fontOf = (weight: number, size: number, family: string) => `${weight} ${size.toFixed(2)}px "${family}"`;

// the small words of a line: never its big word (unless the line has nothing else)
const SMALL = new Set([
  'I', 'A', 'AN', 'THE', 'OF', 'TO', 'IN', 'ON', 'AT', 'MY', 'ME', 'YOU', 'YOUR', "YOU'RE", "I'M", "I'D", 'AND', 'BUT', 'FOR',
  'WITH', 'THAT', 'WHAT', 'WHO', 'HE', 'HIS', 'THEY', "THEY'RE", 'THEM', "'EM", 'LET', 'AM', 'IS', 'WILL', 'CAN', 'WITHIN', 'OVER',
  'THROUGH', 'INTO', 'WHERE', 'WHILE', 'JUST', 'NO', 'US', 'AS', 'THAN', 'NOW', 'OFF', 'ALL',
]);
const bare = (s: string) => s.toUpperCase().replace(/[^A-Z0-9'-]/g, '');
/** the big word(s) of a line: `hero` if given, else its longest word that is not a small word (the last on a tie) */
const heroOf = (words: string[], hero?: string): [number, number] => {
  if (hero) {
    const hw = hero.toUpperCase().split(/\s+/).map(bare);
    for (let i = 0; i + hw.length <= words.length; i++) if (hw.every((x, k) => bare(words[i + k]) === x)) return [i, i + hw.length - 1];
  }
  let best = -1;
  let bl = -1;
  words.forEach((x, i) => {
    const b = bare(x);
    if (SMALL.has(b) && words.length > 1) return;
    if (b.length >= bl) [bl, best] = [b.length, i];
  });
  return best < 0 ? [words.length - 1, words.length - 1] : [best, best];
};
/** the big word's capital height (of the frame's height) and widest (of its width), by how much the line matters */
const TIER = { s: { cap: 0.065, w: 0.3 }, m: { cap: 0.11, w: 0.4 }, l: { cap: 0.17, w: 0.54 }, xl: { cap: 0.42, w: 0.9 } } as const;
const SMALL_TRACK = 0.06;

/** the free-space map: per cell the subject's cover (heads count three times) and the brightness */
const spaceOf = (w: Words) => {
  const sp = w.space!;
  const sub = [...sp.sub].map(d => Number(d) / 9);
  const luma = [...sp.luma].map(d => Number(d) / 9);
  const wt = new Array(sub.length).fill(1);
  for (let c = 0; c < sp.cols; c++) {
    let top = -1;
    for (let r = 0; r < sp.rows; r++) if (sub[r * sp.cols + c] >= 0.33) {
      top = r;
      break;
    }
    if (top >= 0) for (let r = top; r < Math.min(sp.rows, top + 4); r++) wt[r * sp.cols + c] = 3;
  }
  return { ...sp, sub, luma, wt };
};

/**
 * The lockup (ATOMIC RAP's, kingpinxdeadpool v12): the line's big word huge, the words before it small above
 * (flush left), the words after it small below (flush right). Sized by the line's tier and placed where it
 * covers least of the subject (his head most of all) and is not on a bright patch, from the free-space map;
 * an xl word fills the screen instead (drawn as an outline, a cutout behind him or a window onto the footage).
 */
const layoutOf = (w: Words): Layout => {
  const face = STACK_FONTS[(w.font ?? 'racing') as StackFont] ?? STACK_FONTS.racing;
  const words = w.text.toUpperCase().split(/\s+/).filter(Boolean);
  const [h0, h1] = heroOf(words, w.hero);
  const tier = w.tier ?? 'm';
  // a big word is never solid (honoredone v7: "big wording like TREAD don't look good, but bigger outline words
  // look good… as well as mask big words"): l and xl words are outlines unless they are a mask (cutout, window)
  const big = tier === 'l' || tier === 'xl';
  const look: Look = w.look ?? (big ? 'outline' : 'fill');
  mctx ??= document.createElement('canvas').getContext('2d');
  const ctx = mctx!;
  const measure = (line: string, size: number, track: number) => {
    ctx.font = fontOf(face.weight, size, face.family);
    return ctx.measureText(line).width + track * size * Math.max(0, line.length - 1);
  };
  ctx.font = fontOf(face.weight, 100, face.family);
  const capR = (ctx.measureText('H').actualBoundingBoxAscent || 70) / 100;
  const lines = [
    { idx: words.map((_, i) => i).filter(i => i < h0), hero: false, align: 'l' as const },
    { idx: words.map((_, i) => i).filter(i => i >= h0 && i <= h1), hero: true, align: 'c' as const },
    { idx: words.map((_, i) => i).filter(i => i > h1), hero: false, align: 'r' as const },
  ].filter(l => l.idx.length);
  const text = (l: (typeof lines)[number]) => l.idx.map(i => words[i]).join(' ');
  const heroLine = text(lines.find(l => l.hero)!);
  const T = TIER[tier];
  /** the rows' sizes at scale k of the tier */
  const geo = (k: number) => {
    const hs = Math.min((T.cap * H * k) / capR, (T.w * W * k) / Math.max(1, measure(heroLine, 100, face.track) / 100));
    const heroW = measure(heroLine, hs, face.track);
    let ss = Math.min(Math.max(hs * 0.36, (0.036 * H) / capR), (0.065 * H) / capR);
    for (const l of lines) if (!l.hero) ss = Math.min(ss, (Math.max(heroW, 0.16 * W) * 1.1) / Math.max(1, measure(text(l), 100, SMALL_TRACK) / 100));
    const rows = lines.map(l => {
      const size = l.hero ? hs : ss;
      const track = l.hero ? face.track : SMALL_TRACK;
      return { ...l, size, track, w: measure(text(l), size, track), capH: size * capR, lead: l.hero ? size * capR * 1.16 : size * capR * 1.55 };
    });
    const bw = Math.max(...rows.map(r => r.w));
    const bh = rows.reduce((a, r) => a + r.lead, 0);
    return { rows, bw, bh, heroW };
  };
  const margin = { x: 0.04 * W, y: 0.06 * H };
  let k = 1;
  let g = geo(1);
  let cx = W / 2;
  let cy = H / 2;
  let dim = w.dim ?? 0;
  const sp = w.space ? spaceOf(w) : null;
  /** how much of the subject (heads three times) and how bright the cells under a box are */
  const under = (x0: number, y0: number, x1: number, y1: number) => {
    if (!sp) return { cover: 0, lum: 0.4 };
    const cw = W / sp.cols;
    const ch = H / sp.rows;
    let acc = 0;
    let area = 0;
    let lum = 0;
    for (let r = Math.max(0, Math.floor(y0 / ch)); r <= Math.min(sp.rows - 1, Math.floor(y1 / ch)); r++)
      for (let c = Math.max(0, Math.floor(x0 / cw)); c <= Math.min(sp.cols - 1, Math.floor(x1 / cw)); c++) {
        const ov = (Math.max(0, Math.min(x1, (c + 1) * cw) - Math.max(x0, c * cw)) * Math.max(0, Math.min(y1, (r + 1) * ch) - Math.max(y0, r * ch))) / (cw * ch);
        const i = r * sp.cols + c;
        acc += ov * sp.sub[i] * sp.wt[i];
        lum += ov * sp.luma[i];
        area += ov;
      }
    return { cover: acc / Math.max(1e-6, area), lum: lum / Math.max(1e-6, area) };
  };
  if (w.x !== undefined || w.y !== undefined) {
    cx = (w.x ?? 0.5) * W;
    cy = (w.y ?? 0.5) * H;
  } else if (tier === 'xl') {
    // one word filling the screen; a cutout sits over his middle so his body breaks the letters
    if (look === 'cutout' && sp) {
      let sx = 0;
      let sw = 0;
      for (let r = 0; r < sp.rows; r++) for (let c = 0; c < sp.cols; c++) {
        sx += sp.sub[r * sp.cols + c] * (c + 0.5);
        sw += sp.sub[r * sp.cols + c];
      }
      if (sw > 0) cx = Math.min(Math.max((sx / sw / sp.cols) * W, g.bw / 2 + margin.x), W - g.bw / 2 - margin.x);
      cy = 0.46 * H;
    }
  } else if (sp) {
    let best = Infinity;
    for (const kk of [1, 0.84, 0.7, 0.58]) {
      const gg = geo(kk);
      for (let y = margin.y + gg.bh / 2; y <= H - margin.y - gg.bh / 2; y += H / 36)
        for (let x = margin.x + gg.bw / 2; x <= W - margin.x - gg.bw / 2; x += W / 48) {
          const u = under(x - gg.bw / 2 - 12, y - gg.bh / 2 - 8, x + gg.bw / 2 + 12, y + gg.bh / 2 + 8);
          const score = 2.6 * u.cover + 0.45 * Math.max(0, u.lum - 0.5) + 0.28 * (1 - kk) + 0.05 * Math.abs(y / H - 0.5) + 0.03 * Math.abs(x / W - 0.5);
          if (score < best) [best, k, g, cx, cy] = [score, kk, gg, x, y];
        }
    }
  } else cx = (w.x ?? 0.25) * W;
  // inside the frame
  cx = Math.min(Math.max(cx, g.bw / 2 + margin.x * 0.5), W - g.bw / 2 - margin.x * 0.5);
  cy = Math.min(Math.max(cy, g.bh / 2 + margin.y * 0.5), H - g.bh / 2 - margin.y * 0.5);
  // white words on a bright patch get a dark pool under them
  // no dark pool under the words (rev-002: "many a times you are dulling the shot to make the text visible,
  // dont do that"): a word that needs contrast is a mask, or the shot gets an overlay blended in (cut.ts)
  void k;
  const glyphs: Glyph[] = [];
  const rows: Row[] = [];
  const heroRow = g.rows.find(r => r.hero)!;
  const hx0 = cx - heroRow.w / 2;
  let y = cy - g.bh / 2;
  let gi = 0;
  g.rows.forEach((r, ri) => {
    const base = y + r.lead / 2 + r.capH / 2;
    // the small words flush with the big word's left (before) or right (after) edge, inside the frame
    let x0 = r.align === 'c' ? cx - r.w / 2 : r.align === 'l' ? hx0 : hx0 + heroRow.w - r.w;
    x0 = Math.min(Math.max(x0, margin.x * 0.5), W - margin.x * 0.5 - r.w);
    const line = text(r);
    ctx.font = fontOf(face.weight, r.size, face.family);
    const tr = r.track * r.size;
    const pre = (q: number) => ctx.measureText(line.slice(0, q)).width + tr * q;
    let wi = 0;
    let li = 0;
    for (let q = 0; q < line.length; q++) {
      const ch = line[q];
      if (ch === ' ') {
        wi++;
        li = 0;
        continue;
      }
      const a = pre(q);
      const b = pre(q + 1) - tr;
      const word = words[r.idx[wi]];
      glyphs.push({ ch, row: ri, wi: r.idx[wi], li, nl: word.length, gi: gi++, x: x0 + (a + b) / 2, y: base, adv: b - a, size: r.size, capH: r.capH, hero: r.hero });
      li++;
    }
    rows.push({ y: base, size: r.size, w: r.w, x0, capH: r.capH, hero: r.hero });
    y += r.lead;
  });
  const x0 = Math.min(...rows.map(r => r.x0));
  const x1 = Math.max(...rows.map(r => r.x0 + r.w));
  const y0 = rows[0].y - rows[0].capH;
  const y1 = rows[rows.length - 1].y;
  return { glyphs, rows, box: { x0, y0, x1, y1 }, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, words, font: face.family, weight: face.weight, track: face.track, size0: heroRow.size, tier, look, dim, ink: w.color ?? '#ffffff' };
};

// ---------------------------------------------------------------- per-letter states

type St = { dx: number; dy: number; sc: number; sx: number; sy: number; rot: number; a: number; blur: number; stroke: number; fill: number; ch?: string; clip: 0 | 1 | -1; glow: number };
const rest = (): St => ({ dx: 0, dy: 0, sc: 1, sx: 1, sy: 1, rot: 0, a: 1, blur: 0, stroke: 0, fill: 1, clip: 0, glow: 0 });

/** how each entrance is timed: it starts `lead` s before the word's beat, letters `stag` s apart */
const IN: Record<MoIn, { lead: number; dur: number; stag: number; order?: 'random' | 'out' }> = {
  rise: { lead: 0.06, dur: 0.42, stag: 0.028 },
  drop: { lead: 0.32, dur: 0.55, stag: 0.05, order: 'random' },
  assemble: { lead: 0.55, dur: 0.62, stag: 0.035, order: 'random' },
  throw: { lead: 0.16, dur: 0.24, stag: 0.018 },
  step: { lead: 0, dur: 0.2, stag: 0 },
  pop: { lead: 0.06, dur: 0.38, stag: 0.03, order: 'random' },
  focus: { lead: 0.12, dur: 0.62, stag: 0 },
  decode: { lead: 0.05, dur: 0.42, stag: 0.04, order: 'random' },
  build: { lead: 0.1, dur: 0.5, stag: 0.03 },
  spin: { lead: 0.07, dur: 0.32, stag: 0 },
  slam: { lead: 0.03, dur: 0.15, stag: 0 },
  twinkle: { lead: 0.05, dur: 0.3, stag: 0, order: 'random' },
  zeno: { lead: 0.1, dur: 0.25, stag: 0.02 },
  creep: { lead: 0, dur: 0.55, stag: 0 },
  form: { lead: 0.7, dur: 0.8, stag: 0 },
  drift: { lead: 0.55, dur: 0.95, stag: 0.05, order: 'random' },
  descend: { lead: 0.35, dur: 0.75, stag: 0.02 },
  flip: { lead: 0.06, dur: 0.4, stag: 0.035 },
  stretch: { lead: 0.1, dur: 0.45, stag: 0 },
  write: { lead: 0.02, dur: 0.7, stag: 0 },
  cut: { lead: 0, dur: 0.001, stag: 0 },
};

/** the letter's start time for its entrance */
const inStart = (w: Words, L: Layout, g: Glyph, beats: number[], kind: MoIn) => {
  const spec = IN[kind];
  const beat = beats[g.wi] ?? w.from;
  const wordEnd = beats[g.wi + 1] ?? Math.min(w.to, beat + 0.9);
  let delay = g.li * spec.stag;
  if (spec.order === 'random') delay = random(`ord${w.text}${g.gi}`) * spec.stag * g.nl;
  // footsteps / a creep: the letters across the time the word is sung
  if (kind === 'step' || kind === 'creep' || kind === 'twinkle') delay = ((wordEnd - beat) * 0.85 * (kind === 'twinkle' ? random(`tw${w.text}${g.gi}`) * g.nl : g.li)) / Math.max(1, g.nl);
  return Math.max(w.from, beat - spec.lead) + delay;
};

const applyIn = (s: St, kind: MoIn, p: number, g: Glyph, L: Layout, w: Words, mo: Mo, t: number, t0: number) => {
  const r1 = random(`a${w.text}${g.gi}`);
  const r2 = random(`b${w.text}${g.gi}`);
  const r3 = random(`c${w.text}${g.gi}`);
  const k = mo.k ?? 1;
  if (p <= 0 && kind !== 'zeno') {
    s.a = 0;
    return;
  }
  switch (kind) {
    case 'rise': {
      const e = outExpo(p);
      s.dy += (1 - e) * g.capH * 1.3;
      s.blur += (1 - e) * 5;
      s.clip = 1;
      break;
    }
    case 'drop': {
      const e = outBounce(p);
      s.dy += -(1 - e) * g.size * 2.2;
      s.rot += (1 - outCubic(p)) * (r1 - 0.5) * 0.5;
      s.a *= c01(p * 4);
      break;
    }
    case 'assemble': {
      const e = outCubic(p);
      s.dx += (1 - e) * (r1 - 0.5) * W * 0.55 * k;
      s.dy += (1 - e) * (r2 - 0.5) * H * 0.6 * k;
      s.rot += (1 - e) * (r3 - 0.5) * 5;
      s.sc *= lerp(0.35 + r2 * 1.4, 1, e);
      s.blur += (1 - e) * 6;
      s.a *= c01(p * 3);
      break;
    }
    case 'throw': {
      const e = outBack(outExpo(p), 0.6);
      const dir = mo.dir ?? (g.wi % 2 ? -1 : 1);
      s.dx += (1 - e) * dir * W * 0.6;
      s.a *= c01(p * 6);
      break;
    }
    case 'step': {
      s.sc *= 1 + 0.38 * (1 - outCubic(p));
      s.dy += -Math.sin(Math.PI * c01(p)) * g.size * 0.1;
      s.a *= c01(p * 8);
      break;
    }
    case 'pop': {
      s.sc *= outBack(p, 2.6);
      s.a *= c01(p * 5);
      break;
    }
    case 'focus': {
      const e = outCubic(p);
      const row = L.rows[g.row];
      s.dx += (g.x - (row.x0 + row.w / 2)) * 0.25 * (1 - e);
      s.blur += (1 - e) * g.size * 0.2;
      s.a *= c01(p * 1.6);
      break;
    }
    case 'decode': {
      if (p < 1) {
        const f = Math.floor(t * 30 * 0.5);
        s.ch = GLYPHS[Math.floor(random(`d${w.text}${g.gi}${f}`) * GLYPHS.length)];
        s.a *= random(`df${g.gi}${f}`) < 0.25 ? 0.25 : 0.75;
        s.dx += (random(`dx${g.gi}${f}`) - 0.5) * g.size * 0.06;
      } else {
        const since = t - t0 - IN.decode.dur;
        s.glow += c01(1 - since / 0.25);
      }
      break;
    }
    case 'build': {
      s.stroke = c01(p * 2.6);
      s.fill = c01((p - 0.35) / 0.5);
      break;
    }
    case 'spin': {
      const e = outCubic(p);
      const dir = g.wi % 2 ? -1 : 1;
      const ang = (1 - e) * dir * Math.PI * 0.5;
      // the whole word rotating about its own centre, as the camera rolls onto it (T018)
      const wg = L.glyphs.filter(x => x.wi === g.wi);
      const wx = (wg[0].x + wg[wg.length - 1].x) / 2;
      const wy = wg[0].y - g.capH / 2;
      const ox = g.x - wx;
      const oy = g.y - g.capH / 2 - wy;
      const sc = 1 + 0.7 * (1 - e);
      s.dx += (ox * Math.cos(ang) - oy * Math.sin(ang)) * sc - ox;
      s.dy += (ox * Math.sin(ang) + oy * Math.cos(ang)) * sc - oy;
      s.rot += ang;
      s.sc *= sc;
      s.a *= c01(p * 4);
      break;
    }
    case 'slam': {
      const e = outCubic(p);
      s.sc *= 1 + 1.3 * (1 - e) ** 2;
      s.blur += (1 - e) * 9;
      s.a *= c01(p * 3);
      break;
    }
    case 'twinkle': {
      s.sc *= lerp(0.5, 1, outBack(p, 2));
      s.glow += 1 - outCubic(p);
      s.a *= c01(p * 4);
      break;
    }
    case 'zeno': {
      // Achilles and the tortoise: the letters close half the gap every 0.38 s and never arrive. They
      // come from the frame's outer side (away from him), never further than the frame's edge
      const since = Math.max(0, t - t0);
      const side = L.cx > W / 2 ? 1 : -1;
      const room = side > 0 ? W - 14 - L.box.x1 : L.box.x0 - 14;
      const gap = Math.min(g.size * 1.9 * k, Math.max(g.size * 0.25, room)) * 0.5 ** (since / 0.38);
      s.dx += side * gap * (0.75 + 0.25 * r1);
      s.a *= c01(since / 0.2);
      s.blur += Math.min(6, gap * 0.02);
      break;
    }
    case 'creep': {
      s.blur += (1 - outCubic(p)) * 10;
      s.dy += (1 - outCubic(p)) * g.size * 0.06;
      s.a *= c01(p * 1.4);
      break;
    }
    case 'form':
      // revealed by the sweep that the particles land on (drawn in the particle pass)
      break;
    case 'drift': {
      const e = outCubic(p);
      s.dy += -(1 - e) * g.size * 1.1;
      s.dx += Math.sin(p * 4 + r1 * 6) * g.size * 0.22 * (1 - e);
      s.rot += (r2 - 0.5) * 0.7 * (1 - e);
      s.blur += (1 - e) * 8;
      s.a *= e;
      break;
    }
    case 'descend': {
      // lowered through its line's top edge, so it never crosses the row above
      const e = inOut(p);
      s.dy += -(1 - e) * g.capH * 1.3;
      s.blur += (1 - e) * 4;
      s.clip = -1;
      break;
    }
    case 'flip': {
      const e = outCubic(p);
      s.sx *= Math.max(0.02, Math.cos((1 - e) * Math.PI * 0.5));
      s.a *= c01(p * 2);
      break;
    }
    case 'stretch': {
      const e = outExpo(p);
      s.sx *= lerp(3.2, 1, e);
      s.blur += (1 - e) * 4;
      s.a *= c01(p * 3);
      break;
    }
    case 'write':
      // revealed by the pen's sweep (the F pass); the letters come in sharp
      break;
    case 'cut':
      break;
  }
};

const OUT: Record<MoOut, { dur: number; stag: number }> = {
  blur: { dur: 0.3, stag: 0 },
  fade: { dur: 0.25, stag: 0 },
  cut: { dur: 0.001, stag: 0 },
  fall: { dur: 0.6, stag: 0.04 },
  sink: { dur: 0.34, stag: 0.02 },
  rise: { dur: 0.34, stag: 0.02 },
  slip: { dur: 0.6, stag: 0.07 },
  flip: { dur: 0.35, stag: 0.03 },
  implode: { dur: 0.32, stag: 0 },
  dust: { dur: 0.9, stag: 0 },
  burn: { dur: 0.9, stag: 0 },
  erase: { dur: 0.38, stag: 0 },
  dark: { dur: 0.45, stag: 0 },
  shatter: { dur: 0.55, stag: 0 },
  split: { dur: 0.42, stag: 0 },
  slice: { dur: 0.3, stag: 0 },
  smear: { dur: 0.42, stag: 0 },
  dive: { dur: 0.4, stag: 0 },
  away: { dur: 0.42, stag: 0.012 },
};
/** when a caption's exit runs: its own length, but never before its last word has landed and been read */
const outSpan = (w: Words, kind: MoOut, beats: number[]) => {
  const dur = Math.min(w.mo?.outDur ?? OUT[kind].dur, (w.to - w.from) * 0.45);
  const last = beats.length ? beats[beats.length - 1] : w.from;
  const start = Math.min(Math.max(w.to - dur, last + 0.3), w.to - 0.12);
  return { start, dur: Math.max(0.12, w.to - start) };
};

const applyOut = (s: St, kind: MoOut, p: number, g: Glyph, L: Layout, w: Words) => {
  if (p <= 0) return;
  const r1 = random(`o${w.text}${g.gi}`);
  switch (kind) {
    case 'blur':
      s.blur += p * 14;
      s.a *= 1 - p;
      s.sc *= 1 + 0.06 * p;
      break;
    case 'fade':
      s.a *= 1 - p;
      break;
    case 'fall':
      s.dy += g.size * 2.4 * p * p;
      s.rot += (r1 - 0.5) * 1.6 * p;
      s.a *= 1 - p ** 3;
      break;
    case 'sink':
      s.dy += g.capH * 1.3 * inCubic(p);
      s.clip = 1;
      break;
    case 'rise':
      s.dy -= g.capH * 1.3 * inCubic(p);
      s.clip = -1;
      break;
    case 'slip':
      s.dy += g.size * 0.9 * p * p;
      s.blur += p * 8;
      s.a *= 1 - p;
      break;
    case 'flip':
      s.sx *= Math.max(0.02, Math.cos(p * Math.PI * 0.5));
      s.a *= 1 - p * p;
      break;
    case 'away': {
      // swept off sideways, accelerating; the motion blur comes from the letters' own movement
      const e = inCubic(p);
      s.dx += (w.mo?.dir ?? 1) * W * 0.55 * e;
      s.dy -= g.size * 0.15 * e;
      s.a *= 1 - c01((p - 0.65) / 0.35);
      break;
    }
    case 'implode': {
      const e = inCubic(p);
      s.dx += (L.cx - g.x) * e;
      s.dy += (L.cy - (g.y - g.capH / 2)) * e;
      s.sc *= 1 - 0.9 * e;
      s.a *= 1 - p * p;
      break;
    }
    default:
      // the rest break the words up as one image (composite pass)
      break;
  }
};

/** a letter's state at time t (entrance, holds, exit), without the whole-caption effects */
const stateAt = (g: Glyph, L: Layout, w: Words, mo: Mo, beats: number[], t: number): St => {
  const s = rest();
  const kin = mo.in ?? 'rise';
  const t0 = inStart(w, L, g, beats, kin);
  const p = (t - t0) / IN[kin].dur;
  applyIn(s, kin, p, g, L, w, mo, t, t0);
  const k = mo.k ?? 1;
  const holds = mo.hold ?? [];
  const since = t - w.from;
  for (const h of holds) {
    switch (h) {
      case 'tremble': {
        const amp = g.size * 0.022 * k * (0.6 + 0.4 * c01(since / 0.8));
        s.dx += noise(`tx${g.gi}`, t * 26) * amp;
        s.dy += noise(`ty${g.gi}`, t * 26) * amp;
        s.rot += noise(`tr${g.gi}`, t * 18) * 0.04 * k;
        break;
      }
      case 'wave': {
        const ph = g.x * 0.006 - t * 3.2;
        s.dy += Math.sin(ph) * g.size * 0.07 * k;
        s.rot += Math.cos(ph) * 0.09 * k;
        break;
      }
      case 'arc': {
        // the letters on a smile, its middle lowest
        const xn = (g.x - L.cx) / Math.max(1, (L.box.x1 - L.box.x0) / 2);
        const e = c01(p);
        s.dy += (1 - xn * xn) * g.size * 0.28 * k * outBack(e, 1.4);
        s.rot += -xn * 0.32 * k * outBack(e, 1.4);
        break;
      }
      case 'space': {
        const row = L.rows[g.row];
        s.dx += (g.x - (row.x0 + row.w / 2)) * 0.22 * k * c01(since / Math.max(0.5, w.to - w.from));
        break;
      }
      case 'reach': {
        // the last letter of the line stretching out, the hand reaching (T137's MMMONDAYYY)
        const last = L.glyphs[L.glyphs.length - 1];
        if (g.gi === last.gi) {
          const e = outCubic(c01((since - 0.25) / 0.9));
          s.sx *= 1 + 1.6 * e * k;
          s.dx += g.adv * 0.8 * e * k;
        }
        break;
      }
      case 'shimmer':
        s.dx += noise(`sm${g.gi}`, t * 40) * g.size * 0.008;
        s.blur += 0.6 + 0.6 * noise(`sb${g.gi}`, t * 9);
        break;
      case 'hollow':
        // outlines only (empty thoughts)
        s.stroke = Math.max(s.stroke, s.a > 0 ? 1 : 0);
        s.fill = 0;
        break;
      default:
        break;
    }
  }
  const kout = mo.out ?? 'blur';
  const span = outSpan(w, kout, beats);
  const od = span.dur;
  const ostart = span.start - OUT[kout].stag * (L.glyphs.length - 1) * (kout === 'slip' ? 1 : 0.5);
  const pd = (t - (ostart + OUT[kout].stag * g.gi)) / od;
  applyOut(s, kout, c01(pd), g, L, w);
  return s;
};

// ---------------------------------------------------------------- drawing letters

const drawGlyph = (ctx: CanvasRenderingContext2D, L: Layout, g: Glyph, s: St, alpha: number) => {
  const a = c01(s.a) * alpha;
  if (a <= 0.004) return;
  ctx.save();
  if (s.clip) {
    // the line the letters rise out of / sink into
    ctx.beginPath();
    if (s.clip === 1) ctx.rect(0, g.y - g.capH * 1.25 - g.size, W, g.capH * 1.25 + g.size + g.capH * 0.12);
    else ctx.rect(0, g.y - g.capH * 1.12, W, H);
    ctx.clip();
  }
  ctx.translate(g.x + s.dx, g.y - g.capH / 2 + s.dy);
  if (s.rot) ctx.rotate(s.rot);
  ctx.scale(s.sc * s.sx, s.sc * s.sy);
  ctx.font = fontOf(L.weight, g.size, L.font);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.filter = s.blur > 0.35 ? `blur(${s.blur.toFixed(1)}px)` : 'none';
  const ch = s.ch ?? g.ch;
  if (s.stroke > 0) {
    ctx.globalAlpha = a * s.stroke;
    // a big word's outline stays fine (ATOMIC RAP's stroke over the subject); a small one's reads at all
    ctx.lineWidth = Math.max(2.5, Math.min(5.5, g.size * (g.size > 120 ? 0.014 : 0.03)));
    ctx.strokeStyle = L.ink;
    ctx.strokeText(ch, 0, g.capH / 2);
  }
  if (s.fill > 0) {
    ctx.globalAlpha = a * s.fill;
    ctx.fillStyle = L.ink;
    ctx.fillText(ch, 0, g.capH / 2);
  }
  ctx.restore();
};

type Paint = 'fill' | 'stroke' | 'ghost' | 'skip';
const paintWith = (s: St, p: Paint) => {
  if (p === 'stroke') {
    s.stroke = s.a > 0 ? 1 : 0;
    s.fill = 0;
  } else if (p === 'ghost') {
    // a cutout with no matte to go behind: the outline and a thin fill, so the picture shows through
    s.stroke = s.a > 0 ? 1 : 0;
    s.fill *= 0.28;
  }
  return s;
};

/** all letters at t (painted as `paint` says), with motion blur: sub-frame samples where a letter moves fast */
const drawLetters = (ctx: CanvasRenderingContext2D, L: Layout, w: Words, mo: Mo, beats: number[], t: number, paint: (g: Glyph) => Paint = () => 'fill') => {
  const shutter = 1 / 60;
  for (const g of L.glyphs) {
    const p = paint(g);
    if (p === 'skip') continue;
    const at = (tt: number) => paintWith(stateAt(g, L, w, mo, beats, tt), p);
    const s1 = at(t);
    const s0 = at(t - shutter);
    const move = Math.hypot(s1.dx - s0.dx, s1.dy - s0.dy) + Math.abs(s1.rot - s0.rot) * g.size + Math.abs(s1.sc - s0.sc) * g.size;
    if (move < 2.5 || s1.ch) {
      drawGlyph(ctx, L, g, s1, 1);
      continue;
    }
    const n = Math.min(10, 3 + Math.floor(move / 6));
    for (let i = 0; i < n; i++) drawGlyph(ctx, L, g, at(t - (shutter * i) / (n - 1)), 1.4 / n);
  }
};

// ---------------------------------------------------------------- particles (dust, form, embers)

type Pts = { x: Float32Array; y: Float32Array; n: number };
const ptsCache = new Map<string, Pts>();
const keyOf = (w: Words) => `${w.text}|${w.from}|${w.x}|${w.y}|${w.width}|${w.size}|${w.rows}|${w.font}`;

/** points on the letters at rest, for the particles that break off or gather into them */
const pointsOf = (w: Words, L: Layout): Pts => {
  const key = keyOf(w);
  const hit = ptsCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  for (const g of L.glyphs) drawGlyph(ctx, L, g, rest(), 1);
  const { x0, y0, x1, y1 } = L.box;
  const bx = Math.max(0, Math.floor(x0 - 10));
  const by = Math.max(0, Math.floor(y0 - 10));
  const bw = Math.min(W - bx, Math.ceil(x1 - x0 + 20));
  const bh = Math.min(H - by, Math.ceil(y1 - y0 + 20));
  const data = ctx.getImageData(bx, by, bw, bh).data;
  let lit = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] > 128) lit++;
  const step = Math.max(2, Math.round(Math.sqrt((lit * 4) / 5000)));
  const xs: number[] = [];
  const ys: number[] = [];
  for (let yy = 0; yy < bh; yy += step)
    for (let xx = 0; xx < bw; xx += step) if (data[(yy * bw + xx) * 4 + 3] > 128) {
      xs.push(bx + xx + (random(`px${xx}${yy}`) - 0.5) * step);
      ys.push(by + yy + (random(`py${xx}${yy}`) - 0.5) * step);
    }
  const pts = { x: Float32Array.from(xs), y: Float32Array.from(ys), n: xs.length };
  ptsCache.set(key, pts);
  return pts;
};

// ---------------------------------------------------------------- the component

const useCanvas = () => useMemo(() => {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}, []);

/** which part of a caption this layer draws: behind the subject's cutout, over him, or all of it (no matte) */
export type Pass = 'behind' | 'front' | 'solo';

export const Motion: React.FC<{ w: Words; t: number; cut?: Cut; pass?: Pass }> = ({ w, t, cut, pass = 'solo' }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const T = useCanvas();
  const F = useCanvas();
  const G = useCanvas();
  const Hc = useCanvas();
  const L = useMemo(() => layoutOf(w), [w]);
  useLayoutEffect(() => {
    const V = ref.current?.getContext('2d');
    if (!V) return;
    draw(V, T, F, G, Hc, L, w, t, cut, pass);
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
};

const has = (mo: Mo, h: MoHold) => (mo.hold ?? []).includes(h);

const draw = (V: CanvasRenderingContext2D, Tc: HTMLCanvasElement, Fc: HTMLCanvasElement, Gc: HTMLCanvasElement, Hc: HTMLCanvasElement, L: Layout, w: Words, t: number, cut: Cut | undefined, pass: Pass) => {
  const mo: Mo = w.mo ?? {};
  const k = mo.k ?? 1;
  const beats = w.beats ?? L.words.map((_, i) => w.from + (i * (w.to - w.from)) / L.words.length);
  const T = Tc.getContext('2d')!;
  const F = Fc.getContext('2d')!;
  const G = Gc.getContext('2d')!;
  V.clearRect(0, 0, W, H);
  T.clearRect(0, 0, W, H);
  F.clearRect(0, 0, W, H);
  const { box } = L;
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  const size = L.size0;
  const since = t - w.from;
  const life = w.to - w.from;
  const kout = mo.out ?? 'blur';
  const od = outSpan(w, kout, beats).dur;
  const op = c01((t - (w.to - od)) / od);
  const first = beats[0] ?? w.from;

  // 1. letters: the big word as its look says (behind him / over him / an outline / holes in the black), the
  // small words filled (never behind him)
  const look = L.look;
  const heroPaint: Paint =
    look === 'outline' ? 'stroke' : look === 'cutout' ? (pass === 'behind' ? 'fill' : pass === 'front' ? 'stroke' : 'ghost') : look === 'window' ? 'skip' : 'fill';
  // (a cutout's small words stay over him; a word set wholly behind him draws all of itself there)
  drawLetters(T, L, w, mo, beats, t, g => (g.hero ? heroPaint : look === 'cutout' && pass === 'behind' ? 'skip' : 'fill'));
  const HX = Hc.getContext('2d')!;
  if (look === 'window') {
    HX.clearRect(0, 0, W, H);
    drawLetters(HX, L, w, mo, beats, t, g => (g.hero ? 'fill' : 'skip'));
  }
  // the copies of the words (echoes, reflection, shadow, rays) and the marks are drawn once: by the layer that
  // holds the big word's fill, the marks by the one over him
  const copies = !(look === 'cutout' && pass === 'front') && look !== 'window';
  const marks = !(look === 'cutout' && pass === 'behind');

  // 2. F = the letters, displaced and masked
  const f = Math.round(t * 30);
  const glitchOn = has(mo, 'glitch') && (random(`g${w.text}${Math.floor(t * 12)}`) < 0.45 * k || since < 0.18);
  const slicing = kout === 'slice' && op > 0;
  F.drawImage(Tc, 0, 0);
  if (has(mo, 'ripple')) {
    // cloth / water: columns of the letters shifted up and down
    const xa = Math.floor(box.x0 - size * 0.5);
    const xb = Math.ceil(box.x1 + size * 0.5);
    F.clearRect(xa, 0, xb - xa, H);
    for (let x = xa; x < xb; x += 6) {
      const dy = Math.sin(x * 0.012 - t * 4) * size * 0.05 * k + Math.sin(x * 0.031 + t * 2.3) * size * 0.02 * k;
      F.drawImage(Tc, x, 0, 6, H, x, dy, 6, H);
    }
  }
  if (has(mo, 'heat') || glitchOn || slicing) {
    // rows of the letters shoved sideways: heat shimmer, glitch slices, the slice exit
    const ya = Math.floor(box.y0 - size * 0.3);
    const yb = Math.ceil(box.y1 + size * 0.3);
    const src = has(mo, 'ripple') ? (() => {
      G.clearRect(0, 0, W, H);
      G.drawImage(Fc, 0, 0);
      return Gc;
    })() : Tc;
    F.clearRect(0, ya, W, yb - ya);
    for (let y = ya; y < yb; ) {
      let h = 3;
      let dx = 0;
      if (glitchOn) h = 6 + Math.floor(random(`gh${y}${f}`) * size * 0.22);
      if (slicing) h = Math.max(h, Math.floor(size * 0.18));
      if (has(mo, 'heat')) dx += noise(`h${y}`, t * 7 + y * 0.02) * size * 0.022 * k;
      if (glitchOn && random(`gs${y}${f}`) < 0.3) dx += (random(`gd${y}${f}`) - 0.5) * size * 0.7 * k;
      if (slicing) dx += (Math.floor((y - ya) / h) % 2 ? 1 : -1) * inCubic(op) * W * 0.5;
      F.drawImage(src, 0, y, W, h, dx, y, W, h);
      y += h;
    }
  }

  // the blindfold: a band cut out of the letters' middle (I wear the mask / pull off the blindfold)
  if (has(mo, 'band') || has(mo, 'unband')) {
    const pIn = outExpo(c01((t - first + 0.05) / 0.35));
    const off = has(mo, 'unband') ? inCubic(c01((t - (beats[beats.length - 1] ?? first)) / 0.4)) : 0;
    F.save();
    F.globalCompositeOperation = 'destination-out';
    for (const r of L.rows) {
      const bandH = r.capH * 0.34;
      const yb = r.y - r.capH * 0.58 + off * r.capH * 1.6;
      const xa = r.x0 - 20;
      const xb = lerp(xa, r.x0 + r.w + 20, has(mo, 'unband') ? 1 : pIn);
      F.fillRect(xa, yb - bandH / 2, xb - xa, bandH);
    }
    F.restore();
    // its edges, two thin lines
    F.save();
    F.fillStyle = 'rgba(255,255,255,0.85)';
    for (const r of L.rows) {
      const bandH = r.capH * 0.34;
      const yb = r.y - r.capH * 0.58 + off * r.capH * 1.6;
      const xa = r.x0 - 26;
      const xb = lerp(xa, r.x0 + r.w + 26, has(mo, 'unband') ? 1 : pIn);
      F.globalAlpha = 0.9 * (1 - off);
      F.fillRect(xa, yb - bandH / 2 - 2, xb - xa, 2);
      F.fillRect(xa, yb + bandH / 2, xb - xa, 2);
    }
    F.restore();
  }

  // exits that wipe the letters away from the left: erase (hard edge), dark (soft), dust / burn (eroding)
  const sweep = (from: number, dur: number, soft: number, dir: 'x' | 'up' = 'x') => {
    const p = c01((t - from) / dur);
    if (p <= 0) return null;
    F.save();
    F.globalCompositeOperation = 'destination-out';
    let gr: CanvasGradient;
    if (dir === 'x') {
      const xe = lerp(box.x0 - soft, box.x1 + soft, p);
      gr = F.createLinearGradient(xe - soft, 0, xe + 1, 0);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      F.fillStyle = gr;
      F.fillRect(0, 0, xe + 1, H);
    } else {
      const ye = lerp(box.y1 + soft, box.y0 - soft, p);
      gr = F.createLinearGradient(0, ye + soft, 0, ye - 1);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      F.fillStyle = gr;
      F.fillRect(0, ye - 1, W, H);
    }
    F.restore();
    return p;
  };
  const oStart = w.to - od; // = outSpan(…).start
  if (kout === 'erase') {
    const p = sweep(oStart, od, 4);
    if (p !== null && p < 1) {
      const xe = lerp(box.x0 - 4, box.x1 + 4, p);
      F.fillStyle = '#fff';
      F.fillRect(xe, box.y0 - size * 0.15, 3, bh + size * 0.3);
    }
  }
  if (kout === 'dark') sweep(oStart, od, size * 0.7);
  if (kout === 'dust') sweep(oStart, od * 0.7, size * 0.35);
  if (kout === 'burn') sweep(oStart, od * 0.75, size * 0.3, 'up');
  // write: a soft wipe from the left with a line of light at its edge, as if written as the voice comes in
  if (mo.in === 'write') {
    const t0 = Math.max(w.from, first - IN.write.lead);
    const p = c01((t - t0) / IN.write.dur);
    const soft = size * 0.18;
    const xe = lerp(box.x0 - soft, box.x1 + soft, outCubic(p));
    F.save();
    F.globalCompositeOperation = 'destination-in';
    const gr = F.createLinearGradient(xe - soft, 0, xe + 1, 0);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    F.fillStyle = gr;
    F.fillRect(0, 0, W, H);
    F.restore();
    if (p > 0 && p < 1) {
      F.save();
      F.fillStyle = '#ffffff';
      F.shadowColor = 'rgba(255,255,255,0.95)';
      F.shadowBlur = size * 0.12;
      F.fillRect(xe - 2, box.y0 - size * 0.12, 4, bh + size * 0.24);
      F.restore();
    }
  }
  // form: the letters revealed by the sweep the particles land on
  const formIn = mo.in === 'form';
  const fIn = Math.max(w.from, first - IN.form.lead);
  if (formIn) {
    const p = c01((t - fIn - 0.25) / (IN.form.dur * 0.75));
    F.save();
    F.globalCompositeOperation = 'destination-in';
    const xe = lerp(box.x0 - size * 0.4, box.x1 + size * 0.4, p);
    const gr = F.createLinearGradient(xe - size * 0.4, 0, xe, 0);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    F.fillStyle = gr;
    F.fillRect(0, 0, W, H);
    F.restore();
  }

  // 3. the composite: the whole set of words moved as one (camera)
  let bx = 0;
  let by = 0;
  let bs = 1 + 0.035 * c01(since / Math.max(1, life)); // a slow push
  let brot = 0;
  let balpha = 1;
  let bblur = 0;
  if (has(mo, 'breathe')) bs *= 1 + 0.025 * Math.sin(since * 2.6);
  if (has(mo, 'zoom')) bs *= 1 + 0.16 * k * inOut(c01(since / Math.max(0.6, life)));
  // impact shake: after a slam's landing and on the drum hits (shake)
  const shakeAmt = (() => {
    let a = 0;
    if (mo.in === 'slam') for (const b of beats) if (t >= b && t < b + 0.45) a = Math.max(a, Math.exp(-(t - b) * 9));
    if (has(mo, 'shake')) {
      a = Math.max(a, 0.18 * k);
      for (const hit of cut?.hits ?? []) if (t >= hit && t < hit + 0.4 && hit >= w.from) a = Math.max(a, 0.9 * k * Math.exp(-(t - hit) * 10));
    }
    return a;
  })();
  if (shakeAmt > 0) {
    bx += noise('bx', t * 34) * size * 0.07 * shakeAmt;
    by += noise('by', t * 34) * size * 0.07 * shakeAmt;
    brot += noise('br', t * 20) * 0.025 * shakeAmt;
  }
  if (has(mo, 'flicker')) {
    // the old TV: the picture flickers, slips sideways, rolls a little
    const fl = random(`fl${f}`);
    balpha *= fl < 0.12 ? 0.35 : 0.82 + 0.18 * fl;
    bx += random(`fx${Math.floor(t * 10)}`) < 0.2 ? (random(`fxx${f}`) - 0.5) * size * 0.2 : 0;
  }
  if (kout === 'dive') {
    const e = inCubic(op);
    bs *= Math.exp(e * 3.2);
    bblur += e * 18;
    balpha *= 1 - c01((op - 0.6) / 0.4);
  }
  if (kout === 'smear') balpha *= 1 - op;

  const pivotX = L.cx;
  const pivotY = L.cy;
  const place = (ctx: CanvasRenderingContext2D, extraS = 1, dx = 0, dy = 0) => {
    ctx.translate(pivotX + bx + dx, pivotY + by + dy);
    if (brot) ctx.rotate(brot);
    ctx.scale(bs * extraS, bs * extraS);
    ctx.translate(-pivotX, -pivotY);
  };
  const blit = (alpha: number, opts: { s?: number; dx?: number; dy?: number; filter?: string; op?: GlobalCompositeOperation; flipY?: number; src?: HTMLCanvasElement } = {}) => {
    if (alpha <= 0.003) return;
    V.save();
    place(V, opts.s ?? 1, opts.dx ?? 0, opts.dy ?? 0);
    if (opts.flipY !== undefined) {
      V.translate(0, opts.flipY);
      V.scale(1, -1);
      V.translate(0, -opts.flipY);
    }
    V.globalAlpha = alpha;
    V.filter = opts.filter ?? (bblur > 0.5 ? `blur(${bblur.toFixed(1)}px)` : 'none');
    if (opts.op) V.globalCompositeOperation = opts.op;
    V.drawImage(opts.src ?? Fc, 0, 0);
    V.restore();
  };

  // a soft dark pool under the words on a bright frame (white words only, never black ones)
  // the copies of the words (echoes, reflection, the long shadow, infinity) leave with the exit
  const copyA = balpha * (1 - op);
  if (L.dim > 0 && marks) {
    const a = Math.min(1, since / 0.15) * (1 - op);
    const dim = Math.min(0.9, L.dim * 1.3);
    const r = Math.max(bw, bh) * 1.05;
    const gr = V.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, r);
    gr.addColorStop(0, `rgba(0,0,0,${(dim * a).toFixed(3)})`);
    gr.addColorStop(0.5, `rgba(0,0,0,${(dim * 0.6 * a).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    V.save();
    V.translate(L.cx, L.cy);
    V.scale(1.35, 1);
    V.translate(-L.cx, -L.cy);
    V.fillStyle = gr;
    V.fillRect(0, 0, W, H);
    V.restore();
  }

  // the reflection below (T130 ALONE)
  if (copies && has(mo, 'reflect')) {
    const floor = box.y1 + size * 0.06;
    G.clearRect(0, 0, W, H);
    G.save();
    G.translate(0, floor);
    G.scale(1, -1);
    G.translate(0, -floor);
    G.drawImage(Fc, 0, 0);
    G.restore();
    G.save();
    G.globalCompositeOperation = 'destination-out';
    const gr = G.createLinearGradient(0, floor, 0, floor + bh * 0.9);
    gr.addColorStop(0, 'rgba(0,0,0,0.15)');
    gr.addColorStop(1, 'rgba(0,0,0,1)');
    G.fillStyle = gr;
    G.fillRect(0, floor, W, H - floor);
    G.fillStyle = '#000';
    G.fillRect(0, 0, W, floor);
    G.restore();
    blit(0.34 * copyA, { src: Gc, filter: 'blur(2px)' });
  }

  // the long shadow (for a shadow / where shadows fall)
  if (copies && has(mo, 'shadow')) {
    const n = 14;
    const grow = outCubic(c01(since / 0.7));
    for (let i = n; i >= 1; i--) blit((0.5 * (1 - i / (n + 1))) * copyA, { dx: i * size * 0.022 * grow, dy: i * size * 0.03 * grow, filter: 'brightness(0)' });
  }

  // infinity: copies receding into the distance, flowing in (Limitless / the endless / my Domain)
  if (copies && has(mo, 'infinite')) {
    const n = 11;
    const ph = (since * 0.55) % 1;
    for (let i = n; i >= 1; i--) {
      const kk = i - ph;
      blit(0.5 * 0.8 ** kk * copyA * c01(since / 0.3), { s: 0.8 ** kk });
    }
  }

  // echo stack: the words repeated above and below, spreading out (T137 FROM CENTER, T010, T042)
  if (copies && has(mo, 'echo')) {
    const n = mo.echo ?? 3;
    const spread = outCubic(c01((since - 0.05) / 0.5));
    const step = (bh + size * 0.08) * spread;
    for (let i = n; i >= 1; i--) {
      const a = (0.62 * (1 - (i - 1) / n)) * copyA;
      blit(a, { dy: -i * step });
      blit(a, { dy: i * step });
    }
  }

  // light rays from behind the words (Kyrie / Heaven / a deity rise)
  if (copies && has(mo, 'rays')) {
    const a = c01(since / 0.5) * (1 - op);
    for (let i = 1; i <= 16; i++) blit(0.05 * a * balpha, { s: 1 + i * 0.045, filter: 'blur(3px)', op: 'lighter' });
  }

  // the long-exposure smear as the words wash away
  if (copies && kout === 'smear' && op > 0) for (let i = 1; i <= 12; i++) blit((0.18 * (1 - i / 13)) * (1 - op * 0.6), { dx: i * outCubic(op) * size * 0.35, filter: 'blur(2px)' });

  // drips of light running down from the letters (T045: shedding tears)
  if (copies && has(mo, 'drip')) {
    G.clearRect(0, 0, W, H);
    const grow = c01((since - 0.2) / 1.6);
    for (let x = Math.floor(box.x0); x < box.x1; x += 3) {
      const r = random(`dr${x}`);
      if (r < 0.55) continue;
      const len = size * (0.4 + 2.2 * random(`dl${x}`)) * grow * k;
      G.globalAlpha = 0.55;
      G.drawImage(Fc, x, box.y1 - size * 0.12, 3, size * 0.12, x, box.y1 - size * 0.12, 3, len);
    }
    G.globalCompositeOperation = 'destination-out';
    const gr = G.createLinearGradient(0, box.y1, 0, box.y1 + size * 2.6);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,1)');
    G.fillStyle = gr;
    G.fillRect(0, box.y1, W, H);
    G.globalCompositeOperation = 'source-over';
    blit(balpha, { src: Gc, filter: 'blur(1px)' });
  }

  // the window (ATOMIC RAP's GLOW / REWIND): the frame goes black but for the big word, the footage inside its
  // letters; the small words sit on the black
  if (look === 'window') {
    // the black comes with the big word (its letters land as the frame goes dark), never before it
    const heroBeat = beats[L.glyphs.find(g => g.hero)?.wi ?? 0] ?? first;
    const a = c01((t - (heroBeat - 0.04)) / 0.08) * (kout === 'dive' ? 1 - c01((op - 0.7) / 0.3) : 1 - op);
    V.save();
    V.fillStyle = `rgba(0,0,0,${(0.96 * a).toFixed(3)})`;
    V.fillRect(0, 0, W, H);
    V.globalCompositeOperation = 'destination-out';
    place(V);
    V.filter = bblur > 0.5 ? `blur(${bblur.toFixed(1)}px)` : 'none';
    V.drawImage(Hc, 0, 0);
    V.restore();
  }

  // 4. the words themselves: in pieces for the breaking exits, else whole with their shadow
  // a tight shadow for the edges and a wide one for the bright frames
  // outlines (and a cutout's outline over him) get a tight dark halo hugging the stroke, so a thin white line
  // reads on a bright frame
  const halo = L.look === 'outline' || L.look === 'cutout' ? 'drop-shadow(0 0 1.2px rgba(0,0,0,0.95)) drop-shadow(0 0 3.5px rgba(0,0,0,0.8)) ' : '';
  const shadow = w.flat
    ? 'none'
    : `${halo}drop-shadow(0 ${(size * 0.012).toFixed(1)}px ${(size * 0.025).toFixed(1)}px rgba(0,0,0,0.55)) drop-shadow(0 ${(size * 0.03).toFixed(1)}px ${(size * 0.12).toFixed(1)}px rgba(0,0,0,0.6))`;
  if (kout === 'shatter' && op > 0) {
    const e = outCubic(op);
    const cols = 5;
    const rowsN = 3;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rowsN; j++)
        for (const tri of [0, 1]) {
          const jx = (a: number, b: number) => [box.x0 - 10 + ((bw + 20) * (a + (random(`sx${a}${b}`) - 0.5) * 0.5 * (a > 0 && a < cols ? 1 : 0))) / cols, box.y0 - 10 + ((bh + 20) * (b + (random(`sy${a}${b}`) - 0.5) * 0.5 * (b > 0 && b < rowsN ? 1 : 0))) / rowsN];
          const pts = tri ? [jx(i, j), jx(i + 1, j), jx(i + 1, j + 1)] : [jx(i, j), jx(i + 1, j + 1), jx(i, j + 1)];
          const mx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
          const my = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
          const r = random(`sh${i}${j}${tri}`);
          const vx = (mx - L.cx) * (1.2 + r) * e;
          const vy = (my - L.cy) * (1.2 + r) * e + size * 1.2 * e * e;
          const rot = (r - 0.5) * 2.4 * e;
          V.save();
          place(V);
          V.translate(mx + vx, my + vy);
          V.rotate(rot);
          V.translate(-mx, -my);
          V.beginPath();
          V.moveTo(pts[0][0], pts[0][1]);
          V.lineTo(pts[1][0], pts[1][1]);
          V.lineTo(pts[2][0], pts[2][1]);
          V.closePath();
          V.clip();
          V.globalAlpha = (1 - c01((op - 0.35) / 0.65)) * balpha;
          V.drawImage(Fc, 0, 0);
          V.restore();
        }
    // the crack's flash
    if (op < 0.25) {
      V.save();
      V.globalAlpha = 1 - op / 0.25;
      V.globalCompositeOperation = 'lighter';
      blit(0.8, { filter: 'blur(6px)' });
      V.restore();
    }
  } else if (kout === 'split' && op > 0) {
    // the words cut along their middle, the halves sliding apart, a white slit flaring at the cut
    const e = outCubic(op);
    const mid = L.cy;
    for (const half of [-1, 1]) {
      V.save();
      place(V, 1, half * e * size * 1.4, half * e * size * 0.12);
      V.beginPath();
      if (half < 0) V.rect(0, 0, W, mid);
      else V.rect(0, mid, W, H - mid);
      V.clip();
      V.globalAlpha = (1 - c01((op - 0.5) / 0.5)) * balpha;
      V.filter = shadow;
      V.drawImage(Fc, 0, 0);
      V.restore();
    }
    V.save();
    V.globalAlpha = Math.sin(Math.PI * c01(op * 1.6));
    V.fillStyle = '#fff';
    V.shadowColor = 'rgba(255,255,255,0.9)';
    V.shadowBlur = 18;
    const half = (bw / 2 + size) * (0.4 + e);
    V.fillRect(L.cx - half, mid - 1.5, half * 2, 3);
    V.restore();
  } else {
    blit(balpha, { filter: [bblur > 0.5 ? `blur(${bblur.toFixed(1)}px)` : '', shadow === 'none' ? '' : shadow].join(' ').trim() || 'none' });
  }

  // the trembling ghost (they feel the dread / the old men tremble)
  if (copies && has(mo, 'tremble')) blit(0.3 * balpha, { dx: noise('gx', t * 22) * size * 0.05 * k, dy: noise('gy', t * 22) * size * 0.03 * k, filter: 'blur(1.5px)' });

  // glow: a soft white bloom, or a band of light sweeping across (the light / shining / silver)
  const glowAmt = (has(mo, 'glow') ? 0.55 : 0) + (mo.in === 'twinkle' || mo.in === 'decode' ? 0.25 : 0);
  if (copies && glowAmt > 0) blit(glowAmt * balpha * (1 - op), { filter: `blur(${(size * 0.09).toFixed(1)}px)`, op: 'lighter' });
  if (copies && has(mo, 'sweep')) {
    // a gleam: a slanted band of light crossing the letters, with a soft halo only where it is
    G.clearRect(0, 0, W, H);
    G.drawImage(Fc, 0, 0);
    const p = ((since - 0.15) / 0.9) % 1.5;
    const xs = lerp(box.x0 - size * 0.6, box.x1 + size * 0.6, c01(p));
    G.save();
    G.globalCompositeOperation = 'destination-in';
    const slant = bh * 0.35;
    const gr = G.createLinearGradient(xs - size * 0.28 - slant, box.y1, xs + size * 0.28 + slant, box.y0);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.5, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    G.fillStyle = gr;
    G.fillRect(0, 0, W, H);
    G.restore();
    if (p < 1) {
      blit(0.5 * balpha * (1 - op), { src: Gc, filter: `blur(${(size * 0.05).toFixed(1)}px)`, op: 'lighter' });
      blit(0.35 * balpha * (1 - op), { src: Gc, filter: `blur(${(size * 0.015).toFixed(1)}px)`, op: 'lighter' });
    }
  }

  // pulse: on each word's beat the words thrown outward once, like a sound wave (at the sound of my voice)
  if (copies && has(mo, 'pulse')) for (const b of beats) {
    const tau = t - b;
    if (tau < 0 || tau > 0.6) continue;
    blit(0.4 * (1 - tau / 0.6) * balpha, { s: 1 + tau * 0.55, filter: 'blur(1px)' });
  }
  // a slam's landing: a ring of the words thrown out
  if (copies && mo.in === 'slam') for (const b of beats) {
    const tau = t - b;
    if (tau < 0 || tau > 0.35) continue;
    blit(0.5 * (1 - tau / 0.35) * balpha, { s: 1 + tau * 1.1, filter: 'blur(2px)' });
  }

  // 5. particles: dust and ash breaking off, embers rising, or the dust gathering into the words
  const dustOut = kout === 'dust' || kout === 'burn';
  if (marks && (dustOut || formIn || has(mo, 'embers'))) {
    const P = pointsOf(w, L);
    V.save();
    place(V);
    V.fillStyle = '#ffffff';
    const up = kout === 'burn';
    for (let i = 0; i < P.n; i++) {
      const x = P.x[i];
      const y = P.y[i];
      const r1 = random(`p1${i}`);
      const r2 = random(`p2${i}`);
      const r3 = random(`p3${i}`);
      if (dustOut) {
        const born = up ? oStart + od * 0.75 * c01((box.y1 - y) / Math.max(1, bh)) : oStart + od * 0.7 * c01((x - box.x0) / Math.max(1, bw));
        const tau = t - born;
        if (tau < 0) continue;
        const lifeP = 0.5 + r3 * 0.6;
        if (tau > lifeP) continue;
        const px = x + (up ? (r1 - 0.5) * size * 0.4 * tau : size * (0.6 + r1 * 1.6) * tau + size * 0.8 * tau * tau);
        const py = y + (up ? -size * (0.5 + r2 * 1.4) * tau : (r2 - 0.62) * size * 1.1 * tau);
        V.globalAlpha = (1 - tau / lifeP) * 0.9 * balpha;
        const ps = 1.2 + r3 * 2.4;
        V.fillRect(px, py, ps, ps);
      }
      if (formIn) {
        const arrive = fIn + 0.25 + IN.form.dur * 0.75 * c01((x - box.x0) / Math.max(1, bw));
        const tau = arrive - t;
        if (tau < 0 || tau > 0.9) continue;
        const px = x - size * (0.5 + r1 * 1.8) * tau - size * 0.6 * tau * tau;
        const py = y + (r2 - 0.5) * size * 1.2 * tau;
        V.globalAlpha = (1 - tau / 0.9) * 0.85 * balpha;
        const ps = 1.2 + r3 * 2.2;
        V.fillRect(px, py, ps, ps);
      }
      if (has(mo, 'embers') && r1 < 0.08) {
        const cyc = 1.1 + r2;
        const tau = ((t + r3 * cyc) % cyc) / cyc;
        const px = x + Math.sin(tau * 6 + r1 * 40) * size * 0.08;
        const py = y - tau * size * 1.6;
        V.globalAlpha = Math.sin(Math.PI * tau) * 0.8 * balpha * (1 - op);
        V.fillRect(px, py, 2.2, 2.2);
      }
    }
    V.restore();
  }

  // 6. marks: the crosshair locking on (Bounty), the stars' glints, the architect's guides
  if (marks && has(mo, 'target')) {
    const lock = first + 0.05;
    const p = outCubic(c01((t - Math.max(w.from, lock - 0.5)) / 0.55));
    const jit = (1 - p) * size * 0.06;
    const ox = noise('tg', t * 14) * jit;
    const oy = noise('th', t * 14) * jit;
    const m = lerp(size * 1.2, size * 0.22, p);
    const x0 = box.x0 - m + ox;
    const x1 = box.x1 + m + ox;
    const y0 = box.y0 - m + oy;
    const y1 = box.y1 + m + oy;
    const arm = Math.min(bw, bh) * 0.3 + size * 0.12;
    V.save();
    V.strokeStyle = '#fff';
    V.lineWidth = 4.5;
    V.globalAlpha = c01(since / 0.15) * (1 - op);
    V.shadowColor = 'rgba(0,0,0,0.75)';
    V.shadowBlur = 10;
    // the scope's ring closing on the word
    V.beginPath();
    V.arc((x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) * lerp(0.75, 0.56, p), 0, Math.PI * 2);
    V.lineWidth = 3;
    V.stroke();
    V.lineWidth = 4.5;
    V.beginPath();
    for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
      V.moveTo(cx, cy + sy * arm);
      V.lineTo(cx, cy);
      V.lineTo(cx + sx * arm, cy);
    }
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    V.moveTo(mx, y0 - size * 0.5);
    V.lineTo(mx, y0 - size * 0.12);
    V.moveTo(mx, y1 + size * 0.12);
    V.lineTo(mx, y1 + size * 0.5);
    V.moveTo(x0 - size * 0.5, my);
    V.lineTo(x0 - size * 0.12, my);
    V.moveTo(x1 + size * 0.12, my);
    V.lineTo(x1 + size * 0.5, my);
    V.stroke();
    if (p >= 1 && t - lock < 0.3) {
      V.globalAlpha = 1 - (t - lock) / 0.3;
      V.lineWidth = 5;
      V.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }
    V.restore();
  }
  if (marks && (mo.in === 'twinkle' || has(mo, 'stars'))) {
    V.save();
    V.globalCompositeOperation = 'lighter';
    for (const g of L.glyphs) {
      const t0 = inStart(w, L, g, beats, mo.in === 'twinkle' ? 'twinkle' : 'rise');
      const tau = t - t0;
      const dur = 0.45;
      if (tau < 0 || tau > dur) continue;
      const a = Math.sin(Math.PI * (tau / dur));
      const r = g.capH * (0.35 + 0.35 * random(`st${g.gi}`)) * a;
      const sx = g.x + (random(`sx${g.gi}`) - 0.3) * g.adv * 0.6;
      const sy = g.y - g.capH * (0.6 + 0.5 * random(`sy${g.gi}`));
      V.translate(sx, sy);
      V.rotate(tau * 2);
      const gr = V.createRadialGradient(0, 0, 0, 0, 0, r * 0.4);
      gr.addColorStop(0, `rgba(255,255,255,${a})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      V.fillStyle = gr;
      V.fillRect(-r, -r, r * 2, r * 2);
      V.fillStyle = `rgba(255,255,255,${(0.9 * a).toFixed(3)})`;
      V.fillRect(-r, -1.2, r * 2, 2.4);
      V.fillRect(-1.2, -r, 2.4, r * 2);
      V.setTransform(1, 0, 0, 1, 0, 0);
    }
    V.restore();
  }
  if (marks && mo.in === 'build') {
    // the architect's guide lines, drawn across and fading as the letters fill
    V.save();
    V.strokeStyle = '#fff';
    V.lineWidth = 1.5;
    for (const r of L.rows) {
      const p = outCubic(c01((t - Math.max(w.from, first - 0.1)) / 0.5));
      const fade = 1 - c01((t - first - 0.5) / 0.6);
      V.globalAlpha = 0.7 * fade * (1 - op);
      const ext = (r.w / 2 + size * 0.6) * p;
      const mx = r.x0 + r.w / 2;
      V.beginPath();
      for (const yy of [r.y, r.y - r.capH]) {
        V.moveTo(mx - ext, yy);
        V.lineTo(mx + ext, yy);
      }
      V.moveTo(r.x0 - size * 0.1, r.y - r.capH - size * 0.3 * p);
      V.lineTo(r.x0 - size * 0.1, r.y + size * 0.3 * p);
      V.moveTo(r.x0 + r.w + size * 0.1, r.y - r.capH - size * 0.3 * p);
      V.lineTo(r.x0 + r.w + size * 0.1, r.y + size * 0.3 * p);
      V.stroke();
    }
    V.restore();
  }
  // the old TV's scan lines over the words
  if (has(mo, 'flicker')) {
    V.save();
    V.globalCompositeOperation = 'destination-out';
    V.fillStyle = 'rgba(0,0,0,0.45)';
    const roll = (t * 40) % 4;
    for (let y = Math.floor(box.y0 - size * 0.4) + roll; y < box.y1 + size * 0.4; y += 4) V.fillRect(0, y, W, 1.6);
    V.restore();
  }
};

// ---------------------------------------------------------------- the footage under the words

/** the camera move a caption gives the footage under it, by default from its motion and tier */
const bgOf = (w: Words): Bg[] => {
  if (w.bg) return w.bg;
  const mo = w.mo ?? {};
  const out: Bg[] = [];
  switch (mo.in) {
    case 'slam':
    case 'drop':
    case 'stretch':
    case 'pop':
      out.push('punch');
      break;
    case 'throw':
      out.push('shake', 'punch');
      break;
    case 'spin':
      out.push('roll', 'punch');
      break;
    case 'focus':
    case 'decode':
    case 'twinkle':
      out.push('focus');
      break;
    case 'creep':
    case 'descend':
    case 'drift':
      out.push('pull');
      break;
    default:
      out.push('push');
  }
  if ((mo.hold ?? []).some(h => h === 'tremble' || h === 'shake')) out.push('shake');
  // (never dimmed or defocused to make the words read: rev-002)
  if (mo.out === 'dive') out.push('zoom');
  return out;
};

export type BgMove = { s: number; x: number; y: number; rot: number; blur: number; bright: number };

/** the footage's camera at t from the caption on screen: punches on the words' beats, shake, focus pulls,
 *  pushes and pulls, a roll, dimming under a giant word, a zoom into a dive */
export const bgAt = (words: Words[], t: number): BgMove | null => {
  let w: Words | undefined;
  for (const x of words) if (x.style === 'stack' && x.mo && t >= x.from && t <= x.to && (!w || x.from > w.from)) w = x;
  if (!w) return null;
  const beats = w.beats?.length ? w.beats : [w.from];
  const life = Math.max(0.2, w.to - w.from);
  const p = c01((t - w.from) / life);
  const m: BgMove = { s: 1, x: 0, y: 0, rot: 0, blur: 0, bright: 1 };
  let hit = 0;
  for (const b of beats) if (t >= b && t < b + 0.5) hit = Math.max(hit, Math.exp(-(t - b) * 9));
  for (const b of bgOf(w)) {
    switch (b) {
      case 'punch':
        m.s *= 1 + 0.055 * hit;
        m.blur += 2.5 * hit;
        break;
      case 'shake': {
        const amp = H * 0.009 * (0.35 + hit);
        m.x += noise('bgx', t * 30) * amp;
        m.y += noise('bgy', t * 30) * amp;
        m.rot += noise('bgr', t * 18) * 0.004 * (0.4 + hit);
        m.s *= 1.025;
        break;
      }
      case 'focus':
        // racked into focus as the first word lands
        m.blur += 9 * (1 - c01((t - w.from) / Math.max(0.2, beats[0] - w.from + 0.3)));
        break;
      case 'defocus':
        // the footage falls out of focus behind a giant word, and back as it leaves
        m.blur += 5 * c01((t - beats[0]) / 0.25) * (1 - c01((t - (w.to - 0.2)) / 0.2));
        break;
      case 'push':
        m.s *= 1 + 0.06 * inOut(p);
        break;
      case 'pull':
        m.s *= 1.07 - 0.06 * inOut(p);
        break;
      case 'roll':
        m.rot += (-0.014 + 0.028 * inOut(p)) * (hit > 0 ? 1.4 : 1);
        m.s *= 1.04;
        break;
      case 'dim':
        m.bright *= 1 - 0.3 * c01((t - beats[0] + 0.1) / 0.2) * (1 - c01((t - (w.to - 0.15)) / 0.15));
        break;
      case 'flash':
        m.bright += 0.5 * hit;
        break;
      case 'zoom':
        m.s *= 1 + 0.3 * inCubic(c01((t - (w.to - 0.4)) / 0.4));
        m.blur += 6 * inCubic(c01((t - (w.to - 0.3)) / 0.3));
        break;
      default:
        break;
    }
  }
  return m;
};
