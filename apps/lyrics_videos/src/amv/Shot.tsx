/**
 * One shot at one song time: the camera (framing, push, drift, shake, tilt), the transition it is
 * in (whip smear, light burst, iris, glitch), the colour chapter with bloom, its effects (RGB split,
 * impact frames, neon line art) and, when it has a cutout, the subject drawn again over whatever
 * sits behind it (words behind him, silhouettes, rim light, echoes, the many arms).
 */
import React from 'react';
import { random, staticFile, useVideoConfig } from 'remotion';
import { hitAt } from '../kit/timing';
import type { Manifest } from '../kit/manifest';
import { AURA, GLPass, PAINT } from './gl';
import { CC, DirBlur, ENERGY, Frame, LOOKS, Washes } from './look';
import { offsetAt } from './speed';
import type { Cut, Shot, Strobe, Transition, World } from './types';

export type Phase = { kind: Transition; p: number; dir: 'in' | 'out' };

/** frames each transition takes before (out) and after (in) the cut, and whether both shots show at once */
export const TRANSITIONS: Record<Transition, { out: number; in: number; overlap: boolean }> = {
  cut: { out: 0, in: 0, overlap: false },
  'whip-l': { out: 3, in: 4, overlap: false },
  'whip-r': { out: 3, in: 4, overlap: false },
  'whip-u': { out: 3, in: 4, overlap: false },
  'whip-d': { out: 3, in: 4, overlap: false },
  zoom: { out: 5, in: 6, overlap: false },
  flash: { out: 1, in: 6, overlap: false },
  dip: { out: 6, in: 8, overlap: false },
  eye: { out: 0, in: 16, overlap: true },
  iris: { out: 7, in: 7, overlap: false },
  glitch: { out: 3, in: 5, overlap: false },
  shatter: { out: 0, in: 14, overlap: true },
  fade: { out: 0, in: 12, overlap: true },
  match: { out: 0, in: 4, overlap: false },
  liquid: { out: 0, in: 12, overlap: true },
  portal: { out: 0, in: 16, overlap: true },
  smoke: { out: 0, in: 12, overlap: true },
  mask: { out: 0, in: 10, overlap: true },
  blurin: { out: 0, in: 8, overlap: false },
  bloom: { out: 4, in: 5, overlap: false },
  bands: { out: 3, in: 5, overlap: true },
  blink: { out: 5, in: 6, overlap: false },
  // GPU (Amv.tsx ZOOMT): the out-part runs on the old shot, the in-part on the new one
  push: { out: 4, in: 7, overlap: false },
  'slide-l': { out: 4, in: 7, overlap: false },
  'slide-r': { out: 4, in: 7, overlap: false },
  'slide-u': { out: 4, in: 7, overlap: false },
  'slide-d': { out: 4, in: 7, overlap: false },
  warp: { out: 5, in: 8, overlap: false },
};

/** the smooth cuts drawn by the ZOOMT pass */
export const SMOOTH = new Set<Transition>(['push', 'slide-l', 'slide-r', 'slide-u', 'slide-d', 'warp']);
/** how much a push / warp leaves the new shot zoomed in once it has settled (it carries the zoom on) */
export const SETTLE = 0.14;
/** the settle at song time t: 0 at the cut, rising fast and easing out over the in-part */
export const settleOf = (s: Pick<Shot, 'from' | 'tin' | 'tlen'>, t: number) => {
  if (s.tin !== 'push' && s.tin !== 'warp') return 0;
  const inS = (s.tlen ?? TRANSITIONS[s.tin].in) / 30;
  const p = Math.min(1, Math.max(0, (t - s.from) / inS));
  return 1 - Math.pow(1 - p, 3);
};

/** frames a shot's incoming transition takes */
export const tinFrames = (s: Shot) => (s.tlen ?? TRANSITIONS[s.tin ?? 'cut'].in);

/** source time for a shot at song time t (continues past the shot's end for transition tails) */
export const sourceTime = (s: Shot, t: number): number => {
  const len = Math.max(1e-3, s.to - s.from);
  let u = t - s.from;
  if (s.hold !== undefined) u = Math.min(u, s.hold * len);
  const off = offsetAt(s, u, len);
  return Math.max(0, s.reverse ? s.in - off : s.in + off);
};

const W = 1920;
const H = 1080;

/**
 * The bass-drop punch at song time t (Cadence / Devil in the Details' jolt): the last drum hit at or
 * after the shot's start snaps the frame in and shoves it along a random direction, leaving a smear, a
 * red/blue split, a flash and a zoom burst that die away within ~0.3 s.
 */
