import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import type { SceneProps } from '@mediamake/engine';
import { KCount, SparkTrace, swooshPts } from '../fx';
import { Ground, prog, Sfx, typed } from '../parts';
import { C, ease, easeIn, easeInOut, f, H, mono, NOTES, W } from '../theme';
import { CameraRig, gridTile, mix, textureOf, tilePlane, usePreloaded, type V3 } from '../three';
import { T } from '../timeline';

const D = T.draw;
const S = (s: number) => s - D.from;
const CARD_W = 4.5;
const CARD_H = 3.0;
const DECK: V3 = [2.9, 0.15, 0];
/** when each top card flips away (scene seconds): rounds 1–3 on the three "again"s, round 4 just before the cut */
const FLIPS = [S(D.again[0]), S(D.again[1]), S(D.again[2]), S(D.to) - 0.9];
const SLAP = S(D.draw);
const PUSH = S(D.to) - 0.55;

const camAt = (t: number) => {
  const k = prog(t, PUSH, S(D.to), easeIn);
  return {
    pos: [mix(0.4, DECK[0] + 0.15, k), mix(0.5, 0.75, k), mix(8.2, 1.6, k)] as V3,
    look: [mix(2.0, DECK[0] + 0.15, k), mix(0.15, 0.65, k), 0] as V3,
  };
};

/**
 * A brush stroke painted on the card itself: a ribbon along a gentle curve from a to b (card units),
 * fat in the middle and tapering at both ends, drawn up to p (0..1). Being part of the card, it flips
 * away with it.
 */
const brushStroke = (a: [number, number], b: [number, number], bend: number, width: number, n = 48) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const c = Math.sin(Math.PI * t) * bend;
    const x = a[0] + dx * t + nx * c;
    const y = a[1] + dy * t + ny * c;
    const w = (width / 2) * (0.22 + 0.78 * Math.pow(Math.sin(Math.PI * t), 0.35)) * (1 - 0.18 * t);
    pos.push(x + nx * w, y + ny * w, 0, x - nx * w, y - ny * w, 0);
    if (i < n) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return { g, n };
};
/** the two strokes of the cross, in card units (the card is 4.5 × 3) */
const CROSS: Array<[[number, number], [number, number], number]> = [
  [[-1.78, 1.02], [1.74, -1.08], 0.14],
  [[1.7, 1.12], [-1.66, -0.98], -0.1],
];
const STROKE_FRAMES = 5;

/** a marker strikes the round out just before it flips away */
const STRIKE = FLIPS.map(x => x - 0.5);

const Deck: React.FC<{ img: HTMLImageElement; t: number }> = ({ img, t }) => {
  const tex = useMemo(() => textureOf(img), [img]);
  const geos = useMemo(() => Array.from({ length: 5 }, (_, i) => tilePlane(CARD_W, CARD_H, ...gridTile(i, 3, 2))), []);
  // a fresh pair of strokes per round, so each cross can be drawn independently
  const crosses = useMemo(() => STRIKE.map(() => CROSS.map(([a, b, bend]) => brushStroke(a, b, bend, 0.17))), []);
  const frame = Math.round(t * 30);
  const cam = camAt(t);
  const slap = prog(t, SLAP - 0.15, SLAP + 0.25, ease);
  return (
    <>
      <CameraRig pos={cam.pos} look={cam.look} fov={36} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[-4, 6, 9]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[6, 2, 4]} intensity={18} color={C.clay} distance={20} />
      <group position={[DECK[0], DECK[1] + (1 - slap) * 7, DECK[2]]} rotation={[-0.05, -0.2, (1 - slap) * 0.25]}>
        {Array.from({ length: 5 }, (_, k) => {
          const flip = k < 4 ? prog(t, FLIPS[k], FLIPS[k] + 0.5, easeInOut) : 0;
          if (flip >= 1) return null;
          return (
            <group key={k} position={[-CARD_W / 2, 0, -k * 0.06 + flip * 1.2]} rotation={[0, -flip * 2.7, 0]}>
              <group position={[CARD_W / 2, 0, 0]}>
                <mesh position={[0, 0, -0.025]} castShadow>
                  <boxGeometry args={[CARD_W + 0.12, CARD_H + 0.12, 0.04]} />
                  <meshStandardMaterial color={C.slateMid} roughness={0.6} transparent opacity={1 - Math.max(0, flip - 0.6) * 2.5} />
                </mesh>
                <mesh geometry={geos[k]}>
                  <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={1 - Math.max(0, flip - 0.6) * 2.5} side={THREE.FrontSide} />
                </mesh>
                {k < 4 &&
                  crosses[k].map((st, j) => {
                    const from = f(STRIKE[k]) + j * (STROKE_FRAMES + 1);
                    const p = prog(frame, from, from + STROKE_FRAMES, ease);
                    if (p <= 0) return null;
                    st.g.setDrawRange(0, Math.max(6, Math.round(p * st.n) * 6));
                    return (
                      <mesh key={j} geometry={st.g} position={[0, 0, 0.012 + j * 0.002]}>
                        <meshBasicMaterial color={C.clay} toneMapped={false} transparent opacity={1 - Math.max(0, flip - 0.6) * 2.5} side={THREE.FrontSide} />
                      </mesh>
                    );
                  })}
              </group>
            </group>
          );
        })}
      </group>
    </>
  );
};

