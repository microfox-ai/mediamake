/**
 * Full-frame stacks, set from the font's own outlines (opentype.js). A screen's words fill the frame
 * top to bottom: every row runs exactly the column's width, and the letters are stretched taller (or
 * squashed a little) so the rows fill the height exactly. Without rows by hand, the layout tries every
 * way to break the words into rows (one word a row preferred, a word set vertically down a side when
 * that fits better) and keeps the one that needs the least stretch.
 *
 * Paths, not text: Chrome stops drawing text past ~15 000 px, and a dive scales a letter that far.
 * `solveStack` is pure (Node can print layouts); `layoutStack` adds the dive points (needs a canvas).
 */
import opentype, { type Font } from 'opentype.js';
import type { Fill, Mark, ResolvedStack } from './spec';

export type TypeStyle = {
  /** the face as a TTF/OTF, a static path under projects/ (npm run lyric-shorts -- <slug> font <Family> --weight=900) */
  font: string;
  /** the small words of a lockup (CapSpec): a lighter weight of the face, a static path like `font` */
  small?: string;
  /** letter spacing in em (negative = tighter) */
  tracking: number;
  case: 'lower' | 'upper' | 'as-is';
  /** margins: left/right (fraction of the width), the stack's top and bottom (fractions of the height) */
  margin: number;
  top: number;
  bottom: number;
  /** gap between rows (and beside a vertical word), fraction of the width */
  gap: number;
  /** how far the letters may be stretched taller / squashed to fill the height: [1, 1] keeps the
   *  font's own proportions (the user's choice since v6: "the fonts appear stretched, don't do that") */
  stretch: [number, number];
  /** spread spare height into the gaps (true) or keep tight gaps and centre the stack (false) */
  spread?: boolean;
  /** at most this many words in a row (one is preferred) */
  maxWords: number;
  /** may the layout set a word vertically down a side when that fills better */
  vertical: boolean;
  /** rows set smaller than this font size (fraction of the width) cost the layout; a vertical word
   *  smaller than `minVertical` costs it more (it reads as a thin label, not a word) */
  minSize: number;
  minVertical: number;
  /** words set down the frame in columns, read with the head tilted: hard to read (user, s02/s03: "too
   *  many vertical wording shots … can't read it"), so a few a short at most (`max`, hand-set ones
   *  count), only for lines sung in `maxSpan` seconds or less with at most `maxWords` words, and only
   *  where rows would fill less than `belowFill` of the frame */
  columns?: { max: number; maxWords: number; maxSpan: number; belowFill: number };
  /** how much the layout weighs dark time (a row's share of the frame × how long it waits to be sung) */
  darkWeight: number;
  /** rows smaller than this font size (fraction of the width) are solid: too thin to see footage through */
  minMask: number;
  /** black words over the whole footage, flipping to the mask mid-line (user, s02/s03 v2: "when there are
   *  too many words you can show it in reverse like text is black … when the line is reaching midpoint,
   *  since most of the screen becomes filled, you can transit to mask style again"): screens of at least
   *  `minWords` words, flipping once `lit` of the stack's ink is lit, if that leaves `minHold` seconds of
   *  black words (a shorter spell just blinks). Over footage darker than `white` (mean luma 0–255 of the
   *  shot under the spell, default 100) the words are white (user: "sometimes white text is also fine,
   *  depends on what is visible on the video") */
  reverse?: { minWords: number; lit: number; minHold: number; white?: number };
};

export type Box = { left: number; right: number; top: number; bottom: number };

export type RowLayout = {
  /** indices into the stack's words, and one path per word, in frame pixels */
  words: number[];
  paths: string[];
  /** down a side: turned to read bottom to top ('up') or top to bottom ('down'), or standing ('upright') */
  vertical: false | 'up' | 'down' | 'upright';
  /** font size before the stretch */
  size: number;
  fill: Fill;
  /** made solid by hand (a mark or a row's fill), so it takes the theme's solid colour, not the ink */
  solidByHand: boolean;
  color?: string;
  /** song seconds */
  reveal?: number;
} & Box & {
    /** where to dive into this row and how far from it the nearest edge of the letter is (px) */
    dive: { x: number; y: number; r: number };
  };

export type StackLayout = {
  rows: RowLayout[];
  stretch: number;
  score: number;
  throughRow: number;
  intoRow: number;
  label: string;
  /** song seconds: black words over the whole footage before it, the mask after; undefined: the mask throughout */
  flip?: number;
};

