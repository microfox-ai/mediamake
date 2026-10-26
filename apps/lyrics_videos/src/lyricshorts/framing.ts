/**
 * Framing (make-lyric-shorts): every cut's 9:16 crop sits on its subject — the face box marked per shot in
 * projects/<slug>/footage/faces.json (or the cut's own `face`) — placed by how the cut is seen:
 * - the footage seen whole (a full screen, or black words before a stack flips to the mask): the eye line
 *   on the upper third, the face centred across the frame and about a third of its height;
 * - the footage seen through the letters (the mask): the eye line on the biggest row lit during the cut,
 *   the face a little taller than that row, so the face fills the letters (user, s02/s03 v2: "you are
 *   not cropping them correctly, so it fits correctly … placing the clip correctly is important").
 * Cuts cropped by hand (x / y / zoom) keep their crop; a loop's last cut takes the first cut's crop, so
 * the seam stays seamless; an iris without a centre opens on the framed eyes. Pure (Node: clip extraction; the render: the same clip files).
 */
import type { StackLayout } from './layout.ts';
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

/** how the cut is seen at its middle: whole, or through the biggest row lit by its end */
export const aimOf = (c: Pick<ResolvedCut, 'start' | 'end'>, screens: ResolvedScreen[], layouts: Map<number, StackLayout>, W: number, H: number): Aim => {
  const mid = (c.start + c.end) / 2;
  const s = screens.find(x => mid >= x.start && mid < x.end);
  if (!s || s.kind === 'full') return SEEN_WHOLE;
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
export const frameCuts = (cuts: ResolvedCut[], screens: ResolvedScreen[], layouts: Map<number, StackLayout>, faces: Faces | undefined, W: number, H: number, loop?: boolean) => {
  const framed = cuts.map(c => {
    const box = c.face ?? faces?.shots[c.shot];
    if (!c.auto || !box) return c;
    const aim = aimOf(c, screens, layouts, W, H);
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
