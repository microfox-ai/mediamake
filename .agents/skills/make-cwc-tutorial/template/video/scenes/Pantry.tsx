import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, useCurrentFrame } from 'remotion';
import type { SceneProps } from '../../../../src/kit';
import stationsData from '../../input/stations.json';
import { AtlasCrop, Css3D, Css3DObject } from '../css3d';
import { KWord, SparkTrace, swooshPts } from '../fx';
import { Caret, Ground, prog, SelectBox, Sfx, typed } from '../parts';
import { C, easeInOut, f, H, sans, src, W } from '../theme';
import { makeCam, mix, type V3 } from '../three';
import { STATION_ORDER, T, W3, W5 } from '../timeline';

type Station = { id: string; name: string; video?: string; poster?: string; logo?: string; label: string; bannerTex?: string; guide: string[] };
const P = T.pantry;
const S = (s: number) => s - P.from;
const STATIONS = STATION_ORDER.map(id => (stationsData as Station[]).find(s => s.id === id)!);
const N = STATIONS.length;
const R = 2200;
const RC = 1000;
const BW = 880;
const BH = 540;
const GLIDE = S(P.glide);
/** the shelf's continuous read (vo-r4/cut/shelf4.wav) and its sentences */
const COOK = S(P.cooking);
const TESTED = COOK + W3.tested;
const CHANNELS = COOK + W3.channels;
const EVERY = COOK + W3.logo;
/** the ending read starts: "Every one of these… started with a name." */
const ENDING = S(P.vo);
const STEP = P.step;
const REGROUP = S(P.regroup);
const SETTLE = REGROUP + 2.2;
const theta = (k: number) => (k / N) * Math.PI * 2;
const ringPos = (k: number): V3 => [R * Math.sin(theta(k)), 0, -R * Math.cos(theta(k))];
const gridPos = (k: number): V3 => [((k % 6) - 2.5) * 960, k < 6 ? 340 : -340, -1500];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** which station the camera faces at scene second t (fractional while it moves on) */
const focus = (t: number) => {
  if (t <= GLIDE) return 0;
  const k = Math.min(N - 1, Math.floor((t - GLIDE) / STEP));
  const into = t - GLIDE - k * STEP;
  return k + (k < N - 1 ? prog(into, 1.0, STEP, easeInOut) : 0);
};

const camAt = (t: number) => {
  const s = focus(t);
  const a = (s / N) * Math.PI * 2;
  const rc = mix(800, RC, prog(t, 0, 1.0, easeInOut));
  const glide = { pos: [rc * Math.sin(a), 70, -rc * Math.cos(a)] as V3, look: [R * Math.sin(a), 80, -R * Math.cos(a)] as V3 };
  const k = prog(t, REGROUP, SETTLE, easeInOut);
  const end = { pos: [0, 40, 4800] as V3, look: [0, 30, -1500] as V3 };
  return {
    pos: glide.pos.map((v, i) => mix(v, end.pos[i], k)) as V3,
    look: glide.look.map((v, i) => mix(v, end.look[i], k)) as V3,
    fov: 35,
  };
};

const boardPose = (k: number, t: number) => {
  const g = prog(t, REGROUP + k * 0.05, SETTLE - 0.3 + k * 0.05, easeInOut);
  const a = ringPos(k);
  const b = gridPos(k);
  const ra = -theta(k);
  return { pos: a.map((v, i) => mix(v, b[i], g)) as V3, rot: [0, ra + wrap(0 - ra) * g, 0] as V3 };
};

