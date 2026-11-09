/**
 * Pictures and looks: the exact-time video frame, the colour chapters (grades), and the SVG filters
 * the effects use (directional blur, edge glow, posterize, channel split, screentone).
 */
import React from 'react';
import { Freeze, OffthreadVideo, Sequence, useVideoConfig } from 'remotion';
import type { Energy, Grade } from './types';

/**
 * A video frame at an exact source time. Frozen on frame 0 with the time in `startFrom`, inside its
 * own Sequence, so ramps, holds and reverses are just different times (the remix engine's lesson:
 * <Freeze frame={t·fps}> gets clamped to the composition length in renders).
 */
export const Frame: React.FC<{ src: string; t: number; transparent?: boolean; style?: React.CSSProperties }> = ({ src, t, transparent, style }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence layout="none">
      <Freeze frame={0}>
        <OffthreadVideo
          src={src}
          startFrom={Math.max(0, t * fps)}
          muted
          transparent={transparent}
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }}
        />
      </Freeze>
    </Sequence>
  );
};

type Look = {
  /** CSS filter on the picture */
  filter: string;
  /** colour washes over the picture, in order */
  washes: { background: string; blend: React.CSSProperties['mixBlendMode']; opacity: number }[];
  /** bloom strength 0..1 (0 = none) */
  bloom: number;
  vignette: number;
};

