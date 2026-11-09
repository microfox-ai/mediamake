// kinetictype: the drawing pieces of a kinetic-typography edit (first built for "Screaming to Win",
// projects/screamingtowin, 2026-11-08): fonts and width-fit, time helpers, pictures placed by a focus
// point, grain, the manga speed lines, motion-smeared type, cracked type, knockouts, zoom-blur echoes.
import React, { useEffect, useId, useState, type CSSProperties } from 'react';
import { AbsoluteFill, Img, continueRender, delayRender, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadAnton } from '@remotion/google-fonts/Anton';
import { loadFont as loadMono } from '@remotion/google-fonts/SpaceMono';
import { asset, type Section } from '../kit';

const anton = loadAnton('normal', { weights: ['400'], subsets: ['latin'] });
const mono = loadMono('normal', { weights: ['400', '700'], subsets: ['latin'] });
export const ANTON = anton.fontFamily;
export const MONO = mono.fontFamily;

export const W = 1080;
export const H = 1920;
export const C = {
  ink: '#0a0a0a',
  paper: '#fbfbfa',
  red: '#e02b3e',
  fire: '#ff8a2a',
  blue: '#4cc3ff',
  night: '#04060d',
};

// ---------------------------------------------------------------- fonts and width-fit

let fontsReady = false;
/** false until Anton and Space Mono are loaded (the render waits for them). */
export const useFonts = () => {
  const [ready, setReady] = useState(fontsReady);
  const [handle] = useState(() => (fontsReady ? null : delayRender('kinetictype fonts')));
  useEffect(() => {
    let live = true;
    Promise.all([anton.waitUntilDone(), mono.waitUntilDone()])
      .then(() => document.fonts.ready)
      .then(() => {
        fontsReady = true;
        if (live) setReady(true);
        if (handle !== null) continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, []);
  return ready;
};

const widths = new Map<string, number>();
/** Width of `text` at 1px font size (letter spacing in em). */
export const textWidth = (text: string, family = ANTON, spacing = 0) => {
  const key = `${family}|${spacing}|${text}`;
  let w = widths.get(key);
  if (w === undefined) {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `100px "${family}"`;
    w = (ctx.measureText(text).width + spacing * 100 * Math.max(0, text.length - 1)) / 100;
    widths.set(key, w);
  }
  return w;
};
/** Font size that makes `text` exactly `width` wide (capped at `max`). */
export const fit = (text: string, width: number, max = 4000, family = ANTON, spacing = 0) =>
  Math.min(max, width / textWidth(text, family, spacing));

// ---------------------------------------------------------------- time

export const useTime = (section: Section) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return section.from + frame / fps;
};
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const easeOut = (p: number) => 1 - Math.pow(1 - clamp(p), 3);
export const easeIn = (p: number) => Math.pow(clamp(p), 3);
/** 1 at a hit, decaying to 0 (`decay` seconds) — the strongest recent hit. */
export const kick = (t: number, hits: number[], decay = 0.16) => {
  let k = 0;
  for (const h of hits) if (t >= h) k = Math.max(k, Math.exp(-(t - h) / decay));
  return k;
};
/** Index of the last hit at or before t (-1 before the first). */
export const lastHit = (t: number, hits: number[]) => {
  let i = -1;
  hits.forEach((h, j) => {
    if (t >= h - 1e-6) i = j;
  });
  return i;
};
export const between = (t: number, a: number, b: number) => t >= a && t < b;
/** Smooth value noise in -1..1 (no dependency): random values on whole numbers, eased in between. */
const smooth = (seed: string, x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const a = random(`${seed}${i}`) * 2 - 1;
  const b = random(`${seed}${i + 1}`) * 2 - 1;
  return a + (b - a) * f * f * (3 - 2 * f);
};
export const shake = (t: number, amp: number, seed = 's', speed = 22): [number, number] => [
  smooth(`${seed}x`, t * speed) * amp,
  smooth(`${seed}y`, t * speed) * amp,
];

// ---------------------------------------------------------------- pictures

/** A square picture, `w` px wide, with its point `f` (fractions) at screen point `at`. */
export const Frame: React.FC<{
  src: string;
  f: [number, number];
  at: [number, number];
  w: number;
  filter?: string;
  opacity?: number;
  style?: CSSProperties;
}> = ({ src, f, at, w, filter, opacity, style }) => (
  <Img
    src={asset(src)}
    style={{
      position: 'absolute',
      width: w,
      height: w,
      maxWidth: 'none',
      left: at[0] - f[0] * w,
      top: at[1] - f[1] * w,
      filter,
      opacity,
      ...style,
    }}
  />
);

/** A square picture covering the whole 9:16 frame, around its point `f`, zoomed by `zoom`. */
export const Cover: React.FC<{ src: string; f?: [number, number]; zoom?: number; filter?: string; style?: CSSProperties }> = ({
  src,
  f = [0.5, 0.5],
  zoom = 1,
  filter,
  style,
}) => {
  const w = H * zoom;
  // keep the frame covered: clamp the focus so no edge shows
  const left = clamp(W / 2 - f[0] * w, W - w, 0);
  const top = clamp(H / 2 - f[1] * w, H - w, 0);
  return (
    <Img src={asset(src)} style={{ position: 'absolute', width: w, height: w, maxWidth: 'none', left, top, filter, ...style }} />
  );
};

// ---------------------------------------------------------------- texture

export const Grain: React.FC<{ opacity?: number; blend?: CSSProperties['mixBlendMode'] }> = ({
  opacity = 0.16,
  blend = 'overlay',
}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 40;
  const id = `grain${seed}`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: blend, opacity }}>
      <svg width={W} height={H}>
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

/** The panel's own diagonal speed lines, streaking across. */
export const SpeedLines: React.FC<{
  t: number;
  color?: string;
  count?: number;
  opacity?: number;
  angle?: number;
  speed?: number;
  seed?: string;
}> = ({ t, color = '#fff', count = 26, opacity = 0.4, angle = -62, speed = 2800, seed = 'sl' }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <g transform={`rotate(${angle} ${W / 2} ${H / 2})`}>
        {Array.from({ length: count }).map((_, i) => {
          const y = random(`${seed}y${i}`) * 2700 - 390;
          const len = 260 + random(`${seed}l${i}`) * 900;
          const v = speed * (0.55 + random(`${seed}v${i}`));
          const x = ((random(`${seed}x${i}`) * 3600 + t * v) % 3600) - 1260;
          const h = 1 + random(`${seed}h${i}`) * 5;
          return <rect key={i} x={x} y={y} width={len} height={h} fill={color} />;
        })}
      </g>
    </svg>
  </AbsoluteFill>
);

// ---------------------------------------------------------------- type

/** Directional blur (motion smear) on its children: `x`/`y` in px. */
export const Smear: React.FC<{ x?: number; y?: number; children: React.ReactNode; style?: CSSProperties }> = ({
  x = 0,
  y = 0,
  children,
  style,
}) => {
  const id = `sm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (x < 0.4 && y < 0.4) return <div style={style}>{children}</div>;
  return (
    <>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={id} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={`${x.toFixed(1)} ${y.toFixed(1)}`} />
        </filter>
      </svg>
      <div style={{ ...style, filter: `url(#${id})` }}>{children}</div>
    </>
  );
};

/** How a word smears in, `e` seconds after it appears: [offset px, smear px, scaleX, opacity]. */
export const entry = (e: number, dirn = 1, len = 0.16): [number, number, number, number] => {
  const p = clamp(e / len);
  const q = 1 - easeOut(p);
  return [dirn * 220 * q, 46 * q, 1 + 0.35 * q, p > 0 ? 1 : 0];
};

export type WordProps = {
  text: string;
  size: number;
  x: number;
  y: number;
  color?: string;
  stroke?: string;
  strokeW?: number;
  anchor?: 'center' | 'left' | 'right';
  spacing?: number;
  scale?: number;
  scaleX?: number;
  rot?: number;
  opacity?: number;
  smearX?: number;
  smearY?: number;
  dx?: number;
  family?: string;
  clip?: string;
  style?: CSSProperties;
};

/** One line of type, its centre (or edge) at x, its middle at y. */
export const Word: React.FC<WordProps> = ({
  text,
  size,
  x,
  y,
  color = '#fff',
  stroke,
  strokeW = 3,
  anchor = 'center',
  spacing = 0,
  scale = 1,
  scaleX = 1,
  rot = 0,
  opacity = 1,
  smearX = 0,
  smearY = 0,
  dx = 0,
  family = ANTON,
  clip,
  style,
}) => {
  const tx = anchor === 'center' ? '-50%' : anchor === 'right' ? '-100%' : '0%';
  return (
    <div style={{ position: 'absolute', left: x + dx, top: y, opacity, clipPath: clip }}>
      <Smear x={smearX} y={smearY}>
        <div
          style={{
            transform: `translate(${tx}, -50%) rotate(${rot}deg) scale(${scale * scaleX}, ${scale})`,
            transformOrigin: anchor === 'center' ? '50% 50%' : anchor === 'left' ? '0% 50%' : '100% 50%',
            fontFamily: family,
            fontSize: size,
            lineHeight: 1,
            letterSpacing: `${spacing}em`,
            whiteSpace: 'nowrap',
            color: stroke ? 'transparent' : color,
            WebkitTextStroke: stroke ? `${strokeW}px ${stroke}` : undefined,
            textTransform: 'uppercase',
            paddingTop: size * 0.06,
            ...style,
          }}
        >
          {text}
        </div>
      </Smear>
    </div>
  );
};

/** A word split along a jagged diagonal crack, the halves pushed `gap` px apart. */
export const Cracked: React.FC<WordProps & { gap: number }> = ({ gap, ...p }) => {
  // the crack runs from 30 % down on the left to 64 % down on the right, with teeth
  const top = 'polygon(0% 0%, 100% 0%, 100% 62%, 78% 55%, 70% 61%, 52% 47%, 44% 52%, 26% 40%, 17% 44%, 0% 31%)';
  const bottom = 'polygon(0% 31%, 17% 44%, 26% 40%, 44% 52%, 52% 47%, 70% 61%, 78% 55%, 100% 62%, 100% 100%, 0% 100%)';
  // push along the crack's normal (up-left / down-right)
  const nx = gap * 0.32;
  const ny = gap * 0.95;
  const half = (clip: string, sx: number, sy: number) => (
    <div style={{ position: 'absolute', inset: 0, transform: `translate(${sx}px, ${sy}px)` }}>
      <Word {...p} style={{ ...p.style, clipPath: clip }} />
    </div>
  );
  return (
    <>
      {half(top, -nx, -ny)}
      {half(bottom, nx, ny)}
    </>
  );
};

/** Pictures seen only through the white parts of `mask` (white type on black): a knockout on black. */
export const KnockoutOnBlack: React.FC<{ picture: React.ReactNode; mask: React.ReactNode }> = ({ picture, mask }) => (
  <AbsoluteFill style={{ isolation: 'isolate', background: '#000' }}>
    {picture}
    <AbsoluteFill style={{ background: '#000', mixBlendMode: 'multiply' }}>{mask}</AbsoluteFill>
  </AbsoluteFill>
);

/** A small mono label (editorial furniture). */
export const Label: React.FC<{ text: string; x: number; y: number; color?: string; size?: number; anchor?: 'left' | 'right' }> = ({
  text,
  x,
  y,
  color = '#fff',
  size = 22,
  anchor = 'left',
}) => (
  <div
    style={{
      position: 'absolute',
      left: anchor === 'left' ? x : undefined,
      right: anchor === 'right' ? W - x : undefined,
      top: y,
      fontFamily: MONO,
      fontSize: size,
      letterSpacing: '0.12em',
      color,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

/** Zoom blur: the scene drawn again a few times, each a little bigger around `origin` and fainter,
 *  so it streaks outward like a camera rushing in. `amount` 0 = off, 0.5 = heavy. */
export const ZoomEcho: React.FC<{ origin: [number, number]; amount: number; copies?: number; children: React.ReactNode }> = ({
  origin,
  amount,
  copies = 6,
  children,
}) => {
  if (amount < 0.004) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      {Array.from({ length: copies }).map((_, k) => (
        <AbsoluteFill
          key={k}
          style={{
            transform: `scale(${1 + (amount * k) / (copies - 1)})`,
            transformOrigin: `${origin[0]}px ${origin[1]}px`,
            opacity: k === 0 ? 1 : 0.55 / k,
          }}
        >
          {children}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
