/**
 * Breaking Bad: the phone is Heisenberg (the sketch from the show: the pork-pie hat, the dark glasses, the
 * goatee) worn by a pale handset, lit from behind in the show's element green so the black hat reads on
 * the black ground. Two beats before the tip the glasses slide down his nose and he stares over them at the
 * viewer; they go back up, he tips over and flips himself the right way up for the turned phone, and a glint
 * runs across the lenses. The turn arrow
 * is hazmat yellow (the suits). Drawn like the cues in index.tsx: upright, `size` tall, centre at the origin.
 */
import React from 'react';
import type { CueProps } from './index';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
/** 0 → 1 over [a, a + d] */
const ramp = (t: number, a: number, d: number) => smooth(clamp01((t - a) / d));

export const Heisenberg: React.FC<CueProps> = ({ t, tip, tipAt, angle, beat, size, theme }) => {
  const { red: green, acid, bone } = theme.colors;
  const ink = '#0a0a0a';
  const skin = '#ece5d6';
  // the stare: the glasses slide down two beats before the tip, hold, and go back up just before it
  const peer = ramp(t, tipAt - beat * 2, beat * 0.4) * (1 - ramp(t, tipAt - beat * 0.55, beat * 0.4));
  const drop = 13 * peer;
  // the glint across the lenses once he's on his side
  const glint = tip >= 1 ? clamp01((t - tipAt - beat * 1.3) / 0.4) : 0;
  const arrowOn = 1 - clamp01(tip * 1.6);
  const r = 108;
  // once he has landed on his side (clockwise, the viewer's move) his hat points at the frame's right, so he'd
  // be upside down in the turned phone: he flips over like the coin toss, ending with the hat to the frame's
  // left, the turned phone's top (a flip of his height in his own frame is a flip across the frame's width)
  const flipP = smooth(clamp01((t - tipAt - 0.5) / 0.36));
  const flip = `translate(0, -13) scale(${1 + 0.1 * Math.sin(Math.PI * flipP)}, ${Math.cos(Math.PI * flipP)}) translate(0, 13)`;
  return (
    // drawn at 72 % of the cue's box: the hat and the glow made him read bigger than a phone ("a bit too big")
    <svg width={size} height={size} viewBox="-139 -139 278 278" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="hb-cue-glow" cx="0" cy="-10" r="125" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={green} stopOpacity={0.55} />
          <stop offset="0.55" stopColor={green} stopOpacity={0.16} />
          <stop offset="1" stopColor={green} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="hb-cue-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7f2e8" />
          <stop offset="0.6" stopColor={skin} />
          <stop offset="1" stopColor="#c9bfac" />
        </linearGradient>
        <linearGradient id="hb-cue-lens" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2f2c" />
          <stop offset="0.5" stopColor={ink} />
          <stop offset="1" stopColor="#151816" />
        </linearGradient>
        <clipPath id="hb-cue-lenses">
          <path d="M -42 -64 L -6 -64 L -7 -52 C -8 -44, -14 -41, -22 -41 C -32 -41, -40 -45, -42 -54 Z" />
          <path d="M 42 -64 L 6 -64 L 7 -52 C 8 -44, 14 -41, 22 -41 C 32 -41, 40 -45, 42 -54 Z" />
        </clipPath>
      </defs>
      {/* the lab light behind him */}
      <circle cx={0} cy={-10} r={125} fill="url(#hb-cue-glow)" />
      {/* the turn arrow round the top right, clockwise; it keeps still while he tips */}
      <g opacity={arrowOn} transform={`rotate(${-angle})`} fill="none" stroke={acid} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${0.15 * r} ${-1.02 * r} A ${r} ${r} 0 0 1 ${0.98 * r} ${-0.32 * r}`} />
        <path d={`M ${0.8 * r} ${-0.42 * r} L ${0.98 * r} ${-0.32 * r} L ${1.06 * r} ${-0.53 * r}`} />
      </g>
      <g transform={flip}>
      {/* the handset: the sketch's pale face, a darker edge, the side keys */}
      <rect x={49} y={-34} width={3.5} height={22} rx={1.5} fill="#a99f8c" />
      <rect x={-48} y={-80} width={96} height={172} rx={24} fill="url(#hb-cue-body)" stroke="#9d937f" strokeWidth={3} />
      <rect x={-41} y={-73} width={82} height={158} rx={18} fill="none" stroke={ink} strokeWidth={1.2} opacity={0.12} />
      {/* the eyes and brows behind the glasses: seen only when they slide down */}
      <g opacity={peer}>
        <path d="M -36 -71 L -12 -66" stroke={ink} strokeWidth={4.5} strokeLinecap="round" />
        <path d="M 36 -71 L 12 -66" stroke={ink} strokeWidth={4.5} strokeLinecap="round" />
        <path d="M -33 -59 Q -23 -66, -13 -60 Q -23 -56, -33 -59 Z" fill={ink} />
        <path d="M 33 -59 Q 23 -66, 13 -60 Q 23 -56, 33 -59 Z" fill={ink} />
        <circle cx={-22} cy={-60.5} r={1.4} fill={bone} />
        <circle cx={24} cy={-60.5} r={1.4} fill={bone} />
      </g>
      {/* the glasses: two dark lenses on a bar, sliding down his nose for the stare */}
      <g transform={`translate(0, ${drop})`}>
        <rect x={-46} y={-66} width={92} height={4} rx={2} fill={ink} />
        <g clipPath="url(#hb-cue-lenses)">
          <rect x={-46} y={-66} width={92} height={28} fill="url(#hb-cue-lens)" />
          {/* the glint: a white streak running across both lenses */}
          {glint > 0 && glint < 1 && <rect x={-70 + 140 * glint} y={-80} width={9} height={60} fill="white" opacity={0.8} transform={`skewX(-28)`} />}
        </g>
      </g>
      {/* the nose, faint; the goatee: a heavy moustache drooping at its ends and the chin beard under it */}
      <path d="M -1 -34 C -2 -22, -5 -14, -8 -9 C -4 -6, 2 -6, 6 -8" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" opacity={0.35} />
      <path d="M -24 16 C -23 6, -10 1, 0 4 C 10 1, 23 6, 24 16 C 20 12, 12 10, 0 12 C -12 10, -20 12, -24 16 Z" fill={ink} />
      <path d="M -12 22 C -6 19.5, 6 19.5, 12 22 C 12 32, 6 40, 0 42 C -6 40, -12 32, -12 22 Z" fill={ink} />
      {/* the pork-pie hat: a flat crown with its pinch, a band, a short brim, rimmed in the green light */}
      <g stroke={green} strokeWidth={2.2} strokeOpacity={0.75} strokeLinejoin="round">
        <path d="M -38 -84 L -34 -114 C -20 -118, 20 -118, 34 -114 L 38 -84 Z" fill={ink} />
        <path d="M -70 -80 C -50 -90, 50 -90, 70 -80 C 52 -74, -52 -74, -70 -80 Z" fill={ink} />
      </g>
      <path d="M -37 -93 L 37 -93 L 38 -85 L -38 -85 Z" fill="#262a27" />
      <path d="M -26 -113 C -10 -110, 10 -110, 26 -113" fill="none" stroke="#2d322e" strokeWidth={2} />
      {/* the home bar: still a phone */}
      <rect x={-15} y={80} width={30} height={4.5} rx={2.2} fill={ink} opacity={0.55} />
      </g>
    </svg>
  );
};
