import React, { useMemo } from 'react';
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import type { SceneProps } from '@mediamake/engine';
import { CookWithClaudeLogo, LOGO_VIEW } from '../../../../brands/cookwithclaude/graphics/Logo';
import { WOK_BOX } from '../../../../brands/cookwithclaude/graphics/lockup';
import { SPARK_BOX, SPARK_D } from '../../../../brands/cookwithclaude/graphics/parts/spark';
import { KWord, SparkTrace, swooshPts } from '../fx';
import { Caret, Ground, prog, Sfx, typed } from '../parts';
import { C, ease, easeInOut, f, H, sans, src, W } from '../theme';
import { CameraRig, hash, mix, toFrame, makeCam, type V3 } from '../three';
import { LOGO_DRAWN, LOGO_START_AT, T } from '../timeline';

const X = T.there;
const S = (s: number) => s - X.from;
const CUT = S(X.logo);
const EMBER = 0.8;
const RISE = 1.6;
const FOV = 35;

/** the wok's bowl as a turned profile: outer wall up to the rim, then back down the inside */
const BOWL = [
  [0.0, -0.58], [0.5, -0.55], [0.95, -0.41], [1.28, -0.18], [1.5, 0.06], [1.62, 0.22],
  [1.54, 0.24], [1.43, 0.08], [1.21, -0.12], [0.89, -0.33], [0.46, -0.46], [0.0, -0.49],
].map(([x, y]) => new THREE.Vector2(x, y));

const sparkGeometry = () => {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPARK_BOX} ${SPARK_BOX}"><path d="${SPARK_D}"/></svg>`);
  const shapes = data.paths.flatMap(p => SVGLoader.createShapes(p));
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 16, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.2, bevelSegments: 3, curveSegments: 24 });
  g.center();
  const s = 1.7 / SPARK_BOX;
  g.scale(s, -s, s);
  return g;
};

const camAt = (t: number) => {
  const k = prog(t, 0, 3.0, easeInOut);
  const a = mix(-0.95, 0, k);
  const r = mix(7.2, 6.3, k);
  const y = mix(2.9, 1.7, k);
  return { pos: [Math.sin(a) * r, y, Math.cos(a) * r] as V3, look: [0, 0.35, 0] as V3 };
};

const Wok: React.FC<{ t: number }> = ({ t }) => {
  const spark = useMemo(sparkGeometry, []);
  const lathe = useMemo(() => new THREE.LatheGeometry(BOWL, 96), []);
  const cam = camAt(t);
  const ember = prog(t, EMBER, EMBER + 0.5);
  const rise = prog(t, RISE, RISE + 1.4, ease);
  return (
    <>
      <CameraRig pos={cam.pos} look={cam.look} fov={FOV} />
      <fog attach="fog" args={[C.slate, 9, 22]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 7, 5]} intensity={1.6} color="#fff1e6" />
      <pointLight position={[0, 2.2, -3]} intensity={30} color={C.clay} distance={12} />
      <pointLight position={[0, 0.2 + rise * 0.9, 0]} intensity={ember * 14 + rise * 24} color="#ffb07a" distance={7} />
      <group rotation={[0, t * 0.25, 0]}>
        <mesh geometry={lathe}>
          <meshStandardMaterial color="#2a2926" metalness={0.75} roughness={0.32} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.58, 0.045, 12, 96]} />
          <meshStandardMaterial color="#3a3833" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[2.35, 0.75, 0]} rotation={[0, 0, -0.95]}>
          <cylinderGeometry args={[0.07, 0.07, 1.9, 16]} />
          <meshStandardMaterial color="#2a2926" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[3.05, 1.25, 0]} rotation={[0, 0, -0.95]}>
          <cylinderGeometry args={[0.11, 0.1, 0.9, 16]} />
          <meshStandardMaterial color="#141413" roughness={0.6} />
        </mesh>
      </group>
      {ember > 0 && (
        <mesh position={[0, -0.32 + rise * 0.5, 0]} scale={(0.1 + ember * 0.08) * (1 - rise * 0.8)}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color="#ffb07a" toneMapped={false} />
        </mesh>
      )}
      {rise > 0 && (
        <mesh geometry={spark} position={[0, -0.25 + rise * 1.25, 0]} rotation={[0, (1 - rise) * 2.6 + Math.sin(t * 2.2) * 0.12, 0]} scale={0.15 + rise * 0.85}>
          <meshStandardMaterial color={C.clay} emissive={C.clay} emissiveIntensity={0.55 + rise * 0.35} metalness={0.1} roughness={0.4} />
        </mesh>
      )}
      {rise > 0 &&
        Array.from({ length: 40 }, (_, i) => {
          const life = ((t - RISE) * (0.55 + hash(i) * 0.6) + hash(i + 9)) % 1;
          const a = hash(i + 3) * Math.PI * 2;
          const rr = 0.2 + hash(i + 5) * 0.9 * life;
          return (
            <mesh key={i} position={[Math.cos(a) * rr, -0.1 + life * 2.6, Math.sin(a) * rr]} scale={0.025 + hash(i + 7) * 0.03}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color={hash(i + 1) > 0.5 ? '#ffb07a' : C.clay} transparent opacity={(1 - life) * rise} toneMapped={false} />
            </mesh>
          );
        })}
    </>
  );
};

