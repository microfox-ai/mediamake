import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, random, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import type { SceneProps } from '@mediamake/engine';
import refsMeta from '../../input/tex/refs.json';
import { KWord, SceneIn } from '../fx';
import { Loop, prog, Sfx } from '../parts';
import { C, ease, easeInOut, f, H, mono, W } from '../theme';
import { CameraRig, gridTile, hash, makeCam, mix, textureOf, tilePlane, toFrame, usePreloaded, type V3 } from '../three';
import { T } from '../timeline';

const L = T.look;
type Ref = { i: number; col: string; id: string };
const REFS = (refsMeta as { items: Ref[] }).items;
const COLS = ['A', 'B', 'C', 'D'];
const COL_X = [-7.0, -2.35, 2.35, 7.0];
const HEAD: Record<string, string> = { A: 'A · kitchen in the letters', B: 'B · prompt & cursor', C: 'C · bold series title', D: 'D · pixel kitchen' };
const CW = 1.8;
const CH = 1.35;

/** scene seconds */
/** the read: "First, it goes looking, on Pinterest and Dribbble, and sorts what it finds into directions. You pick what you love." */
const LOOKING = L.look - L.from;
const DIRECTIONS = L.directions - L.from;
const PICK = L.pick - L.from;
const FLY = [LOOKING - 0.1, LOOKING + 3.0] as const;
/** the dive: a slow drift until "looking", then a hard push that eases into the board */
const dive = Easing.bezier(0.5, 0, 0.2, 1);
/** the cards swarm into their columns as it says "sorts what it finds into directions" */
const FORM = DIRECTIONS - 2.0;
const HEADS = DIRECTIONS;
const PUSH = [DIRECTIONS + 0.5, L.to - L.from - 0.2] as const;

/**
 * Every reference card has a place in a deep tunnel (the camera flies through it, cards passing on
 * every side) and a place on the board (the four columns at z = 0). On FORM they swarm to the board.
 */
const slots = (() => {
  const count: Record<string, number> = {};
  return REFS.map(r => {
    const j = (count[r.col] = (count[r.col] ?? -1) + 1);
    const c = COLS.indexOf(r.col);
    const a = hash(r.i * 2.3) * Math.PI * 2;
    const rad = 2.3 + hash(r.i * 4.1) * 2.6;
    const z = 6 + ((r.i * 23) % 40) * 1.35 + (hash(r.i * 6.7) - 0.5) * 1.2;
    return {
      ...r,
      sorted: [COL_X[c] + (j % 2 ? 0.98 : -0.98), 3.3 - Math.floor(j / 2) * 1.5, 0] as V3,
      tunnel: [Math.cos(a) * rad * 1.5, Math.sin(a) * rad * 0.85, z] as V3,
      out: [Math.cos(a), Math.sin(a)] as [number, number],
      spin: [(hash(r.i * 7.3) - 0.5) * 1.2, (hash(r.i * 8.9) - 0.5) * 1.4, (hash(r.i * 9.1) - 0.5) * 1.6] as V3,
      go: FORM + hash(r.i * 5.3) * 0.7,
    };
  });
})();
const C09 = slots.find(s => s.id === 'C09')!;

/** the camera, as a function of the scene's seconds (shared by the 3D rig and the 2D overlay) */
const camAt = (t: number) => {
  const fly = prog(t, FLY[0], FLY[1], dive);
  const calm = prog(t, FORM, FLY[1] + 0.6, ease);
  const k = prog(t, PUSH[0], PUSH[1], easeInOut);
  const wx = Math.sin(t * 1.6) * 1.7 * (1 - calm);
  const wy = Math.cos(t * 1.25) * 0.9 * (1 - calm);
  const z = mix(66 - 3 * t, 17, fly);
  const pos: V3 = [wx + mix(0, -2.0, k), wy + mix(0, -0.7, k), mix(z, 11.2, k)];
  const look: V3 = [wx * 0.4 + mix(0, -2.4, k), wy * 0.4 + mix(0, 0.7, k), z - 17];
  return { pos, look, fov: mix(58, 42, calm), roll: Math.sin(t * 1.1 + 0.6) * 0.2 * (1 - calm) };
};

/** where card s is at time t */
const cardAt = (s: (typeof slots)[number], t: number) => {
  const p = prog(t, s.go, s.go + 1.5, easeInOut);
  const arc = Math.sin(Math.PI * p) * 4.5;
  const pos: V3 = [mix(s.tunnel[0], s.sorted[0], p) + s.out[0] * arc, mix(s.tunnel[1], s.sorted[1], p) + s.out[1] * arc * 0.7, mix(s.tunnel[2], s.sorted[2] + 0.01, p)];
  const rot: V3 = [(s.spin[0] + t * s.spin[0] * 0.3) * (1 - p), (s.spin[1] + t * s.spin[1] * 0.4) * (1 - p), (s.spin[2] + t * s.spin[2] * 0.25) * (1 - p)];
  return { pos, rot, p, scale: mix(1.5, 1, p) };
};