export const bassAt = (hits: number[], t: number, from: number) => {
  let h = -1;
  for (const x of hits) {
    if (x > t + 1e-4) break;
    if (x >= from - 1e-4) h = x;
  }
  if (h < 0) return null;
  const age = t - h;
  if (age > 0.45) return null;
  const k = Math.exp(-age * 11);
  const dir = random(`bass${h.toFixed(3)}`) * Math.PI * 2;
  const amp = 22 * k;
  return {
    zoom: 0.075 * k,
    dx: Math.cos(dir) * amp,
    dy: Math.sin(dir) * amp,
    bx: Math.cos(dir) * 28 * k,
    by: Math.sin(dir) * 28 * k,
    blur: k > 0.12,
    rgb: 16 * k,
    flash: 0.45 * k * k,
    radial: 0.55 * k,
  };
};

/** the camera for a shot at time t: translate + scale + rotate, around the frame's centre */
export const camera = (
  s: Pick<Shot, 'from' | 'to' | 'z' | 'x' | 'y' | 'push' | 'drift' | 'rot' | 'shake' | 'kick' | 'fx' | 'flip'> & Partial<Pick<Shot, 'tin' | 'tlen'>>,
  t: number,
  m: Manifest,
  frame: number,
) => {
  const len = Math.max(1e-3, s.to - s.from);
  const k = Math.min(1.2, Math.max(0, (t - s.from) / len));
  const kick = s.kick ? hitAt(m, 'kick', t, 9) : 0;
  // a push / warp carries its zoom on into the new shot and leaves it there
  const z = ((s.z ?? 1) + (s.push ?? 0) * k + kick * 0.025) * (1 + SETTLE * settleOf(s, t));
  const fx = (s.x ?? 0.5) + (s.drift?.[0] ?? 0) * k;
  const fy = (s.y ?? 0.5) + (s.drift?.[1] ?? 0) * k;
  // keep the frame covered: the focus can only move as far as the zoom allows
  const lim = (1 - 1 / Math.max(1, z)) / 2;
  const cx = Math.max(-lim, Math.min(lim, fx - 0.5));
  const cy = Math.max(-lim, Math.min(lim, fy - 0.5));
  const amp = (s.shake ?? 0) * (s.kick ? 0.35 + kick : 1);
  const sx = amp ? (random(`sx${frame}`) - 0.5) * 2 * amp : 0;
  const sy = amp ? (random(`sy${frame}`) - 0.5) * 2 * amp : 0;
  const rot = (s.rot ?? 0) + (s.fx?.includes('tilt') ? -4 : 0) + (amp ? (random(`sr${frame}`) - 0.5) * amp * 0.03 : 0);
  return { z, tx: -cx * W * z + sx, ty: -cy * H * z + sy, rot, flip: s.flip ? -1 : 1 };
};

/** a shot's camera as the GPU passes take it: u_cam = (tx, ty, zx, zy) px, u_rot radians */
export const camUniforms = (s: Shot, t: number, m: Manifest, frame: number) => {
  const c = camera(s, t, m, frame);
  return { cam: [c.tx, c.ty, c.z * c.flip, c.z], rot: (c.rot * Math.PI) / 180 };
};

type Move = { tx: number; ty: number; scale: number; blurX: number; blurY: number; bright: number; radial: number; opacity: number; blur: number; rgb: number; sy: number };
const STILL: Move = { tx: 0, ty: 0, scale: 1, blurX: 0, blurY: 0, bright: 1, radial: 0, opacity: 1, blur: 0, rgb: 0, sy: 1 };

