/**
 * Audio-reactive visuals beyond bars and lines, for WaveformLayer: a halo of spectrum rays, a
 * yantra (the spectrum folded round a centre), sparks thrown from a point, shockwave rings on the
 * kicks, lightning on the snares, and a row of aarti flames. The spectrum comes from mediamake's
 * waveform atoms (the same FFT as WaveformSpectrumLine), the hits from the song's analysis
 * (manifest onsets and envelopes). Points (`at`) are in the unmoved picture's frame px and follow
 * the cover's zoom, kick and shake, so an effect stays on its spot of the picture.
 */
import React, { useId, useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Waveform, computeSmoothedSpectrum, computeSpectrumLineHeights, useWaveformContext } from '@microfox/remotion';
import type { Manifest } from '../kit/manifest';
import { useBeat, useEnergy, useHit, useManifest, useSongTime } from '../kit/hooks';
import { envelopeAt } from '../kit/timing';
import { coverPoint, MotionBlur, motionBlurCss, useCoverMotion, type CoverBackdropProps, type CoverMotion } from './CoverBackdrop';
import { hash } from './PictureLook';

type Point = [number, number];

/** How the spectrum is read: the FFT and the shaping of each band (spectrum-line-math). */
export type SpectrumOptions = {
  minFrequency?: number;
  maxFrequency?: number;
  tilt?: number;
  gain?: number;
  noiseFloor?: number;
  sharpness?: number;
  spread?: number;
  /** 0–0.95, how long peaks linger. */
  smoothing?: number;
};

export type HaloProps = {
  kind: 'halo';
  at: Point;
  /** Inner radius and the longest ray, px. */
  radius: number;
  length: number;
  /** Rays across the arc. */
  count?: number;
  /** The arc in degrees, 0 = right, clockwise. Default the full circle. */
  arc?: [number, number];
  barWidth?: number;
  /** Ray colour from quiet to loud. */
  colors?: [string, string];
  glow?: string;
  /** Degrees per second. */
  spin?: number;
  /** A thin ring at the inner radius that brightens on the beat. */
  ring?: boolean;
  spectrum?: SpectrumOptions;
};

/**
 * A ring that grows horns: the spectrum wrapped round a circle, mirrored left and right with the
 * bass either side of `facing`, every band a pointed blade with hollow sides — thorns on the ring
 * when it's quiet, great curved horns on the hits (the trap-visualizer ring, made for a devil).
 * Echo layers trail a few frames behind, the ring punches on the kick and throws a zoom smear.
 */
export type HornsProps = {
  kind: 'horns';
  at: Point;
  /** The base ring's radius, px. */
  radius: number;
  /** How far the loudest band reaches out from the ring, px. */
  length: number;
  /** Where the bass points, degrees (0 = right, clockwise, -90 = up). Default up. */
  facing?: number;
  /** Blades per side, bass first; fewer make fewer, bigger horns. Default 9. */
  bands?: number;
  /** >1 hollows each blade's sides and sharpens its tip. Default 1.8. */
  sharpness?: number;
  /** >1 keeps quiet bands small and lets the loud ones tower. Default 1.4. */
  contrast?: number;
  /** Levels under this stay on the ring (0..1), so only the loudest bands rise. Default 0. */
  floor?: number;
  /**
   * Degrees either side of `facing` kept bare, and the share of a side (0..1) over which the outline
   * ramps up from there: the bass then stands as two separate horns with a dip between them.
   * Default 0 and 0.
   */
  gap?: number;
  ramp?: number;
  /** Degrees a blade's tip bends away from `facing` at full length (horns curling out). Default 14. */
  curl?: number;
  /** How much shorter the blades get away from the bass, 0..1 (0.7: the treble reaches 30 %). Default 0.6. */
  taper?: number;
  /** How much of its band a blade's base takes, 0..1; less leaves bare ring between thin blades. Default 1. */
  blade?: number;
  /**
   * 'blades': every band its own pointed blade. 'lobes': one smooth outline through the bands, so the
   * loud ones swell into wide glowing crescents with pointed tips (the trap ring's horns). Default 'blades'.
   */
  shape?: 'blades' | 'lobes';
  /**
   * The shapes, back to front: each `delay` frames behind the music, `scale` × the reach, with an
   * optional edge line (`stroke`). `color: 'none'` with a thick stroke draws the outline only: hollow
   * crescents bulging off the ring (the trap ring's look) instead of filled lobes.
   */
  layers?: { color: string; delay?: number; scale?: number; opacity?: number; stroke?: string; strokeWidth?: number }[];
  /** The thin base ring, and its brightening on the beat. */
  ring?: string;
  glow?: string;
  glowBlur?: number;
  /** Ghost copies thrown outward on each kick, 0..1 (the motion smear on the hits). */
  smear?: number;
  /** Extra scale of the whole ring on the kick, 0..1 (0.1 = 10 %). */
  punch?: number;
  /** How much longer the blades leap on the kick (1 = twice as long at the hit). Default 0. */
  kickReach?: number;
  spin?: number;
  spectrum?: SpectrumOptions;
};

