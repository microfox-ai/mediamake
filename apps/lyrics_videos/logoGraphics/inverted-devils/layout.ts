/**
 * The lockup in frame pixels, built from ./glyphs.json (made by tools/glyphs.py).
 * Proportions follow the channel logo: INVERTED in Bebas Neue with a little tracking,
 * "Devils" in Calligraffitti (bolded with a stroke, as in the logo) just under it,
 * about as wide, nudged left.
 */
import data from './glyphs.json';
import { H, W } from './theme';

type RawGlyph = { ch: string; d: string; x: number; adv: number; bbox: number[] };
type RawWord = {
  upm: number;
  cap: number;
  width: number;
  glyphs: RawGlyph[];
  pen?: { letter: string; pts: number[][] }[];
  dot?: number[];
};
const RAW = data as unknown as Record<'INVERTED' | 'Devils', RawWord>;

export type Glyph = {
  ch: string;
  d: string;
  /** SVG transform from font units to frame pixels */
  tf: string;
  /** frame-pixel box */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  cx: number;
  cy: number;
  /** pen x (left edge of the advance) and baseline, in px */
  ox: number;
  base: number;
  s: number;
};

const INV_TRACK = 70; // font units between letters
const INV_WIDTH = 1010; // px, visible width of INVERTED
const DEV_RATIO = 0.98; // Devils width / INVERTED width
/** stroke added to the script so it is as heavy as the logo's (font units) */
export const DEV_BOLD = 54;

const inv = RAW.INVERTED;
const invSpan = (() => {
  const g = inv.glyphs;
  const last = g[g.length - 1];
  const left = g[0].bbox[0];
  const right = last.x + (g.length - 1) * INV_TRACK + last.bbox[2];
  return { left, right };
})();
const s1 = INV_WIDTH / (invSpan.right - invSpan.left);
const capPx = inv.cap * s1;

const dev = RAW.Devils;
const devBox = (() => {
  const g = dev.glyphs;
  const xs = g.flatMap(q => [q.x + q.bbox[0], q.x + q.bbox[2]]);
  const ys = g.flatMap(q => [q.bbox[1], q.bbox[3]]);
  return { left: Math.min(...xs) - DEV_BOLD / 2, right: Math.max(...xs) + DEV_BOLD / 2, bottom: Math.min(...ys) - DEV_BOLD / 2, top: Math.max(...ys) + DEV_BOLD / 2 };
})();
const s2 = (INV_WIDTH * DEV_RATIO) / (devBox.right - devBox.left);
const devTopToBase = devBox.top * s2;
const devHeight = (devBox.top - devBox.bottom) * s2;

// vertical stack: INVERTED cap, gap, Devils (top of its tallest stroke to its lowest)
const GAP = capPx * 0.3;
const blockH = capPx + GAP + devHeight;
const top = H / 2 - blockH / 2 - 10;
const invBase = top + capPx;
const devBase = invBase + GAP + devTopToBase;
const invLeft = W / 2 - INV_WIDTH / 2 - invSpan.left * s1;
const devLeft = W / 2 - (INV_WIDTH * DEV_RATIO) / 2 - devBox.left * s2 - INV_WIDTH * 0.015;

const place = (g: RawGlyph, x: number, base: number, s: number): Glyph => {
  const [bx0, by0, bx1, by1] = g.bbox;
  const x0 = x + bx0 * s;
  const x1 = x + bx1 * s;
  const y0 = base - by1 * s;
  const y1 = base - by0 * s;
  return {
    ch: g.ch,
    d: g.d,
    tf: `translate(${x} ${base}) scale(${s} ${-s})`,
    x0,
    x1,
    y0,
    y1,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    ox: x,
    base,
    s,
  };
};

export const INV = {
  s: s1,
  cap: capPx,
  base: invBase,
  top: invBase - capPx,
  mid: invBase - capPx / 2,
  glyphs: inv.glyphs.map((g, i) => place(g, invLeft + (g.x + i * INV_TRACK) * s1, invBase, s1)),
  x0: W / 2 - INV_WIDTH / 2,
  x1: W / 2 + INV_WIDTH / 2,
};

/** Font units of the script word → frame px. */
export const devPx = (x: number, y: number): [number, number] => [devLeft + x * s2, devBase - y * s2];

export const DEV = {
  s: s2,
  base: devBase,
  top: devBase - devBox.top * s2,
  bottom: devBase - devBox.bottom * s2,
  x0: devLeft + devBox.left * s2,
  x1: devLeft + devBox.right * s2,
  /** transform for the whole word (glyph d's are placed with translate(g.x 0) inside it) */
  tf: `translate(${devLeft} ${devBase}) scale(${s2} ${-s2})`,
  glyphs: dev.glyphs.map(g => ({ ...place(g, devLeft + g.x * s2, devBase, s2), ux: g.x })),
  /** pen strokes in writing order (font units, word space) */
  pen: (dev.pen ?? []).map(p => {
    const pts = p.pts.map(([x, y]) => [x, y] as [number, number]);
    let len = 0;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      cum.push(len);
    }
    return { letter: p.letter, pts, len, cum, d: `M${pts.map(q => q.join(' ')).join(' L')}` };
  }),
  dot: (dev.dot ?? [0, 0]) as [number, number],
  mid: 0,
};
DEV.mid = (DEV.top + DEV.bottom) / 2;

/** Whole lockup bounds, px. */
export const BOX = {
  x0: Math.min(INV.x0, DEV.x0),
  x1: Math.max(INV.x1, DEV.x1),
  y0: INV.top,
  y1: DEV.bottom,
  cx: W / 2,
  cy: (INV.top + DEV.bottom) / 2,
};
