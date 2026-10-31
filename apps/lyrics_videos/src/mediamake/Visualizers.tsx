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

/**
 * Energy gathering into a point (the Spirit Bomb): particles rise from `from` and stream into `at`
 * along bowed paths, speeding up as they near it, more of them as the song gets louder and a burst
 * on each kick.
 */
export type GatherProps = {
  kind: 'gather';
  at: Point;
  /** Where they start, frame px. Default the lower two thirds of the frame. */
  from?: { x: [number, number]; y: [number, number] };
  /** Particles per second at full energy, and extra per kick. */
  rate?: number;
  burst?: number;
  /** Seconds a particle takes to reach `at`. */
  travel?: [number, number];
  /** Sideways bow of the path, px. */
  curl?: number;
  /** Trail length, 0..1 of the path. */
  streak?: number;
  /** far → near → at the core. */
  colors?: [string, string, string];
  /** Core width far away and close in, px: hair-thin at the start, thicker as they near `at`. */
  size?: number | [number, number];
  /**
   * The glow round each mote (a wider soft stroke), how far it spreads (px) and how wide it is (×
   * the core). A colour lighter than the ground reads as light (an exposure glow); a darker one
   * reads as a shadow.
   */
  glow?: string;
  glowSize?: number;
  glowWidth?: number;
  /** How much each mote flickers, 0..1, and jitters sideways, px: electric rather than smooth. */
  flicker?: number;
  jitter?: number;
  /**
   * A glow at `at` the motes dissolve into, swelling with the music and the kicks; `grow` is how
   * much bigger it has become by the end of the song (1 = twice the size), growing steadily;
   * `upward` lifts its centre as it grows, by that share of the growth (true = 0.55, which keeps its
   * visible lower edge where it starts), and the motes stream into its centre wherever that is.
   */
  orb?: { color: string; radius: number; core?: string; grow?: number; upward?: boolean | number };
};

/**
 * A smooth glowing line along the bottom edge drawn from the spectrum (bass in the middle), with a
 * soft body under it, fainter echoes of itself a few frames behind and lightning crawling along it
 * that crackles harder with the hats and the kicks. Heights ease into `height` (no flat tops).
 */
