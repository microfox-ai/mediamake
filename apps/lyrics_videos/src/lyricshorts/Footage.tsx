/**
 * The footage under a lyric short and the transitions of an anime shorts editor (see TransitionKind in
 * spec.ts), all by time: a frame is picked by clipTime (speed ramps, slow motion, the shot playing on
 * under the next one are just times), and a transition is an effect state (Fx) — scale, travel, spin,
 * blur, a reveal shape with its light — computed for its way in (after the cut) or its way out (before).
 *
 * The same Fx wrap either the footage alone (a cut inside a screen: it plays inside the letters) or a
 * whole composite (a cut where a screen changes: the old words and shot leave together, the new ones
 * arrive together) — LyricShort decides which.
 */
import React from 'react';
import { AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useVideoConfig } from 'remotion';
import { clipSpeed, clipTime, OVERLAP, type ResolvedCut, type Transition, type transitionOf } from './spec';

export type FootageLook = {
  grade: { saturate: number; contrast: number; brightness: number };
  /** the default flash colour */
  flash: string;
  /** how far the picture punches out on a kick (0.03 = 3 %) */
  pulse: number;
  /** blade light and iris ring */
  blade: string;
};

type Tr = ReturnType<typeof transitionOf>;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeIn = (u: number) => u * u * u;
const easeOut = (u: number) => 1 - (1 - u) ** 3;
const smooth = (u: number) => u * u * (3 - 2 * u);
const travel = (dir: Transition['dir'] = 'left') => ({ left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] })[dir] as [number, number];

export type Fx = {
  scale: number;
  tx: number;
  ty: number;
  rot: number;
  /** 0..1: scaled copies of the frame (a zoom blur) */
  zoomBlur: number;
  blurX: number;
  blurY: number;
  /** px of plain blur */
  soft: number;
  opacity: number;
  clipPath?: string;
  blade?: { kind: 'slash'; x0: number; x1: number; glow: number } | { kind: 'iris'; cx: number; cy: number; r: number; glow: number };
};
export const IDENT: Fx = { scale: 1, tx: 0, ty: 0, rot: 0, zoomBlur: 0, blurX: 0, blurY: 0, soft: 0, opacity: 1 };

/** a transition's way in, `tau` seconds after its cut; `depth` scales its zooms and spins (a whole
 *  composite zooms half as deep, or the words near the top are pushed out of the frame) */
export const entryFx = (tr: Tr, tau: number, W: number, H: number, depth = 1): Fx => {
  if (tr.kind === 'cut' || tau >= tr.in) return IDENT;
  const u = clamp01(tau / tr.in);
  const k = 1 - easeOut(u); // 1 → 0, landing decelerated
  const fx = { ...IDENT };
  if (tr.kind === 'zoom') {
    fx.scale = 1 + 0.9 * depth * k;
    fx.zoomBlur = k;
  } else if (tr.kind === 'whip') {
    const [vx, vy] = travel(tr.dir);
    fx.tx = -vx * 0.38 * W * k;
    fx.ty = -vy * 0.38 * H * k;
    fx.scale = 1 + 0.18 * k;
    fx.blurX = Math.abs(vx) * 46 * k;
    fx.blurY = Math.abs(vy) * 46 * k;
  } else if (tr.kind === 'spin') {
    fx.rot = -28 * k;
    fx.scale = 1 + 0.5 * depth * k;
    fx.zoomBlur = 0.7 * k;
  } else if (tr.kind === 'velocity') {
    fx.scale = 1 + 0.07 * k * k; // a punch as it lands
  } else if (tr.kind === 'dissolve') {
    fx.opacity = smooth(u);
    fx.soft = 10 * (1 - u);
  } else if (tr.kind === 'slash') {
    // the blade sweeps across, leaning; the new picture is on the side it has passed
    const lean = 0.42 * H;
    const fromRight = tr.dir !== 'right';
    const p = easeOut(u);
    const x = fromRight ? W + lean / 2 + 20 - p * (W + lean + 40) : -lean / 2 - 20 + p * (W + lean + 40);
    const x0 = x + lean / 2;
    const x1 = x - lean / 2;
    fx.clipPath = fromRight ? `polygon(${x0}px 0px, ${W + 60}px 0px, ${W + 60}px ${H}px, ${x1}px ${H}px)` : `polygon(-60px 0px, ${x0}px 0px, ${x1}px ${H}px, -60px ${H}px)`;
    fx.blade = { kind: 'slash', x0, x1, glow: 1 - u };
  } else if (tr.kind === 'iris') {
    const [ax, ay] = tr.at ?? [0.5, 0.42];
    const cx = ax * W;
    const cy = ay * H;
    const R = (easeIn(u) * 0.35 + easeOut(u) * 0.65) * Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.05;
    fx.clipPath = `circle(${R}px at ${cx}px ${cy}px)`;
    fx.blade = { kind: 'iris', cx, cy, r: R, glow: 1 - u };
  }
  return fx;
};