/** how a transition moves and blurs the shot that is leaving (out) or arriving (in) */
const transitionMove = (ph: Phase | undefined): Move => {
  if (!ph) return STILL;
  const { kind, p, dir } = ph;
  // e: 0 at the cut, 1 away from it (out: at the start of the out-part; in: at the end of the in-part)
  const e = dir === 'out' ? 1 - p : p;
  const s = 1 - e; // strength, peaks at the cut
  const ease = s * s;
  switch (kind) {
    case 'blink': {
      // the old TV (Goten): squeeze to a bright line and out (the last frame black), open again from it
      if (dir === 'out') return { ...STILL, sy: Math.max(0.004, 1 - Math.pow(p, 1.6)), bright: 1 + 2.2 * p, opacity: p > 0.92 ? 0 : 1 };
      const o = Math.pow(p, 0.7);
      return { ...STILL, sy: Math.max(0.004, o), bright: 1 + 1.8 * (1 - o), opacity: p < 0.12 ? 0 : 1 };
    }
    case 'match':
      // the cut lands on the matched shape: a small push and a breath of blur, nothing that hides the match
      return { ...STILL, scale: 1 + 0.045 * ease, blur: 3 * s };
    case 'blurin':
      return { ...STILL, scale: 1 + 0.14 * (1 - Math.pow(e, 0.6)), blur: 26 * (1 - Math.pow(e, 0.5)) };
    case 'bloom':
      if (dir === 'out') return { ...STILL, scale: 1 + 0.12 * ease, bright: 1 + 1.6 * ease, blur: 14 * ease };
      // the first frame in is black, then the new shot comes in split and soft
      return { ...STILL, opacity: p < 0.18 ? 0 : 1, scale: 1 + 0.1 * ease, blur: 10 * ease, rgb: 34 * ease, bright: 1 + 0.3 * s };
    case 'whip-l':
    case 'whip-r':
    case 'whip-u':
    case 'whip-d': {
      const horiz = kind === 'whip-l' || kind === 'whip-r';
      const sign = kind === 'whip-l' || kind === 'whip-u' ? -1 : 1;
      // leaving: carried along the motion; arriving: comes from the other side
      const d = (dir === 'out' ? 1 : -1) * sign * ease * 0.32;
      return {
        ...STILL,
        tx: horiz ? d * W : 0,
        ty: horiz ? 0 : d * H,
        scale: 1 + ease * 0.08,
        blurX: horiz ? 70 * s : 0,
        blurY: horiz ? 0 : 70 * s,
        bright: 1 + 0.35 * s,
      };
    }
    case 'zoom':
      return { ...STILL, scale: dir === 'out' ? 1 + 0.45 * ease : 1 + 0.3 * ease, bright: 1 + 1.6 * ease, radial: s };
    case 'iris':
      return { ...STILL, scale: dir === 'out' ? 1 + 3.5 * ease : 1 + 0.4 * ease, bright: 1 + 0.8 * ease, radial: s * 0.8 };
    case 'glitch':
      return { ...STILL, tx: (random(`g${p}`) - 0.5) * 60 * s, bright: 1 + 0.2 * s };
    case 'dip':
      return { ...STILL, bright: 1 - 0.95 * s };
    case 'flash':
      return { ...STILL, scale: 1 + 0.04 * s, bright: 1 + 2.5 * ease };
    default:
      return STILL;
  }
};

/** the strobe's looks (the same shot flipping on the beats: honoredone v7, "multiple blend effects in inverted") */
const STROBE: Record<Strobe, string> = {
  none: '',
  invert: 'invert(1) hue-rotate(180deg)',
  neg: 'invert(1)',
  bw: 'grayscale(1) contrast(1.9) brightness(1.08)',
  nbw: 'grayscale(1) invert(1) contrast(2.2)',
  thresh: 'grayscale(1) contrast(4) brightness(1.05)',
  diff: '',
  hot: 'contrast(1.5) saturate(1.8) brightness(1.35)',
};
const STROBE_CYCLE: Strobe[] = ['none', 'nbw', 'invert', 'thresh', 'diff', 'neg', 'bw', 'hot'];
/** the strobe at t: the look since the last flip (none before the first) and the flip's punch, dying away */
const strobeAt = (st: NonNullable<Shot['strobe']>, t: number) => {
  let j = -1;
  for (let i = 0; i < st.at.length; i++) if (st.at[i] <= t + 1e-4) j = i;
  if (j < 0) return null;
  const looks = st.looks ?? STROBE_CYCLE;
  return { look: looks[(j + 1) % looks.length], punch: Math.exp(-(t - st.at[j]) * 16) };
};

export type ShotCtx = { cut: Cut; m: Manifest; frame: number };

const srcOf = (cut: Cut, src: string) => staticFile(`${cut.slug}/${cut.sources[src].path}`);
export const matteOf = (cut: Cut, id: string) => staticFile(`${cut.slug}/derived/mattes/${id}.webm`);
/** the matte as grey video (GPU passes read it as a texture) */
export const matteGreyOf = (cut: Cut, id: string) => staticFile(`${cut.slug}/derived/mattes/${id}.matte.mp4`);
/** a shot's picture file and source time at song time t */
export const frameOf = (cut: Cut, s: Shot, t: number) => ({ src: srcOf(cut, s.src), t: sourceTime(s, t) });
/** where in its matte a shot is at song time t (mattes are cut from 0.05 s before the in-point: build.ts jobs) */
export const matteTime = (s: Shot, t: number, dt = 0) => Math.max(0, sourceTime(s, t) - s.in + 0.05 + dt);

