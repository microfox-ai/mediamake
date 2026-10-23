/**
 * 4 · VOICE: the channel is about the voice. A glowing vocal waveform breathes across the
 * dark, beats twice like a heart, then collapses into vertical bars that open up into the
 * columns of INVERTED. "Devils" hangs there as an unlit neon tube and buzzes on.
 * Exit: the neon cuts out and the letters fold back into a flat line.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { DEV, DEV_BOLD, INV } from '../layout';
import { Grain, Vignette, Void } from './Atmos';
import { DevilsFill, GlyphPath, Layer } from '../draw';
import { C, FPS, W, clamp01, ease, halo, mix, noise1, prog, redGlow } from '../theme';

const MID = INV.mid;
const N = 72; // slices across INVERTED
const SX0 = INV.x0 - 12;
const SX1 = INV.x1 + 12;
const SW = (SX1 - SX0) / N;
const T = {
  wave: [0.05, 0.7] as const,
  beats: [0.8, 1.08],
  bars: 1.35,
  open: 0.55, // per slice
  spread: 0.5, // centre-out delay across the word
  tube: [1.9, 2.4] as const,
  neon: 2.45,
  out: 6.15,
};

/** The voice: a few detuned partials under a centred envelope, with a breathing tremolo. */
const wave = (x: number, t: number) => {
  const u = x / W;
  const env = Math.exp(-Math.pow((u - 0.5) / 0.26, 2));
  const v =
    0.55 * Math.sin(x * 0.019 - t * 7.5) +
    0.28 * Math.sin(x * 0.043 + t * 11.3 + 1.2) +
    0.17 * Math.sin(x * 0.091 - t * 17.1 + 0.4) +
    0.12 * noise1(x * 0.02 + t * 3, 3);
  return env * v * (0.8 + 0.2 * Math.sin(t * 5.3));
};

/** Neon ignition: hand-keyed flicker, then a faint buzz. */
const FLICKER: [number, number][] = [
  [0, 0], [0.04, 0.9], [0.08, 0.1], [0.16, 0], [0.2, 0.7], [0.23, 0.15], [0.3, 1], [0.34, 0.35],
  [0.38, 0.05], [0.47, 0.85], [0.5, 0.6], [0.56, 1],
];
const neonAt = (t: number) => {
  if (t < 0) return 0;
  if (t > 0.56) return 0.94 + 0.06 * noise1(t * 40, 9);
  let v = 0;
  for (const [k, val] of FLICKER) if (t >= k) v = val;
  return v;
};