export type YantraProps = {
  kind: 'yantra';
  at: Point;
  radius: number;
  /** How far the petals reach out on a loud band, px. */
  depth: number;
  /** Petals round the circle (eight arms: 8). */
  folds?: number;
  /** Concentric copies, each smaller and turned half a petal. */
  layers?: number;
  colors?: string[];
  glow?: string;
  strokeWidth?: number;
  /** Fill inside the outer petals, e.g. 'rgba(255,138,31,0.18)'. */
  fill?: string;
  spin?: number;
  /** A dot at the centre that swells on the kick. */
  bindu?: string;
  spectrum?: SpectrumOptions;
};

export type SparksProps = {
  kind: 'sparks';
  at: Point;
  /** Throw direction in degrees (0 = right, clockwise) and the cone around it. */
  direction?: number;
  spread?: number;
  /** Sparks per second at full energy, and extra sparks per kick. */
  rate?: number;
  burst?: number;
  speed?: [number, number];
  life?: [number, number];
  /** px/s², down. */
  gravity?: number;
  /** Air drag per second. */
  drag?: number;
  /** Streak length in seconds of travel. */
  streak?: number;
  /** hot → cooling colours. */
  colors?: [string, string, string];
  width?: number;
};

export type RingsProps = {
  kind: 'rings';
  at: Point;
  /** Onsets that fire a ring. */
  on?: 'kick' | 'snare' | 'beat' | 'downbeat';
  /** Weakest onset that fires one, 0..1. */
  threshold?: number;
  maxRadius?: number;
  life?: number;
  color?: string;
  width?: number;
  /** Height/width of the ring (perspective), 1 = circle. */
  squash?: number;
  /** A flash at the centre on each ring. */
  flash?: string;
};

export type BoltProps = {
  kind: 'bolt';
  at: Point;
  /** Onsets that strike. */
  on?: 'snare' | 'kick' | 'downbeat';
  threshold?: number;
  /** Shortest time between strikes, s. */
  minGap?: number;
  /** Strike angles (degrees, 0 = right) and lengths, px. */
  angles?: [number, number];
  length?: [number, number];
  life?: number;
  core?: string;
  glow?: string;
  /** Strike only in these sections (labels). Default everywhere. */
  sections?: string[];
  /** Whole-frame flash on a strike, 0..1. */
  flash?: number;
};

export type FlamesProps = {
  kind: 'flames';
  count?: number;
  /** Left and right of the row, px; baseline px from the bottom. */
  span?: [number, number];
  bottom?: number;
  height?: [number, number];
  width?: number;
  /** Bronze lamps (diyas) under the flames. */
  lamps?: boolean;
  colors?: [string, string, string];
  spectrum?: SpectrumOptions;
};

export type VisualizerProps = (HaloProps | HornsProps | YantraProps | SparksProps | RingsProps | BoltProps | FlamesProps) & {
  /** The cover's settings (lookVideo passes them), so `at` follows the picture's motion. */
  cover?: CoverBackdropProps;
  opacity?: number;
  mixBlendMode?: React.CSSProperties['mixBlendMode'];
};

export const VISUALIZER_KINDS = ['halo', 'horns', 'yantra', 'sparks', 'rings', 'bolt', 'flames'] as const;

// ---------- shared ----------

const useCover = (cover: CoverBackdropProps | undefined) => useCoverMotion(cover ?? { motion: 'still', beatKick: 0 });

