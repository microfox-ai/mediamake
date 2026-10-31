import React, { useId } from 'react';
import { AbsoluteFill, Img, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import type { Manifest } from '../kit/manifest';
import { asset, useBeat, useEnergy, useEnvelope, useHit, useManifest, useSongTime } from '../kit/hooks';
import { exposureCss, gradeCss, hash, hasPictureFilter, HeatFilter, PictureFilter, PictureTexture, type PictureLook } from './PictureLook';

export type CoverBackdropProps = {
  /** A manifest asset name ("cover.png"), a manifest path or a URL. Default: the first picture in input/. */
  image?: string;
  /**
   * Slow loop on the picture, like mediamake's zoom-loop / pan-loop image effects; or 'push', one
   * slow push-in from `push.from` to `push.to` (scales) over `push.seconds`, never pulling back.
   */
  motion?: 'zoom-loop' | 'pan-loop' | 'still' | 'push';
  push?: { from: number; to: number; seconds: number };
  /**
   * A few deliberate zooms at chosen moments: in by `amount` (0.05 = 5 %) over `attack` s, then
   * back out over `release` s. Better a handful than one on every kick.
   */
  zooms?: { at: number; amount: number; attack?: number; release?: number }[];
  /** Seconds per loop. Default 20. */
  loopSeconds?: number;
  /** The point the zoom and kick grow from (CSS transform-origin), e.g. '73% 72%' to hold a spark in place. Default the centre. */
  origin?: string;
  /** Picture fills the frame (cover), or sits centered over a blurred copy of itself (contain). */
  fit?: 'cover' | 'contain';
  /** 0..1 black over the picture so text reads. Default 0.35. */
  dim?: number;
  /** 0..1, how much the picture kicks on beats. Default 0.4. */
  beatKick?: number;
  /** What the kick follows: every beat of the grid (default), or the song's kick drum (mediamake's ImageBeat on bass). */
  kickOn?: 'beat' | 'kick';
  /** Bottom gradient to black, for a waveform strip: true (0.85 at the edge) or its strength 0..1. Default true. */
  fadeBottom?: boolean | number;
  tint?: string;
  /**
   * Camera shake, like mediamake's imageloop shake effects. 'auto' follows the song: barely
   * moving in quiet parts, stronger as the energy rises. Default off.
   */
  shake?: false | 'auto' | { amplitude: number; frequency: number };
  /**
   * Camera jolts on the hits, like a trap visualizer: on each onset (`on`, from `threshold`) the
   * frame snaps `amount` px in a direction of its own and a `zoom` in, then settles in a damped
   * swing, smeared by a directional motion blur (`blur` × its speed in px per frame). The subject
   * and the visualizers jolt with it. Default off.
   */
  jolt?: Jolt;
  /**
   * The lens losing focus and finding it again, like looking through heat over a desert: each
   * stretch blurs everything that moves with the picture (cover, subject, visualizers, overlays) up
   * to `amount` px between `from` and `to`, easing in and out over `ease` s (default 1); the heat
   * haze swells with it. A `from` before 0 starts the video out of focus.
   */
  defocus?: Defocus[];
  /** Stylise the picture: a grade, picture filters and living texture (PictureLook.tsx). */
  look?: PictureLook;
};

export type Jolt = {
  amount: number;
  on?: 'kick' | 'snare';
  threshold?: number;
  /** How fast it settles, per second. Default 7. */
  decay?: number;
  /** Swings per second while it settles. Default 5. */
  swing?: number;
  /** Extra scale at the hit, 0..1 (0.04 = 4 %). */
  zoom?: number;
  /** Zoom only on onsets at least this strong (the rest just shove): a punch for the hardest hits. */
  zoomFrom?: number;
  /** …and at least this many seconds after the last punch (counted from the song's start). */
  zoomGap?: number;
  /** Motion blur per px/frame of speed. Default 0.8. */
  blur?: number;
};

export type Defocus = { from: number; to: number; amount: number; ease?: number };

const smooth = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};

/** How far out of focus the lens is at song time t, px of blur. */
export const defocusAt = (list: Defocus[] | undefined, t: number) =>
  Math.max(
    0,
    ...(list ?? []).map(({ from, to, amount, ease = 1 }) => amount * smooth((t - from) / ease) * smooth((to - t) / ease)),
  );

export type CoverMotion = { scale: number; dx: number; dy: number; ox: number; oy: number };

/**
 * The cover's motion at song time t: `scale(s) translate(dx, dy)` about the origin (ox, oy), in
 * frame px. Effects locked to a point of the picture move with it through `coverPoint`.
 */