export const Voice: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const heart = T.beats.reduce((a, b) => a + Math.exp(-Math.max(0, t - b) * 9) * (t >= b ? 1 : 0), 0);
  const amp = 95 * prog(t, T.wave[0], T.wave[1], ease.out) * (1 + 0.9 * heart);
  const waveOut = prog(t, T.bars - 0.2, T.bars + 0.25, ease.inOut);
  const barsIn = prog(t, T.bars - 0.3, T.bars + 0.05, ease.out);
  const fold = prog(t, T.out + 0.3, T.out + 0.62, ease.in); // letters fold back to a line
  const flat = prog(t, T.out + 0.6, T.out + 0.82, ease.inOut); // the line closes
  const breathe = t > 3 ? 0.07 * Math.sin((t - 3) * 2.6) : 0;

  // the waveform line
  const pts: string[] = [];
  const lineAmp = amp * (1 - waveOut);
  if (lineAmp > 0.5 || t < T.bars) {
    for (let k = 0; k <= 240; k++) {
      const x = (k / 240) * W;
      pts.push(`${x.toFixed(1)},${(MID + lineAmp * wave(x, t)).toFixed(1)}`);
    }
  }
  const drawn = prog(t, 0, 0.5, ease.out);

  // neon: off before the tube shows, keyed flicker, cut at the exit
  const lit = neonAt(t - T.neon) * (1 - (t > T.out ? 1 - neonAt(0.56 - (t - T.out) * 1.6) : 0));
  const tube = prog(t, T.tube[0], T.tube[1]) * (1 - prog(t, T.out + 0.4, T.out + 0.6));
  const settled = t > T.bars + T.open + T.spread + 0.05 && t < T.out + 0.3;

  return (
    <AbsoluteFill style={{ backgroundColor: C.void }}>
      <Void bloom={(0.5 + 0.5 * prog(t, 1.5, 2.5) + 0.25 * heart + 0.4 * lit * prog(t, 2.4, 3)) * (1 - flat)} cy={50} />

      {/* the waveform */}
      {pts.length ? (
        <Layer style={{ filter: halo(0.8 + 0.6 * heart) }}>
          <defs>
            <linearGradient id="voice-line" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={C.crimson} stopOpacity={0} />
              <stop offset="0.3" stopColor={C.glow} />
              <stop offset="0.5" stopColor="#fff" />
              <stop offset="0.7" stopColor={C.glow} />
              <stop offset="1" stopColor={C.crimson} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polyline
            points={pts.join(' ')}
            fill="none"
            stroke="url(#voice-line)"
            strokeWidth={3}
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${drawn} 2`}
            opacity={1 - waveOut}
          />
        </Layer>
      ) : null}

      {/* INVERTED out of the bars: each slice opens from a sliver on the wave into its column */}
      <Layer style={{ filter: halo(1 + breathe + 0.6 * Math.exp(-Math.pow((t - (T.bars + 1)) / 0.15, 2))) }}>
        <defs>
          <g id="voice-inv">
            {INV.glyphs.map((g, i) => (
              <GlyphPath key={i} g={g} fill={C.bone} />
            ))}
          </g>
          {Array.from({ length: N }, (_, k) => (
            <clipPath key={k} id={`voice-s${k}`} clipPathUnits="userSpaceOnUse">
              <rect x={SX0 + k * SW - 0.3} y={0} width={SW + 0.6} height={2000} />
            </clipPath>
          ))}
        </defs>
        {settled && fold === 0 ? (
          <use href="#voice-inv" />
        ) : (
          Array.from({ length: N }, (_, k) => {
            const x = SX0 + (k + 0.5) * SW;
            const d = Math.abs(x - W / 2) / (SX1 - SX0);
            const p = prog(t, T.bars + d * 2 * T.spread, T.bars + d * 2 * T.spread + T.open, ease.out) * (1 - fold);
            if (p <= 0.001) return null;
            const w = wave(x, Math.min(t, T.bars));
            const sy = mix(0.04 + 0.32 * Math.abs(w), 1, p);
            const dy = w * amp * (1 - p);
            return (
              <g key={k} transform={`translate(0 ${MID + dy}) scale(1 ${sy}) translate(0 ${-MID})`} opacity={clamp01(p * 3)}>
                <g clipPath={`url(#voice-s${k})`}>
                  <use href="#voice-inv" />
                </g>
              </g>
            );
          })
        )}
        {/* equalizer bars rising off the wave; each shrinks as its column opens */}
        {barsIn > 0 && t < T.bars + T.open + T.spread
          ? Array.from({ length: N }, (_, k) => {
              const x = SX0 + (k + 0.5) * SW;
              const d = Math.abs(x - W / 2) / (SX1 - SX0);
              const p = prog(t, T.bars + d * 2 * T.spread, T.bars + d * 2 * T.spread + T.open * 0.6, ease.out);
              const w = wave(x, Math.min(t, T.bars));
              const h = (10 + 260 * Math.abs(w)) * barsIn * (1 - p);
              if (h < 0.5) return null;
              return (
                <rect key={k} x={x - SW * 0.3} y={MID + w * amp - h / 2} width={SW * 0.6} height={h} rx={SW * 0.3} fill={Math.abs(x - W / 2) < 260 ? '#fff' : C.glow} opacity={0.9 * (1 - p)} />
              );
            })
          : null}
        {/* the flat line it all folds back into */}
        {fold > 0 ? (
          <rect x={W / 2 - (SX1 - SX0) * 0.5 * (1 - flat)} y={MID - 1.5} width={(SX1 - SX0) * (1 - flat)} height={3} fill="#fff" opacity={prog(fold, 0.6, 1) * (1 - prog(t, T.out + 0.78, T.out + 0.85))} />
        ) : null}
      </Layer>

      {/* Devils: the unlit tube, then the neon */}
      <Layer style={{ opacity: tube * (1 - 0.8 * lit) }}>
        <DevilsFill fill="#3a070d" />
      </Layer>
      {lit > 0.01 ? (
        <Layer style={{ filter: `${redGlow(1.4, 0.6 + 0.6 * lit)} brightness(${0.55 + 0.45 * lit})`, opacity: Math.min(1, lit * 1.2) }}>
          <DevilsFill fill="#ff2232" />
          {/* the hot core of the tube, along the pen path */}
          <g transform={DEV.tf}>
            {DEV.pen.map((s, i) => (
              <path key={i} d={s.d} fill="none" stroke="#ffb3b8" strokeWidth={DEV_BOLD * 0.32} strokeLinecap="round" strokeLinejoin="round" opacity={0.75 * lit} />
            ))}
            <circle cx={DEV.dot[0]} cy={DEV.dot[1]} r={DEV_BOLD * 0.3} fill="#ffb3b8" opacity={0.75 * lit} />
          </g>
        </Layer>
      ) : null}
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
