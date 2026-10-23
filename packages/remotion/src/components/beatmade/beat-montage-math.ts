/**
 * Shot planning and per-frame layers for BeatMontage.
 * Pure functions of time, so each Remotion frame recomputes the same picture.
 */

import type { BeatCue } from './beatmap/cues';
import { easeIn, easeOut } from './image-beat-math';

export const MONTAGE_TRANSITIONS = ['cut', 'flash', 'punch', 'whip', 'zoom', 'dissolve', 'dip'] as const;
export type MontageTransition = (typeof MONTAGE_TRANSITIONS)[number];

export const MONTAGE_ROTATIONS = ['none', 'auto', 'cw', 'ccw'] as const;
export type MontageRotation = (typeof MONTAGE_ROTATIONS)[number];

export const MONTAGE_ORDERS = ['sequence', 'shuffle'] as const;
export type MontageOrder = (typeof MONTAGE_ORDERS)[number];

export interface Shot {
  index: number;
  /** Seconds from the atom's first frame. */
  start: number;
  end: number;
  /** Index into the media list, or -1 for black. */
  media: number;
  strength: number;
  downbeat: boolean;
}

export interface PlanShotsOptions {
  /** Audio seconds before the atom's first frame. */
  offsetSec: number;
  durationSec: number;
  mediaCount: number;
  order?: MontageOrder;
  seed?: number;
  /** Black until the first cue, then cut in on it. */
  startOnFirstCue?: boolean;
}

const hash01 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Media index for the k-th visible shot. Shuffle never shows one item twice in a row. */
export function mediaForShot(k: number, count: number, order: MontageOrder, seed: number): number {
  if (count <= 0) return -1;
  if (order === 'sequence' || count === 1) return k % count;
  const block = Math.floor(k / count);
  const perm = (b: number) => {
    const ids = Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(hash01(seed * 7.13 + b * 31.7 + i) * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  };
  const ids = perm(block);
  if (block > 0 && ids[0] === perm(block - 1)[count - 1]) [ids[0], ids[1]] = [ids[1], ids[0]];
  return ids[k % count];
}

export function planShots(cues: BeatCue[], options: PlanShotsOptions): Shot[] {
  const { offsetSec, durationSec, mediaCount } = options;
  const order = options.order ?? 'sequence';
  const seed = options.seed ?? 1;
  const local = cues
    .map((c) => ({ ...c, t: c.t - offsetSec }))
    .filter((c) => c.t > 1e-3 && c.t < durationSec - 1e-3);

  const shots: Shot[] = [];
  let visible = 0;
  const push = (start: number, end: number, cue: BeatCue | null, black: boolean) => {
    shots.push({
      index: shots.length,
      start,
      end,
      media: black ? -1 : mediaForShot(visible++, mediaCount, order, seed),
      strength: cue?.strength ?? 1,
      downbeat: cue?.downbeat ?? false,
    });
  };
  const firstEnd = local.length ? local[0].t : durationSec;
  push(0, firstEnd, null, Boolean(options.startOnFirstCue && local.length));
  local.forEach((c, i) => push(c.t, i + 1 < local.length ? local[i + 1].t : durationSec, c, false));
  return shots;
}

/** Index of the shot showing at `t`. */
export function shotIndexAt(shots: Shot[], t: number): number {
  let lo = 0;
  let hi = shots.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (shots[mid].start <= t) lo = mid + 1;
    else hi = mid - 1;
  }
  return Math.max(0, hi);
}

export interface MontageMotion {
  /** Scale gained across a shot; negative pulls out. */
  driftScale?: number;
  /** Pan across a shot, as a fraction of the frame. Kept inside the crop. */
  driftPan?: number;
  /** Resting crop so pans never show an edge. Default 1.04. */
  baseScale?: number;
  transition?: MontageTransition;
  transitionSec?: number;
  /** 0-1 */
  transitionStrength?: number;
  seed?: number;
}

export interface MontageLayer {
  shot: Shot;
  opacity: number;
  scale: number;
  /** Percent of the frame. */
  tx: number;
  ty: number;
  blur: number;
  /** Black over the layer, 0-1. */
  dim: number;
}

