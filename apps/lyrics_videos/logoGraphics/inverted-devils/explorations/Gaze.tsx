/**
 * 5 · GAZE: a slow, knowing look. Darkness; a slit of red light opens like an eye,
 * hesitates half-lidded while the two halves of INVERTED slide in from opposite sides and
 * lock along the light, then opens fully. "Devils" lands softly like a kiss with a ring
 * of light. Exit: a blink: the lids close back to the slit and it goes out.
 */
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { DEV, INV } from '../layout';
import { Flare, Grain, Motes, Vignette } from './Atmos';
import { DevilsFill, GlyphPath, Layer } from '../draw';
import { Smoke } from './Smoke';
import { C, FPS, H, W, ease, halo, prog, redGlow } from '../theme';

const CY = INV.mid; // the eye opens along INVERTED's middle
const T = {
  slide: [0.45, 2.05] as const,
  lock: 2.05,
  kiss: 2.85,
  out: 6.05,
};

/** Half-height of the opening over time: slit, half-lidded hesitation, open; blink at the end. */
const openAt = (t: number) =>
  interpolate(t, [0.15, 0.5, 1.3, 1.95, 2.85, T.out + 0.1, T.out + 0.5, T.out + 0.62, T.out + 0.8], [0, 4, 120, 150, 1500, 1500, 4, 4, 0], {
    easing: ease.inOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Almond-shaped eye opening; the corners spread as it opens so it can clear the frame. */
const eyePath = (a: number) => {
  const spread = 140 + a * 1.4;
  const l = -spread;
  const r = W + spread;
  const k = a * 2; // quadratic control: peak height = a
  return `M ${l} ${CY} Q ${W / 2} ${CY - k} ${r} ${CY} Q ${W / 2} ${CY + k} ${l} ${CY} Z`;
};

export const Gaze: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const a = openAt(t);
  const slide = prog(t, T.slide[0], T.slide[1], ease.out);
  const off = 1500 * (1 - slide);
  const smear = 40 * (1 - prog(t, T.slide[0], T.slide[1] - 0.4, ease.out));
  const lockFlash = Math.exp(-Math.max(0, t - T.lock) * 7) * (t >= T.lock ? 1 : 0);
  const kiss = prog(t, T.kiss, T.kiss + 0.45, ease.out);
  const ring = prog(t, T.kiss + 0.05, T.kiss + 1.1, ease.out);
  const bloom = Math.exp(-Math.max(0, t - T.kiss - 0.1) * 5) * (t >= T.kiss ? 1 : 0);
  const slitLight = (a > 0 ? 1 : 0) * Math.max(0, 1 - a / 260);
  const breathe = t > 3.5 ? 0.07 * Math.sin((t - 3.5) * 2.2) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="gaze-eye" clipPathUnits="userSpaceOnUse">
            <path d={eyePath(a)} />
          </clipPath>
        </defs>
      </svg>

      {/* the world behind the eyelids */}
      <AbsoluteFill style={{ clipPath: 'url(#gaze-eye)' }}>
        <AbsoluteFill
          style={{
            background: `radial-gradient(55% 60% at 50% ${(CY + 120) / 10.8}%, rgba(120,8,24,0.75) 0%, rgba(40,4,10,0.85) 45%, ${C.void} 100%)`,
          }}
        />
        <Smoke t={t} density={0.38} glow={1 + 0.6 * bloom} glowPos={[0.5, (CY + 140) / H]} seed={5} />
        <Motes t={t} amount={0.5 * prog(t, 2, 3.5)} speed={0.6} />
        <Flare cy={CY} amount={0.35 + 0.15 * Math.sin(t * 1.7)} width={0.9} />

        {/* INVERTED: top halves from the left, bottom halves from the right */}
        <Layer style={{ filter: halo(1 + 0.8 * lockFlash + breathe) }}>
          <defs>
            <clipPath id="gaze-top" clipPathUnits="userSpaceOnUse">
              <rect x={-4000} y={0} width={9000} height={CY} />
            </clipPath>
            <clipPath id="gaze-bot" clipPathUnits="userSpaceOnUse">
              <rect x={-4000} y={CY} width={9000} height={H} />
            </clipPath>
            <filter id="gaze-smear" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={`${smear} 0`} />
            </filter>
          </defs>
          {[
            { clip: 'gaze-top', dx: -off },
            { clip: 'gaze-bot', dx: off },
          ].map(h => (
            <g key={h.clip} clipPath={`url(#${h.clip})`}>
              <g transform={`translate(${h.dx} 0)`} filter={smear > 0.5 ? 'url(#gaze-smear)' : undefined}>
                {INV.glyphs.map((g, i) => (
                  <GlyphPath key={i} g={g} fill={C.bone} />
                ))}
              </g>
            </g>
          ))}
          {/* the seam flashes as the halves lock */}
          <rect x={INV.x0 - 140} y={CY - 1.5} width={INV.x1 - INV.x0 + 280} height={3} fill="#fff" opacity={lockFlash} />
        </Layer>

        {/* Devils lands like a kiss */}
        <Layer
          style={{
            filter: `${redGlow(1 + 1.4 * bloom, 0.9 + 0.5 * bloom)} blur(${12 * (1 - kiss)}px)`,
            opacity: kiss,
            transform: `scale(${1.2 - 0.2 * kiss})`,
            transformOrigin: `${W / 2}px ${DEV.mid}px`,
          }}
        >
          <DevilsFill fill={C.red} />
        </Layer>
        {ring > 0 && ring < 1 ? (
          <Layer style={{ filter: redGlow(1) }}>
            {[0, 0.14].map(lag => {
              const r = Math.max(0, ring - lag) / (1 - lag);
              return (
                <ellipse
                  key={lag}
                  cx={W / 2}
                  cy={DEV.mid}
                  rx={120 + 900 * r}
                  ry={50 + 330 * r}
                  fill="none"
                  stroke={lag ? C.glow : '#ffd5d8'}
                  strokeWidth={3 * (1 - r) + 0.5}
                  opacity={0.7 * (1 - r)}
                />
              );
            })}
          </Layer>
        ) : null}
      </AbsoluteFill>

      {/* the lids' rim light and the slit's flare */}
      <Layer style={{ filter: redGlow(1.2) }}>
        <path d={eyePath(a)} fill="none" stroke={C.glow} strokeWidth={2} opacity={a > 0.5 ? Math.max(0, 0.85 - a / 900) : 0} />
      </Layer>
      <Flare cy={CY} amount={slitLight} width={1.1} />
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
