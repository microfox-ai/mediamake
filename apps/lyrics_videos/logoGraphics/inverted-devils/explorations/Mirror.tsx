/**
 * 2 · MIRROR: the name taken literally. A thin horizon draws across a black mirror; only
 * the reflection of INVERTED is there, rippling under the line. It solidifies and each
 * letter flips up over the horizon in 3D; as the last one lands the letters invert for a few
 * frames (dark ink in a crimson flash). The mirror melts away and "Devils" rises out of the ripples.
 * Exit: the letters fall back under the line and the script sinks.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { DEV, INV } from '../layout';
import { Grain, Vignette, Void } from './Atmos';
import { DevilsFill, GlyphPath, Layer } from '../draw';
import { Smoke } from './Smoke';
import { C, FPS, W, clamp01, ease, halo, mix, prog, redGlow } from '../theme';

const HY = INV.base + 8; // the mirror line
const T = {
  line: [0.1, 0.9] as const,
  reflect: [0.35, 1.25] as const,
  solid: [1.15, 1.5] as const,
  flip: 1.5,
  step: 0.06,
  flipDur: 0.58,
  rise: [2.7, 3.85] as const,
  melt: [2.3, 2.9] as const,
  out: 6.1,
};
const LAND = T.flip + 7 * T.step + T.flipDur;

/** Mirror-water displacement: horizontal ripple bands drifting down. */
const Ripple: React.FC<{ id: string; t: number; scale: number; freq?: string }> = ({ id, t, scale, freq = '0.0035 0.05' }) => (
  <filter id={id} x="-10%" y="-40%" width="120%" height="180%">
    <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={7} result="n" />
    <feOffset in="n" dx={0} dy={t * 26} result="m" />
    <feDisplacementMap in="SourceGraphic" in2="m" scale={scale} xChannelSelector="R" yChannelSelector="G" />
  </filter>
);