export interface MontageFrame {
  /** Bottom to top. */
  layers: MontageLayer[];
  /** Flash overlay opacity, 0-1. */
  flash: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Slow push / drift inside one shot, linear like a camera move. */
export function shotCamera(shot: Shot, t: number, motion: MontageMotion) {
  const span = Math.max(1e-3, shot.end - shot.start);
  const p = clamp01((t - shot.start) / span);
  const base = Math.max(1, motion.baseScale ?? 1.04);
  const drift = motion.driftScale ?? 0.06;
  const scale = Math.max(1, drift >= 0 ? base + drift * p : base - drift * (1 - p));
  const seed = motion.seed ?? 1;
  const angle = hash01(shot.index * 3.1 + seed) * Math.PI * 2;
  const margin = ((scale - 1) / 2) * 100;
  const pan = Math.min(margin, (motion.driftPan ?? 0.03) * 100);
  const travel = (p - 0.5) * pan;
  return { scale, tx: Math.cos(angle) * travel, ty: Math.sin(angle) * travel };
}

const WHIP_DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

const layerOf = (shot: Shot, t: number, motion: MontageMotion): MontageLayer => ({
  shot,
  opacity: 1,
  ...shotCamera(shot, t, motion),
  blur: 0,
  dim: 0,
});

/**
 * Layers at `t` (seconds from the atom's first frame). Cuts land on shot starts;
 * whip, zoom, dip and dissolve straddle the cut (half before, half after),
 * flash and punch start on it.
 */
export function montageFrame(shots: Shot[], t: number, motion: MontageMotion): MontageFrame {
  if (shots.length === 0) return { layers: [], flash: 0 };
  const i = shotIndexAt(shots, t);
  const cur = shots[i];
  const kind = motion.transition ?? 'cut';
  const d = Math.max(1e-3, motion.transitionSec ?? 0.2);
  const k = clamp01(motion.transitionStrength ?? 0.6);
  const layer = layerOf(cur, t, motion);
  const frame: MontageFrame = { layers: [layer], flash: 0 };
  if (kind === 'cut' || k === 0) return frame;

  const sinceCut = t - cur.start;
  const next = shots[i + 1];
  const untilNext = next ? next.start - t : Infinity;
  const hasIn = i > 0 && sinceCut < d / 2;
  const hasOut = Boolean(next) && untilNext <= d / 2;
  const hit = (s: Shot) => 0.55 + 0.45 * s.strength;

  if (kind === 'flash') {
    if (i > 0 && sinceCut < d) frame.flash = k * hit(cur) * (1 - sinceCut / d) ** 2;
    return frame;
  }
  if (kind === 'punch') {
    if (i > 0 && sinceCut < d) layer.scale *= 1 + 0.25 * k * hit(cur) * (1 - easeOut(sinceCut / d));
    return frame;
  }
  if (kind === 'dissolve') {
    if (hasOut) {
      const w = clamp01((d / 2 - untilNext) / d);
      frame.layers.push({ ...layerOf(next!, t, motion), opacity: w });
    } else if (hasIn) {
      const w = clamp01((d / 2 + sinceCut) / d);
      frame.layers = [layerOf(shots[i - 1], t, motion), { ...layer, opacity: w }];
    }
    return frame;
  }
  if (kind === 'dip') {
    if (hasOut) layer.dim = k * easeIn(1 - untilNext / (d / 2));
    else if (hasIn) layer.dim = k * (1 - easeOut(sinceCut / (d / 2)));
    return frame;
  }

  // whip / zoom: the outgoing shot accelerates away, the incoming one lands.
  const cutIndex = hasOut ? i + 1 : i;
  const [dx, dy] = WHIP_DIRECTIONS[Math.floor(hash01(cutIndex * 5.7 + (motion.seed ?? 1)) * 4) % 4];
  const v = hasOut ? easeIn(1 - untilNext / (d / 2)) : hasIn ? 1 - easeOut(sinceCut / (d / 2)) : 0;
  const sign = hasOut ? 1 : -1;
  if (v <= 0) return frame;
  if (kind === 'whip') {
    // Both shots travel as one strip, half a frame each side of the cut, so no
    // background shows between them.
    const neighbour = hasOut ? next! : shots[i - 1];
    const shift = sign * 50 * v;
    const blur = 40 * k * v;
    layer.tx += dx * shift;
    layer.ty += dy * shift;
    layer.blur = blur;
    const other = layerOf(neighbour, t, motion);
    other.tx += dx * (shift - sign * 100);
    other.ty += dy * (shift - sign * 100);
    other.blur = blur;
    frame.layers.push(other);
  } else {
    layer.scale *= 1 + 0.8 * k * v;
    layer.blur = 24 * k * v;
  }
  return frame;
}

/** Scale bump on grid beats inside a shot: 1 + amount * strength, decaying over 0.15 s. */
export function beatPulseAt(beats: BeatCue[], t: number, amount: number): number {
  if (amount <= 0 || beats.length === 0) return 1;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid].t <= t) lo = mid + 1;
    else hi = mid - 1;
  }
  if (hi < 0) return 1;
  const since = t - beats[hi].t;
  return 1 + amount * (0.4 + 0.6 * beats[hi].strength) * Math.exp(-since / 0.15);
}

/** Whether a media item should be turned a quarter to fill the frame. */
export function rotationFor(
  rotate: MontageRotation,
  mediaAspect: number | undefined,
  frameAspect: number,
): 0 | 90 | -90 {
  if (rotate === 'cw') return 90;
  if (rotate === 'ccw') return -90;
  if (rotate !== 'auto' || !mediaAspect || !frameAspect) return 0;
  return mediaAspect > 1 !== frameAspect > 1 && Math.abs(Math.log(mediaAspect)) > 0.1 ? 90 : 0;
}
