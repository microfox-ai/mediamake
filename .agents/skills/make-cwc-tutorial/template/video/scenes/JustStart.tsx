import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, random, Sequence, spring, useCurrentFrame } from 'remotion';
import type { SceneProps } from '@mediamake/engine';
import { KWord, loopPts, SparkTrace, Sprinkle } from '../fx';
import { Caret, Ground, prog, Sfx, Tag } from '../parts';
import { C, easeInOut, f, H, sans, src, W } from '../theme';
import { MUSIC, STATION_ORDER, T, THEME_FINAL } from '../timeline';

const J = T.just;
const S = (s: number) => s - J.from;
const VO = S(J.vo);
/** the theme's final hit */
const HIT = S(MUSIC.find(m => m.name === 'pantry')!.at + THEME_FINAL);
const CARD_W = 900;
const CARD_H = 500;
/** the last letter has sprung in */
const TYPED = f(VO) + Math.round('just start.'.length * 1.4) + 4;
const CX = W / 2;
const CY = H / 2 + 10;

/**
 * The page follows the read "Now, it can be your idea, your name. Just start.": "your idea" springs onto
 * it with question marks popping round it, "idea" is retyped as "name", then the line is deleted and
 * "just start." takes its place.
 */
const IDEA = 'your idea';
const NAME = 'your name';
const IDEA_IN = S(J.idea);
const SWAP_DEL = S(J.name) - 0.45;
const SWAP_TYPE = S(J.name) + 0.05;
const NAME_DEL = VO - 0.55;
/** frames per typed or deleted letter */
const DEL_STEP = 1.4;
/** the question marks turn into the brands' logos, one by one */
const LOGOS_IN = NAME_DEL + 0.13;
/** the line on the page at a frame */
const lineAt = (frame: number) => {
  const steps = (from: number) => Math.max(0, Math.floor((frame - f(from)) / DEL_STEP));
  if (frame >= f(NAME_DEL)) return NAME.slice(0, Math.max(0, NAME.length - steps(NAME_DEL)));
  if (frame >= f(SWAP_TYPE)) return 'your ' + 'name'.slice(0, Math.min(4, 1 + steps(SWAP_TYPE)));
  if (frame >= f(SWAP_DEL)) return IDEA.slice(0, Math.max(5, IDEA.length - steps(SWAP_DEL)));
  return IDEA;
};
/** a few more question marks further out, which just pop and go */
const STRAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.4 + random(`qa${i}`) * 0.3;
  return { x: CX + Math.cos(a) * (560 + random(`qr${i}`) * 150), y: CY + Math.sin(a) * (330 + random(`qy${i}`) * 90), size: 56 + random(`qs${i}`) * 40 };
});

/** a question mark that springs in at `at` (frame), tilts and floats, and shrinks out at `out` */
const Q: React.FC<{ x: number; y: number; size: number; at: number; out: number; seed: string; color: string }> = ({ x, y, size, at, out, seed, color }) => {
  const frame = useCurrentFrame();
  if (frame < at - 1 || frame > out + 6) return null;
  const s = spring({ frame: frame - at, fps: 30, config: { damping: 9, stiffness: 200, mass: 0.6 } });
  const o = prog(frame, out, out + 5);
  const r = (random(`${seed}r`) - 0.5) * 40;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + Math.sin(frame / 9 + random(`${seed}p`) * 6) * 6,
        transform: `translate(-50%, -50%) scale(${s * (1 - o)}) rotate(${r * (1.4 - s * 0.4)}deg)`,
        fontFamily: sans,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        color,
        opacity: Math.min(1, s * 1.5) * (1 - o),
        textShadow: '0 12px 24px rgba(0,0,0,0.5)',
      }}
    >
      ?
    </div>
  );
};

/** the fourteen logos, still, on an ellipse round the empty page */
const logoSpot = (k: number) => {
  const a = -Math.PI / 2 + (k / STATION_ORDER.length) * Math.PI * 2 + 0.12;
  return { x: CX + Math.cos(a) * 790, y: CY + Math.sin(a) * 405 };
};

