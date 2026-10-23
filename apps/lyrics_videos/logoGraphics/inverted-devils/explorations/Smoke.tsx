/**
 * Domain-warped crimson smoke (the same shader as Inexorable's, without the song):
 * back billows and front wisps at two depths, lit from behind at glowPos.
 */
import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { H, W } from '../theme';

type RGB = [number, number, number];
export const TONES: Record<'crimson' | 'wine' | 'ember', { deep: RGB; lit: RGB; hot: RGB }> = {
  crimson: { deep: [0.03, 0.0, 0.008], lit: [0.55, 0.03, 0.07], hot: [1.0, 0.36, 0.32] },
  wine: { deep: [0.025, 0.0, 0.01], lit: [0.4, 0.02, 0.09], hot: [0.95, 0.3, 0.38] },
  ember: { deep: [0.04, 0.008, 0.0], lit: [0.62, 0.12, 0.05], hot: [1.0, 0.55, 0.32] },
};

const VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uTravel;
uniform vec3 uDeep;
uniform vec3 uLit;
uniform vec3 uHot;
uniform float uDensity;
uniform float uClose;
uniform float uGlow;
uniform vec2 uGlowPos;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = r * p * 2.03 + vec2(3.1, 1.7);
    a *= 0.5;
  }
  return v;
}
float smoke(vec2 p, float t) {
  vec2 q = vec2(fbm(p + t * vec2(0.03, 0.05)), fbm(p + vec2(5.2, 1.3) - t * vec2(0.04, 0.02)));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + 0.12 * t), fbm(p + 3.0 * q + vec2(8.3, 2.8) - 0.1 * t));
  return fbm(p + 2.6 * r);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 c = (uv - 0.5) * vec2(asp, 1.0);

  vec2 pb = c * 1.3 + vec2(2.0, 4.0 - uTravel * 0.55);
  float b = smoke(pb, uTime * 0.5);
  vec2 pf = c * 2.3 + vec2(11.0 + 0.2 * sin(uTime * 0.05), 7.0 - uTravel * 1.1);
  float f = smoke(pf, uTime * 0.8);

  float db = smoothstep(0.32, 0.82, b);
  float df = smoothstep(0.44, 0.86, f);

  vec2 gp = (uGlowPos - 0.5) * vec2(asp, 1.0);
  float gd = length((c - gp) * vec2(0.75, 1.0));
  float glow = uGlow * (exp(-gd * gd * 2.4) * 0.95 + 0.22);

  vec3 col = mix(uDeep, uLit, clamp(db * (0.3 + 0.95 * glow), 0.0, 1.0));
  col = mix(col, uHot, clamp(pow(db * df, 1.4) * glow * 0.75, 0.0, 1.0));
  col += uLit * df * 0.3 * glow;

  float a = uDensity * clamp(0.16 + 0.58 * db + 0.42 * df, 0.0, 1.0);

  float edge = length(c * vec2(0.82, 1.2)) + (b - 0.5) * 0.55 + (f - 0.5) * 0.25;
  float cm = smoothstep(1.08 - uClose * 0.9, 1.3 - uClose * 0.85, edge) * uClose;
  col = mix(col, uDeep * 0.7 + uLit * 0.08, cm);
  a = clamp(max(a, cm), 0.0, 1.0);

  gl_FragColor = vec4(col * a, a);
}`;

type Uniforms = Record<string, { value: unknown }>;

const Plane: React.FC<{ set: (u: Uniforms) => void }> = ({ set }) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uRes: { value: new THREE.Vector2(W, H) },
          uTime: { value: 0 },
          uTravel: { value: 0 },
          uDeep: { value: new THREE.Vector3() },
          uLit: { value: new THREE.Vector3() },
          uHot: { value: new THREE.Vector3() },
          uDensity: { value: 0 },
          uClose: { value: 0 },
          uGlow: { value: 1 },
          uGlowPos: { value: new THREE.Vector2(0.5, 0.5) },
        },
        depthTest: false,
        depthWrite: false,
        blending: THREE.NoBlending,
      }),
    [],
  );
  set(material.uniforms as Uniforms);
  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

export type SmokeProps = {
  t: number;
  density: number;
  tone?: keyof typeof TONES;
  glow?: number;
  /** 0..1 frame coordinates of the backlight */
  glowPos?: [number, number];
  /** upward speed (screen heights per second, roughly) */
  rise?: number;
  /** 0..1 dense dark smoke closing in from the edges */
  close?: number;
  /** offset into the noise so variants don't share the same smoke */
  seed?: number;
};

export const Smoke: React.FC<SmokeProps> = ({ t, density, tone = 'crimson', glow = 1, glowPos = [0.5, 0.5], rise = 0.05, close = 0, seed = 0 }) => {
  const tn = TONES[tone];
  const set = (u: Uniforms) => {
    u.uTime.value = t + seed * 37;
    u.uTravel.value = t * rise + seed * 3;
    (u.uDeep.value as THREE.Vector3).set(...tn.deep);
    (u.uLit.value as THREE.Vector3).set(...tn.lit);
    (u.uHot.value as THREE.Vector3).set(...tn.hot);
    u.uDensity.value = density;
    u.uClose.value = close;
    u.uGlow.value = glow;
    (u.uGlowPos.value as THREE.Vector2).set(glowPos[0], 1 - glowPos[1]);
  };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <ThreeCanvas
        width={W}
        height={H}
        gl={{ antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Plane set={set} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