/** The spectrum at this frame, or `delay` frames ago (for echo layers). */
const useSpectrum = (count: number, o: SpectrumOptions = {}, delay = 0): number[] => {
  const { audioData, audioFrame: now, fps } = useWaveformContext();
  const audioFrame = Math.max(0, now - delay);
  return useMemo(() => {
    if (!audioData) return new Array(count).fill(0);
    const spectrum = computeSmoothedSpectrum({
      channels: audioData.channelWaveforms,
      sampleRate: audioData.sampleRate,
      cacheKey: String(audioData.resultId),
      frame: audioFrame,
      fps,
      fftSize: 4096,
      smoothing: o.smoothing ?? 0.6,
      historyFrames: 6,
    });
    return computeSpectrumLineHeights(spectrum, audioData.sampleRate, {
      pointCount: count,
      minFrequency: o.minFrequency ?? 40,
      maxFrequency: o.maxFrequency ?? 5000,
      frequencyScale: 'log',
      tilt: o.tilt ?? 0.3,
      gain: o.gain ?? 12,
      noiseFloor: o.noiseFloor ?? 0.04,
      sharpness: o.sharpness ?? 1,
      spread: o.spread ?? 2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioData, audioFrame, fps, count, o.minFrequency, o.maxFrequency, o.tilt, o.gain, o.noiseFloor, o.sharpness, o.spread, o.smoothing]);
};

const smooth01 = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};

/** Bands folded so the bass sits in the middle and the treble at both ends. */
const mirrored = (values: number[], n: number) =>
  Array.from({ length: n }, (_, i) => {
    const u = Math.abs((i / Math.max(1, n - 1)) * 2 - 1); // 1 … 0 … 1
    const x = u * (values.length - 1);
    const a = Math.floor(x);
    const b = Math.min(values.length - 1, a + 1);
    return values[a] + (values[b] - values[a]) * (x - a);
  });

const glowFilter = (id: string, blur: number) => (
  <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation={blur} result="b" />
    <feMerge>
      <feMergeNode in="b" />
      <feMergeNode in="b" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

const mix = (a: string, b: string, t: number) => {
  const p = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * Math.min(1, Math.max(0, t)))).join(',')})`;
};

/** A closed smooth path through points (Catmull-Rom as cubic Béziers). */
const closedPath = (pts: Point[]) => {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
};

/** Onsets of a kind, or the beat grid ('beat' / 'downbeat'), as [time, strength]. */
const hitsOf = (m: Manifest, on: string): [number, number][] => {
  if (on === 'beat') return m.beats.list.map(b => [b.t, b.strength] as [number, number]);
  if (on === 'downbeat') return (m.beats.downbeats ?? []).map(t => [t, 1] as [number, number]);
  return m.onsets?.[on] ?? [];
};

// ---------- halo ----------

const HornsContent: React.FC<HornsProps & { motion: CoverMotion }> = ({
  at,
  radius,
  length,
  facing = -90,
  bands = 9,
  sharpness = 1.8,
  contrast = 1.4,
  floor = 0,
  gap = 0,
  ramp = 0,
  curl = 14,
  taper = 0.6,
  blade = 1,
  shape: form = 'blades',
  layers = [{ color: '#ff2a2a' }],
  ring = '#ff5a4a',
  glow = '#ff1a1a',
  glowBlur = 10,
  smear = 0.5,
  punch = 0.08,
  kickReach = 0,
  spin = 0,
  spectrum,
  motion,
}) => {
  const t = useSongTime();
  const { pulse } = useBeat(5);
  const kick = Math.min(1, useHit('kick', 9));
  const { width: W, height: H } = useVideoConfig();
  const id = `horns-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // one spectrum per layer (a stable count, so the hooks keep their order)
  const spectra = layers.map(l =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpectrum(bands, { smoothing: 0.55, gain: 14, spread: 0.5, ...spectrum }, l.delay ?? 0),
  );
  const [cx, cy] = coverPoint(motion, at);
  const s = motion.scale * (1 + punch * kick);
  const r0 = radius * s;
  const N = 360;
  const shape = (values: number[], reach: number) => {
    const pts: string[] = [];
    for (let j = 0; j < N; j++) {
      const u = j / N;
      const side = u < 0.5 ? 1 : -1;
      const dRaw = Math.min(u, 1 - u) * 2; // 0 at `facing`, 1 opposite: both sides mirrored
      const g = gap / 180;
      const d = Math.max(0, (dRaw - g) / (1 - g));
      const rise = dRaw <= g ? 0 : ramp > 0 ? smooth01(d / ramp) : 1;
      // band k fills d ∈ [k, k+1) / bands, its blade's tip at the middle: the first pair stands
      // either side of `facing` like two horns
      const x = Math.min(bands - 1e-6, d * bands);
      const k = Math.floor(x);
      let tooth: number;
      let level: number;
      if (form === 'lobes') {
        // straight between the band centres: one flowing outline whose loud bands end in points
        // (the contrast curve then hollows the sides, so a lifted band reads as a curved horn)
        const c = Math.max(0, Math.min(bands - 1, x - 0.5));
        const a = Math.floor(c);
        const b = Math.min(bands - 1, a + 1);
        const w = c - a;
        tooth = 1;
        level = (values[a] ?? 0) * (1 - w) + (values[b] ?? 0) * w;
      } else {
        tooth = Math.pow(Math.max(0, 1 - Math.abs(x - k - 0.5) * (2 / blade)), sharpness);
        level = values[k] ?? 0;
      }
      const lifted = Math.max(0, (level - floor) / (1 - floor));
      const e = Math.pow(lifted, contrast) * tooth * rise * (1 - taper * d); // 0..1 of the reach
      const r = r0 + (3 * tooth + e * length * reach) * s;
      const ang = ((facing + u * 360 + side * curl * e + t * spin) * Math.PI) / 180;
      pts.push(`${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`);
    }
    // the band between the ring and the outline (evenodd cuts the inside out)
    const hole = `M${cx + r0},${cy} A${r0},${r0} 0 1 0 ${cx - r0},${cy} A${r0},${r0} 0 1 0 ${cx + r0},${cy} Z`;
    return `M${pts.join(' L')} Z ${hole}`;
  };
  const front = layers.length - 1;
  const paths = layers.map((l, i) => shape(spectra[i], (l.scale ?? 1) * (1 + kickReach * kick)));
  const zoomAbout = (f: number) => `translate(${cx} ${cy}) scale(${f}) translate(${-cx} ${-cy})`;

  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        {glowFilter(id, glowBlur)}
        <filter id={`${id}-smear`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
      </defs>
      {smear > 0 &&
        kick > 0.05 &&
        [3, 2, 1].map(k => (
          <path
            key={`smear-${k}`}
            d={paths[front]}
            transform={zoomAbout(1 + smear * kick * 0.09 * k)}
            fill={layers[front].color}
            fillRule="evenodd"
            stroke={layers[front].stroke}
            strokeWidth={layers[front].stroke ? (layers[front].strokeWidth ?? 2) * s : undefined}
            opacity={(0.4 * kick) / k}
            filter={`url(#${id}-smear)`}
          />
        ))}
      <g filter={`url(#${id})`}>
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={layers[i].color}
            fillRule="evenodd"
            opacity={layers[i].opacity ?? 1}
            stroke={layers[i].stroke}
            strokeWidth={layers[i].stroke ? (layers[i].strokeWidth ?? 2) * s : undefined}
            strokeLinejoin="round"
          />
        ))}
        <circle cx={cx} cy={cy} r={r0} fill="none" stroke={ring} strokeWidth={(3.5 + 2 * pulse) * s} opacity={0.7 + pulse * 0.3} />
      </g>
    </svg>
  );
};

