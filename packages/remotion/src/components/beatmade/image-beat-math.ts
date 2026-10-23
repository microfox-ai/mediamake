/**
 * Onset detection + the eccentric punch-zoom used by ImageBeat.
 * Pure functions so each Remotion frame can recompute the same transform.
 */

export type BeatAudioProperty = 'bass' | 'mid' | 'treble' | 'waveform';

export interface DetectBeatsOptions {
  /** Minimum flux (0-1 after normalisation) that counts as an onset. Default 0.18. */
  threshold?: number;
  /** Multiplies the running flux mean before it is compared to a peak. Default 1.6. */
  sensitivity?: number;
  /** Shortest allowed gap between beats, in seconds. Default 0.18. */
  minGapSec?: number;
  /** Analysis hop, in seconds. Default 0.01. */
  hopSec?: number;
  /** Which band the energy envelope is taken from. Default bass. */
  audioProperty?: BeatAudioProperty;
}

export interface EccentricZoomOptions {
  /** Extra scale added at the punch. Default 0.32. */
  zoomIntensity?: number;
  /** Resting scale (keep above 1 so origin shifts stay cropped). Default 1.08. */
  baseScale?: number;
  /** Seconds to ease into the new crop after a beat. Default 0.18. */
  punchSec?: number;
  /** Seconds to ease back after the punch. Default 0.5. */
  settleSec?: number;
  /** How far origins sit from centre, 0-1. Default 0.7. */
  originSpread?: number;
  /** How much a beat's strength sizes its punch, 0-1. Default 0.6. */
  dynamics?: number;
  /** Extra punch on downbeats, as a share of the punch. Default 0. */
  downbeatBoost?: number;
  /** Degrees a punch may rotate, alternating sides. Default 0. */
  tilt?: number;
}

/** A beat time, or a cue with its strength (0-1) and whether it is a downbeat. */
export type ZoomBeat = number | { t: number; strength?: number; downbeat?: boolean };

export interface EccentricZoom {
  scale: number;
  /** Percent translate of the image (center origin). */
  tx: number;
  ty: number;
  /** Focal point in percent, for tests / debug. */
  originX: number;
  originY: number;
  /** Rotation in degrees. */
  rotate: number;
  /** Envelope of the latest punch, 1 on the hit falling to 0 when it settles. */
  punch: number;
  /** Index of the beat that owns this punch, or -1. */
  beatIndex: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const mixMono = (channels: ArrayLike<number>[]): Float32Array => {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) {
    const src = channels[0];
    const out = new Float32Array(src.length);
    out.set(src);
    return out;
  }
  const len = channels[0].length;
  const out = new Float32Array(len);
  const count = channels.length;
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let c = 0; c < count; c++) sum += channels[c][i] ?? 0;
    out[i] = sum / count;
  }
  return out;
};

const onePoleLowpass = (samples: Float32Array, sampleRate: number, cutoffHz: number) => {
  const rc = 1 / (2 * Math.PI * Math.max(1, cutoffHz));
  const a = 1 / (sampleRate * rc + 1);
  const out = new Float32Array(samples.length);
  let y = 0;
  for (let i = 0; i < samples.length; i++) {
    y += a * (samples[i] - y);
    out[i] = y;
  }
  return out;
};

const filterForProperty = (
  samples: Float32Array,
  sampleRate: number,
  audioProperty: BeatAudioProperty,
): Float32Array => {
  if (audioProperty === 'waveform') return samples;
  if (audioProperty === 'bass') return onePoleLowpass(samples, sampleRate, 160);
  if (audioProperty === 'treble') {
    const low = onePoleLowpass(samples, sampleRate, 2000);
    const out = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) out[i] = samples[i] - low[i];
    return out;
  }
  const high = onePoleLowpass(samples, sampleRate, 250);
  const low = onePoleLowpass(samples, sampleRate, 2000);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = low[i] - high[i];
  return out;
};

const rmsWindow = (samples: Float32Array, start: number, length: number) => {
  const end = Math.min(samples.length, start + length);
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (end - start));
};

/**
 * Peak-pick onsets from a mixed / filtered energy envelope.
 * Times are seconds from the start of the audio buffer.
 */
