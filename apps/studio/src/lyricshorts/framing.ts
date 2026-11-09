/**
 * Framing (make-lyrics-shorts-summerstyle-boldwords): every cut's 9:16 crop sits on its subject — the face box marked per shot in
 * projects/<slug>/footage/faces.json (or the cut's own `face`) — placed by how the cut is seen:
 * - the footage seen whole (a full screen, or black words before a stack flips to the mask): the eye line
 *   on the upper third, the face centred across the frame and about a third of its height;
 * - the footage seen through the letters (the mask): the eye line on the biggest row lit during the cut,
 *   the face a little taller than that row, so the face fills the letters (user, s02/s03 v2: "you are
 *   not cropping them correctly, so it fits correctly … placing the clip correctly is important").
 * - the footage under a lockup (a cap screen): the face in the part of the frame the text leaves free, so
 *   the line never sits on it (user, 2026-11-02: "if it's important, either change position or recrop the
 *   background image so as to keep the subject clear of the text") — placeCaps picks the lockup's place first.
 * Cuts cropped by hand (x / y / zoom) keep their crop; a loop's last cut takes the first cut's crop, so
 * the seam stays seamless; an iris without a centre opens on the framed eyes. Pure (Node: clip extraction; the render: the same clip files).
 */
import type { StackLayout } from './layout.ts';
import { dyAt, type Lockup, type Place } from './lockup.ts';
import { clipFile, type FaceBox, type ResolvedCut, type ResolvedScreen, type ResolvedStack } from './spec.ts';

/** projects/<slug>/footage/faces.json: the source's width / height, and each shot's subject */
export type Faces = { aspect: number; shots: Record<string, FaceBox | null | undefined> };

/** tighter than this the footage turns soft (a 4K source, cropped to 9:16 and scaled to 1080 × 1920) */
export const ZOOM_MAX = 1.5;

/** where a cut's subject should land: its eye line at (x, y), its face `h` tall (fractions of the frame) */
export type Aim = { x: number; y: number; h: number; how: 'whole' | 'letters' };

const SEEN_WHOLE: Aim = { x: 0.5, y: 0.4, h: 0.36, how: 'whole' };

const round = (v: number) => Math.round(v * 1000) / 1000;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** the crop (centre and zoom, as CutSpec takes them) that puts `box` where `aim` says */
export const cropOn = (box: FaceBox, aspect: number, aim: Aim) => {
  const [x0, y0, x1, y1, eyes] = box;
  const zoom = clamp(aim.h / Math.max(0.01, y1 - y0), 1, ZOOM_MAX);
  const cw = 9 / 16 / aspect / zoom;
  const ch = 1 / zoom;
  const left = clamp((x0 + x1) / 2 - aim.x * cw, 0, 1 - cw);
  const top = clamp(eyes - aim.y * ch, 0, 1 - ch);
  return { x: round(left + cw / 2), y: round(top + ch / 2), zoom: round(zoom) };
};

/** a lockup's ink in frame fractions (a little air around it) */
export type Band = { l: number; r: number; t: number; b: number };

/** where a lockup went: its place, how far it moves down (`dy`, as Lockup.dy), its ink, and how much of the
 *  marked subjects under it the text still covers (0–1, averaged over the screen's time; `worst` the cut
 *  covered most) */
export type CapPlace = { place: Place | 'under the head' | 'over the head'; dy: number; band: Band; cover: number; worst?: { shot: string; cover: number } };

/** the part of a subject box the text must never cover: its top down to a little under the eye line — the
 *  whole face of a face box, the head of a figure (the user, 2026-11-02: over the rest, "if it's semi
 *  important it's fine") */
const headOf = (box: FaceBox): FaceBox => {
  const [x0, y0, x1, y1, eyes] = box;
  return [x0, y0, x1, Math.min(y1, eyes + 0.9 * Math.max(0.01, eyes - y0)), eyes];
};

/** a cut seen whole under a lockup: the subject as big as seen whole, centred across, its head in the part
 *  of the frame the text leaves free (above a low lockup, under a high one) — the whole subject centred there
 *  when it fits, else its top at the edge of the free part, the rest running behind the text */
const clearOf = (band: Band, box: FaceBox): Aim => {
  const [, y0, , y1, eyes] = box;
  const free = (band.t + band.b) / 2 >= 0.5 ? { t: 0.05, b: band.t - 0.03 } : { t: band.b + 0.03, b: 0.95 };
  const room = Math.max(0.12, free.b - free.t);
  const h = SEEN_WHOLE.h;
  const e = clamp((eyes - y0) / Math.max(0.01, y1 - y0), 0, 1);
  return { x: 0.5, y: free.t + Math.max(0, (room - h) / 2) + e * h, h, how: 'whole' };
};

