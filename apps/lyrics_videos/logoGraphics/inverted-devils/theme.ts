/**
 * INVERTED Devils: palette and motion. Void black, crimson, bone white, the logo's own red.
 * Palette, frame size and motion curves shared by every variant.
 */
import { Easing } from 'remotion';

export const C = {
  void: '#050304',
  wine: '#1c0509',
  blood: '#5e000c',
  crimson: '#b3001b',
  red: '#ee1f2b', // the script's red in the logo
  glow: '#ff2d3d', // the halo around INVERTED
  bone: '#fff6f2',
} as const;

export const W = 1920;
export const H = 1080;
export const FPS = 60;

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  outBack: Easing.bezier(0.34, 1.4, 0.64, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  soft: Easing.bezier(0.37, 0, 0.63, 1),
  linear: (x: number) => x,
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0..1 progress of t through [a, b], eased. */
export const prog = (t: number, a: number, b: number, e: (x: number) => number = ease.linear) =>
  e(clamp01((t - a) / Math.max(1e-6, b - a)));

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

/** The logo's halo: white core, red bloom. k scales the bloom. */
export const halo = (k = 1, a = 1) =>
  `drop-shadow(0 0 ${3 * k}px rgba(255,80,90,${0.7 * a})) drop-shadow(0 0 ${14 * k}px rgba(255,40,55,${0.7 * a})) drop-shadow(0 0 ${44 * k}px rgba(235,20,40,${0.55 * a}))`;

/** Softer bloom for the red script. */
export const redGlow = (k = 1, a = 1) =>
  `drop-shadow(0 0 ${6 * k}px rgba(255,40,50,${0.55 * a})) drop-shadow(0 0 ${26 * k}px rgba(230,20,35,${0.4 * a}))`;