export type ArcProps = {
  kind: 'arc';
  /** Tallest a peak gets, and where the line rests in silence, px above the bottom edge. */
  height?: number;
  rest?: number;
  /** Points across the frame. */
  points?: number;
  /** The line, its glow (lighter than the ground reads as light), the body under it and its opacity at the bottom edge. */
  color?: string;
  glow?: string;
  fill?: string;
  body?: number;
  /** Two echoes of the line, frames behind. */
  echoes?: [number, number];
  /**
   * A ribbon: more lines under the main one, each `delay` frames later, `gap` px lower and a little
   * flatter, fading out — silk flowing along the bottom.
   */
  ribbon?: { lines: number; gap?: number; delay?: number };
  /** The line's colour across the frame, edges → centre (overrides `color` for the main line). */
  across?: [string, string];
  /** Where the bass rises: the middle (default) or both edges (to frame a subject standing in the middle). */
  bassAt?: 'center' | 'edges';
  /** Lightning along the line: px of jitter at full charge, how many strands, their colour. */
  crackle?: number;
  strands?: number;
  crackleColor?: string;
  spectrum?: SpectrumOptions;
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

/**
 * An eclipse that closes over the song: a glowing sun disc with the moon sliding across it (from
 * where the picture has it to totality, on a time path), a corona of soft streamers that grow from
 * the spectrum and leap on the kicks — brighter the more of the sun is hidden — a thin spectrum ring
 * on the moon's edge, and diamond-ring flashes at chosen moments. Drawn over a plate with the
 * painted eclipse taken out.
 */
export type EclipseProps = {
  kind: 'eclipse';
  /** The sun's centre and radius, frame px. */
  at: Point;
  radius: number;
  /** The sun disc's fill, the light round it (lighter than the ground reads as light) and its reach, px. */
  sun?: { color?: string; glow?: string; glowSize?: number };
  moon: {
    /** At the start: the moon's centre relative to the sun's (px) and its radius. */
    offset: Point;
    radius: number;
    /**
     * A control offset the moon's path bows towards (a quadratic curve from `offset` to the centre):
     * it arrives moving away from `via`, so the last sliver and a diamond ring sit on the far side.
     */
    via?: Point;
    color?: string;
    /** [song second, coverage 0..1] keys, eased between: 0 = as the picture has it, 1 = totality. */
    path: [number, number][];
    /** Its radius at totality, × the sun's. Default 1.03. */
    cover?: number;
  };
  corona?: {
    color?: string;
    /** Streamers round the circle and the longest reach, px. */
    streamers?: number;
    length?: number;
    width?: number;
    /** Opacity with the sun showing and at totality. Default [0.25, 1]. */
    strength?: [number, number];
    /** How much longer the streamers leap on the kick (1 = twice). Default 0.6. */
    kick?: number;
    /** Degrees per second. */
    spin?: number;
    blur?: number;
    spectrum?: SpectrumOptions;
  };
  /** Short spectrum ticks round the moon's edge that flare on the kicks; opacity with the sun showing and at totality. */
  ring?: { color?: string; ticks?: number; length?: number; width?: number; strength?: [number, number] };
  /** Diamond-ring flashes: a star bursting on the sun's edge (`angle`, degrees, 0 = right, clockwise). */
  diamond?: { at: number; angle?: number; life?: number; color?: string; size?: number; flash?: number }[];
  /** Extra scale of the whole eclipse on the kick, 0..1, and ghost copies thrown outward (the horns' zoom smear). */
  punch?: number;
  smear?: number;
};

export type VisualizerProps = (HaloProps | HornsProps | YantraProps | SparksProps | GatherProps | ArcProps | RingsProps | BoltProps | FlamesProps | EclipseProps) & {
  /** The cover's settings (lookVideo passes them), so `at` follows the picture's motion. */
  cover?: CoverBackdropProps;
  opacity?: number;
  mixBlendMode?: React.CSSProperties['mixBlendMode'];
  /** Song seconds it shows in, as [from, to] pairs (half-second fades). Default all of it. */
  when?: [number, number][];
};

export const VISUALIZER_KINDS = ['halo', 'horns', 'yantra', 'sparks', 'gather', 'arc', 'rings', 'bolt', 'flames', 'eclipse'] as const;

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

// ---------- gather ----------

const Gather: React.FC<GatherProps & { motion: CoverMotion }> = ({
  at,
  from,
  rate = 90,
  burst = 24,
  travel = [1.2, 2.6],
  curl = 160,
  streak = 0.06,
  colors = ['#1f6bff', '#7fd4ff', '#ffffff'],
  size = 3,
  glow,
  glowSize = 3,
  glowWidth = 3.2,
  flicker = 0,
  jitter = 0,
  orb,
  motion,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const m = useManifest();
  const t = useSongTime();
  const kickHit = useHit('kick', 6);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const t0 = t - frame / fps;
  const kicks = m.onsets?.kick ?? [];
  const [ex, ey0] = coverPoint(motion, at);
  // the orb grows steadily over the song; growing upward, its centre rises as it grows
  const grown = orb ? 1 + (orb.grow ?? 0) * Math.min(1, Math.max(0, t / m.audio.duration)) : 1;
  const lift = orb?.upward === true ? 0.55 : orb?.upward || 0;
  const ey = ey0 - (orb ? orb.radius * (grown - 1) * lift * motion.scale : 0);
  const fx = from?.x ?? [0, W];
  const fy = from?.y ?? [H / 3, H + 40];
  const [w0, w1] = Array.isArray(size) ? size : [size * 0.6, size];
  const back = Math.ceil(travel[1] * fps);
  const dots: { x1: number; y1: number; x2: number; y2: number; c: string; o: number; w: number }[] = [];
  const ease = (u: number) => u * u * (1.6 - 0.6 * u);
  for (let f = Math.max(0, frame - back); f <= frame; f++) {
    const tf = t0 + f / fps;
    const want = (rate * (0.1 + envelopeAt(m, 'rms', tf))) / fps;
    let n = Math.floor(want) + (hash(f * 1.73) < want % 1 ? 1 : 0);
    for (const [kt, ks] of kicks) if (kt >= tf && kt < tf + 1 / fps) n += Math.round(burst * ks);
    for (let k = 0; k < n; k++) {
      const seed = f * 89 + k * 17.3;
      const T = travel[0] + hash(seed + 1) * (travel[1] - travel[0]);
      const u = ((frame - f) / fps + hash(seed + 2) / fps) / T;
      if (u >= 1) continue;
      const sx = fx[0] + hash(seed + 3) * (fx[1] - fx[0]);
      const sy = fy[0] + hash(seed + 4) * (fy[1] - fy[0]);
      const bow = (hash(seed + 5) - 0.5) * 2 * curl;
      // a sideways twitch that changes every frame: electric, not smooth
      const twitch = jitter ? (hash(seed + frame * 3.1) - 0.5) * 2 * jitter : 0;
      // along the line from the start to the point, bowed sideways, accelerating in
      const at01 = (v: number): Point => {
        const e = ease(v);
        const dx = ex - sx;
        const dy = ey - sy;
        const len = Math.hypot(dx, dy) || 1;
        const b = Math.sin(Math.PI * e) * bow + twitch * (1 - e);
        return [sx + dx * e - (dy / len) * b, sy + dy * e + (dx / len) * b];
      };
      const [x2, y2] = at01(u);
      const [x1, y1] = at01(Math.max(0, u - streak * (0.6 + hash(seed + 6))));
      const c = u < 0.6 ? mix(colors[0], colors[1], u / 0.6) : mix(colors[1], colors[2], (u - 0.6) / 0.4);
      // in from nothing, gone into the glow over the last stretch
      const fade = Math.min(1, u / 0.15) * Math.min(1, (1 - u) / 0.22);
      const flick = flicker ? 1 - flicker * hash(seed * 0.37 + frame * 1.91) : 1;
      dots.push({ x1, y1, x2, y2, c, o: fade * flick, w: (w0 + (w1 - w0) * ease(u)) * (0.7 + hash(seed + 7) * 0.6) });
    }
  }
  const glowId = `gather-glow-${uid}`;
  const haloId = `gather-halo-${uid}`;
  const env = envelopeAt(m, 'rms', t);
  const orbR = orb ? orb.radius * grown * (0.75 + 0.35 * env + 0.3 * Math.min(1, kickHit)) * motion.scale : 0;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        {glowFilter(glowId, 1.2)}
        <filter id={haloId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={glowSize} />
        </filter>
        {orb && (
          <radialGradient id={`${uid}-orb`}>
            <stop offset="0" stopColor={orb.core ?? '#ffffff'} stopOpacity={1} />
            <stop offset="0.25" stopColor={orb.core ?? '#ffffff'} stopOpacity={0.9} />
            <stop offset="0.55" stopColor={orb.color} stopOpacity={0.45} />
            <stop offset="1" stopColor={orb.color} stopOpacity={0} />
          </radialGradient>
        )}
      </defs>
      {orb && <circle cx={ex} cy={ey} r={orbR} fill={`url(#${uid}-orb)`} />}
      {/* the glow under each mote, then its bright core */}
      <g filter={`url(#${haloId})`}>
        {dots.map((d, i) => (
          <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={glow ?? d.c} strokeWidth={d.w * glowWidth} strokeLinecap="round" opacity={d.o * 0.85} />
        ))}
      </g>
      <g filter={`url(#${glowId})`}>
        {dots.map((d, i) => (
          <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={d.c} strokeWidth={d.w} strokeLinecap="round" opacity={d.o} />
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

// ---------- arc ----------

/** A smooth path through the points (Catmull-Rom as cubic Béziers). */
const smoothPath = (pts: Point[]) => {
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)]];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

const ArcContent: React.FC<ArcProps> = ({
  height = 220,
  rest = 10,
  points = 72,
  color = '#3d9bff',
  glow = '#e8f6ff',
  fill = '#2f7bff',
  body = 0.4,
  echoes = [5, 10],
  ribbon,
  across,
  bassAt = 'center',
  crackle = 12,
  strands = 2,
  crackleColor = '#7cc8ff',
  spectrum,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = useCurrentFrame();
  const m = useManifest();
  const t = useSongTime();
  const kick = Math.min(1, useHit('kick', 7));
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const opts = { smoothing: 0.8, gain: 10, noiseFloor: 0.05, ...spectrum };
  // bass in the middle, or folded the other way so it rises at both edges
  const fold = (vals: number[]) => {
    const m = mirrored(vals, points);
    return bassAt === 'edges' ? [...m.slice(Math.floor(points / 2)), ...m.slice(0, Math.floor(points / 2))] : m;
  };
  const now = fold(useSpectrum(32, opts));
  const e1 = fold(useSpectrum(32, opts, echoes[0]));
  const e2 = fold(useSpectrum(32, opts, echoes[1]));
  const strandsBelow = Array.from({ length: ribbon?.lines ?? 0 }, (_, k) =>
    // the same number of lines on every frame, so the hooks stay in order
    // eslint-disable-next-line react-hooks/rules-of-hooks
    fold(useSpectrum(32, opts, (k + 1) * (ribbon?.delay ?? 3))),
  );
  // eased into the ceiling: loud bands round off instead of flattening against it
  const line = (vals: number[]): Point[] => vals.map((v, i) => [(i / (points - 1)) * W, H - rest - height * Math.tanh(v * 1.3)]);
  const main = line(now);
  const d = smoothPath(main);
  const charge = crackle * (0.25 + envelopeAt(m, 'high', t) * 0.9 + kick * 0.8);
  // the lightning: the line sampled finely, each point thrown up or down, redrawn every 2 frames
  const steps = 150;
  const yAt = (x: number) => {
    const f = (x / W) * (points - 1);
    const i = Math.min(points - 2, Math.floor(f));
    return main[i][1] + (main[i + 1][1] - main[i][1]) * (f - i);
  };
  const bolts = Array.from({ length: strands }, (_, k) => {
    const tick = Math.floor(frame / 2);
    const pts: Point[] = Array.from({ length: steps + 1 }, (_, j) => {
      const x = (j / steps) * W;
      const lift = (H - yAt(x)) / (height + rest);
      return [x, yAt(x) + (hash(j * 3.7 + tick * 11.3 + k * 97) - 0.5) * 2 * charge * (0.35 + 0.65 * lift)];
    });
    return { d: `M ${pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')}`, o: 0.45 + 0.55 * hash(tick * 1.7 + k * 5.1) };
  });
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fill} stopOpacity={0.1} />
          <stop offset="1" stopColor={fill} stopOpacity={body} />
        </linearGradient>
        <filter id={`${uid}-soft`} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
        {glowFilter(`${uid}-crackle`, 2)}
      </defs>
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${uid}-body)`} />
      {across && (
        <defs>
          <linearGradient id={`${uid}-across`} x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={across[0]} />
            <stop offset="0.5" stopColor={across[1]} />
            <stop offset="1" stopColor={across[0]} />
          </linearGradient>
        </defs>
      )}
      {strandsBelow.map((vals, k) => {
        const flat = 1 - 0.1 * (k + 1);
        const pts: Point[] = vals.map((v, i) => [
          (i / (points - 1)) * W,
          H - rest - height * flat * Math.tanh(v * 1.3) + (k + 1) * (ribbon?.gap ?? 7),
        ]);
        return (
          <path
            key={`r${k}`}
            d={smoothPath(pts)}
            fill="none"
            stroke={across ? `url(#${uid}-across)` : color}
            strokeWidth={1.4}
            opacity={0.55 * (1 - (k + 1) / ((ribbon?.lines ?? 0) + 1.5))}
          />
        );
      })}
      <path d={smoothPath(line(e2))} fill="none" stroke={color} strokeWidth={1.5} opacity={0.22} />
      <path d={smoothPath(line(e1))} fill="none" stroke={color} strokeWidth={2} opacity={0.38} />
      <path d={d} fill="none" stroke={glow} strokeWidth={14} opacity={0.9} filter={`url(#${uid}-soft)`} />
      <path d={d} fill="none" stroke={across ? `url(#${uid}-across)` : color} strokeWidth={3.2} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#ffffff" strokeWidth={1} strokeLinecap="round" opacity={0.8} />
      <g filter={`url(#${uid}-crackle)`}>
        {bolts.map((b, k) => (
          <path key={k} d={b.d} fill="none" stroke={crackleColor} strokeWidth={1.3} strokeLinejoin="round" opacity={b.o} />
        ))}
      </g>
    </svg>
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

// ---------- eclipse ----------

/** Coverage at song time t on a [time, 0..1] path, eased between keys and held past the ends. */
const pathAt = (path: [number, number][], t: number) => {
  if (!path.length) return 0;
  if (t <= path[0][0]) return path[0][1];
  for (let i = 1; i < path.length; i++) {
    const [t1, v1] = path[i];
    const [t0, v0] = path[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * smooth01((t - t0) / Math.max(1e-6, t1 - t0));
  }
  return path[path.length - 1][1];
};

/** Area shared by two circles (radii r1, r2, centres d apart). */
const lensArea = (r1: number, r2: number, d: number) => {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const c = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return a + b - c;
};

const EclipseContent: React.FC<EclipseProps & { motion: CoverMotion }> = ({
  at,
  radius,
  sun = {},
  moon,
  corona = {},
  ring,
  diamond = [],
  punch = 0,
  smear = 0,
  motion,
}) => {
  const t = useSongTime();
  const kick = Math.min(1, useHit('kick', 7));
  const { pulse } = useBeat(5);
  const { width: W, height: H } = useVideoConfig();
  const id = `eclipse-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const n = corona.streamers ?? 90;
  const values = mirrored(useSpectrum(32, { smoothing: 0.7, gain: 12, ...corona.spectrum }), n);
  const ringTicks = ring?.ticks ?? 120;
  const ringValues = mirrored(useSpectrum(48, { smoothing: 0.5, gain: 13, ...corona.spectrum }), ringTicks);

  const s = motion.scale * (1 + punch * kick);
  const [cx, cy] = coverPoint(motion, at);
  const R = radius * s;
  // the moon: from the picture's place to the sun's centre, growing just past the sun's size
  const p = pathAt(moon.path, t);
  const mr = (moon.radius + (radius * (moon.cover ?? 1.03) - moon.radius) * p) * s;
  const via = moon.via ?? [moon.offset[0] / 2, moon.offset[1] / 2];
  const mx = cx + ((1 - p) * (1 - p) * moon.offset[0] + 2 * (1 - p) * p * via[0]) * s;
  const my = cy + ((1 - p) * (1 - p) * moon.offset[1] + 2 * (1 - p) * p * via[1]) * s;
  // how much of the sun still shows (1 = all of it, 0 = totality)
  const shown = 1 - lensArea(R, mr, Math.hypot(mx - cx, my - cy)) / (Math.PI * R * R);
  const dark = 1 - Math.min(1, shown / Math.max(0.05, 1 - lensArea(radius, moon.radius, Math.hypot(...moon.offset)) / (Math.PI * radius * radius)));

  const sunColor = sun.color ?? '#fffaf0';
  const glow = sun.glow ?? '#f4ecff';
  const glowSize = (sun.glowSize ?? 90) * s;
  const cColor = corona.color ?? '#eef0ff';
  const [c0, c1] = corona.strength ?? [0.25, 1];
  const cOpacity = c0 + (c1 - c0) * dark;
  const length = (corona.length ?? 260) * s;
  const spin = corona.spin ?? 1.5;
  const reach = 1 + (corona.kick ?? 0.6) * kick;
  const streamers = values.map((v, i) => {
    const jitter = hash(i * 7.31);
    const a = ((i / n) * 360 + t * spin + jitter * 6) * (Math.PI / 180);
    // longer as the sun hides: at totality the corona is the light
    const len = (0.25 + 0.75 * hash(i * 3.17)) * length * (0.35 + v) * reach * (0.6 + 0.6 * dark);
    const w = (corona.width ?? 10) * s * (0.6 + 0.8 * hash(i * 1.91));
    const bend = (hash(i * 5.3) - 0.5) * 0.25;
    const r0 = R * 0.96;
    const r1 = R + len;
    const pt = (r: number, da: number): Point => [cx + Math.cos(a + da) * r, cy + Math.sin(a + da) * r];
    // a tapered petal: wide at the limb, a fine point at the tip, bowed a little
    const half = w / (2 * r0);
    const [ax, ay] = pt(r0, -half);
    const [bx, by] = pt(r0, half);
    const [qx, qy] = pt((r0 + r1) / 2, bend * 0.3);
    const [tx, ty] = pt(r1, bend * 0.6);
    return { d: `M${ax},${ay} Q${qx},${qy} ${tx},${ty} Q${qx},${qy} ${bx},${by} Z`, v };
  });

  const [r0s, r1s] = ring?.strength ?? [0.2, 1];
  const ringOpacity = (r0s + (r1s - r0s) * dark) * (0.6 + 0.4 * pulse);
  const ticks = ring
    ? ringValues.map((v, i) => {
        const a = (i / ringTicks) * Math.PI * 2;
        const l = (3 + v * (ring.length ?? 46) * (1 + kick)) * s;
        return { x0: mx + Math.cos(a) * (mr + 2 * s), y0: my + Math.sin(a) * (mr + 2 * s), x1: mx + Math.cos(a) * (mr + 2 * s + l), y1: my + Math.sin(a) * (mr + 2 * s + l), v };
      })
    : [];

  // diamond-ring flashes: up fast, a slow fall
  const flashes = diamond
    .map(d => {
      const life = d.life ?? 2.2;
      const k = (t - d.at) / life;
      if (k < -0.08 || k > 1) return null;
      const e = k < 0 ? 1 + k / 0.08 : Math.pow(1 - k, 2);
      const a = ((d.angle ?? -40) * Math.PI) / 180;
      return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, e: Math.max(0, e), size: (d.size ?? 260) * s, color: d.color ?? '#ffffff', flash: d.flash ?? 0.35 };
    })
    .filter(Boolean) as { x: number; y: number; e: number; size: number; color: string; flash: number }[];

  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0%" stopColor={glow} stopOpacity={1} />
          <stop offset="55%" stopColor={glow} stopOpacity={0.25} />
          <stop offset="100%" stopColor={glow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-corona`}>
          <stop offset={`${(R / (R + length * 1.4)) * 100}%`} stopColor={cColor} stopOpacity={0.55} />
          <stop offset="100%" stopColor={cColor} stopOpacity={0} />
        </radialGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={(corona.blur ?? 7) * s} />
        </filter>
        <filter id={`${id}-edge`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={1.6 * s} />
        </filter>
        {glowFilter(`${id}-glow`, 4 * s)}
        <filter id={`${id}-smear`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
      </defs>
      {/* on the kick: blurred copies of the sun's light thrown outward (the horns' zoom smear) */}
      {smear > 0 &&
        kick > 0.05 &&
        [3, 2, 1].map(k => {
          const f = 1 + smear * kick * 0.09 * k;
          return (
            <g key={`smear-${k}`} transform={`translate(${cx} ${cy}) scale(${f}) translate(${-cx} ${-cy})`} opacity={(0.45 * kick) / k} filter={`url(#${id}-smear)`} style={{ mixBlendMode: 'screen' }}>
              <circle cx={cx} cy={cy} r={R} fill={shown > 0.02 ? sunColor : 'none'} stroke={cColor} strokeWidth={8 * s} />
              <circle cx={mx} cy={my} r={mr} fill={moon.color ?? '#060608'} />
            </g>
          );
        })}
      {/* the corona: a soft glow and the streamers, brighter as the sun hides */}
      <g opacity={cOpacity} style={{ mixBlendMode: 'screen' }}>
        <circle cx={cx} cy={cy} r={R + length * 1.4} fill={`url(#${id}-corona)`} opacity={0.5 + 0.3 * kick} />
        <g filter={`url(#${id}-soft)`}>
          {streamers.map((st, i) => (
            <path key={i} d={st.d} fill={cColor} opacity={0.25 + 0.75 * st.v} />
          ))}
        </g>
      </g>
      {/* the sun's light round its visible part */}
      <circle cx={cx} cy={cy} r={R + glowSize} fill={`url(#${id}-halo)`} opacity={Math.min(1, shown * 1.6) * (0.55 + 0.15 * kick)} style={{ mixBlendMode: 'screen' }} />
      <circle cx={cx} cy={cy} r={R} fill={sunColor} filter={`url(#${id}-edge)`} />
      {/* the moon over it, the inner corona hugging its edge as the sun goes */}
      <circle cx={mx} cy={my} r={mr} fill={moon.color ?? '#060608'} filter={`url(#${id}-edge)`} />
      <circle
        cx={mx}
        cy={my}
        r={mr + 5 * s}
        fill="none"
        stroke={cColor}
        strokeWidth={(10 + 8 * kick) * s}
        opacity={dark * (0.75 + 0.25 * pulse)}
        filter={`url(#${id}-soft)`}
        style={{ mixBlendMode: 'screen' }}
      />
      {ring && (
        <g filter={`url(#${id}-glow)`} opacity={ringOpacity}>
          <circle cx={mx} cy={my} r={mr + 1.5 * s} fill="none" stroke={ring.color ?? cColor} strokeWidth={1.5 * s} />
          {ticks.map((b, i) => (
            <line key={i} x1={b.x0} y1={b.y0} x2={b.x1} y2={b.y1} stroke={ring.color ?? cColor} strokeWidth={(ring.width ?? 2.2) * s} strokeLinecap="round" opacity={0.35 + 0.65 * b.v} />
          ))}
        </g>
      )}
      {flashes.map((f, i) => (
        <g key={i} style={{ mixBlendMode: 'screen' }}>
          {/* the flash blooms out of the point rather than greying the frame */}
          <circle cx={f.x} cy={f.y} r={W * 0.8} fill={`url(#${id}-halo)`} opacity={f.e * f.flash} />
          <circle cx={f.x} cy={f.y} r={f.size * 0.9} fill={`url(#${id}-halo)`} opacity={f.e} />
          <g filter={`url(#${id}-glow)`} opacity={f.e}>
            {[0, 45, 90, 135].map(deg => {
              const a = (deg * Math.PI) / 180;
              const l = f.size * (deg % 90 ? 0.55 : 1.4) * (0.7 + 0.3 * f.e);
              return <line key={deg} x1={f.x - Math.cos(a) * l} y1={f.y - Math.sin(a) * l} x2={f.x + Math.cos(a) * l} y2={f.y + Math.sin(a) * l} stroke={f.color} strokeWidth={(deg % 90 ? 1.5 : 3) * s} strokeLinecap="round" />;
            })}
            <circle cx={f.x} cy={f.y} r={14 * s * (0.6 + 0.4 * f.e)} fill={f.color} />
          </g>
        </g>
      ))}
    </svg>
  );
};

const needsSpectrum = (kind: VisualizerProps['kind']) =>
  kind === 'halo' || kind === 'horns' || kind === 'yantra' || kind === 'flames' || kind === 'arc' || kind === 'eclipse';

export const Visualizer: React.FC<VisualizerProps & { audio: { src: string; start: number } }> = ({ audio, cover, opacity = 1, mixBlendMode, when, ...props }) => {
  const { motion, blur } = useCover(cover);
  const t = useSongTime();
  const shown = when ? Math.max(0, ...when.map(([a, b]) => Math.min(1, (t - a) / 0.5 + 1, (b - t) / 0.5 + 1))) : 1;
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
      case 'gather':
        return <Gather {...props} motion={motion} />;
      case 'rings':
        return <Rings {...props} motion={motion} />;
      case 'bolt':
        return <Bolt {...props} motion={motion} />;
      case 'flames':
        return <FlamesContent {...props} />;
      case 'arc':
        return <ArcContent {...props} />;
      case 'eclipse':
        return <EclipseContent {...props} motion={motion} />;
    }
  })();
  return (
    <AbsoluteFill style={{ opacity: opacity * shown, mixBlendMode, filter: motionBlurCss(blurId, blur) || undefined }}>
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