/** 60.5–66.9 s: a wok turns in the dark, an ember, Claude's spark rises as the flame — "…there it is." — match cut to the logo. */
export const There: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const v = LOGO_VIEW;
  // match cut: the 3D wok's width on screen, so the 2D logo can start with its wok the same size, then pull back
  const cam = camAt(CUT);
  const c3 = makeCam(cam.pos, cam.look, FOV);
  const [l3] = toFrame(c3, [-1.62, -0.05, 0]);
  const [r3] = toFrame(c3, [1.62, -0.05, 0]);
  const [, wy3] = toFrame(c3, [0, -0.05, 0]);
  const wok3 = r3 - l3;
  const finalW = 1100;
  const wokUnits = WOK_BOX.x1 - WOK_BOX.x0;
  const startW = (wok3 / wokUnits) * v.w;
  const k = prog(t, CUT + 0.15, CUT + 1.3, easeInOut);
  const lw = mix(startW, finalW, k);
  const lh = (lw * v.h) / v.w;
  const s = lw / v.w;
  const wcx = ((WOK_BOX.x0 + WOK_BOX.x1) / 2 - v.x) * s;
  const wcy = ((WOK_BOX.y0 + WOK_BOX.y1) / 2 - v.y) * s;
  const left = mix(W / 2 - wcx, (W - lw) / 2, k);
  const top = mix(wy3 - wcy, (H - lh) / 2, k);
  const vo = S(X.vo);
  return (
    <AbsoluteFill>
      <Ground kind="slate" />
      {t < CUT ? (
        <>
          {/* the wok bubbling away behind it (Pexels stock), lit as the ember catches */}
          <AbsoluteFill style={{ opacity: 0.38 * prog(t, EMBER - 0.3, RISE + 0.4) * (1 - prog(t, CUT - 0.4, CUT)) }}>
            <OffthreadVideo src={src('stock/cut/bubbles.mp4')} muted style={{ width: W, height: H, objectFit: 'cover' }} />
            <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 44% at 50% 52%, rgba(20,20,19,0.92) 0%, rgba(20,20,19,0.35) 70%, rgba(20,20,19,0) 100%)' }} />
          </AbsoluteFill>
          <ThreeCanvas width={W} height={H} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
            <Wok t={t} />
          </ThreeCanvas>
          {/* "Until you find it." — then "…there it is." in the same place */}
          <KWord text="until you find it." start={f(S(X.until))} x={W / 2} y={902} size={76} color={C.ivoryLight} align="center" stagger={1} out={f(vo) - 10} />
          {t >= vo - 0.1 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 860, textAlign: 'center', fontFamily: sans, fontWeight: 800, fontSize: 76, letterSpacing: '-0.04em', color: C.ivoryLight, opacity: 1 - prog(t, CUT - 0.25, CUT) }}>
              {typed('…there it is.', frame, f(vo), 16)}
              <Caret height={56} color={C.clay} blinkFrom={f(vo) + 24} />
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ position: 'absolute', left, top, width: lw, height: lh }}>
            <CookWithClaudeLogo on="slate" startAt={LOGO_START_AT - CUT} />
          </div>
          <SparkTrace pts={swooshPts(W / 2 - 520, W / 2 + 540, (H + finalW * (v.h / v.w)) / 2 + 40, 30)} start={f(S(LOGO_DRAWN) + 0.35)} dur={16} hold={40} width={5} seed="logo" sparkles={18} />
        </>
      )}
      <Sfx name="intro-igniter" at={f(EMBER)} volume={0.7} />
      <Sfx name="cwc-bubble" at={f(EMBER - 0.2)} volume={0.55} dur={f(CUT - EMBER + 0.6)} />
      <Sfx name="cwc-sparkle" at={f(S(LOGO_DRAWN) + 0.35)} volume={0.3} />
      <Sfx name="intro-sting-f" at={f(S(LOGO_DRAWN) - 1.405)} volume={0.7} />
    </AbsoluteFill>
  );
};
