/**
 * Words on screen, in the styles of the prime references: R02's kinetic italic lines and huge
 * extruded words on a moving 3D camera, R12's quiet serif lines and dialogue subtitles with one
 * highlighted word, kanji columns that land a character per beat, words behind the subject, pills,
 * the character nameplate and stamped words.
 */
import React from 'react';
import { Easing, interpolate, random } from 'remotion';
import { FONTS, useFontsReady } from './fonts';
import { Motion, type Pass } from './motion';
import { Brush, Burn, Knockout, Lockup, Outline, Slam, Stack } from './type2';
import type { Cut, Words } from './types';

/** words drawn in the shot's behind-slot, under the subject's cutout */
export const isBehindWord = (w: Words) => w.style === 'behind' || w.style === 'outline' || !!w.behind || w.look === 'cutout';

const W = 1920;
const H = 1080;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0→1 entering over `inS`, 1→0 leaving over `outS` */
const envelope = (w: Words, t: number, inS = 0.25, outS = 0.25) =>
  Math.min(interpolate(t, [w.from, w.from + inS], [0, 1], clamp), interpolate(t, [w.to - outS, w.to], [1, 0], clamp));

/** R02's extrusion: copies stepping back and down, darker as they go */
const extrude = (depth: number, color: string, step = 1.6) =>
  Array.from({ length: depth }, (_, i) => `${((i + 1) * step * 0.6).toFixed(1)}px ${((i + 1) * step).toFixed(1)}px 0 ${color}`).join(', ');

export const WordsLayer: React.FC<{ w: Words; t: number; cut?: Cut; pass?: Pass }> = ({ w, t, cut, pass }) => {
  // fitted sizes and canvas-drawn letters need the faces loaded (the frame waits for them)
  const fonts = useFontsReady();
  if (t < w.from - 0.01 || t > w.to + 0.01 || !fonts) return null;
  switch (w.style) {
    case 'stack':
      return w.mo ? <Motion w={w} t={t} cut={cut} pass={pass} /> : <Stack w={w} t={t} />;
    case 'slam':
      return <Slam w={w} t={t} />;
    case 'lockup':
      return <Lockup w={w} t={t} />;
    case 'brush':
      return <Brush w={w} t={t} />;
    case 'outline':
      return <Outline w={w} t={t} />;
    case 'burn':
      return <Burn w={w} t={t} />;
    case 'knockout':
      return <Knockout w={w} t={t} cut={cut} />;
    case 'kinetic':
      return <Kinetic w={w} t={t} />;
    case 'hero':
      return <Hero w={w} t={t} />;
    case 'serif':
      return <Serif w={w} t={t} />;
    case 'subtitle':
      return <Subtitle w={w} t={t} />;
    case 'kanji':
      return <Kanji w={w} t={t} />;
    case 'behind':
      return <Behind w={w} t={t} />;
    case 'pill':
      return <Pill w={w} t={t} />;
    case 'nameplate':
      return <Nameplate w={w} t={t} />;
    case 'stamp':
      return <Stamp w={w} t={t} />;
    default:
      return null;
  }
};

