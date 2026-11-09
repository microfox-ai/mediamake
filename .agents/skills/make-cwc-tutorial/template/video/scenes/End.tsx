import React from 'react';
import { AbsoluteFill, Audio, useCurrentFrame } from 'remotion';
import type { SceneProps } from '@mediamake/engine';
import { CookWithClaudeLogo, LOGO_VIEW } from '../../../../brands/cookwithclaude/graphics/Logo';
import { loopPts, SparkTrace } from '../fx';
import { Caret, Ground, prog, Sfx, typed } from '../parts';
import { brush, C, f, lilita, src, W } from '../theme';
import { T } from '../timeline';

const E = T.end;
const S = (s: number) => s - E.from;
const QUESTION = 'what do you wish to make next?';
/** the question is typed out (18 characters a second) */
const TYPED = S(E.type) + QUESTION.length / 18 + 0.15;

/** 110.7–130.7 s: the end card — the prompt box asks the question; card slots stay clear for YouTube. */
export const End: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const v = LOGO_VIEW;
  const lw = 700;
  const lh = (lw * v.h) / v.w;
  const box = prog(t, 1.2, 1.7);
  const typeAt = f(S(E.type));
  const note = prog(t, TYPED + 1.5, TYPED + 2.0);
  const out = prog(t, S(E.to) - 0.6, S(E.to));
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Ground kind="slate" />
      <div style={{ position: 'absolute', left: (W - lw) / 2, top: 90, width: lw, height: lh }}>
        <CookWithClaudeLogo on="slate" />
      </div>
      <div style={{ position: 'absolute', left: 330, top: 470, width: 1260, height: 128, borderRadius: 30, background: '#262624', border: '2px solid #3d3d3a', display: 'flex', alignItems: 'center', padding: '0 34px', boxSizing: 'border-box', opacity: box, transform: `translateY(${(1 - box) * 30}px)`, boxShadow: '0 30px 70px rgba(0,0,0,0.45)' }}>
        <span style={{ flex: 1, fontFamily: lilita, fontSize: 64, color: C.ivoryLight, letterSpacing: '0.005em' }}>
          {typed(QUESTION, frame, typeAt, 18)}
          <Caret height={58} color={C.clay} width={5} blinkFrom={typeAt + f(1.8)} />
        </span>
        <span style={{ width: 70, height: 70, borderRadius: 35, background: C.clay, color: C.ivoryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: lilita, fontSize: 38 }}>↑</span>
      </div>
      <div style={{ position: 'absolute', left: 1150, top: 630, fontFamily: brush, fontSize: 64, color: C.clay, transform: `rotate(-4deg) translateY(${(1 - note) * 14}px)`, opacity: note }}>
        tell us below ↓
      </div>
      <SparkTrace pts={loopPts(960, 534, 760, 140, 'ask', 1.06)} start={f(TYPED)} dur={20} hold={24} width={5} seed="ask" sparkles={20} />
      <Audio src={src('kit2/end-prompt.mp4')} volume={0.9} />
      <Sfx name="cwc-sparkle" at={f(TYPED)} volume={0.3} />
      {Array.from({ length: Math.ceil(QUESTION.length / 2) }, (_, i) => (
        <Sfx key={i} name="intro-key" at={typeAt + Math.round((i * 2 * 30) / 18)} volume={0.2} />
      ))}
    </AbsoluteFill>
  );
};
