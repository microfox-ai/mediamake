/**
 * 1 · TRACE: the signature. Construction lines sweep out from a spark, INVERTED is traced
 * letter by letter in glowing strokes and burns in to white, the lines retract like a ray
 * wipe, and a hot pen writes "Devils". Exit: the lockup folds into a line that retracts
 * into the centre.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { DEV, INV } from '../layout';
import { Grain, Motes, Vignette, Void } from './Atmos';
import { DevilsFill, GlyphPath, Layer, PenMask, devPx, penAt } from '../draw';
import { Smoke } from './Smoke';
import { C, FPS, W, clamp01, ease, halo, mix, prog, redGlow } from '../theme';

const T = {
  spark: 0.15,
  lines: [0.15, 0.8] as const,
  trace: 0.5, // first letter
  step: 0.085,
  dl: 0.55, // trace time per letter
  wipe: [1.7, 2.2] as const,
  write: [1.95, 3.45] as const,
  dot: 3.55,
  out: 6.2,
};

export const Trace: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const outFold = prog(t, T.out, T.out + 0.32, ease.in); // logo folds to a line
  const outLine = prog(t, T.out + 0.3, T.out + 0.7, ease.inOut); // the line retracts
  const push = 1 + 0.035 * prog(t, 0, T.out, ease.soft);

  // construction lines at cap height and baseline
  const ln = prog(t, T.lines[0], T.lines[1], ease.out);
  const wipe = prog(t, T.wipe[0], T.wipe[1], ease.inOut);
  const half = (W / 2 + 80) * ln * (1 - wipe);
  const lastDone = T.trace + 7 * T.step + T.dl;
  const bloom = Math.exp(-Math.pow((t - (lastDone + 0.12)) / 0.18, 2));
  const breathe = t > 3 ? 0.08 * Math.sin((t - 3) * 2.4) : 0;

  const pen = penAt(t, T.write[0], T.write[1] - T.write[0]);
  const dot = prog(t, T.dot, T.dot + 0.25, ease.outBack);
  const writing = t > T.write[0] && t < T.write[1] + 0.3;
  const tip = pen.tip ? devPx(pen.tip[0], pen.tip[1]) : null;
  const inkHeat = 1 - prog(t, T.write[1] - 0.2, T.write[1] + 0.9);

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      <Void bloom={prog(t, 0.3, 2.2) * (1 - outLine)} cy={52} />
      <Smoke t={t} density={0.42 * prog(t, 0.2, 2.0, ease.soft) * (1 - outLine)} glow={0.9 + 0.5 * bloom} glowPos={[0.5, 0.5]} seed={1} />
      <Motes t={t} amount={0.5 * prog(t, 1.5, 3.5) * (1 - outLine)} />

      <AbsoluteFill
        style={{
          transform: `scale(${push}) scaleY(${mix(1, 0.012, outFold)}) scaleX(${1 - outLine})`,
          transformOrigin: `50% ${INV.base + 40}px`,
          opacity: 1 - prog(t, T.out + 0.62, T.out + 0.72),
        }}
      >
        {/* construction lines */}
        <Layer style={{ filter: halo(0.6) }}>
          {[INV.top, INV.base].map((y, k) => (
            <g key={k} opacity={1 - prog(wipe, 0.85, 1)}>
              <rect x={W / 2 - half} y={y - 1.2} width={half * 2} height={2.4} fill={C.bone} />
              <rect x={W / 2 - half * 0.85} y={y - 5} width={half * 1.7} height={10} fill={C.glow} opacity={0.3} />
              {[-1, 1].map(d => (
                <circle key={d} cx={W / 2 + d * half} cy={y} r={5 * ln * (1 - wipe)} fill="#fff" />
              ))}
            </g>
          ))}
          {/* the spark that starts it */}
          <circle cx={W / 2} cy={INV.mid} r={14 * prog(t, T.spark, T.spark + 0.15, ease.out) * (1 - prog(t, 0.4, 0.8))} fill="#fff" />
        </Layer>

        {/* INVERTED: traced, then burned in */}
        <Layer style={{ filter: halo(1 + 0.9 * bloom + breathe) }}>
          {INV.glyphs.map((g, i) => {
            const t0 = T.trace + i * T.step;
            const p = prog(t, t0, t0 + T.dl, ease.inOut);
            const f = prog(t, t0 + T.dl * 0.7, t0 + T.dl + 0.3, ease.out);
            const heat = 1 - prog(t, t0 + T.dl, t0 + T.dl + 0.8);
            const sw = 6 / g.s;
            return (
              <g key={i}>
                <GlyphPath g={g} fill={`rgb(255,${Math.round(mix(244, 255, heat))},${Math.round(mix(238, 252, heat))})`} opacity={f} />
                {p > 0.001 ? (
                  <>
                    <GlyphPath g={g} fill="none" stroke={C.glow} strokeWidth={sw} pathLength={1} strokeDasharray={`${p} 2`} strokeLinejoin="round" opacity={0.95 - 0.6 * f} />
                    <GlyphPath g={g} fill="none" stroke="#fff4ef" strokeWidth={sw * 0.32} pathLength={1} strokeDasharray={`${p} 2`} strokeLinejoin="round" opacity={1 - 0.7 * f} />
                  </>
                ) : null}
              </g>
            );
          })}
        </Layer>

        {/* Devils: written by a hot pen */}
        <Layer style={{ filter: redGlow(1 + 0.8 * inkHeat, 0.8 + 0.6 * inkHeat) }}>
          <defs>
            <PenMask id="trace-pen" pen={pen} dot={dot} />
          </defs>
          <g mask="url(#trace-pen)">
            <DevilsFill fill={C.red} />
          </g>
        </Layer>
        {writing && tip ? (
          <Layer style={{ mixBlendMode: 'screen' }}>
            <circle cx={tip[0]} cy={tip[1]} r={46} fill="url(#trace-tip)" />
            <circle cx={tip[0]} cy={tip[1]} r={7} fill="#fff" />
            <defs>
              <radialGradient id="trace-tip">
                <stop offset="0%" stopColor="#fff2ec" stopOpacity={0.95} />
                <stop offset="30%" stopColor={C.glow} stopOpacity={0.6} />
                <stop offset="100%" stopColor={C.glow} stopOpacity={0} />
              </radialGradient>
            </defs>
          </Layer>
        ) : null}
      </AbsoluteFill>

      {/* the closing line */}
      {t > T.out + 0.2 ? (
        <Layer style={{ filter: halo(1.2) }}>
          <rect
            x={W / 2 - (DEV.x1 - DEV.x0) * 0.55 * (1 - outLine)}
            y={INV.base + 40 - 1.5}
            width={(DEV.x1 - DEV.x0) * 1.1 * (1 - outLine)}
            height={3}
            fill="#fff"
            opacity={clamp01((t - T.out - 0.2) / 0.1) * (1 - prog(t, T.out + 0.68, T.out + 0.78))}
          />
        </Layer>
      ) : null}
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
