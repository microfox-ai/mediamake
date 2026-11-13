import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { loadFont as loadInterTight } from '@remotion/google-fonts/InterTight';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { CAPTIONS, captionAt, type Placed } from './plan';
import { fadeIn } from './Phone';

/*
 * Portal's look for the store: Inter Tight for headlines and Inter for the rest (the brand kit's body
 * face), ink and cream as on the screenshots, and the mark (a ring around a rounded square,
 * portal/public/brand/portal-logo.svg).
 */

export const HEAD = loadInterTight('normal', { weights: ['700', '800'], subsets: ['latin'] }).fontFamily;
export const BODY = loadInter('normal', { weights: ['400', '500', '600'], subsets: ['latin'] }).fontFamily;
export const INK = '#0a0a0b';
export const CREAM = '#f2f0ea';

export const Mark: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="100 100 800 800">
    <circle cx="500" cy="500" r="353" fill="none" stroke={color} strokeWidth="34.4" />
    <path d="M500 375h103a22 22 0 0 1 22 22v206a22 22 0 0 1 -22 22h-206a22 22 0 0 1 -22 -22v-206a22 22 0 0 1 22 -22Z" fill={color} />
  </svg>
);

type CaptionStyle = {
  align: 'center' | 'left';
  width: number;
  titleSize: number;
  subSize: number;
  title: string;
  sub: string;
};

/** The headline for the stretch being shown: the old one lifts away, the new one rises in. */
export const Captions: React.FC<{ placed: Placed[]; style: CaptionStyle; hideAfter?: number }> = ({ placed, style, hideAfter }) => {
  const frame = useCurrentFrame();
  const { index, since } = captionAt(frame, placed);
  const before = since > 0 ? captionAt(since - 1, placed).index : null;
  const out = since > 0 ? interpolate(frame, [since, since + 7], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const inn = since > 0 ? fadeIn(frame, since + 5, 12) : fadeIn(frame, 3, 14);
  const gone = hideAfter !== undefined ? 1 - fadeIn(frame, hideAfter, 10) : 1;
  const block = (i: number, o: number, dy: number) => (
    <div style={{ position: 'absolute', inset: 0, opacity: o * gone, transform: `translateY(${dy}px)`, textAlign: style.align }}>
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: style.titleSize, lineHeight: 1.02, letterSpacing: '-0.035em', color: style.title, textWrap: 'balance' as never }}>
        {CAPTIONS[i].title}
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 400, fontSize: style.subSize, lineHeight: 1.3, color: style.sub, marginTop: style.subSize * 0.7, textWrap: 'balance' as never }}>
        {CAPTIONS[i].sub}
      </div>
    </div>
  );
  return (
    <div style={{ position: 'relative', width: style.width, height: '100%' }}>
      {before !== null && out > 0 ? block(before, out, -18 * (1 - out)) : null}
      {block(index, inn, 22 * (1 - inn))}
    </div>
  );
};
