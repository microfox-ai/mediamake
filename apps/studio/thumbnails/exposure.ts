/**
 * Auto-exposure for posters: covers came out dark because the pictures were dark (highlights well
 * under white) and most treatments darkened them further. `thumbs render` measures each hero
 * picture, picks levels for the job's mood (stretch to white, lift the mid-tones, keep the blacks)
 * and writes them to jobs/<job>/exposure.json; it then measures every render against its style's
 * plain cover and gives a treatment that came out darker an extra lift (`fixes`), re-rendering it.
 *
 * Pure data and functions (Node and the Remotion bundle both import it). Keep `.ts` imports.
 */

/** How bright the cover should feel: from the song. `as-is` turns auto-exposure off. */
export type Mood = 'bright' | 'balanced' | 'dark' | 'as-is';

/** A tone curve for a picture: black/white points (0..1), then a mid-tone lift that leaves the blacks alone. */
export type Levels = { black: number; white: number; gamma: number };

/** Measured from an image scaled down: luma histogram (256 bins) and the brightest channel's histogram. */
export type Stats = { luma: number[]; peak: number[] };

/** jobs/<job>/exposure.json: written by `thumbs render`, read by the compositions. */
export type ExposureFile = {
  mood: Mood;
  /** per hero picture (its `src`) */
  sources: Record<string, { levels: Levels; before: Summary; after: Summary }>;
  /** variant ID → extra lift (gamma multiplier) for a treatment that came out darker than its plain cover */
  fixes: Record<string, number>;
  /** variant ID → a hash of the variant the lift was measured for (a changed variant starts again from no lift) */
  fixedFor?: Record<string, string>;
};

export type Summary = { mean: number; p90: number; p99: number };

/**
 * Per mood: where the bright parts of the picture (p90 luma) should land, the least overall
 * brightness, the most lift allowed, and how much darker than its plain cover a treatment may be.
 */
export const MOODS: Record<Exclude<Mood, 'as-is'>, { p90: number; mean: number; maxGamma: number; keep: number }> = {
  bright: { p90: 0.78, mean: 0.36, maxGamma: 2.4, keep: 0.95 },
  balanced: { p90: 0.62, mean: 0.24, maxGamma: 2, keep: 0.88 },
  dark: { p90: 0.42, mean: 0, maxGamma: 1.4, keep: 0.7 },
};

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** The curve: (x - black) / (white - black), lifted by gamma, fading to no lift in the deepest shadows so blacks stay black. */
export const curve = ({ black, white, gamma }: Levels) => (x: number) => {
  const n = clamp((x - black) / Math.max(1e-3, white - black));
  const toe = smooth(clamp(n / 0.1));
  return n + (Math.pow(n, 1 / gamma) - n) * toe;
};

/** feComponentTransfer tableValues for the curve. */
export const tableValues = (levels: Levels, steps = 64) => {
  const f = curve(levels);
  return Array.from({ length: steps + 1 }, (_, i) => f(i / steps).toFixed(4)).join(' ');
};

const percentile = (hist: number[], q: number) => {
  const total = hist.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < hist.length; i++) if ((acc += hist[i]) >= q * total) return i / 255;
  return 1;
};

/** Mean of the histogram after a curve. */
const meanAfter = (hist: number[], f: (x: number) => number) => {
  let sum = 0;
  let total = 0;
  hist.forEach((c, i) => ((sum += c * f(i / 255)), (total += c)));
  return total ? sum / total : 0;
};

export const summarize = (s: Stats, f: (x: number) => number = x => x): Summary => ({
  mean: +meanAfter(s.luma, f).toFixed(3),
  p90: +f(percentile(s.luma, 0.9)).toFixed(3),
  p99: +f(percentile(s.peak, 0.99)).toFixed(3),
});

/** Smallest gamma in [1, max] that brings `measure(gamma)` to `target` (it only ever lifts). */
const solve = (measure: (g: number) => number, target: number, max: number) => {
  if (measure(1) >= target) return 1;
  if (measure(max) <= target) return max;
  let lo = 1;
  let hi = max;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (measure(mid) < target) lo = mid;
    else hi = mid;
  }
  return hi;
};

/**
 * Levels for a picture: black point at its darkest 0.5 % (never above 0.08), white point at its
 * brightest channel's 99.5 % (never below 0.45, so it stretches at most ~2.2×), then the least
 * lift that puts its bright parts (p90) and its overall brightness where the mood wants them.
 */
export const levelsFor = (s: Stats, mood: Exclude<Mood, 'as-is'>): Levels => {
  const m = MOODS[mood];
  const black = +Math.min(percentile(s.luma, 0.005), 0.08).toFixed(3);
  const p995 = percentile(s.peak, 0.995);
  const white = +(p995 >= 0.97 ? 1 : Math.max(p995, 0.45)).toFixed(3);
  const at = (gamma: number) => curve({ black, white, gamma });
  const p90 = percentile(s.luma, 0.9);
  const g90 = solve(g => at(g)(p90), m.p90, m.maxGamma);
  const gMean = solve(g => meanAfter(s.luma, at(g)), m.mean, m.maxGamma);
  return { black, white, gamma: +Math.max(g90, gMean).toFixed(3) };
};

/**
 * The extra lift for a render that came out darker than it may (`target` mean luma), treating the
 * lift as if it acted on the finished image (close enough: it is re-measured after re-rendering).
 */
export const fixFor = (s: Stats, target: number, max = 1.8) =>
  +solve(g => meanAfter(s.luma, curve({ black: 0, white: 1, gamma: g })), target, max).toFixed(3);

/** A source's levels with a variant's fix on top (gamma multiplied, capped). */
export const withFix = (levels: Levels, fix = 1): Levels => ({ ...levels, gamma: +Math.min(3.2, levels.gamma * fix).toFixed(3) });
