import React, { useId } from 'react';
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from 'remotion';
import type { SceneProps } from '../kit/contract';
import { useSongTime } from '../kit/hooks';
import { glyphFont, setGlyphs } from './glyphs';

export type ChannelTitleProps = {
  text: string;
  /** A registered font (glyphs.ts). */
  font: string;
  /** Its centre and baseline, frame px. */
  x: number;
  y: number;
  size: number;
  /** Letter spacing (em) it spreads from and to as it fades in. */
  tracking: [number, number];
  /** Song seconds: it fades in over `spread` s from `from` while spreading, and out over the last 0.6 s before `to`. */
  from: number;
  to: number;
  spread?: number;
  color?: string;
  /** Its glow colour. */
  glow?: string;
};

/**
 * The channel's name under the logo at the end, letter-spaced, its letters spreading apart as it fades in. Drawn
 * from the font's outlines (glyphs.ts), so a brand face that is a system font (Avenir) needs no web font. Built for
 * Hollow Soul (AMZ, 2026-11-09): "show the logo at the end actually when the blur in starts and show the channel
 * title below logo letter spaced apart". Put the layer at 'all': it times itself by `from` and `to`.
 */
export const ChannelTitle: React.FC<SceneProps<ChannelTitleProps>> = ({ text, font, x, y, size, tracking, from, to, spread = 1.8, color = '#ffffff', glow = '#ffffff' }) => {
  const t = useSongTime();
  const { width: W, height: H } = useVideoConfig();
  const filterId = `channel-glow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (t < from - 0.05 || t > to + 0.05) return null;
  const F = glyphFont(font);
  const p = interpolate(t, [from, from + spread], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const out = interpolate(t, [to - 0.6, to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const { glyphs, width } = setGlyphs(F, text, size, tracking[0] + (tracking[1] - tracking[0]) * p);
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id={filterId} x="-10%" y="-80%" width="120%" height="260%">
            <feFlood floodColor={glow} floodOpacity="0.55" result="c" />
            <feComposite in="c" in2="SourceAlpha" operator="in" result="g" />
            <feGaussianBlur in="g" stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g opacity={p * out} transform={`translate(${x - width / 2} ${y})`} filter={`url(#${filterId})`}>
          {glyphs.map((g, k) => (
            <path key={k} d={g.d} transform={`translate(${g.x} 0) scale(${g.s})`} fill={color} />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
