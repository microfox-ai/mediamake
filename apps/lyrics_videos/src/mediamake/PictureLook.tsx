/**
 * A stylised picture for CoverBackdrop: the poster treatments of the thumbnail engine
 * (thumbnails/treatments.ts) made alive. A grade and an SVG filter chain on the picture
 * (posterize → duotone → curves → chromatic split → bloom), then texture over it: grain that
 * moves every frame, vignette, a drifting light leak, god rays from a point of the picture,
 * floating embers, halftone, paper, dust, scanlines, old-film flicker. Bloom, chroma, rays and
 * the leak can follow the beat.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export type PictureLook = {
  grade?: { brightness?: number; contrast?: number; saturate?: number; hue?: number; sepia?: number; grayscale?: number };
  /** Luma mapped onto these colours, dark → light (two or more, evenly spaced). */
  duotone?: string[];
  /** Tone curve per channel (tableValues from 0 to 1). */
  curves?: { r?: number[]; g?: number[]; b?: number[] };
  /** Colour levels per channel (4–6 reads as a print). */
  posterize?: number;
  /** Red/blue split in px; `chromaKick` adds px on each kick. */
  chroma?: number;
  chromaKick?: number;
  /** Clarity: an unsharp kernel over the picture, 0..1 (0.3 is gentle). */
  sharpen?: number;
  /** Glow of the highlights, 0..1; `bloomPulse` adds to it on each beat. */
  bloom?: number;
  bloomPulse?: number;
  /**
   * Exposure on the beat: the picture brightens by `kick` on each kick drum and by `beat` on each
   * beat of the grid (0.3 = +30 % at the hit, then it settles), and `flash` (its peak opacity)
   * of `flashColor` washes over the frame on each snare.
   */
  exposure?: {
    kick?: number;
    beat?: number;
    /** Contrast added with the kick push, so the push reads as light, not haze. */
    punch?: number;
    flash?: number;
    flashColor?: string;
    /** Default 'screen'. */
    flashBlend?: React.CSSProperties['mixBlendMode'];
  };
  /** A colour wash over the picture (multiply, soft-light, color…). */
  wash?: { color: string; blend: React.CSSProperties['mixBlendMode']; opacity: number };
  grain?: number;
  vignette?: number;
  /** A light leak blooming in from `at` (0..1 of the frame), drifting along the edge. */
  leak?: { color: string; at: [number, number]; strength: number; size?: number; drift?: number };
  /** God rays from a picture point (frame px), turning slowly, stronger with the bass. */
  rays?: { at: [number, number]; color: string; strength: number; count?: number; spin?: number };
  /** Embers drifting up through the frame. */
  embers?: { count: number; color?: string; size?: number; rise?: number };
  halftone?: { size: number; strength: number; color?: string };
  paper?: number;
  /** White specks and scratches that change every few frames (an old print). */
  dust?: number;
  /** Brightness wobble per frame (old film), 0..1. */
  flicker?: number;
  scanlines?: number;
  /** Black bars top and bottom, px. */
  letterbox?: number;
};

const hex = (c: string) => {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map(x => x + x).join('') : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => (v / 255).toFixed(3));
};

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const gradeCss = (look?: PictureLook) => {
  const g = look?.grade;
  if (!g) return '';
  return [
    g.brightness !== undefined && `brightness(${g.brightness})`,
    g.contrast !== undefined && `contrast(${g.contrast})`,
    g.saturate !== undefined && `saturate(${g.saturate})`,
    g.hue !== undefined && `hue-rotate(${g.hue}deg)`,
    g.grayscale !== undefined && `grayscale(${g.grayscale})`,
    g.sepia !== undefined && `sepia(${g.sepia})`,
  ]
    .filter(Boolean)
    .join(' ');
};

/** The exposure push at this frame as a CSS filter (`kick` and `pulse` are the decaying hits). */
export const exposureCss = (look: PictureLook | undefined, kick: number, pulse: number) => {
  const e = look?.exposure;
  if (!e || !(e.kick || e.beat)) return '';
  const push = (e.kick ?? 0) * Math.min(1, kick) + (e.beat ?? 0) * pulse;
  if (push < 0.002) return '';
  const contrast = 1 + (e.punch ?? 0) * push;
  return `brightness(${(1 + push).toFixed(3)}) contrast(${contrast.toFixed(3)})`;
};

export const hasPictureFilter = (look?: PictureLook) =>
  !!look &&
  !!(look.posterize || look.duotone || look.curves || look.chroma || look.chromaKick || look.bloom || look.bloomPulse || look.sharpen);