export const caseOf = (text: string, c: TypeStyle['case']) => (c === 'lower' ? text.toLowerCase() : c === 'upper' ? text.toUpperCase() : text);

export const loadFont = async (url: string): Promise<Font> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`lyric short: no font at ${url} (npm run lyric-shorts -- <slug> font <Family> --weight=900)`);
  return opentype.parse(await res.arrayBuffer());
};

type Pt = (x: number, y: number) => [number, number];

/** sets words glyph by glyph (kerning, then tracking after every glyph, like CSS letter-spacing) with the
 *  pen at (0, 0) on the baseline; `map` moves every point to its place in the frame */
const setWords = (font: Font, words: string[], size: number, tracking: number, map?: Pt) => {
  const scale = size / font.unitsPerEm;
  const space = font.charToGlyph(' ').advanceWidth! * scale;
  let pen = 0;
  const paths = words.map((w, wi) => {
    if (wi) pen += space + tracking * size;
    const glyphs = font.stringToGlyphs(w);
    const path = new opentype.Path();
    glyphs.forEach((g, gi) => {
      if (gi) pen += font.getKerningValue(glyphs[gi - 1], g) * scale;
      path.extend(g.getPath(pen, 0, size));
      pen += g.advanceWidth! * scale + tracking * size;
    });
    if (map)
      for (const c of path.commands as { x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }[]) {
        if (c.x !== undefined) [c.x, c.y] = map(c.x, c.y!);
        if (c.x1 !== undefined) [c.x1, c.y1] = map(c.x1, c.y1!);
        if (c.x2 !== undefined) [c.x2, c.y2] = map(c.x2, c.y2!);
      }
    return path;
  });
  const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (const p of paths) {
    const b = p.getBoundingBox();
    if (b.x2 <= b.x1) continue;
    box.x1 = Math.min(box.x1, b.x1);
    box.y1 = Math.min(box.y1, b.y1);
    box.x2 = Math.max(box.x2, b.x2);
    box.y2 = Math.max(box.y2, b.y2);
  }
  return { paths, box };
};

const REF = 1000;

/** every way to break n words into consecutive rows of at most `max` words */
const partitions = (n: number, max: number): number[][][] => {
  if (n === 0) return [[]];
  const out: number[][][] = [];
  for (let k = 1; k <= Math.min(max, n); k++) {
    const head = Array.from({ length: k }, (_, i) => i);
    for (const rest of partitions(n - k, max)) out.push([head, ...rest.map(r => r.map(i => i + k))]);
  }
  return out;
};

/** a word set vertically: the first word down the left beside the top `k` rows, or the last word down
 *  the right beside the bottom `k` (k = all of them: it runs the full height) */
type Vert = { side: 'left' | 'right'; k: number; dir: 'up' | 'down' | 'upright' };
type Cand = { rows: number[][]; v: Vert | null; forced?: { fill?: Fill; color?: string; reveal?: number }[] };

