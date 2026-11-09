/**
 * Rotate cues (make-video-music-remix-shorts, hook style 'cue'): the film's own stand-in for the phone in
 * a "rotate your phone" short. It appears upright in the middle of the vertical frame, does a beat of its
 * character, then tips onto its side (the parent turns it, clockwise: the viewer's move) — the way the
 * noahanima "dracula" reel turns a coffin for its rotate cue. The stand-in has to be the film's: a coffin
 * for Dracula, Deadpool's mask for Deadpool, start lights for F1. Draw a new one per film here and add it
 * to CUES; short.json picks it by name (hook.cue).
 *
 * A cue is drawn upright, `size` tall, with its centre at the origin of its box; `t` counts seconds from its
 * first frame, `tip` is the turn's progress (0 upright → 1 on its side), `tipAt` the second (in `t`) the turn
 * starts, `angle` the parent's turn in degrees (the turn arrow counter-turns by it, so it stays put while the
 * stand-in tips), `beat` one beat. Time a gesture from `tipAt`, so a longer opening keeps it in place.
 */
import React from 'react';
import type { RemixTheme } from '../../Remix';
import { QuicksilverGoggles } from './goggles';
import { Heisenberg } from './heisenberg';

export type CueProps = { t: number; tip: number; tipAt: number; angle: number; beat: number; size: number; theme: RemixTheme };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 0 → 1 → 0 over [a, a + d]: a blink, a squint */
const pulse = (t: number, a: number, d: number) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));

/** the turn arrow round the stand-in's top right corner (clockwise), drawn in viewBox units */
const Arrow: React.FC<{ color: string; on: number; r: number; angle: number }> = ({ color, on, r, angle }) => (
  <g opacity={on} transform={`rotate(${-angle})`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
    <path d={`M ${0.15 * r} ${-1.02 * r} A ${r} ${r} 0 0 1 ${0.98 * r} ${-0.32 * r}`} />
    <path d={`M ${0.8 * r} ${-0.42 * r} L ${0.98 * r} ${-0.32 * r} L ${1.06 * r} ${-0.53 * r}`} />
  </g>
);

/** the plain phone (any film without a stand-in yet) */
const Phone: React.FC<CueProps> = ({ size, tip, angle, theme }) => {
  const { bone, red } = theme.colors;
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: 'visible' }}>
      <Arrow color={red} on={1 - tip} r={92} angle={angle} />
      <rect x={-44} y={-82} width={88} height={164} rx={16} fill="none" stroke={bone} strokeWidth={7} />
      <rect x={-12} y={-72} width={24} height={5} rx={2.5} fill={bone} />
      <rect x={-32} y={-60} width={64} height={120} rx={4} fill={bone} opacity={0.15} />
    </svg>
  );
};

/**
 * Deadpool: the phone wears his mask. A red handset with the mask's centre seam and two black eye patches;
 * the white eyes squint at the viewer, blink, and after the flop one of them winks (the fourth wall is
 * his). The turn arrow is the theme's yellow, the comic boxes' colour.
 */
const DeadpoolMask: React.FC<CueProps> = ({ t, tip, tipAt, angle, beat, size, theme }) => {
  const { red, acid } = theme.colors;
  const ink = '#0b0b0b';
  // the eyes: a suspicious squint the beat before the tip, a blink as it goes, a wink once he's on his side
  const squint = 1 - 0.55 * Math.max(pulse(t, tipAt - beat * 1.1, beat * 1.1), 0);
  const blink = 1 - 0.92 * pulse(t, tipAt + beat * 0.1, 0.14);
  const wink = 1 - 0.92 * (tip >= 1 ? pulse(t, tipAt + beat * 2.4, beat * 0.9) : 0);
  const eye = (side: 1 | -1, open: number) => (
    <g transform={`scale(${side}, 1)`}>
      {/* the black patch: broad and high at the outer corner, running to a point by the nose */}
      <path d="M -3 -6 C -5 -34, -24 -60, -44 -56 C -55 -52, -55 -18, -44 -4 C -32 10, -12 10, -3 -6 Z" fill={ink} />
      {/* the white eye: an almond slanting down to the nose, flatter underneath; it narrows to squint */}
      <g transform={`translate(-27, -27) rotate(${-24 - 10 * (1 - squint)})`}>
        <path d={`M -15 0 Q -2 ${-13 * open}, 15 ${-2 * open} Q 2 ${6 * open}, -15 0 Z`} fill="#f5f2ec" />
      </g>
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="dp-cue-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`color-mix(in srgb, ${red} 82%, white)`} />
          <stop offset="0.55" stopColor={red} />
          <stop offset="1" stopColor={`color-mix(in srgb, ${red} 60%, black)`} />
        </linearGradient>
      </defs>
      <Arrow color={acid} on={1 - clamp01(tip * 1.6)} r={104} angle={angle} />
      {/* the handset: red, rounded, its edge a little darker */}
      <rect x={-50} y={-90} width={100} height={180} rx={26} fill="url(#dp-cue-body)" stroke={`color-mix(in srgb, ${red} 55%, black)`} strokeWidth={3} />
      {/* the mask's centre seam and the faint seams round the cheeks */}
      <path d="M 0 -88 L 0 88" stroke={`color-mix(in srgb, ${red} 62%, black)`} strokeWidth={2.2} opacity={0.7} />
      <path d="M -50 12 C -30 30, -12 40, 0 42 C 12 40, 30 30, 50 12" fill="none" stroke={`color-mix(in srgb, ${red} 62%, black)`} strokeWidth={1.8} opacity={0.5} />
      {/* the earpiece: it is still a phone */}
      <rect x={-13} y={-80} width={26} height={5} rx={2.5} fill={ink} opacity={0.8} />
      {eye(1, Math.min(squint, blink))}
      {eye(-1, Math.min(squint, blink, wink))}
      {/* a highlight down the left edge */}
      <rect x={-42} y={-78} width={6} height={110} rx={3} fill="white" opacity={0.18} />
    </svg>
  );
};

export const CUES: Record<string, React.FC<CueProps>> = {
  phone: Phone,
  'deadpool-mask': DeadpoolMask,
  'quicksilver-goggles': QuicksilverGoggles,
  heisenberg: Heisenberg,
};