/**
 * The shot's picture as it sits in the frame (camera + transition), with its grade, bloom and effects.
 * `behind` draws between the picture and the cutout (words behind the subject).
 */
export const ShotLayer: React.FC<{ s: Shot; t: number; ctx: ShotCtx; ph?: Phase; behind?: React.ReactNode }> = ({ s, t, ctx, ph, behind }) => {
  const { fps } = useVideoConfig();
  const { cut, m, frame } = ctx;
  if (s.src === 'black') return <div style={{ position: 'absolute', inset: 0, background: '#000' }}>{behind}</div>;
  const grade = s.grade ?? 'teal';
  const look = LOOKS[grade];
  const cam = camera(s, t, m, frame);
  const tr = transitionMove(ph);
  const src = srcOf(cut, s.src);
  const st = sourceTime(s, t);
  const since = (t - s.from) * fps; // frames into the shot
  const fx = new Set(s.fx ?? []);
  const blurId = `dir-${s.id.replace(/[^a-z0-9]/gi, '')}-${frame}`;
  const dirBlur = tr.blurX > 0.5 || tr.blurY > 0.5 || (fx.has('bass') && !!bassAt(cut.hits ?? [], t, s.from)?.blur);
  // R02's flashes: the first frames of a hit shot come in hot
  const impact = fx.has('impact') && since < 3 && since >= 0;
  const bassNow = fx.has('bass') ? bassAt(cut.hits ?? [], t, s.from) : null;
  const strobe = s.strobe ? strobeAt(s.strobe, t) : null;
  // a glitching strobe splits the colours on every flip (honoredone rev-003: "inverted snap glitching")
  const rgbAmt = (fx.has('rgb') ? Math.max(0, 1 - since / 8) * 26 + 4 : 0) + (ph?.kind === 'glitch' ? (1 - (ph.dir === 'out' ? 1 - ph.p : ph.p)) * 40 : 0) + tr.rgb + (bassNow?.rgb ?? 0) + (s.strobe?.glitch && strobe ? 34 * strobe.punch : 0);
  const neon = fx.has('neon');
  const k = Math.min(1, Math.max(0, (t - s.from) / Math.max(1e-3, s.to - s.from)));

  // the bass-drop punch: the last drum hit's zoom, jolt, smear, split and flash, dying away
  const bass = fx.has('bass') ? bassAt(cut.hits ?? [], t, s.from) : null;
  const zz = cam.z * tr.scale * (1 + (bass?.zoom ?? 0)) * (1 + 0.05 * (strobe?.punch ?? 0));
  const transform = `translate(${(cam.tx + tr.tx + (bass?.dx ?? 0)).toFixed(1)}px, ${(cam.ty + tr.ty + (bass?.dy ?? 0)).toFixed(1)}px) rotate(${cam.rot.toFixed(2)}deg) scale(${(zz * cam.flip).toFixed(4)}, ${(zz * tr.sy).toFixed(4)})`;
  const bright = tr.bright * (1 + (bassNow?.flash ?? 0));
  const baseFilter = [
    look.filter,
    bright !== 1 ? `brightness(${bright.toFixed(2)})` : '',
    tr.blur > 0.3 ? `blur(${tr.blur.toFixed(1)}px)` : '',
    dirBlur ? `url(#${blurId})` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const pic = (style: React.CSSProperties = {}, key?: string) => <Frame key={key} src={src} t={st} style={style} />;
  const mattePic = (style: React.CSSProperties = {}, key?: string, dt = 0) =>
    s.matte ? <Frame key={key} src={matteOf(cut, s.matte)} t={matteTime(s, t, dt)} transparent style={style} /> : null;
  const energy = ENERGY[s.aura?.color ?? 'blue'];
  // the subject's energy, drawn over the picture in the shot's own camera space
  const aura =
    s.matte && s.aura ? (
      <GLPass
        frag={AURA}
        inputs={[
          { id: 'pic', src, t: st },
          { id: 'matte', src: matteGreyOf(cut, s.matte), t: matteTime(s, t) },
        ]}
        mips={['matte']}
        uniforms={{
          u_t: t,
          u_c1: energy.core,
          u_c2: energy.outer,
          u_amt: s.aura.amt ?? 1.3,
          u_rise: s.aura.rise ?? 0.14,
          u_sub: 1,
          u_k: CC[grade],
          u_dim: 0,
          u_over: 0.65,
          u_halo: 0,
        }}
        style={tr.blur > 0.3 ? { filter: `blur(${tr.blur.toFixed(1)}px)` } : undefined}
      />
    ) : null;
  // the world around him darkens so his light reads: drawn under the words behind him, not over them
  const auraDim = s.matte && s.aura ? (
    <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: (s.aura.dim ?? 0.45) * Math.min(1, since / 4) }} />
  ) : null;
  const paint = s.paint ? (
    <GLPass
      frag={PAINT}
      inputs={[{ id: 'pic', src, t: st }]}
      uniforms={{
        u_t: t,
        u_cov: Array.isArray(s.paint.cov) ? s.paint.cov[0] + (s.paint.cov[1] - s.paint.cov[0]) * k : s.paint.cov ?? 0.45,
        u_tint: ENERGY[s.paint.color ?? 'blue'].outer.map((v, i) => (v + ENERGY[s.paint!.color ?? 'blue'].core[i]) / 2),
        u_dir: s.paint.dir ?? [-1, 0.15],
        u_k: CC[grade],
      }}
      style={tr.blur > 0.3 || tr.bright !== 1 ? { filter: `brightness(${tr.bright.toFixed(2)}) blur(${tr.blur.toFixed(1)}px)` } : undefined}
    />
  ) : null;

  if (s.worlds?.length) {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000', opacity: tr.opacity }}>
        <Worlds s={s} t={t} ctx={ctx} />
        <div style={{ position: 'absolute', inset: 0, transform, transformOrigin: '50% 50%' }}>
          {auraDim}
          {behind}
          {aura ?? mattePic({ filter: `${look.filter} drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 34px ${energy.css})` }, 'held')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000', opacity: tr.opacity, filter: strobe && STROBE[strobe.look] ? STROBE[strobe.look] : undefined }}>
      {dirBlur && <DirBlur id={blurId} dx={tr.blurX + Math.abs(bassNow?.bx ?? 0)} dy={tr.blurY + Math.abs(bassNow?.by ?? 0)} />}
      <div style={{ position: 'absolute', inset: 0, transform, transformOrigin: '50% 50%' }}>
        {neon ? (
          <>
            {/* R02 / R12: the shot as glowing line art on black, with a perspective grid floor */}
            {pic({ filter: 'url(#amv-neon) brightness(1.4)' })}
          </>
        ) : impact ? (
          pic({ filter: since < 1 ? 'url(#amv-impact)' : 'url(#amv-impact) invert(1)' })
        ) : paint ? (
          paint
        ) : rgbAmt > 0.5 ? (
          <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
            {pic({ filter: `url(#amv-r) ${baseFilter}`, mixBlendMode: 'screen', transform: `translateX(${-rgbAmt}px)` }, 'r')}
            {pic({ filter: `url(#amv-g) ${baseFilter}`, mixBlendMode: 'screen' }, 'g')}
            {pic({ filter: `url(#amv-b) ${baseFilter}`, mixBlendMode: 'screen', transform: `translateX(${rgbAmt}px)` }, 'b')}
          </div>
        ) : (
          pic({ filter: baseFilter })
        )}
        {/* the strobe's difference echo: the shot over itself, a little larger, in difference */}
        {strobe?.look === 'diff' && pic({ filter: look.filter, mixBlendMode: 'difference', transform: 'scale(1.07)' }, 'diff')}
        {/* bloom: the frame's highlights (contrast pushes the rest to black) blurred and added back */}
        {!neon && !impact && (look.bloom > 0 || fx.has('glow')) &&
          pic({ filter: `${look.filter} contrast(1.9) brightness(0.8) blur(24px)`, mixBlendMode: 'screen', opacity: Math.min(0.75, (look.bloom || 0.35) * (fx.has('glow') ? 1.4 : 1)) }, 'bloom')}
        {/* radial light burst (zoom / iris transitions): scaled echoes of the frame */}
        {Math.max(tr.radial, bassNow?.radial ?? 0) > 0.05 &&
          [1.06, 1.14, 1.24].map((sc, i) =>
            pic({ filter: `${look.filter} brightness(${1.4 + Math.max(tr.radial, bassNow?.radial ?? 0)}) blur(${4 + i * 4}px)`, transform: `scale(${1 + (sc - 1) * Math.max(tr.radial, bassNow?.radial ?? 0) * 2})`, mixBlendMode: 'screen', opacity: 0.45 * Math.max(tr.radial, bassNow?.radial ?? 0) }, `rz${i}`),
          )}
        {!neon && !impact && <Washes look={look} />}
        {neon && <NeonGrid />}
        {auraDim}
        {behind}
        {aura ?? (s.matte && <Subject s={s} st={st} since={since} mattePic={mattePic} />)}
      </div>
    </div>
  );
};