const HaloContent: React.FC<HaloProps & { motion: CoverMotion }> = ({
  at,
  radius,
  length,
  count = 120,
  arc = [0, 360],
  barWidth = 4,
  colors = ['#ffcf70', '#fff4dc'],
  glow = '#ff8a1f',
  spin = 0,
  ring = true,
  spectrum,
  motion,
}) => {
  const t = useSongTime();
  const { pulse } = useBeat(5);
  const { width: W, height: H } = useVideoConfig();
  const values = mirrored(useSpectrum(48, { smoothing: 0.7, ...spectrum }), count);
  const [cx, cy] = coverPoint(motion, at);
  const s = motion.scale;
  const full = arc[1] - arc[0] >= 359.9;
  const rays = values.map((v, i) => {
    const deg = arc[0] + (arc[1] - arc[0]) * (full ? i / count : i / Math.max(1, count - 1)) + t * spin;
    const a = (deg * Math.PI) / 180;
    const r0 = radius * s;
    const r1 = r0 + (6 + v * length) * s;
    return { x0: cx + Math.cos(a) * r0, y0: cy + Math.sin(a) * r0, x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1, v };
  });
  const a0 = ((arc[0] + t * spin) * Math.PI) / 180;
  const a1 = ((arc[1] + t * spin) * Math.PI) / 180;
  const r = radius * s * 0.97;
  const ringPath = full
    ? null
    : `M${cx + Math.cos(a0) * r},${cy + Math.sin(a0) * r} A${r},${r} 0 ${arc[1] - arc[0] > 180 ? 1 : 0} 1 ${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r}`;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>{glowFilter('halo-glow', 6)}</defs>
      <g filter="url(#halo-glow)" style={{ color: glow }}>
        {ring &&
          (full ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors[0]} strokeWidth={1.5} opacity={0.35 + pulse * 0.5} />
          ) : (
            <path d={ringPath!} fill="none" stroke={colors[0]} strokeWidth={1.5} opacity={0.35 + pulse * 0.5} />
          ))}
        {rays.map((b, i) => (
          <line
            key={i}
            x1={b.x0}
            y1={b.y0}
            x2={b.x1}
            y2={b.y1}
            stroke={mix(colors[0], colors[1], b.v)}
            strokeWidth={barWidth * s}
            strokeLinecap="round"
            opacity={0.55 + b.v * 0.45}
          />
        ))}
      </g>
      <g opacity={0.6}>
        {rays.map((b, i) => (
          <line key={i} x1={b.x0} y1={b.y0} x2={b.x1} y2={b.y1} stroke={glow} strokeWidth={barWidth * s * 3} strokeLinecap="round" opacity={b.v * 0.18} />
        ))}
      </g>
    </svg>
  );
};

