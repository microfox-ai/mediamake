import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';
import type { SceneProps } from '../../../../src/kit';
import { Css3D, Css3DObject } from '../css3d';
import { KWord, loopPts, SceneIn, SparkTrace, swooshPts } from '../fx';
import { Ground, prog, Sfx } from '../parts';
import { C, ease, easeInOut, f, H, mono, sans, src } from '../theme';
import { makeCam, mix, type V3 } from '../three';
import { T, W1 } from '../timeline';

const K = T.skills;
const S = (s: number) => s - K.from;
const VO = S(K.vo);

/** MediaMake's own skills, as the live catalog lists them (2 Nov 2026), without the third-party Remotion ones. */
const SKILLS = [
  'analyze-video', 'cleanup-downloads', 'cleanup-out', 'create-music-poster', 'create-thumbnail', 'fork-skill', 'make-loudness-remaster',
  'make-lyrics-shorts-summerstyle-boldwords', 'make-lyrics-video', 'make-lyrics-video-like-nakama', 'make-video-music-remix',
  'make-video-music-remix-like-f1xhitit', 'make-video-music-remix-like-quicksilverxkingpin', 'make-video-music-remix-shorts',
  'make-waveform-lyric-video', 'pack-brand-kit', 'pack-youtube', 'publish-skill', 'restore-backup', 'revise-image', 'revise-video',
  'update-mediamake-items', 'write-youtube-metadata',
];
const HERO = SKILLS.indexOf('pack-brand-kit');
/** the Copy scene's card, where the hero lands (screen px) */
const CARD = { x: 200, y: 290, w: 780, h: 440 };
/** the camera's distance at which one world px at z = 0 is exactly one screen px */
const FOV = 40;
const DIST = H / 2 / Math.tan((FOV / 2) * (Math.PI / 180));

const helix = (i: number, t: number): { pos: V3; rot: V3 } => {
  const th = (i / SKILLS.length) * Math.PI * 2 * 2.4 + t * 0.85;
  const inT = prog(t, 0, 1.0, ease);
  const y = (i - SKILLS.length / 2) * 40;
  return { pos: [Math.cos(th) * 760, y, mix(-2600, Math.sin(th) * 520 - 260, inT)], rot: [0, -Math.cos(th) * 0.5, 0] };
};