/** the way out of a shot into a cut that comes in with `next`, `before` seconds before that cut */
export const exitFx = (next: Tr, before: number, W: number, H: number, depth = 1): Fx => {
  if (next.out <= 0 || before > next.out || before < 0) return IDENT;
  const u = clamp01(1 - before / next.out);
  const k = easeIn(u); // 0 → 1, accelerating into the cut
  const fx = { ...IDENT };
  if (next.kind === 'zoom') {
    fx.scale = 1 + 0.9 * depth * k;
    fx.zoomBlur = k;
  } else if (next.kind === 'whip') {
    const [vx, vy] = travel(next.dir);
    fx.tx = vx * 0.38 * W * k;
    fx.ty = vy * 0.38 * H * k;
    fx.scale = 1 + 0.18 * k;
    fx.blurX = Math.abs(vx) * 46 * k;
    fx.blurY = Math.abs(vy) * 46 * k;
  } else if (next.kind === 'spin') {
    fx.rot = 28 * k;
    fx.scale = 1 + 0.5 * depth * k;
    fx.zoomBlur = 0.7 * k;
  } else if (next.kind === 'velocity') {
    fx.scale = 1 + 0.05 * u * u;
  }
  return fx;
};

export const combine = (a: Fx, b: Fx): Fx => ({
  scale: a.scale * b.scale,
  tx: a.tx + b.tx,
  ty: a.ty + b.ty,
  rot: a.rot + b.rot,
  zoomBlur: Math.max(a.zoomBlur, b.zoomBlur),
  blurX: Math.max(a.blurX, b.blurX),
  blurY: Math.max(a.blurY, b.blurY),
  soft: Math.max(a.soft, b.soft),
  opacity: a.opacity * b.opacity,
  clipPath: b.clipPath ?? a.clipPath,
  blade: b.blade ?? a.blade,
});

/** an Fx split in two for a whole composite: its motion (scale, travel, spin) goes to the footage and to
 *  the words' SVG separately — Chrome drops the multiply-blended letter mask when the whole composite is
 *  scaled as one layer (≈1.4× went black) — and its surface (blur, wipe, fade, blade) to a wrapper */
export const motionOf = (fx: Fx): Fx => ({ ...IDENT, scale: fx.scale, tx: fx.tx, ty: fx.ty, rot: fx.rot });
export const surfaceOf = (fx: Fx): Fx => ({ ...fx, scale: 1, tx: 0, ty: 0, rot: 0 });
/** the same motion as an SVG transform about `origin` */
export const svgMotion = (fx: Fx, [ox, oy]: [number, number]) =>
  `translate(${(ox + fx.tx).toFixed(1)} ${(oy + fx.ty).toFixed(1)}) rotate(${fx.rot.toFixed(2)}) scale(${fx.scale.toFixed(4)}) translate(${(-ox).toFixed(1)} ${(-oy).toFixed(1)})`;

/** wraps anything (a shot, or a whole composite of words and shot) in an Fx; `frame` renders the content
 *  once per copy a zoom blur needs (copies get their own extra scale) */
