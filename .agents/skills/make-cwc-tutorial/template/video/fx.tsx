/**
 * The opener's finishing touches, for the episode: sparkle path traces (a glowing line that draws itself
 * and sheds twinkling sparkles), marker scratches that boil like hand-drawn ink, kinetic letters that
 * spring in one by one, a sprinkle of falling twinkles, and a soft entrance for each scene.
 */
import React from 'react';
import { AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { prog, smooth, Tag } from './parts';
import { C, sans } from './theme';

export type Pt = [number, number];

/** points along a path at fraction k (0..1) by arc length */
const along = (pts: Pt[], k: number): Pt => {
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = seg[seg.length - 1] * Math.max(0, Math.min(1, k));
  let i = 1;
  while (i < seg.length - 1 && seg[i] < L) i++;
  const a = seg[i - 1];
  const t = seg[i] > a ? (L - a) / (seg[i] - a) : 0;
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
};

/** a loop round a box centred on (cx, cy), with a little overshoot like a hand-drawn ring */
export const loopPts = (cx: number, cy: number, rx: number, ry: number, seed = 'r', turns = 1.1): Pt[] => {
  const a0 = -2.5 + random(`${seed}a`) * 0.5;
  return Array.from({ length: 90 }, (_, i) => {
    const t = i / 89;
    const a = a0 + t * Math.PI * 2 * turns;
    const g = 0.95 + 0.1 * t;
    const w = 1 + 0.03 * Math.sin(a * 3 + random(`${seed}w`) * 6);
    return [cx + Math.cos(a) * rx * g * w, cy + Math.sin(a) * ry * g * w] as Pt;
  });
};

/** a swoosh under a word: a shallow arc with a lifted tail */
export const swooshPts = (x0: number, x1: number, y: number, lift = 26): Pt[] =>
  Array.from({ length: 60 }, (_, i) => {
    const t = i / 59;
    return [x0 + (x1 - x0) * t, y + Math.sin(t * Math.PI) * 10 - Math.pow(t, 3) * lift] as Pt;
  });

const Star: React.FC<{ x: number; y: number; s: number; rot: number; color: string; o: number }> = ({ x, y, s, rot, color, o }) => (
  <path
    d="M0 -10 C 1.2 -2.4 2.4 -1.2 10 0 C 2.4 1.2 1.2 2.4 0 10 C -1.2 2.4 -2.4 1.2 -10 0 C -2.4 -1.2 -1.2 -2.4 0 -10 Z"
    transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
    fill={color}
    opacity={o}
  />
);

/**
 * A sparkle path trace over the frame: the line draws from `start` over `dur` frames with a bright head,
 * sparkles pop along the drawn part and twinkle out, and the line itself fades after `hold` frames.
 */
export const SparkTrace: React.FC<{ pts: Pt[]; start: number; dur?: number; hold?: number; width?: number; color?: string; sparkles?: number; seed?: string }> = ({
  pts,
  start,
  dur = 18,
  hold = 30,
  width = 5,
  color = C.clay,
  sparkles = 16,
  seed = 'trace',
}) => {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0 || t > dur + hold + 24) return null;
  const p = prog(frame, start, start + dur);
  const fade = 1 - prog(frame, start + dur + hold, start + dur + hold + 14);
  const head = along(pts, p);
  const d = smooth(pts);
  const id = `glow-${seed}`;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
      <defs>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
      </defs>
      <g opacity={fade}>
        <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width * 3} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - p} filter={`url(#${id})`} opacity={0.55} />
        <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - p} />
        <path d={d} pathLength={1} fill="none" stroke={C.ivoryLight} strokeWidth={width * 0.35} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - p} opacity={0.8} />
      </g>
      {p < 1 && t >= 0 && (
        <g>
          <circle cx={head[0]} cy={head[1]} r={width * 3.2} fill={C.ivoryLight} filter={`url(#${id})`} />
          <circle cx={head[0]} cy={head[1]} r={width * 1.1} fill={C.ivoryLight} />
        </g>
      )}
      {Array.from({ length: sparkles }, (_, i) => {
        const at = (i + random(`${seed}s${i}`) * 0.8) / sparkles;
        const born = start + at * dur;
        const age = (frame - born) / 22;
        if (age < 0 || age > 1) return null;
        const [x, y] = along(pts, at);
        const a = random(`${seed}d${i}`) * Math.PI * 2;
        const r = 10 + age * (18 + random(`${seed}r${i}`) * 26);
        const s = Math.sin(Math.PI * age) * (0.7 + random(`${seed}k${i}`) * 1.1);
        return <Star key={i} x={x + Math.cos(a) * r} y={y + Math.sin(a) * r} s={s} rot={age * 140 + i * 30} color={i % 3 ? C.ivoryLight : '#FFD9A8'} o={1 - age * 0.6} />;
      })}
    </svg>
  );
};