const Box: React.FC<{ x?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x = 0.5, y = 0.5, children, style }) => (
  <div
    style={{
      position: 'absolute',
      left: x * W,
      top: y * H,
      transform: 'translate(-50%, -50%)',
      whiteSpace: 'nowrap',
      textAlign: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

/** R02 "he is a teacher": italic caps on a slowly turning 3D camera, letters arriving with a blur */
const Kinetic: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const size = (w.size ?? 0.085) * H;
  const k = interpolate(t, [w.from, w.to], [0, 1], clamp);
  const out = interpolate(t, [w.to - 0.3, w.to], [0, 1], clamp);
  const color = w.color ?? '#7fe9ff';
  const letters = [...w.text];
  return (
    <Box x={w.x} y={w.y} style={{ perspective: 900 }}>
      <div
        style={{
          transform: `rotateY(${(-16 + 9 * k).toFixed(2)}deg) rotateX(${(7 - 3 * k).toFixed(2)}deg) translateZ(${(40 * k).toFixed(1)}px)`,
          transformStyle: 'preserve-3d',
          filter: out > 0 ? `blur(${(out * 14).toFixed(1)}px)` : undefined,
          opacity: 1 - out,
        }}
      >
        {w.sub && (
          <div style={{ fontFamily: FONTS.label, fontWeight: 800, fontSize: size * 0.28, letterSpacing: '0.45em', color: '#cfefff', opacity: 0.85, marginBottom: size * 0.1, textShadow: '0 0 12px rgba(0,200,255,0.6)' }}>
            {w.sub.toUpperCase()}
          </div>
        )}
        <div style={{ fontFamily: FONTS.kinetic, fontWeight: 900, fontStyle: 'italic', fontSize: size, lineHeight: 1, letterSpacing: '0.02em' }}>
          {letters.map((ch, i) => {
            const a = interpolate(t, [w.from + i * 0.025, w.from + i * 0.025 + 0.18], [0, 1], clamp);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  color,
                  opacity: a,
                  filter: a < 1 ? `blur(${((1 - a) * 10).toFixed(1)}px)` : undefined,
                  transform: `translateY(${((1 - a) * -size * 0.25).toFixed(1)}px)`,
                  textShadow: `${extrude(7, '#03283d', 1.4)}, 0 0 ${(size * 0.35).toFixed(0)}px rgba(0, 210, 255, 0.55)`,
                  whiteSpace: 'pre',
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      </div>
    </Box>
  );
};

/** R02 "HE'S ALSO" / "LITTLE TROUBLE": one huge steel word, deep extrusion, slamming in on a 3D tilt */
const Hero: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const size = (w.size ?? 0.26) * H;
  const enter = interpolate(t, [w.from, w.from + 0.22], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const k = interpolate(t, [w.from, w.to], [0, 1], clamp);
  const out = interpolate(t, [w.to - 0.2, w.to], [0, 1], clamp);
  const face = w.color ?? '#d9f6ff';
  return (
    <Box x={w.x} y={w.y} style={{ perspective: 1100 }}>
      <div
        style={{
          transform: `rotateY(${(14 - 10 * k).toFixed(2)}deg) rotateX(${(6 - 2 * k).toFixed(2)}deg) scale(${(1.35 - 0.35 * enter + 0.05 * k).toFixed(3)})`,
          opacity: enter * (1 - out),
          filter: enter < 1 ? `blur(${((1 - enter) * 16).toFixed(1)}px)` : out > 0 ? `blur(${(out * 18).toFixed(1)}px)` : undefined,
        }}
      >
        <div style={{ position: 'relative', fontFamily: FONTS.hero, fontSize: size, lineHeight: 0.92, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {/* the extrusion, then the steel face drawn over it (a later sibling paints on top) */}
          <div style={{ position: 'absolute', left: 0, top: 0, color: '#0b3a55', textShadow: extrude(16, '#021520', 1.8) }}>{w.text}</div>
          <div
            style={{
              position: 'relative',
              color: 'transparent',
              backgroundImage: `linear-gradient(180deg, #ffffff 0%, ${face} 40%, #8fd3ee 56%, #2c6f92 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              filter: `drop-shadow(0 0 ${(size * 0.1).toFixed(0)}px rgba(0, 200, 255, 0.5))`,
            }}
          >
            {w.text}
          </div>
        </div>
        {w.sub && (
          <div style={{ fontFamily: FONTS.kinetic, fontStyle: 'italic', fontWeight: 900, fontSize: size * 0.2, color: '#9be8ff', letterSpacing: '0.3em', marginTop: size * 0.04 }}>
            {w.sub}
          </div>
        )}
      </div>
    </Box>
  );
};

/** R12 "Honored One." / "Yowai Mo.": a quiet serif line, letters breathing in one by one */
const Serif: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const size = (w.size ?? 0.06) * H;
  const out = interpolate(t, [w.to - 0.35, w.to], [0, 1], clamp);
  const letters = [...w.text];
  const step = Math.min(0.06, 0.6 / Math.max(1, letters.length));
  return (
    <Box
      x={w.x}
      y={w.y}
      // a soft dark pool under the line keeps it readable on bright frames (R12 sets these on black)
      style={{ padding: `${size * 0.5}px ${size * 1.4}px`, background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${(0.42 * (1 - out)).toFixed(2)}) 0%, transparent 70%)` }}
    >
      <div style={{ fontFamily: FONTS.serif, fontWeight: 500, fontSize: size, color: w.color ?? '#f4f1ea', letterSpacing: '0.04em', opacity: 1 - out, textShadow: `0 2px ${(size * 0.35).toFixed(0)}px rgba(0,0,0,0.85), 0 0 ${(size * 0.4).toFixed(0)}px ${w.accent ?? 'rgba(255,230,170,0.45)'}` }}>
        {letters.map((ch, i) => {
          const a = interpolate(t, [w.from + i * step, w.from + i * step + 0.3], [0, 1], clamp);
          return (
            <span key={i} style={{ opacity: a, filter: a < 1 ? `blur(${((1 - a) * 8).toFixed(1)}px)` : undefined, whiteSpace: 'pre' }}>
              {ch}
            </span>
          );
        })}
      </div>
      {w.sub && (
        <div style={{ fontFamily: FONTS.label, fontWeight: 700, fontSize: size * 0.24, letterSpacing: '0.5em', color: '#cfc7b5', marginTop: size * 0.3, opacity: (1 - out) * interpolate(t, [w.from + 0.4, w.from + 0.8], [0, 0.85], clamp) }}>
          {w.sub.toUpperCase()}
        </div>
      )}
    </Box>
  );
};

/** dialogue subtitle: spaced caps, one word lit (R12 / R18) */
const Subtitle: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const size = (w.size ?? 0.034) * H;
  const a = envelope(w, t, 0.18, 0.2);
  const hi = (w.hi ?? '').toLowerCase();
  return (
    <Box x={w.x ?? 0.5} y={w.y ?? 0.86}>
      <div
        style={{
          fontFamily: FONTS.label,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: '0.14em',
          color: w.color ?? '#ffffff',
          opacity: a,
          transform: `translateY(${((1 - a) * 12).toFixed(1)}px)`,
          textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)',
        }}
      >
        {w.text
          .toUpperCase()
          .split(' ')
          .map((word, i) => {
            const lit = hi && word.toLowerCase().replace(/[^a-z']/g, '') === hi;
            return (
              <span key={i} style={{ color: lit ? w.accent ?? '#ffd84a' : undefined, textShadow: lit ? `0 0 18px ${w.accent ?? '#ffd84a'}` : undefined }}>
                {word}{' '}
              </span>
            );
          })}
      </div>
    </Box>
  );
};

/** a vertical kanji column; each character lands on its beat with an ink bleed */
const Kanji: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const size = (w.size ?? 0.11) * H;
  const chars = [...w.text];
  const beats = w.beats ?? chars.map((_, i) => w.from + i * 0.4);
  const out = interpolate(t, [w.to - 0.3, w.to], [0, 1], clamp);
  return (
    <Box x={w.x} y={w.y}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.06, opacity: 1 - out }}>
        {chars.map((ch, i) => {
          const a = interpolate(t, [beats[i] ?? w.from, (beats[i] ?? w.from) + 0.14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <div
              key={i}
              style={{
                fontFamily: FONTS.jp,
                fontWeight: 800,
                fontSize: size,
                lineHeight: 1,
                color: w.color ?? '#f6e7c1',
                opacity: a,
                transform: `scale(${(1.6 - 0.6 * a).toFixed(3)})`,
                filter: a < 1 ? `blur(${((1 - a) * 18).toFixed(1)}px)` : undefined,
                textShadow: `0 0 ${(size * 0.25).toFixed(0)}px ${w.accent ?? 'rgba(255, 60, 40, 0.75)'}, 0 0 ${(size * 0.06).toFixed(0)}px #000`,
              }}
            >
              {ch}
            </div>
          );
        })}
      </div>
    </Box>
  );
};

/** R02 "WIN": a giant word behind him (drawn in the shot's behind-slot, under the cutout) */
export const Behind: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const size = (w.size ?? 0.5) * H;
  const a = interpolate(t, [w.from, w.from + 0.2], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = interpolate(t, [w.to - 0.2, w.to], [0, 1], clamp);
  return (
    <Box x={w.x} y={w.y}>
      <div
        style={{
          fontFamily: FONTS.hero,
          fontSize: size,
          lineHeight: 0.9,
          // wide, so the letters show either side of him
          letterSpacing: `${(0.1 + (1 - a) * 0.3).toFixed(3)}em`,
          color: w.color ?? '#33e6ff',
          opacity: a * (1 - out),
          textShadow: `0 0 ${(size * 0.12).toFixed(0)}px ${w.accent ?? 'rgba(0,229,255,0.8)'}`,
          transform: `scale(${(1.15 - 0.15 * a).toFixed(3)})`,
        }}
      >
        {w.text}
      </div>
    </Box>
  );
};

/** R02 "I'D WIN": a small black pill in front */
const Pill: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const size = (w.size ?? 0.04) * H;
  const a = envelope(w, t, 0.12, 0.15);
  return (
    <Box x={w.x} y={w.y}>
      <div
        style={{
          fontFamily: FONTS.label,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: '0.12em',
          color: '#fff',
          background: '#050505',
          borderRadius: size,
          padding: `${size * 0.32}px ${size * 0.9}px`,
          opacity: a,
          transform: `scale(${(0.8 + 0.2 * a).toFixed(3)})`,
          boxShadow: '0 6px 30px rgba(0,0,0,0.6)',
        }}
      >
        {w.text}
      </div>
    </Box>
  );
};

/** character card: kanji name, romaji, title (the S2 intro cards, R16's nameplate) */
const Nameplate: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const size = (w.size ?? 0.12) * H;
  const a = envelope(w, t, 0.35, 0.3);
  const line = interpolate(t, [w.from + 0.1, w.from + 0.6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <Box x={w.x ?? 0.78} y={w.y ?? 0.5} style={{ opacity: a, transform: `translate(-50%, -50%) translateX(${((1 - a) * 40).toFixed(1)}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3 }}>
        <div style={{ fontFamily: FONTS.jp, fontWeight: 800, fontSize: size, lineHeight: 1.02, writingMode: 'vertical-rl', color: '#fff', textShadow: '0 0 30px rgba(0,229,255,0.5)' }}>
          {w.text}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ width: size * 2.6 * line, height: 2, background: w.accent ?? '#33e6ff', marginBottom: size * 0.12, boxShadow: `0 0 12px ${w.accent ?? '#33e6ff'}` }} />
          <div style={{ fontFamily: FONTS.regal, fontWeight: 900, fontSize: size * 0.32, letterSpacing: '0.18em', color: '#fff' }}>{(w.sub ?? '').split('|')[0]}</div>
          <div style={{ fontFamily: FONTS.label, fontWeight: 700, fontSize: size * 0.13, letterSpacing: '0.45em', color: w.accent ?? '#9be8ff', marginTop: size * 0.08 }}>
            {(w.sub ?? '').split('|')[1] ?? ''}
          </div>
        </div>
      </div>
    </Box>
  );
};

/** one word slammed on a hit, with a shake */
const Stamp: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const size = (w.size ?? 0.2) * H;
  const a = interpolate(t, [w.from, w.from + 0.1], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const out = interpolate(t, [w.to - 0.15, w.to], [0, 1], clamp);
  const sh = (1 - Math.min(1, (t - w.from) / 0.35)) * 14;
  const f = Math.round(t * 30);
  return (
    <Box x={w.x} y={w.y} style={{ transform: `translate(-50%, -50%) translate(${((random(`st${f}`) - 0.5) * sh).toFixed(1)}px, ${((random(`sv${f}`) - 0.5) * sh).toFixed(1)}px)` }}>
      <div
        style={{
          fontFamily: w.accent === 'regal' ? FONTS.regal : FONTS.hero,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 0.95,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: w.color ?? '#ffffff',
          opacity: (1 - out) * Math.min(1, a * 1.5),
          transform: `scale(${(2.2 - 1.2 * a).toFixed(3)})`,
          textShadow: `0 0 ${(size * 0.15).toFixed(0)}px rgba(255,255,255,0.45), ${extrude(6, 'rgba(0,0,0,0.55)', 2)}`,
        }}
      >
        {w.text}
      </div>
      {w.sub && (
        <div style={{ fontFamily: FONTS.label, fontWeight: 800, fontSize: size * 0.16, letterSpacing: '0.4em', color: '#ffffffcc', marginTop: size * 0.05, opacity: 1 - out }}>
          {w.sub}
        </div>
      )}
    </Box>
  );
};
