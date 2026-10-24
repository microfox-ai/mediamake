/**
 * '@lights': the F1 start lights in three.js. Five pods on a gantry, a low camera dollying in; one
 * pod's red pair comes on per `cfg.on` beat (with a camera kick), all go out at `cfg.out`.
 * Everything is derived from song time (no useFrame), so any frame renders on its own.
 */
import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AbsoluteFill, Easing, interpolate } from 'remotion';
import type { Manifest } from '../../kit/manifest';
import { beatTime } from '../resolve.ts';

type Theme = { fonts: { line: string; data: string }; colors: { bone: string; red: string } };

const glowTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,80,50,0.9)');
  grd.addColorStop(0.5, 'rgba(255,30,10,0.25)');
  grd.addColorStop(1, 'rgba(255,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};

const Camera: React.FC<{ pos: [number, number, number]; look: [number, number, number]; roll: number }> = ({ pos, look, roll }) => {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pos);
  camera.fov = 30;
  camera.near = 0.1;
  camera.far = 80;
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(...look);
  camera.updateProjectionMatrix();
  return null;
};

const POD_X = [-2.6, -1.3, 0, 1.3, 2.6];
const LAMP_Y = [1.05, 0.45, -0.15, -0.75];

export const StartLights: React.FC<{
  manifest: Manifest;
  theme: Theme;
  w: number;
  h: number;
  cfg: { on: number[]; out: number };
  song: number;
}> = ({ manifest, theme, w, h, cfg, song }) => {
  const m = manifest as never;
  const ons = cfg.on.map(b => beatTime(m, b));
  const out = beatTime(m, cfg.out);
  const lit = song >= out ? 0 : ons.filter(t => song >= t).length;
  const last = ons.filter(t => song >= t).pop() ?? -10;
  const kick = Math.exp(-(song - last) * 9); // the camera jolts as each pair comes on
  const span = interpolate(song, [ons[0] - 2, out], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const glow = useMemo(glowTexture, []);
  const jx = Math.sin(song * 61) * 0.05 * kick;
  const jy = Math.cos(song * 47) * 0.05 * kick;
  const pos: [number, number, number] = [-0.9 + 1.3 * span + jx, -1.1 + 0.4 * span + jy, 10.5 - 4.2 * span - 0.25 * kick];
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a0d0b 0%, #070707 60%, #030303 100%)' }}>
      <ThreeCanvas width={w} height={h} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
        <Camera pos={pos} look={[0.2 * span, 0.35, 0]} roll={-0.05 + 0.08 * span} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 6]} intensity={1.1} />
        <directionalLight position={[-5, 2, -3]} intensity={0.6} color="#8090ff" />
        {/* gantry */}
        <mesh position={[0, 1.95, -0.1]}>
          <boxGeometry args={[7.6, 0.32, 0.5]} />
          <meshStandardMaterial color="#141414" metalness={0.7} roughness={0.35} />
        </mesh>
        {POD_X.map((x, i) => {
          const on = i < lit;
          return (
            <group key={i} position={[x, 0, 0]}>
              <mesh position={[0, 0.15, -0.05]}>
                <boxGeometry args={[1.0, 2.55, 0.45]} />
                <meshStandardMaterial color="#0d0d0d" metalness={0.6} roughness={0.4} />
              </mesh>
              {LAMP_Y.map((y, j) => {
                const red = on && j >= 2; // the bottom pair is the start light
                return (
                  <group key={j} position={[0, y, 0.2]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[0.3, 0.3, 0.08, 40]} />
                      <meshStandardMaterial color={red ? '#ff2a14' : '#1c0a08'} emissive={red ? '#ff2010' : '#000000'} emissiveIntensity={red ? 2.6 : 0} metalness={0.2} roughness={0.25} />
                    </mesh>
                    {red && (
                      <sprite position={[0, 0, 0.12]} scale={[1.9, 1.9, 1]}>
                        <spriteMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.95} />
                      </sprite>
                    )}
                  </group>
                );
              })}
              {on && <pointLight position={[0, -0.4, 1.2]} color="#ff2a10" intensity={6} distance={4.5} />}
            </group>
          );
        })}
      </ThreeCanvas>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: h * 0.08, textAlign: 'center', fontFamily: theme.fonts.data, fontSize: 18, letterSpacing: '0.6em', color: theme.colors.bone, opacity: 0.7 }}>
        LIGHTS <span style={{ color: theme.colors.red }}>{lit}</span> / 5
      </div>
    </AbsoluteFill>
  );
};
