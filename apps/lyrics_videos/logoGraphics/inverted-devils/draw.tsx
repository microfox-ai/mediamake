/**
 * Drawing the lockup: glyph paths, the bolded script, and the pen that writes "Devils".
 * Everything is SVG in frame pixels (see ./layout.ts), so nothing waits on font loading.
 */
import React from 'react';
import { DEV, DEV_BOLD, INV, type Glyph } from './layout';
import { C, H, W, clamp01, ease } from './theme';

/** One glyph as a path; fill/stroke/opacity pass through. */
export const GlyphPath: React.FC<{ g: Glyph } & React.SVGProps<SVGPathElement>> = ({ g, ...rest }) => (
  <path d={g.d} transform={g.tf} {...rest} />
);

/** INVERTED, all letters, plain. */
export const InvertedFill: React.FC<{ fill?: string }> = ({ fill = C.bone }) => (
  <g>
    {INV.glyphs.map((g, i) => (
      <GlyphPath key={i} g={g} fill={fill} />
    ))}
  </g>
);

/** "Devils", bolded with a stroke like the logo. */
export const DevilsFill: React.FC<{ fill?: string; bold?: number }> = ({ fill = C.red, bold = DEV_BOLD }) => (
  <g>
    {DEV.glyphs.map((g, i) => (
      <GlyphPath key={i} g={g} fill={fill} stroke={fill} strokeWidth={bold} strokeLinejoin="round" />
    ))}
  </g>
);

/** Full-frame SVG layer. */
export const Layer: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', ...style }}>
    {children}
  </svg>
);

// ---------------------------------------------------------------- the pen

const LIFT = 0.07; // pen lift between letters, s
const weights = DEV.pen.map(p => Math.pow(p.len, 0.8));
const lifts = DEV.pen.reduce((n, p, i) => n + (i > 0 && p.letter !== DEV.pen[i - 1].letter ? 1 : 0), 0);

export type PenState = {
  /** drawn fraction of each pen stroke */
  f: number[];
  /** pen tip in frame px, null when lifted or finished */
  tip: [number, number] | null;
  /** 0..1 over the whole word */
  p: number;
};

const along = (k: number, f: number): [number, number] => {
  const s = DEV.pen[k];
  const target = f * s.len;
  let i = 1;
  while (i < s.cum.length - 1 && s.cum[i] < target) i++;
  const a = s.pts[i - 1];
  const b = s.pts[i];
  const seg = s.cum[i] - s.cum[i - 1] || 1;
  const u = clamp01((target - s.cum[i - 1]) / seg);
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
};

/** Where the pen is at time t when it writes the word from start over dur seconds. */
export const penAt = (t: number, start: number, dur: number): PenState => {
  const avail = Math.max(0.1, dur - lifts * LIFT);
  const total = weights.reduce((a, b) => a + b, 0);
  let at = start;
  let tip: [number, number] | null = null;
  const f = DEV.pen.map((p, i) => {
    if (i > 0 && p.letter !== DEV.pen[i - 1].letter) at += LIFT;
    const d = (avail * weights[i]) / total;
    const raw = clamp01((t - at) / d);
    const v = ease.soft(raw);
    if (raw > 0 && raw < 1) tip = along(i, v);
    at += d;
    return v;
  });
  return { f, tip, p: clamp01((t - start) / dur) };
};

/** px position of a word-space point. */
export { devPx } from './layout';

/**
 * Mask that reveals the script where the pen has been: wide round strokes along the
 * skeleton, plus the i's dot (dot: 0..1 scale).
 */
export const PenMask: React.FC<{ id: string; pen: PenState; dot: number; width?: number }> = ({ id, pen, dot, width = 130 }) => (
  <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
    <g transform={DEV.tf}>
      {DEV.pen.map((s, i) =>
        pen.f[i] > 0.001 ? (
          <path
            key={i}
            d={s.d}
            fill="none"
            stroke="#fff"
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={pen.f[i] >= 0.999 ? undefined : `${pen.f[i]} 2`}
          />
        ) : null,
      )}
      {dot > 0.001 ? <circle cx={DEV.dot[0]} cy={DEV.dot[1]} r={95 * dot} fill="#fff" /> : null}
    </g>
  </mask>
);