/** 101.9–110.7 s: "your idea" → "your name" with question marks popping round it, deleted into "Just start."; every brand's logo round it, a sprinkle of sparks on the theme's last hit. */
export const JustStart: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const settle = prog(t, 0, 1.3, easeInOut);
  // no fade to black: a straight cut to the end card, under a whoosh
  const fade = 0;
  const pulse = Math.sin(Math.PI * prog(t, HIT - 0.05, HIT + 0.5));
  return (
    <AbsoluteFill style={{ opacity: 1 - fade }}>
      <Ground kind="slate" />
      {/* hands at a keyboard (Pexels stock), dimmed and warm, slowly closing in */}
      <AbsoluteFill style={{ opacity: 0.55, transform: `scale(${1.06 + t * 0.012})` }}>
        <OffthreadVideo src={src('stock/cut/typing.mp4')} muted style={{ width: W, height: H, objectFit: 'cover' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(20,20,19,0.35) 0%, rgba(20,20,19,0.88) 100%)' }} />

      {STATION_ORDER.map((id, k) => {
        const { x, y } = logoSpot(k);
        const s = spring({ frame: frame - f(LOGOS_IN) - k * 2, fps: 30, config: { damping: 12, stiffness: 160, mass: 0.8 } });
        const bob = Math.sin(t * 1.5 + k * 1.7) * 8;
        return (
          <Img
            key={id}
            src={src(`tex/logo-hq/${id}.png`)}
            style={{
              position: 'absolute',
              left: x - 95,
              top: y - 65 + bob,
              width: 190,
              height: 130,
              objectFit: 'contain',
              opacity: Math.min(1, s * 1.3),
              transform: `scale(${(0.4 + 0.6 * s) * (1 + 0.08 * pulse)})`,
              filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.6))',
            }}
          />
        );
      })}

      {/* the question marks: one on every logo's spot (each turns into its logo), and a few strays */}
      {STATION_ORDER.map((id, k) => {
        const { x, y } = logoSpot(k);
        return <Q key={id} x={x} y={y} size={96 + random(`qz${k}`) * 50} at={f(IDEA_IN) + 2 + Math.round(random(`qt${k}`) * 22)} out={f(LOGOS_IN) + k * 2 - 4} seed={`q${k}`} color={k % 3 === 0 ? C.clay : C.ivoryLight} />;
      })}
      {STRAYS.map((q, i) => (
        <Q key={i} x={q.x} y={q.y} size={q.size} at={f(IDEA_IN) + 6 + i * 3} out={f(LOGOS_IN) + i * 2} seed={`qs${i}`} color={i % 2 ? '#8f8d86' : C.clay} />
      ))}

      {/* the empty page: tilted in depth, settling flat (no turning) */}
      <div style={{ position: 'absolute', inset: 0, perspective: 1800 }}>
        <div
          style={{
            position: 'absolute',
            left: CX - CARD_W / 2,
            top: CY - CARD_H / 2,
            width: CARD_W,
            height: CARD_H,
            background: C.ivoryLight,
            borderRadius: 28,
            boxShadow: `0 50px 110px rgba(0,0,0,0.55), 0 0 ${60 * pulse}px rgba(217,119,87,${0.55 * pulse})`,
            transform: `translateZ(${(1 - settle) * -260}px) rotateX(${(1 - settle) * 18}deg) rotateY(${(1 - settle) * -12}deg)`,
            opacity: prog(t, 0, 0.35),
          }}
        >
          <Tag label="your_brand" size={26} style={{ position: 'absolute', left: 46, top: 42 }} />
          {t < IDEA_IN ? (
            <div style={{ position: 'absolute', left: CARD_W / 2 - 3, top: CARD_H / 2 - 50 }}>
              <Caret height={100} color={C.slate} width={7} />
            </div>
          ) : t < VO ? (
            <KWord
              text={lineAt(frame)}
              start={f(IDEA_IN)}
              x={CARD_W / 2}
              y={CARD_H / 2 + 4}
              size={140}
              color={C.cloud}
              align="center"
              stagger={1.2}
              after={<Caret height={104} color={C.clay} width={8} blinkFrom={f(IDEA_IN) + 14} />}
            />
          ) : (
            <KWord text="just start." start={f(VO)} x={CARD_W / 2} y={CARD_H / 2 + 4} size={150} color={C.slate} align="center" stagger={1.4} after={<span style={{ opacity: frame >= TYPED ? 1 : 0 }}><Caret height={110} color={C.clay} width={8} blinkFrom={TYPED} /></span>} />
          )}
        </div>
      </div>

      {/* the sprinkle, on the theme's last hit */}
      <Sequence from={f(HIT - 0.15)} durationInFrames={f(S(J.to) - HIT + 0.15)} layout="none">
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.8 * (1 - prog(t, HIT + 2.6, HIT + 3.6)) }}>
          <OffthreadVideo src={src('stock/cut/sparks.mp4')} muted style={{ width: W, height: H, objectFit: 'cover' }} />
        </AbsoluteFill>
      </Sequence>
      <SparkTrace pts={loopPts(CX, CY, 680, 380, 'just')} start={f(HIT)} dur={18} hold={36} width={6} seed="just" sparkles={22} />
      <Sprinkle x={CX - 700} y={CY - 420} w={1400} h={840} start={f(HIT)} dur={75} count={60} seed="just" />

      <Sfx name="cwc-whoosh-b" at={0} volume={0.35} />
      {STRAYS.map((_, i) => (i % 2 === 0 ? <Sfx key={`q${i}`} name="intro-pop" at={f(IDEA_IN) + 6 + i * 3} volume={0.16} /> : null))}
      {[f(SWAP_DEL), f(SWAP_DEL) + 4, f(SWAP_TYPE), f(SWAP_TYPE) + 3].map((a, i) => (
        <Sfx key={`s${i}`} name="intro-key" at={a} volume={0.2} />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Sfx key={`d${i}`} name="intro-key" at={f(NAME_DEL) + Math.round(i * 2.4 * DEL_STEP)} volume={0.2} />
      ))}
      {STATION_ORDER.map((_, k) => (k % 3 === 0 ? <Sfx key={k} name="intro-pop" at={f(LOGOS_IN) + k * 2} volume={0.18} /> : null))}
      <Sfx name="cwc-sparkle" at={f(HIT)} volume={0.45} />
      <Sfx name="cwc-whoosh-a" at={f(S(J.to) - 0.35)} volume={0.4} />
      <Sfx name="intro-3-sparkle" at={f(HIT + 0.1)} volume={0.3} />
    </AbsoluteFill>
  );
};
