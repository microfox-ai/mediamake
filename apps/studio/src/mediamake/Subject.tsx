/**
 * The subject cut out of the cover (a segmentation: an RGBA picture the size of the cover's, e.g.
 * from BiRefNet), drawn over the waves and visualizers so they sit behind her. Under it the cover
 * shows the picture with her painted out (a clean plate), so the two layers can move apart. She gets
 * her own life: more kick and zoom than the background (depth), her own grade and exposure, a rim of
 * light round the silhouette, echoes of the silhouette thrown out on the hits, a sheen sweeping
 * across her on the downbeats, a glowing outline.
 */
import React, { useId } from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import type { Manifest } from '../kit/manifest';
import { asset, useBeat, useHit, useSongTime } from '../kit/hooks';
import { MotionBlur, motionBlurCss, useCoverMotion, useDance, type CoverBackdropProps } from './CoverBackdrop';
import { exposureCss, gradeCss, hash, hasPictureFilter, HeatFilter, PictureFilter, type PictureLook } from './PictureLook';
import { flowMap, StageSlices, useStageState } from './Stages';

type Hits = 'kick' | 'snare' | 'beat' | 'downbeat';

export type SubjectProps = {
  /** The cutout: a manifest asset name ("cutout/subject.png"), a manifest path or a URL. */
  image: string;
  /** How much more she zooms and kicks than the background, 0..1 (0.3 = 30 % more): parallax. */
  depth?: number;
  /** Her own grade, exposure and picture filters (duotone, curves, bloom…): the cover's look styles the background only. */
  look?: Pick<PictureLook, 'grade' | 'exposure' | 'duotone' | 'curves' | 'posterize' | 'chroma' | 'chromaKick' | 'sharpen' | 'bloom' | 'bloomPulse' | 'heat'>;
  /**
   * A colour laid over her only, e.g. the world's light in soft-light, so a cutout in its own colours
   * sits in a graded scene.
   */
  wash?: { color: string; blend?: React.CSSProperties['mixBlendMode']; opacity: number };
  /** Film grain over her only (moving every frame), matching the background's. */
  grain?: number;
  /** A glow round the silhouette (behind her edges), `pulse` more of it on the beat. */
  rim?: { color: string; size?: number; strength?: number; pulse?: number };
  /** Copies of the silhouette in a colour, thrown out from `center` on each hit and fading. */
  echo?: {
    color: string;
    on?: Hits;
    /** Weakest onset that throws one, 0..1. */
    threshold?: number;
    /** Seconds an echo lives, and how much it grows in that time (0.15 = 15 % bigger). */
    life?: number;
    grow?: number;
    strength?: number;
    blend?: React.CSSProperties['mixBlendMode'];
  };
  /**
   * A band of light sweeping across her after each hit. 'color-dodge' with a mid colour catches
   * her highlights like satin and leaves the darks; 'screen' lays light over everything.
   */
  sweep?: {
    color?: string;
    strength: number;
    on?: Hits;
    duration?: number;
    width?: number;
    angle?: number;
    blend?: React.CSSProperties['mixBlendMode'];
  };
  /** A thin line round the silhouette with a glow, `pulse` brighter on the beat. */
  outline?: { color: string; width?: number; glow?: number; strength?: number; pulse?: number };
  /** How much of the camera's motion blur she takes, 0..1 (keep her crisp on the hits). Default 1. */
  blur?: number;
  /** Where the echoes grow from: a point of the unmoved picture, frame px. Default the frame centre. */
  center?: [number, number];
  /**
   * She trembles like she's powering up: a small fast jitter (`frequency` changes a second), its
   * amplitude in px read off [song second, px] keys, so it can rise through the song.
   */
  tremor?: { keys: [number, number][]; frequency?: number | [number, number][] };
  /**
   * From `from` on, ki crackling round the silhouette: a jagged line a little outside her edge that
   * redraws every couple of frames, with a glow, flickering and flaring on the kicks.
   */
  aura?: { from: number; color: string; glow?: string; width?: number; jag?: number; strength?: number };
  /**
   * Whether she takes the cover's liquid warp (dance.liquid) or only its bounce and sway. Default
   * true. Cadence, 2026-10-31: the warp chewed her hair edges into jagged strands with dark halos
   * ("some quality loss … making it look weak"), so she stays crisp while the world ripples.
   */
  liquid?: boolean;
  /**
   * A light flaring at a point of her (an eye, a jewel) on the peak hits: a glow and a fine four-point
   * star that bloom on each onset of `on` at or above `threshold` (at least `minGap` s apart) and fade
   * over `life` s. Cadence, 2026-10-31: "make her eye shine red, at peak beats".
   */
  flare?: { at: [number, number]; color: string; size?: number; on?: Hits; threshold?: number; minGap?: number; life?: number };
  /**
   * One cutout per picture of the cover's `stages`, in the same order: she changes with the world
   * and breaks into the same glitch bands. `image` is then unused.
   */
  stages?: string[];
  /**
   * A fire aura behind her, like a Super Saiyan's: rising upright noise (`size` px across, `stretch`
   * times taller, rising `rise` px/s, morphing every `morph` s) times a falloff round the silhouette
   * (`masks`, one per stage of the cover's `stages` or null; white, alpha = how far the fire reaches),
   * cut into two crisp bands (`color` outside, `core` inside) with a little glow, flickering and
   * swelling on the kicks, inside the `when` windows. Goten Theme, 2026-11-02: "use a good golden fire effect that
   * suits him in the bg".
   */
  fireAura?: {
    masks: (string | null)[];
    when?: [number, number][];
    color?: string;
    core?: string;
    size?: number;
    /** How much taller than wide the noise is: upright tongues. Default 2.6. */
    stretch?: number;
    rise?: number;
    morph?: number;
    /** px of soft light round the flames. Default 5. */
    glow?: number;
    strength?: number;
    kick?: number;
    blend?: React.CSSProperties['mixBlendMode'];
  };
  /** The cover's settings (lookVideo passes them), so she moves with the picture. */
  cover?: CoverBackdropProps;
};