export const solveStack = (stack: ResolvedStack, font: Font, st: TypeStyle, W: number, H: number, columns = false): StackLayout => {
  const texts = stack.words.map(w => caseOf(w.text, st.case));
  const cache = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
  const measure = (idx: number[]) => {
    const key = idx.join(',');
    if (!cache.has(key)) cache.set(key, setWords(font, idx.map(i => texts[i]), REF, st.tracking).box);
    return cache.get(key)!;
  };
  /** height of a row per pixel of width, when it runs a column's width */
  const ratio = (idx: number[]) => {
    const b = measure(idx);
    return (b.y2 - b.y1) / (b.x2 - b.x1);
  };
  const Hav = (st.bottom - st.top) * H;
  const colFull = W * (1 - 2 * st.margin);
  const gap = st.gap * W;
  const [s0, s1] = st.stretch;
  const clampS = (f: number) => Math.min(s1, Math.max(s0, f));

  // every row by hand set down the frame (a giant upright "i" beside "hold the line" turned to read
  // downward): columns side by side, all as tall as each other, tight — no spread rows, no gaps between
  // words (user, v10: the rows spread beside the pillar left gaps that "look bad … put them in vertical")
  // columns: words set down the frame side by side, all as tall as each other, tight — a giant upright
  // "i" beside "hold the line" turned to read downward; "dreaming | quietly | tonight". Rows that can't
  // fill a height are never spread apart (user, v10: gaps between words "look bad … put them in vertical")
  type Col = { words: number[]; vertical: 'up' | 'down' | 'upright'; fill?: Fill; color?: string; reveal?: number };
  const columnFit = (cols: Col[]) => {
    const per = cols.map(c => {
      const b = measure(c.words);
      // thickness per pixel of length: standing, its width per height; turned, its height per width
      return c.vertical === 'upright' ? (b.x2 - b.x1) / (b.y2 - b.y1) : (b.y2 - b.y1) / (b.x2 - b.x1);
    });
    const gaps = gap * (cols.length - 1);
    const P = Math.min(Hav, (colFull - gaps) / per.reduce((a, x) => a + x, 0));
    const width = per.reduce((a, x) => a + x * P, 0) + gaps;
    return { per, P, width, area: (P / Hav) * Math.min(1, width / colFull) };
  };
  const columnsLayout = (cols: Col[], score: number): StackLayout => {
    const { per, P, width } = columnFit(cols);
    // where each column sits: a run of columns turned to read downward goes right to left, as vertical
    // Japanese does (read with the head tilted right, the rightmost line comes first — left to right,
    // "ignite | the flame" read "the flame ignite"); a run turned upward goes left to right; a standing
    // word (the giant i) keeps its place
    const order: number[] = [];
    for (let i = 0; i < cols.length; ) {
      let j = i;
      while (j + 1 < cols.length && cols[j + 1].vertical === cols[i].vertical && cols[i].vertical !== 'upright') j++;
      const run = Array.from({ length: j - i + 1 }, (_, q) => i + q);
      order.push(...(cols[i].vertical === 'down' ? run.reverse() : run));
      i = j + 1;
    }
    const xs = new Map<number, number>();
    let xx = (W - width) / 2;
    for (const i of order) {
      xs.set(i, xx);
      xx += per[i] * P + gap;
    }
    const y0 = st.top * H + (Hav - P) / 2;
    const rowsOut: RowLayout[] = cols.map((c, i) => {
      const b = measure(c.words);
      const up = c.vertical === 'upright';
      const th = per[i] * P;
      const size = (REF * P) / (up ? b.y2 - b.y1 : b.x2 - b.x1);
      const k = size / REF;
      const cx = xs.get(i)!;
      const map: Pt = up
        ? (px, py) => [cx + (px - b.x1 * k), y0 + (py - b.y1 * k)]
        : c.vertical === 'down'
          ? (px, py) => [cx + (b.y2 * k - py), y0 + (px - b.x1 * k)]
          : (px, py) => [cx + (py - b.y1 * k), y0 + (b.x2 * k - px)];
      const { paths } = setWords(font, c.words.map(w => texts[w]), size, st.tracking, map);
      const m: Mark = c.fill || c.color || c.reveal !== undefined ? c : (c.words.map(w => stack.marks[w]).find(Boolean) ?? {});
      const fill: Fill = m.fill ?? (size >= st.minMask * W ? 'video' : 'solid');
      return { words: c.words, paths: paths.map(p => p.toPathData(2)), vertical: c.vertical, size, fill, solidByHand: m.fill === 'solid', color: m.color, reveal: m.reveal, left: cx, right: cx + th, top: y0, bottom: y0 + P, dive: { x: 0, y: 0, r: 1 } };
    });
    const rowOf = (w: number) => Math.max(0, rowsOut.findIndex(r => r.words.includes(w)));
    const label = rowsOut.map(r => `${{ up: '↑', down: '↓', upright: '▮' }[r.vertical as 'up']}${r.words.map(k => texts[k]).join(' ')}`).join(' | ');
    // `stretch` reports how much of the frame the columns fill (they can be height- or width-limited)
    return { rows: rowsOut, stretch: 1 / columnFit(cols).area, score, throughRow: rowOf(stack.throughWord), intoRow: rowOf(stack.intoWord), label };
  };
  if (stack.rows && stack.rows.length >= 1 && stack.rows.every(r => r.vertical)) {
    return columnsLayout(stack.rows.map(r => ({ words: r.words, vertical: r.vertical as Col['vertical'], fill: r.fill, color: r.color, reveal: r.reveal })), 0);
  }

  const cands: Cand[] = [];
  const addVerticals = (rows: number[][], forced?: Cand['forced']) => {
    const n = rows.length;
    const dirOf = (i: number): Vert['dir'] => {
      const v = stack.rows?.[i]?.vertical;
      return v === 'down' || v === 'upright' ? v : 'up';
    };
    // a turned word has to read as a word: four letters or more ("ooh" turned reads as three rings); a
    // standing one (a drop cap) is any single word set by hand
    const upright = (i: number) => dirOf(i) === 'upright';
    if (rows[0].length === 1 && (texts[rows[0][0]].length >= 4 || upright(0))) for (let k = 1; k <= n - 1; k++) cands.push({ rows, v: { side: 'left', k, dir: dirOf(0) }, forced });
    const last = rows[n - 1];
    if (last.length === 1 && (texts[last[0]].length >= 4 || upright(n - 1))) for (let k = 1; k <= n - 1; k++) cands.push({ rows, v: { side: 'right', k, dir: dirOf(n - 1) }, forced });
  };
  if (stack.rows) {
    const rows = stack.rows.map(r => r.words);
    const n = rows.length;
    if (stack.rows[0].vertical || (n > 1 && stack.rows[n - 1].vertical)) {
      // a vertical row by hand: the layout finds how many rows it runs beside
      const before = cands.length;
      addVerticals(rows, stack.rows);
      const side = stack.rows[0].vertical ? 'left' : 'right';
      cands.splice(before, cands.length - before, ...cands.slice(before).filter(c => c.v?.side === side));
    } else cands.push({ rows, v: null, forced: stack.rows });
  } else {
    const allowV = stack.vertical ?? st.vertical;
    for (const rows of partitions(texts.length, st.maxWords)) {
      cands.push({ rows, v: null });
      if (allowV && rows.length >= 2) addVerticals(rows);
    }
  }

  const evaluate = (c: Cand) => {
    const n = c.rows.length;
    const vIdx = c.v ? (c.v.side === 'left' ? 0 : n - 1) : -1;
    const hIdx = c.rows.map((_, i) => i).filter(i => i !== vIdx);
    const nH = hIdx.length;
    const hn = hIdx.map(i => ratio(c.rows[i]));
    const beside = (j: number) => !!c.v && (c.v.side === 'left' ? j < c.v.k : j >= nH - c.v.k);
    // the side word's thickness per pixel of its length: turned, its height per width; standing, its
    // width per height (the length runs down its height)
    const rho = c.v ? (c.v.dir === 'upright' ? 1 / ratio(c.rows[vIdx]) : ratio(c.rows[vIdx])) : 0;
    const gaps = gap * Math.max(0, nH - 1);
    // the vertical word's thickness depends on the block it runs beside, whose width depends on the
    // thickness: settle it by iterating
    let thick = c.v ? 0.25 * colFull : 0;
    let colB = colFull;
    let f = 1;
    let sy = 1;
    let extra = 0;
    let L = 0;
    for (let it = 0; it < (c.v ? 60 : 1); it++) {
      colB = colFull - thick - gap;
      const hs = hn.map((r, j) => r * (beside(j) ? colB : colFull));
      const nat = hs.reduce((a, h) => a + h, 0);
      f = (Hav - gaps) / Math.max(1, nat);
      sy = clampS(f);
      // spare height is not spread into the gaps: the stack keeps tight gaps and sits centred
      extra = st.spread && nH > 1 ? (Hav - gaps - nat * sy) / (nH - 1) : 0;
      if (!c.v) break;
      L = hs.filter((_, j) => beside(j)).reduce((a, h) => a + h, 0) * sy + (c.v.k - 1) * (gap + extra);
      thick = 0.5 * thick + 0.5 * rho * L * sy;
    }
    // a standing word down the left (a drop cap) takes all the height the rows below it leave, so it is
    // as big as the frame allows (user, v9: "I should be the biggest word"); the rows beside it run down
    // its height. A thin letter tied to the height of the rows beside it read as a dot and a stroke.
    let pillar = 0;
    let besideSpare = 0;
    if (c.v?.dir === 'upright' && c.v.side === 'left') {
      const belowH = hn.reduce((a, r, j) => (beside(j) ? a : a + r * colFull + gap), 0);
      const P = Hav - belowH;
      thick = P * rho;
      colB = colFull - thick - gap;
      const R = hn.reduce((a, r, j) => (beside(j) ? a + r * colB : a), 0) + gap * (c.v.k - 1);
      L = Math.max(P, R);
      f = Hav / (L + belowH);
      sy = 1;
      extra = 0;
      pillar = L;
      besideSpare = Math.max(0, P - R);
    }
    // what the stretch can't take up stays as black above and below (acceptable, v6) or, for a stack too
    // tall for the frame, shrinks the letters and leaves black at the sides (worse)
    const rest = f / sy;
    let score = 2 * Math.abs(Math.log(sy)) + (rest >= 1 ? 3 * Math.log(rest) : 5 * Math.abs(Math.log(rest)));
    hIdx.forEach((i, j) => {
      const r = c.rows[i];
      const letters = r.reduce((a, k) => a + texts[k].length, 0);
      if (r.length === 1 && letters === 1) score += texts[r[0]] === 'i' ? 3 : 0.8; // a lone "i" turns into a pillar; a giant "a" is a shape
      else if (letters === 2) score += 0.15;
      if (r.length === 2) score += 0.35;
      if (r.length >= 3) score += 0.9;
      // big letters show the footage: rows set small cost (user, v4: "large font so much of the video shows")
      const b = measure(r);
      const width = beside(j) ? colB : colFull;
      const size = (REF * width) / (b.x2 - b.x1);
      score += 1.2 * Math.max(0, (st.minSize * W) / size - 1);
      // "i" or "a" left at the end of a row, its word on the next one ("ooh i / let")
      if (i < c.rows.length - 1 && r.length > 1 && texts[r[r.length - 1]].length === 1) score += 0.6;
      // the rows fill in as they are sung: a giant last row leaves the frame half empty until the end
      if (j === nH - 1 && nH > 1) score += 2 * Math.max(0, (hn[j] * width * sy) / Hav - 0.3);
    });
    // dark time: a row is black until its first word is sung, so big rows should come early and small
    // ones late (user, v8: big one- and two-letter words at the start "so the user does not have to
    // look at black screen")
    const t0 = stack.start;
    const span = Math.max(0.4, Math.max(...stack.words.map(w => w.show)) - t0);
    const showOf = (r: number[]) => Math.max(0, Math.min(...r.map(k => stack.words[k].show)) - t0) / span;
    let dark = 0;
    hIdx.forEach((i, j) => {
      dark += ((hn[j] * (beside(j) ? colB : colFull) * sy) / Hav) * ((beside(j) ? colB : colFull) / colFull) * showOf(c.rows[i]);
    });
    if (c.v) dark += ((thick * L) / (colFull * Hav)) * showOf(c.rows[vIdx]);
    score += st.darkWeight * dark;
    if (c.v) {
      score += 0.2;
      if (colB < 0.35 * colFull) score += 20;
      // a vertical word has to be a big one, not a thin label down the side
      const bv = measure(c.rows[vIdx]);
      const sizeV = (REF * L) / (c.v.dir === 'upright' ? bv.y2 - bv.y1 : bv.x2 - bv.x1);
      score += 2 * Math.max(0, (st.minVertical * W) / Math.max(1, sizeV) - 1);
      // the last word turned down the right stays an empty column until it is sung: fine beside the last
      // row or two (they fill late anyway), not beside most of the stack
      if (c.v.side === 'right') score += 0.6 * Math.max(0, c.v.k - 2);
      // a standing word (a drop cap) is there to be the biggest thing on the screen (user, v9: "I should be
      // the biggest word")
      if (c.v.dir === 'upright') {
        const tallest = Math.max(...hIdx.map((_, j) => hn[j] * (beside(j) ? colB : colFull)));
        score += 3 * Math.max(0, (1.25 * tallest) / Math.max(1, L) - 1);
        // the black left between the rows beside it
        score += (2 * besideSpare * colB) / (colFull * Hav);
      }
    }
    if (nH > 6) score += 0.3 * (nH - 6);
    if (nH === 1 && Math.abs(Math.log(f)) > 0.05) score += 5; // one row can't fill a frame
    return { c, vIdx, hIdx, beside, thick, colB, f, sy, extra, score, pillar };
  };

  const best = cands.map(evaluate).sort((a, b) => a.score - b.score)[0];

  // a short phrase that can't fill a height as rows may stand as columns instead, read left to right,
  // each turned to read downward — a lone "i" first stands upright as a pillar (the user's giant I)
  if (!stack.rows && columns && texts.length <= 7) {
    const t0 = stack.start;
    const span = Math.max(0.4, Math.max(...stack.words.map(w => w.show)) - t0);
    let bestCol: { cols: Col[]; score: number } | null = null;
    for (const groups of partitions(texts.length, 3)) {
      if (groups.length > 4) continue;
      const cols: Col[] = groups.map((g, gi) => ({ words: g, vertical: gi === 0 && g.length === 1 && texts[g[0]] === 'i' ? 'upright' : 'down' }));
      // a turned column of one letter is a slab, not a word
      if (cols.some(c => c.vertical === 'down' && c.words.length === 1 && texts[c.words[0]].length === 1)) continue;
      const { area, P, per } = columnFit(cols);
      // turned words read harder than rows: columns win only where rows clearly can't fill
      let score = 3 * -Math.log(area) + 0.8 + 0.35 * Math.max(0, cols.length - 2);
      if (cols[0].vertical === 'upright') score -= 0.3; // the giant I
      // dark time, as for rows: a column is black until its first word is sung
      const dark = cols.reduce((a, c, i) => a + ((per[i] * P) / colFull) * (P / Hav) * (Math.max(0, Math.min(...c.words.map(w => stack.words[w].show)) - t0) / span), 0);
      score += st.darkWeight * dark;
      if (!bestCol || score < bestCol.score) bestCol = { cols, score };
    }
    if (bestCol && bestCol.score < best.score) return columnsLayout(bestCol.cols, bestCol.score);
  }
  const { c, vIdx, hIdx, beside, thick, colB, f, sy, extra, pillar } = best;
  const left = W * st.margin;
  const top = st.top * H;
  const style = (i: number, rowIdx: number[]) => {
    const forced = c.forced?.[i];
    if (forced && (forced.fill || forced.color || forced.reveal !== undefined)) return forced;
    const m: Mark | undefined = rowIdx.map(k => stack.marks[k]).find(Boolean);
    return m ?? {};
  };

  type Built = Omit<RowLayout, 'paths'> & { built: opentype.Path[] };
  const rows = new Map<number, Built>();
  const nH = hIdx.length;
  let yTop = top;
  let blockTop = Infinity;
  let blockBottom = -Infinity;
  // a drop cap: the rows beside it spread down its height (one row sits in the middle), the rest below
  const besideY = new Map<number, number>();
  if (pillar > 0) {
    const js = hIdx.map((_, j) => j).filter(beside);
    const hb = js.map(j => ratio(c.rows[hIdx[j]]) * colB);
    const R = hb.reduce((a, h) => a + h, 0) + gap * (js.length - 1);
    const g = js.length > 1 ? gap + (pillar - R) / (js.length - 1) : 0;
    let y = top + (js.length === 1 ? (pillar - hb[0]) / 2 : 0);
    js.forEach((j, q) => {
      besideY.set(j, y);
      y += hb[q] + g;
    });
    yTop = top + pillar + gap;
  }
  hIdx.forEach((i, j) => {
    const r = c.rows[i];
    const s = style(i, r);
    const by = beside(j);
    const width = by ? colB : colFull;
    const x0 = by && c.v?.side === 'left' ? left + thick + gap : left;
    const b = measure(r);
    const size = (REF * width) / (b.x2 - b.x1);
    const k = size / REF;
    const y0 = pillar > 0 && by ? besideY.get(j)! : yTop;
    const map: Pt = (x, y) => [x - b.x1 * k + x0, y0 + (y - b.y1 * k) * sy];
    const { paths } = setWords(font, r.map(w => texts[w]), size, st.tracking, map);
    const height = (b.y2 - b.y1) * k * sy;
    rows.set(i, { words: r, built: paths, vertical: false as const, size, fill: s.fill ?? (size >= st.minMask * W ? 'video' : 'solid'), solidByHand: s.fill === 'solid', color: s.color, reveal: s.reveal, left: x0, right: x0 + width, top: y0, bottom: y0 + height, dive: { x: 0, y: 0, r: 1 } });
    if (by) {
      blockTop = Math.min(blockTop, y0);
      blockBottom = Math.max(blockBottom, y0 + height);
    }
    if (!(pillar > 0 && by)) yTop = y0 + height + gap + extra;
  });
  if (pillar > 0) {
    blockTop = top;
    blockBottom = top + pillar;
  }
  if (c.v) {
    const r = c.rows[vIdx];
    const s = style(vIdx, r);
    const b = measure(r);
    const len = blockBottom - blockTop;
    const up = c.v.dir === 'upright';
    const sizeV = (REF * len) / (up ? b.y2 - b.y1 : b.x2 - b.x1);
    const k = sizeV / REF;
    const th = up ? (b.x2 - b.x1) * k : (b.y2 - b.y1) * k * sy;
    const colLeft = c.v.side === 'left' ? left : W - left - th;
    // 'up': turned a quarter left, reads bottom to top, the letters' tops face left; 'down': a quarter
    // right, reads top to bottom, tops face right; 'upright': standing as it is, as tall as the block
    const map: Pt = up
      ? (x, y) => [colLeft + (x - b.x1 * k), blockTop + (y - b.y1 * k)]
      : c.v.dir === 'up'
        ? (x, y) => [colLeft + (y - b.y1 * k) * sy, blockTop + (b.x2 * k - x)]
        : (x, y) => [colLeft + (b.y2 * k - y) * sy, blockTop + (x - b.x1 * k)];
    const { paths } = setWords(font, r.map(w => texts[w]), sizeV, st.tracking, map);
    rows.set(vIdx, { words: r, built: paths, vertical: c.v.dir, size: sizeV, fill: s.fill ?? (sizeV >= st.minMask * W ? 'video' : 'solid'), solidByHand: s.fill === 'solid', color: s.color, reveal: s.reveal, left: colLeft, right: colLeft + th, top: blockTop, bottom: blockBottom, dive: { x: 0, y: 0, r: 1 } });
  }
  // centre the stack in the frame (user, v6: a little black above and below is fine, stretched letters
  // are not); one too tall for the frame shrinks evenly about the centre, leaving black at the sides
  const all = [...rows.values()];
  const stackTop = Math.min(...all.map(r => r.top));
  const stackH = Math.max(...all.map(r => r.bottom)) - stackTop;
  const u = Math.min(1, Hav / stackH);
  const dy = top + (Hav - stackH * u) / 2;
  const place = (x: number, y: number): [number, number] => [W / 2 + (x - W / 2) * u, dy + (y - stackTop) * u];
  for (const r of all) {
    for (const p of r.built)
      for (const cmd of p.commands as { x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }[]) {
        if (cmd.x !== undefined) [cmd.x, cmd.y] = place(cmd.x, cmd.y!);
        if (cmd.x1 !== undefined) [cmd.x1, cmd.y1] = place(cmd.x1, cmd.y1!);
        if (cmd.x2 !== undefined) [cmd.x2, cmd.y2] = place(cmd.x2, cmd.y2!);
      }
    [r.left, r.top] = place(r.left, r.top);
    [r.right, r.bottom] = place(r.right, r.bottom);
    r.size *= u;
  }
  const done = new Map([...rows].map(([i, { built, ...r }]) => [i, { ...r, paths: built.map(p => p.toPathData(2)) } as RowLayout]));
  const out = c.rows.map((_, i) => done.get(i)!);
  const rowOf = (w: number) => Math.max(0, out.findIndex(r => r.words.includes(w)));
  const label = out.map(r => `${r.vertical ? `${{ up: '↑', down: '↓', upright: '▮' }[r.vertical]}[${c.v!.side} ×${c.v!.k}]` : ''}${r.words.map(k => texts[k]).join(' ')}`).join(' / ');
  return { rows: out, stretch: f, score: best.score, throughRow: rowOf(stack.throughWord), intoRow: rowOf(stack.intoWord), label };
};