const Board: React.FC<{ s: Station; k: number; live: boolean }> = ({ s, k, live }) => {
  const half = (i: number) => (
    <div style={{ position: 'absolute', left: 20 + i * 440, top: 20, width: 400, height: 225, borderRadius: 10, overflow: 'hidden', background: '#0c0c0b' }}>
      <AtlasCrop cols={2} rows={1} i={i} w={400} h={225}>
        {live && s.video ? (
          <OffthreadVideo src={src(s.video)} muted style={{ width: 800, height: 225 }} />
        ) : (
          <Img src={src(s.poster ?? '')} style={{ width: 800, height: 225 }} />
        )}
      </AtlasCrop>
    </div>
  );
  return (
    <div style={{ position: 'relative', width: BW, height: BH, background: '#1E1E1C', border: '2px solid #3d3d3a', borderRadius: 20, boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
      {s.video ? (
        <>
          {half(0)}
          {half(1)}
        </>
      ) : (
        <div style={{ position: 'absolute', left: 20, top: 20, width: 840, height: 225, borderRadius: 10, background: '#0c0c0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Img src={src(s.logo ?? '')} style={{ maxWidth: 640, maxHeight: 170, objectFit: 'contain' }} />
        </div>
      )}
      {s.bannerTex && <Img src={src(s.bannerTex)} style={{ position: 'absolute', left: 20, top: 318, width: 200, height: 112, borderRadius: 8 }} />}
      <Img src={src(s.label)} style={{ position: 'absolute', left: 240, top: 270, width: 400, height: 200 }} />
      {s.guide.map((g, i) => (
        <Img key={g} src={src(g)} style={{ position: 'absolute', left: 660 + i * 18, top: 300 + i * 34, width: 200, height: 112, borderRadius: 8, transform: `rotate(${i ? 4 : -3}deg)`, boxShadow: '0 10px 20px rgba(0,0,0,0.4)' }} />
      ))}
      <div style={{ position: 'absolute', right: 22, bottom: 16, fontFamily: sans, fontWeight: 800, fontSize: 18, color: '#6d6b65' }}>{String(k + 1).padStart(2, '0')} / {N}</div>
    </div>
  );
};

/** each brand's own logo (its full-resolution file, transparent) standing on its board, floating gently */
const LOGO_W = 280;
const LOGO_H = 160;
const logoPose = (k: number, t: number) => {
  const { pos, rot } = boardPose(k, t);
  const lift = BH / 2 + LOGO_H / 2 + 10 + Math.sin(t * 1.6 + k * 1.3) * 10;
  return { pos: [pos[0] + Math.sin(rot[1]) * 60, pos[1] + lift, pos[2] + Math.cos(rot[1]) * 60] as V3, rot: [0, rot[1] + Math.sin(t * 0.9 + k) * 0.12, 0] as V3 };
};

/** 79.8–101.9 s: the shelf — every kit, its intro and end screen playing — then all twelve at once. */
export const Pantry: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const c = camAt(t);
  const cam = makeCam(c.pos, c.look, c.fov);
  const vo = S(P.vo);
  return (
    <AbsoluteFill>
      <Ground kind="slate" />
      <Css3D cam={cam}>
        {STATIONS.map((s, k) => {
          const { pos, rot } = boardPose(k, t);
          const start = GLIDE + k * STEP - 0.6;
          const end = GLIDE + (k + 1) * STEP + 0.4;
          const live = !!s.video && t >= start && t < Math.min(end, REGROUP);
          const d = Math.hypot(pos[0] - c.pos[0], pos[2] - c.pos[2]);
          const fog = t < REGROUP ? Math.max(0.2, Math.min(1, 1 - (d - 1300) / 2600)) : 1;
          return (
            <Css3DObject key={s.id} pos={pos} rot={rot} w={BW} h={BH} style={{ opacity: fog }}>
              {live ? (
                <Sequence from={Math.round(start * 30)} layout="none">
                  <Board s={s} k={k} live />
                </Sequence>
              ) : (
                <Board s={s} k={k} live={false} />
              )}
            </Css3DObject>
          );
        })}
        {STATIONS.map((s, k) => {
          const { pos, rot } = logoPose(k, t);
          return (
            <Css3DObject key={`${s.id}-logo`} pos={pos} rot={rot} w={LOGO_W} h={LOGO_H}>
              <Img src={src(`tex/logo-hq/${s.id}.png`)} style={{ width: LOGO_W, height: LOGO_H, objectFit: 'contain', filter: 'drop-shadow(0 16px 24px rgba(0,0,0,0.55))' }} />
            </Css3DObject>
          );
        })}
      </Css3D>
      {/* the shelf's three voiced lines as a kinetic lower third, over one dark band */}
      {t > COOK - 0.4 && t < ENDING && (
        <AbsoluteFill style={{ opacity: prog(t, COOK - 0.4, COOK) * (1 - prog(t, ENDING - 0.6, ENDING - 0.1)), background: 'linear-gradient(to top, rgba(20,20,19,0.94) 0%, rgba(20,20,19,0.75) 22%, rgba(20,20,19,0) 42%)' }} />
      )}
      {/* "Then we kept cooking." */}
      {t > COOK - 0.1 && t < TESTED + 0.2 && (
        <AbsoluteFill style={{ opacity: 1 - prog(t, TESTED - 0.45, TESTED - 0.05) }}>
          <KWord text="then we kept cooking." start={f(COOK)} x={110} y={915} size={84} color={C.ivoryLight} stagger={1} />
        </AbsoluteFill>
      )}
      {/* "A skill, tested and iterated across more than a dozen brands, and over a hundred lessons." */}
      {t > TESTED - 0.3 && t < CHANNELS && (
        <AbsoluteFill style={{ opacity: prog(t, TESTED - 0.3, TESTED) * (1 - prog(t, CHANNELS - 0.5, CHANNELS - 0.1)) }}>
          <KWord text="tested & iterated." start={f(COOK + W3.testedWord)} x={110} y={858} size={78} color={C.ivoryLight} stagger={1.1} />
          <SparkTrace pts={swooshPts(110, 770, 912, 16)} start={f(COOK + W3.testedWord + 0.66)} dur={12} hold={60} width={4} seed="tested" sparkles={10} />
          <KWord text="12+ brands" start={f(COOK + W3.dozen)} x={110} y={975} size={60} color={C.clay} stagger={1.2} />
          <KWord text="·" start={f(COOK + W3.dozen + 0.8)} x={460} y={975} size={60} color={C.cloud} />
          <KWord text="100+ lessons" start={f(COOK + W3.hundred)} x={510} y={975} size={60} color={C.clay} stagger={1.2} />
        </AbsoluteFill>
      )}
      {/* "Different channels. Different stories. One skill." (word times of vo-r2/cut/oneskill.wav) */}
      {t > CHANNELS - 0.1 && t < EVERY && (
        <AbsoluteFill style={{ opacity: 1 - prog(t, EVERY - 0.4, EVERY - 0.05) }}>
          <AbsoluteFill style={{ opacity: 1 - prog(t, COOK + W3.oneskill - 0.3, COOK + W3.oneskill) }}>
            <KWord text="different channels." start={f(CHANNELS)} x={110} y={858} size={78} color={C.ivoryLight} stagger={1} />
            <KWord text="different stories." start={f(COOK + W3.stories)} x={110} y={958} size={78} color={C.ivoryLight} stagger={1} />
          </AbsoluteFill>
          <KWord text="one skill." start={f(COOK + W3.oneskill)} x={110} y={905} size={128} color={C.clay} stagger={1.4} />
          <SparkTrace pts={swooshPts(110, 640, 975, 18)} start={f(COOK + W3.oneskill + 0.5)} dur={12} hold={30} width={5} seed="oneskill" sparkles={12} />
        </AbsoluteFill>
      )}
      {/* "Every logo. Every intro. Every end screen." — as the twelve come together */}
      {t > EVERY - 0.1 && t < ENDING && (
        <AbsoluteFill style={{ opacity: 1 - prog(t, ENDING - 0.5, ENDING - 0.1) }}>
          {[
            ['every logo.', COOK + W3.logo, COOK + W3.intro],
            ['every intro.', COOK + W3.intro, COOK + W3.endscreen],
            ['every end screen.', COOK + W3.endscreen, ENDING],
          ].map(([w, a, b]) => (
            <AbsoluteFill key={w as string} style={{ opacity: t < (b as number) - 0.12 ? 1 : 0 }}>
              <KWord text={w as string} start={f(a as number)} x={110} y={905} size={110} color={C.ivoryLight} stagger={1} />
            </AbsoluteFill>
          ))}
        </AbsoluteFill>
      )}
      {t >= vo - 0.2 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 880, display: 'flex', justifyContent: 'center', opacity: prog(t, vo - 0.2, vo + 0.1) }}>
          <SelectBox tag="every_kit" dark>
            <span style={{ fontFamily: sans, fontWeight: 800, fontSize: 56, letterSpacing: '-0.04em', color: C.ivoryLight }}>
              {typed('every one of these…', frame, f(vo), 20)}
              {t >= vo + W5.started ? ` ${typed('started with a name.', frame, f(vo + W5.started), 22)}` : ''}
              <Caret height={46} color={C.clay} blinkFrom={f(vo + 2.6)} />
            </span>
          </SelectBox>
        </div>
      )}
      {STATIONS.map((_, k) => (k ? <Sfx key={k} name="cwc-swish" at={f(GLIDE + (k - 1) * STEP + 1.0)} volume={0.22} /> : null))}
      {/* the pot keeps bubbling into the shelf, under "Then we kept cooking." */}
      <Sfx name="cwc-bubble" at={0} volume={0.32} dur={f(COOK + 1.4)} />
      <Sfx name="cwc-sparkle" at={f(COOK + W3.testedWord + 0.66)} volume={0.22} />
      <Sfx name="cwc-sparkle" at={f(COOK + W3.oneskill + 0.5)} volume={0.22} />
      <Sfx name="intro-3-riser" at={f(REGROUP + 0.2)} volume={0.35} />
    </AbsoluteFill>
  );
};