/** a subject box (source fractions) where it lands in a crop (frame fractions) */
const inFrame = (box: FaceBox, crop: { x: number; y: number; zoom: number }, aspect: number): Band => {
  const cw = 9 / 16 / aspect / crop.zoom;
  const ch = 1 / crop.zoom;
  const left = clamp(crop.x - cw / 2, 0, 1 - cw);
  const top = clamp(crop.y - ch / 2, 0, 1 - ch);
  return { l: (box[0] - left) / cw, r: (box[2] - left) / cw, t: (box[1] - top) / ch, b: (box[3] - top) / ch };
};

/** the share of a subject the text lies over */
const covered = (f: Band, band: Band) => {
  const w = Math.max(0, Math.min(f.r, band.r, 1) - Math.max(f.l, band.l, 0));
  const h = Math.max(0, Math.min(f.b, band.b, 1) - Math.max(f.t, band.t, 0));
  return (w * h) / Math.max(1e-4, (Math.min(f.r, 1) - Math.max(f.l, 0)) * (Math.min(f.b, 1) - Math.max(f.t, 0)));
};

/**
 * Each lockup's place: low (under the faces), high, mid, or right under / over a head (a subject cropped at the
 * source's full height can't move up or down, so the text moves instead) — the one whose text covers least of
 * the heads of the marked subjects (faces.json, or a cut's own `face`) of the cuts under it, each cut framed as
 * it would be for that place (clearOf; cuts cropped by hand as they are). Low wins unless another place clears
 * clearly more. A place set by hand (`cap(…, { place })`) stays; its cuts are still framed clear of it.
 */
export const placeCaps = (cuts: ResolvedCut[], screens: ResolvedScreen[], lockups: Map<number, Lockup>, faces: Faces | undefined, W: number, H: number) => {
  const out = new Map<number, CapPlace>();
  const aspect = faces?.aspect ?? 16 / 9;
  for (const s of screens) {
    const lk = s.kind === 'cap' ? lockups.get(s.index) : undefined;
    if (s.kind !== 'cap' || !lk) continue;
    type Try = { place: CapPlace['place']; dy: number; cost: number };
    const tries: Try[] =
      s.place === 'auto' ? (['low', 'high', 'mid'] as Place[]).map((place, k) => ({ place, dy: dyAt(lk.box, place, H), cost: k * 0.03 })) : [{ place: s.place, dy: dyAt(lk.box, s.place, H), cost: 0 }];
    if (s.place === 'auto') {
      // right under, or right over, each head under it, as the cut is framed when seen whole (the text in the
      // frame's safe band: under 8 % from the top, over 82 %)
      const lo = 0.08 * H - lk.box.top;
      const hi = 0.82 * H - lk.box.bottom;
      for (const c of cuts) {
        const box = c.face ?? faces?.shots[c.shot];
        if (!box || Math.min(c.end, s.end) <= Math.max(c.start, s.start)) continue;
        const f = inFrame(headOf(box), c.auto ? cropOn(box, aspect, SEEN_WHOLE) : c, aspect);
        const under = (f.b + 0.03) * H - lk.box.top;
        const over = (f.t - 0.03) * H - lk.box.bottom;
        if (under >= lo && under <= hi) tries.push({ place: 'under the head', dy: under, cost: 0.02 });
        if (over >= lo && over <= hi) tries.push({ place: 'over the head', dy: over, cost: 0.04 });
      }
    }
    let best: CapPlace | undefined;
    let bestScore = Infinity;
    tries.forEach(({ place, dy, cost }) => {
      const air = 0.012;
      const band = { l: lk.box.left / W - air, r: lk.box.right / W + air, t: (lk.box.top + dy) / H - air, b: (lk.box.bottom + dy) / H + air };
      let sum = 0;
      let span = 0;
      let worst: CapPlace['worst'];
      for (const c of cuts) {
        const a = Math.max(c.start, s.start);
        const z = Math.min(c.end, s.end);
        if (z <= a) continue;
        span += z - a;
        const box = c.face ?? faces?.shots[c.shot];
        if (!box) continue;
        const crop = c.auto ? cropOn(box, aspect, clearOf(band, box)) : c;
        const cover = covered(inFrame(headOf(box), crop, aspect), band);
        sum += cover * (z - a);
        if (cover > (worst?.cover ?? 0.001)) worst = { shot: c.shot, cover };
      }
      const cover = span ? sum / span : 0;
      const score = cover + cost;
      if (score < bestScore) {
        bestScore = score;
        best = { place, dy, band, cover, worst };
      }
    });
    if (best) out.set(s.index, best);
  }
  return out;
};

