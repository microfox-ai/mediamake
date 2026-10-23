/**
 * 3 · VELVET: slow and sultry. Wine-red smoke breathes up, a soft light drifts behind,
 * INVERTED comes out of focus from the centre outward (letters drawing together as they
 * sharpen), "Devils" is revealed by a feathered diagonal wipe like a brushstroke of
 * lipstick, then a glossy sheen slides across it. Exit: the smoke closes in and the
 * lockup melts out of focus.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { DEV, INV } from '../layout';
import { Flare, Grain, Motes, Vignette, Void } from './Atmos';
import { DevilsFill, GlyphPath, Layer } from '../draw';
import { Smoke } from './Smoke';
import { C, FPS, H, W, clamp01, ease, halo, mix, prog, redGlow } from '../theme';

const T = {
  smoke: [0, 1.6] as const,
  letters: 0.45,
  ring: 0.17, // delay per step out from the centre
  focus: 1.7, // seconds each letter takes to come into focus
  wipe: [2.2, 3.4] as const,
  sheen: [3.5, 4.4] as const,
  out: 6.05,
};
const FEATHER = 260;

export const Velvet: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const out = prog(t, T.out, T.out + 0.85, ease.inOut);
  const breathe = 0.5 + 0.5 * Math.sin(t * 1.6);
  const wipe = prog(t, T.wipe[0], T.wipe[1], ease.inOut);
  const sheen = prog(t, T.sheen[0], T.sheen[1], ease.inOut);
  // light passing behind the lockup, right to left
  const lightX = mix(W + 300, -300, prog(t, 1.0, 3.4, ease.soft));
  const light = Math.sin(Math.PI * prog(t, 1.0, 3.4));

  const wx = mix(DEV.x0 - FEATHER - 120, DEV.x1 + 120, wipe);
  const sx = mix(DEV.x0 - 300, DEV.x1 + 300, sheen);

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      <Void bloom={prog(t, 0, 2) * (1 - out)} />
      <Smoke
        t={t}
        tone="wine"
        density={0.85 * prog(t, T.smoke[0], T.smoke[1], ease.soft)}
        glow={(0.9 + 0.25 * breathe + 0.5 * light) * (1 - 0.7 * out)}
        glowPos={[0.5, 0.48]}
        rise={0.07}
        close={out}
        seed={3}
      />
      <Flare cx={lightX} cy={INV.base + 30} amount={0.5 * light} width={0.8} core={0.35} />
      <Motes t={t} amount={0.85 * prog(t, 0.4, 2.4) * (1 - out)} speed={0.7} />

      <AbsoluteFill
        style={{
          filter: `blur(${22 * out}px)`,
          opacity: 1 - prog(t, T.out + 0.25, T.out + 0.85),
          transform: `scale(${1 + 0.025 * prog(t, 0, 7, ease.soft) + 0.04 * out})`,
        }}
      >
        {/* INVERTED: out of focus → sharp, letters drawing together from the centre */}
        <Layer style={{ filter: halo(0.9 + 0.15 * breathe) }}>
          <defs>
            {INV.glyphs.map((g, i) => {
              const rank = Math.abs(i - 3.5) - 0.5;
              const p = prog(t, T.letters + rank * T.ring, T.letters + rank * T.ring + T.focus, ease.out);
              return (
                <filter key={i} id={`vel-b${i}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation={26 * (1 - p)} />
                </filter>
              );
            })}
          </defs>
          {INV.glyphs.map((g, i) => {
            const rank = Math.abs(i - 3.5) - 0.5;
            const p = prog(t, T.letters + rank * T.ring, T.letters + rank * T.ring + T.focus, ease.out);
            const dx = (g.cx - W / 2) * 0.32 * (1 - p);
            const s = mix(1.14, 1, p);
            return (
              <g
                key={i}
                filter={p < 0.999 ? `url(#vel-b${i})` : undefined}
                opacity={clamp01(p * 1.6)}
                transform={`translate(${g.cx + dx} ${g.cy}) scale(${s}) translate(${-g.cx} ${-g.cy})`}
              >
                <GlyphPath g={g} fill={C.bone} />
              </g>
            );
          })}
        </Layer>

        {/* Devils: feathered diagonal wipe, then a gloss sheen */}
        <Layer style={{ filter: redGlow(1.1) }}>
          <defs>
            <linearGradient id="vel-wipe" gradientUnits="userSpaceOnUse" x1={wx} y1={0} x2={wx + FEATHER} y2={0} gradientTransform={`rotate(14 ${wx} ${DEV.mid})`}>
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="#000" />
            </linearGradient>
            <mask id="vel-m" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
              <rect x={0} y={0} width={W} height={H} fill="url(#vel-wipe)" />
            </mask>
            <linearGradient id="vel-sheen" gradientUnits="userSpaceOnUse" x1={sx - 170} y1={0} x2={sx + 170} y2={0} gradientTransform={`rotate(18 ${sx} ${DEV.mid})`}>
              <stop offset="0" stopColor="#000" />
              <stop offset="0.45" stopColor="#fff" />
              <stop offset="0.55" stopColor="#fff" />
              <stop offset="1" stopColor="#000" />
            </linearGradient>
            <mask id="vel-s" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
              <rect x={0} y={0} width={W} height={H} fill="url(#vel-sheen)" />
            </mask>
          </defs>
          <g mask="url(#vel-m)" transform={`translate(0 ${14 * (1 - wipe)})`}>
            <DevilsFill fill={C.red} />
            {sheen > 0 && sheen < 1 ? (
              <g mask="url(#vel-s)" opacity={0.85} style={{ mixBlendMode: 'screen' }}>
                <DevilsFill fill="#ffd9dc" />
              </g>
            ) : null}
          </g>
        </Layer>
      </AbsoluteFill>
      <Vignette amount={1.1} />
      <Grain amount={0.08} />
    </AbsoluteFill>
  );
};