export const Mirror: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const line = prog(t, T.line[0], T.line[1], ease.out);
  const melt = prog(t, T.melt[0], T.melt[1], ease.inOut);
  const lineOut = prog(t, 2.6, 3.3, ease.inOut);
  const exitLine = prog(t, T.out, T.out + 0.3, ease.out) * (1 - prog(t, T.out + 0.55, T.out + 0.85, ease.inOut));
  const lineW = (W / 2 + 60) * (line * (1 - lineOut) + exitLine * 0.6);
  const neg = t > LAND - 0.01 && t < LAND + 0.08;
  const flash = Math.exp(-Math.max(0, t - LAND) * 6) * (t > LAND ? 1 : 0);

  const refl = prog(t, T.reflect[0], T.reflect[1], ease.soft);
  const solid = prog(t, T.solid[0], T.solid[1], ease.inOut);
  const rise = prog(t, T.rise[0], T.rise[1], ease.out);
  const sink = prog(t, T.out + 0.15, T.out + 0.75, ease.in);
  const fadeAll = prog(t, T.out + 0.7, T.out + 0.85);
  const breathe = t > 3.8 ? 0.08 * Math.sin((t - 3.8) * 2.2) : 0;

  // per-letter flip angle: 180 = hanging under the line (the reflection), 0 = standing
  const angle = (i: number) => {
    const up = prog(t, T.flip + i * T.step, T.flip + i * T.step + T.flipDur, ease.inOut);
    const down = prog(t, T.out + (7 - i) * 0.04, T.out + (7 - i) * 0.04 + 0.45, ease.in);
    return 180 * (1 - up) + 180 * down;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      <Void bloom={0.7 * prog(t, 0.2, 2) + 0.6 * flash} cy={HY / 10.8} />
      <Smoke t={t} density={0.28 * prog(t, 1.4, 3.2, ease.soft) * (1 - fadeAll)} glow={0.8 + flash} glowPos={[0.5, HY / 1080]} seed={2} />

      <AbsoluteFill style={{ opacity: 1 - fadeAll }}>
        {/* the mirror floor: a faint lacquer sheen under the line */}
        <AbsoluteFill
          style={{
            top: HY,
            opacity: 0.9 * line * (1 - lineOut) + 0.5 * exitLine,
            background: 'linear-gradient(180deg, rgba(90,8,20,0.55) 0%, rgba(30,3,8,0.4) 18%, rgba(0,0,0,0) 55%)',
          }}
        />

        {/* the reflection before anything stands: rippling, fading with depth */}
        <Layer
          style={{
            filter: halo(0.6, 0.6 + 0.4 * solid),
            WebkitMaskImage: `linear-gradient(180deg, rgba(0,0,0,0) ${HY}px, #000 ${HY + 2}px, rgba(0,0,0,${mix(0.15, 1, solid)}) ${HY + INV.cap + 20}px)`,
          }}
        >
          <defs>
            <Ripple id="mir-pre" t={t} scale={mix(34, 0, solid)} />
          </defs>
          <g filter="url(#mir-pre)" transform={`translate(0 ${2 * HY}) scale(1 -1)`} opacity={refl * mix(0.55, 1, solid)}>
            {INV.glyphs.map((g, i) =>
              angle(i) >= 179.9 ? <GlyphPath key={i} g={g} fill={C.bone} /> : null,
            )}
          </g>
        </Layer>

        {/* the faint true reflection once they stand, melting away before Devils rises */}
        <AbsoluteFill
          style={{
            WebkitMaskImage: `linear-gradient(180deg, rgba(0,0,0,0) ${HY}px, rgba(0,0,0,0.9) ${HY + 2}px, rgba(0,0,0,0) ${HY + INV.cap * 0.9}px)`,
            opacity: (1 - melt) * 0.32,
          }}
        >
          <Layer>
            <defs>
              <Ripple id="mir-post" t={t} scale={6 + 50 * melt} />
            </defs>
            <g filter="url(#mir-post)" transform={`translate(0 ${2 * HY}) scale(1 -1)`}>
              {INV.glyphs.map((g, i) => (angle(i) < 40 ? <GlyphPath key={i} g={g} fill={C.bone} opacity={1 - angle(i) / 40} /> : null))}
            </g>
          </Layer>
        </AbsoluteFill>

        {/* INVERTED: each letter flips up over the line */}
        <AbsoluteFill style={{ filter: neg ? halo(2.2, 1.3) : halo(1 + 0.8 * flash + breathe) }}>
          {INV.glyphs.map((g, i) => {
            const a = angle(i);
            if (a >= 179.9) return null;
            return (
              <AbsoluteFill
                key={i}
                style={{
                  transform: `perspective(1100px) rotateX(${a}deg)`,
                  transformOrigin: `${g.cx}px ${HY}px`,
                }}
              >
                <Layer>
                  <GlyphPath g={g} fill={neg ? '#160205' : C.bone} stroke={neg ? '#ffd6da' : undefined} strokeWidth={neg ? 3 / g.s : undefined} />
                </Layer>
              </AbsoluteFill>
            );
          })}
        </AbsoluteFill>

        {/* the horizon */}
        <Layer style={{ filter: halo(0.7) }}>
          <rect x={W / 2 - lineW} y={HY - 1.2} width={lineW * 2} height={2.4} fill={C.bone} opacity={clamp01(lineW / 200)} />
          <rect x={W / 2 - lineW * 0.8} y={HY - 6} width={lineW * 1.6} height={12} fill={C.glow} opacity={0.25 * clamp01(lineW / 200)} />
        </Layer>

        {/* Devils rises out of the water */}
        <Layer
          style={{
            filter: `${redGlow(1 + 0.6 * (1 - rise))} blur(${7 * (1 - rise) + 6 * sink}px)`,
            transform: `translateY(${36 * (1 - rise) + 40 * sink}px)`,
            opacity: rise * (1 - sink),
          }}
        >
          <defs>
            <Ripple id="mir-dev" t={t} scale={60 * (1 - rise) + 70 * sink} freq="0.004 0.035" />
          </defs>
          <g filter="url(#mir-dev)">
            <DevilsFill fill={C.red} />
          </g>
        </Layer>
      </AbsoluteFill>

      {/* the negative flash leaves a crimson afterglow */}
      <AbsoluteFill style={{ background: `radial-gradient(60% 50% at 50% ${HY / 10.8}%, rgba(255,40,60,${neg ? 0.75 : 0.35 * flash}) 0%, rgba(0,0,0,0) 70%)`, mixBlendMode: 'screen' }} />
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
