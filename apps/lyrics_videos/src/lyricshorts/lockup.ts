/**
 * Lockups: a line set over the whole footage (CapSpec, no mask). Its highlight word is set big and centred;
 * the words before it are nested above the x-height, in the widest gap between the letters that rise
 * (ascenders), and the words after it under the baseline, in the widest gap between the letters that drop
 * (descenders) — next to those letters, never across them (user, 2026-10-28: "small words above or below
 * at the correct places where it does not cross the letter … but sits next to it"). Where no gap holds
 * them, the small words sit above or below the whole word, flush with its edge.
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

type Ink = { x0: number; x1: number; y0: number; y1: number };

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
    if (b.x2 > b.x1) inks.push({ x0: b.x1, x1: b.x2, y0: b.y1, y1: b.y2 });
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

/** the free stretches of [left, right] beside the glyphs that `blocked` picks, `pad` away from them */
const gapsBeside = (inks: Ink[], left: number, right: number, blocked: (k: Ink) => boolean, pad: number) => {
  const out: { x0: number; x1: number }[] = [];
  let x = left;
  for (const k of inks.filter(blocked).sort((a, b) => a.x0 - b.x0)) {
    if (k.x0 - pad > x) out.push({ x0: x, x1: k.x0 - pad });
    x = Math.max(x, k.x1 + pad);
  }
  if (right > x) out.push({ x0: x, x1: right });
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
  const s0 = Math.max(62, Math.min(104, S * 0.27));
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
    let size = s0;
    let line = setLine(small, texts, size, tracking, 0, 0);
    const width = () => line.ink.right - line.ink.left;
    const gaps =
      side === 'above'
        ? gapsBeside(big.inks, L, R, k => k.y0 < xTop - tol, pad) // beside the letters that rise above the x-height
        : gapsBeside(big.inks, L, R, k => k.y1 > tol, pad); // beside the letters that drop under the baseline
    // the words before read first: the leftmost gap that holds them; the words after: the rightmost
    const order = side === 'above' ? gaps : [...gaps].reverse();
    let g = order.find(q => q.x1 - q.x0 >= width());
    if (!g) {
      // a little smaller still nests
      const widest = gaps.reduce<{ x0: number; x1: number } | undefined>((a, q) => (!a || q.x1 - q.x0 > a.x1 - a.x0 ? q : a), undefined);
      if (widest && (widest.x1 - widest.x0) / width() >= 0.78) {
        size *= (widest.x1 - widest.x0) / width();
        line = setLine(small, texts, size, tracking, 0, 0);
        g = widest;
      }
    }
    let x: number;
    let y: number;
    if (g) {
      // grow into the gap (user, 2026-10-28, on the "absolve" lockup: the word before it "can be a bit bigger,
      // as there is still space until b"): as wide as the gap, but no taller than half again the band
      // beside the letters that rise (or drop) and under half the highlight's size, so it stays the small word
      const band = side === 'above' ? xTop - big.ink.top : Math.max(big.ink.bottom, 0.18 * S);
      const inkH = () => line.ink.bottom - line.ink.top;
      const grow = Math.min((g.x1 - g.x0) / width(), (1.6 * band) / inkH(), (0.45 * S) / size, 1.8);
      if (grow > 1.02) {
        size *= grow * 0.98;
        line = setLine(small, texts, size, tracking, 0, 0);
      }
      // above: flush left in a leading gap, else right after the letter that rises; below: flush right in
      // a trailing gap, else right after the letter that drops
      const leading = Math.abs(g.x0 - L) < 1;
      const trailing = Math.abs(g.x1 - R) < 1;
      x = side === 'above' ? (leading ? g.x0 : g.x0) : trailing ? g.x1 - width() : g.x0;
      // the small words' ink sits `air` above the x-height (or below the baseline)
      y = side === 'above' ? xTop - air - line.ink.bottom : air - line.ink.top;
      where.push(`${side} nested`);
    } else {
      // over (or under) the whole word, flush with its edge
      if (width() > R - L) {
        size *= (R - L) / width();
        line = setLine(small, texts, size, tracking, 0, 0);
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
  // under the faces (framing puts the eye line on the upper third), over them, or mid-frame; clear of the
  // Shorts caption and buttons at the bottom
  const centre = { low: 0.68, mid: 0.5, high: 0.24 }[cap.place] * H;
  let dy = centre - (box.top + box.bottom) / 2;
  dy = Math.min(dy, 0.82 * H - box.bottom);
  dy = Math.max(dy, 0.08 * H - box.top);
  return { words, box, dy, size: S, small: s0, where: where.join(', ') || 'alone' };
};
