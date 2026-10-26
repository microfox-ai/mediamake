/**
 * The remix renderer (make-video-music-remix skill): plays a project's edl.ts on the song.
 *
 * Place it at 'all'. Every cut is a Sequence: a camera (transition moves, beat bounce or the speaker
 * pump of gfx.pump, shake, push-in, punch-in steps) around the picture in the letterbox window: plate
 * (natural grade, snare exposure hits, zoom/directional motion blur, lens-bulge warp on warp zooms and
 * pumps) → punch words behind the subject → echo trail → subject cutout
 * (aura glow, impact-frame outline) → outline of the words over it → speed streaks, plus the previous
 * cut's subject for carry/pass transitions. Over all cuts: pre-drop tension, front words, timers, the
 * circuit map, the bars (lyric captions, telemetry HUD), film grain, sound effects.
 *
 * Every video is drawn through <Freeze> at an exact source time (resolve.ts sourceTime), which is
 * what lets one cut speed-ramp or hold an impact frame without ever slowing the footage.
 *
 * In a vertical frame (a short, make-video-music-remix-shorts) the window is the whole frame: each cut
 * shows the part of the wide picture around its subject (the anchors, smoothed so the frame glides;
 * aim() steers it), band() / gfx.band show the whole wide picture as a strip instead, '@split' stacks
 * its panels top to bottom, and the captions and top words sit clear of the platforms' buttons.
 *
 * Media (scripts/remix.ts): one plate per footage source (derived/plate*.mp4, cropped to the picture
 * at the window size), derived/shotmattes/<shot>.webm (VP9 alpha cutout per footage shot),
 * video/anchors.json (the subject's centre/area/box per matte frame), derived/logo.png.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, Freeze, interpolate, OffthreadVideo, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import type { SceneProps } from '../kit/contract';
import { envelopeAt, hitAt } from '../kit/timing';
import type { Manifest } from '../kit/manifest';
import type { Block, Fx, Gfx, Sfx, TextCue, Transition } from './edl.ts';
import { measure, useFontsReady } from './measure';
import { beatTime, resolveAll, sourceTime, TEXT_LEAD, type Footage, type ResolvedCut, type ResolvedPanel, type ResolvedText } from './resolve.ts';
import { StartLights } from './gfx/StartLights';
import { TitleCard } from './gfx/TitleCard';

export type RemixTheme = {
  /** punch: big words; line: captions and lines; data: HUD; title: the title card's title (falls back to punch);
   *  sign: the channel's sign-off ('flank', falls back to line); comic: 'comic' caption boxes (falls back to punch);
   *  script: big words with cue.font 'script' (falls back to punch) */
  fonts: { punch: string; line: string; data: string; title?: string; sign?: string; comic?: string; script?: string };
  /** fire: a true red for words over flames (cue color 'fire'; #FF3B30 when unset) */
  colors: { ground: string; bone: string; red: string; cyan: string; acid: string; fire?: string };
  /** resolves when the fonts are loaded (measurement waits for it) */
  ready: Promise<unknown>;
  /** text in the top-left bar */
  hud?: string;
  /** the small readouts in the four corners of the bars (name, lap time, section, gear and speed);
   *  on unless false */
  corners?: boolean;
};

/** per footage shot: per matte frame [cx, cy, area, x0, y0, x1, y1] as fractions of the window */
export type Anchors = Record<string, number[][]>;

export type RemixProps = {
  slug: string;
  blocks: Block[];
  words: TextCue[];
  sfx?: Sfx[];
  gfx?: Gfx;
  footage: Footage;
  anchors: Anchors;
  /** the picture window, centred in the frame: [width, height] */
  window: [number, number];
  theme: RemixTheme;
};

type Ctx = {
  slug: string;
  manifest: Manifest;
  theme: RemixTheme;
  win: { x: number; y: number; w: number; h: number };
  text: ResolvedText[];
  cuts: ResolvedCut[];
  anchors: Anchors;
  footage: Footage;
  gfx: Gfx;
  /** a vertical frame (a short): cuts reframe the wide picture around their subject */
  tall: boolean;
  /** the wide picture's size as prepared (remix.json `window`) */
  plate: [number, number];
  /** vertical frames: cuts drawn in a box across the frame (band(), gfx.band) → its centre (0–1 down the
   *  frame) and height (px; the wide picture's own shape unless the cut asks for a taller box) */
  bands: Map<string, { y: number; h: number }>;
  /** the composition's size */
  frame: { w: number; h: number };
  /** vertical frames: the height of the top words and of the captions (px), clear of the platforms' buttons */
  safe: { top: number; caption: number };
};

const expOut = Easing.out(Easing.exp);
const cubicIn = Easing.in(Easing.cubic);
const inOut = Easing.inOut(Easing.cubic);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const prog = (t: number, a: number, b: number, e = expOut) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });
const has = <K extends Fx['k']>(c: ResolvedCut, k: K) => c.fx.find(x => x.k === k) as Extract<Fx, { k: K }> | undefined;
const colorOf = (th: RemixTheme, c?: TextCue['color']) => (c ? th.colors[c] ?? '#FF3B30' : th.colors.bone);

/** smooth deterministic noise in [-1, 1] (sum of seeded sines), for camera shake */
const wobble = (seed: string, t: number) => {
  let v = 0;
  for (let k = 0; k < 3; k++) v += Math.sin(t * [7.3, 13.1, 23.7][k] + random(`${seed}${k}`) * 6.283) * [0.55, 0.3, 0.15][k];
  return v;
};

/** frames of each transition: the out-shot's exit and the in-shot's entry */
const OUT: Partial<Record<Transition, number>> = { zoom: 6, whip: 4, whipr: 4, whipv: 4, spin: 5, liquid: 5, flow: 5 };
const IN: Partial<Record<Transition, number>> = { zoom: 12, whip: 6, whipr: 6, whipv: 6, spin: 8, match: 10, carry: 10, pass: 8, flash: 5, impact: 10, liquid: 10, flow: 9 };
/** how far a warp zoom pushes into the subject (scale 1 + ZOOM at the cut) */
const ZOOM = 1.5;

/** the subject of a shot at source time `src`: [cx, cy, area] in window fractions (centre when unknown) */
const anchorOf = (ctx: Ctx, key: string | undefined, source: string, srcFromMatte: number): [number, number, number] => {
  const a = key ? ctx.anchors[key] : undefined;
  if (!a) return [0.5, 0.5, 0];
  const fps = ctx.footage.sources[source]?.matteFps ?? 24;
  const [cx, cy, area] = a[Math.max(0, Math.min(a.length - 1, Math.round(srcFromMatte * fps)))];
  return area > 0.01 ? [cx, cy, area] : [0.5, 0.5, 0];
};
/** the subject in the wide picture's own fractions, before any reframe */
const rawAnchorAt = (ctx: Ctx, cut: ResolvedCut, songT: number) =>
  cut.matte ? anchorOf(ctx, cut.matte.key, cut.source, sourceTime(cut, songT - cut.from) - cut.matte.in) : ([0.5, 0.5, 0] as [number, number, number]);

/** the part of the wide picture a cut's window shows, in its fractions: all of it, except where a
 *  vertical frame reframes it */
type View = { x0: number; y0: number; fx: number; fy: number };
const FULL: View = { x0: 0, y0: 0, fx: 1, fy: 1 };
/** seconds either side the reframe looks at the subject, so the frame glides instead of jittering */
const AIM_SPAN = 0.4;
const viewAt = (ctx: Ctx, cut: ResolvedCut, songT: number): View => {
  if (!ctx.tall || cut.gfx || cut.panels) return FULL;
  const [pw, ph] = ctx.plate;
  const win = ctx.bands.has(cut.id) ? bandWin(ctx, cut) : ctx.win;
  const ratio = win.w / win.h / (pw / ph);
  // a band the wide picture's own shape shows all of it
  if (Math.abs(ratio - 1) < 0.01) return FULL;
  const fx = Math.min(1, ratio);
  const fy = Math.min(1, 1 / ratio);
  const aim = has(cut, 'aim');
  let cx = 0.5;
  let cy = 0.5;
  if (aim) {
    cx = aim.to === undefined ? aim.x : aim.x + (aim.to - aim.x) * inOut(clamp01((songT - cut.from) / Math.max(1e-3, cut.to - cut.from)));
  } else if (cut.matte) {
    // the subject's centre around this moment, weighted by its size and nearness
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (let k = -4; k <= 4; k++) {
      const [ax, ay, area] = rawAnchorAt(ctx, cut, Math.max(cut.from, Math.min(cut.to - 1e-3, songT + (k / 4) * AIM_SPAN)));
      if (area <= 0) continue;
      const wt = Math.sqrt(area) * (1 - Math.abs(k) / 5);
      sx += ax * wt;
      sy += ay * wt;
      sw += wt;
    }
    if (sw > 0) {
      cx = sx / sw;
      cy = sy / sw;
    }
  }
  return { x0: Math.max(0, Math.min(1 - fx, cx - fx / 2)), y0: Math.max(0, Math.min(1 - fy, cy - fy / 2)), fx, fy };
};
/** the subject in the cut's window: [cx, cy, area] in window fractions (the centre when unknown) */
const anchorAt = (ctx: Ctx, cut: ResolvedCut, songT: number): [number, number, number] => {
  const a = rawAnchorAt(ctx, cut, songT);
  const v = viewAt(ctx, cut, songT);
  return a[2] > 0 && v !== FULL ? [(a[0] - v.x0) / v.fx, (a[1] - v.y0) / v.fy, a[2] / (v.fx * v.fy)] : a;
};
/** which way the subject moves at the end of a cut: a unit vector in window space and its main axis
 *  (from the anchors over the last 0.15 s; sideways when unknown or still) */
const motionAt = (ctx: Ctx, cut: ResolvedCut): { dx: number; dy: number; axis: 'h' | 'v' } => {
  const [x1, y1] = anchorAt(ctx, cut, cut.to);
  const [x0, y0] = anchorAt(ctx, cut, Math.max(cut.from, cut.to - 0.15));
  const vx = x1 - x0;
  const vy = (y1 - y0) * (ctx.win.h / ctx.win.w);
  const n = Math.hypot(vx, vy);
  if (n < 0.004) return { dx: 1, dy: 0, axis: 'h' };
  return { dx: vx / n, dy: vy / n, axis: Math.abs(vx) >= Math.abs(vy) ? 'h' : 'v' };
};
/** the subject's box [x0, y0, x1, y1] in window fractions at a song time (the middle third when unknown) */
const boxAt = (ctx: Ctx, cut: ResolvedCut, songT: number): [number, number, number, number] => {
  const a = cut.matte ? ctx.anchors[cut.matte.key] : undefined;
  if (!a) return [0.4, 0.2, 0.6, 0.9];
  const fps = ctx.footage.sources[cut.source]?.matteFps ?? 24;
  const r = a[Math.max(0, Math.min(a.length - 1, Math.round((sourceTime(cut, songT - cut.from) - cut.matte!.in) * fps)))];
  if (r[2] <= 0.005) return [0.4, 0.2, 0.6, 0.9];
  const v = viewAt(ctx, cut, songT);
  const m = (x: number, o: number, f: number) => Math.max(0, Math.min(1, (x - o) / f));
  return [m(r[3], v.x0, v.fx), m(r[4], v.y0, v.fy), m(r[5], v.x0, v.fx), m(r[6], v.y0, v.fy)];
};
/** the height text is sized against: the window's, but no more than a landscape frame's of the same
 *  width (a vertical frame is tall, its words are not) */
const typeH = (ctx: Ctx) => Math.min(ctx.win.h, ctx.win.w * 0.75);

// ------------------------------------------------------------------ media

/**
 * A video frame at an exact time (so speed ramps and holds are just different times): frozen on
 * frame 0 with the time in `startFrom`. Not <Freeze frame={t·fps}>: in a render Remotion clamps the
 * timeline position (freeze frame + the nearest Sequence's start) to the composition's length, which
 * silently showed late source frames from the wrong time. For the same reason the Freeze sits in a
 * Sequence of its own: a cut's Sequence starts at its song time, and in a short (the song shifted by
 * ProjectDefinition.window) that lies past the composition's end, where the clamped position showed
 * the wrong frame or nothing at all.
 */
const Frame: React.FC<{ src: string; t: number; transparent?: boolean; exact?: boolean; style?: React.CSSProperties }> = ({ src, t, transparent, exact, style }) => {
  const { fps } = useVideoConfig();
  // `exact`: the time as it is (slow motion from a high-fps plate needs the frames between ours)
  return (
    <Sequence layout="none">
      <Freeze frame={0}>
        <OffthreadVideo src={src} startFrom={Math.max(0, exact ? t * fps : Math.round(t * fps))} muted transparent={transparent} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }} />
      </Freeze>
    </Sequence>
  );
};
const plateSrc = (ctx: Ctx, source: string) => staticFile(`${ctx.slug}/${ctx.footage.sources[source].plate}`);
/** slow motion plays from the shot's 60 fps interpolated clip (scripts/remix.ts step 6), at a time
 *  snapped a quarter frame past one of its frames, so no frame shows twice */
const SLOW_FPS = 60;
const slowClip = (ctx: Ctx, cut: ResolvedCut, srcT: number) => {
  const clip = cut.rate < 1 ? ctx.footage.slow?.[cut.src] : undefined;
  if (!clip) return null;
  const t = srcT - ctx.footage.shots[cut.src][0];
  return { src: staticFile(`${ctx.slug}/${clip}`), t: (Math.round(t * SLOW_FPS) + 0.25) / SLOW_FPS };
};
const matteSrc = (ctx: Ctx, key: string) => staticFile(`${ctx.slug}/derived/shotmattes/${key}.webm`);
/** the wide picture (plate or cutout) cropped to the view's part, inside an element the window's size:
 *  an image wider than its window would shift the warp and blur filters' pixel space and get clipped */
const placed = (v: View): React.CSSProperties =>
  v === FULL ? {} : { objectFit: 'cover', objectPosition: `${v.fx < 1 ? (v.x0 / (1 - v.fx)) * 100 : 50}% ${v.fy < 1 ? (v.y0 / (1 - v.fy)) * 100 : 50}%` };
/** a band cut's own window: a box across the vertical frame, centred on its `y` */
const bandWin = (ctx: Ctx, cut: ResolvedCut) => {
  const { y, h } = ctx.bands.get(cut.id)!;
  return { x: 0, y: Math.max(0, Math.min(ctx.frame.h - h, y * ctx.frame.h - h / 2)), w: ctx.frame.w, h };
};
const bandCtx = (ctx: Ctx, cut: ResolvedCut): Ctx => (ctx.bands.has(cut.id) ? { ...ctx, win: bandWin(ctx, cut) } : ctx);

/** zoom blur: the layer plus copies scaled out from the origin, fading */
const ZoomBlur: React.FC<{ amount: number; ox: number; oy: number; children: React.ReactNode }> = ({ amount, ox, oy, children }) => {
  if (amount < 0.02) return <>{children}</>;
  const n = 6;
  return (
    <>
      {children}
      {Array.from({ length: n }, (_, k) => (
        <AbsoluteFill key={k} style={{ transform: `scale(${1 + (k + 1) * 0.06 * amount})`, transformOrigin: `${ox}px ${oy}px`, opacity: 0.4 * (1 - k / n) * Math.min(1, amount * 1.6) }}>
          {children}
        </AbsoluteFill>
      ))}
    </>
  );
};

/**
 * The lens-bulge map for the warp filters (remix-warp1…6): a displacement image whose red/green
 * channels pull every pixel toward the centre, most at mid-radius, so the middle of the picture
 * swells like a speaker cone. Drawn once on a canvas (the render runs in Chrome).
 */
const bulgeMap = (w: number, h: number): string => {
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const f = Math.max(0, 1 - (dx * dx + dy * dy) / 1.4);
      const i = (y * w + x) * 4;
      img.data[i] = 128 - 127 * dx * f;
      img.data[i + 1] = 128 - 127 * dy * f;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
};
// kept under ~360 px: the map is 8-bit, so stronger pulls show steps
const WARP_PX = [0, 50, 110, 170, 230, 290, 360];
const warpLevel = (x: number) => Math.max(0, Math.min(6, Math.round(x * 6)));
// the liquid melt: the strongest pull (px, horizontal; vertical pulls are 45 % of it) and the overscan
// that keeps the pulled-in edges out of the window
const LIQ_MAX = 160;
const LIQ_OVER = 0.08;
const sineInOut = Easing.inOut(Easing.sin);
/** how long a gfx.reverb echo rings (s) */
const RV_LIFE = 1.2;

