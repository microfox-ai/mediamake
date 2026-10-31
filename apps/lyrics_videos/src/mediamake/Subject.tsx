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
import { MotionBlur, motionBlurCss, useCoverMotion, type CoverBackdropProps } from './CoverBackdrop';
import { exposureCss, gradeCss, hash, hasPictureFilter, HeatFilter, PictureFilter, type PictureLook } from './PictureLook';

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
  tremor?: { keys: [number, number][]; frequency?: number };
  /**
   * From `from` on, ki crackling round the silhouette: a jagged line a little outside her edge that
   * redraws every couple of frames, with a glow, flickering and flaring on the kicks.
   */
  aura?: { from: number; color: string; glow?: string; width?: number; jag?: number; strength?: number };
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

/** The tremor's offset at song time t: smoothed random steps at `frequency`, scaled by the keys. */
const tremorAt = (tremor: NonNullable<SubjectProps['tremor']>, t: number): [number, number] => {
  const a = keyed(tremor.keys, t);
  const phase = t * (tremor.frequency ?? 14);
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
  const src = asset(manifest.assets[image] ?? image);

  const { motion: m, blur: camBlur, defocus } = useCoverMotion(cover);
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
      {echoes}
      <div style={frame}>
        <Img src={src} style={{ ...fill, filter: filter || undefined }} />
      </div>
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
    </AbsoluteFill>
  );
};