const Board: React.FC<{ img: HTMLImageElement; t: number }> = ({ img, t }) => {
  const tex = useMemo(() => textureOf(img), [img]);
  const geos = useMemo(() => slots.map(s => tilePlane(CW, CH, ...gridTile(s.i, 8, 5))), []);
  const cam = camAt(t);
  const formed = prog(t, FORM + 0.4, FLY[1] + 1.2);
  return (
    <>
      <CameraRig pos={cam.pos} look={cam.look} fov={cam.fov} roll={cam.roll} />
      <fog attach="fog" args={[C.oat, mix(5, 30, formed), mix(42, 160, formed)]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[-6, 8, 14]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={9} shadow-camera-bottom={-9} />
      <mesh position={[0, 0, -0.06]} receiveShadow>
        <planeGeometry args={[60, 34]} />
        <meshStandardMaterial color={C.oat} roughness={1} transparent opacity={formed} />
      </mesh>
      {slots.map((s, i) => {
        const c = cardAt(s, t);
        return (
          <group key={s.i} position={c.pos} rotation={c.rot} scale={c.scale}>
            <mesh position={[0, 0, -0.004]} castShadow={c.p > 0.7}>
              <planeGeometry args={[CW + 0.12, CH + 0.12]} />
              <meshStandardMaterial color={C.ivoryLight} roughness={0.9} side={2} />
            </mesh>
            <mesh geometry={geos[i]}>
              <meshBasicMaterial map={tex} toneMapped={false} />
            </mesh>
            {/* the picture on the back too, so a card seen from behind as it swarms past is never a blank slab */}
            <mesh geometry={geos[i]} position={[0, 0, -0.008]} rotation={[0, Math.PI, 0]}>
              <meshBasicMaterial map={tex} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
};

/** streaks rushing out of the centre while the camera flies (stronger the faster it goes) */
const SpeedLines: React.FC<{ t: number }> = ({ t }) => {
  const z0 = camAt(t).pos[2];
  const z1 = camAt(t + 1 / 30).pos[2];
  const v = Math.min(1, Math.abs(z0 - z1) / 1.1) * (1 - prog(t, FORM, FORM + 0.8));
  if (v < 0.02) return null;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: v }}>
      {Array.from({ length: 46 }, (_, i) => {
        const a = random(`sl-a${i}`) * Math.PI * 2;
        const ph = (t * (1.4 + random(`sl-s${i}`) * 1.2) + random(`sl-p${i}`)) % 1;
        const r0 = 160 + ph * ph * 1100;
        const len = 40 + ph * 260 * v;
        const cx = W / 2;
        const cy = H / 2;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * r0}
            y1={cy + Math.sin(a) * r0 * 0.62}
            x2={cx + Math.cos(a) * (r0 + len)}
            y2={cy + Math.sin(a) * (r0 + len) * 0.62}
            stroke={i % 4 ? C.ivoryLight : C.clay}
            strokeWidth={1.5 + ph * 3}
            strokeLinecap="round"
            opacity={0.25 + ph * 0.5}
          />
        );
      })}
    </svg>
  );
};

/** 36.9–46.0 s: "First, it goes looking…" — the camera dives into a tunnel of the logo board's 40 references; they swarm into its four directions. */
export const Look: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const { imgs, release } = usePreloaded(['tex/refs.jpg']);
  const c = camAt(t);
  const cam = makeCam(c.pos, c.look, c.fov, c.roll);
  const heads = prog(t, HEADS, HEADS + 0.5);
  const colA = toFrame(cam, [COL_X[0], 4.45, 0]);
  const c09 = toFrame(cam, C09.sorted);
  const c09b = toFrame(cam, [C09.sorted[0] + CW / 2, C09.sorted[1] + CH / 2, 0]);
  return (
    <AbsoluteFill style={{ background: C.oat }}>
      <SceneIn>
        {imgs && (
          <ThreeCanvas width={W} height={H} shadows gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} onCreated={release}>
            <Board img={imgs['tex/refs.jpg']} t={t} />
          </ThreeCanvas>
        )}
        <SpeedLines t={t} />
        {heads > 0 &&
          COLS.map((col, i) => {
            const [x, y] = toFrame(cam, [COL_X[i], 4.45, 0]);
            return (
              <div key={col} style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) translateY(${(1 - heads) * 16}px)`, opacity: heads, fontFamily: mono, fontWeight: 800, fontSize: 24, color: C.slate, background: C.ivoryLight, padding: '6px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                {HEAD[col]}
              </div>
            );
          })}
        <Loop x={colA[0]} y={colA[1]} w={380} h={70} start={f(PICK + 0.1)} seed="colA" />
        <Loop x={c09[0]} y={c09[1]} w={(c09b[0] - c09[0]) * 2 + 30} h={(c09[1] - c09b[1]) * 2 + 30} start={f(PICK + 0.7)} seed="c09" />
        <KWord text="look." start={f(LOOKING)} x={W / 2} y={H / 2} size={240} color={C.slate} align="center" out={f(LOOKING + 1.25)} fly />
        {/* "Pick." as the loops land on the two picks */}
        <KWord text="pick." start={f(PICK + 0.1)} x={1440} y={880} size={170} color={C.slate} out={f(L.to - L.from - 0.7)} fly />
      </SceneIn>
      <Sfx name="cwc-whoosh-b" at={f(FLY[0])} volume={0.5} />
      <Sfx name="intro-pop" at={f(LOOKING)} volume={0.3} />
      <Sfx name="cwc-whoosh-a" at={f(LOOKING + 1.2)} volume={0.45} />
      <Sfx name="cwc-whoosh-b" at={f(LOOKING + 2.0)} volume={0.35} />
      <Sfx name="cwc-swish" at={f(FORM + 0.4)} volume={0.45} />
      {slots.map((s, i) => (i % 4 === 0 ? <Sfx key={s.i} name="intro-3-flick" at={f(s.go + 1.4)} volume={0.16} /> : null))}
      <Sfx name="intro-pop" at={f(PICK + 0.1)} volume={0.28} />
      <Sfx name="intro-scribble" at={f(PICK + 0.05)} volume={0.45} />
      <Sfx name="intro-scribble" at={f(PICK + 0.65)} volume={0.45} />
      <Sfx name="cwc-whoosh-a" at={f(L.to - L.from - 0.45)} volume={0.35} />
    </AbsoluteFill>
  );
};