/** The picture filters as one SVG filter: sharpen → posterize → duotone → curves → chromatic split → bloom. */
export const PictureFilter: React.FC<{ id: string; look: PictureLook; pulse: number; kick: number }> = ({ id, look, pulse, kick }) => {
  const steps: React.ReactNode[] = [];
  let last = 'SourceGraphic';
  if (look.sharpen) {
    const k = look.sharpen;
    steps.push(
      <feConvolveMatrix
        key="sharpen"
        in={last}
        order={3}
        kernelMatrix={`0 ${-k} 0 ${-k} ${1 + 4 * k} ${-k} 0 ${-k} 0`}
        preserveAlpha
        result="sharp"
      />,
    );
    last = 'sharp';
  }
  if (look.posterize) {
    const n = Math.max(2, Math.round(look.posterize));
    const table = Array.from({ length: n }, (_, i) => (i / (n - 1)).toFixed(3)).join(' ');
    steps.push(
      <feComponentTransfer key="poster" in={last} result="poster">
        <feFuncR type="discrete" tableValues={table} />
        <feFuncG type="discrete" tableValues={table} />
        <feFuncB type="discrete" tableValues={table} />
      </feComponentTransfer>,
    );
    last = 'poster';
  }
  if (look.duotone) {
    const stops = look.duotone.map(hex);
    const channel = (i: number) => stops.map(c => c[i]).join(' ');
    steps.push(
      <feColorMatrix key="lum" in={last} type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" result="lum" />,
      <feComponentTransfer key="duo" in="lum" result="duo">
        <feFuncR type="table" tableValues={channel(0)} />
        <feFuncG type="table" tableValues={channel(1)} />
        <feFuncB type="table" tableValues={channel(2)} />
      </feComponentTransfer>,
    );
    last = 'duo';
  }
  if (look.curves) {
    const t = (v?: number[]) => (v ?? [0, 1]).join(' ');
    steps.push(
      <feComponentTransfer key="curves" in={last} result="curves">
        <feFuncR type="table" tableValues={t(look.curves.r)} />
        <feFuncG type="table" tableValues={t(look.curves.g)} />
        <feFuncB type="table" tableValues={t(look.curves.b)} />
      </feComponentTransfer>,
    );
    last = 'curves';
  }
  const chroma = (look.chroma ?? 0) + (look.chromaKick ?? 0) * kick;
  if (chroma > 0.2) {
    const only = (r: number, g: number, b: number) => `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;
    steps.push(
      <feColorMatrix key="r" in={last} type="matrix" values={only(1, 0, 0)} result="r0" />,
      <feOffset key="ro" in="r0" dx={chroma} result="r" />,
      <feColorMatrix key="g" in={last} type="matrix" values={only(0, 1, 0)} result="g" />,
      <feColorMatrix key="b" in={last} type="matrix" values={only(0, 0, 1)} result="b0" />,
      <feOffset key="bo" in="b0" dx={-chroma} result="b" />,
      <feBlend key="rg" in="r" in2="g" mode="screen" result="rg" />,
      <feBlend key="rgb" in="rg" in2="b" mode="screen" result="chroma" />,
    );
    last = 'chroma';
  }
  const bloom = (look.bloom ?? 0) + (look.bloomPulse ?? 0) * pulse;
  if (bloom > 0.01) {
    steps.push(
      <feGaussianBlur key="blur" in={last} stdDeviation={18} result="blur" />,
      <feComponentTransfer key="hi" in="blur" result="hi">
        <feFuncR type="linear" slope={1 + bloom} intercept={-0.38} />
        <feFuncG type="linear" slope={1 + bloom} intercept={-0.38} />
        <feFuncB type="linear" slope={1 + bloom} intercept={-0.38} />
      </feComponentTransfer>,
      <feBlend key="bloom" in={last} in2="hi" mode="screen" result="bloom" />,
    );
    last = 'bloom';
  }
  if (!steps.length) return null;
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }}>
      <defs>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          {steps}
        </filter>
      </defs>
    </svg>
  );
};

/** Texture over the picture (under the dim and the waves). `rayAt` is the rays' point after the cover's motion. */
export const PictureTexture: React.FC<{
  look: PictureLook;
  t: number;
  pulse: number;
  low: number;
  snare?: number;
  rayAt?: [number, number];
}> = ({ look, t, pulse, low, snare = 0, rayAt }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const layers: React.ReactNode[] = [];

  if (look.wash) {
    layers.push(<AbsoluteFill key="wash" style={{ background: look.wash.color, mixBlendMode: look.wash.blend, opacity: look.wash.opacity }} />);
  }
  if (look.rays && rayAt) {
    const { color, strength, count = 18, spin = 4 } = look.rays;
    const step = 360 / count;
    const [x, y] = rayAt;
    const rot = t * spin;
    const mask = `radial-gradient(circle at ${x}px ${y}px, black 0%, rgba(0,0,0,0.6) 25%, transparent 70%)`;
    layers.push(
      <AbsoluteFill
        key="rays"
        style={{
          background: `repeating-conic-gradient(from ${rot}deg at ${x}px ${y}px, ${color} 0deg, transparent ${step * 0.35}deg, transparent ${step * 0.65}deg, ${color} ${step}deg)`,
          WebkitMaskImage: mask,
          maskImage: mask,
          mixBlendMode: 'screen',
          opacity: strength * (0.55 + 0.45 * low + 0.25 * pulse),
          filter: 'blur(6px)',
        }}
      />,
    );
  }
  if (look.leak) {
    const { color, at, strength, size = 45, drift = 0.06 } = look.leak;
    const ax = (at[0] + Math.sin(t * 0.21) * drift) * 100;
    const ay = (at[1] + Math.cos(t * 0.17) * drift) * 100;
    layers.push(
      <AbsoluteFill
        key="leak"
        style={{
          mixBlendMode: 'screen',
          opacity: strength * (0.8 + 0.2 * pulse),
          background: `radial-gradient(circle at ${ax}% ${ay}%, #fff3c4 0%, ${color} ${size * 0.35}%, transparent ${size}%), radial-gradient(ellipse at ${ax}% ${ay}%, ${color}55 0%, transparent 75%)`,
        }}
      />,
    );
  }
  if (look.embers) {
    const { count, color = '#ffb347', size = 3, rise = 60 } = look.embers;
    const dots = Array.from({ length: count }, (_, i) => {
      const speed = rise * (0.6 + hash(i + 7) * 0.9);
      const span = H + 80;
      const y = H + 40 - ((t * speed + hash(i + 3) * span) % span);
      const x = hash(i + 11) * W + Math.sin(t * (0.6 + hash(i + 5)) + i) * 30;
      const r = size * (0.5 + hash(i + 13));
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (2 + hash(i + 17) * 4) + i));
      // fade in from the bottom, out towards the top
      const fade = Math.min(1, (H + 40 - y) / 200) * Math.min(1, y / 260);
      return { x, y, r, o: tw * fade };
    });
    layers.push(
      <svg key="embers" width={W} height={H} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}>
        <defs>
          <radialGradient id="ember-dot">
            <stop offset="0%" stopColor="#fff6d8" />
            <stop offset="35%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </radialGradient>
        </defs>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r * 3} fill="url(#ember-dot)" opacity={d.o} />
        ))}
      </svg>,
    );
  }
  if (look.halftone) {
    const { size, strength, color = '#000' } = look.halftone;
    layers.push(
      <AbsoluteFill
        key="halftone"
        style={{ mixBlendMode: 'multiply', opacity: strength, backgroundImage: `radial-gradient(${color} 30%, transparent 32%)`, backgroundSize: `${size}px ${size}px` }}
      />,
    );
  }
  if (look.paper) {
    layers.push(
      <svg key="paper" width={W} height={H} style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: look.paper }}>
        <filter id="look-paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={0.04} numOctaves={5} seed={11} result="n" />
          <feDiffuseLighting in="n" lightingColor="#fff" surfaceScale={2}>
            <feDistantLight azimuth={45} elevation={60} />
          </feDiffuseLighting>
        </filter>
        <rect width="100%" height="100%" filter="url(#look-paper)" />
      </svg>,
    );
  }
  if (look.dust) {
    // a new print every 3 frames
    const k = Math.floor(frame / 3);
    const scratches = Array.from({ length: 3 }, (_, i) => ({
      x: hash(k * 7 + i + 1) * W,
      y: hash(k * 7 + i + 31) * H * 0.4,
      h: (0.3 + hash(k * 7 + i + 61) * 0.7) * H,
      o: hash(k * 7 + i + 91) > 0.55 ? 0.2 + hash(k + i) * 0.4 : 0,
    }));
    layers.push(
      <svg key="dust" width={W} height={H} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: look.dust }}>
        <filter id="look-dust" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={1} seed={k % 97} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  30 0 0 0 -22" />
        </filter>
        <rect width="100%" height="100%" filter="url(#look-dust)" />
        {scratches.map((l, i) => (
          <line key={i} x1={l.x} y1={l.y} x2={l.x + 2} y2={l.y + l.h} stroke="#fff" strokeOpacity={l.o} strokeWidth={1.4} />
        ))}
      </svg>,
    );
  }
  if (look.scanlines) {
    layers.push(
      <AbsoluteFill key="scan" style={{ opacity: look.scanlines, background: 'repeating-linear-gradient(0deg, #000 0 2px, transparent 2px 5px)' }} />,
    );
  }
  if (look.grain) {
    layers.push(
      <svg key="grain" width={W} height={H} style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: look.grain }}>
        <filter id="look-grain">
          <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={frame % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#look-grain)" />
      </svg>,
    );
  }
  if (look.vignette) {
    layers.push(
      <AbsoluteFill key="vignette" style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(0,0,0,${look.vignette}) 100%)` }} />,
    );
  }
  if (look.flicker) {
    const f = (hash(frame + 0.5) - 0.5) * 2;
    layers.push(<AbsoluteFill key="flicker" style={{ background: f > 0 ? '#fff' : '#000', opacity: Math.abs(f) * look.flicker * 0.12 }} />);
  }
  if (look.exposure?.flash && snare > 0.01) {
    const { flash, flashColor = '#ffffff', flashBlend = 'screen' } = look.exposure;
    layers.push(
      <AbsoluteFill key="flash" style={{ background: flashColor, mixBlendMode: flashBlend, opacity: flash * Math.min(1, snare) }} />,
    );
  }
  if (look.letterbox) {
    layers.push(
      <React.Fragment key="letterbox">
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: look.letterbox, background: '#000' }} />
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: look.letterbox, background: '#000' }} />
      </React.Fragment>,
    );
  }
  return <>{layers}</>;
};