// ---------- yantra ----------

const YantraContent: React.FC<YantraProps & { motion: CoverMotion }> = ({
  at,
  radius,
  depth,
  folds = 8,
  layers = 2,
  colors = ['#fff4dc', '#ff8a1f', '#c1121f'],
  glow = '#ffb000',
  strokeWidth = 2.5,
  fill,
  spin = 6,
  bindu,
  spectrum,
  motion,
}) => {
  const t = useSongTime();
  const { width: W, height: H } = useVideoConfig();
  const m = useManifest();
  const fillId = `yantra-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const kick = Math.exp(-Math.max(0, t - (hitsOf(m, 'kick').filter(([k]) => k <= t).at(-1)?.[0] ?? -9)) * 6);
  const per = 24;
  const values = useSpectrum(per, { smoothing: 0.75, ...spectrum });
  const [cx, cy] = coverPoint(motion, at);
  const s = motion.scale;
  const shapes = Array.from({ length: layers }, (_, k) => {
    const scale = 1 - k * 0.42;
    const turn = ((k % 2) * Math.PI) / folds;
    const pts: Point[] = [];
    const n = folds * per;
    for (let i = 0; i < n; i++) {
      // within a petal the band runs bass → treble → bass, so each petal is symmetric
      const u = (i % per) / per;
      const band = Math.round(Math.abs(u * 2 - 1) * (per - 1));
      const v = values[per - 1 - band];
      const a = (i / n) * Math.PI * 2 + turn + (t * spin * (k % 2 ? -1 : 1) * Math.PI) / 180;
      const rr = (radius + v * depth) * scale * s;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return { d: closedPath(pts), color: colors[k % colors.length] };
  });
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        {glowFilter('yantra-glow', 7)}
        <radialGradient id={fillId} cx={cx} cy={cy} r={(radius + depth) * s} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={fill ?? 'transparent'} stopOpacity={0.9} />
          <stop offset="100%" stopColor={fill ?? 'transparent'} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g filter="url(#yantra-glow)" style={{ color: glow }}>
        <circle cx={cx} cy={cy} r={radius * s * 0.98} fill="none" stroke={colors[0]} strokeWidth={1} opacity={0.4} />
        {shapes.map((p, k) => (
          <path
            key={k}
            d={p.d}
            fill={k === 0 && fill ? `url(#${fillId})` : 'none'}
            stroke={p.color}
            strokeWidth={strokeWidth * (k ? 0.8 : 1)}
            strokeLinejoin="round"
          />
        ))}
        {bindu && <circle cx={cx} cy={cy} r={(6 + kick * 10) * s} fill={bindu} />}
      </g>
    </svg>
  );
};