/** the centre of the thickest stroke of a row's paths, by a chamfer distance transform (browser only) */
const divePoint = (paths: string[], size: number, box: Box) => {
  const q = Math.max(1, size / 160); // ~40 px across a stroke at most: plenty to find its middle
  const pad = 4;
  const w = Math.ceil((box.right - box.left) / q) + pad * 2;
  const h = Math.ceil((box.bottom - box.top) / q) + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.setTransform(1 / q, 0, 0, 1 / q, pad - box.left / q, pad - box.top / q);
  ctx.fillStyle = '#fff';
  for (const d of paths) ctx.fill(new Path2D(d));
  const px = ctx.getImageData(0, 0, w, h).data;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = px[i * 4 + 3] > 127 ? 1e9 : 0;
  const a = 1;
  const b = Math.SQRT2;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!d[k]) continue;
      let v = d[k];
      if (i > 0) v = Math.min(v, d[k - 1] + a);
      if (j > 0) {
        v = Math.min(v, d[k - w] + a);
        if (i > 0) v = Math.min(v, d[k - w - 1] + b);
        if (i < w - 1) v = Math.min(v, d[k - w + 1] + b);
      }
      d[k] = v;
    }
  let best = 0;
  let bi = 0;
  for (let j = h - 1; j >= 0; j--)
    for (let i = w - 1; i >= 0; i--) {
      const k = j * w + i;
      if (!d[k]) continue;
      let v = d[k];
      if (i < w - 1) v = Math.min(v, d[k + 1] + a);
      if (j < h - 1) {
        v = Math.min(v, d[k + w] + a);
        if (i < w - 1) v = Math.min(v, d[k + w + 1] + b);
        if (i > 0) v = Math.min(v, d[k + w - 1] + b);
      }
      d[k] = v;
      if (v > best) {
        best = v;
        bi = k;
      }
    }
  return { x: box.left + ((bi % w) - pad + 0.5) * q, y: box.top + (Math.floor(bi / w) - pad + 0.5) * q, r: Math.max(1, (best - 0.5) * q) };
};

