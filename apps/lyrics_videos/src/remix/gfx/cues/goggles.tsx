/**
 * Quicksilver (X-Men: Days of Future Past, Apocalypse): the phone is his head. A dark handset with his
 * swept silver hair and the round chrome goggles of the kitchen scene pushed up on its forehead. Its eyes
 * size the viewer up, the goggles snap down over them (a spark of his lightning), and it tips onto its
 * side in a blur: blue afterimages and arcs trail it, the hair blows back and springs as it lands. Once
 * down he flips himself round at his speed, so he is upright in the turned phone, and he can't keep
 * still: he buzzes twice like a phone on vibrate (he has been waiting for ages).
 * The turn arrow is the theme's electric blue.
 */
import React from 'react';
import { Easing } from 'remotion';
import type { CueProps } from './index';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 0 → 1 → 0 over [a, a + d] */
const pulse = (t: number, a: number, d: number) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));
/** the parent's turn (RotateCue): 0.45 s, a back-out overshoot */
const backOut = Easing.out(Easing.back(1.8));
const TURN = 0.45;
/** his flip once he is down: a fifth of a second */
const flipOut = Easing.out(Easing.cubic);
const FLIP = 0.2;

/** the turn arrow round the top right corner (clockwise), held still while the stand-in tips */
const Arrow: React.FC<{ color: string; on: number; r: number; angle: number }> = ({ color, on, r, angle }) => (
  <g opacity={on} transform={`rotate(${-angle})`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
    <path d={`M ${0.15 * r} ${-1.02 * r} A ${r} ${r} 0 0 1 ${0.98 * r} ${-0.32 * r}`} />
    <path d={`M ${0.8 * r} ${-0.42 * r} L ${0.98 * r} ${-0.32 * r} L ${1.06 * r} ${-0.53 * r}`} />
  </g>
);

/** the swept silver hair over the top of the handset, its fringe across the forehead */
const HAIR = 'M -52 -60 C -56 -84, -50 -100, -40 -104 L -20 -122 L -20 -104 L 8 -128 L 6 -106 L 36 -124 L 28 -104 L 62 -110 L 44 -94 C 54 -88, 56 -74, 52 -58 C 40 -70, 30 -64, 18 -72 C 8 -62, -6 -70, -16 -64 C -28 -72, -40 -62, -52 -60 Z';
const BODY = { x: -50, y: -90, w: 100, h: 180, r: 26 };

export const QuicksilverGoggles: React.FC<CueProps> = ({ t, tip, tipAt, angle, beat, size, theme }) => {
  const { red: blue, bone, cyan } = theme.colors;
  const ink = '#090b0d';
  const turned = (s: number) => 90 * backOut(clamp01((s - tipAt) / TURN));
  // tipped clockwise its head points right, which is down for a viewer who has turned the phone the same way:
  // once down he flips himself round at his speed, head left, upright in the turned phone (2026-11-03)
  const flipAt = tipAt + TURN + 0.3;
  const flipped = (s: number) => 180 * flipOut(clamp01((s - flipAt) / FLIP));
  const total = (s: number) => turned(s) + flipped(s);
  const flip = flipped(t);
  // the gesture, timed from the tip: the goggles snap down a beat before it, a glint runs across them
  const snapAt = tipAt - beat * 1.1;
  const snap = clamp01((t - snapAt) / 0.12);
  const settle = t > snapAt + 0.12 ? Math.exp(-(t - snapAt - 0.12) * 14) * Math.cos((t - snapAt - 0.12) * 40) : 0;
  const gy = -60 + 48 * snap + 7 * settle; // up on the forehead → over the eyes, a bounce
  const tilt = 0.62 + 0.38 * snap; // pushed up they lie back on the head
  const glint = (a: number) => clamp01((t - a) / 0.28);
  const glintA = glint(tipAt - beat * 0.55);
  const glintB = glint(flipAt + FLIP + 0.2);
  // the blur of the turn and the flip: how far it swept in the last 0.1 s, the afterimages behind it
  const sweep = total(t) - total(t - 0.1);
  const trailOn = tip > 0 ? clamp01(sweep / 12) : 0;
  const ghosts = [0.035, 0.07, 0.105, 0.14].map(d => total(t - d) - angle).filter(r => r < flip - 1);
  // the hair blows back while it turns and springs as it lands and after the flip
  const springAt = (a: number) => (t > a ? Math.exp(-(t - a) * 6) * Math.sin((t - a) * 26) : 0);
  const spring = springAt(tipAt + TURN) + springAt(flipAt + FLIP);
  const hairSkew = -0.45 * Math.min(sweep, 40) + 9 * spring;
  // his lightning: a spark as the goggles snap, as it lands and as the flip ends
  const spark = Math.max(pulse(t, snapAt, 0.22), pulse(t, tipAt + TURN - 0.05, 0.24), pulse(t, flipAt + FLIP - 0.05, 0.24));
  // impatient: two buzzes, like a phone on vibrate
  const buzz = Math.max(pulse(t, tipAt + beat * 2, 0.34), pulse(t, tipAt + beat * 3, 0.34));
  const bx = buzz > 0 ? Math.sin(t * 190) * 3.2 * buzz : 0;
  const eyesOpen = 1 - 0.9 * pulse(t, tipAt - beat * 2.6, 0.16);
  const lens = (x: number, g: number, id: string) => (
    <g transform={`translate(${x}, 0)`}>
      <circle r={21} fill="url(#qs-cue-lens)" />
      <clipPath id={id}>
        <circle r={20} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d="M -15 -6 A 16 16 0 0 1 2 -16" fill="none" stroke="white" strokeWidth={4} strokeLinecap="round" opacity={0.5} />
        {g > 0 && g < 1 && <rect x={-60 + 110 * g} y={-40} width={12} height={80} fill="white" opacity={0.7} transform="rotate(28)" />}
      </g>
      <circle r={21} fill="none" stroke="url(#qs-cue-chrome)" strokeWidth={7} />
      <circle cx={x > 0 ? 19 : -19} cy={0} r={2.6} fill="#d9e0e6" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="qs-cue-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a525b" />
          <stop offset="0.45" stopColor="#23272c" />
          <stop offset="1" stopColor="#0d0f12" />
        </linearGradient>
        <linearGradient id="qs-cue-hair" x1="0" y1="1" x2="0.6" y2="0">
          <stop offset="0" stopColor="#8d99a5" />
          <stop offset="0.5" stopColor="#cdd5dc" />
          <stop offset="1" stopColor="#f4f7fa" />
        </linearGradient>
        <linearGradient id="qs-cue-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#9aa5b0" />
          <stop offset="0.55" stopColor="#5d6670" />
          <stop offset="1" stopColor="#dfe5ea" />
        </linearGradient>
        <radialGradient id="qs-cue-lens" cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#34495a" />
          <stop offset="0.7" stopColor="#0f161c" />
          <stop offset="1" stopColor="#05080a" />
        </radialGradient>
      </defs>
      <Arrow color={blue} on={1 - clamp01(tip * 1.6)} r={112} angle={angle} />
      {/* afterimages at the angles it just left */}
      {ghosts.map((r, k) => (
        <g key={k} transform={`rotate(${r})`} opacity={0.32 * (1 - k * 0.2) * trailOn}>
          <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.r} fill={blue} />
          <path d={HAIR} fill={cyan} />
        </g>
      ))}
      <g transform={`rotate(${flip})`}>
        {/* the blur: arcs behind both ends */}
        {trailOn > 0 && (
          <g fill="none" strokeLinecap="round" opacity={trailOn}>
            {[96, 108, 120].map((r, k) => {
              const a = (Math.min(sweep * 2.2, 70) * (1 - k * 0.18) * Math.PI) / 180;
              const s = Math.sin(a);
              const c = Math.cos(a);
              return (
                <g key={r} stroke={k === 1 ? bone : blue} strokeWidth={5 - k}>
                  <path d={`M ${-r * s} ${-r * c} A ${r} ${r} 0 0 1 0 ${-r}`} />
                  <path d={`M ${r * s} ${r * c} A ${r} ${r} 0 0 1 0 ${r}`} />
                </g>
              );
            })}
          </g>
        )}
        <g transform={`translate(${bx}, 0)`}>
          {/* the handset: gunmetal like his leather jacket, a chrome edge, the screen's glass */}
          <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.r} fill="url(#qs-cue-body)" stroke="#9aa4ae" strokeWidth={3} />
          <rect x={-42} y={-72} width={84} height={152} rx={18} fill="#14191e" />
          <path d="M -42 40 L 30 -72 L 42 -72 L -42 58 Z" fill="white" opacity={0.05} />
          <rect x={-14} y={70} width={28} height={4} rx={2} fill={bone} opacity={0.35} />
          {/* his eyes, sizing the viewer up, until the goggles come down over them */}
          {[-1, 1].map(side => (
            <g key={side} transform={`translate(${24 * side}, -12) scale(1, ${eyesOpen})`}>
              <path d="M -14 0 Q 0 -12, 14 0 Q 0 7, -14 0 Z" fill={bone} />
              <circle cx={3} cy={-1.5} r={4.6} fill={ink} />
            </g>
          ))}
          {/* the hair, swept back */}
          <g transform={`translate(0, -60) skewX(${hairSkew}) translate(0, 60)`}>
            <path d={HAIR} fill="url(#qs-cue-hair)" />
            <path d="M -34 -98 L -22 -112 M -6 -100 L 6 -118 M 18 -98 L 32 -114 M 38 -96 L 52 -106" stroke="#8a95a0" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
          </g>
          {/* the goggles: on the forehead, then down over the eyes */}
          <g transform={`translate(0, ${gy}) scale(1, ${tilt})`}>
            <rect x={-53} y={-6} width={106} height={12} rx={3} fill={ink} />
            <rect x={-53} y={-5} width={106} height={2} fill="white" opacity={0.12} />
            <rect x={-6} y={-3.5} width={12} height={7} rx={2} fill="url(#qs-cue-chrome)" />
            {lens(-24, glintA || glintB, 'qs-cue-l')}
            {lens(24, glintA || glintB, 'qs-cue-r')}
          </g>
          {/* the buzz: little lines either side while it vibrates */}
          {buzz > 0.05 && (
            <g stroke={bone} strokeWidth={4} strokeLinecap="round" fill="none" opacity={buzz}>
              <path d="M 62 -24 Q 70 0, 62 24" />
              <path d="M 72 -34 Q 82 0, 72 34" />
              <path d="M -62 -24 Q -70 0, -62 24" />
              <path d="M -72 -34 Q -82 0, -72 34" />
            </g>
          )}
        </g>
        {/* his lightning */}
        {spark > 0.05 && (
          <g opacity={spark} strokeLinejoin="round" strokeLinecap="round" fill="none">
            <path d="M 58 -78 L 70 -58 L 62 -54 L 78 -30 L 68 -28 L 86 -4" stroke={blue} strokeWidth={9} />
            <path d="M 58 -78 L 70 -58 L 62 -54 L 78 -30 L 68 -28 L 86 -4" stroke="white" strokeWidth={3} />
          </g>
        )}
      </g>
    </svg>
  );
};
