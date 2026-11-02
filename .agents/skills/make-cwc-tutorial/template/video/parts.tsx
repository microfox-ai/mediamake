import React from 'react';
import { AbsoluteFill, Audio, interpolate, random, Sequence, useCurrentFrame } from 'remotion';
import { C, ease, f, mono, sans, src } from './theme';
import { vo } from './timeline';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0 → 1 between two frames, eased. */
export const prog = (frame: number, from: number, to: number, easing = ease) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing });

/** Frame of a song second inside a layer that starts at `from` (song seconds). */
export const at = (s: number, from: number) => f(s - from);

// ---------------------------------------------------------------- grounds

export const Ground: React.FC<{ kind: 'ivory' | 'slate' | 'oat' }> = ({ kind }) => {
  if (kind === 'slate') {
    return (
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 75% at 50% 45%, #22221F 0%, ${C.slate} 60%, #0B0B0A 100%)` }} />
    );
  }
  const base = kind === 'oat' ? C.oat : C.ivory;
  return <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 45%, ${C.ivoryLight} 0%, ${base} 55%, #D9D4C8 100%)` }} />;
};

/** Film grain over everything: a noise tile, moved every frame (shared with v1: input/fx). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.12 }) => {
  const frame = useCurrentFrame();
  const x = Math.floor(random(`gx${frame}`) * 512);
  const y = Math.floor(random(`gy${frame}`) * 512);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${src(`fx/grain-${frame % 4}.png`)})`,
        backgroundPosition: `${x}px ${y}px`,
        mixBlendMode: 'overlay',
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};

// ---------------------------------------------------------------- type

/** The clay counter tag: [01] /03, or a mono label like prompt_00. */
export const Tag: React.FC<{ n?: string; of?: string; label?: string; dark?: boolean; size?: number; style?: React.CSSProperties }> = ({
  n,
  of,
  label,
  dark,
  size = 22,
  style,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.45, fontFamily: mono, fontWeight: 800, fontSize: size, ...style }}>
    <span style={{ background: C.clay, color: C.ivoryLight, padding: `${size * 0.12}px ${size * 0.4}px`, lineHeight: 1.1 }}>{n ?? label}</span>
    {of && <span style={{ color: dark ? '#8f8d86' : C.cloud, fontWeight: 400 }}>/{of}</span>}
  </div>
);

export const Caret: React.FC<{ height: number; color: string; blinkFrom?: number; width?: number }> = ({ height, color, blinkFrom = 0, width }) => {
  const frame = useCurrentFrame();
  const on = frame < blinkFrom || Math.floor((frame - blinkFrom) / 15) % 2 === 0;
  return (
    <span
      style={{ display: 'inline-block', width: width ?? Math.max(3, height * 0.06), height, background: color, opacity: on ? 1 : 0, marginLeft: height * 0.18, verticalAlign: 'middle' }}
    />
  );
};

/** Text typed in from frame `start` at `cps` characters a second. */
export const typed = (text: string, frame: number, start: number, cps = 30) =>
  text.slice(0, Math.max(0, Math.floor(((frame - start) * cps) / 30)));

/** A big single word typed with a caret, under a clay counter (the motion reference's device). */
export const Word: React.FC<{ word: string; start: number; x: number; y: number; size?: number; dark?: boolean; n?: string; of?: string; label?: string; out?: number }> = ({
  word,
  start,
  x,
  y,
  size = 140,
  dark,
  n,
  of,
  label,
  out,
}) => {
  const frame = useCurrentFrame();
  if (frame < start - 4) return null;
  const color = dark ? C.ivoryLight : C.slate;
  const fade = out === undefined ? 1 : 1 - prog(frame, out, out + 6);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: prog(frame, start - 4, start) * fade }}>
      {(n || label) && <Tag n={n} of={of} label={label} dark={dark} size={Math.max(18, size * 0.17)} />}
      <div style={{ marginTop: 6, fontFamily: sans, fontWeight: 800, fontSize: size, letterSpacing: '-0.045em', color, lineHeight: 1.05, whiteSpace: 'nowrap' }}>
        {typed(word, frame, start, 26)}
        <Caret height={size * 0.62} color={color} blinkFrom={start + 8} />
      </div>
    </div>
  );
};