export const coverMotion = (
  { motion = 'zoom-loop', loopSeconds = 20, origin, beatKick = 0.4, shake = false, push, zooms }: CoverBackdropProps,
  size: { width: number; height: number },
  t: number,
  pulse: number,
  energy: number,
): CoverMotion => {
  // Eased ping-pong, so the loop never jumps.
  const phase = (t % loopSeconds) / loopSeconds;
  const swing = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const kick = pulse * beatKick * 0.03;
  const shakeAmp = shake === 'auto' ? 0.4 + energy * 2.4 : shake ? shake.amplitude : 0;
  // a fixed rate for 'auto': a rate that follows the energy would make the phase jump
  const shakeFreq = shake === 'auto' ? 1.2 : shake ? shake.frequency : 0;
  const phase2 = t * shakeFreq * Math.PI * 2;
  const sx = shakeAmp ? wobble(phase2, 1) * shakeAmp * 4 : 0;
  const sy = shakeAmp ? wobble(phase2, 7) * shakeAmp * 4 : 0;
  const pushed = push ? push.from + (push.to - push.from) * Math.min(1, Math.max(0, t / push.seconds)) : 1.06;
  const moments = (zooms ?? []).reduce((z, { at, amount, attack = 0.3, release = 2.5 }) => {
    const age = t - at;
    if (age < 0 || age > attack + release) return z;
    const k = age < attack ? smooth(age / attack) : 1 - smooth((age - attack) / release);
    return z + amount * k;
  }, 0);
  const base =
    motion === 'zoom-loop' ? 1.04 + swing * 0.14 : motion === 'pan-loop' ? 1.18 : motion === 'push' ? pushed : 1;
  const scale = (base + kick) * (1 + moments);
  const pan = motion === 'pan-loop' ? ((swing - 0.5) * 6 * size.height) / 100 : 0;
  const [ox, oy] = (origin ?? '50% 50%').split(/\s+/).map((v, i) => {
    const n = parseFloat(v);
    return v.endsWith('%') ? (n / 100) * (i ? size.height : size.width) : n;
  });
  return { scale, dx: sx, dy: pan + sy, ox, oy };
};

/** The pulse the cover kicks with (`kickOn`): the beat grid's, or the kick drum's. */
export const useCoverPulse = (cover?: CoverBackdropProps): number => {
  const { pulse } = useBeat(7);
  const kick = useHit('kick', 7);
  return cover?.kickOn === 'kick' ? Math.min(1, kick) : pulse;
};

/** The onsets that get a zoom punch: strong enough, and `zoomGap` after the previous punch. */
const punches = (list: [number, number][], j: Jolt) => {
  const kept = new Set<number>();
  let last = -Infinity;
  for (const [t, s] of list)
    if (s >= (j.zoomFrom ?? 0) && t - last >= (j.zoomGap ?? 0)) {
      kept.add(t);
      last = t;
    }
  return kept;
};

/** The jolt's offset and extra zoom at song time t: the last strong onset's damped swing. */
const joltAt = (m: Manifest, j: Jolt, t: number) => {
  const list = m.onsets?.[j.on ?? 'kick'] ?? [];
  const decay = j.decay ?? 7;
  for (let i = list.length - 1; i >= 0; i--) {
    const [ot, s] = list[i];
    if (ot > t) continue;
    const age = t - ot;
    if (age > 6 / decay) break;
    if (s < (j.threshold ?? 0.7)) continue;
    const dir = hash(i + 0.37) * Math.PI * 2;
    const amp = j.amount * Math.min(1, s) * Math.exp(-age * decay) * Math.cos(age * (j.swing ?? 5) * Math.PI * 2);
    const punch = s >= (j.zoomFrom ?? 0) && punches(list, j).has(ot) ? (j.zoom ?? 0) : 0;
    return { dx: Math.cos(dir) * amp, dy: Math.sin(dir) * amp, zoom: punch * Math.exp(-age * decay * 1.5) };
  }
  return { dx: 0, dy: 0, zoom: 0 };
};

/**
 * The cover's motion now, jolt included, and the motion blur it leaves ([x, y] px): every layer
 * that moves with the picture (cover, subject, visualizers) uses this, so they jolt together.
 */
export const useCoverMotion = (
  cover: CoverBackdropProps = {},
): { motion: CoverMotion; blur: [number, number]; defocus: number } => {
  const t = useSongTime();
  const energy = useEnergy();
  const pulse = useCoverPulse(cover);
  const { width, height, fps } = useVideoConfig();
  const manifest = useManifest();
  const m = coverMotion(cover, { width, height }, t, pulse, energy);
  const d = defocusAt(cover.defocus, t);
  if (!cover.jolt) return { motion: m, blur: [d, d], defocus: d };
  const j = joltAt(manifest, cover.jolt, t);
  const j0 = joltAt(manifest, cover.jolt, t - 1 / fps);
  const k = cover.jolt.blur ?? 0.8;
  return {
    motion: { ...m, dx: m.dx + j.dx, dy: m.dy + j.dy, scale: m.scale * (1 + j.zoom) },
    // capped: a long one-axis blur breaks into streaks
    blur: [Math.min(10, Math.abs(j.dx - j0.dx) * k) + d, Math.min(10, Math.abs(j.dy - j0.dy) * k) + d],
    defocus: d,
  };
};