/**
 * gfx.reverb at `song`: the range's fade in and out, its centre, and the vocal onsets still ringing as
 * [age (s), strength, onset time]. The picture does the rest in Shot (quicksilverxkingpin v3: drawn rings
 * "look like some animation on top of the video"; the effect has to be the picture's own).
 */
const reverbAt = (m: Manifest, ranges: Gfx['reverb'], song: number) => {
  for (const r of ranges ?? []) {
    const a = beatTime(m as never, r.from);
    const b = beatTime(m as never, r.to);
    if (song < a || song >= b) continue;
    const fade = Math.min(clamp01((song - a) / 0.25), clamp01((b - song) / 0.35));
    const hits = (m.onsets?.vocal ?? [])
      .filter(([t, s]) => t >= a - 0.05 && t <= song && s >= 0.3 && song - t < RV_LIFE)
      .map(([t, s]) => [song - t, Math.min(1, s), t] as [number, number, number]);
    return { fade, at: r.at ?? ([0.5, 0.5] as [number, number]), hits };
  }
  return null;
};

// ------------------------------------------------------------------ words

type Fitted = { lines: { text: string; at: number }[][]; size: number };
const fitWords = (rt: ResolvedText, family: string, maxW: number, maxH: number, track: number): Fitted => {
  const lh = 0.9;
  const one = (ws: { text: string; at: number }[]) => ws.map(x => x.text).join(' ');
  const sizeFor = (lines: { text: string; at: number }[][]) => {
    const widest = Math.max(...lines.map(l => measure(one(l), family, 100, track)));
    return Math.min((maxW / widest) * 100, maxH / (lines.length * lh));
  };
  let best: Fitted = { lines: [rt.words], size: sizeFor([rt.words]) };
  for (let k = 1; k < rt.words.length; k++) {
    const two = [rt.words.slice(0, k), rt.words.slice(k)];
    const s = sizeFor(two);
    if (s > best.size * 1.15) best = { lines: two, size: s };
  }
  return best;
};

/** cue.split: a big word parted around the subject (quicksilverxkingpin rev-005, EARS → YEARS): the first
 *  `split` letters left of its cutout, the rest right of it, the letters about as tall as the subject
 *  (within the room on each side), its box smoothed over ±0.1 s so the parts keep beside it as it moves.
 *  With act 'push' the left part slides in from the frame's edge at `pushAt`. */
const SplitWord: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number; outline?: boolean; cut: ResolvedCut; family: string; color: string; pushAge?: number }> = ({ ctx, rt, song, outline, cut, family, color, pushAge }) => {
  const { w, h } = ctx.win;
  const text = rt.words.map(x => x.text).join(' ');
  const parts = [text.slice(0, rt.cue.split), text.slice(rt.cue.split)];
  const ds = [-0.1, -0.05, 0, 0.05, 0.1];
  const [x0, y0, x1, y1] = ds.reduce<number[]>(
    (acc, d) => boxAt(ctx, cut, Math.max(cut.from, Math.min(cut.to - 1e-3, song + d))).map((v, k) => acc[k] + v / ds.length),
    [0, 0, 0, 0],
  );
  const gap = 0.025;
  const room = (s: string, frac: number, extra = 0) => (s ? (Math.max(0.05, frac) * w) / (measure(s, family, 100) / 100 + extra) : Infinity);
  // the room on each side keeps a margin from the frame's edge as wide as two gaps (and, with 'push', for the shove)
  const size = Math.max(typeH(ctx) * 0.12, Math.min(((y1 - y0) * h) / 0.95, room(parts[1], 1 - x1 - 3 * gap, rt.cue.act === 'push' ? 0.3 : 0), room(parts[0], x0 - 3 * gap)));
  const at = rt.words[0]?.at ?? rt.from;
  const p = prog(song, at, at + 0.12);
  const pa = pushAge ?? (song - at);
  const slide = rt.cue.act === 'push' ? 1 - Easing.out(Easing.cubic)(clamp01(pa / 0.16)) : 0;
  // the Y lands on his left and shoves the rest along to the right (rev-006: "ears being pushed to right")
  const shove = rt.cue.act === 'push' && pa > 0 ? Easing.out(Easing.back(2.2))(clamp01((pa - 0.08) / 0.18)) * size * 0.3 : 0;
  const style = (k: number): React.CSSProperties => ({
    position: 'absolute', top: ((y0 + y1) / 2) * h, left: (k ? x1 + gap : x0 - gap) * w, whiteSpace: 'nowrap',
    transform: `translate(${k ? 0 : -100}%, -50%)${k ? ` translateX(${shove.toFixed(1)}px) translateY(${((1 - p) * 0.06).toFixed(3)}em) scale(${(1.14 - 0.14 * p).toFixed(3)})` : ` translateX(${(-slide * (x0 * w + size)).toFixed(1)}px)`}`,
    visibility: (k ? song >= at - 1e-3 : pa > 0) ? 'visible' : 'hidden',
    filter: !k && slide > 0.02 ? `blur(${(slide * size * 0.05).toFixed(1)}px)` : undefined,
    fontFamily: family, fontSize: size, lineHeight: 0.9, color: outline ? 'transparent' : color,
    WebkitTextStroke: outline ? `${Math.max(2, size * 0.006)}px ${color}` : undefined, opacity: outline ? 0.85 : 1,
  });
  return <>{parts.map((s, k) => (s ? <div key={k} style={style(k)}>{s}</div> : null))}</>;
};

/** big punch words: behind the subject (outline = the same words as a stroke over the subject). cue.pos
 *  moves them off the centre into the top or bottom band ('t…' / 'b…') and the left or right half
 *  ('…l' / '…r'), smaller, where two faces share the frame and a centred word would cover one */