// ---------- sparks ----------

const Sparks: React.FC<SparksProps & { motion: CoverMotion }> = ({
  at,
  direction = 0,
  spread = 70,
  rate = 70,
  burst = 14,
  speed = [260, 900],
  life = [0.5, 1.4],
  gravity = 420,
  drag = 1.6,
  streak = 0.035,
  colors = ['#fffbe8', '#ffcf70', '#ff5a1f'],
  width = 2.4,
  motion,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const m = useManifest();
  const t = useSongTime();
  const t0 = t - frame / fps; // song time of frame 0
  const kicks = m.onsets?.kick ?? [];
  const [ex, ey] = coverPoint(motion, at);
  const s = motion.scale;
  const back = Math.ceil(life[1] * fps);
  const lines: { x1: number; y1: number; x2: number; y2: number; c: string; o: number; w: number }[] = [];
  const pos = (v0x: number, v0y: number, a: number): Point => {
    const k = (1 - Math.exp(-drag * a)) / drag;
    return [v0x * k, v0y * k + 0.5 * gravity * a * a];
  };
  for (let f = Math.max(0, frame - back); f <= frame; f++) {
    const tf = t0 + f / fps;
    const env = envelopeAt(m, 'rms', tf);
    const want = (rate * (0.15 + env)) / fps;
    let n = Math.floor(want) + (hash(f * 1.31) < want % 1 ? 1 : 0);
    for (const [kt, ks] of kicks) {
      if (kt >= tf && kt < tf + 1 / fps) n += Math.round(burst * ks);
    }
    for (let k = 0; k < n; k++) {
      const seed = f * 97 + k * 13.7;
      const lifeK = life[0] + hash(seed + 1) * (life[1] - life[0]);
      const age = (frame - f) / fps + hash(seed + 2) / fps;
      if (age > lifeK) continue;
      const ang = ((direction + (hash(seed + 3) - 0.5) * spread) * Math.PI) / 180;
      const v = speed[0] + Math.pow(hash(seed + 4), 1.6) * (speed[1] - speed[0]);
      const vx = Math.cos(ang) * v;
      const vy = Math.sin(ang) * v;
      const [px, py] = pos(vx, vy, age);
      const [qx, qy] = pos(vx, vy, Math.max(0, age - streak * (0.6 + hash(seed + 5))));
      const life01 = age / lifeK;
      const c = life01 < 0.25 ? mix(colors[0], colors[1], life01 / 0.25) : mix(colors[1], colors[2], (life01 - 0.25) / 0.75);
      lines.push({ x1: ex + qx * s, y1: ey + qy * s, x2: ex + px * s, y2: ey + py * s, c, o: Math.pow(1 - life01, 0.7), w: width * (1.2 - life01 * 0.7) });
    }
  }
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>{glowFilter('sparks-glow', 3)}</defs>
      <g filter="url(#sparks-glow)">
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.c} strokeWidth={l.w} strokeLinecap="round" opacity={l.o} />
        ))}
      </g>
    </svg>
  );
};

// ---------- rings ----------

const Rings: React.FC<RingsProps & { motion: CoverMotion }> = ({
  at,
  on = 'kick',
  threshold = 0.6,
  maxRadius = 520,
  life = 0.9,
  color = '#ffcf70',
  width = 3,
  squash = 0.42,
  flash,
  motion,
}) => {
  const t = useSongTime();
  const m = useManifest();
  const { width: W, height: H } = useVideoConfig();
  const [cx, cy] = coverPoint(motion, at);
  const s = motion.scale;
  const live = hitsOf(m, on).filter(([h, k]) => k >= threshold && h <= t && t - h < life);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>{glowFilter('rings-glow', 5)}</defs>
      <g filter="url(#rings-glow)">
        {live.map(([h, k], i) => {
          const p = (t - h) / life;
          const r = maxRadius * (1 - Math.pow(1 - p, 3)) * s * (0.6 + 0.4 * k);
          return (
            <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * squash} fill="none" stroke={color} strokeWidth={width * (1 - p) * 2 + 0.5} opacity={Math.pow(1 - p, 1.5) * k} />
          );
        })}
      </g>
      {flash &&
        live.map(([h, k], i) => {
          const p = (t - h) / life;
          return <circle key={`f${i}`} cx={cx} cy={cy} r={160 * s} fill={flash} opacity={Math.max(0, 1 - p * 4) * k * 0.5} style={{ filter: 'blur(30px)' }} />;
        })}
    </svg>
  );
};

