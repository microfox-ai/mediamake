import React from 'react';
import { AbsoluteFill, interpolate, OffthreadVideo, useCurrentFrame } from 'remotion';
import type { SceneProps } from '../../../../src/kit';
import { CookWithClaudeLogo, LOGO_VIEW } from '../../../../brands/cookwithclaude/graphics/Logo';
import { Css3D, Css3DObject } from '../css3d';
import { Caret, clamp, Ground, prog, SelectBox, Sfx, typed } from '../parts';
import { SparkTrace, swooshPts } from '../fx';
import { brush, C, f, H, sans, src, W } from '../theme';
import { hash, makeCam } from '../three';
import { T } from '../timeline';

const CUT = f(T.cold.cut);

/** The Cook with Claude panels (6 intros + 4 end screens, one atlas video) bursting out of the centre in 3D. */
const Burst: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const k = 1 - Math.pow(1 - Math.min(1, t / 3.4), 2.2);
  const cam = makeCam([0, 30, interpolate(t, [0, 3.6], [1700, 1380], clamp)], [0, 0, 0], 42);
  return (
    <Css3D cam={cam}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + hash(i) * 0.5;
        const r = 60 + (520 + hash(i + 3) * 380) * k;
        const z = -300 + hash(i + 7) * 650 * k;
        const spin = (1 - k) * (hash(i + 11) - 0.5) * 6;
        return (
          <Css3DObject
            key={i}
            w={384}
            h={216}
            pos={[Math.cos(a) * r * 1.5, Math.sin(a) * r * 0.85, z]}
            rot={[spin * 0.4, spin + (hash(i + 5) - 0.5) * 0.8, spin * 0.3]}
            scale={(0.3 + 0.7 * Math.min(1, t * 3)) * 1.5}
            style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}
          >
            <OffthreadVideo src={src(`atlas/cwc-panel-${i}.mp4`)} muted style={{ width: 384, height: 216, display: 'block' }} />
          </Css3DObject>
        );
      })}
    </Css3D>
  );
};

/** 0–7.2 s: the finished world all at once, "This… was a blank page.", a blank page, a pause, "…before we figured it out, that is." */
export const Cold: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const v = LOGO_VIEW;
  const lw = 980;
  const lh = (lw * v.h) / v.w;
  if (frame >= CUT) {
    const b4 = f(T.cold.before);
    const line = '…before we figured it out, that is.';
    const fade = prog(frame, f(T.cold.to) - 6, f(T.cold.to));
    return (
      <AbsoluteFill>
        {/* the page stays: the opener starts on the same ivory, so only the words fade */}
        <Ground kind="ivory" />
        <AbsoluteFill style={{ opacity: 1 - fade }}>
        <div style={{ position: 'absolute', left: W / 2 - 3, top: H / 2 - 110 }}>
          <Caret height={80} color={C.slate} width={6} blinkFrom={CUT} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: H / 2 + 10, textAlign: 'center', fontFamily: brush, fontSize: 76, color: C.clay, transform: 'rotate(-2deg)' }}>
          {typed(line, frame, b4 + 3, 20)}
        </div>
        <SparkTrace pts={swooshPts(W / 2 - 430, W / 2 + 450, H / 2 + 150)} start={b4 + 3 + Math.round((line.length * 30) / 20)} dur={14} hold={12} width={5} seed="before" />
        </AbsoluteFill>
        <Sfx name="cwc-sparkle" at={b4 + 3 + Math.round((line.length * 30) / 20)} volume={0.3} />
      </AbsoluteFill>
    );
  }
  const a = f(1.15);
  const b = f(2.4);
  return (
    <AbsoluteFill>
      <Ground kind="slate" />
      <Burst />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 34% 30% at 50% 46%, rgba(20,20,19,0.86) 0%, rgba(20,20,19,0) 100%)' }} />
      <div style={{ position: 'absolute', left: (W - lw) / 2, top: H * 0.44 - lh / 2, width: lw, height: lh, transform: `scale(${interpolate(frame, [0, CUT], [0.94, 1.04])})` }}>
        <CookWithClaudeLogo on="slate" />
      </div>
      <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(10,10,9,0.85) 0%, rgba(10,10,9,0) 32%)' }} />
      {frame >= a - 2 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 800, display: 'flex', justifyContent: 'center', opacity: prog(frame, a - 2, a + 2) }}>
          <SelectBox tag="prompt_00" dark>
            <span style={{ fontFamily: sans, fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', color: C.ivoryLight }}>
              {typed('this…', frame, a, 16)}
              {frame >= b ? ` ${typed('was a blank page.', frame, b, 24)}` : ''}
              <Caret height={52} color={C.clay} blinkFrom={b + 30} />
            </span>
          </SelectBox>
        </div>
      )}
      <Sfx name="intro-3-sparkle" at={f(0.6)} volume={0.35} />
    </AbsoluteFill>
  );
};