/** the plates behind a held subject: each world from its time until the next one's, crossfading in 3 frames */
const Worlds: React.FC<{ s: Shot; t: number; ctx: ShotCtx }> = ({ s, t, ctx }) => {
  const { fps } = useVideoConfig();
  const ws = s.worlds ?? [];
  let i = 0;
  for (let j = 0; j < ws.length; j++) if (ws[j].at <= t + 1e-6) i = j;
  const plate = (w: World, end: number, opacity: number, key: string) => {
    const pseudo: Shot = { id: key, from: w.at, to: end, src: w.src, in: w.in, z: w.z, x: w.x, y: w.y, push: w.push };
    const c = camera(pseudo, t, ctx.m, ctx.frame);
    const look = LOOKS[w.grade ?? s.grade ?? 'teal'];
    return (
      <div key={key} style={{ position: 'absolute', inset: 0, opacity, transform: `translate(${c.tx.toFixed(1)}px, ${c.ty.toFixed(1)}px) scale(${c.z.toFixed(4)})` }}>
        <Frame src={srcOf(ctx.cut, w.src)} t={Math.max(0, w.in + (t - w.at) * (w.rate ?? 1))} style={{ filter: `${look.filter} brightness(0.62)` }} />
      </div>
    );
  };
  const cur = ws[i];
  const prev = ws[i - 1];
  const fade = prev ? Math.min(1, (t - cur.at) * fps / 3) : 1;
  return (
    <>
      {prev && fade < 1 && plate(prev, cur.at, 1, `w${i - 1}`)}
      {cur && plate(cur, ws[i + 1]?.at ?? s.to, fade, `w${i}`)}
    </>
  );
};

