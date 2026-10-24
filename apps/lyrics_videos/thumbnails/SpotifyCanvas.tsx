/**
 * A Spotify Canvas (9:16, 3–8 s, looping, no text) from a poster job's picture: a slow breathing
 * push, the cut-out subject drifting a few px against its background for depth, embers rising,
 * the light pulsing and film grain. Every motion is periodic over the clip's length, so the last
 * frame flows into the first with no seam. Configured by `canvas` in the job's poster.json.
 */
import React from 'react';
import { AbsoluteFill, Img, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { src } from './fonts.ts';

export type CanvasSpec = {
  /** the 9:16 picture (crop or outcrop it first), relative to the job */
  src: string;
  /** its cutout, same size, for the depth drift (optional) */
  cut?: string;
  /** 3–8 (Spotify's limits), default 8 */
  seconds?: number;
  fps?: number;
  /** how much the picture breathes in, as a scale (default 0.04) */
  push?: number;
  /** px the subject drifts against the background (default 5) */
  drift?: number;
  /** rising embers (default 50; 0 for none) */
  embers?: number;
  /** colour of the embers and the pulsing light */
  glow?: string;
  /** film grain 0..1 (default 0.15) */
  grain?: number;
};

export type CanvasProps = { job: string; canvas: CanvasSpec };

const TAU = Math.PI * 2;

export const Canvas: React.FC<CanvasProps> = ({ job, canvas }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / durationInFrames; // 0..1, and 1 is 0 again
  const push = canvas.push ?? 0.04;
  const drift = canvas.drift ?? 5;
  const glow = canvas.glow ?? '#ff2d3d';
  const scale = 1 + push * (0.5 - 0.5 * Math.cos(TAU * t)) + 0.01;
  const cutShift = { x: drift * Math.sin(TAU * t), y: drift * 0.5 * Math.sin(TAU * t + Math.PI / 2) };
  const picture: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
  const embers = Array.from({ length: canvas.embers ?? 50 }, (_, i) => {
    // each ember rises a whole number of times per loop, so it wraps back to where it started
    const laps = 1 + Math.floor(random(`lap${i}`) * 2);
    const y = (random(`y${i}`) - t * laps + 10) % 1;
    const sway = Math.sin(TAU * (t * laps + random(`s${i}`))) * 18;
    const x = random(`x${i}`) * width + sway;
    const size = 2 + random(`r${i}`) * 5;
    const flicker = 0.45 + 0.55 * Math.abs(Math.sin(TAU * (t * (2 + Math.floor(random(`f${i}`) * 3)) + random(`p${i}`))));
    // fade in at the bottom, out near the top
    const fade = Math.min(1, (1 - y) * 4) * Math.min(1, y * 3);
    return { x, y: y * height, size, opacity: flicker * fade };
  });
  const pulse = 0.55 + 0.45 * Math.sin(TAU * t * 2);

  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img src={src(job, canvas.src)} style={picture} />
        {canvas.cut && <Img src={src(job, canvas.cut)} style={{ ...picture, transform: `translate(${cutShift.x}px, ${cutShift.y}px)` }} />}
      </AbsoluteFill>
      {/* the fire light breathing from the floor and the sides */}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          opacity: 0.35 * pulse,
          background: `radial-gradient(ellipse at 15% 80%, ${glow}aa 0%, transparent 45%), radial-gradient(ellipse at 85% 75%, ${glow}aa 0%, transparent 45%), radial-gradient(ellipse at 50% 100%, ${glow}88 0%, transparent 40%)`,
        }}
      />
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}>
        <defs>
          <filter id="ember-glow">
            <feGaussianBlur stdDeviation={3} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {embers.map((e, i) => (
          <circle key={i} cx={e.x} cy={e.y} r={e.size} fill={glow} opacity={e.opacity} filter="url(#ember-glow)" />
        ))}
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
      {(canvas.grain ?? 0.15) > 0 && (
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: canvas.grain ?? 0.15 }}>
          <filter id="canvas-grain">
            <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={frame % 24} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#canvas-grain)" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