const SmallCard: React.FC<{ name: string }> = ({ name }) => (
  <div style={{ width: 380, height: 110, background: C.ivoryLight, borderRadius: 18, border: '1.5px solid #e2ddd2', boxShadow: '0 18px 40px rgba(20,20,19,0.16)', padding: '18px 24px', boxSizing: 'border-box' }}>
    <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 15, color: C.cloud }}>mediamake / skills</div>
    <div style={{ marginTop: 8, fontFamily: sans, fontWeight: 800, fontSize: name.length > 30 ? 17 : 24, letterSpacing: '-0.02em', color: C.slate, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
  </div>
);

/** the pack-brand-kit card, drawn exactly as the Copy scene draws it */
export const SkillCard: React.FC = () => (
  <div style={{ position: 'relative', width: CARD.w, height: CARD.h, background: C.ivoryLight, borderRadius: 26, padding: '40px 52px', boxSizing: 'border-box', boxShadow: '0 40px 90px rgba(20,20,19,0.18)', border: '1.5px solid #e2ddd2' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: mono, fontWeight: 700, fontSize: 22, color: C.cloud }}>
      <Img src={src('kit/mediamake-mark.svg')} style={{ width: 34, height: 34 }} />
      mediamake / skills
    </div>
    <div style={{ marginTop: 20, fontFamily: sans, fontWeight: 800, fontSize: 62, letterSpacing: '-0.035em', color: C.slate }}>pack-brand-kit</div>
    <div style={{ marginTop: 8, fontFamily: sans, fontWeight: 800, fontSize: 24, lineHeight: 1.4, color: C.cloud, width: 640 }}>a logo, its motion, intros, end screens, a guide and a YouTube kit</div>
    <div style={{ position: 'absolute', left: 52, top: CARD.h - 52 - 80, width: 440, height: 80, borderRadius: 40, background: C.slate, color: C.ivoryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 800, fontSize: 28 }}>
      Copy install prompt
    </div>
  </div>
);

/** 21.2–26.3 s: "This is one of the many open source skills. Free, and easy to use." — the skills spiral, ours comes forward. */
export const Skills: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const cam = makeCam([0, 0, DIST], [0, 0, 0], FOV);
  const front = prog(t, VO + 1.0, VO + 2.2, easeInOut);
  const land = prog(t, S(K.to) - 0.85, S(K.to) - 0.05, easeInOut);
  const others = 1 - prog(t, VO + 2.4, VO + 3.4);
  const h = helix(HERO, t);
  const frontPos: V3 = [0, 30, 120];
  const landPos: V3 = [CARD.x + CARD.w / 2 - 960, -(CARD.y + CARD.h / 2 - 540), 0];
  const heroPos = h.pos.map((v, i) => mix(mix(v, frontPos[i], front), landPos[i], land)) as V3;
  const heroRot = h.rot.map(v => v * (1 - front)) as V3;
  const heroScale = mix(mix(0.5, 0.92, front), 1, land);
  const words = [
    // on the spoken words of the continuous read (vo-r4/cut/ritual4.wav)
    { w: 'open source.', at: VO + W1.open, x: 560 },
    { w: 'free.', at: VO + W1.free, x: 1010 },
    { w: 'easy to use.', at: VO + W1.easy, x: 1400 },
  ];
  const wordsOut = prog(t, S(K.to) - 0.9, S(K.to) - 0.5);
  return (
    <AbsoluteFill>
      <Ground kind="ivory" />
      <SceneIn>
        <Css3D cam={cam}>
          {SKILLS.map((name, i) => {
            if (i === HERO) return null;
            const p = helix(i, t);
            return (
              <Css3DObject key={name} pos={p.pos} rot={p.rot} w={380} h={110} style={{ opacity: others }}>
                <SmallCard name={name} />
              </Css3DObject>
            );
          })}
          <Css3DObject pos={heroPos} rot={heroRot} scale={heroScale} w={CARD.w} h={CARD.h}>
            <SkillCard />
          </Css3DObject>
        </Css3D>
        {front >= 1 && land === 0 && <SparkTrace pts={loopPts(960, 507, 580, 330, 'hero')} start={f(VO + 2.2)} dur={20} hold={24} width={6} seed="hero" />}
        <AbsoluteFill style={{ opacity: 1 - wordsOut }}>
          <AbsoluteFill style={{ background: `linear-gradient(to top, rgba(240,238,230,${0.96 * prog(t, VO + W1.open - 0.34, VO + W1.open)}) 0%, rgba(240,238,230,${0.8 * prog(t, VO + W1.open - 0.34, VO + W1.open)}) 20%, rgba(240,238,230,0) 34%)` }} />
          {words.map((w, i) => (
            <KWord key={w.w} text={w.w} start={f(w.at)} x={w.x} y={930} size={84} color={i === 1 ? C.clay : C.slate} align="center" />
          ))}
          <SparkTrace pts={swooshPts(330, 790, 985, 14)} start={f(VO + W1.open + 0.66)} dur={12} hold={50} width={4} seed="os" sparkles={8} />
        </AbsoluteFill>
      </SceneIn>
      <Sfx name="cwc-whoosh-b" at={0} volume={0.45} />
      <Sfx name="cwc-swish" at={f(VO + 1.0)} volume={0.5} />
      <Sfx name="cwc-sparkle" at={f(VO + 2.2)} volume={0.35} />
      {words.map(w => (
        <Sfx key={w.w} name="intro-pop" at={f(w.at)} volume={0.3} />
      ))}
      <Sfx name="cwc-swish" at={f(S(K.to) - 0.85)} volume={0.4} />
      <Sfx name="end-paper-loop" at={0} volume={0.18} dur={f(S(K.to))} />
    </AbsoluteFill>
  );
};