// ---------- bolt ----------

/** A jagged bolt by midpoint displacement, plus two branches (which have none of their own). */
const boltPaths = (from: Point, to: Point, seed: number, branches = 2): string[] => {
  let pts: Point[] = [from, to];
  let amp = Math.hypot(to[0] - from[0], to[1] - from[1]) * 0.18;
  for (let level = 0; level < 6; level++) {
    const next: Point[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / len;
      const ny = (b[0] - a[0]) / len;
      const off = (hash(seed + level * 31 + i * 7.3) - 0.5) * 2 * amp;
      next.push([(a[0] + b[0]) / 2 + nx * off, (a[1] + b[1]) / 2 + ny * off], b);
    }
    pts = next;
    amp *= 0.55;
  }
  const toD = (p: Point[]) => p.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
  const out = [toD(pts)];
  for (let b = 0; b < branches; b++) {
    const i = Math.floor((0.25 + hash(seed + 50 + b) * 0.5) * pts.length);
    const start = pts[i];
    const dir = Math.atan2(to[1] - from[1], to[0] - from[0]) + (hash(seed + 60 + b) - 0.5) * 1.6;
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]) * (0.15 + hash(seed + 70 + b) * 0.25);
    const end: Point = [start[0] + Math.cos(dir) * len, start[1] + Math.sin(dir) * len];
    out.push(boltPaths(start, end, seed + 100 + b, 0)[0]);
  }
  return out;
};