export function detectBeats(
  channels: ArrayLike<number>[],
  sampleRate: number,
  options: DetectBeatsOptions = {},
): number[] {
  const threshold = options.threshold ?? 0.18;
  const sensitivity = options.sensitivity ?? 1.6;
  const minGapSec = options.minGapSec ?? 0.18;
  const hopSec = options.hopSec ?? 0.01;
  const audioProperty = options.audioProperty ?? 'bass';
  if (!(sampleRate > 0) || channels.length === 0) return [];

  const filtered = filterForProperty(mixMono(channels), sampleRate, audioProperty);
  if (filtered.length === 0) return [];

  const hop = Math.max(1, Math.round(sampleRate * hopSec));
  const win = hop * 2;
  const energies: number[] = [];
  for (let i = 0; i + win <= filtered.length; i += hop) {
    energies.push(rmsWindow(filtered, i, win));
  }
  if (energies.length < 3) return [];

  let maxE = 0;
  for (const e of energies) if (e > maxE) maxE = e;
  if (maxE <= 1e-8) return [];

  const flux = new Array(energies.length).fill(0);
  let fluxSum = 0;
  let maxFlux = 0;
  for (let i = 1; i < energies.length; i++) {
    const d = Math.max(0, energies[i] / maxE - energies[i - 1] / maxE);
    flux[i] = d;
    fluxSum += d;
    if (d > maxFlux) maxFlux = d;
  }
  const mean = fluxSum / Math.max(1, flux.length - 1);
  const cut = mean * sensitivity + threshold * Math.max(maxFlux, 1e-8);

  const beats: number[] = [];
  let last = -Infinity;
  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] < cut) continue;
    if (flux[i] < flux[i - 1] || flux[i] < flux[i + 1]) continue;
    const t = (i * hop) / sampleRate;
    if (t - last < minGapSec) continue;
    beats.push(t);
    last = t;
  }
  return beats;
}

const GOLDEN_ANGLE = 2.399963229728653;

const hash01 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Off-centre origin for beat `index`, in percent. */
export function originForBeat(index: number, originSpread = 0.7): { x: number; y: number } {
  const spread = clamp01(originSpread);
  const angle = index * GOLDEN_ANGLE + hash01(index) * 0.35;
  const radius = (0.16 + 0.34 * spread * (0.55 + 0.45 * hash01(index + 17))) * 100;
  return {
    x: clamp01((50 + Math.cos(angle) * radius) / 100) * 100,
    y: clamp01((50 + Math.sin(angle) * radius * 0.85) / 100) * 100,
  };
}

/**
 * CSS cubic-bezier(x1, y1, x2, y2) with P0=(0,0) and P3=(1,1).
 * `x` is progress in time; the returned value is the eased progress.
 */
export function cubicBezier(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const t0 = clamp01(x);
  if (t0 <= 0) return 0;
  if (t0 >= 1) return 1;

  const sampleX = (t: number) => {
    const it = 1 - t;
    return 3 * it * it * t * x1 + 3 * it * t * t * x2 + t * t * t;
  };
  const sampleDX = (t: number) => {
    const it = 1 - t;
    return 3 * it * it * x1 + 6 * it * t * (x2 - x1) + 3 * t * t * (1 - x2);
  };
  const sampleY = (t: number) => {
    const it = 1 - t;
    return 3 * it * it * t * y1 + 3 * it * t * t * y2 + t * t * t;
  };

  let t = t0;
  for (let i = 0; i < 8; i++) {
    const dx = sampleX(t) - t0;
    const d = sampleDX(t);
    if (Math.abs(dx) < 1e-6 || Math.abs(d) < 1e-6) break;
    t = clamp01(t - dx / d);
  }
  return sampleY(t);
}

/** CSS `ease-in` — cubic-bezier(0.42, 0, 1, 1). */
export const easeIn = (t: number) => cubicBezier(t, 0.42, 0, 1, 1);
/** CSS `ease-out` — cubic-bezier(0, 0, 0.58, 1). */
export const easeOut = (t: number) => cubicBezier(t, 0, 0, 0.58, 1);
/** CSS `ease-in-out` — cubic-bezier(0.42, 0, 0.58, 1). */
export const easeInOut = (t: number) => cubicBezier(t, 0.42, 0, 0.58, 1);

export function findLastBeatIndex(beats: ZoomBeat[], timeSec: number): number {
  if (beats.length === 0 || beatTime(beats[0]) > timeSec) return -1;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (beatTime(beats[mid]) <= timeSec) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi;
}

const beatTime = (b: ZoomBeat) => (typeof b === 'number' ? b : b.t);

type Camera = { scale: number; tx: number; ty: number; originX: number; originY: number; rotate: number };

