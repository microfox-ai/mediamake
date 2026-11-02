import React, { useId } from 'react';
import { AbsoluteFill, Img, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import { withKnobs } from '../kit/knobs';
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
  /**
   * The poster dancing like an anime edit: a liquid warp, a spring bounce on the kicks, a sway from
   * bar to bar. Cover, subject and visualizers all read it from the cover, so they move as one.
   */
  dance?: Dance;
};

/**
 * Cadence, 2026-10-31: "the music visualiser effects are plain and dull, give it a liquid feel as if
 * the poster is dancing like in anime edits".
 */
export type Dance = {
  /**
   * The picture rippling like liquid: displaced `amount` px at rest, more on the hits; waves about
   * `size` px across, the shape morphing to a new one every `every` beats (eased, so it surges on the
   * beat and settles).
   */
  liquid?: { amount: number; kick?: number; snare?: number; size?: number; every?: number; octaves?: number };
  /** Squash and stretch on strong kicks, springing back (0.03 = 3 % taller). */
  bounce?: number;
  /** Degrees the poster leans, swinging to the other side on each downbeat. Keep it ≤ 1 (the zoom loop's overscan). */
  sway?: number;
  /**
   * A camera punch on the downbeats inside `when` (song-second windows): the whole poster snaps in by
   * `zoom` (0.02 = 2 %) and eases back. Cadence, 2026-10-31: "come up with a more suitable dynamic
   * camera fx / morph fx / impacts" (after the thin shockwave circles looked bad).
   */
  pulse?: { zoom: number; when?: [number, number][] };
  /**
   * A shockwave rolling out through the picture from `at` (unmoved frame px) on the downbeats inside
   * `when` (or at the given song seconds): a ring of distortion `amount` px strong, no line drawn,
   * growing at `speed` px/s and fading over `life` s.
   */
  ripple?: { at: [number, number]; amount: number; on?: number[]; when?: [number, number][]; speed?: number; life?: number };
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

/** Index of the last time ≤ t in a sorted list, or -1. */
const lastAt = (times: number[], t: number) => {
  let lo = 0;
  let hi = times.length - 1;
  let at = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) {
      at = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return at;
};

/**
 * A smooth noise field as a small PNG (data URL) for the liquid warp: red and green each two octaves
 * of value noise, `cells` grid cells across. Made once per seed and cached; an feImage scales it up,
 * far cheaper than an feTurbulence at full size in every layer on every frame (that made a 6-still
 * run take over 10 minutes).
 */
const liquidMaps = new Map<string, string>();
const liquidMap = (seed: number, cells: number): string => {
  const key = `${seed}|${cells}`;
  const hit = liquidMaps.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const w = 384;
  const h = 216;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(w, h);
  const field = (salt: number, n: number) => {
    const gw = Math.ceil(n) + 2;
    const gh = Math.ceil((n * h) / w) + 2;
    const g = Array.from({ length: gw * gh }, (_, i) => hash(seed * 131.7 + salt * 17.3 + i * 0.731));
    const s = (x: number) => x * x * (3 - 2 * x);
    return (x: number, y: number) => {
      const fx = (x / w) * n;
      const fy = (y / w) * n;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = s(fx - ix);
      const ty = s(fy - iy);
      const at = (a: number, b: number) => g[Math.min(gh - 1, b) * gw + Math.min(gw - 1, a)];
      const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
      const bot = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
      return top + (bot - top) * ty;
    };
  };
  const r1 = field(1, cells);
  const r2 = field(2, cells * 2);
  const g1 = field(3, cells);
  const g2 = field(4, cells * 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = (r1(x, y) * 0.7 + r2(x, y) * 0.3 - 0.5) * 1.6 + 0.5;
      const gg = (g1(x, y) * 0.7 + g2(x, y) * 0.3 - 0.5) * 1.6 + 0.5;
      img.data[i] = Math.round(Math.min(1, Math.max(0, r)) * 255);
      img.data[i + 1] = Math.round(Math.min(1, Math.max(0, gg)) * 255);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL('image/png');
  liquidMaps.set(key, url);
  return url;
};

/**
 * A shockwave ring as a displacement map (data URL): mid-grey everywhere but a band near the edge,
 * where red and green push the picture outward then pull it back (compression, then rarefaction).
 * Placed per frame at the ring's size, so the band rolls outward.
 */
let rippleUrl = '';
const rippleMap = (): string => {
  if (rippleUrl || typeof document === 'undefined') return rippleUrl;
  const n = 512;
  const canvas = document.createElement('canvas');
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5) / (n / 2) - 1;
      const dy = (y + 0.5) / (n / 2) - 1;
      const r = Math.hypot(dx, dy);
      const u = (r - 0.68) / 0.3;
      const m = u > 0 && u < 1 ? Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u) : 0;
      const i = (y * n + x) * 4;
      img.data[i] = Math.round(127.5 + 127.5 * m * (r ? dx / r : 0));
      img.data[i + 1] = Math.round(127.5 + 127.5 * m * (r ? dy / r : 0));
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  rippleUrl = canvas.toDataURL('image/png');
  return rippleUrl;
};

