import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { BODY, Captions, CREAM, HEAD, INK, Mark } from './Brand';
import { fadeIn, Phone, DEVICE } from './Phone';
import { clipsFrames, END_CARD, END_FADE, FPS, timeline } from './plan';

/*
 * The App Store preview (886 x 1920, the 6.9" iPhone size): the screenshots' look in motion. Cream
 * ground, the headline above, the phone below running off the bottom edge, then the end card.
 */

const W = 886;
const placed = timeline();
const END_AT = clipsFrames() - Math.round(END_FADE * FPS);

const Ground: React.FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    <div style={{ position: 'absolute', left: -70, top: 610, width: 230, height: 300, borderRadius: 48, background: '#e8e5dd' }} />
    <svg width={W} height={1920} style={{ position: 'absolute', inset: 0 }}>
      <circle cx={1010} cy={1180} r={430} fill="none" stroke="#e5e2da" strokeWidth={26} />
    </svg>
  </AbsoluteFill>
);

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const o = fadeIn(frame, END_AT, Math.round(END_FADE * FPS));
  const rise = (d: number) => 30 * (1 - fadeIn(frame, END_AT + d, 16));
  const a = (d: number) => fadeIn(frame, END_AT + d, 14);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ background: CREAM, opacity: o, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div style={{ transform: `translateY(${rise(4)}px) scale(${interpolate(a(4), [0, 1], [0.92, 1])})`, opacity: a(4) }}>
        <Mark size={230} color={INK} />
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 132, letterSpacing: '-0.04em', color: INK, marginTop: 34, transform: `translateY(${rise(8)}px)`, opacity: a(8) }}>
        Portal
      </div>
      <div style={{ fontFamily: BODY, fontSize: 40, color: '#4a4740', marginTop: 18, transform: `translateY(${rise(12)}px)`, opacity: a(12) }}>
        Your team’s work, in your pocket.
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 27, color: '#8a857b', marginTop: 48, letterSpacing: '0.02em', opacity: a(18) }}>
        Tasks · Worklogs · Projects · Goals · Chat
      </div>
    </AbsoluteFill>
  );
};

export const Preview: React.FC = () => {
  const scale = (W * 0.8) / DEVICE.w;
  const top = 430;
  return (
    <AbsoluteFill>
      <Ground />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 104, height: 300, display: 'flex', justifyContent: 'center' }}>
        <Captions placed={placed} style={{ align: 'center', width: 790, titleSize: 78, subSize: 33, title: '#121212', sub: '#6f6b63' }} />
      </div>
      <Phone placed={placed} x={(W - DEVICE.w * scale) / 2} y={top} scale={scale} />
      <EndCard />
    </AbsoluteFill>
  );
};

export const PREVIEW_SECONDS = clipsFrames() / FPS + END_CARD;