const Bolt: React.FC<BoltProps & { motion: CoverMotion }> = ({
  at,
  on = 'snare',
  threshold = 0.75,
  minGap = 1.2,
  angles = [-35, 25],
  length = [450, 850],
  life = 0.3,
  core = '#ffffff',
  glow = '#ffb347',
  sections,
  flash = 0.18,
  motion,
}) => {
  const t = useSongTime();
  const m = useManifest();
  const { width: W, height: H } = useVideoConfig();
  const strikes = useMemo(() => {
    const inSection = (x: number) =>
      !sections || m.sections.some(sec => sections.includes(sec.label) && x >= sec.from && x < sec.to);
    const out: [number, number][] = [];
    for (const [h, k] of hitsOf(m, on)) {
      if (k < threshold || !inSection(h)) continue;
      if (out.length && h - out[out.length - 1][0] < minGap) continue;
      out.push([h, k]);
    }
    return out;
  }, [m, on, threshold, minGap, sections]);
  const live = strikes.filter(([h]) => h <= t && t - h < life);
  if (!live.length) return null;
  const [cx, cy] = coverPoint(motion, at);
  const s = motion.scale;
  return (
    <AbsoluteFill>
      {flash > 0 && (
        <AbsoluteFill
          style={{ background: glow, mixBlendMode: 'screen', opacity: Math.max(...live.map(([h, k]) => Math.max(0, 1 - (t - h) / (life * 0.5)) * k)) * flash }}
        />
      )}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>{glowFilter('bolt-glow', 8)}</defs>
        {live.map(([h, k]) => {
          const seed = Math.round(h * 1000);
          const ang = ((angles[0] + hash(seed) * (angles[1] - angles[0])) * Math.PI) / 180;
          const len = (length[0] + hash(seed + 1) * (length[1] - length[0])) * s;
          const end: Point = [cx + Math.cos(ang) * len, cy + Math.sin(ang) * len];
          const p = (t - h) / life;
          // strike, dim, re-strike, fade
          const o = (p < 0.15 ? 1 : p < 0.3 ? 0.35 : p < 0.5 ? 0.9 : 1 - (p - 0.5) / 0.5) * Math.min(1, k + 0.2);
          return (
            <g key={h} filter="url(#bolt-glow)" opacity={o}>
              {boltPaths([cx, cy], end, seed).map((d, i) => (
                <React.Fragment key={i}>
                  <path d={d} fill="none" stroke={glow} strokeWidth={(i ? 4 : 8) * s} strokeLinejoin="round" opacity={0.6} />
                  <path d={d} fill="none" stroke={core} strokeWidth={(i ? 1.2 : 2.6) * s} strokeLinejoin="round" />
                </React.Fragment>
              ))}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ---------- flames ----------

const FlamesContent: React.FC<FlamesProps> = ({
  count = 11,
  span = [260, 1660],
  bottom = 70,
  height = [40, 230],
  width = 46,
  lamps = true,
  colors = ['#fffbe8', '#ffcf70', '#ff5a1f'],
  spectrum,
}) => {
  const t = useSongTime();
  const { width: W, height: H } = useVideoConfig();
  const values = mirrored(useSpectrum(24, { smoothing: 0.55, gain: 14, ...spectrum }), count);
  const by = H - bottom;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="flame-fill" cx="0.5" cy="0.85" r="0.75" fx="0.5" fy="0.9">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="30%" stopColor={colors[0]} />
          <stop offset="55%" stopColor={colors[1]} />
          <stop offset="85%" stopColor={colors[2]} stopOpacity={0.85} />
          <stop offset="100%" stopColor={colors[2]} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="diya-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8892e" />
          <stop offset="100%" stopColor="#3a1606" />
        </linearGradient>
        <filter id="flame-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={14} />
        </filter>
      </defs>
      {values.map((v, i) => {
        const cx = span[0] + ((span[1] - span[0]) * i) / Math.max(1, count - 1);
        const flick = 0.92 + 0.08 * Math.sin(t * (11 + hash(i) * 6) + i * 2.1);
        const h = (height[0] + v * (height[1] - height[0])) * flick;
        const w = width * (0.8 + v * 0.35);
        const sway = Math.sin(t * (3 + hash(i + 3) * 2) + i) * w * 0.25 * (0.4 + v);
        const d = `M${cx},${by} C${cx - w},${by - h * 0.22} ${cx - w * 0.38 + sway * 0.4},${by - h * 0.72} ${cx + sway},${by - h} C${cx + w * 0.38 + sway * 0.4},${by - h * 0.72} ${cx + w},${by - h * 0.22} ${cx},${by} Z`;
        return (
          <g key={i}>
            <path d={d} fill={colors[2]} opacity={0.45 + v * 0.4} filter="url(#flame-glow)" />
            <path d={d} fill="url(#flame-fill)" style={{ mixBlendMode: 'screen' }} />
            {lamps && (
              <path
                d={`M${cx - w * 1.15},${by + 2} Q${cx},${by + w * 0.95} ${cx + w * 1.15},${by + 2} Q${cx + w * 0.4},${by + 8} ${cx},${by + 6} Q${cx - w * 0.4},${by + 8} ${cx - w * 1.15},${by + 2} Z`}
                fill="url(#diya-fill)"
                stroke="#ffcf70"
                strokeOpacity={0.6}
                strokeWidth={1.2}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ---------- entry ----------

const needsSpectrum = (kind: VisualizerProps['kind']) =>
  kind === 'halo' || kind === 'horns' || kind === 'yantra' || kind === 'flames';

export const Visualizer: React.FC<VisualizerProps & { audio: { src: string; start: number } }> = ({ audio, cover, opacity, mixBlendMode, ...props }) => {
  const { motion, blur } = useCover(cover);
  const { width, height } = useVideoConfig();
  const blurId = `viz-blur-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const body = (() => {
    switch (props.kind) {
      case 'halo':
        return <HaloContent {...props} motion={motion} />;
      case 'horns':
        return <HornsContent {...props} motion={motion} />;
      case 'yantra':
        return <YantraContent {...props} motion={motion} />;
      case 'sparks':
        return <Sparks {...props} motion={motion} />;
      case 'rings':
        return <Rings {...props} motion={motion} />;
      case 'bolt':
        return <Bolt {...props} motion={motion} />;
      case 'flames':
        return <FlamesContent {...props} />;
    }
  })();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode, filter: motionBlurCss(blurId, blur) || undefined }}>
      <MotionBlur id={blurId} blur={blur} />
      {needsSpectrum(props.kind) ? (
        <Waveform
          config={{ audioSrc: audio.src, dataOffsetInSeconds: audio.start, numberOfSamples: 32, smoothNormalisation: 0, useFrequencyData: false, width, height }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {body}
        </Waveform>
      ) : (
        body
      )}
    </AbsoluteFill>
  );
};
