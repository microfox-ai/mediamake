/** Small motion helpers every brand's scenes use (each brand keeps its own easing curves). */
import { Easing } from 'remotion';

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0..1 progress of t through [a, b], eased. */
export const prog = (t: number, a: number, b: number, e: (x: number) => number = x => x) => e(clamp01((t - a) / Math.max(1e-6, b - a)));

export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/** Deterministic hash in [0,1). */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

/** Smooth 1D value noise in [-1,1]. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return mix(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
};

/** The smooth curve used for long audio and picture fades. */
export const soft = Easing.bezier(0.37, 0, 0.63, 1);
