/**
 * Lockups: a line set over the whole footage (CapSpec, no mask). Its highlight word is set big and centred;
 * the words before it fit into the band above the x-height and the words after it into the band under the
 * baseline, where the highlight has letters that reach past those rule lines (t, d, b, l, h, k and the dots
 * of i and j above; g, p, q, y, j below). They nest in a gap of that band and grow into it, never
 * crossing a letter: between two of those letters first (between the t and the d), else after the last
 * one (after a lone t), else before the first (the user, 2026-10-28: "sits next to it", and 2026-11-27:
 * "they fit into the extended gaps … if small words appear top then they fit in between t & d, or after t
 * (if only t exists)"). With no such letter, or no gap that holds them, they sit over (or under)
 * the whole word, flush with its edge ("anywhere that suits visual alignment").
 *
 * Paths from the font's outlines, like the stacks (layout.ts). Pure: Node can print a lockup.
 */
import opentype, { type Font } from 'opentype.js';
import { caseOf, type TypeStyle } from './layout.ts';
import type { ResolvedCap } from './spec.ts';

export type LockupBox = { left: number; right: number; top: number; bottom: number };
export type LockupWord = { word: number; path: string; box: LockupBox; big: boolean };
/** paths on a baseline at y = 0; draw them moved down by `dy` */
export type Lockup = { words: LockupWord[]; box: LockupBox; dy: number; size: number; small: number; where: string };

/** a glyph's ink; `dot`: an i or j, whose only part over the x-height is its dot */
type Ink = { x0: number; x1: number; y0: number; y1: number; dot?: boolean };

/** a word glyph by glyph (kerning, tracking) with its pen at (x, y): its path and each glyph's ink */
const setWord = (font: Font, text: string, size: number, tracking: number, x: number, y: number) => {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  const path = new opentype.Path();
  const inks: Ink[] = [];
  let pen = x;
  glyphs.forEach((g, i) => {
    if (i) pen += font.getKerningValue(glyphs[i - 1], g) * scale;
    const gp = g.getPath(pen, y, size);
    const b = gp.getBoundingBox();
    if (b.x2 > b.x1) inks.push({ x0: b.x1, x1: b.x2, y0: b.y1, y1: b.y2, dot: /^[ij]$/.test(String.fromCodePoint(g.unicode ?? 0)) });
    path.extend(gp);
    pen += g.advanceWidth! * scale + tracking * size;
  });
  const b = path.getBoundingBox();
  return { path, inks, advance: pen - x - tracking * size, ink: { left: b.x1, right: b.x2, top: b.y1, bottom: b.y2 } };
};

/** small words on one line from (x, y): a path and an ink box each, and the line's ink */
const setLine = (font: Font, texts: string[], size: number, tracking: number, x: number, y: number) => {
  const space = font.charToGlyph(' ').advanceWidth! * (size / font.unitsPerEm);
  let pen = x;
  const words = texts.map(t => {
    const w = setWord(font, t, size, tracking, pen, y);
    pen += w.advance + space + tracking * size;
    return w;
  });
  const ink = {
    left: Math.min(...words.map(w => w.ink.left)),
    right: Math.max(...words.map(w => w.ink.right)),
    top: Math.min(...words.map(w => w.ink.top)),
    bottom: Math.max(...words.map(w => w.ink.bottom)),
  };
  return { words, ink };
};

/** a stretch of the band beside the letters that reach into it: between two of them, after the last, or
 *  before the first */
type Gap = { x0: number; x1: number; kind: 'between' | 'after' | 'before'; afterDot?: boolean };

/** the free stretches of [left, right] beside the glyphs `reach` (the letters past the rule line), `pad`
 *  away from them (`dotPad` from the dot of an i or j: small words right beside a dot read as a bullet);
 *  none when no letter reaches past it */