/** the subject again over what sits behind it, with the cutout effects */
const Subject: React.FC<{
  s: Shot;
  st: number;
  since: number;
  mattePic: (style?: React.CSSProperties, key?: string, dt?: number) => React.ReactNode;
}> = ({ s, since, mattePic }) => {
  const look = LOOKS[s.grade ?? 'teal'];
  const fx = new Set(s.fx ?? []);
  const silhouette = fx.has('silhouette');
  return (
    <>
      {fx.has('echo') &&
        [3, 2, 1].map(k => mattePic({ filter: `${look.filter} brightness(1.3)`, opacity: 0.18 * k, mixBlendMode: 'screen' }, `echo${k}`, -0.08 * k))}
      {fx.has('arms') &&
        // the many-armed deity: fanned copies of him around the chest, the arms reaching out
        [-24, -14, 14, 24].map((deg, i) =>
          mattePic(
            { filter: `${look.filter} brightness(1.1)`, opacity: 0.55 - Math.abs(deg) / 80, transform: `rotate(${(deg * Math.min(1, since / 18)).toFixed(2)}deg)`, transformOrigin: '50% 48%' },
            `arm${i}`,
          ),
        )}
      {fx.has('rim') &&
        mattePic({ filter: 'brightness(0) invert(1) blur(10px)', opacity: 0.9, mixBlendMode: 'screen', transform: 'scale(1.012)' }, 'rim')}
      {mattePic({ filter: silhouette ? 'brightness(0)' : look.filter }, 'subject')}
    </>
  );
};

/** R02's tron floor under the neon line art */
const NeonGrid: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, perspective: 600, overflow: 'hidden', mixBlendMode: 'screen' }}>
    <div
      style={{
        position: 'absolute',
        left: '-50%',
        width: '200%',
        top: '58%',
        height: '90%',
        transform: 'rotateX(68deg)',
        transformOrigin: '50% 0%',
        backgroundImage:
          'linear-gradient(rgba(0,229,255,0.85) 2px, transparent 2px), linear-gradient(90deg, rgba(0,229,255,0.85) 2px, transparent 2px)',
        backgroundSize: '160px 160px',
        filter: 'drop-shadow(0 0 6px #00e5ff)',
        maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), transparent 85%)',
      }}
    />
  </div>
);
