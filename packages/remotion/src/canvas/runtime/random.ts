/**
 * Deterministic randomness helpers for canvas rendering.
 *
 * Remotion renders frames in parallel across workers/threads, so any
 * randomness used during drawing MUST be a pure function of stable inputs
 * (seed, node id, frame). Math.random() is never allowed in canvas ops.
 */

/** Mulberry32 seeded PRNG. Returns a function producing floats in [0, 1). */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** FNV-1a string hash -> 32-bit unsigned int. Stable across sessions. */
export const hashString = (str: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** Combine a base seed with extra numeric salts into a new seed. */
export const combineSeed = (base: number, ...salts: number[]): number => {
  let h = base >>> 0;
  for (const s of salts) {
    h = Math.imul(h ^ (s >>> 0), 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** Resolve a user-provided seed (number | string | undefined) to a number. */
export const resolveSeed = (
  seed: number | string | undefined,
  fallback: string
): number => {
  if (typeof seed === 'number') return seed >>> 0;
  if (typeof seed === 'string') return hashString(seed);
  return hashString(fallback);
};