const gapsBeside = (reach: Ink[], left: number, right: number, pad: number, dotPad: number): Gap[] => {
  const ks = [...reach].sort((a, b) => a.x0 - b.x0);
  if (!ks.length) return [];
  const p = (k: Ink) => (k.dot ? dotPad : pad);
  const out: Gap[] = [];
  if (ks[0].x0 - p(ks[0]) > left) out.push({ x0: left, x1: ks[0].x0 - p(ks[0]), kind: 'before' });
  let x = ks[0].x1 + p(ks[0]);
  for (const k of ks.slice(1)) {
    if (k.x0 - p(k) > x) out.push({ x0: x, x1: k.x0 - p(k), kind: 'between' });
    x = Math.max(x, k.x1 + p(k));
  }
  if (right > x) out.push({ x0: x, x1: right, kind: 'after', afterDot: ks[ks.length - 1].dot });
  return out;
};

const clean = (s: string) => s.replace(/[.,!?;:"“”]+$/g, '').replace(/^["'“‘]+/, '');

/**
 * `font` sets the highlight word, `small` the rest (a lighter weight of the same face reads best). The
 * highlight runs the frame's width less the margins, its capitals at most `maxCap` of the height; the
 * small words are about a quarter of its size (never under 62 px on a 1080-wide frame: smaller is hard to read on a phone).
 */
export const solveLockup = (cap: ResolvedCap, font: Font, small: Font, st: Pick<TypeStyle, 'tracking' | 'case'>, W: number, H: number, maxCap = 0.2): Lockup => {
  const text = (i: number) => caseOf(clean(cap.words[i].text), st.case);
  const upm = font.unitsPerEm;
  const os2 = font.tables.os2 as { sxHeight?: number; sCapHeight?: number } | undefined;
  const xH = (os2?.sxHeight || font.charToGlyph('x').getBoundingBox().y2 || 500) / upm;
  const capH = (os2?.sCapHeight || font.charToGlyph('H').getBoundingBox().y2 || 700) / upm;
  const margin = 0.08 * W;
  const ref = setWord(font, text(cap.hi), 1000, st.tracking, 0, 0);
  const S = Math.min(((W - 2 * margin) / (ref.ink.right - ref.ink.left)) * 1000, (maxCap * H) / capH);
  const s0 = Math.max((62 * W) / 1080, Math.min((104 * W) / 1080, S * 0.27));
  const probe = setWord(font, text(cap.hi), S, st.tracking, 0, 0);
  const big = setWord(font, text(cap.hi), S, st.tracking, (W - (probe.ink.right - probe.ink.left)) / 2 - probe.ink.left, 0);
  const L = big.ink.left;
  const R = big.ink.right;
  const pad = 0.06 * S;
  const air = 0.07 * S;
  const xTop = -xH * S;
  const tol = 0.035 * S;
  const words: LockupWord[] = [{ word: cap.hi, path: big.path.toPathData(2), box: big.ink, big: true }];
  const where: string[] = [];

  const placeSmall = (idx: number[], side: 'above' | 'below') => {
    if (!idx.length) return;
    const texts = idx.map(text);
    const tracking = 0.01;
    const at = (sz: number) => setLine(small, texts, sz, tracking, 0, 0);
    let size = s0;
    let line = at(size);
    const width = () => line.ink.right - line.ink.left;
    // the letters that reach past the rule line: above the x-height (t, d, b, l, h, k, the dots of i and j),
    // or under the baseline (g, p, q, y, j)
    const reach = big.inks.filter(k => (side === 'above' ? k.y0 < xTop - tol : k.y1 > tol));
    const gaps = gapsBeside(reach, L, R, pad, 0.14 * S);
    // the band beside those letters: above, from the x-height to the top of the word; below, under the baseline
    const band = side === 'above' ? xTop - big.ink.top : Math.max(big.ink.bottom, 0.18 * S);
    // how big the small words are in a gap (0: they don't fit): at their size, or a little smaller (to 0.78 of
    // it); then they grow into the gap (user, 2026-10-28, on the "absolve" lockup: the word before it "can be
    // a bit bigger, as there is still space until b") — as wide as the gap, no taller than half again the
    // band and under half the highlight's size, so they stay the small words
    const w0 = width();
    const sizeIn = (g: Gap) => {
      const gw = g.x1 - g.x0;
      if (w0 > gw && gw / w0 < 0.78) return 0;
      const sz = w0 > gw ? (s0 * gw) / w0 : s0;
      const ln = at(sz);
      const grow = Math.min(gw / (ln.ink.right - ln.ink.left), (1.6 * band) / (ln.ink.bottom - ln.ink.top), (0.45 * S) / sz, 1.8);
      return grow > 1.02 ? sz * grow * 0.98 : sz;
    };
    // between two such letters first, else after the last, else before the first; the biggest fit of the kind
    let pick: { g: Gap; size: number } | undefined;
    for (const kind of ['between', 'after', 'before'] as const) {
      const fits = gaps.filter(g => g.kind === kind).map(g => ({ g, size: sizeIn(g) })).filter(o => o.size > 0);
      if (fits.length) {
        pick = fits.reduce((a, o) => (o.size > a.size ? o : a));
        break;
      }
    }
    let x: number;
    let y: number;
    if (pick) {
      const { g } = pick;
      size = pick.size;
      line = at(size);
      // between two letters: centred between them; after one: right after it (centred in the gap after a lone
      // dot of an i, which would read as a bullet); before the first: flush with the word's edge
      x = g.kind === 'between' || g.afterDot ? (g.x0 + g.x1 - width()) / 2 : g.x0;
      // the small words' ink sits `air` above the x-height (or below the baseline)
      y = side === 'above' ? xTop - air - line.ink.bottom : air - line.ink.top;
      where.push(`${side} ${g.kind === 'between' ? `between the letters that ${side === 'above' ? 'rise' : 'drop'}` : `${g.kind} the letter that ${side === 'above' ? 'rises' : 'drops'}`}`);
    } else {
      // no such letter, or no gap holds them: over (or under) the whole word, flush with its edge
      if (width() > R - L) {
        size *= (R - L) / width();
        line = at(size);
      }
      x = side === 'above' ? L : R - width();
      y = side === 'above' ? big.ink.top - air - line.ink.bottom : big.ink.bottom + air - line.ink.top;
      where.push(side);
    }
    const placed = setLine(small, texts, size, tracking, x - line.ink.left, y);
    placed.words.forEach((w, i) => words.push({ word: idx[i], path: w.path.toPathData(2), box: w.ink, big: false }));
  };

  const n = cap.words.length;
  placeSmall(Array.from({ length: cap.hi }, (_, i) => i), 'above');
  placeSmall(Array.from({ length: n - cap.hi - 1 }, (_, i) => cap.hi + 1 + i), 'below');

  const box = {
    left: Math.min(...words.map(w => w.box.left)),
    right: Math.max(...words.map(w => w.box.right)),
    top: Math.min(...words.map(w => w.box.top)),
    bottom: Math.max(...words.map(w => w.box.bottom)),
  };
  // 'auto' sits low until framing.ts placeCaps has looked at the faces under it
  return { words, box, dy: dyAt(box, cap.place === 'auto' ? 'low' : cap.place, H), size: S, small: s0, where: where.join(', ') || 'alone' };
};

export type Place = 'low' | 'mid' | 'high';

/** how far a lockup moves down to sit `place`: under the faces (framing puts the eye line on the upper third),
 *  over them, or mid-frame; clear of the Shorts caption and buttons at the bottom */
export const dyAt = (box: LockupBox, place: Place, H: number) => {
  const centre = { low: 0.68, mid: 0.5, high: 0.24 }[place] * H;
  let dy = centre - (box.top + box.bottom) / 2;
  dy = Math.min(dy, 0.82 * H - box.bottom);
  return Math.max(dy, 0.08 * H - box.top);
};
