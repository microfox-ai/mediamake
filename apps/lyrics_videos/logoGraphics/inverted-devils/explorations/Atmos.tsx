/** Atmosphere shared by the variants: the void, grain, vignette, dust motes, anamorphic flare. */
import React from 'react';
import { AbsoluteFill, random, useCurrentFrame } from 'remotion';
import { C, H, W, clamp01, noise1 } from '../theme';

/** The black under everything, with a faint wine bloom behind the lockup. */
export const Void: React.FC<{ bloom?: number; cy?: number }> = ({ bloom = 1, cy = 50 }) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.void,
      background: `radial-gradient(60% 55% at 50% ${cy}%, rgba(70,6,16,${0.55 * bloom}) 0%, rgba(28,4,9,${0.6 * bloom}) 45%, ${C.void} 100%)`,
    }}
  />
);

/** Film grain, re-seeded every frame. */
export const Grain: React.FC<{ amount?: number }> = ({ amount = 0.07 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: amount, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <svg width={W} height={H}>
        <filter id={`grain-${frame}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 97} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter={`url(#grain-${frame})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ amount?: number }> = ({ amount = 1 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${0.75 * amount}) 100%)`,
    }}
  />
);

const MOTES = Array.from({ length: 70 }, (_, i) => ({
  x: random(`mx${i}`),
  y: random(`my${i}`),
  d: 0.4 + 1.4 * random(`md${i}`) ** 1.5,
  rank: random(`mr${i}`),
  phase: random(`mp${i}`) * 6.28,
  warm: random(`mw${i}`),
}));

/** Slow dust and bokeh drifting up through the light; near ones are big and soft. */
export const Motes: React.FC<{ t: number; amount: number; speed?: number }> = ({ t, amount, speed = 1 }) => {
  if (amount < 0.01) return null;
  const span = H + 200;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
      {MOTES.map((m, i) => {
        if (m.rank > amount) return null;
        const y = ((((m.y * span - t * 22 * m.d * speed) % span) + span) % span) - 100;
        const x = m.x * W + Math.sin(t * 0.35 + m.phase) * 30 * m.d;
        const near = m.d > 1.3;
        const s = (near ? 9 : 2.2) * m.d;
        const tw = 0.6 + 0.4 * noise1(t * 1.3 + i * 3.1, i);
        const core = m.warm > 0.6 ? '255,226,214' : '255,120,120';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - s,
              top: y - s,
              width: s * 2,
              height: s * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(${core},0.95) 0%, rgba(255,50,60,0.5) 40%, rgba(255,30,40,0) 72%)`,
              opacity: clamp01(amount * 1.5 - m.rank) * tw * (near ? 0.35 : 0.8),
              filter: near ? `blur(${3 + 3 * m.d}px)` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Anamorphic streak through (cx, cy): a thin white core inside a long red haze. */
export const Flare: React.FC<{ cx?: number; cy: number; amount: number; width?: number; core?: number }> = ({ cx = W / 2, cy, amount, width = 1, core = 1 }) => {
  if (amount < 0.01) return null;
  const half = (W * 0.75 + 200) * width;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: amount }}>
      <div
        style={{
          position: 'absolute',
          left: cx - half,
          width: half * 2,
          top: cy - 60,
          height: 120,
          background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,40,55,0.45) 0%, rgba(200,10,30,0.18) 40%, rgba(0,0,0,0) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: cx - half * 0.8,
          width: half * 1.6,
          top: cy - 2,
          height: 4,
          background: 'linear-gradient(90deg, rgba(255,40,55,0) 0%, rgba(255,90,100,0.8) 30%, rgba(255,245,240,1) 50%, rgba(255,90,100,0.8) 70%, rgba(255,40,55,0) 100%)',
          filter: 'blur(1px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: cx - 90,
          width: 180,
          top: cy - 90,
          height: 180,
          borderRadius: '50%',
          opacity: core,
          background: 'radial-gradient(circle, rgba(255,240,235,0.9) 0%, rgba(255,60,70,0.35) 25%, rgba(0,0,0,0) 70%)',
        }}
      />
    </AbsoluteFill>
  );
};