const hexA = (c: string, a: number) => {
  if (!c.startsWith('#')) return c;
  const h = c.slice(1);
  const n = parseInt(h.length === 3 ? [...h].map(x => x + x).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};

/** Linear between [t, value] keys, held past the ends. */
const keyed = (keys: [number, number][], t: number) => {
  if (!keys.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / Math.max(1e-6, t1 - t0);
  }
  return keys[keys.length - 1][1];
};

/** The phase (cycles) at t of a frequency keyed by song second: the integral of the keyed curve. */
const phaseOf = (keys: [number, number][], t: number) => {
  let phase = 0;
  let [t0, f0] = keys[0];
  if (t <= t0) return t * f0;
  phase += t0 * f0;
  for (let i = 1; i < keys.length; i++) {
    const [t1, f1] = keys[i];
    if (t <= t1) {
      const f = f0 + ((f1 - f0) * (t - t0)) / Math.max(1e-6, t1 - t0);
      return phase + ((f0 + f) / 2) * (t - t0);
    }
    phase += ((f0 + f1) / 2) * (t1 - t0);
    [t0, f0] = [t1, f1];
  }
  return phase + f0 * (t - t0);
};

/** The tremor's offset at song time t: smoothed random steps at `frequency`, scaled by the keys. */
const tremorAt = (tremor: NonNullable<SubjectProps['tremor']>, t: number): [number, number] => {
  const a = keyed(tremor.keys, t);
  // (Fullmetal Gregorian, 2026-11-04: "vibrate at different frequencies and amplitudes based on the
  // sections of music" → the frequency can be keyed by song second too; the phase integrates it)
  const freq = tremor.frequency ?? 14;
  const phase = typeof freq === 'number' ? t * freq : phaseOf(freq, t);
  const i = Math.floor(phase);
  const f = phase - i;
  const e = f * f * (3 - 2 * f);
  const step = (k: number, seed: number) => hash(k * 1.37 + seed) * 2 - 1;
  return [
    a * (step(i, 0.1) + (step(i + 1, 0.1) - step(i, 0.1)) * e),
    a * (step(i, 7.3) + (step(i + 1, 7.3) - step(i, 7.3)) * e),
  ];
};

/** The hits of a kind as [time, strength], from the manifest's onsets or beat grid. */
export const hitsOf = (m: Manifest, on: Hits | string): [number, number][] => {
  if (on === 'beat') return m.beats.list.map(b => [b.t, 1]);
  if (on === 'downbeat') return (m.beats.downbeats ?? []).map(t => [t, 1]);
  return m.onsets?.[on] ?? [];
};

/** Hits in the last `life` seconds before t, newest last. */
const recent = (list: [number, number][], t: number, life: number, threshold = 0) => {
  const out: { age: number; s: number }[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const age = t - list[i][0];
    if (age < 0) continue;
    if (age >= life) break;
    if (list[i][1] >= threshold) out.unshift({ age, s: list[i][1] });
  }
  return out;
};

export const Subject: React.FC<SceneProps<SubjectProps>> = ({
  manifest,
  image,
  depth = 0,
  look,
  rim,
  echo,
  sweep,
  outline,
  wash,
  grain,
  blur: blurShare = 1,
  center,
  tremor,
  aura,
  liquid = true,
  flare,
  stages,
  fireAura,
  cover = {},
}) => {
  const t = useSongTime();
  const size = useVideoConfig();
  const { pulse } = useBeat(7);
  const kickHit = useHit('kick', 10);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const outlineId = `subject-outline-${uid}`;
  const grainId = `subject-grain-${uid}`;
  const frameNo = useCurrentFrame();
  const lookId = `subject-look-${uid}`;
  const blurId = `subject-blur-${uid}`;
  const heatId = `subject-heat-${uid}`;
  const stage = useStageState(manifest, stages && cover.stages);
  const stageSrcs = stages?.map(n => asset(manifest.assets[n] ?? n));
  const src = stageSrcs && stage ? stageSrcs[stage.i] : asset(manifest.assets[image] ?? image);

  const { motion: m, blur: camBlur, defocus } = useCoverMotion(cover);
  const dance = useDance(cover);
  // a share of the jolt's smear (she stays crisper than the world), but all of the lens's defocus
  const blur: [number, number] = [(camBlur[0] - defocus) * blurShare + defocus, (camBlur[1] - defocus) * blurShare + defocus];
  const heat = look?.heat && { ...look.heat, strength: look.heat.strength + defocus * 1.2 };
  const scale = 1 + (m.scale - 1) * (1 + depth);
  const [tx, ty] = tremor ? tremorAt(tremor, t) : [0, 0];
  const frame: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `scale(${scale}) translate(${m.dx * (1 + depth) + tx}px, ${m.dy * (1 + depth) + ty}px)`,
    transformOrigin: cover.origin,
  };
  const fill: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
  const mask: React.CSSProperties = {
    WebkitMaskImage: `url("${src}")`,
    maskImage: `url("${src}")`,
    WebkitMaskSize: 'cover',
    maskSize: 'cover',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  };
  const [cx, cy] = center ?? [size.width / 2, size.height / 2];

  const rimCss = rim
    ? (() => {
        const a = (rim.strength ?? 0.8) + (rim.pulse ?? 0) * pulse;
        const r = rim.size ?? 18;
        return `drop-shadow(0 0 ${r}px ${hexA(rim.color, a)}) drop-shadow(0 0 ${r * 2.5}px ${hexA(rim.color, a * 0.6)})`;
      })()
    : '';
  const filter = [
    gradeCss(look),
    exposureCss(look, kickHit, pulse),
    hasPictureFilter(look) && `url(#${lookId})`,
    look?.heat && `url(#${heatId})`,
    rimCss,
    motionBlurCss(blurId, blur),
  ]
    .filter(Boolean)
    .join(' ');

  const echoes = echo
    ? recent(hitsOf(manifest, echo.on ?? 'snare'), t, echo.life ?? 0.6, echo.threshold ?? 0.5).map(({ age, s }, i) => {
        const k = age / (echo.life ?? 0.6);
        const grow = 1 + (echo.grow ?? 0.12) * (1 - (1 - k) * (1 - k));
        return (
          <div
            key={`echo-${i}`}
            style={{
              ...frame,
              ...mask,
              background: echo.color,
              mixBlendMode: echo.blend,
              opacity: (echo.strength ?? 0.7) * Math.min(1, s) * (1 - k) * (1 - k),
              // grow about `center` (the transform's own coordinates start at the cover's origin)
              transform: `${frame.transform} translate(${cx - m.ox}px, ${cy - m.oy}px) scale(${grow}) translate(${m.ox - cx}px, ${m.oy - cy}px)`,
            }}
          />
        );
      })
    : null;

  const sweepEl = (() => {
    if (!sweep) return null;
    const dur = sweep.duration ?? 0.9;
    const last = recent(hitsOf(manifest, sweep.on ?? 'downbeat'), t, dur).pop();
    if (!last) return null;
    const k = last.age / dur;
    const x = -30 + k * 160; // % across the frame
    const w = sweep.width ?? 14;
    const c = sweep.color ?? '#fff3ea';
    return (
      <div
        style={{
          ...frame,
          ...mask,
          mixBlendMode: sweep.blend ?? 'screen',
          opacity: sweep.strength * Math.sin(Math.PI * k),
          background: `linear-gradient(${sweep.angle ?? 105}deg, transparent ${x - w}%, ${hexA(c, 0.9)} ${x}%, transparent ${x + w}%)`,
        }}
      />
    );
  })();

  const auraId = `subject-aura-${uid}`;
  const auraOn = aura ? Math.min(1, Math.max(0, (t - aura.from) / 0.6)) : 0;
  const auraEl =
    aura && auraOn > 0 ? (
      <>
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={auraId} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
              <feMorphology in="SourceAlpha" operator="dilate" radius={aura.width ?? 6} result="grown" />
              <feMorphology in="SourceAlpha" operator="dilate" radius={Math.max(1, (aura.width ?? 6) - 2)} result="inner" />
              <feComposite in="grown" in2="inner" operator="out" result="ring" />
              <feTurbulence type="turbulence" baseFrequency="0.035" numOctaves={2} seed={Math.floor(frameNo / 2)} result="noise" />
              <feDisplacementMap in="ring" in2="noise" scale={aura.jag ?? 14} xChannelSelector="R" yChannelSelector="G" result="jagged" />
              <feFlood floodColor={aura.color} result="ink" />
              <feComposite in="ink" in2="jagged" operator="in" result="line" />
              <feFlood floodColor={aura.glow ?? aura.color} result="glowInk" />
              <feComposite in="glowInk" in2="jagged" operator="in" result="glowLine" />
              <feGaussianBlur in="glowLine" stdDeviation={7} result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="line" />
              </feMerge>
            </filter>
          </defs>
        </svg>
        <div
          style={{
            ...frame,
            opacity: auraOn * Math.min(1, (aura.strength ?? 0.85) * (0.7 + 0.3 * hash(Math.floor(frameNo / 2) * 1.9)) + 0.25 * kickHit),
          }}
        >
          <Img src={src} style={{ ...fill, filter: `url(#${auraId})` }} />
        </div>
      </>
    ) : null;

  // the flare: the last peak hit's glow and star, on her (inside her frame, so it moves with her)
  const flareEl = (() => {
    if (!flare) return null;
    const life = flare.life ?? 0.6;
    const peaks: number[] = [];
    for (const [ht, s] of hitsOf(manifest, flare.on ?? 'kick'))
      if (s >= (flare.threshold ?? 0.97) && (!peaks.length || ht - peaks[peaks.length - 1] >= (flare.minGap ?? 1))) peaks.push(ht);
    let i = peaks.length - 1;
    while (i >= 0 && peaks[i] > t) i--;
    const age = i >= 0 ? t - peaks[i] : Infinity;
    if (age > life) return null;
    const e = Math.min(1, age / 0.04) * Math.pow(1 - age / life, 1.6);
    const [fx, fy] = flare.at;
    const r = (flare.size ?? 60) * (0.7 + 0.3 * e);
    const fid = `subject-flare-${uid}`;
    return (
      <div style={{ ...frame, mixBlendMode: 'screen', pointerEvents: 'none' }}>
        <svg width={size.width} height={size.height} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <radialGradient id={fid}>
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
              <stop offset="18%" stopColor={flare.color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={flare.color} stopOpacity={0} />
            </radialGradient>
            {/* the streaks fade out towards their tips (a hard line read as a laser) */}
            <linearGradient id={`${fid}-h`} gradientUnits="userSpaceOnUse" x1={fx - r * 1.9} y1={fy} x2={fx + r * 1.9} y2={fy}>
              <stop offset="0" stopColor={flare.color} stopOpacity={0} />
              <stop offset="0.5" stopColor="#ffd9d0" stopOpacity={0.9} />
              <stop offset="1" stopColor={flare.color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${fid}-v`} gradientUnits="userSpaceOnUse" x1={fx} y1={fy - r * 0.9} x2={fx} y2={fy + r * 0.9}>
              <stop offset="0" stopColor={flare.color} stopOpacity={0} />
              <stop offset="0.5" stopColor="#ffd9d0" stopOpacity={0.6} />
              <stop offset="1" stopColor={flare.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <g opacity={e}>
            <circle cx={fx} cy={fy} r={r} fill={`url(#${fid})`} />
            <line x1={fx - r * 1.9} y1={fy} x2={fx + r * 1.9} y2={fy} stroke={`url(#${fid}-h)`} strokeWidth={1.6} strokeLinecap="round" />
            <line x1={fx} y1={fy - r * 0.9} x2={fx} y2={fy + r * 0.9} stroke={`url(#${fid}-v)`} strokeWidth={1.1} strokeLinecap="round" />
            <circle cx={fx} cy={fy} r={3.2} fill="#fff4f0" />
          </g>
        </svg>
      </div>
    );
  })();

  // the fire aura: its shape for the stage showing, warped into rising tongues, behind her
  const fireAuraEl = (() => {
    if (!fireAura) return null;
    const mask = fireAura.masks[stage?.i ?? 0];
    const shown = fireAura.when
      ? Math.max(0, ...fireAura.when.map(([a, b]) => Math.min(1, (t - a) / 0.4 + 1, (b - t) / 0.4 + 1)))
      : 1;
    if (!mask || shown <= 0) return null;
    const src = asset(manifest.assets[mask] ?? mask);
    const W = size.width;
    const H = size.height;
    const region = { x: -W * 0.15, y: -H * 0.35, width: W * 1.3, height: H * 1.5 };
    const cells = W / (fireAura.size ?? 70);
    const phase = t / (fireAura.morph ?? 0.7);
    const k = Math.floor(phase);
    const f = phase - k;
    const ca = Math.cos((f * Math.PI) / 2);
    const cb = Math.sin((f * Math.PI) / 2);
    // the noise tile stretched tall (upright tongues), scrolling up through the region
    const tileH = region.height * (fireAura.stretch ?? 2.6);
    const off = (t * (fireAura.rise ?? 260)) % tileH;
    const id = `subject-fire-${uid}`;
    const tile = (seed: number, name: string) => (
      <>
        <feImage href={flowMap(seed, cells)} x={region.x} y={region.y - off} width={region.width} height={tileH} preserveAspectRatio="none" result={`${name}1`} />
        <feImage href={flowMap(seed, cells)} x={region.x} y={region.y - off + tileH} width={region.width} height={tileH} preserveAspectRatio="none" result={`${name}2`} />
        <feMerge result={name}>
          <feMergeNode in={`${name}1`} />
          <feMergeNode in={`${name}2`} />
        </feMerge>
      </>
    );
    const flicker = 0.88 + 0.12 * hash(Math.floor(frameNo / 2) * 2.3 + 0.7);
    return (
      <>
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={id} filterUnits="userSpaceOnUse" {...region} colorInterpolationFilters="sRGB">
              {tile(k + 11, 'a')}
              {tile(k + 12, 'b')}
              <feComposite in="a" in2="b" operator="arithmetic" k1={0} k2={ca} k3={cb} k4={0.5 * (1 - ca - cb)} result="noise" />
              {/* fire as noise: the rising, upright noise (its red) times the aura's falloff round him,
                  cut at two levels, so tongues form, rise, break apart and die out away from him */}
              <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.25 0 0 0 -0.1" result="noiseA" />
              <feComposite in="noiseA" in2="SourceGraphic" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="tongues" />
              <feComponentTransfer in="tongues" result="shape">
                <feFuncA type="linear" slope={6} intercept={-1.5} />
              </feComponentTransfer>
              <feFlood floodColor={fireAura.color ?? '#ffa800'} result="ink" />
              <feComposite in="ink" in2="shape" operator="in" result="flame" />
              <feGaussianBlur in="flame" stdDeviation={fireAura.glow ?? 5} result="glow" />
              <feComponentTransfer in="tongues" result="inner">
                <feFuncA type="linear" slope={6} intercept={-3.3} />
              </feComponentTransfer>
              <feFlood floodColor={fireAura.core ?? '#fff3bf'} result="coreInk" />
              <feComposite in="coreInk" in2="inner" operator="in" result="core" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="flame" />
                <feMergeNode in="core" />
              </feMerge>
            </filter>
          </defs>
        </svg>
        <div
          style={{
            ...frame,
            mixBlendMode: fireAura.blend,
            opacity: Math.min(1, shown * ((fireAura.strength ?? 0.9) * flicker + (fireAura.kick ?? 0.3) * Math.min(1, kickHit))),
          }}
        >
          <Img src={src} style={{ ...fill, filter: `url(#${id})` }} />
        </div>
      </>
    );
  })();

  const outlineEl = outline ? (
    <>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id={outlineId} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius={outline.width ?? 3} result="grown" />
            <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
            <feFlood floodColor={outline.color} result="ink" />
            <feComposite in="ink" in2="ring" operator="in" result="line" />
            <feGaussianBlur in="line" stdDeviation={outline.glow ?? 8} result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="line" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div style={{ ...frame, opacity: Math.min(1, (outline.strength ?? 0.9) + (outline.pulse ?? 0) * pulse) }}>
        <Img src={src} style={{ ...fill, filter: `url(#${outlineId})` }} />
      </div>
    </>
  ) : null;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {look && hasPictureFilter(look) && <PictureFilter id={lookId} look={look} pulse={pulse} kick={kickHit} />}
      {heat && <HeatFilter id={heatId} heat={heat} t={t} width={size.width} height={size.height} />}
      <MotionBlur id={blurId} blur={blur} />
      {liquid && dance.node}
      {/* she dances with the poster: the same bounce, sway and liquid warp as the cover */}
      <div style={{ position: 'absolute', inset: 0, transform: dance.transform, transformOrigin: dance.origin, filter: (liquid && dance.filter) || undefined }}>
      {echoes}
      {fireAuraEl}
      {stageSrcs && stage ? (
        <StageSlices
          srcs={stageSrcs}
          state={stage}
          height={size.height}
          splitId={`subject-split-${uid}`}
          render={s => (
            <div style={frame}>
              <Img src={s} style={{ ...fill, filter: filter || undefined }} />
            </div>
          )}
        />
      ) : (
        <div style={frame}>
          <Img src={src} style={{ ...fill, filter: filter || undefined }} />
        </div>
      )}
      {wash && (
        <div style={{ ...frame, ...mask, background: wash.color, mixBlendMode: wash.blend ?? 'soft-light', opacity: wash.opacity }} />
      )}
      {grain ? (
        <div style={{ ...frame, ...mask, mixBlendMode: 'overlay', opacity: grain }}>
          <svg width={size.width} height={size.height} style={{ position: 'absolute', inset: 0 }}>
            <filter id={grainId}>
              <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={frameNo % 24} stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#${grainId})`} />
          </svg>
        </div>
      ) : null}
      {sweepEl}
      {outlineEl}
      {auraEl}
      {flareEl}
      </div>
    </AbsoluteFill>
  );
};
