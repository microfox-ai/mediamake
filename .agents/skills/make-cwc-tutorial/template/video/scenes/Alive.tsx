import React from 'react';
import { AbsoluteFill, Img, interpolate, OffthreadVideo, useCurrentFrame } from 'remotion';
import { getWaveformPortion, useAudioData, visualizeAudio } from '@remotion/media-utils';
import type { SceneProps } from '../../../../src/kit';
import { Css3D, Css3DObject } from '../css3d';
import { KCount, KWord, SparkTrace, swooshPts } from '../fx';
import { Ground, prog, Sfx, smooth } from '../parts';
import { C, ease, easeIn, f, src } from '../theme';
import { makeCam } from '../three';
import { MUSIC, T, vo, W_COMPLETE_WITH } from '../timeline';

const A = T.alive;
const S = (s: number) => s - A.from;
const THEME = MUSIC.find(m => m.name === 'there')!;

/** the six intros and four end screens orbiting where the logo was */
const Orbit: React.FC<{ t: number }> = ({ t }) => {
  const out = prog(t, S(A.motion) - 0.4, S(A.motion) + 0.9, ease);
  const gone = prog(t, S(A.sound) - 0.5, S(A.sound) + 0.1, easeIn);
  const cam = makeCam([0, 60, 1500], [0, 0, 0], 40);
  return (
    <Css3D cam={cam}>
      {Array.from({ length: 10 }, (_, i) => {
        const phi = (i / 10) * Math.PI * 2 + t * 0.55;
        const rr = 440 * out;
        return (
          <Css3DObject
            key={i}
            w={384}
            h={216}
            pos={[-470 + Math.cos(phi) * rr * 1.1, Math.sin(phi) * rr * 0.32, Math.sin(phi) * rr * 0.9]}
            rot={[0, Math.cos(phi) * 0.45, 0]}
            scale={(0.25 + 0.6 * out) * (1 - gone)}
            style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 24px 50px rgba(0,0,0,0.55)', opacity: 1 - gone }}
          >
            <OffthreadVideo src={src(`atlas/cwc-panel-${i}.mp4`)} muted style={{ width: 384, height: 216, display: 'block' }} />
          </Css3DObject>
        );
      })}
    </Css3D>
  );
};

/** the theme, as bars that move with it */
const Bars: React.FC<{ t: number }> = ({ t }) => {
  const audio = useAudioData(src('sfx2/intro-theme-i3.wav'));
  if (!audio) return null;
  const songT = A.from + t;
  const amps = visualizeAudio({ fps: 30, frame: Math.max(0, Math.round((songT - THEME.at) * 30)), audioData: audio, numberOfSamples: 64, optimizeFor: 'speed' });
  const vis = prog(t, S(A.sound) - 0.4, S(A.sound)) * (1 - prog(t, S(A.voice) - 0.5, S(A.voice) - 0.1));
  const n = 40;
  return (
    <svg width={900} height={600} style={{ position: 'absolute', left: 110, top: 240, opacity: vis }}>
      {Array.from({ length: n }, (_, i) => {
        const a = Math.min(1, Math.sqrt(amps[Math.min(amps.length - 1, Math.floor((i / n) * 40))] ?? 0) * 1.8);
        const h = 10 + a * 520 * vis;
        return <rect key={i} x={i * 22} y={300 - h / 2} width={12} height={h} rx={6} fill={i % 5 === 0 ? C.ivoryLight : C.clay} />;
      })}
    </svg>
  );
};

/** the voice's own waveform, drawn as it says "Voice." */
const VoiceWave: React.FC<{ t: number }> = ({ t }) => {
  const chunk = vo('voice');
  const audio = useAudioData(src(chunk.file));
  if (!audio) return null;
  const local = A.from + t - A.voice;
  const vis = prog(t, S(A.voice) - 0.4, S(A.voice)) * (1 - prog(t, S(A.whip) - 0.3, S(A.whip)));
  const N = 90;
  const bars = getWaveformPortion({ audioData: audio, startTimeInSeconds: 0, durationInSeconds: chunk.duration, numberOfSamples: N });
  const reveal = Math.max(0, Math.min(1, local / chunk.duration));
  const top: Array<[number, number]> = [];
  const bottom: Array<[number, number]> = [];
  bars.forEach((b, i) => {
    const x = (i / (N - 1)) * 820;
    const on = i / (N - 1) <= reveal;
    // once said, the wave keeps breathing (a held frame read as frozen)
    const breathe = reveal >= 1 ? 1 + 0.1 * Math.sin(local * 7 + i * 0.35) : 1;
    const a = on ? Math.min(1, b.amplitude * 2.4 * breathe) : 0.01;
    top.push([x, 300 - a * 230]);
    bottom.push([x, 300 + a * 230]);
  });
  const d = smooth(top) + ' L ' + smooth([...bottom].reverse()).slice(2) + ' Z';
  return (
    <svg width={900} height={600} style={{ position: 'absolute', left: 110, top: 240, opacity: vis }}>
      <line x1={0} y1={300} x2={820} y2={300} stroke="#3d3d3a" strokeWidth={2} />
      <path d={d} fill={C.clay} opacity={0.92} />
    </svg>
  );
};