/** 46.4–60.5 s: "Draw." "Again." ×3 — the logo rounds as a deck, your notes typed between the flips. */
export const Draw: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const { imgs, release } = usePreloaded(['tex/rounds.jpg']);
  const words = [
    { w: 'draw.', at: SLAP, n: '01' },
    { w: 'again.', at: FLIPS[0], n: '02' },
    { w: 'again.', at: FLIPS[1], n: '03' },
    { w: 'again.', at: FLIPS[2], n: '04' },
  ];
  const bubbles = D.bubbles.map(S);
  const fadeAll = prog(t, PUSH, S(D.to) - 0.1);
  return (
    <AbsoluteFill>
      <Ground kind="slate" />
      {imgs && (
        <ThreeCanvas width={W} height={H} shadows gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} onCreated={release}>
          <Deck img={imgs['tex/rounds.jpg']} t={t} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{ opacity: 1 - fadeAll }}>
        {words.map((w, i) => (
          <KCount key={i} word={w.w} n={w.n} of="05" start={f(w.at)} out={i < 3 ? f(words[i + 1].at) - 8 : f(PUSH)} x={110} y={110} size={136} dark />
        ))}
        <SparkTrace pts={swooshPts(110, 470, 300, 18)} start={f(SLAP) + 8} dur={12} hold={30} width={4} seed="draw" sparkles={9} />
        {bubbles.map((b, i) => {
          if (t < b - 0.1) return null;
          const age = bubbles.filter(x => x <= t && x > b).length;
          if (age > 1) return null;
          const moved = age ? prog(t * 30, f(bubbles[i + 1]) - 2, f(bubbles[i + 1]) + 6) : 0;
          return (
            <div key={i} style={{ position: 'absolute', left: 110, top: 640 - moved * 190, width: 660, opacity: prog(t * 30, f(b) - 3, f(b)) * (1 - moved * 0.7) }}>
              <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 18, color: C.clay, marginBottom: 8 }}>you</div>
              <div style={{ display: 'inline-block', background: '#2A2A27', border: '1.5px solid #3c3c38', borderRadius: 22, padding: '18px 26px', fontFamily: mono, fontWeight: 400, fontSize: 30, lineHeight: 1.35, color: C.ivoryLight }}>
                {typed(NOTES[i], frame, f(b), 26)}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      <Sfx name="intro-3-thump" at={f(SLAP)} volume={0.6} />
      <Sfx name="cwc-sparkle" at={f(SLAP) + 8} volume={0.25} />
      {STRIKE.map((x, i) => (
        <Sfx key={`s${i}`} name="intro-scribble" at={f(x)} volume={0.35} dur={2 * STROKE_FRAMES + 3} />
      ))}
      {FLIPS.map((x, i) => (
        <Sfx key={i} name="cwc-swish" at={f(x)} volume={0.5} />
      ))}
      {bubbles.map((b, i) =>
        Array.from({ length: Math.ceil(NOTES[i].length / 3) }, (_, j) => <Sfx key={`${i}-${j}`} name="intro-key" at={f(b) + Math.round((j * 3 * 30) / 26)} volume={0.16} />),
      )}
      <Sfx name="cwc-whoosh-a" at={f(PUSH)} volume={0.4} />
    </AbsoluteFill>
  );
};