/** The dashed selection box with handles and a clay tag (the opener's prompt_01 device). */
export const SelectBox: React.FC<{ tag: string; children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }> = ({ tag, children, dark, style }) => {
  const ink = dark ? C.ivoryLight : C.slate;
  const handle = (s: React.CSSProperties) => <div style={{ position: 'absolute', width: 12, height: 12, background: ink, ...s }} />;
  return (
    <div style={{ display: 'inline-block', ...style }}>
      <Tag label={tag} dark={dark} size={20} />
      <div style={{ position: 'relative', marginTop: 8, padding: '12px 24px', border: `2px dashed ${dark ? '#8f8d86' : '#2a2a28'}` }}>
        {handle({ top: -7, left: -7 })}
        {handle({ top: -7, right: -7 })}
        {handle({ bottom: -7, left: -7 })}
        {handle({ bottom: -7, right: -7 })}
        {children}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- marker

export const smooth = (pts: Array<[number, number]>) => {
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

/** A hand-drawn clay loop round a box (x, y = its centre), drawn in like a marker. */
export const Loop: React.FC<{ x: number; y: number; w: number; h: number; start: number; dur?: number; seed?: string; width?: number; color?: string }> = ({
  x,
  y,
  w,
  h,
  start,
  dur = 12,
  seed = 'loop',
  width = 5,
  color = C.clay,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, start, start + dur);
  if (p <= 0) return null;
  const a0 = -2.4 + random(`${seed}a`) * 0.6;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = a0 + t * Math.PI * 2 * 1.12;
    const grow = 0.94 + t * 0.12;
    const wob = 1 + 0.035 * Math.sin(a * 3 + random(`${seed}w`) * 6);
    pts.push([w / 2 + 14 + Math.cos(a) * (w / 2) * grow * wob, h / 2 + 14 + Math.sin(a) * (h / 2) * grow * wob]);
  }
  return (
    <svg style={{ position: 'absolute', left: x - w / 2 - 14, top: y - h / 2 - 14, overflow: 'visible' }} width={w + 28} height={h + 28}>
      <path d={smooth(pts)} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - p} />
    </svg>
  );
};

// ---------------------------------------------------------------- UI bits

/** A mouse pointer whose tip sits at (x, y). */
export const Pointer: React.FC<{ x: number; y: number; pressed?: number }> = ({ x, y, pressed = 0 }) => (
  <svg style={{ position: 'absolute', left: x - 6, top: y - 4, transform: `scale(${1 - pressed * 0.12})`, transformOrigin: '6px 4px', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.4))' }} width={56} height={64} viewBox="0 0 28 32">
    <path d="M3 2 L3 25 L9 19.5 L13 29 L17 27.3 L13 18 L21 18 Z" fill="#fff" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

/** A big keyboard key that slams in at `start` and is pressed; its label is the spoken word. */
export const Keycap: React.FC<{ keys: string; label: string; x: number; y: number; start: number; out?: number; dark?: boolean }> = ({ keys, label, x, y, start, out, dark }) => {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < -2) return null;
  const s = interpolate(t, [-2, 3, 6, 9, 12], [1.6, 0.94, 1.03, 0.96, 1], clamp);
  const press = t >= 5 && t <= 9;
  const fade = out === undefined ? 1 : 1 - prog(frame, out, out + 6);
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${s})`, opacity: prog(frame, start - 2, start + 1) * fade, textAlign: 'center' }}>
      <div
        style={{
          display: 'inline-block',
          minWidth: 220,
          fontFamily: mono,
          fontWeight: 800,
          fontSize: 64,
          color: dark ? C.slate : C.ivoryLight,
          background: dark ? C.ivoryLight : C.slateLift,
          border: `3px solid ${dark ? '#cfcac0' : '#3a3a37'}`,
          borderBottomWidth: press ? 3 : 14,
          borderRadius: 26,
          padding: '22px 40px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.28)',
        }}
      >
        {keys}
      </div>
      <div style={{ marginTop: 22, fontFamily: sans, fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', color: dark ? C.ivoryLight : C.slate }}>{label}</div>
    </div>
  );
};

/** A Claude window: title bar, mono body. */
export const Window: React.FC<{ x: number; y: number; w: number; h: number; title: string; children?: React.ReactNode; style?: React.CSSProperties; desktop?: boolean }> = ({
  x,
  y,
  w,
  h,
  title,
  children,
  style,
  desktop,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      background: desktop ? '#262624' : '#161615',
      border: `1.5px solid ${desktop ? '#3d3d3a' : '#2c2c2a'}`,
      borderRadius: 22,
      boxShadow: '0 40px 90px rgba(0,0,0,0.32)',
      overflow: 'hidden',
      ...style,
    }}
  >
    <div style={{ height: 54, display: 'flex', alignItems: 'center', padding: '0 22px', borderBottom: '1.5px solid #2f2f2c', position: 'relative' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 13, height: 13, borderRadius: 7, background: '#4a4a46', marginRight: 9 }} />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontWeight: 700, fontSize: 19, color: '#8f8d86' }}>{title}</div>
    </div>
    <div style={{ padding: '26px 32px', fontFamily: mono, fontWeight: 400, fontSize: 26, lineHeight: 1.55, color: C.ivoryLight }}>{children}</div>
  </div>
);

// ---------------------------------------------------------------- sound

/** A sound effect (input/sfx2) at a frame of the current layer; `dur` cuts a loop short with a fade. */
export const Sfx: React.FC<{ name: string; at: number; volume?: number; dur?: number; from?: number }> = ({ name, at: a, volume = 0.6, dur, from = 0 }) => (
  <Sequence from={Math.round(a)} durationInFrames={dur} layout="none" name={`sfx ${name}`}>
    <Audio
      src={src(`sfx2/${name}.wav`)}
      startFrom={from}
      volume={dur ? t => volume * interpolate(t, [0, 3, dur - 6, dur], [0, 1, 1, 0], clamp) : volume}
    />
  </Sequence>
);

/** A voice chunk starting at song second `at`, inside a layer starting at `from`. */
export const Vo: React.FC<{ id: string; at: number; from?: number }> = ({ id, at: a, from = 0 }) => {
  const c = vo(id);
  return (
    <Sequence from={f(a - from)} durationInFrames={f(c.duration) + 2} layout="none" name={`vo ${id}`}>
      <Audio src={src(c.file)} />
    </Sequence>
  );
};
