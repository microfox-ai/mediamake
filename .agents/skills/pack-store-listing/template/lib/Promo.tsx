import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { BODY, Captions, CREAM, HEAD, INK, Mark } from './Brand';
import { DEVICE, fadeIn, Phone } from './Phone';
import { atPace, clipsFrames, END_CARD, END_FADE, FPS, timeline } from './plan';

/*
 * The Google Play promo video (1920 x 1080, for YouTube): the feature graphic's look in motion. Dark
 * ground with the big ring, the mark and the headline on the left, the phone on the right, then the end
 * card. The same cut as the App Store preview, played closer to real time.
 */

const W = 1920;
const H = 1080;
export const PROMO_CLIPS = atPace(0.45);
const placed = timeline(PROMO_CLIPS);
const END_AT = clipsFrames(PROMO_CLIPS) - Math.round(END_FADE * FPS);
export const PROMO_SECONDS = clipsFrames(PROMO_CLIPS) / FPS + END_CARD;

const Ground: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(1200px 900px at 78% 40%, #1a1a24 0%, ${INK} 62%)` }}>
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
      <circle cx={1420} cy={560} r={560} fill="none" stroke="rgba(242,240,234,0.055)" strokeWidth={46} />
      <circle cx={1420} cy={560} r={400} fill="none" stroke="rgba(242,240,234,0.035)" strokeWidth={2} />
    </svg>
  </AbsoluteFill>
);

const Lockup: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.32 }}>
    <Mark size={size} color={CREAM} />
    <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: size * 0.86, letterSpacing: '-0.035em', color: CREAM }}>Portal</div>
  </div>
);

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const o = fadeIn(frame, END_AT, Math.round(END_FADE * FPS));
  const a = (d: number) => fadeIn(frame, END_AT + d, 14);
  const rise = (d: number) => 26 * (1 - a(d));
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Ground />
      <div style={{ position: 'relative', transform: `translateY(${rise(4)}px) scale(${interpolate(a(4), [0, 1], [0.94, 1])})`, opacity: a(4) }}>
        <Lockup size={150} />
      </div>
      <div style={{ position: 'relative', fontFamily: BODY, fontSize: 46, color: '#cfccc4', marginTop: 40, transform: `translateY(${rise(9)}px)`, opacity: a(9) }}>
        Your team’s work, in your pocket.
      </div>
      <div style={{ position: 'relative', marginTop: 56, opacity: a(16), fontFamily: BODY, fontWeight: 600, fontSize: 30, color: INK, background: CREAM, borderRadius: 999, padding: '16px 36px' }}>
        Now on Google Play
      </div>
    </AbsoluteFill>
  );
};

export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = 1.04;
  const brand = fadeIn(frame, 0, 14);
  return (
    <AbsoluteFill>
      <Ground />
      <div style={{ position: 'absolute', left: 150, top: 120, opacity: brand }}>
        <Lockup size={62} />
      </div>
      <div style={{ position: 'absolute', left: 150, top: 380, height: 420 }}>
        <Captions placed={placed} style={{ align: 'left', width: 820, titleSize: 96, subSize: 38, title: CREAM, sub: '#a8a49b' }} />
      </div>
      <Phone placed={placed} x={1420 - (DEVICE.w * scale) / 2} y={96} scale={scale} shadow="0 40px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)" />
      <EndCard />
    </AbsoluteFill>
  );
};