/** how much of the frame a layout fills: rows leave bands (stretch > 1) or shrink (< 1); columns report
 *  1 / their area */
const fillOf = (lay: StackLayout) => (lay.stretch >= 1 ? 1 / lay.stretch : lay.stretch);
const isColumns = (lay: StackLayout) => lay.rows.some(r => r.vertical);

/** every stack of a short laid out together: rows everywhere, columns only on the few short, fast lines
 *  where rows would leave the frame mostly empty — the budget is the short's, hand-set columns count */
const solveTypes = (stacks: ResolvedStack[], font: Font, st: TypeStyle, W: number, H: number): Map<number, StackLayout> => {
  const out = new Map(stacks.map(s => [s.index, solveStack(s, font, st, W, H, false)] as const));
  const c = st.columns;
  if (!c) return out;
  let left = c.max - [...out.values()].filter(isColumns).length;
  if (left <= 0) return out;
  const options = stacks
    .filter(s => !s.rows && s.words.length <= c.maxWords && Math.max(...s.words.map(w => w.end)) - Math.min(...s.words.map(w => w.start)) <= c.maxSpan && fillOf(out.get(s.index)!) < c.belowFill)
    .map(s => {
      const lay = solveStack(s, font, st, W, H, true);
      return { s, lay, gain: isColumns(lay) ? fillOf(lay) - fillOf(out.get(s.index)!) : 0 };
    })
    .filter(o => o.gain > 0.15)
    .sort((a, b) => b.gain - a.gain);
  for (const o of options) {
    if (left-- <= 0) break;
    out.set(o.s.index, o.lay);
  }
  return out;
};