export const LOOKS: Record<Grade, Look> = {
  teal: {
    filter: 'contrast(1.16) saturate(1.22) brightness(1.03)',
    washes: [
      { background: 'linear-gradient(160deg, #00d5ff 0%, #0a3a66 70%, #02101f 100%)', blend: 'soft-light', opacity: 0.55 },
      { background: '#00e1ff', blend: 'color', opacity: 0.12 },
    ],
    bloom: 0.32,
    vignette: 0.45,
  },
  ice: {
    filter: 'contrast(1.12) saturate(0.75) brightness(0.98)',
    washes: [{ background: 'linear-gradient(180deg, #e8f7ff, #5aaef0)', blend: 'soft-light', opacity: 0.5 }],
    bloom: 0.32,
    vignette: 0.4,
  },
  gold: {
    filter: 'sepia(0.35) saturate(1.45) contrast(1.18) brightness(0.98) hue-rotate(-6deg)',
    washes: [
      { background: 'radial-gradient(circle at 50% 35%, #fff2b0 0%, #ffb52e 45%, #6b2a00 100%)', blend: 'soft-light', opacity: 0.55 },
    ],
    bloom: 0.42,
    vignette: 0.5,
  },
  purple: {
    filter: 'contrast(1.22) saturate(1.35) brightness(1.02)',
    washes: [
      { background: 'linear-gradient(150deg, #e0b3ff 0%, #7b2cff 45%, #12002e 100%)', blend: 'soft-light', opacity: 0.75 },
      { background: '#8a2bff', blend: 'color', opacity: 0.35 },
    ],
    bloom: 0.65,
    vignette: 0.5,
  },
  red: {
    filter: 'grayscale(1) contrast(1.65) brightness(0.98)',
    washes: [{ background: '#ff1f2d', blend: 'multiply', opacity: 1 }],
    bloom: 0.35,
    vignette: 0.55,
  },
  mono: {
    filter: 'grayscale(1) contrast(1.35) brightness(1.05)',
    washes: [],
    bloom: 0.25,
    vignette: 0.55,
  },
  manga: {
    filter: 'grayscale(1) contrast(1.9) brightness(1.12) url(#amv-posterize)',
    washes: [
      // screentone: printed dots in the mid-tones
      { background: 'radial-gradient(circle, rgba(0,0,0,0.55) 26%, transparent 30%) 0 0 / 7px 7px', blend: 'multiply', opacity: 0.35 },
    ],
    bloom: 0,
    vignette: 0.35,
  },
  void: {
    filter: 'brightness(1.16) contrast(0.95) saturate(0.4)',
    washes: [{ background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #dff4ff 60%, #9fc7e6 100%)', blend: 'screen', opacity: 0.45 }],
    bloom: 0.6,
    vignette: 0.15,
  },
  night: {
    filter: 'contrast(1.2) saturate(1.15) brightness(0.92)',
    washes: [{ background: 'linear-gradient(180deg, #1b4dff 0%, #020a2b 100%)', blend: 'soft-light', opacity: 0.6 }],
    bloom: 0.4,
    vignette: 0.6,
  },
  warm: {
    filter: 'saturate(1.25) contrast(1.1) sepia(0.12) brightness(1.03)',
    washes: [{ background: 'linear-gradient(180deg, #ffb066 0%, #5a1d00 100%)', blend: 'soft-light', opacity: 0.45 }],
    bloom: 0.45,
    vignette: 0.45,
  },
  // the flowing edit: the anime's own colour with punch (UnClonable's CC), light from the effects
  clean: { filter: 'contrast(1.12) saturate(1.25)', washes: [], bloom: 0.22, vignette: 0.35 },
  none: { filter: 'none', washes: [], bloom: 0, vignette: 0 },
};

/**
 * A grade's colour correction for the GPU passes (contrast, saturation, brightness), so a shot looks
 * the same inside a liquid morph or an aura as it does on its own. The washes stay CSS-only.
 */
export const CC: Record<Grade, [number, number, number]> = {
  teal: [1.16, 1.22, 1.03],
  ice: [1.12, 0.75, 0.98],
  gold: [1.18, 1.45, 0.98],
  purple: [1.22, 1.35, 1.02],
  red: [1.65, 0, 0.98],
  mono: [1.35, 0, 1.05],
  manga: [1.9, 0, 1.12],
  void: [0.95, 0.4, 1.16],
  night: [1.2, 1.15, 0.92],
  warm: [1.1, 1.25, 1.03],
  clean: [1.12, 1.25, 1],
  none: [1, 1, 1],
};

/** the energy colours: [core, outer] (aura), ring (portal), front (liquid) */
export const ENERGY: Record<Energy, { core: [number, number, number]; outer: [number, number, number]; css: string }> = {
  blue: { core: [0.78, 0.97, 1], outer: [0.05, 0.38, 1], css: '#3fd4ff' },
  red: { core: [1, 0.78, 0.7], outer: [1, 0.08, 0.05], css: '#ff2a2a' },
  purple: { core: [0.95, 0.8, 1], outer: [0.55, 0.1, 1], css: '#b04bff' },
  gold: { core: [1, 0.95, 0.75], outer: [1, 0.55, 0.08], css: '#ffc23a' },
  white: { core: [1, 1, 1], outer: [0.55, 0.75, 1], css: '#ffffff' },
};

/** The washes and vignette of a look, drawn over the picture inside its own layer. */
export const Washes: React.FC<{ look: Look; strength?: number }> = ({ look, strength = 1 }) => (
  <>
    {look.washes.map((w, i) => (
      <div key={i} style={{ position: 'absolute', inset: 0, background: w.background, mixBlendMode: w.blend, opacity: w.opacity * strength }} />
    ))}
    {look.vignette > 0 && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,${(look.vignette * strength).toFixed(2)}) 100%)`,
        }}
      />
    )}
  </>
);

/**
 * SVG filters referenced from CSS (`filter: url(#amv-…)`). Rendered once per frame by the composition.
 * Directional blur needs a different deviation per frame, so it is drawn by the shot that uses it
 * (DirBlur) instead of living here.
 */
export const FilterDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      {/* stepped tones for the manga look */}
      <filter id="amv-posterize" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0 0.18 0.55 0.85 1" />
          <feFuncG type="discrete" tableValues="0 0.18 0.55 0.85 1" />
          <feFuncB type="discrete" tableValues="0 0.18 0.55 0.85 1" />
        </feComponentTransfer>
      </filter>
      {/* the picture traced as glowing cyan line art (R02 / R12) */}
      <filter id="amv-neon" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feColorMatrix type="saturate" values="0" result="g" />
        <feConvolveMatrix in="g" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" divisor="1" bias="0" preserveAlpha="true" result="e" />
        <feComponentTransfer in="e" result="e2">
          <feFuncR type="linear" slope="5" intercept="-0.25" />
          <feFuncG type="linear" slope="5" intercept="-0.25" />
          <feFuncB type="linear" slope="5" intercept="-0.25" />
        </feComponentTransfer>
        <feColorMatrix in="e2" type="matrix" values="0.1 0 0 0 0  0.85 0 0 0 0  1 0 0 0 0  0 0 0 1 0" result="c" />
        <feGaussianBlur in="c" stdDeviation="6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="b" />
          <feMergeNode in="c" />
        </feMerge>
      </filter>
      {/* channel isolation for the RGB split */}
      <filter id="amv-r" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
      </filter>
      <filter id="amv-g" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
      </filter>
      <filter id="amv-b" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
      </filter>
      {/* impact frame: inverted, crushed to ink */}
      <filter id="amv-impact" colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="1 1 0 0" />
          <feFuncG type="discrete" tableValues="1 1 0 0" />
          <feFuncB type="discrete" tableValues="1 1 0 0" />
        </feComponentTransfer>
      </filter>
    </defs>
  </svg>
);

/** A directional blur filter for one element (deviation in px along x / y). */
export const DirBlur: React.FC<{ id: string; dx: number; dy: number }> = ({ id, dx, dy }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={`${Math.max(0, dx).toFixed(1)} ${Math.max(0, dy).toFixed(1)}`} edgeMode="duplicate" />
      </filter>
    </defs>
  </svg>
);
