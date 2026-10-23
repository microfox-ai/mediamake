/**
 * The animated INVERTED Devils lockup, on a transparent background.
 *
 * INVERTED is traced letter by letter in glowing strokes and burns in to white while a hot pen
 * writes "Devils" at the same time; both land together with a soft bloom (~1.9 s), then the
 * glow breathes for as long as the component stays on screen.
 *
 * It animates from frame 0 of wherever it is mounted, so place it with <Sequence from>.
 * The SVG fills its box and keeps its aspect (LOGO_VIEW.w / LOGO_VIEW.h); glows are SVG
 * filters in the logo's own units, so they scale with it. LogoScene shows it at its native
 * size and position in a 1920×1080 frame.
 */
import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { DevilsFill, GlyphPath, PenMask, devPx, penAt } from './draw';
import { BOX, INV } from './layout';
import { C, clamp01, ease, mix, prog } from './theme';

const PAD = 130; // room for the glow around the lockup

/** The component's viewBox, in 1920×1080 frame pixels. */
export const LOGO_VIEW = {
  x: BOX.x0 - PAD,
  y: BOX.y0 - PAD,
  w: BOX.x1 - BOX.x0 + PAD * 2,
  h: BOX.y1 - BOX.y0 + PAD * 2,
};

const T = {
  trace: 0.12, // first letter of INVERTED starts tracing
  step: 0.07, // between letters
  dl: 0.62, // trace time per letter
  write: [0.15, 1.7] as const, // the pen writes "Devils"
  dot: 1.76,
};
const INV_DONE = T.trace + 7 * T.step + T.dl + 0.3;

/** When the lockup is complete (seconds from mount), for scenes that sync to it. */
export const LOGO_TIMING = { drawn: 2.0 } as const;

/** Glow as an SVG filter: blurred copies of the shape, flooded with colour, under it. */
const Glow: React.FC<{ id: string; layers: [number, string, number][] }> = ({ id, layers }) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={LOGO_VIEW.x} y={LOGO_VIEW.y} width={LOGO_VIEW.w} height={LOGO_VIEW.h} colorInterpolationFilters="sRGB">
    {layers.map(([sd, color, a], i) => (
      <React.Fragment key={i}>
        <feGaussianBlur in="SourceAlpha" stdDeviation={sd} result={`b${i}`} />
        <feFlood floodColor={color} floodOpacity={Math.min(1, a)} result={`c${i}`} />
        <feComposite in={`c${i}`} in2={`b${i}`} operator="in" result={`g${i}`} />
      </React.Fragment>
    ))}
    <feMerge>
      {layers.map((_, i) => (
        <feMergeNode key={i} in={`g${layers.length - 1 - i}`} />
      ))}
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

export type InvertedDevilsLogoProps = {
  /** glow strength multiplier */
  glow?: number;
  style?: React.CSSProperties;
};

export const InvertedDevilsLogo: React.FC<InvertedDevilsLogoProps> = ({ glow = 1, style }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const uid = `idl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const bloom = Math.exp(-Math.pow((t - 1.85) / 0.22, 2));
  const breathe = t > 2.2 ? 0.07 * Math.sin((t - 2.2) * 2.4) : 0;
  const k = glow * (1 + 0.8 * bloom + breathe);

  const pen = penAt(t, T.write[0], T.write[1] - T.write[0]);
  const dot = prog(t, T.dot, T.dot + 0.25, ease.outBack);
  const tip = pen.tip ? devPx(pen.tip[0], pen.tip[1]) : null;
  const inkHeat = 1 - prog(t, T.write[1] - 0.2, T.write[1] + 0.9);
  const kr = glow * (1 + 0.7 * inkHeat + 0.5 * bloom);

  return (
    <svg viewBox={`${LOGO_VIEW.x} ${LOGO_VIEW.y} ${LOGO_VIEW.w} ${LOGO_VIEW.h}`} width="100%" height="100%" style={{ overflow: 'visible', ...style }}>
      <defs>
        <Glow
          id={`${uid}-halo`}
          layers={[
            [1.5 * k, 'rgb(255,80,90)', 0.8],
            [7 * k, 'rgb(255,40,55)', 0.8],
            [22 * k, 'rgb(235,20,40)', 0.65],
          ]}
        />
        <Glow
          id={`${uid}-red`}
          layers={[
            [3 * kr, 'rgb(255,40,50)', 0.55 * (0.8 + 0.6 * inkHeat)],
            [13 * kr, 'rgb(230,20,35)', 0.4 * (0.8 + 0.6 * inkHeat)],
          ]}
        />
        <PenMask id={`${uid}-pen`} pen={pen} dot={dot} />
        <radialGradient id={`${uid}-tip`}>
          <stop offset="0%" stopColor="#fff2ec" stopOpacity={0.95} />
          <stop offset="30%" stopColor={C.glow} stopOpacity={0.6} />
          <stop offset="100%" stopColor={C.glow} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* INVERTED: traced, then burned in */}
      <g filter={`url(#${uid}-halo)`}>
        {INV.glyphs.map((g, i) => {
          const t0 = T.trace + i * T.step;
          const p = prog(t, t0, t0 + T.dl, ease.inOut);
          const f = prog(t, t0 + T.dl * 0.7, t0 + T.dl + 0.3, ease.out);
          const heat = 1 - prog(t, t0 + T.dl, t0 + T.dl + 0.8);
          const sw = 6 / g.s;
          return (
            <g key={i}>
              {f > 0 ? <GlyphPath g={g} fill={`rgb(255,${Math.round(mix(244, 255, heat))},${Math.round(mix(238, 252, heat))})`} opacity={f} /> : null}
              {p > 0.001 && t < INV_DONE + 0.2 ? (
                <>
                  <GlyphPath g={g} fill="none" stroke={C.glow} strokeWidth={sw} pathLength={1} strokeDasharray={`${p} 2`} strokeLinejoin="round" opacity={0.95 - 0.95 * f} />
                  <GlyphPath g={g} fill="none" stroke="#fff4ef" strokeWidth={sw * 0.32} pathLength={1} strokeDasharray={`${p} 2`} strokeLinejoin="round" opacity={1 - f} />
                </>
              ) : null}
            </g>
          );
        })}
      </g>

      {/* Devils: written by a hot pen */}
      <g filter={`url(#${uid}-red)`}>
        <g mask={`url(#${uid}-pen)`}>
          <DevilsFill fill={C.red} />
        </g>
      </g>
      {tip && t < T.write[1] + 0.05 ? (
        <g opacity={clamp01((T.write[1] + 0.05 - t) / 0.12)}>
          <circle cx={tip[0]} cy={tip[1]} r={46} fill={`url(#${uid}-tip)`} />
          <circle cx={tip[0]} cy={tip[1]} r={7} fill="#fff" />
        </g>
      ) : null}
    </svg>
  );
};

/** The lockup at its native size and position in a 1920×1080 frame, nothing behind it. */
export const LogoScene: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', left: LOGO_VIEW.x, top: LOGO_VIEW.y, width: LOGO_VIEW.w, height: LOGO_VIEW.h }}>
      <InvertedDevilsLogo />
    </div>
  </AbsoluteFill>
);