/** when a stack flips from black words over the footage to the mask: as the word lands that brings the
 *  lit share of its ink (each word's share of its row, by its letters) to `lit` */
const flipOf = (stack: ResolvedStack, lay: StackLayout, st: TypeStyle): number | undefined => {
  if (stack.reverse === false || stack.enter === 'into') return undefined;
  if (typeof stack.reverse === 'number') return stack.reverse;
  const r = st.reverse ?? { minWords: 4, lit: 0.5, minHold: 0.6 };
  if (stack.reverse !== true && (!st.reverse || stack.words.length < r.minWords)) return undefined;
  const area = new Map<number, number>();
  for (const row of lay.rows) {
    const a = (row.right - row.left) * (row.bottom - row.top);
    const letters = row.words.reduce((n, w) => n + stack.words[w].text.length, 0);
    for (const w of row.words) area.set(w, (a * stack.words[w].text.length) / letters);
  }
  const total = [...area.values()].reduce((a, b) => a + b, 0);
  const order = stack.words.map((_, i) => i).sort((a, b) => stack.words[a].show - stack.words[b].show);
  let sum = 0;
  for (const i of order) {
    sum += area.get(i) ?? 0;
    if (sum < r.lit * total) continue;
    const flip = Math.min(stack.words[i].show, stack.exit === 'through' ? stack.diveFrom : Infinity);
    return stack.reverse === true || flip - stack.start >= r.minHold ? flip : undefined;
  }
  return undefined;
};

/** every stack of a short laid out together (rows, the few columns), and when each flips to the mask */
export const solveShort = (stacks: ResolvedStack[], font: Font, st: TypeStyle, W: number, H: number): Map<number, StackLayout> => {
  const out = solveTypes(stacks, font, st, W, H);
  for (const stack of stacks) out.get(stack.index)!.flip = flipOf(stack, out.get(stack.index)!, st);
  return out;
};

/** solveShort, plus the dive points (needs a canvas) */
export const layoutShort = (stacks: ResolvedStack[], font: Font, st: TypeStyle, W: number, H: number): Map<number, StackLayout> => {
  const out = solveShort(stacks, font, st, W, H);
  for (const stack of stacks) {
    const lay = out.get(stack.index)!;
    const dives = new Set<number>();
    if (stack.exit === 'through') dives.add(lay.throughRow);
    if (stack.enter === 'into') dives.add(lay.intoRow);
    for (const k of dives) lay.rows[k].dive = divePoint(lay.rows[k].paths, lay.rows[k].size, lay.rows[k]);
  }
  return out;
};