const STRIP = ['kit2/guide-01-cover.jpg', 'kit2/guide-03-logo.jpg', 'kit2/banner.png', 'kit2/guide-06-colour.jpg', 'kit2/profile.png', 'kit2/guide-08-motion.jpg', 'kit2/guide-10-intros.jpg', 'kit2/watermark.png', 'kit2/guide-11-end-screens.jpg', 'kit2/guide-12-sound.jpg', 'kit2/guide-14-youtube.jpg'];

/** a smeared row of the kit rushing across (the motion reference's whip strip) */
const Whip: React.FC<{ t: number }> = ({ t }) => {
  const p = prog(t, S(A.whip), S(A.to), x => x);
  if (p <= 0) return null;
  const x = interpolate(p, [0, 1], [1950, -5200]);
  const row = (dx: number, o: number) => (
    <div style={{ position: 'absolute', left: x + dx, top: 540 - 140, display: 'flex', gap: 36, opacity: o, alignItems: 'center' }}>
      {STRIP.map(s => (
        <Img key={s} src={src(s)} style={{ height: s.includes('profile') || s.includes('watermark') ? 220 : 280, borderRadius: s.includes('profile') ? 140 : 12 }} />
      ))}
    </div>
  );
  return (
    <AbsoluteFill>
      {[180, 120, 60].map((d, i) => row(d, 0.12 + i * 0.1))}
      {row(0, 1)}
    </AbsoluteFill>
  );
};

/** 66.5–79.8 s: "Motion." "Sound." "Voice." "A complete brand setup, with everything you need." — the brand comes alive. */
export const Alive: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  return (
    <AbsoluteFill>
      <Ground kind="slate" />
      {t < S(A.sound) + 0.2 && <Orbit t={t} />}
      {t > S(A.sound) - 0.5 && t < S(A.voice) && <Bars t={t} />}
      {t > S(A.voice) - 0.5 && t < S(A.whip) + 0.1 && <VoiceWave t={t} />}
      <KCount word="motion." n="01" of="03" start={f(S(A.motion))} out={f(S(A.sound)) - 8} x={1130} y={420} size={132} dark />
      <KCount word="sound." n="02" of="03" start={f(S(A.sound))} out={f(S(A.voice)) - 8} x={1130} y={420} size={132} dark />
      <KCount word="voice." n="03" of="03" start={f(S(A.voice))} out={f(S(A.whip)) - 4} x={1130} y={420} size={132} dark />
      <Whip t={t} />
      {/* "A complete brand setup." over the kit rushing past */}
      <KWord text="a complete brand setup," start={f(S(A.complete))} x={960} y={820} size={92} color={C.ivoryLight} align="center" stagger={1} out={f(S(A.to)) - 12} fly />
      <KWord text="with everything you need." start={f(S(A.complete) + W_COMPLETE_WITH)} x={960} y={928} size={68} color={C.clay} align="center" stagger={0.9} out={f(S(A.to)) - 12} fly />
      <SparkTrace pts={swooshPts(600, 1330, 985, 20)} start={f(S(A.complete) + W_COMPLETE_WITH + 0.7)} dur={14} hold={18} width={5} seed="complete" />
      <Sfx name="cwc-whoosh-a" at={f(S(A.motion) - 0.4)} volume={0.4} />
      <Sfx name="cwc-swish" at={f(S(A.sound) - 0.2)} volume={0.35} />
      <Sfx name="cwc-swish" at={f(S(A.voice) - 0.2)} volume={0.3} />
      <Sfx name="cwc-whoosh-b" at={f(S(A.whip))} volume={0.5} />
      <Sfx name="cwc-sparkle" at={f(S(A.complete) + W_COMPLETE_WITH + 0.7)} volume={0.3} />
      <Sfx name="cwc-whoosh-a" at={f(S(A.to)) - 14} volume={0.35} />
    </AbsoluteFill>
  );
};