/** The last downbeat (or given time) ≤ t inside the windows, or undefined. */
const lastHit = (times: number[], t: number, when?: [number, number][]) => {
  for (let i = lastAt(times, t); i >= 0; i--) {
    const h = times[i];
    if (!when || when.some(([a, b]) => h >= a && h <= b)) return h;
    if (t - h > 4) return undefined;
  }
  return undefined;
};

/**
 * The poster's dance now (cover.dance): a CSS transform about the cover's origin and a liquid-warp
 * filter, the same in every layer that moves with the picture. Put `node` in the layer, `transform`
 * (with `transformOrigin: origin`) and `filter` on a wrapper round everything that moves with it.
 */
export const useDance = (cover: CoverBackdropProps = {}, use: { warp?: boolean; ripple?: boolean } = {}) => {
  const t = useSongTime();
  const m = useManifest();
  const kick = Math.min(1, useHit('kick', 8));
  const snare = Math.min(1, useHit('snare', 10));
  const id = `liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { motion } = useCoverMotion(cover);
  const d = cover.dance;
  if (!d) return { transform: undefined, origin: cover.origin, filter: '', node: null };
  const parts: string[] = [];
  if (d.sway) {
    // lean to one side each bar, swinging over with a little overshoot on the downbeat
    const downs = m.beats.downbeats ?? [];
    const i = lastAt(downs, t);
    const side = i % 2 ? 1 : -1;
    const k = i < 0 ? 1 : Math.min(1, (t - downs[i]) / 0.45);
    const e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
    parts.push(`rotate(${(-side * d.sway + 2 * side * d.sway * e).toFixed(3)}deg)`);
  }
  if (d.bounce) {
    const list = (m.onsets?.kick ?? []).filter(([, s]) => s >= 0.8);
    const i = lastAt(
      list.map(([o]) => o),
      t,
    );
    if (i >= 0) {
      const age = t - list[i][0];
      const s = d.bounce * Math.min(1, list[i][1]) * Math.exp(-age * 7) * Math.cos(age * Math.PI * 2 * 3.2);
      if (Math.abs(s) > 1e-4) parts.push(`scale(${(1 - s * 0.6).toFixed(4)}, ${(1 + s).toFixed(4)})`);
    }
  }
  if (d.pulse) {
    // a camera punch on each downbeat in its windows: snap in, ease back
    const h = lastHit(m.beats.downbeats ?? [], t, d.pulse.when);
    if (h !== undefined) {
      const age = t - h;
      const env = age < 0.04 ? age / 0.04 : Math.exp(-(age - 0.04) * 7);
      if (env > 0.002) parts.unshift(`scale(${(1 + d.pulse.zoom * env).toFixed(4)})`);
    }
  }
  const W = 1920;
  const H = 1080;
  const region = { x: -W * 0.1, y: -H * 0.1, width: W * 1.2, height: H * 1.2 };
  // the liquid warp: two noise fields crossfading into a new shape every few beats
  let liquid: { a: number; b: number; step: number; cells: number; scale: number } | undefined;
  if (d.liquid && use.warp !== false) {
    const { amount, kick: onKick = 0, snare: onSnare = 0, size = 260, every = 2 } = d.liquid;
    const beats = m.beats.list.map(b => b.t);
    const i = Math.max(0, lastAt(beats, t));
    const step = Math.floor(i / every);
    const from = beats[step * every] ?? 0;
    const to = beats[step * every + every] ?? from + (60 / (m.beats.bpm || 120)) * every;
    // surge into the new shape right after the beat, then settle
    const k = 1 - Math.pow(1 - Math.min(1, Math.max(0, (t - from) / Math.max(0.05, (to - from) * 0.6))), 3);
    liquid = { a: Math.cos((k * Math.PI) / 2), b: Math.sin((k * Math.PI) / 2), step, cells: 1920 / size, scale: amount + onKick * kick + onSnare * snare };
  }
  // the shockwave: a ring of distortion rolling out from its point
  let ripple: { x: number; y: number; r: number; amount: number } | undefined;
  if (d.ripple && use.ripple !== false) {
    const { at, amount, on, when, speed = 1500, life = 0.9 } = d.ripple;
    const h = lastHit(on ?? m.beats.downbeats ?? [], t, on ? undefined : when);
    if (h !== undefined && t - h < life) {
      const age = t - h;
      const [x, y] = coverPoint(motion, at);
      ripple = { x, y, r: 40 + speed * age, amount: amount * Math.pow(1 - age / life, 1.5) };
    }
  }
  let node: React.ReactNode = null;
  let filter = '';
  if (liquid || ripple) {
    const scale = liquid ? liquid.scale : ripple!.amount;
    // the ripple's share of the displacement, in map units
    const kr = ripple ? ripple.amount / Math.max(1, scale) : 0;
    const half = ripple ? ripple.r / 0.83 : 0;
    node = (
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id={id} filterUnits="userSpaceOnUse" {...region} colorInterpolationFilters="sRGB">
            {liquid && (
              <>
                <feImage href={liquidMap(liquid.step + 1, liquid.cells)} {...region} preserveAspectRatio="none" result="a" />
                <feImage href={liquidMap(liquid.step + 2, liquid.cells)} {...region} preserveAspectRatio="none" result="b" />
                {/* power-preserving crossfade, so the warp keeps its strength through the morph */}
                <feComposite in="a" in2="b" operator="arithmetic" k1={0} k2={liquid.a} k3={liquid.b} k4={0.5 * (1 - liquid.a - liquid.b)} result="map0" />
              </>
            )}
            {ripple && (
              <>
                <feFlood floodColor="rgb(128,128,128)" {...region} result="grey" />
                <feImage href={rippleMap()} x={ripple.x - half} y={ripple.y - half} width={2 * half} height={2 * half} preserveAspectRatio="none" result="ring" />
                <feComposite in="ring" in2="grey" operator="over" result="ringMap" />
              </>
            )}
            {liquid && ripple ? (
              <feComposite in="map0" in2="ringMap" operator="arithmetic" k1={0} k2={1} k3={kr} k4={-0.5 * kr} result="map" />
            ) : (
              <feComposite in={liquid ? 'map0' : 'ringMap'} in2={liquid ? 'map0' : 'ringMap'} operator="arithmetic" k1={0} k2={1} k3={0} k4={0} result="map" />
            )}
            <feDisplacementMap in="SourceGraphic" in2="map" scale={scale.toFixed(2)} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    );
    filter = `url(#${id})`;
  }
  return { transform: parts.length ? parts.join(' ') : undefined, origin: cover.origin, filter, node };
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
  const dance = useDance(props);
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
      {dance.node}
      {/* under the warp, a slightly bigger copy fills what it pulls in from past the picture's edge */}
      {dance.filter && (
        <AbsoluteFill style={{ transform: dance.transform, transformOrigin: dance.origin }}>
          <Img src={src} style={{ ...picture, transform: `scale(${m.scale * 1.08}) translate(${m.dx}px, ${m.dy}px)` }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ transform: dance.transform, transformOrigin: dance.origin, filter: dance.filter || undefined }}>
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

withKnobs(CoverBackdrop, {
  image: { type: 'asset', accept: 'image', label: 'Picture', hint: 'Default: the first picture in input/' },
  fit: { type: 'select', options: ['cover', 'contain'], label: 'Fit', default: 'cover' },
  motion: { type: 'select', options: ['zoom-loop', 'pan-loop', 'push', 'still'], label: 'Motion', default: 'zoom-loop' },
  loopSeconds: { type: 'number', min: 4, max: 60, step: 1, unit: 's', label: 'Seconds per loop', default: 20 },
  dim: { type: 'number', min: 0, max: 1, step: 0.05, label: 'Darken', hint: 'Black over the picture so text reads', default: 0.35 },
  beatKick: { type: 'number', min: 0, max: 1, step: 0.05, label: 'Kick on beats', default: 0.4 },
  kickOn: { type: 'select', options: ['beat', 'kick'], label: 'Kick follows', default: 'beat' },
  tint: { type: 'color', label: 'Tint' },
});