export const FxLayer: React.FC<{ fx: Fx; id: string; look: FootageLook; filter?: string; copies?: boolean; origin?: [number, number]; render: (copy: number) => React.ReactNode }> = ({ fx, id, look, filter, copies = true, origin, render }) => {
  const { width: W, height: H } = useVideoConfig();
  const dirBlur = fx.blurX > 0.5 || fx.blurY > 0.5;
  // without copies (a whole composite: each copy would be a full frame of words and shot) the zoom blur is a plain blur
  const filters = [dirBlur ? `url(#${id}-b)` : '', fx.soft > 0.3 ? `blur(${fx.soft.toFixed(1)}px)` : '', fx.zoomBlur > 0.05 ? `blur(${(fx.zoomBlur * (copies ? 3 : 7)).toFixed(1)}px)` : '', filter ?? ''].filter(Boolean).join(' ');
  const rings = copies && fx.zoomBlur > 0.05 ? [1, 2, 3, 4].map(i => ({ s: 1 + 0.045 * i * fx.zoomBlur, o: [0.4, 0.28, 0.18, 0.1][i - 1] * fx.zoomBlur })) : [];
  const b = fx.blade;
  return (
    <AbsoluteFill>
      {dirBlur ? (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <filter id={`${id}-b`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={`${fx.blurX.toFixed(1)} ${fx.blurY.toFixed(1)}`} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ clipPath: fx.clipPath, opacity: fx.opacity }}>
        <AbsoluteFill style={{ transform: `translate(${fx.tx.toFixed(1)}px, ${fx.ty.toFixed(1)}px) rotate(${fx.rot.toFixed(2)}deg) scale(${fx.scale.toFixed(4)})`, transformOrigin: origin ? `${origin[0].toFixed(0)}px ${origin[1].toFixed(0)}px` : undefined, filter: filters || undefined }}>
          {render(0)}
          {rings.map((r, i) => (
            <AbsoluteFill key={i} style={{ opacity: r.o, transform: `scale(${r.s})` }}>
              {render(i + 1)}
            </AbsoluteFill>
          ))}
        </AbsoluteFill>
      </AbsoluteFill>
      {b?.kind === 'slash' ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <line x1={b.x0} y1={-20} x2={b.x1} y2={H + 20} stroke={look.blade} strokeWidth={34} strokeOpacity={0.45 * b.glow} style={{ filter: 'blur(14px)' }} />
          <line x1={b.x0} y1={-20} x2={b.x1} y2={H + 20} stroke="#FFFFFF" strokeWidth={7} strokeOpacity={0.95 * b.glow} />
        </svg>
      ) : b?.kind === 'iris' ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <circle cx={b.cx} cy={b.cy} r={b.r} fill="none" stroke={look.blade} strokeWidth={30} strokeOpacity={0.4 * b.glow} style={{ filter: 'blur(10px)' }} />
          <circle cx={b.cx} cy={b.cy} r={b.r} fill="none" stroke="#FFFFFF" strokeWidth={5} strokeOpacity={0.9 * b.glow} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

/** a video frame at an exact time — frozen on frame 0 with the time in startFrom, in a Sequence of its
 *  own (the remix engine's Frame: Remotion clamps a frozen timeline position to the composition, which
 *  in a short shifted by its window shows the wrong frame or none) */
const Frame: React.FC<{ src: string; t: number }> = ({ src, t }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence layout="none">
      <Freeze frame={0}>
        <OffthreadVideo src={src} startFrom={Math.max(0, t * fps)} muted style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </Freeze>
    </Sequence>
  );
};

/** one cut's picture `tau` seconds in, with motion trails while a velocity ramp races */
const Shot: React.FC<{ c: ResolvedCut; src: string; tau: number }> = ({ c, src, tau }) => {
  const { fps } = useVideoConfig();
  const t = Math.min(c.span - 1 / 60, clipTime(c, tau));
  const speed = clipSpeed(c, tau);
  const trails = speed > 1.5 ? [1, 2, 3].map(i => ({ t: Math.max(0, t - (i * (speed - 1) * c.rate) / fps / 2.2), o: [0.42, 0.26, 0.15][i - 1] })) : [];
  return (
    <>
      <Frame src={src} t={t} />
      {trails.map((tr, i) => (
        <AbsoluteFill key={i} style={{ opacity: tr.o }}>
          <Frame src={src} t={tr.t} />
        </AbsoluteFill>
      ))}
    </>
  );
};

const kickAt = (kicks: [number, number][], t: number) => {
  let k = 0;
  for (const [tk, s] of kicks) if (tk <= t && t - tk < 0.5) k += s * Math.exp(-(t - tk) / 0.11);
  return Math.min(1.5, k);
};

/**
 * The footage at song time `t`: the cut playing then, with its own transitions — except at the cuts in
 * `whole` (those move the whole composite instead). `only`: just that cut, played on past its end (the
 * old picture under a slash, iris or dissolve that brings the next screen in).
 */
export const FootageAt: React.FC<{ slug: string; cuts: ResolvedCut[]; t: number; look: FootageLook; kicks: [number, number][]; whole: Set<number>; only?: number; id: string; outer?: Fx; origin?: [number, number] }> = ({ slug, cuts, t, look, kicks, whole, only, id, outer, origin }) => {
  const { width: W, height: H, fps } = useVideoConfig();
  // by frame, as the screens are placed
  const f = Math.round(t * fps);
  let i = only ?? cuts.findIndex(c => f >= Math.round(c.start * fps) && f < Math.round(c.end * fps));
  if (i < 0) i = t < cuts[0].start ? 0 : cuts.length - 1;
  const c = cuts[i];
  const tau = t - c.start;
  const src = (k: number) => staticFile(`${slug}/derived/lyricshorts/${cuts[k].file}`);
  const g = look.grade;
  const grade = `saturate(${g.saturate}) contrast(${g.contrast}) brightness(${g.brightness})${c.mono ? ' grayscale(1)' : ''}`;
  let fx = IDENT;
  if (only === undefined) {
    if (!whole.has(i)) fx = combine(fx, entryFx(c.tr, tau, W, H));
    const n = cuts[i + 1];
    if (n && !whole.has(i + 1)) fx = combine(fx, exitFx(n.tr, c.end - t, W, H));
  }
  if (outer) fx = combine(fx, outer);
  fx = { ...fx, scale: fx.scale * (1 + look.pulse * kickAt(kicks, t)) };
  // the shot before plays on under a slash, iris or dissolve that brings this one in
  const under = only === undefined && i > 0 && !whole.has(i) && OVERLAP[c.tr.kind] && tau < c.tr.in ? i - 1 : -1;
  return (
    <AbsoluteFill>
      {under >= 0 ? (
        <AbsoluteFill style={{ filter: grade }}>
          <Shot c={cuts[under]} src={src(under)} tau={t - cuts[under].start} />
        </AbsoluteFill>
      ) : null}
      <FxLayer fx={fx} id={`${id}-${i}`} look={look} filter={grade} origin={outer ? origin : undefined} render={() => <Shot c={c} src={src(i)} tau={tau} />} />
    </AbsoluteFill>
  );
};