/** A directional blur as an SVG filter (`filter: url(#id)`); nothing when it's too small to see. */
export const MotionBlur: React.FC<{ id: string; blur: [number, number] }> = ({ id, blur: [x, y] }) =>
  x < 0.3 && y < 0.3 ? null : (
    <svg width={0} height={0} style={{ position: 'absolute' }}>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} edgeMode="duplicate" />
        </filter>
      </defs>
    </svg>
  );
export const motionBlurCss = (id: string, [x, y]: [number, number]) => (x < 0.3 && y < 0.3 ? '' : `url(#${id})`);

/** Where a point of the unmoved picture (frame px) is on screen under the cover's motion. */
export const coverPoint = (m: CoverMotion, [x, y]: [number, number]): [number, number] => [
  m.ox + m.scale * (x + m.dx - m.ox),
  m.oy + m.scale * (y + m.dy - m.oy),
];

/** Smooth pseudo-random wobble in -1..1 from a few incommensurate sines. */
const wobble = (t: number, seed: number) =>
  (Math.sin(t * 1.0 + seed) + Math.sin(t * 2.31 + seed * 1.7) * 0.6 + Math.sin(t * 4.17 + seed * 2.3) * 0.3) / 1.9;

/** Cover art or key art behind the lyrics: a slow zoom or pan loop that kicks on the beat. */
export const CoverBackdrop: React.FC<SceneProps<CoverBackdropProps>> = props => {
  const { manifest, image, origin, fit = 'cover', dim = 0.35, fadeBottom = true, tint, look } = props;
  const t = useSongTime();
  const energy = useEnergy();
  const { pulse } = useBeat(7);
  const kickHit = useHit('kick', 10);
  const snareHit = useHit('snare', 12);
  const low = useEnvelope('low');
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const filterId = `cover-look-${uid}`;
  const blurId = `cover-blur-${uid}`;
  const heatId = `cover-heat-${uid}`;
  const { width, height } = useVideoConfig();
  const name = image || Object.keys(manifest.assets).find(k => /\.(jpe?g|png|webp|avif)$/i.test(k));
  if (!name) throw new Error(`CoverBackdrop: no picture in ${manifest.slug}/input/`);
  const src = asset(manifest.assets[name] ?? name);

  const { motion: m, blur, defocus } = useCoverMotion(props);
  // the haze swells while the lens hunts
  const heat = look?.heat && { ...look.heat, strength: look.heat.strength + defocus * 1.2 };
  const filter = [
    gradeCss(look),
    exposureCss(look, kickHit, pulse),
    hasPictureFilter(look) && `url(#${filterId})`,
    look?.heat && `url(#${heatId})`,
    motionBlurCss(blurId, blur),
  ]
    .filter(Boolean)
    .join(' ');
  const picture: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: fit,
    transform: `scale(${m.scale}) translate(${m.dx}px, ${m.dy}px)`,
    transformOrigin: origin,
    filter: filter || undefined,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: 'black', overflow: 'hidden' }}>
      {fit === 'contain' && (
        <Img
          src={src}
          style={{
            ...picture,
            objectFit: 'cover',
            filter: 'blur(40px) brightness(0.55)',
            transform: `scale(1.2)`,
            transformOrigin: undefined,
          }}
        />
      )}
      {look && hasPictureFilter(look) && <PictureFilter id={filterId} look={look} pulse={pulse} kick={kickHit} />}
      {heat && <HeatFilter id={heatId} heat={heat} t={t} width={width} height={height} />}
      <MotionBlur id={blurId} blur={blur} />
      <AbsoluteFill>
        <Img src={src} style={picture} />
      </AbsoluteFill>
      {tint && <AbsoluteFill style={{ backgroundColor: tint, mixBlendMode: 'color' }} />}
      {look && (
        <PictureTexture
          look={look}
          t={t}
          pulse={pulse}
          low={low}
          snare={snareHit}
          rayAt={look.rays && coverPoint(m, look.rays.at)}
        />
      )}
      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${Math.max(0, dim - energy * 0.1)})` }} />
      {fadeBottom !== false && fadeBottom !== 0 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, transparent ${fadeBottom === true ? 55 : 70}%, rgba(0,0,0,${fadeBottom === true ? 0.85 : fadeBottom}) 100%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