/** a hand-drawn marker scratch (zigzag strike-out) over a box, boiling at 12 fps like ink */
export const Scratch: React.FC<{ x: number; y: number; w: number; h: number; start: number; dur?: number; out?: number; color?: string; width?: number; seed?: string }> = ({
  x,
  y,
  w,
  h,
  start,
  dur = 9,
  out,
  color = C.clay,
  width = 9,
  seed = 'scr',
}) => {
  const frame = useCurrentFrame();
  if (frame < start) return null;
  const p = prog(frame, start, start + dur);
  const fade = out === undefined ? 1 : 1 - prog(frame, out, out + 5);
  const boil = Math.floor(frame / 2.5);
  const n = 7;
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const jx = (random(`${seed}x${i}${boil}`) - 0.5) * w * 0.05;
    const jy = (random(`${seed}y${i}${boil}`) - 0.5) * h * 0.06;
    return [x + (i % 2 ? w * 0.94 : w * 0.06) + jx, y + h * (0.16 + (0.7 * i) / (n - 1)) + jy] as Pt;
  });
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', opacity: fade }}>
      <path d={`M${pts.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L')}`} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} strokeDashoffset={1 - p} />
    </svg>
  );
};

/** a word whose letters spring in one after another (and can fly out towards the camera); `after` follows the letters (a caret) */
export const KWord: React.FC<{ text: string; start: number; x: number; y: number; size?: number; color?: string; align?: 'left' | 'center'; out?: number; fly?: boolean; stagger?: number; family?: string; weight?: number; after?: React.ReactNode }> = ({
  text,
  start,
  x,
  y,
  size = 140,
  color = C.ivoryLight,
  align = 'left',
  out,
  fly,
  stagger = 1.6,
  family = sans,
  weight = 800,
  after,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start - 2) return null;
  const o = out === undefined ? 0 : prog(frame, out, out + (fly ? 10 : 6));
  const flyS = fly ? 1 + o * 2.4 : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${align === 'center' ? '-50%' : '0'}, -50%) scale(${flyS})`,
        opacity: 1 - o,
        filter: o ? `blur(${o * 14}px)` : undefined,
        whiteSpace: 'nowrap',
        fontFamily: family,
        fontWeight: weight,
        fontSize: size,
        letterSpacing: '-0.045em',
        color,
        lineHeight: 1,
      }}
    >
      {[...text].map((ch, i) => {
        const s = spring({ frame: frame - start - i * stagger, fps, config: { damping: 13, stiffness: 190, mass: 0.7 } });
        const r = (random(`${text}${i}`) - 0.5) * 24;
        return (
          <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * size * 0.45}px) scale(${0.55 + 0.45 * s}) rotate(${(1 - s) * r}deg)`, opacity: Math.min(1, s * 1.4), whiteSpace: 'pre' }}>
            {ch}
          </span>
        );
      })}
      {after}
    </div>
  );
};

/** the motion reference's counter device, made kinetic: the clay [n] /of tag, and the word springing in under it */
export const KCount: React.FC<{ word: string; n: string; of: string; start: number; out: number; x: number; y: number; size?: number; dark?: boolean }> = ({
  word,
  n,
  of,
  start,
  out,
  x,
  y,
  size = 136,
  dark,
}) => {
  const frame = useCurrentFrame();
  if (frame < start - 4) return null;
  const fade = 1 - prog(frame, out, out + 6);
  const tag = Math.max(18, size * 0.17);
  return (
    <>
      <div style={{ position: 'absolute', left: x, top: y, opacity: prog(frame, start - 4, start) * fade }}>
        <Tag n={n} of={of} dark={dark} size={tag} />
      </div>
      <KWord text={word} start={start} x={x - 6} y={y + tag * 1.35 + 6 + size * 0.55} size={size} color={dark ? C.ivoryLight : C.slate} out={out} />
    </>
  );
};

/** twinkles falling over a region from `start` for `dur` frames */
export const Sprinkle: React.FC<{ x: number; y: number; w: number; h: number; start: number; dur?: number; count?: number; seed?: string }> = ({ x, y, w, h, start, dur = 60, count = 40, seed = 'spr' }) => {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0 || t > dur + 30) return null;
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => {
        const born = random(`${seed}b${i}`) * dur;
        const age = (t - born) / 34;
        if (age < 0 || age > 1) return null;
        const px = x + random(`${seed}x${i}`) * w;
        const py = y + random(`${seed}y${i}`) * h * 0.6 + age * h * 0.4;
        const s = Math.sin(Math.PI * age) * (0.5 + random(`${seed}s${i}`) * 1.2);
        return <Star key={i} x={px} y={py} s={s} rot={age * 200 + i * 17} color={i % 4 ? C.ivoryLight : C.clay} o={1 - age * 0.5} />;
      })}
    </svg>
  );
};

/** a soft entrance: the scene settles in from a slight blur and scale over its first frames */
export const SceneIn: React.FC<{ children: React.ReactNode; frames?: number }> = ({ children, frames = 9 }) => {
  const frame = useCurrentFrame();
  const k = prog(frame, 0, frames);
  return <AbsoluteFill style={{ opacity: 0.35 + 0.65 * k, transform: `scale(${1.035 - 0.035 * k})`, filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined }}>{children}</AbsoluteFill>;
};

