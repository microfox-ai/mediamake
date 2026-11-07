/**
 * How far into its footage a shot is after u seconds: its rate, a linear ramp across the shot, or a snap
 * (honoredone v7: "speed up a twixtor shot and suddenly use a normal speed, this way it feels like something
 * is coming to slow motion all of a sudden"): the take runs at `snap.rate` until `snap.until` s, then drops
 * to the shot's own rate over `snap.ease` s. Pure, so the cut builder (node) and the renderer share it.
 */
export type Speed = {
  rate?: number;
  ramp?: [number, number];
  snap?: { rate: number; until: number; ease?: number };
};

/** source seconds consumed after u seconds of a shot `len` long */
export const offsetAt = (s: Speed, u: number, len: number): number => {
  if (s.snap) {
    const R = s.snap.rate;
    const U = s.snap.until;
    const D = s.snap.ease ?? 0.12;
    const r = s.rate ?? 1;
    if (u <= U) return R * u;
    if (u <= U + D) {
      const v = u - U;
      return R * U + R * v + ((r - R) * v * v) / (2 * D);
    }
    return R * U + ((R + r) / 2) * D + r * (u - U - D);
  }
  if (s.ramp) {
    const [r0, r1] = s.ramp;
    const uu = Math.min(u, len);
    return r0 * uu + ((r1 - r0) * uu * uu) / (2 * len) + Math.max(0, u - len) * r1;
  }
  return (s.rate ?? 1) * u;
};

/** the take slowed by m: its rate (a ramp's two ends; a snap keeps its fast start and slows what follows) */
export const slowed = <T extends Speed>(s: T, m: number): T =>
  s.ramp ? { ...s, ramp: [s.ramp[0] * m, s.ramp[1] * m] } : { ...s, rate: (s.rate ?? 1) * m };

/**
 * How much to slow a take with `have` s of footage so it fills a shot `len` long, instead of running out and
 * freezing (honoredone rev-003: "the video is freezing and it feels odd, slow mo the video if needed to fill
 * gap"): 1 when it lasts; never below `slowest` times real speed (slower than that the frames step), so a take
 * far too short slows to that and holds the rest.
 */
export const fillFactor = (s: Speed, len: number, have: number, slowest = 0.3): number => {
  const base = s.ramp ? Math.max(s.ramp[0], s.ramp[1]) : (s.rate ?? 1);
  const floor = Math.min(1, slowest / base);
  if (offsetAt(slowed(s, floor), len, len) > have) return floor;
  let lo = floor;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (offsetAt(slowed(s, mid), len, len) <= have) lo = mid;
    else hi = mid;
  }
  return lo;
};

/** the fraction of the shot at which a take with `have` s of footage runs out (1 = it lasts) */
export const holdFor = (s: Speed, len: number, have: number): number => {
  if (offsetAt(s, len, len) <= have) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (offsetAt(s, mid * len, len) <= have) lo = mid;
    else hi = mid;
  }
  return lo;
};
