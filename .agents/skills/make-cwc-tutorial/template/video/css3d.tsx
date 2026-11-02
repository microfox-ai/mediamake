/**
 * Real 3D placement for DOM layers (videos, images) from a three.js camera, the way three's CSS3DRenderer
 * does it. Videos stay frame-exact this way: in a render, <ThreeCanvas> draws once per frame, before an
 * async video texture arrives, so video planes inside WebGL lag or come out empty. World units are CSS px.
 */
import React from 'react';
import * as THREE from 'three';
import { H, W } from './theme';
import type { V3 } from './three';

const eps = (v: number) => (Math.abs(v) < 1e-10 ? 0 : v);

export const cssCamera = (cam: THREE.PerspectiveCamera) => {
  const fovPx = cam.projectionMatrix.elements[5] * (H / 2);
  const e = cam.matrixWorldInverse.elements;
  const m = [e[0], -e[1], e[2], e[3], e[4], -e[5], e[6], e[7], e[8], -e[9], e[10], e[11], e[12], -e[13], e[14], e[15]].map(eps);
  return `perspective(${fovPx}px) translateZ(${fovPx}px) matrix3d(${m.join(',')}) translate(${W / 2}px, ${H / 2}px)`;
};

const tmp = new THREE.Object3D();
export const cssObject = (pos: V3, rot: V3 = [0, 0, 0], scale = 1) => {
  tmp.position.set(...pos);
  tmp.rotation.set(...rot);
  tmp.scale.setScalar(scale);
  tmp.updateMatrixWorld(true);
  const e = tmp.matrixWorld.elements;
  const m = [e[0], e[1], e[2], e[3], -e[4], -e[5], -e[6], -e[7], e[8], e[9], e[10], e[11], e[12], e[13], e[14], e[15]].map(eps);
  return `translate(-50%,-50%) matrix3d(${m.join(',')})`;
};

/** The view: a frame-sized box whose children are placed in the camera's 3D space. */
export const Css3D: React.FC<{ cam: THREE.PerspectiveCamera; children: React.ReactNode; style?: React.CSSProperties }> = ({ cam, children, style }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden', ...style }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformStyle: 'preserve-3d', transform: cssCamera(cam) }}>{children}</div>
  </div>
);

/** One flat object (w × h px) at a world position and rotation. */
export const Css3DObject: React.FC<{ pos: V3; rot?: V3; scale?: number; w: number; h: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  pos,
  rot,
  scale = 1,
  w,
  h,
  children,
  style,
}) => (
  <div style={{ position: 'absolute', width: w, height: h, transform: cssObject(pos, rot, scale), backfaceVisibility: 'hidden', ...style }}>{children}</div>
);

/** One tile of an atlas video/image, cropped into a w × h box. */
export const AtlasCrop: React.FC<{ cols: number; rows: number; i: number; w: number; h: number; children: React.ReactNode }> = ({ cols, rows, i, w, h, children }) => (
  <div style={{ position: 'relative', width: w, height: h, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', width: w * cols, height: h * rows, left: -(i % cols) * w, top: -Math.floor(i / cols) * h }}>{children}</div>
  </div>
);