const BigWords: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number; front?: boolean; outline?: boolean; cut?: ResolvedCut }> = ({ ctx, rt, song, front, outline, cut }) => {
  const { fonts } = ctx.theme;
  const { w, h } = ctx.win;
  const pos = rt.cue.pos ?? 'c';
  const vy = pos.startsWith('t') ? 0.25 : pos.startsWith('b') ? 0.75 : 0.5;
  const hx = pos.endsWith('l') ? 0.3 : pos.endsWith('r') ? 0.7 : 0.5;
  const family = rt.cue.font === 'script' ? (fonts.script ?? fonts.punch) : fonts.punch;
  const fit = useMemo(() => fitWords(rt, family, w * (front ? 0.72 : 0.88) * (hx === 0.5 ? 1 : 0.5), typeH(ctx) * (front ? 0.5 : 0.8) * (vy === 0.5 ? 1 : 0.5), 0.01), [rt, w, h, family]);
  const color = colorOf(ctx.theme, rt.cue.color);
  // cue.follow: carried by the subject — the move of its cutout's centre since the word landed on this cut,
  // smoothed over ±0.1 s so the word glides with the dance instead of jittering
  let fx = 0;
  let fy = 0;
  if (rt.cue.follow && cut?.matte) {
    const near = (s: number) => {
      const ds = [-0.1, -0.05, 0, 0.05, 0.1];
      const sum = ds.reduce((acc, d) => {
        const a = anchorAt(ctx, cut, Math.max(cut.from, Math.min(cut.to - 1e-3, s + d)));
        return [acc[0] + a[0], acc[1] + a[1]];
      }, [0, 0]);
      return sum.map(v => v / ds.length);
    };
    const [x0, y0] = near(Math.max(rt.from, cut.from));
    const [x1, y1] = near(song);
    fx = (x1 - x0) * w;
    fy = (y1 - y0) * h;
  }
  const pushAge = rt.cue.act === 'push' && rt.cue.pushAt !== undefined ? song - beatTime(ctx.manifest as never, rt.cue.pushAt) : undefined;
  if (rt.cue.split !== undefined && cut) return <SplitWord ctx={ctx} rt={rt} song={song} outline={outline} cut={cut} family={family} color={color} pushAge={pushAge} />;
  return (
    <div
      style={{
        position: 'absolute', left: w * hx, top: h * vy, transform: `translate(-50%, -50%)${fx || fy ? ` translate(${fx.toFixed(1)}px, ${fy.toFixed(1)}px)` : ''}`, width: w, textAlign: 'center',
        fontFamily: family, fontSize: fit.size, lineHeight: rt.cue.font === 'script' ? 1.15 : 0.9, color: outline ? 'transparent' : color, whiteSpace: 'nowrap',
        // a script's hairlines vanish on a busy picture: thicken them a little and give them a soft glow
        WebkitTextStroke: outline ? `${Math.max(2, fit.size * (rt.cue.font === 'script' ? 0.01 : 0.006))}px ${color}` : rt.cue.font === 'script' ? `${(fit.size * 0.014).toFixed(1)}px ${color}` : undefined,
        opacity: outline ? 0.85 : 1,
        textShadow: front && !outline ? '0 8px 40px rgba(0,0,0,0.5)' : rt.cue.font === 'script' && !outline ? `0 0 ${(fit.size * 0.06).toFixed(1)}px rgba(0,0,0,0.55), 0 0 ${(fit.size * 0.03).toFixed(1)}px ${color}` : undefined,
      }}
    >
      {fit.lines.map((line, li) => (
        <div key={li}>
          {line.map((wd, wi) => {
            const p = prog(song, wd.at, wd.at + 0.12);
            const glyph = rt.cue.drawX && GLYPHS[wd.text];
            // a drawn glyph after a word (TASK ✓) starts as that word lands; acts that enter on their own skip the pop
            const at = glyph && (wi > 0 || li > 0) ? wd.at + 0.14 : wd.at;
            const own = rt.cue.act === 'streak' || rt.cue.act === 'stamp' || rt.cue.act === 'slide';
            return (
              <span key={wi} style={{ display: 'inline-block', visibility: song >= wd.at - 1e-3 ? 'visible' : 'hidden', transform: own || glyph ? undefined : `translateY(${(1 - p) * 0.06}em) scale(${1.14 - 0.14 * p})`, marginRight: wi < line.length - 1 ? '0.2em' : 0 }}>
                {glyph ? (
                  <DrawnX glyph={wd.text} at={at} song={song} color={color} outline={outline} />
                ) : rt.cue.act ? (
                  <ActWord text={wd.text} act={rt.cue.act} age={song - wd.at} seed={`${rt.i}${wd.text}`} color={color} outline={outline} pushAge={pushAge} family={family} px={fit.size} />
                ) : rt.cue.el && rt.words.length === 1 ? (
                  <ElementWord ctx={ctx} text={wd.text} el={rt.cue.el} outline={outline} />
                ) : (
                  wd.text
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** cue.drawX: the glyph words "X", "✓" and "▶" drawn as pen strokes, stroke after stroke (CROSS ME → X ME,
 *  TASK ✓, PLAY ▶); as tall as the capitals around them, as heavy as the punch font. The outline pass over
 *  the subject draws the strokes thin. */
const GLYPHS: Record<string, string[]> = {
  X: ['M0.08,0.06 L0.7,0.8', 'M0.7,0.06 L0.08,0.8'],
  '✓': ['M0.06,0.46 L0.3,0.74 L0.76,0.06'],
  '▶': ['M0.14,0.08 L0.72,0.43 L0.14,0.78 Z'],
};
const DrawnX: React.FC<{ glyph?: string; at: number; song: number; color: string; outline?: boolean }> = ({ glyph = 'X', at, song, color, outline }) => {
  const strokes = GLYPHS[glyph] ?? GLYPHS.X;
  const len = 1.15; // each stroke's length in em, dash units
  const sw = outline ? 0.012 : 0.15;
  const fill = glyph === '▶' && !outline ? prog(song, at + 0.22, at + 0.4) : 0;
  return (
    <svg width="0.78em" height="0.86em" viewBox="0 0 0.78 0.86" style={{ display: 'inline-block', verticalAlign: '-0.06em', overflow: 'visible' }}>
      {strokes.map((d, k) => {
        const p = prog(song, at + k * 0.11, at + k * 0.11 + (glyph === 'X' ? 0.13 : 0.22), Easing.out(Easing.quad));
        return (
          <path key={k} d={d} pathLength={len} fill={fill > 0 ? color : 'none'} fillOpacity={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={len} strokeDashoffset={len * (1 - p)} opacity={outline ? 0.85 : 1} />
        );
      })}
    </svg>
  );
};

/**
 * cue.act: the word acts out what it says (quicksilverxkingpin rev-003: "that cross me was excellent, think
 * of ideas like that"). `age` is the time since the word landed. Big words draw it in both passes (the solid
 * word behind the subject and its outline over it), so everything here is a pure function of time and the
 * two stay aligned; the extras drawn on top (a bullet, a slash, an eraser) only in the solid pass.
 */
type Act = NonNullable<TextCue['act']>;
const ActWord: React.FC<{ text: string; act: Act; age: number; seed: string; color: string; outline?: boolean; pushAge?: number; family?: string; px?: number }> = ({ text, act, age, seed, color, outline, pushAge, family, px = 200 }) => {
  const letters = [...text];
  const n = letters.length;
  const mid = (n - 1) / 2;
  const rnd = (k: string) => random(`${seed}${k}`);
  const each = (style: (i: number) => React.CSSProperties) =>
    letters.map((ch, i) => <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', ...style(i) }}>{ch}</span>);
  const box: React.CSSProperties = { position: 'relative', display: 'inline-block' };
  switch (act) {
    case 'hop': // each letter hops in turn, twice
      return <>{each(i => {
        let y = 0;
        for (const t0 of [0.04, 0.4]) {
          const t = (age - t0 - i * 0.05) / 0.2;
          if (t > 0 && t < 1) y = Math.min(y, -4 * t * (1 - t) * 0.3);
        }
        return { transform: `translateY(${y.toFixed(3)}em)` };
      })}</>;
    case 'drop': // a moment after landing the letters fall away one by one, tumbling
      return <>{each(i => {
        const t = age - 0.32 - i * 0.07;
        if (t <= 0) return {};
        const y = 13 * t * t;
        return { transform: `translateY(${y.toFixed(3)}em) rotate(${((rnd(`d${i}`) - 0.5) * 90 * t).toFixed(1)}deg)`, opacity: clamp01(1.3 - y / 3) };
      })}</>;
    case 'dodge': { // a bullet streak crosses; the letters jump out of its way and settle back
      const bump = (t: number) => (t <= 0 ? 0 : t < 0.05 ? t / 0.05 : Math.max(0, 1 - (t - 0.05) / 0.28) ** 2);
      const shot = clamp01((age - 0.08) / 0.12);
      return (
        <span style={box}>
          {each(i => ({ transform: `translateY(${((i % 2 ? 1 : -1) * 0.38 * bump(age - 0.08 - (i / Math.max(1, n - 1)) * 0.1)).toFixed(3)}em)` }))}
          {!outline && shot > 0 && shot < 1 && (
            <span style={{ position: 'absolute', top: '48%', left: `${-20 + 140 * shot}%`, width: '45%', height: '0.035em', transform: 'translateX(-100%)', background: `linear-gradient(90deg, transparent, #fff)`, boxShadow: `0 0 0.12em ${color}` }} />
          )}
        </span>
      );
    }
    case 'slice': { // a slash, then the word slides apart in two along it
      const cut = 0.16;
      const s = Easing.out(Easing.cubic)(clamp01((age - cut) / 0.18));
      const top = 'polygon(0 0, 100% 0, 100% 34%, 0 74%)';
      const bottom = 'polygon(0 74%, 100% 34%, 100% 100%, 0 100%)';
      const flash = age > cut ? Math.exp(-(age - cut) * 8) : 0;
      return (
        <span style={box}>
          <span style={{ visibility: 'hidden' }}>{text}</span>
          <span style={{ position: 'absolute', left: 0, top: 0, clipPath: age > cut ? top : undefined, transform: `translate(${(-0.16 * s).toFixed(3)}em, ${(-0.2 * s).toFixed(3)}em) rotate(${(-3.5 * s).toFixed(2)}deg)` }}>{text}</span>
          {age > cut && <span style={{ position: 'absolute', left: 0, top: 0, clipPath: bottom, transform: `translate(${(0.16 * s).toFixed(3)}em, ${(0.2 * s).toFixed(3)}em) rotate(${(3.5 * s).toFixed(2)}deg)` }}>{text}</span>}
          {!outline && flash > 0.03 && (
            <span style={{ position: 'absolute', left: '-15%', top: '54%', width: '130%', height: '0.06em', background: '#fff', opacity: flash, transform: 'rotate(-17deg)', boxShadow: `0 0 0.25em ${color}, 0 0 0.06em #fff` }} />
          )}
        </span>
      );
    }
    case 'bite': { // a bite chomped out of the end of the word
      const b = clamp01((age - 0.3) / 0.06);
      if (b <= 0) return <>{text}</>;
      const r = 0.36 * b;
      const mask = [[91, -8], [100, 20], [103, 52]].map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, transparent ${r.toFixed(3)}em, #000 ${(r + 0.01).toFixed(3)}em)`).join(', ');
      return <span style={{ ...box, WebkitMaskImage: mask, maskImage: mask, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' } as React.CSSProperties}>{text}</span>;
    }
    case 'stamp': { // slams down like a rubber stamp, a frame around it, a jolt as it lands
      const e = Easing.in(Easing.quad)(clamp01(age / 0.09));
      const jolt = age > 0.09 ? Math.sin((age - 0.09) * 90) * Math.exp(-(age - 0.09) * 18) * 0.03 : 0;
      return (
        <span style={{ ...box, padding: '0.04em 0.2em', border: `${outline ? '0.012em' : '0.07em'} solid ${color}`, borderRadius: '0.06em', transform: `translate(${jolt.toFixed(3)}em, ${(jolt * 0.6).toFixed(3)}em) rotate(-7deg) scale(${(2.2 - 1.2 * e).toFixed(3)})`, opacity: 0.25 + 0.75 * e }}>
          {text}
        </span>
      );
    }
    case 'shake': { // trembles, red-hot
      const a = 0.045 * (0.7 + 0.3 * Math.sin(age * 9));
      return (
        <span style={{ ...box, transform: `translate(${(wobble(`${seed}x`, age * 3) * a).toFixed(3)}em, ${(wobble(`${seed}y`, age * 3) * a).toFixed(3)}em) rotate(${(wobble(`${seed}r`, age * 3) * 2.5).toFixed(2)}deg)`, textShadow: outline ? undefined : `0 0 ${(0.1 + 0.08 * Math.sin(age * 14)).toFixed(3)}em ${color}, 0 0 0.35em rgba(255,60,20,0.55)` }}>
          {text}
        </span>
      );
    }
    case 'erase': { // wiped away from the left, the eraser's soft edge running ahead of it
      const x = 100 * Easing.inOut(Easing.cubic)(clamp01((age - 0.45) / 0.4));
      return (
        <span style={box}>
          <span style={{ display: 'inline-block', clipPath: x > 0 ? `inset(0 0 0 ${x.toFixed(1)}%)` : undefined }}>{text}</span>
          {!outline && x > 0 && x < 100 && <span style={{ position: 'absolute', top: '-8%', bottom: '-8%', left: `${x}%`, width: '0.35em', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)', filter: 'blur(0.03em)' }} />}
        </span>
      );
    }
    case 'gauge': { // the word is an empty gauge that fills up from the bottom
      const f = Easing.out(Easing.cubic)(clamp01((age - 0.05) / 0.6));
      return (
        <span style={box}>
          <span style={{ opacity: outline ? 1 : 0.28 }}>{text}</span>
          <span style={{ position: 'absolute', left: 0, top: 0, clipPath: `inset(${(100 * (1 - f)).toFixed(1)}% 0 0 0)`, textShadow: outline ? undefined : `0 0 0.15em ${color}` }}>{text}</span>
        </span>
      );
    }
    case 'streak': { // races in from the left with afterimages trailing, like he ran it there
      const xAt = (t: number) => -((1 - clamp01(t / 0.16)) ** 3) * 4;
      const x = xAt(age);
      const ghosts = [3, 2, 1].map(g => ({ g, x: xAt(age - 0.035 * g) })).filter(k => Math.abs(k.x - x) > 0.05);
      return (
        <span style={box}>
          {ghosts.map(({ g, x: gx }) => <span key={g} style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${gx.toFixed(3)}em)`, opacity: 0.35 / g, filter: 'blur(0.03em)' }}>{text}</span>)}
          <span style={{ display: 'inline-block', transform: `translateX(${x.toFixed(3)}em)`, filter: Math.abs(x) > 0.05 ? `blur(${Math.min(0.06, Math.abs(x) * 0.03).toFixed(3)}em)` : undefined }}>{text}</span>
        </span>
      );
    }
    case 'explode': // bursts apart in slow motion: the letters lift off their surface and drift apart, turning, glowing
      return <>{each(i => {
        const e = Easing.out(Easing.quad)(clamp01((age - 0.22) / 1.8));
        const dx = (i - mid) * 0.5 * e + (rnd(`x${i}`) - 0.5) * 0.5 * e;
        const dy = -(0.15 + 0.5 * rnd(`y${i}`)) * e;
        return {
          transform: `translate3d(${dx.toFixed(3)}em, ${dy.toFixed(3)}em, ${(e * (0.6 + 0.8 * rnd(`z${i}`))).toFixed(3)}em) rotateX(${((rnd(`a${i}`) - 0.5) * 140 * e).toFixed(1)}deg) rotateZ(${((rnd(`c${i}`) - 0.5) * 70 * e).toFixed(1)}deg)`,
          opacity: 1 - clamp01((age - 1.7) / 0.5),
          textShadow: outline ? undefined : `0 0 ${(0.05 + 0.25 * e).toFixed(3)}em rgba(255,170,60,${(0.4 + 0.5 * e).toFixed(2)})`,
          transformStyle: 'preserve-3d',
        };
      })}</>;
    case 'dissolve': // letter by letter from the end, each blurs, rises and is gone
      return <>{each(i => {
        const p = clamp01((age - 0.55 - (n - 1 - i) * 0.08) / 0.38);
        return p > 0 ? { opacity: 1 - p, filter: `blur(${(p * 0.12).toFixed(3)}em)`, transform: `translateY(${(-0.3 * p).toFixed(3)}em) scale(${(1 + 0.15 * p).toFixed(3)})` } : {};
      })}</>;
    case 'twinkle': // the letters flicker like stars
      return <>{each(i => {
        const r = rnd(`t${i}`);
        const b = 0.5 + 0.5 * Math.sin(age * (5 + 6 * r) + 6.283 * r);
        return { opacity: 0.45 + 0.55 * b, textShadow: outline ? undefined : `0 0 ${(0.05 + 0.2 * b).toFixed(3)}em ${color}, 0 0 0.02em #fff` };
      })}</>;
    case 'push': { // all but the first letter, centred; the first slides in late and shoves the rest along
      const [head, ...rest] = letters;
      const hw = family ? measure(head, family, 100) / 100 : 0.5;
      const pa = pushAge ?? -1;
      const headX = pa <= 0 ? -4 : -4 * (1 - Easing.out(Easing.cubic)(clamp01(pa / 0.16)));
      const tailX = -(hw / 2) * (1 - Easing.out(Easing.back(2.2))(clamp01((pa - 0.1) / 0.16)));
      const moving = pa > 0 && pa < 0.16;
      return (
        <span style={box}>
          <span style={{ display: 'inline-block', opacity: pa > 0 ? 1 : 0, transform: `translateX(${headX.toFixed(3)}em)`, filter: moving ? `blur(${(0.05 * (1 - pa / 0.16)).toFixed(3)}em)` : undefined }}>{head}</span>
          <span style={{ display: 'inline-block', transform: `translateX(${tailX.toFixed(3)}em)` }}>{rest.join('')}</span>
        </span>
      );
    }
    case 'glitch': { // lands torn: a colour split and a slice shifted sideways, flickering out, with one more skip
      const g = Math.exp(-Math.max(0, age) * 6) + (age > 0.62 && age < 0.72 ? 0.55 : 0);
      const f = Math.floor(age * 30);
      const dx = (rnd(`gx${f}`) - 0.5) * 0.12 * g;
      if (outline || g < 0.04) return <span style={{ ...box, transform: `translateX(${dx.toFixed(3)}em)` }}>{text}</span>;
      const y0 = 15 + 55 * rnd(`gy${f}`);
      const split = 0.07 * g;
      return (
        <span style={{ ...box, transform: `translateX(${dx.toFixed(3)}em)` }}>
          <span style={{ position: 'absolute', left: 0, top: 0, color: '#ff3d6e', opacity: 0.75 * Math.min(1, g), transform: `translateX(${(-split).toFixed(3)}em)`, mixBlendMode: 'screen' }}>{text}</span>
          <span style={{ position: 'absolute', left: 0, top: 0, color: '#3de8ff', opacity: 0.75 * Math.min(1, g), transform: `translateX(${split.toFixed(3)}em)`, mixBlendMode: 'screen' }}>{text}</span>
          <span style={{ display: 'inline-block', clipPath: `polygon(0 0, 100% 0, 100% ${y0}%, 0 ${y0}%, 0 ${y0 + 14}%, 100% ${y0 + 14}%, 100% 100%, 0 100%)` }}>{text}</span>
          <span style={{ position: 'absolute', left: 0, top: 0, clipPath: `inset(${y0}% 0 ${100 - y0 - 14}% 0)`, transform: `translateX(${((rnd(`gs${f}`) - 0.5) * 0.4 * g).toFixed(3)}em)` }}>{text}</span>
        </span>
      );
    }
    case 'shiver': // trembles letter by letter, then calms
      return <>{each(i => {
        const a = 0.005 + 0.04 * Math.exp(-Math.max(0, age) * 2.4);
        const t = age * 38;
        return {
          transform: `translate(${(Math.sin(t * 1.3 + rnd(`s${i}`) * 6) * a).toFixed(4)}em, ${(Math.cos(t + rnd(`v${i}`) * 6) * a * 0.7).toFixed(4)}em)`,
          textShadow: outline ? undefined : `0 0 ${(0.02 + 0.1 * Math.exp(-Math.max(0, age) * 1.5)).toFixed(3)}em ${color}`,
        };
      })}</>;
    case 'drift': // the letters float apart, weightless, bobbing and turning
      return <>{each(i => {
        const t = Math.max(0, age);
        return {
          transform: `translate(${((i - mid) * 0.05 * t).toFixed(3)}em, ${(Math.sin(t * 1.7 + i * 0.8) * 0.07 - 0.04 * t).toFixed(3)}em) rotate(${(Math.sin(t * 1.3 + i) * 5).toFixed(2)}deg)`,
        };
      })}</>;
    case 'slide': { // fades in sliding a little to the left, then keeps gliding that way
      const t = Math.max(0, age);
      const x = 0.3 * (1 - Easing.out(Easing.cubic)(clamp01(t / 0.55))) - 0.05 * t;
      return <span style={{ ...box, opacity: clamp01(t / 0.14), transform: `translateX(${x.toFixed(3)}em)` }}>{text}</span>;
    }
    case 'twist': // the letters spin into place one after another, the way the spin cut turns the frame
      return <>{each(i => {
        const p = Easing.out(Easing.back(1.6))(clamp01((age - i * 0.035) / 0.32));
        return { transform: `rotate(${((1 - p) * -140).toFixed(1)}deg) scale(${(0.4 + 0.6 * p).toFixed(3)})`, opacity: clamp01((age - i * 0.035) / 0.08) };
      })}</>;
    case 'liquid': { // the letters melt and waver, more and more, as if getting high
      const t = Math.max(0, age);
      const id = `remix-liquid-${seed.replace(/\W/g, '')}${outline ? 'o' : ''}`;
      // waves a little over a letter wide and a third of one tall (sized to the letters), swelling as it goes on
      const amp = (0.03 + 0.2 * Easing.inOut(Easing.quad)(clamp01(t / 1.4))) * px;
      return (
        <span style={{ ...box, filter: `url(#${id})` }}>
          <svg width={0} height={0} style={{ position: 'absolute' }}>
            <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency={`${((0.9 + 0.25 * Math.sin(t * 1.9)) / px).toFixed(5)} ${((2.6 + 0.6 * Math.cos(t * 1.4)) / px).toFixed(5)}`} numOctaves={1} seed={3} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={amp.toFixed(1)} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </svg>
          {text}
        </span>
      );
    }
  }
  return <>{text}</>;
};

/** a big word with some letters in a periodic-table element box (cue.el): the accent-filled box with a
 *  light inner border, the atomic number top left, the symbol in its own case ("Na"); the outline pass
 *  over the subject draws only the box's border */
const ElementWord: React.FC<{ ctx: Ctx; text: string; el: [number, number, number]; outline?: boolean }> = ({ ctx, text, el: [at, len, n], outline }) => {
  const { colors, fonts } = ctx.theme;
  const sym = text.slice(at, at + len);
  return (
    <>
      {text.slice(0, at)}
      <span
        style={{
          position: 'relative', display: 'inline-block', padding: '0.05em 0.08em 0.02em', margin: '0 0.05em',
          background: outline ? 'transparent' : colors.red, color: outline ? 'transparent' : colors.bone,
          boxShadow: outline ? `inset 0 0 0 0.02em ${colors.bone}` : `inset 0 0 0 0.022em color-mix(in srgb, ${colors.bone} 55%, transparent), 0 0.04em 0.3em rgba(0,0,0,0.45)`,
        }}
      >
        {!outline && (
          <span style={{ position: 'absolute', left: '0.1em', top: '0.08em', fontFamily: fonts.data, fontSize: '0.14em', lineHeight: 1, letterSpacing: 0, color: colors.bone, WebkitTextStroke: 0 }}>{n}</span>
        )}
        {sym.charAt(0) + sym.slice(1).toLowerCase()}
      </span>
      {text.slice(at + len)}
    </>
  );
};

/**
 * 'flank': the first word left of the subject, the rest right of it, drawn behind the subject (its
 * cutout goes over them): small caps in the line font (Michroma here) with very wide letter spacing,
 * the way a channel signs off (rev-002: "tiny, with letter spacing a lot"). Placed from the subject's
 * box when the cue starts, letters closing in from wider spacing as they arrive.
 */
const FlankWords: React.FC<{ ctx: Ctx; rt: ResolvedText; cut: ResolvedCut; song: number }> = ({ ctx, rt, cut, song }) => {
  const { fonts } = ctx.theme;
  const { w, h } = ctx.win;
  const [first, ...rest] = rt.words.map(x => x.text);
  const right = rest.join(' ');
  const track = rt.cue.track ?? 1.1;
  const [x0, , x1] = rt.cue.box ? [rt.cue.box[0], 0, rt.cue.box[1]] : boxAt(ctx, cut, Math.max(rt.from, cut.from));
  const gap = w * 0.035;
  const margin = w * 0.05;
  const size = useMemo(() => {
    const room = (word: string, space: number) => (space / Math.max(1, measure(word, fonts.sign ?? fonts.line, 100, track))) * 100;
    return Math.min(typeH(ctx) * (rt.cue.size ?? 0.045), room(first, x0 * w - gap - margin), room(right, (1 - x1) * w - gap - margin));
  }, [first, right, x0, x1, w, h, track, rt.cue.size]);
  const p = prog(song, rt.from, rt.from + 0.7);
  const color = colorOf(ctx.theme, rt.cue.color);
  const style = (align: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute', top: h * (rt.cue.box?.[2] ?? 0.5), transform: `translateY(-50%)`, fontFamily: fonts.sign ?? fonts.line, fontSize: size, lineHeight: 1,
    letterSpacing: `${track + (1 - p) * 0.8}em`, color, opacity: p, whiteSpace: 'nowrap', textAlign: align,
    filter: p < 0.98 ? `blur(${(1 - p) * 8}px)` : undefined,
    // set by hand over a busy picture (a crowd, a lawn): a soft shadow keeps the letters off it
    textShadow: rt.cue.box ? '0 1px 12px rgba(0,0,0,0.55)' : undefined,
  });
  return (
    <>
      <div style={{ ...style('right'), right: w - (x0 * w - gap), marginRight: `-${track}em` }}>{first}</div>
      <div style={{ ...style('left'), left: x1 * w + gap }}>{right}</div>
    </>
  );
};

/**
 * 'comic': a punch word in a comic-book caption box, the way Deadpool's own captions look: a tilted box
 * in the theme's yellow (`acid`; cue.color picks another fill), a heavy black border with an offset
 * shadow, halftone dots, comic lettering (fonts.comic, else punch). It sits in the top corner away from
 * the subject (the side its anchor is not on when the cue starts; alternating when unknown), pops in
 * with an overshoot and shows each word as it is sung, small enough that the characters stay visible
 * (kingpinxdeadpool v2: the big words were "closing up the screen").
 */
const ComicWord: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number }> = ({ ctx, rt, song }) => {
  const { fonts, colors } = ctx.theme;
  const { w, h } = ctx.win;
  const cut = ctx.cuts.find(c => c.from <= rt.from + 1e-3 && rt.from < c.to);
  const cx = cut?.matte ? anchorAt(ctx, cut, rt.from)[0] : rt.n % 2 ? 0.3 : 0.7;
  const onLeft = cx >= 0.5;
  const ink = '#0b0b0b';
  const fill = rt.cue.color && rt.cue.color !== 'acid' ? colors[rt.cue.color] : colors.acid;
  const text = rt.cue.color === 'red' ? colors.bone : ink;
  const size = typeH(ctx) * (rt.cue.size ?? 0.085);
  const tilt = (onLeft ? -1 : 1) * (3 + (rt.n % 3));
  const p = clamp01((song - rt.from) / 0.16);
  const back = 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2; // ease out with an overshoot
  const gone = clamp01((song - (rt.to - 0.1)) / 0.1);
  const scale = (0.3 + 0.7 * back) * (1 - 0.4 * gone);
  return (
    <div
      style={{
        position: 'absolute', top: ctx.tall ? ctx.safe.top * 0.6 : h * 0.07, [onLeft ? 'left' : 'right']: w * 0.045,
        transform: `rotate(${tilt + (1 - p) * tilt * 2}deg) scale(${scale})`, transformOrigin: onLeft ? 'top left' : 'top right',
        opacity: 1 - gone, padding: `${size * 0.14}px ${size * 0.3}px ${size * 0.04}px`,
        backgroundColor: fill, backgroundImage: 'radial-gradient(rgba(0,0,0,0.14) 22%, transparent 26%)', backgroundSize: `${Math.round(size * 0.11)}px ${Math.round(size * 0.11)}px`,
        border: `${Math.max(3, size * 0.06)}px solid ${ink}`, boxShadow: `${size * 0.1}px ${size * 0.1}px 0 ${ink}`,
        fontFamily: fonts.comic ?? fonts.punch, fontSize: size, lineHeight: 1, color: text, letterSpacing: '0.03em', whiteSpace: 'nowrap', textTransform: 'uppercase',
      }}
    >
      {rt.words.map((wd, i) => (
        <span key={i} style={{ visibility: song >= wd.at - 1e-3 ? 'visible' : 'hidden', marginRight: i < rt.words.length - 1 ? '0.25em' : 0 }}>{wd.text}</span>
      ))}
    </div>
  );
};

/**
 * 'decal': words printed on the subject, like a chest print. Placed at cue.at (window fractions) when
 * the cue starts, it then follows the subject's anchor (smoothed over ±0.1 s) and grows and shrinks with
 * it; the letters print in one by one, bone-white and screen-blended into the fabric with a soft edge,
 * one word per line (ATOMIC over RAP). Drawn over the cutout, so the subject's own layer carries it.
 */
const Decal: React.FC<{ ctx: Ctx; rt: ResolvedText; cut: ResolvedCut; song: number }> = ({ ctx, rt, cut, song }) => {
  const { fonts, colors } = ctx.theme;
  const { w, h } = ctx.win;
  const near = (s: number) => {
    const ds = [-0.1, -0.05, 0, 0.05, 0.1];
    const sum = ds.reduce((acc, d) => {
      const a = anchorAt(ctx, cut, Math.max(cut.from, Math.min(cut.to - 1e-3, s + d)));
      return [acc[0] + a[0], acc[1] + a[1], acc[2] + a[2]];
    }, [0, 0, 0]);
    return sum.map(v => v / ds.length);
  };
  const [x0, y0, a0] = near(Math.max(rt.from, cut.from));
  const [x1, y1, a1] = near(song);
  const sc = a0 > 0.01 && a1 > 0.01 ? Math.sqrt(a1 / a0) : 1;
  const [ax, ay] = rt.cue.at ?? [x0, y0];
  const left = (x1 + (ax - x0) * sc) * w;
  const top = (y1 + (ay - y0) * sc) * h;
  const size = typeH(ctx) * (rt.cue.size ?? 0.04) * sc;
  let k = 0;
  return (
    <div
      style={{
        position: 'absolute', left, top, transform: 'translate(-50%, -50%)', textAlign: 'center',
        fontFamily: fonts.sign ?? fonts.line, fontSize: size, lineHeight: 1.35, letterSpacing: '0.28em', marginRight: '-0.28em',
        color: colors.bone, mixBlendMode: 'screen', opacity: 0.92, filter: 'blur(0.4px)', whiteSpace: 'nowrap',
      }}
    >
      {rt.words.map((wd, wi) => (
        <div key={wi}>
          {wd.text.split('').map((ch, ci) => {
            const at = Math.max(rt.from, wd.at) + 0.045 * k++;
            const q = clamp01((song - at) / 0.12);
            return <span key={ci} style={{ display: 'inline-block', opacity: q, transform: `scale(${1.6 - 0.6 * q})` }}>{ch}</span>;
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * 'plane': a punch word set into the shot in 3D perspective, on a surface of the picture (a wall, the
 * floor, a board) or hanging in its depth (quicksilverxkingpin v4: "make text appear in 3D perspective
 * based on the shot, not too big, only some words"). cue.at is its centre (window fractions), cue.size
 * the letter height, cue.tilt [rx, ry, rz] the surface's turn; the vanishing point is the window's
 * centre, as with the camera's lens. It lives on the cut it is sung on (planeCut) and rides that
 * shot's camera (shake, pump, zoom); each word slides in along its surface as it is sung, with a soft
 * shadow on it, and the cue fades as the cut or the cue ends.
 */
const PlaneWord: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number; from: number; to: number }> = ({ ctx, rt, song, from, to }) => {
  const { fonts } = ctx.theme;
  const { w, h } = ctx.win;
  const [ax, ay] = rt.cue.at ?? [0.5, 0.5];
  const [rx, ry, rz] = rt.cue.tilt ?? [0, 0, 0];
  const size = typeH(ctx) * (rt.cue.size ?? 0.08);
  const color = colorOf(ctx.theme, rt.cue.color);
  const out = clamp01((song - (to - 0.08)) / 0.08);
  return (
    <AbsoluteFill style={{ perspective: w * 0.85, perspectiveOrigin: '50% 50%' }}>
      <div
        style={{
          position: 'absolute', left: ax * w, top: ay * h, transform: `translate(-50%, -50%) rotateZ(${rz}deg) rotateY(${ry}deg) rotateX(${rx}deg)`,
          whiteSpace: 'nowrap', fontFamily: fonts.punch, fontSize: size, lineHeight: 1, letterSpacing: '0.03em', color, opacity: 1 - out,
          // letters that lift off the surface (cue.act 'explode') stay in its 3D space
          transformStyle: rt.cue.act === 'explode' ? 'preserve-3d' : undefined,
        }}
      >
        {rt.words.map((wd, k) => {
          const at = Math.max(from, wd.at);
          const p = prog(song, at, at + 0.16);
          // cue.knock: the word lands at once with a thump (a punch in) and shudders like a struck door
          const age = song - at;
          const knock = rt.cue.knock
            ? `scale(${(1 + 0.28 * Math.exp(-Math.max(0, age) * 22)).toFixed(3)}) translate(${(Math.sin(age * 70) * Math.exp(-Math.max(0, age) * 14) * 0.05).toFixed(3)}em, ${(Math.cos(age * 55) * Math.exp(-Math.max(0, age) * 14) * 0.03).toFixed(3)}em)`
            : null;
          return (
            <span
              key={k}
              style={{
                display: 'inline-block', marginRight: k < rt.words.length - 1 ? '0.22em' : 0, visibility: song >= at - 1e-3 ? 'visible' : 'hidden',
                // act 'slide' brings its own move (to the left), so the usual slide-in from the left is skipped
                opacity: knock || rt.cue.act === 'slide' ? 1 : p, transform: knock ?? (rt.cue.act === 'slide' ? undefined : `translateX(${(-(1 - p) * 0.4).toFixed(3)}em)`), textShadow: `0 ${(size * 0.05).toFixed(1)}px ${(size * 0.12).toFixed(1)}px rgba(0,0,0,0.6)`,
                transformStyle: rt.cue.act === 'explode' ? 'preserve-3d' : undefined,
              }}
            >
              {rt.cue.act ? <ActWord text={wd.text} act={rt.cue.act} age={song - at} seed={`${rt.i}${wd.text}`} color={color} /> : wd.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
/** the cut a 'plane' cue lives on: the one under its first word just after it is sung */
const planeCut = (ctx: Ctx, rt: ResolvedText) => {
  const t = Math.min(rt.to - 1e-3, (rt.words[0]?.at ?? rt.from) + TEXT_LEAD + 0.12);
  return ctx.cuts.find(c => c.from <= t && t < c.to);
};

/**
 * 'glass': big frosted-glass letters in front (quicksilverxkingpin v10: the hook's segmented words flickered
 * as its fast cuts changed the cutout under them every beat — "do it perfectly, or hide it, using a good text
 * effect that flows into the video"; the hook sings "everything I see is a blur in the glass"). Each word is
 * a window onto the picture behind it, blurred and lit (a backdrop filter clipped to the letters), tinted
 * and edged in a thin line of the cue's colour; it comes into focus as it is sung and dissolves back into a
 * blur as it goes. No cutout, so nothing flickers. Nothing above it may set opacity or a filter: that would
 * make it a backdrop root and the letters would show nothing.
 */
const GlassWords: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number }> = ({ ctx, rt, song }) => {
  const family = ctx.theme.fonts.punch;
  const { w, h } = ctx.win;
  const fit = useMemo(() => fitWords(rt, family, w * 0.84, typeH(ctx) * 0.62, 0.01), [rt, w, h, family]);
  const color = colorOf(ctx.theme, rt.cue.color);
  const size = fit.size;
  const lh = 0.9 * size;
  const gap = 0.2 * size;
  const pad = 0.2 * size;
  const out = Easing.in(Easing.quad)(clamp01((song - (rt.to - 0.25)) / 0.25));
  const top0 = h / 2 - (fit.lines.length * lh) / 2;
  return (
    <>
      {fit.lines.flatMap((line, li) => {
        const widths = line.map(wd => measure(wd.text, family, size));
        let x = (w - widths.reduce((a, b) => a + b, 0) - gap * (line.length - 1)) / 2;
        return line.map((wd, wi) => {
          const left = x;
          x += widths[wi] + gap;
          if (song < wd.at - 1e-3) return null;
          const p = prog(song, wd.at, wd.at + 0.28);
          const id = `remix-glass-${rt.i}-${li}-${wi}`;
          const bw = widths[wi] + 2 * pad;
          const bh = lh + 2 * pad;
          const txt = (extra: React.SVGProps<SVGTextElement>) => (
            <text x={pad} y={pad + lh / 2} dominantBaseline="central" fontFamily={family} fontSize={size} {...extra}>{wd.text}</text>
          );
          const focus = p * (1 - out);
          return (
            <div key={id} style={{ position: 'absolute', left: left - pad, top: top0 + li * lh - pad, width: bw, height: bh, transform: `scale(${(1.07 - 0.07 * p + 0.05 * out).toFixed(4)})` }}>
              <svg width={bw} height={bh} style={{ position: 'absolute', inset: 0, overflow: 'visible', filter: `blur(${(size * 0.02).toFixed(1)}px)` }}>
                <defs><clipPath id={id} clipPathUnits="userSpaceOnUse">{txt({})}</clipPath></defs>
                {txt({ fill: 'none', stroke: 'rgba(0,0,0,0.45)', strokeWidth: size * 0.03, opacity: focus })}
              </svg>
              {/* frosted: the picture blurred and lifted (dark frames too), a wash of the cue's colour over it */}
              <div style={{ position: 'absolute', inset: 0, clipPath: `url(#${id})`, backdropFilter: `blur(${(8 + 20 * (1 - focus)).toFixed(1)}px) brightness(${(1 + 0.85 * focus).toFixed(3)}) saturate(1.3)`, background: `linear-gradient(${color}${Math.round(70 * focus).toString(16).padStart(2, '0')}, ${color}${Math.round(30 * focus).toString(16).padStart(2, '0')})` }} />
              <svg width={bw} height={bh} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <defs>
                  <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity={0.28} />
                    <stop offset="0.45" stopColor="#fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {txt({ fill: `url(#${id}-sheen)`, opacity: focus })}
                {txt({ fill: 'none', stroke: color, strokeWidth: Math.max(1.5, size * 0.007), opacity: 0.95 * focus })}
              </svg>
            </div>
          );
        });
      })}
    </>
  );
};

/**
 * 'ko': a knockout (quicksilverxkingpin v10, verse 2: "introduce a black out and make the word appear, then cut
 * back to shots — the transition has to be creative, a mask or something of that sort"). On the word the window
 * goes black but for the letters, which show the picture under them (a shot seen elsewhere reads as fire in
 * the letters, not as a repeat); over the cue's last `koZoom` seconds the letters grow from a point inside a
 * letter's stem until the picture under them fills the frame. Time the next cut to start as the dive does and
 * the dive lands in it.
 */
const KoWord: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number }> = ({ ctx, rt, song }) => {
  const family = ctx.theme.fonts.punch;
  const { w, h } = ctx.win;
  const text = rt.words.map(x => x.text).join(' ');
  const size = Math.min((w * 0.82) / (measure(text, family, 100) / 100), typeH(ctx) * 0.8);
  const tw = measure(text, family, size);
  const zd = rt.cue.koZoom ?? 0.3;
  const z = rt.cue.koOut === 'fall' ? 0 : Easing.in(Easing.cubic)(clamp01((song - (rt.to - zd)) / zd));
  const at = rt.words[0]?.at ?? rt.from;
  const land = prog(song, at, at + 0.12);
  // the dive starts inside a stem (an I or T at its middle, others at their left stem), never in a counter
  const k = Math.max(0, [...text].findIndex(ch => 'ITHLEFPKNMBDR'.includes(ch)));
  const ch = text[k] ?? text[0];
  const px = (w - tw) / 2 + measure(text.slice(0, k), family, size) + measure(ch, family, size) * (ch === 'I' || ch === 'T' ? 0.5 : 0.24);
  const py = h / 2 + (ch === 'T' ? 0.12 * size : 0);
  const s = (1.12 - 0.12 * land) * (1 + 45 * z);
  const tf = `translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${s.toFixed(4)}) translate(${(-px).toFixed(1)} ${(-py).toFixed(1)})`;
  const id = `remix-ko-${rt.i}`;
  const color = colorOf(ctx.theme, rt.cue.color);
  // koOut 'fall': no dive; over the last half second the letters drop away one by one, tumbling, and leave the black
  const fall = rt.cue.koOut === 'fall';
  const word = (extra: React.SVGProps<SVGTextElement>) =>
    fall ? (
      <g>
        {[...text].map((ch, i) => {
          const x = (w - tw) / 2 + measure(text.slice(0, i), family, size);
          const cw = measure(ch, family, size);
          const ft = Math.max(0, song - (rt.to - 0.5) - i * 0.07);
          const dy = 9 * size * ft * ft;
          const r = (random(`ko${rt.i}${i}`) - 0.5) * 70 * ft;
          return (
            <text key={i} x={x} y={h / 2} dominantBaseline="central" fontFamily={family} fontSize={size}
              transform={`translate(${(x + cw / 2).toFixed(1)} ${(h / 2 + dy).toFixed(1)}) rotate(${r.toFixed(1)}) scale(${(1.12 - 0.12 * land).toFixed(4)}) translate(${(-(x + cw / 2)).toFixed(1)} ${(-h / 2).toFixed(1)})`} {...extra}>{ch}</text>
          );
        })}
      </g>
    ) : (
      <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central" fontFamily={family} fontSize={size} transform={tf} {...extra}>{text}</text>
    );
  return (
    <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}>
          <rect width={w} height={h} fill="white" />
          {word({ fill: 'black' })}
        </mask>
      </defs>
      <rect width={w} height={h} fill={ctx.theme.colors.ground} mask={`url(#${id})`} opacity={1 - clamp01((z - 0.8) / 0.2)} />
      {word({ fill: 'none', stroke: color, strokeWidth: Math.max(2, size * 0.008) / s, opacity: 0.9 * (1 - z) * land })}
    </svg>
  );
};

/**
 * 'stack': a column of lines (text split on '/'), each as wide as `area`, so short lines stand taller, in
 * front (quicksilverxkingpin v10: STORY / NEVER / TOLD "in big words, vertical, width-fitting to the left, an
 * impact on the viewer"; HIGHER / THAN YOU / GO in the sky outside the window). Each line slams in on its
 * sung word (`ws`): from larger and blurred, white-hot, with a flash of the frame and a shudder; the picture
 * dims a little behind the column while it stands.
 */
const StackWords: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number }> = ({ ctx, rt, song }) => {
  const family = ctx.theme.fonts.punch;
  const { w, h } = ctx.win;
  const [ax0, ay0, ax1, ay1] = rt.cue.area ?? [0.05, 0.1, 0.45, 0.9];
  const W = (ax1 - ax0) * w;
  const cap = 0.82; // a line's box per em: Anton's capitals with a little air
  const lead = 0.05 * W; // the gap between lines
  const sizes = rt.words.map(l => W / (measure(l.text, family, 100) / 100));
  const k = Math.min(1, ((ay1 - ay0) * h) / (sizes.reduce((a, s) => a + s * cap, 0) + lead * (sizes.length - 1)));
  const color = colorOf(ctx.theme, rt.cue.color);
  const out = clamp01((song - (rt.to - 0.2)) / 0.2);
  const hit = Math.max(0, ...rt.words.map(l => (song >= l.at ? Math.exp(-(song - l.at) * 14) : 0)));
  const mul = rt.cue.blend === 'multiply';
  let y = ay0 * h;
  return (
    <>
      {!mul && <AbsoluteFill style={{ background: `rgba(0,0,0,${(0.32 * clamp01((song - rt.from) / 0.2) * (1 - out)).toFixed(3)})` }} />}
      {!mul && <AbsoluteFill style={{ background: '#fff', opacity: 0.22 * hit * (1 - out) }} />}
      {rt.words.map((l, i) => {
        const fs = sizes[i] * k;
        const top = y;
        y += fs * cap + lead * k;
        if (song < l.at - 1e-3) return null;
        const age = song - l.at;
        const p = Easing.out(Easing.cubic)(clamp01(age / 0.13));
        const shudder = Math.exp(-age * 10) * fs * 0.03;
        const hot = clamp01(1 - age / 0.35);
        return (
          <div key={i} style={{
            position: 'absolute', left: ax0 * w, top, width: W * k, height: fs * cap, display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            fontFamily: family, fontSize: fs, lineHeight: 1, whiteSpace: 'nowrap', color: hot > 0.02 && !mul ? '#fff' : color, opacity: 1 - out,
            transform: `translate(${(Math.sin(age * 90) * shudder).toFixed(1)}px, ${(Math.cos(age * 70) * shudder).toFixed(1)}px) scale(${(1.45 - 0.45 * p).toFixed(3)})`, transformOrigin: 'left center',
            filter: p < 0.999 ? `blur(${((1 - p) * fs * 0.04).toFixed(1)}px)` : undefined, mixBlendMode: mul ? 'multiply' : undefined,
            textShadow: mul ? undefined : `0 0 ${(fs * (0.05 + 0.15 * hot)).toFixed(1)}px ${color}, 0 ${(fs * 0.04).toFixed(1)}px ${(fs * 0.12).toFixed(1)}px rgba(0,0,0,0.55)`,
          }}>
            {l.text}
          </div>
        );
      })}
    </>
  );
};

/**
 * 'flow': rhythmic motion typography (quicksilverxkingpin rev-006: "small text at the centre, word by word, the
 * word moving left, very small, Michroma, smooth, matched to the transcription, not the beats"). The line's
 * words sit in a row; each arrives as it is sung, the row glides left (eased) so the newest word lands at
 * the centre, and the whole row keeps drifting left slowly; words fade as they leave the centre.
 */
const FlowWords: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number }> = ({ ctx, rt, song }) => {
  const { fonts, colors } = ctx.theme;
  const { w, h } = ctx.win;
  const size = Math.max(14, typeH(ctx) * 0.03);
  const track = 0.32;
  const gap = size * 1.1;
  const widths = rt.words.map(x => measure(x.text, fonts.line, size, track));
  const centres = widths.map((_, k) => widths.slice(0, k).reduce((a, b) => a + b + gap, 0) + widths[k] / 2);
  // the row's offset: each sung word eases the row on by its step, so it lands at the centre
  const glide = 0.42;
  let shift = centres[0];
  for (let k = 1; k < rt.words.length; k++) shift += (centres[k] - centres[k - 1]) * Easing.inOut(Easing.cubic)(clamp01((song - rt.words[k].at) / glide));
  const drift = Math.max(0, song - rt.from) * size * 0.9;
  const out = clamp01((song - (rt.to - 0.3)) / 0.3);
  return (
    <>
      {rt.words.map((wd, k) => {
        if (song < wd.at - 1e-3) return null;
        const x = w / 2 + centres[k] - shift - drift;
        const away = Math.abs(x - w / 2) / (w * 0.22);
        const inP = Easing.out(Easing.cubic)(clamp01((song - wd.at) / 0.3));
        return (
          <div key={k} style={{
            position: 'absolute', left: x, top: h / 2, transform: `translate(-50%, -50%) translateX(${((1 - inP) * size * 1.5).toFixed(1)}px)`,
            fontFamily: fonts.line, fontSize: size, letterSpacing: `${track}em`, whiteSpace: 'nowrap', color: colors.bone,
            opacity: inP * clamp01(1.15 - away) * (1 - out), textShadow: '0 0 10px rgba(0,0,0,0.6)',
          }}>
            {wd.text}
          </div>
        );
      })}
    </>
  );
};

/**
 * '@void': a dark stage for words (quicksilverxkingpin rev-006, verse 2: once every shot already seen elsewhere
 * was taken out there was no footage left for the cold half): black-blue depth with specks hanging in the air
 * like the frozen kitchen's, barely drifting, the nearest ones soft; a faint cold light breathes on the kick.
 */
const VoidStage: React.FC<{ ctx: Ctx; cut: ResolvedCut; song: number }> = ({ ctx, cut, song }) => {
  const { w, h } = ctx.win;
  const m = ctx.manifest;
  const breath = hitAt(m as never, 'kick', song, 6);
  const t = song;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, rgba(34,70,112,${(0.36 + 0.14 * breath).toFixed(3)}) 0%, #050a10 58%, #010203 100%)` }}>
      {Array.from({ length: 110 }, (_, k) => {
        const r = (s: string) => random(`void${k}${s}`);
        const z = 0.25 + 0.75 * r('z'); // depth: 1 = near
        const x = ((r('x') + t * 0.004 * (r('vx') - 0.5) * z) % 1 + 1) % 1;
        const y = ((r('y') - t * 0.003 * z) % 1 + 1) % 1;
        const d = (0.8 + 4.2 * z * z) * (h / 800);
        const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + r('f') * 1.6) + r('p') * 6.28);
        return (
          <div key={k} style={{
            position: 'absolute', left: x * w, top: y * h, width: d, height: d, borderRadius: '50%',
            background: z > 0.8 ? 'rgba(200,225,255,0.6)' : '#d6e8ff', opacity: (0.25 + 0.7 * z) * tw,
            filter: z > 0.8 ? `blur(${(d * 0.35).toFixed(1)}px)` : undefined,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * '@flashes': a blacked-out screen lit only by flashes on the beat (quicksilverxkingpin v10 drop: "do not put any
 * shot, blank out the screen with just some effects, like flashes coming in with beats"). Each flash is a
 * white-blue burst of the whole frame and a horizontal lens streak through the middle; light ones (hats) only
 * a short streak and a glint.
 */
const BeatFlashes: React.FC<{ ctx: Ctx; cut: ResolvedCut; song: number }> = ({ ctx, cut, song }) => {
  const { w, h } = ctx.win;
  const blue = ctx.theme.colors.red;
  const live = (cut.flashAt ?? []).map(([t, s], k) => ({ age: song - t, s, k })).filter(f => f.age >= -1e-3 && f.age < 0.7);
  return (
    <AbsoluteFill style={{ background: ctx.theme.colors.ground }}>
      {live.map(({ age, s, k }) => {
        const burst = s >= 0.6 ? s * Math.exp(-age * 11) : 0;
        const streak = s * Math.exp(-age * 6);
        const y = h * (0.5 + (random(`fl${cut.id}${k}`) - 0.5) * 0.24);
        const sh = h * (0.012 + 0.03 * s) * (1 + age * 2);
        return (
          <React.Fragment key={k}>
            {burst > 0.01 && <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% ${((y / h) * 100).toFixed(1)}%, rgba(255,255,255,${burst.toFixed(3)}) 0%, ${blue} ${(28 + 50 * burst).toFixed(0)}%, rgba(0,0,0,0) 100%)`, opacity: Math.min(1, burst * 1.2), mixBlendMode: 'screen' }} />}
            <div style={{
              position: 'absolute', left: -w * 0.2, width: w * 1.4, top: y - sh / 2, height: sh, borderRadius: sh,
              background: `radial-gradient(ellipse at center, rgba(255,255,255,${Math.min(1, streak * 1.4).toFixed(3)}) 0%, ${blue} 35%, rgba(0,0,0,0) 72%)`,
              filter: `blur(${(2 + 6 * age).toFixed(1)}px)`, mixBlendMode: 'screen', opacity: Math.min(1, streak * 1.3),
            }} />
            <div style={{ position: 'absolute', left: w / 2 - h * 0.04, top: y - h * 0.04, width: h * 0.08, height: h * 0.08, borderRadius: '50%', background: '#fff', filter: `blur(${(h * 0.01).toFixed(1)}px)`, opacity: Math.min(1, streak * 1.6) }} />
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/** a stopwatch counting down to the cue's end */
const Timer: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number }> = ({ ctx, rt, song }) => {
  const { fonts, colors } = ctx.theme;
  const left = Math.max(0, rt.to - song);
  const s = Math.floor(left);
  const ms = Math.floor((left - s) * 1000);
  const p = prog(song, rt.from, rt.from + 0.2);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: ctx.tall ? ctx.safe.top - 60 : ctx.win.h * 0.08, textAlign: 'center', opacity: p }}>
      <div style={{ fontFamily: fonts.data, fontSize: 18, letterSpacing: '0.5em', color: colors.red, marginBottom: 6 }}>{rt.cue.text}</div>
      <div style={{ fontFamily: fonts.line, fontSize: 84, letterSpacing: '0.12em', color: colors.bone, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>
        00:{String(s).padStart(2, '0')}.{String(ms).padStart(3, '0')}
      </div>
    </div>
  );
};

// a circuit outline (window fractions of a 1×0.62 box), drawn on; a car dot laps it
const CIRCUIT = [[0.08, 0.62], [0.08, 0.3], [0.16, 0.12], [0.34, 0.08], [0.46, 0.2], [0.44, 0.34], [0.56, 0.4], [0.72, 0.18], [0.9, 0.16], [0.94, 0.3], [0.8, 0.44], [0.86, 0.56], [0.7, 0.62], [0.4, 0.58], [0.26, 0.66], [0.08, 0.62]];
const TrackMap: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number }> = ({ ctx, rt, song }) => {
  const { fonts, colors } = ctx.theme;
  const W = 330;
  const H = W * 0.7;
  const pts = CIRCUIT.map(([x, y]) => [x * W, y * W] as const);
  const segs = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  const draw = prog(song, rt.from, rt.from + 1.4, inOut);
  let d = (((song - rt.from) / 4.8) % 1) * total;
  let k = 0;
  while (k < segs.length - 1 && d > segs[k]) d -= segs[k++];
  const f = d / segs[k];
  const dot = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f];
  const fade = prog(song, rt.from, rt.from + 0.2) * (1 - prog(song, rt.to - 0.15, rt.to));
  return (
    <div style={{ position: 'absolute', right: ctx.win.w * 0.05, top: ctx.win.h * 0.1, width: W, opacity: fade }}>
      <div style={{ fontFamily: fonts.data, fontSize: 14, letterSpacing: '0.5em', color: colors.red, marginBottom: 10 }}>{rt.cue.text}</div>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={colors.bone} strokeOpacity={0.9} strokeWidth={3} strokeLinejoin="round" strokeDasharray={total} strokeDashoffset={total * (1 - draw)} />
        {draw > 0.98 && <circle cx={dot[0]} cy={dot[1]} r={7} fill={colors.red} style={{ filter: `drop-shadow(0 0 8px ${colors.red})` }} />}
        <line x1={pts[0][0] - 10} y1={pts[0][1] - 18} x2={pts[0][0] + 10} y2={pts[0][1] - 18} stroke={colors.red} strokeWidth={3} />
      </svg>
    </div>
  );
};

// ------------------------------------------------------------------ one cut

const Streaks: React.FC<{ ctx: Ctx; cut: ResolvedCut; t: number }> = ({ ctx, cut, t }) => {
  const { w, h } = ctx.win;
  const R = Math.hypot(w, h) / 2;
  return (
    <svg width={w} height={h} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}>
      {Array.from({ length: 70 }, (_, k) => {
        const a = random(`sa${cut.id}${k}`) * Math.PI * 2;
        const sp = 0.6 + random(`ss${cut.id}${k}`) * 1.6;
        const r0 = ((random(`sr${cut.id}${k}`) + t * sp) % 1) * 0.9 + 0.12;
        const len = 0.08 + 0.18 * random(`sl${k}`);
        return (
          <line
            key={k}
            x1={w / 2 + Math.cos(a) * r0 * R} y1={h / 2 + Math.sin(a) * r0 * R}
            x2={w / 2 + Math.cos(a) * (r0 + len) * R} y2={h / 2 + Math.sin(a) * (r0 + len) * R}
            stroke="white" strokeOpacity={0.15 + 0.35 * r0} strokeWidth={1 + 2 * r0} strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

/** '@split': panels side by side, one sliding up per equal share of the cut, each on its subject; in a
 *  vertical window they stack top to bottom, sliding in from alternate sides (several moments in one
 *  frame, each cropped far less than a full-frame reframe) */
const Split: React.FC<{ ctx: Ctx; cut: ResolvedCut; t: number; grade: string }> = ({ ctx, cut, t, grade }) => {
  const panels = cut.panels ?? [];
  const n = panels.length;
  const { w, h } = ctx.win;
  const gap = 8;
  const len = cut.to - cut.from;
  const stacked = h > w;
  const pw = stacked ? w : (w - gap * (n - 1)) / n;
  const ph = stacked ? (h - gap * (n - 1)) / n : h;
  // stacked: the share of the wide picture that covers one panel
  const s = Math.max(pw / ctx.plate[0], ph / ctx.plate[1]);
  const [dw, dh] = [ctx.plate[0] * s, ctx.plate[1] * s];
  // object-position (%) that centres a subject at `c` when a share `f` of the picture shows
  const crop = (c: number, f: number) => (f < 1 ? (Math.min(1 - f, Math.max(0, c - f / 2)) / (1 - f)) * 100 : 50);
  return (
    <AbsoluteFill style={{ background: ctx.theme.colors.ground }}>
      {panels.map((p: ResolvedPanel, k) => {
        const at = cut.panelAt?.[k] ?? (k / n) * len;
        if (t < at) return null;
        const e = prog(t, at, at + 0.18);
        const [cx, cy] = anchorOf(ctx, p.matte?.key, p.source, t - at);
        const enter = stacked ? `translateX(${(1 - e) * (k % 2 ? 60 : -60)}%)` : `translateY(${(1 - e) * 60}%)`;
        const blur = e < 1 ? `url(#remix-mb${stacked ? 'h' : 'v'}${Math.round((1 - e) * 5)})` : undefined;
        return (
          <div key={k} style={{ position: 'absolute', left: stacked ? 0 : k * (pw + gap), top: stacked ? k * (ph + gap) : 0, width: pw, height: ph, overflow: 'hidden', transform: enter, filter: blur }}>
            <Frame
              src={plateSrc(ctx, p.source)}
              t={Math.min(p.srcOut, p.srcIn + (t - at))}
              style={
                stacked
                  ? {
                      filter: grade, objectFit: 'cover',
                      objectPosition: `${crop(cx, pw / dw)}% ${crop(cy, ph / dh)}%`,
                    }
                  : { width: w, height: h, left: Math.min(0, Math.max(pw - w, pw / 2 - cx * w)), filter: grade }
              }
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Shot: React.FC<{ ctx: Ctx; cut: ResolvedCut }> = ({ ctx: base, cut }) => {
  // a band cut has its own window (a strip across the vertical frame); every other cut the frame's
  const ctx = bandCtx(base, cut);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f0 = Math.round(cut.from * fps);
  const dur = Math.max(1, Math.round(cut.to * fps) - f0);
  const t = frame / fps;
  const song = f0 / fps + t;
  const { w, h } = ctx.win;
  const { colors } = ctx.theme;
  const m = ctx.manifest;
  const prev = ctx.cuts[cut.i - 1];

  // ---- camera: transitions, push, bounce, shake
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let rot = 0;
  let ox = w / 2;
  let oy = h / 2;
  let zblur = 0;
  let dblur = 0;
  let warp = 0;
  let liq = 0;
  let daxis: 'h' | 'v' = 'h';
  const outN = OUT[cut.tout] ?? 0;
  const left = dur - 1 - frame;
  // the liquid melt's frames, shorter on short cuts so the picture settles between melts
  const liqOut = Math.min(OUT.liquid!, Math.max(2, Math.floor(dur * 0.3)));
  const liqIn = Math.min(IN.liquid!, Math.max(3, Math.floor(dur * 0.55)));
  if (outN && left < outN) {
    const p = cubicIn(1 - left / outN);
    if (cut.tout === 'zoom') {
      const [ax, ay] = anchorAt(ctx, cut, cut.to);
      ox = ax * w; oy = ay * h; scale *= 1 + ZOOM * p; zblur = p; warp = p;
    } else if (cut.tout === 'whip' || cut.tout === 'whipr') {
      tx += (cut.tout === 'whip' ? -1 : 1) * p * 0.4 * w; dblur = p;
    } else if (cut.tout === 'whipv') {
      ty -= p * 0.4 * h; dblur = p; daxis = 'v';
    } else if (cut.tout === 'spin') {
      rot += 32 * p; scale *= 1 + 0.3 * p; zblur = p * 0.8;
    } else if (cut.tout === 'liquid') {
      if (left < liqOut) liq = sineInOut((liqOut - left) / liqOut);
    } else if (cut.tout === 'flow') {
      const mv = motionAt(ctx, cut);
      tx += mv.dx * p * 0.22 * w; ty += mv.dy * p * 0.22 * w; dblur = p; daxis = mv.axis;
    }
  }
  const inN = IN[cut.tin] ?? 0;
  if (inN && frame < inN) {
    const q = frame / inN;
    const e = expOut(q);
    if (cut.tin === 'zoom') {
      const [ax, ay] = anchorAt(ctx, cut, cut.from);
      ox = ax * w; oy = ay * h; scale *= 1 + ZOOM * (1 - e); zblur = Math.max(zblur, 1 - e); warp = Math.max(warp, 1 - e);
    } else if (cut.tin === 'whip' || cut.tin === 'whipr') {
      tx += (cut.tin === 'whip' ? 1 : -1) * (1 - e) * 0.4 * w; dblur = Math.max(dblur, 1 - e);
    } else if (cut.tin === 'whipv') {
      ty += (1 - e) * 0.4 * h; dblur = Math.max(dblur, 1 - e); daxis = 'v';
    } else if (cut.tin === 'spin') {
      rot -= 32 * (1 - e); scale *= 1 + 0.3 * (1 - e); zblur = Math.max(zblur, 0.8 * (1 - e));
    } else if (cut.tin === 'match' && prev) {
      const [px, py, pa] = anchorAt(ctx, prev, prev.to);
      const [cx, cy, ca] = anchorAt(ctx, cut, cut.from);
      const k = 1 - inOut(q);
      const s0 = pa > 0.01 && ca > 0.01 ? Math.max(0.55, Math.min(1.9, Math.sqrt(pa / ca))) : 1;
      ox = cx * w; oy = cy * h; tx += (px - cx) * w * k; ty += (py - cy) * h * k; scale *= 1 + (s0 - 1) * k;
    } else if (cut.tin === 'flow' && prev) {
      // the subject lands where the last one was, still travelling the way it went
      const mv = motionAt(ctx, prev);
      const [px, py, pa] = anchorAt(ctx, prev, prev.to);
      const [cx, cy, ca] = anchorAt(ctx, cut, cut.from);
      const k = 1 - e;
      const s0 = pa > 0.01 && ca > 0.01 ? Math.max(0.6, Math.min(1.7, Math.sqrt(pa / ca))) : 1;
      ox = cx * w; oy = cy * h;
      tx += ((px - cx) * w - mv.dx * 0.22 * w) * k; ty += ((py - cy) * h - mv.dy * 0.22 * w) * k;
      scale *= 1 + (s0 - 1) * k; dblur = Math.max(dblur, k); daxis = mv.axis;
    } else if (cut.tin === 'impact') {
      scale *= 1 + 0.07 * (1 - e);
    } else if (cut.tin === 'liquid') {
      // peaks on the cut, where the last shot's melt ended, then settles
      if (frame < liqIn) liq = Math.max(liq, 1 - sineInOut(frame / liqIn));
    }
  }
  if (liq > 0) scale *= 1 + LIQ_OVER * liq;
  const mono = has(cut, 'mono');
  const push = has(cut, 'push');
  if (push) scale *= 1 + (push.s ?? 0.08) * (frame / dur);
  // punch-in steps on the subject (a stare tightening word by word)
  const st = has(cut, 'steps');
  if (st) {
    const times = st.at.map(b => beatTime(m as never, b)).filter(x => x <= song + 1e-3);
    if (times.length) {
      const e = expOut(clamp01((song - times[times.length - 1]) / 0.14));
      scale *= (1 + (st.s ?? 0.14)) ** (times.length - 1) * (1 + (st.s ?? 0.14) * e);
      zblur = Math.max(zblur, (1 - e) * 0.9);
      warp = Math.max(warp, (1 - e) * 0.5);
    }
    const [ax, ay] = st.to ?? anchorAt(ctx, cut, cut.from);
    ox = ax * w; oy = ay * h;
  }
  // the beat bounce: a small punch on every kick, bigger where the song is loud; inside a pump range
  // the whole picture box punches out like a speaker cone instead (not while a transition plays)
  const energy = clamp01((envelopeAt(m, 'rms', song) - 0.35) / 0.3);
  const kick = hitAt(m, 'kick', song, 14);
  const snare = hitAt(m, 'snare', song, 12);
  const pumpAmt = cut.gfx ? 0 : Math.max(0, ...(ctx.gfx.pump ?? []).map(([a, b, k]) => (song >= beatTime(m as never, a) && song < beatTime(m as never, b) ? k : 0)));
  const moving = (inN && frame < inN && cut.tin !== 'cut' && cut.tin !== 'flash') || (outN > 0 && left < outN);
  let box = 1;
  if (pumpAmt > 0 && !moving) {
    const cone = hitAt(m, 'kick', song, 9);
    box = 1 + pumpAmt * cone;
    scale *= 1 + pumpAmt * 0.5 * cone;
    if (cone > 0.5) zblur = Math.max(zblur, Math.min(0.7, cone * pumpAmt * 10));
    warp = Math.max(warp, cone * pumpAmt * 7);
  } else if (!cut.gfx) scale *= 1 + (0.012 + 0.03 * energy) * kick;
  const shake = has(cut, 'shake');
  const impact = cut.tin === 'impact' && frame < 12 ? (1 - frame / 12) ** 2 * 2.2 : 0;
  const amp = (shake ? (shake.amp ?? 1) * (0.35 + 1.1 * hitAt(m, 'kick', song, 9) + 0.7 * hitAt(m, 'snare', song, 9)) : 0) + impact;
  const sx = wobble(`x${cut.id}`, song) * 24 * amp;
  const sy = wobble(`y${cut.id}`, song) * 16 * amp;
  const sr = wobble(`r${cut.id}`, song) * 0.7 * amp;

  // natural grade, with an exposure lift on the snares where the song is loud
  const lift = 1 + 0.14 * snare * energy;
  const gradeOf = (c: ResolvedCut) => (has(c, 'mono') ? `grayscale(1) contrast(1.22) brightness(${0.96 * lift})` : `contrast(1.07) saturate(1.06) brightness(${lift})`);
  const grade = gradeOf(cut);
  // gfx.reverb: on every vocal onset the picture swells like a drop falling into it (the warp zoom's
  // lens bulge, smooth; no liquid or squiggly displacement, which this user dislikes) and settles with
  // the tail; echoes of the frame spread out over it (below)
  const rv = cut.gfx || cut.src === '@split' ? null : reverbAt(m, ctx.gfx.reverb, song);
  if (rv) {
    const swell = rv.fade * Math.max(0, ...rv.hits.map(([age, s]) => s * Math.exp(-age * 6) * clamp01(age / 0.04)));
    warp = Math.max(warp, 0.4 * swell);
    scale *= 1 + 0.025 * swell;
  }
  const blurLevel = Math.round(dblur * 6);
  const wl = warpLevel(warp);
  const liqId = `remix-liq-${cut.id.replace(/\W/g, '-')}`;
  const camFilter = [blurLevel ? `url(#remix-mb${daxis}${blurLevel})` : '', wl ? `url(#remix-warp${ctx.bands.has(cut.id) ? `-b${Math.round(ctx.win.h)}-` : ''}${wl})` : '', liq > 0.01 ? `url(#${liqId})` : ''].filter(Boolean).join(' ') || undefined;

  const srcT = sourceTime(cut, t, fps);
  // the part of the wide picture this cut shows now (all of it unless a vertical frame reframes it)
  const view = placed(viewAt(ctx, cut, song));
  const matteT = cut.matte ? srcT - cut.matte.in : 0;
  const behind = ctx.text.filter(x => (x.style === 'big' || x.style === 'flank') && x.from < cut.to && x.to > cut.from && song >= x.from - 1e-3 && song < x.to);
  const decals = ctx.text.filter(x => x.style === 'decal' && x.from < cut.to && x.to > cut.from && song >= x.from - 1e-3 && song < x.to);
  const planes = ctx.text.filter(x => x.style === 'plane' && x.from < cut.to && x.to > cut.from && song < x.to && planeCut(ctx, x) === cut);
  const slowed = cut.rate < 1;
  const echo = has(cut, 'echo');
  const pop = has(cut, 'pop');
  const popP = pop ? prog(t, 0, 0.2) : 0;
  const fz = has(cut, 'freeze');
  const frozen = fz ? frame < (fz.n ?? 3) + 2 : false;
  const aura = has(cut, 'aura');
  const glow = (aura ? 0.35 + 0.65 * kick : 0) + (frozen ? 1 : 0);
  const cutoutFilter = glow > 0.02 ? `${grade} drop-shadow(0 0 ${3 + 3 * glow}px rgba(255,255,255,${0.9 * Math.min(1, glow)})) drop-shadow(0 0 ${14 + 16 * glow}px rgba(255,255,255,${0.55 * Math.min(1, glow)}))` : grade;

  // the previous cut's subject, carried over the new shot or flying past the camera
  let carried: React.ReactNode = null;
  const cn = IN[cut.tin] ?? 0;
  if ((cut.tin === 'carry' || cut.tin === 'pass') && prev?.matte && frame < cn) {
    const fly = cut.tin === 'pass' ? frame / cn : clamp01((frame - 4) / (cn - 4));
    const e = cubicIn(fly);
    const [px, py] = anchorAt(ctx, prev, prev.to);
    const at = sourceTime(prev, prev.to - prev.from, fps) + t * prev.rate - prev.matte.in;
    carried = (
      <AbsoluteFill style={{ transform: `scale(${1 + 2.2 * e})`, transformOrigin: `${px * w}px ${py * h}px`, opacity: 1 - clamp01((fly - 0.55) / 0.45) }}>
        <ZoomBlur amount={e} ox={px * w} oy={py * h}>
          <Frame src={matteSrc(ctx, prev.matte.key)} t={at} transparent style={{ objectFit: 'fill', filter: has(prev, 'mono') ? 'grayscale(1) contrast(1.2)' : 'contrast(1.07) saturate(1.06)', ...placed(viewAt(ctx, prev, prev.to)) }} />
        </ZoomBlur>
      </AbsoluteFill>
    );
  }

  // liquid: the last shot's picture keeps flowing in the same field and dissolves into this one
  // (its take holds its last frame if it ends), so the two melt into each other instead of switching
  let melted: React.ReactNode = null;
  if (cut.tin === 'liquid' && prev && !prev.gfx && !prev.panels && frame < liqIn) {
    const take = ctx.footage.shots[prev.src];
    const pt = sourceTime(prev, prev.to - prev.from + t, fps);
    const at = take ? Math.max(take[0], Math.min(take[1] - 1 / fps, pt)) : pt;
    melted = <Frame src={plateSrc(ctx, prev.source)} t={at} style={{ filter: gradeOf(prev), opacity: 1 - inOut(clamp01(frame / (liqIn * 0.7))), ...placed(viewAt(ctx, prev, prev.to)) }} />;
  }

  const rig = cut.src === '@lights' ? (ctx.gfx.lights ?? []).filter(l => beatTime(m as never, l.on[0]) <= cut.to + 0.01).pop() : undefined;
  const picture =
    cut.src === '@lights' && rig ? (
      <StartLights manifest={m} theme={ctx.theme} w={w} h={h} cfg={rig} song={song} />
    ) : cut.src === '@title' && ctx.gfx.title ? (
      <TitleCard slug={ctx.slug} manifest={m} theme={ctx.theme} w={w} h={h} cfg={ctx.gfx.title} song={song} from={cut.from} to={cut.to} />
    ) : cut.src === '@split' ? (
      <Split ctx={ctx} cut={cut} t={t} grade={grade} />
    ) : cut.src === '@flashes' ? (
      <BeatFlashes ctx={ctx} cut={cut} song={song} />
    ) : cut.src === '@void' ? (
      <VoidStage ctx={ctx} cut={cut} song={song} />
    ) : cut.gfx ? null : (
      <ZoomBlur amount={zblur} ox={ox} oy={oy}>
        <Frame {...(slowClip(ctx, cut, srcT) ?? { src: plateSrc(ctx, cut.source), t: srcT })} exact={slowed} style={{ filter: grade, ...view }} />
      </ZoomBlur>
    );
  // the reverb's echoes: the frame as it was when each sound left, scaled out from the centre and
  // softening as it fades, screened over the picture like the tail ringing out
  const echoes = rv?.hits.map(([age, s, t0], k) => {
    const o = 0.34 * s * rv.fade * Math.exp(-age * 2.8) * clamp01(age / 0.05);
    if (o < 0.01) return null;
    const e = 1 - Math.exp(-age * 2.6);
    const at = sourceTime(cut, Math.max(0, t0 - cut.from), fps);
    return (
      <AbsoluteFill key={`rv${k}`} style={{ transform: `scale(${1 + 0.18 * e})`, transformOrigin: `${rv.at[0] * w}px ${rv.at[1] * h}px`, opacity: o, mixBlendMode: 'screen', filter: `blur(${(0.5 + 2.5 * e).toFixed(2)}px)` }}>
        <Frame {...(slowClip(ctx, cut, at) ?? { src: plateSrc(ctx, cut.source), t: at })} exact={slowed} style={{ filter: grade, ...view }} />
      </AbsoluteFill>
    );
  });
  const cutoutAt = (lag = 0) => (cut.matte ? sourceTime(cut, Math.max(0, t - lag), fps) - cut.matte.in : 0);
  const needCutout = cut.matte && (behind.length > 0 || echo || pop || glow > 0.02);
  const subject = (
    <>
      {behind.map(x => (x.style === 'flank' ? <FlankWords key={x.i} ctx={ctx} rt={x} cut={cut} song={song} /> : <BigWords key={x.i} ctx={ctx} rt={x} song={song} cut={cut} />))}
      {echo && cut.matte && Array.from({ length: echo.n ?? 3 }, (_, k) => k + 1).reverse().map(k => (
        <Frame key={k} src={matteSrc(ctx, cut.matte!.key)} t={cutoutAt(k * (echo.dt ?? 0.06))} transparent style={{ objectFit: 'fill', filter: grade, opacity: 0.5 / k, ...view }} />
      ))}
      {needCutout && <Frame src={matteSrc(ctx, cut.matte!.key)} t={matteT} transparent exact={slowed} style={{ objectFit: 'fill', filter: cutoutFilter, ...view }} />}
      {cut.matte && behind.filter(x => x.style === 'big').map(x => <BigWords key={`o${x.i}`} ctx={ctx} rt={x} song={song} cut={cut} outline />)}
      {decals.map(x => <Decal key={`d${x.i}`} ctx={ctx} rt={x} cut={cut} song={song} />)}
      {/* a word set into the shot waits for a zoom, spin or whip entry to settle (it rides the camera, and mid-zoom it is blown up off the edge) */}
      {planes.map(x => <PlaneWord key={`p${x.i}`} ctx={ctx} rt={x} song={song} from={Math.max(x.from, cut.from + (['zoom', 'spin', 'whip', 'whipr', 'whipv'].includes(cut.tin) ? (0.5 * (IN[cut.tin] ?? 0)) / fps : 0))} to={Math.min(x.to, cut.to)} />)}
    </>
  );
  const flash = cut.tin === 'flash' ? interpolate(frame, [0, IN.flash!], [0.85, 0], { extrapolateRight: 'clamp' }) : frozen && frame < 2 ? 0.35 : 0;

  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) rotate(${sr}deg)` }}>
      {liq > 0.01 && (
        // soft waves that keep drifting with the song, the same field on both sides of the cut
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <filter id={liqId} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency={`${(0.0042 + 0.0008 * Math.sin(song * 3)).toFixed(5)} ${(0.0075 + 0.0012 * Math.cos(song * 2.4)).toFixed(5)}`} numOctaves={2} seed={7} result="n" />
            <feColorMatrix in="n" type="matrix" values="1 0 0 0 0  0 0.45 0 0 0.275  0 0 1 0 0  0 0 0 1 0" result="m" />
            <feDisplacementMap in="SourceGraphic" in2="m" scale={(LIQ_MAX * liq).toFixed(1)} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      <div style={{ position: 'absolute', left: ctx.win.x, top: ctx.win.y, width: w, height: h, overflow: pop ? 'visible' : 'hidden', transform: box !== 1 ? `scale(${box})` : undefined }}>
        <div style={{ position: 'absolute', inset: 0, transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${scale * (frozen ? 1.04 : 1)})`, transformOrigin: `${ox}px ${oy}px`, filter: camFilter }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: pop ? `scale(${1 - 0.26 * popP})` : undefined, outline: pop ? `4px solid ${colors.bone}` : undefined }}>
            {picture}
            {melted}
            {echoes}
            {!pop && subject}
            {has(cut, 'streaks') && <Streaks ctx={ctx} cut={cut} t={t} />}
          </div>
          {pop && subject}
        </div>
        {carried}
        {flash > 0 && <AbsoluteFill style={{ background: colors.bone, opacity: flash }} />}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ bars

/** the rev lights in the top bar: 15 slanted blocks, bone for the first 10, red for the last 5 */
const SHIFT_N = 15;
const SHIFT_RED = 10;

/** a lyric line as a caption in the bottom bar: the words arrive as they are sung. In a vertical frame
 *  it sits over the picture (shadowed), larger, and a long line breaks in two instead of shrinking */
const Caption: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number; y: number }> = ({ ctx, rt, song, y }) => {
  const { fonts, colors } = ctx.theme;
  const typed = rt.style === 'sub';
  const track = ctx.tall ? 0.16 : 0.26;
  const maxW = ctx.tall ? ctx.win.w * 0.84 : 1180;
  const cap = ctx.tall ? typeH(ctx) * 0.05 : 26;
  const words = rt.words.map((wd, k) => ({ ...wd, k }));
  const widthOf = (ws: typeof words) => measure(ws.map(x => x.text).join(' '), fonts.line, 100, track);
  let lines = [words];
  if (ctx.tall && words.length > 1 && (cap / 100) * widthOf(words) > maxW) {
    let best = 1;
    for (let k = 2; k < words.length; k++) if (Math.max(widthOf(words.slice(0, k)), widthOf(words.slice(k))) < Math.max(widthOf(words.slice(0, best)), widthOf(words.slice(best)))) best = k;
    lines = [words.slice(0, best), words.slice(best)];
  }
  const size = Math.min(cap, ...lines.map(l => (maxW / Math.max(1, widthOf(l))) * 100));
  const enter = prog(song, rt.from - 0.05, rt.from + 0.2);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, transform: `translateY(calc(-50% + ${(1 - enter) * 8}px))`, textAlign: 'center', whiteSpace: 'nowrap' }}>
      {lines.map((line, li) => (
        <div key={li}>
          <span style={{ fontFamily: fonts.line, fontSize: size, letterSpacing: `${track}em`, color: colors.bone, textShadow: ctx.tall ? '0 2px 16px rgba(0,0,0,0.8)' : undefined }}>
            {line.map(({ text, at, k }) => {
              const p = prog(song, at - 0.03, at + 0.1);
              const now = song >= at && (k === rt.words.length - 1 || song < rt.words[k + 1].at);
              return (
                <span key={k} style={{ opacity: typed ? (song >= at ? 1 : 0) : (ctx.tall ? 0.3 : 0.12) + (ctx.tall ? 0.7 : 0.88) * p, color: now && !typed ? colors.bone : undefined, textShadow: now && !typed ? `0 0 14px rgba(242,240,234,0.45)` : undefined }}>
                  {text}
                  {k < rt.words.length - 1 && line[line.length - 1].k !== k ? ' ' : ''}
                </span>
              );
            })}
            {typed && li === lines.length - 1 && <span style={{ color: colors.red, opacity: Math.floor(song * 4) % 2 ? 1 : 0 }}> ▌</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

/** '#rrggbb' → [r, g, b] in 0..1 */
const rgb01 = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * gfx.meter 'ecg': a heart-monitor trace in the top bar. It beats on every beat of the grid (an 80 BPM
 * song is a resting heart), each beat taller where the song is loud and the kick hits; it scrolls right
 * to left, the newest beat at the bright head; from beat `flatline` on the line runs flat.
 */
const ECG_W = 560;
const ECG_H = 64;
const ECG_SPAN = 2.6; // seconds of trace on screen
const g = (d: number, mu: number, sd: number) => Math.exp(-((d - mu) ** 2) / (2 * sd * sd));
const beatShape = (d: number) => 0.12 * g(d, -0.09, 0.018) - 0.18 * g(d, -0.018, 0.006) + g(d, 0, 0.008) - 0.35 * g(d, 0.02, 0.008) + 0.22 * g(d, 0.14, 0.035);
const Ecg: React.FC<{ ctx: Ctx; song: number; flatline?: number; opacity: number }> = ({ ctx, song, flatline, opacity }) => {
  const m = ctx.manifest;
  const { colors } = ctx.theme;
  const flatT = flatline !== undefined ? beatTime(m as never, flatline) : Infinity;
  const beats = m.beats.list.map(b => b.t).filter(t => t > song - ECG_SPAN - 0.3 && t < song + 0.3 && t < flatT);
  const amps = beats.map(t => 0.35 + 0.45 * clamp01(envelopeAt(m, 'rms', t) * 1.3) + 0.2 * hitAt(m, 'kick', t + 0.02, 14));
  const pts: string[] = [];
  for (let x = 0; x <= ECG_W; x += 2) {
    const tt = song - ECG_SPAN + (x / ECG_W) * ECG_SPAN;
    let y = 0;
    if (tt < flatT) beats.forEach((b, k) => { const d = tt - b; if (d > -0.15 && d < 0.25) y += amps[k] * beatShape(d); });
    pts.push(`${x},${(ECG_H / 2 - y * ECG_H * 0.42).toFixed(1)}`);
  }
  const lastY = pts[pts.length - 1].split(',')[1];
  const flat = song >= flatT;
  const c = flat ? colors.bone : colors.red;
  return (
    <svg width={ECG_W} height={ECG_H} style={{ overflow: 'visible', opacity }}>
      <defs>
        <linearGradient id="remix-ecg-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={c} stopOpacity={0} />
          <stop offset="65%" stopColor={c} stopOpacity={0.75} />
          <stop offset="100%" stopColor={c} stopOpacity={1} />
        </linearGradient>
      </defs>
      <line x1={0} x2={ECG_W} y1={ECG_H / 2} y2={ECG_H / 2} stroke={colors.bone} strokeOpacity={0.07} strokeWidth={1} />
      <polyline points={pts.join(' ')} fill="none" stroke="url(#remix-ecg-fade)" strokeWidth={2.8} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 5px ${c})` }} />
      <circle cx={ECG_W} cy={lastY} r={4.2} fill={c} style={{ filter: `drop-shadow(0 0 8px ${c}) drop-shadow(0 0 3px #fff)` }} />
    </svg>
  );
};

/**
 * gfx.meter 'bolt' (quicksilverxkingpin rev-002: "for the beat signal bar, come up with a different concept
 * that suits the character"): a speedster's lightning bolt in the top bar, with speed lines either side
 * that charge outward from it with the bass (the outermost in the accent, like a rev limit); each kick
 * flashes the bolt and sends a crackle of lightning out along the lit lines.
 */
const BOLT_N = 7;
const BOLT_W = 560;
const BOLT_H = 60;
const BoltMeter: React.FC<{ ctx: Ctx; song: number; opacity: number }> = ({ ctx, song, opacity }) => {
  const m = ctx.manifest;
  const { colors } = ctx.theme;
  const rpm = clamp01(envelopeAt(m, 'low', song) * 1.15);
  const lit = rpm * BOLT_N;
  const kick = hitAt(m, 'kick', song, 12);
  const last = (m.onsets?.kick ?? []).reduce<[number, number] | undefined>((a, o) => (o[0] <= song && o[1] > 0.3 ? o as [number, number] : a), undefined);
  const crackle = last ? Math.exp(-(song - last[0]) * 16) : 0;
  const cx = BOLT_W / 2;
  const cy = BOLT_H / 2;
  const glow = 0.25 + 0.75 * Math.max(kick, 0.5 * rpm);
  const reach = 22 + lit * 34; // how far the lit lines run from the bolt's centre
  const zig = (side: -1 | 1) => {
    const pts: string[] = [];
    for (let x = 14; x <= reach; x += 13) {
      const j = (random(`bolt${last?.[0]}${side}${x}`) - 0.5) * 14;
      pts.push(`${(cx + side * x).toFixed(1)},${(cy + j).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  return (
    <svg width={BOLT_W} height={BOLT_H} style={{ overflow: 'visible', opacity }}>
      {([-1, 1] as const).map(side =>
        Array.from({ length: BOLT_N }, (_, k) => {
          const on = clamp01(lit - k);
          const x0 = cx + side * (24 + k * 34);
          const len = 18 + k * 2.5;
          const y = cy + [-8, 6, -2][k % 3];
          const c = k >= BOLT_N - 2 ? colors.red : colors.bone;
          return (
            <line key={`${side}${k}`} x1={x0} y1={y} x2={x0 + side * len} y2={y} stroke={on > 0.02 ? c : 'rgba(255,255,255,0.08)'} strokeWidth={3}
              strokeLinecap="round" strokeOpacity={on > 0.02 ? 0.35 + 0.65 * on : 1} style={on > 0.5 ? { filter: `drop-shadow(0 0 6px ${c})` } : undefined} />
          );
        }),
      )}
      {crackle > 0.03 && ([-1, 1] as const).map(side => (
        <polyline key={`z${side}`} points={zig(side)} fill="none" stroke={colors.cyan} strokeWidth={1.6} strokeLinejoin="round" opacity={crackle}
          style={{ filter: `drop-shadow(0 0 5px ${colors.cyan}) drop-shadow(0 0 2px #fff)` }} />
      ))}
      <path
        d={`M${cx + 5},${cy - 26} L${cx - 11},${cy + 3} L${cx - 1},${cy + 3} L${cx - 6},${cy + 26} L${cx + 11},${cy - 5} L${cx + 1},${cy - 5} Z`}
        fill={colors.bone} fillOpacity={0.55 + 0.45 * glow}
        style={{ filter: `drop-shadow(0 0 ${(4 + 12 * glow).toFixed(1)}px ${colors.cyan}) drop-shadow(0 0 ${(2 + 4 * kick).toFixed(1)}px #fff)` }}
        transform={`translate(${(2 * kick).toFixed(2)}, 0)`}
      />
    </svg>
  );
};

/**
 * gfx.tensionStyle 'smoke' (Breaking Bad's opening credits): green chemical smoke creeps in from the
 * edges of the picture as the drop approaches, rising, with element symbols drifting through it;
 * `k` is the tension 0..1. Released on the hit like the bars.
 */
const SMOKE_ELEMENTS: [string, number][] = [['Br', 35], ['Ba', 56], ['C', 6], ['H', 1], ['N', 7], ['Hg', 80]];
const ChemSmoke: React.FC<{ ctx: Ctx; song: number; k: number }> = ({ ctx, song, k }) => {
  const { w, h } = ctx.win;
  const { colors, fonts } = ctx.theme;
  const [r, gg, b] = rgb01(colors.red);
  const rise = (song * 26) % h;
  const clear = Math.max(8, 72 - 62 * k);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="remix-smoke" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.0055 0.008" numOctaves={4} seed={4} />
            <feColorMatrix type="matrix" values={`0 0 0 0 ${r} 0 0 0 0 ${gg} 0 0 0 0 ${b} 1.7 0 0 0 -0.55`} />
          </filter>
          <radialGradient id="remix-smoke-grad" cx="50%" cy="50%" r="72%">
            <stop offset={`${clear}%`} stopColor="#000" />
            <stop offset="100%" stopColor="#fff" />
          </radialGradient>
          <mask id="remix-smoke-mask"><rect width={w} height={h} fill="url(#remix-smoke-grad)" /></mask>
        </defs>
        <g mask="url(#remix-smoke-mask)" opacity={0.35 + 0.65 * k} style={{ mixBlendMode: 'screen' }}>
          <rect x={0} y={0} width={w} height={h * 2} filter="url(#remix-smoke)" transform={`translate(0, ${-rise})`} />
        </g>
      </svg>
      {SMOKE_ELEMENTS.map(([sym, n], i) => {
        const side = i % 2 ? 1 : -1;
        const x = w / 2 + side * w * (0.3 + 0.16 * random(`sx${i}`));
        const y = h * (0.2 + 0.6 * random(`sy${i}`)) - ((song * (14 + 8 * random(`sv${i}`))) % (h * 0.4));
        const flick = clamp01(k * 1.4 - 0.15 - 0.25 * random(`sf${i}`)) * (0.55 + 0.45 * Math.sin(song * 3 + i * 1.7));
        const size = 52 + 26 * random(`ss${i}`);
        return (
          <div key={sym} style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, border: `2px solid ${colors.red}`, opacity: flick * 0.8, boxShadow: `0 0 18px ${colors.red}`, background: 'rgba(0,0,0,0.25)' }}>
            <div style={{ position: 'absolute', left: 5, top: 3, fontFamily: fonts.data, fontSize: size * 0.16, color: colors.bone }}>{n}</div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.punch, fontSize: size * 0.52, color: colors.bone }}>{sym}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * 'bar': a punch word in the letterbox bar above the picture, in the meter's place (quicksilverxkingpin
 * v3: big words over the picture were "closing up the screen, I can't see the characters"). Bold in the
 * punch font, as tall as the bar allows; each word streaks in from the left in a few frames with
 * afterimages trailing it in the accent, like he ran it there, flares as it lands, and the cue streaks
 * out to the right as it ends.
 */
const BAR_RUN = 0.14; // s a word takes to run in
const BAR_OUT = 0.09; // s the cue takes to run out
// horizontal motion blur per level (px), in filters wide enough for a word sliding past (the scene's
// remix-mbh filters keep a 10 % margin and clip a blurred word into a box)
const BAR_MB = [0, 6, 12, 20, 30];
const BarWord: React.FC<{ ctx: Ctx; rt: ResolvedText; song: number; y: number }> = ({ ctx, rt, song, y }) => {
  const { fonts, colors } = ctx.theme;
  const { w } = ctx.win;
  const text = rt.words.map(x => x.text).join(' ');
  // as tall as the letterbox bar allows; in a vertical frame (no bars) a big headline over the picture
  const size = useMemo(
    () => (ctx.tall ? Math.min(typeH(ctx) * 0.16, ((w * 0.84) / Math.max(1, measure(text, fonts.punch, 100, 0.02))) * 100) : Math.min(ctx.win.y * 0.72, ((w * 0.56) / Math.max(1, measure(text, fonts.punch, 100, 0.02))) * 100)),
    [text, ctx.win.y, w, fonts.punch],
  );
  const color = colorOf(ctx.theme, rt.cue.color);
  // where a word is at time `s`: arriving from the left (ease out), leaving to the right (ease in)
  const xAt = (at: number, s: number) => -((1 - clamp01((s - at) / BAR_RUN)) ** 3) * w * 0.5 + clamp01((s - (rt.to - BAR_OUT)) / BAR_OUT) ** 2 * w * 0.4;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, transform: 'translateY(-50%)', textAlign: 'center', whiteSpace: 'nowrap', fontFamily: fonts.punch, fontSize: size, lineHeight: 1, letterSpacing: '0.02em' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        {BAR_MB.map((px, k) => k > 0 && (
          <filter key={k} id={`remix-barmb${k}`} x="-150%" y="-20%" width="400%" height="140%"><feGaussianBlur stdDeviation={`${px} 0`} /></filter>
        ))}
      </svg>
      {rt.words.map((wd, k) => {
        if (song < wd.at - 1e-3) return <span key={k} style={{ visibility: 'hidden', marginRight: k < rt.words.length - 1 ? '0.22em' : 0 }}>{wd.text}</span>;
        const x = xAt(wd.at, song);
        const speed = Math.abs(x - xAt(wd.at, song - 1 / 30)) / (w * 0.08);
        const flare = Math.exp(-Math.max(0, song - wd.at - BAR_RUN) * 9) * clamp01((song - wd.at) / BAR_RUN);
        const mb = Math.min(4, Math.round(speed * 4));
        return (
          <span key={k} style={{ position: 'relative', display: 'inline-block', marginRight: k < rt.words.length - 1 ? '0.22em' : 0 }}>
            {[3, 2, 1].map(g => {
              const gx = xAt(wd.at, song - 0.03 * g);
              if (Math.abs(gx - x) < 3) return null;
              return (
                <span key={g} style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${gx}px)`, color: colors.cyan, opacity: 0.4 / g, filter: 'url(#remix-barmb2)' }}>
                  {wd.text}
                </span>
              );
            })}
            <span
              style={{
                position: 'relative', display: 'inline-block', transform: `translateX(${x}px)`, color,
                filter: mb ? `url(#remix-barmb${mb})` : undefined,
                textShadow: `0 0 ${(10 + 34 * flare).toFixed(1)}px color-mix(in srgb, ${color} ${Math.round(30 + 50 * flare)}%, transparent)`,
              }}
            >
              {wd.text}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const Bars: React.FC<{ ctx: Ctx; song: number }> = ({ ctx, song }) => {
  const { win, theme } = ctx;
  const { fonts, colors } = theme;
  const m = ctx.manifest;
  const bar = (m.beats.downbeats ?? []).filter(d => d <= song).length;
  const section = m.sections.find(s => song >= s.from && song < s.to)?.label ?? '';
  const lap = `${Math.floor(song / 60)}:${(song % 60).toFixed(3).padStart(6, '0')}`;
  const on = prog(song, 0.3, 1.2);
  const top = win.y / 2;
  const bottom = win.y + win.h + (1080 - win.y - win.h) / 2;
  const small: React.CSSProperties = { position: 'absolute', fontFamily: fonts.data, fontSize: 15, letterSpacing: '0.32em', color: colors.bone, opacity: 0.5 * on, transform: 'translateY(-50%)', textTransform: 'uppercase', whiteSpace: 'nowrap' };
  const rpm = clamp01(envelopeAt(m, 'low', song) * 1.15);
  const lit = Math.round(rpm * SHIFT_N);
  const corners = theme.corners !== false;
  const kmh = Math.round(80 + 260 * envelopeAt(m, 'rms', song));
  const gear = Math.min(8, 1 + Math.floor(rpm * 8));
  const active = ctx.text.filter(x => song >= x.from && song < x.to);
  // the bottom caption steps aside while a line flows through the centre ('flow')
  const caption = active.some(x => x.style === 'flow') ? undefined : active.find(x => x.style === 'sub') ?? active.find(x => x.style === 'line');
  const label = active.find(x => x.style === 'label');
  const barWord = active.filter(x => x.style === 'bar').pop();
  if (ctx.tall) {
    // a vertical frame has no bars: the top word (or label) and the caption sit over the picture, clear
    // of the platforms' buttons; no meter, HUD or corner readouts
    return (
      <>
        {barWord ? (
          <BarWord ctx={ctx} rt={barWord} song={song} y={ctx.safe.top} />
        ) : label ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: ctx.safe.top, transform: 'translateY(-50%)', textAlign: 'center', fontFamily: fonts.data, fontSize: 26, letterSpacing: '0.45em', color: colors.red, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
            {label.cue.text.slice(0, Math.ceil(label.cue.text.length * prog(song, label.from, label.from + 0.3)))}
          </div>
        ) : null}
        {caption && <Caption ctx={ctx} rt={caption} song={song} y={ctx.safe.caption} />}
      </>
    );
  }
  return (
    <>
      {corners && <div style={{ ...small, left: 56, top }}>{theme.hud ?? ''}</div>}
      {barWord ? (
        <BarWord ctx={ctx} rt={barWord} song={song} y={top} />
      ) : label ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top, transform: 'translateY(-50%)', textAlign: 'center', fontFamily: fonts.data, fontSize: 18, letterSpacing: '0.45em', color: colors.red }}>
          {label.cue.text.slice(0, Math.ceil(label.cue.text.length * prog(song, label.from, label.from + 0.3)))}
        </div>
      ) : ctx.gfx.meter?.kind === 'bolt' ? (
        <div style={{ position: 'absolute', left: '50%', top, transform: 'translate(-50%, -50%)' }}>
          <BoltMeter ctx={ctx} song={song} opacity={on} />
        </div>
      ) : ctx.gfx.meter?.kind === 'ecg' ? (
        <div style={{ position: 'absolute', left: '50%', top, transform: 'translate(-50%, -50%)' }}>
          <Ecg ctx={ctx} song={song} flatline={ctx.gfx.meter.flatline} opacity={on} />
        </div>
      ) : (
        <div style={{ position: 'absolute', left: '50%', top, transform: 'translate(-50%, -50%)', display: 'flex', gap: 5, opacity: on }}>
          {Array.from({ length: SHIFT_N }, (_, k) => {
            const c = k < SHIFT_RED ? colors.bone : colors.red;
            return <div key={k} style={{ width: 20, height: 9, transform: 'skewX(-28deg)', background: k < lit ? c : 'rgba(255,255,255,0.08)', boxShadow: k < lit ? `0 0 10px ${c}` : undefined }} />;
          })}
        </div>
      )}
      {corners && (
        <>
          <div style={{ ...small, right: 56, top }}>LAP {lap}</div>
          <div style={{ ...small, left: 56, top: bottom }}>{section.replace('-', ' ')} · {String(bar).padStart(2, '0')}/{(m.beats.downbeats ?? []).length}</div>
          <div style={{ ...small, right: 56, top: bottom }}>
            <span style={{ color: colors.red }}>G{gear}</span>&nbsp;&nbsp;{String(kmh).padStart(3, '0')} KM/H
          </div>
        </>
      )}
      {caption && <Caption ctx={ctx} rt={caption} song={song} y={bottom} />}
    </>
  );
};

// ------------------------------------------------------------------ the scene

const BLUR_PX = [0, 6, 14, 26, 40, 56, 76];

export const Remix: React.FC<SceneProps<RemixProps>> = ({ manifest, slug, blocks, words, sfx = [], gfx = {}, footage, anchors, window: [ww, wh], theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ready = useFontsReady(theme.ready);
  const r = useMemo(() => resolveAll(manifest as never, footage, blocks, words, sfx, new Set(Object.keys(anchors))), [manifest, footage, blocks, words, sfx, anchors]);
  const bulge = useMemo(() => bulgeMap(Math.round(ww / 2), Math.round(wh / 2)), [ww, wh]);
  // a vertical frame (a short): the window is the whole frame and each cut reframes the wide picture
  const tall = height > width;
  const bands = useMemo(() => {
    const out = new Map<string, { y: number; h: number }>();
    if (!tall) return out;
    // h: the box's height over its width; the wide picture's own shape (nothing cropped) by default
    const box = (y?: number, h?: number) => ({ y: y ?? 0.5, h: Math.round(width * (h ?? wh / ww)) });
    const ranges = (gfx.band ?? []).map(([a, b, h, y]) => ({ a: beatTime(manifest as never, a), b: beatTime(manifest as never, b), h, y }));
    for (const c of r.cuts) {
      const fx = has(c, 'band');
      const range = ranges.find(x => c.from >= x.a - 1e-3 && c.from < x.b);
      if (fx) out.set(c.id, box(fx.y, fx.h));
      else if (!c.gfx && range) out.set(c.id, box(range.y, range.h));
    }
    return out;
  }, [tall, gfx.band, r.cuts, manifest, width, ww, wh]);
  // 9:16 keeps the bottom quarter and the top tenth for the Shorts / Reels / TikTok buttons and titles; 3:4 and 4:5 feed posts have none
  const safe = height / width > 1.6 ? { top: height * 0.19, caption: height * 0.7 } : { top: height * 0.12, caption: height * 0.87 };
  const win = tall ? { x: 0, y: 0, w: width, h: height } : { x: (width - ww) / 2, y: (height - wh) / 2, w: ww, h: wh };
  const ctx: Ctx = { slug, manifest, theme, win, text: r.text, cuts: r.cuts, anchors, footage, gfx, tall, plate: [ww, wh], bands, safe, frame: { w: width, h: height } };
  // the warp filters work in their element's own pixels: one set for the window, one per band height
  const warps: [string, number, number][] = tall
    ? [['remix-warp', width, height], ...[...new Set([...bands.values()].map(b => b.h))].map(h => [`remix-warp-b${h}-`, width, h] as [string, number, number])]
    : [['remix-warp', ww, wh]];
  const song = frame / fps;
  if (!ready) return null;
  const active = r.text.filter(x => song >= x.from - 1e-3 && song < x.to);
  // pre-drop tension: the frame darkens and the bars close in, released on the drop
  const tens = Math.max(0, ...(gfx.tension ?? []).map(([a, b]) => {
    const ta = beatTime(manifest as never, a);
    const tb = beatTime(manifest as never, b);
    return song >= ta && song < tb ? Easing.in(Easing.quad)((song - ta) / (tb - ta)) : 0;
  }));
  return (
    <AbsoluteFill style={{ background: theme.colors.ground }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        {[1, 2, 3, 4, 5, 6].map(k => (
          <React.Fragment key={k}>
            <filter id={`remix-mbh${k}`} x="-10%" y="0%" width="120%" height="100%"><feGaussianBlur stdDeviation={`${BLUR_PX[k]} 0`} /></filter>
            <filter id={`remix-mbv${k}`} x="0%" y="-10%" width="100%" height="120%"><feGaussianBlur stdDeviation={`0 ${BLUR_PX[k]}`} /></filter>
            {warps.map(([id, fw, fh]) => (
              <filter key={id} id={`${id}${k}`} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x={0} y={0} width={fw} height={fh} colorInterpolationFilters="sRGB">
                <feImage href={bulge} x={0} y={0} width={fw} height={fh} preserveAspectRatio="none" result="map" />
                <feDisplacementMap in="SourceGraphic" in2="map" scale={WARP_PX[k]} xChannelSelector="R" yChannelSelector="G" />
              </filter>
            ))}
          </React.Fragment>
        ))}
        <filter id="remix-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 9} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      {r.cuts.map(c => {
        const from = Math.round(c.from * fps);
        return (
          <Sequence key={c.id} from={from} durationInFrames={Math.max(1, Math.round(c.to * fps) - from)} name={`${c.id} ${c.src}`} layout="none">
            <Shot ctx={ctx} cut={c} />
          </Sequence>
        );
      })}
      <div style={{ position: 'absolute', left: ctx.win.x, top: ctx.win.y, width: ctx.win.w, height: ctx.win.h, pointerEvents: 'none' }}>
        <svg width={ctx.win.w} height={ctx.win.h} style={{ position: 'absolute', inset: 0, opacity: 0.06, mixBlendMode: 'overlay' }}>
          <rect width="100%" height="100%" filter="url(#remix-grain)" />
        </svg>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) ${58 - 30 * tens}%, rgba(0,0,0,${0.42 + 0.45 * tens}) 100%)` }} />
        {active.filter(x => x.style === 'timer').map(x => <Timer key={x.i} ctx={ctx} rt={x} song={song} />)}
        {active.filter(x => x.style === 'map').map(x => <TrackMap key={x.i} ctx={ctx} rt={x} song={song} />)}
        {active.filter(x => x.style === 'front').map(x => <BigWords key={x.i} ctx={ctx} rt={x} song={song} front />)}
        {active.filter(x => x.style === 'comic').map(x => <ComicWord key={x.i} ctx={ctx} rt={x} song={song} />)}
        {active.filter(x => x.style === 'glass').map(x => <GlassWords key={x.i} ctx={ctx} rt={x} song={song} />)}
        {active.filter(x => x.style === 'stack').map(x => <StackWords key={x.i} ctx={ctx} rt={x} song={song} />)}
        {active.filter(x => x.style === 'flow').map(x => <FlowWords key={x.i} ctx={ctx} rt={x} song={song} />)}
        {active.filter(x => x.style === 'ko').map(x => <KoWord key={x.i} ctx={ctx} rt={x} song={song} />)}
        {tens > 0 && gfx.tensionStyle === 'smoke' && <ChemSmoke ctx={ctx} song={song} k={tens} />}
        {tens > 0 && gfx.tensionStyle !== 'smoke' && (
          <>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: (tall ? height * 0.09 : 150) * tens, background: theme.colors.ground }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: (tall ? height * 0.09 : 150) * tens, background: theme.colors.ground }} />
          </>
        )}
      </div>
      <Bars ctx={ctx} song={song} />
      {r.sfx.map((s, k) => (
        <Sequence key={k} from={Math.round(s.at * fps)} name={`sfx ${s.file}`} layout="none">
          <Audio src={staticFile(`${slug}/derived/sfx/${s.file}.wav`)} volume={s.gain} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