/** how the cut is seen at its middle: whole, or through the biggest row lit by its end; under a lockup, whole
 *  with the subject (`box`) clear of the text */
export const aimOf = (c: Pick<ResolvedCut, 'start' | 'end'>, screens: ResolvedScreen[], layouts: Map<number, StackLayout>, W: number, H: number, caps?: Map<number, CapPlace>, box?: FaceBox): Aim => {
  const mid = (c.start + c.end) / 2;
  const s = screens.find(x => mid >= x.start && mid < x.end);
  // a full screen and a lockup over the footage show the shot whole
  if (!s || s.kind !== 'stack') {
    const cp = s?.kind === 'cap' ? caps?.get(s.index) : undefined;
    return cp && box ? clearOf(cp.band, box) : SEEN_WHOLE;
  }
  const lay = layouts.get(s.index);
  if (!lay || (lay.flip !== undefined && mid < lay.flip)) return SEEN_WHOLE;
  const first = (r: StackLayout['rows'][number]) => Math.min(...r.words.map(w => s.words[w].show));
  const lit = lay.rows.filter(r => first(r) < c.end);
  const pool = lit.length ? lit : [lay.rows.reduce((a, b) => (first(a) <= first(b) ? a : b))];
  const area = (r: StackLayout['rows'][number]) => (r.right - r.left) * (r.bottom - r.top);
  const row = pool.reduce((a, b) => (area(a) >= area(b) ? a : b));
  return { x: (row.left + row.right) / 2 / W, y: (row.top + row.bottom) / 2 / H, h: clamp(((row.bottom - row.top) / H) * 1.6, 0.3, 0.75), how: 'letters' };
};

/** each clip's brightness (luma 0–255) in LUMA_BANDS bands down its middle frame, top to bottom, by
 *  clip file: shorts/<id>/luma.json, written by `clips` */
export type Luma = Record<string, number[]>;
export const LUMA_BANDS = 16;

/** the colour of a stack's words over the whole footage, before its flip: black on bright footage, white
 *  on dark — measured where those words sit (the bands behind the rows lit before the flip) in the cut
 *  under the middle of that spell; black when unmeasured. A bright window behind one row and dark hair
 *  behind another average out, so a whole-frame mean is not enough. */
export const inkOf = (
  s: ResolvedStack,
  lay: StackLayout,
  flip: number,
  cuts: Pick<ResolvedCut, 'start' | 'end' | 'file'>[],
  luma: Luma | undefined,
  H: number,
  white = 100,
): 'black' | 'white' => {
  if (s.ink) return s.ink;
  const mid = (s.start + flip) / 2;
  const c = cuts.find(x => mid >= x.start && mid < x.end);
  const bands = c ? luma?.[c.file] : undefined;
  if (!bands?.length) return 'black';
  const rows = lay.rows.filter(r => Math.min(...r.words.map(w => s.words[w].show)) < flip);
  let sum = 0;
  let n = 0;
  for (const r of rows.length ? rows : lay.rows)
    for (let k = Math.floor((r.top / H) * bands.length); k <= Math.min(bands.length - 1, Math.floor((r.bottom / H) * bands.length)); k++) {
      sum += bands[Math.max(0, k)];
      n++;
    }
  return n && sum / n < white ? 'white' : 'black';
};

/** the short's cuts framed on their subjects (cuts cropped by hand, or with no subject marked, as they are) */
export const frameCuts = (cuts: ResolvedCut[], screens: ResolvedScreen[], layouts: Map<number, StackLayout>, faces: Faces | undefined, W: number, H: number, loop?: boolean, caps?: Map<number, CapPlace>) => {
  const framed = cuts.map(c => {
    const box = c.face ?? faces?.shots[c.shot];
    if (!c.auto || !box) return c;
    const aim = aimOf(c, screens, layouts, W, H, caps, box);
    const crop = cropOn(box, faces?.aspect ?? 16 / 9, aim);
    // an iris opens on the eyes, where the framing put them
    const tr = c.tr.kind === 'iris' && !c.tr.at ? { ...c.tr, at: [aim.x, aim.y] as [number, number] } : c.tr;
    return { ...c, ...crop, tr, file: clipFile({ ...c, ...crop }, c.span) };
  });
  const first = framed[0];
  const last = framed[framed.length - 1];
  if (loop && framed.length > 1 && last.auto && last.shot === first.shot) {
    const crop = { x: first.x, y: first.y, zoom: first.zoom };
    framed[framed.length - 1] = { ...last, ...crop, file: clipFile({ ...last, ...crop }, last.span) };
  }
  return framed;
};