/** Pan + scale that looks at `origin` (percent) around the image centre. */
export function cameraAt(origin: { x: number; y: number }, scale: number, rotate = 0): Camera {
  const s = Math.max(1, scale);
  const dx = (origin.x - 50) / 50;
  const dy = (origin.y - 50) / 50;
  return {
    scale: s,
    tx: -dx * ((s - 1) / 2) * 100,
    ty: -dy * ((s - 1) / 2) * 100,
    originX: origin.x,
    originY: origin.y,
    rotate,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpCamera = (from: Camera, to: Camera, t: number): Camera => ({
  scale: lerp(from.scale, to.scale, t),
  tx: lerp(from.tx, to.tx, t),
  ty: lerp(from.ty, to.ty, t),
  originX: lerp(from.originX, to.originX, t),
  originY: lerp(from.originY, to.originY, t),
  rotate: lerp(from.rotate, to.rotate, t),
});

const restCamera = (baseScale: number): Camera => cameraAt({ x: 50, y: 50 }, baseScale);

interface Punch {
  punchSec: number;
  settleSec: number;
  zoomIntensity: number;
  baseScale: number;
  originSpread: number;
  dynamics: number;
  downbeatBoost: number;
  tilt: number;
}

/** Share of the full punch a beat gets from its strength and bar position. */
const punchSize = (beat: ZoomBeat, p: Punch) => {
  if (typeof beat === 'number') return 1;
  const strength = clamp01(beat.strength ?? 1);
  return (1 - p.dynamics + p.dynamics * strength) * (beat.downbeat ? 1 + p.downbeatBoost : 1);
};

/**
 * Advance one beat: pan and zoom share the same bezier progress so they
 * move together. Punch eases in-out into the new crop; settle eases out.
 */
const stepBeat = (beatIndex: number, size: number, elapsed: number, from: Camera, p: Punch): Camera => {
  const origin = originForBeat(beatIndex, p.originSpread);
  const turn = p.tilt * size * (beatIndex % 2 === 0 ? 1 : -1);
  const peak = cameraAt(origin, p.baseScale + p.zoomIntensity * size, turn);
  const rest = cameraAt(origin, p.baseScale);
  if (elapsed <= p.punchSec) {
    return lerpCamera(from, peak, easeInOut(elapsed / p.punchSec));
  }
  return lerpCamera(peak, rest, easeOut(Math.min(1, (elapsed - p.punchSec) / p.settleSec)));
};

/**
 * Scale + pan at `timeSec` for a list of beats (times, or cues with strength).
 * Each beat eases from the live camera into a new crop (pan and zoom together),
 * then eases out. A new beat continues from wherever the last move left off.
 */
export function eccentricZoomAt(
  timeSec: number,
  beats: ZoomBeat[],
  options: EccentricZoomOptions = {},
): EccentricZoom {
  const p: Punch = {
    zoomIntensity: options.zoomIntensity ?? 0.32,
    baseScale: options.baseScale ?? 1.08,
    punchSec: Math.max(0.001, options.punchSec ?? 0.18),
    settleSec: Math.max(0.001, options.settleSec ?? 0.5),
    originSpread: options.originSpread ?? 0.7,
    dynamics: clamp01(options.dynamics ?? 0.6),
    downbeatBoost: Math.max(0, options.downbeatBoost ?? 0),
    tilt: options.tilt ?? 0,
  };

  const beatIndex = findLastBeatIndex(beats, timeSec);
  let camera = restCamera(p.baseScale);
  if (beatIndex < 0) {
    return { ...camera, punch: 0, beatIndex: -1 };
  }

  // A beat that follows a fully settled one starts from that rest crop, so
  // only the moves since then need replaying.
  const full = p.punchSec + p.settleSec;
  let first = beatIndex;
  while (first > 0 && beatTime(beats[first]) - beatTime(beats[first - 1]) < full) first--;
  if (first > 0) camera = cameraAt(originForBeat(first - 1, p.originSpread), p.baseScale);

  for (let i = first; i <= beatIndex; i++) {
    const end = i === beatIndex ? timeSec : beatTime(beats[i + 1]);
    camera = stepBeat(i, punchSize(beats[i], p), Math.max(0, end - beatTime(beats[i])), camera, p);
  }

  const since = timeSec - beatTime(beats[beatIndex]);
  const punch = since < full ? punchSize(beats[beatIndex], p) * (1 - since / full) ** 2 : 0;
  return { ...camera, punch, beatIndex };
}
