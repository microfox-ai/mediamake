/**
 * three.js helpers for the 3D shots (rendered through @remotion/three), after the Microfox kit's
 * parts/three.tsx: a camera rig set every frame, the same camera as plain math (so 2D overlays can sit
 * on 3D points), planes that show one tile of an atlas, textures, and the favicon voxel tokens.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { cancelRender, continueRender, delayRender } from 'remotion';
import * as THREE from 'three';
import voxels from '../input/voxels.json';
import { H, src, W } from './theme';

export type V3 = [number, number, number];

export const makeCam = (pos: V3, look: V3, fov: number, roll = 0) => {
  const cam = new THREE.PerspectiveCamera(fov, W / H, 0.05, 400);
  cam.position.set(...pos);
  cam.lookAt(...look);
  if (roll) cam.rotateZ(roll);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};

/** where a world point lands in the 1920 × 1080 frame */
export const toFrame = (cam: THREE.PerspectiveCamera, p: V3): [number, number] => {
  const v = new THREE.Vector3(...p).project(cam);
  return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
};

/** the scene's camera, set every frame; scenes built in px units pass far (and near) to match; roll turns it round its view axis */
export const CameraRig: React.FC<{ pos: V3; look: V3; fov: number; near?: number; far?: number; roll?: number }> = ({ pos, look, fov, near = 0.05, far = 400, roll = 0 }) => {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pos);
  camera.fov = fov;
  camera.near = near;
  camera.far = far;
  camera.up.set(0, 1, 0);
  camera.lookAt(...look);
  if (roll) camera.rotateZ(roll);
  camera.updateProjectionMatrix();
  return null;
};

/** a w × h plane whose UVs show one tile [u0, v0] → [u1, v1] of a texture (v up) */
export const tilePlane = (w: number, h: number, u0: number, v0: number, u1: number, v1: number) => {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  uv.needsUpdate = true;
  return g;
};

/** tile i of a cols × rows atlas, counted from the top left */
export const gridTile = (i: number, cols: number, rows: number) => {
  const c = i % cols;
  const r = Math.floor(i / cols);
  return [c / cols, 1 - (r + 1) / rows, (c + 1) / cols, 1 - r / rows] as const;
};

/**
 * Images for WebGL textures, loaded before the canvas mounts: <ThreeCanvas> draws once per frame, so a
 * texture that arrives later would miss the frame. Hold `release` until the canvas exists (its onCreated).
 */
export const usePreloaded = (paths: string[]) => {
  const [imgs, setImgs] = useState<Record<string, HTMLImageElement> | null>(null);
  const [handle] = useState(() => delayRender(`images ${paths.join(', ')}`));
  useEffect(() => {
    let alive = true;
    Promise.all(
      paths.map(
        p =>
          new Promise<[string, HTMLImageElement]>((res, rej) => {
            const i = new Image();
            i.onload = () => res([p, i]);
            i.onerror = () => rej(new Error(`could not load ${p}`));
            i.src = src(p);
          }),
      ),
    )
      .then(list => alive && setImgs(Object.fromEntries(list)))
      .catch(e => cancelRender(e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const release = useCallback(() => continueRender(handle), [handle]);
  return { imgs, release };
};

export const textureOf = (img: HTMLImageElement) => {
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
};

type VoxelSet = { w: number; h: number; cubes: number[][] };
const VOX = voxels as Record<string, VoxelSet>;
export const hasVoxels = (id: string) => !!VOX[id];

/** A brand's 32 px favicon as a token of little cubes, one per opaque pixel, centred on its group. */
export const VoxelToken: React.FC<{ id: string; size?: number; depth?: number }> = ({ id, size = 1.4, depth = 0.9 }) => {
  const set = VOX[id];
  const ref = useRef<THREE.InstancedMesh>(null);
  const cube = size / set.w;
  const geo = useMemo(() => new THREE.BoxGeometry(cube * 0.96, cube * 0.96, cube * depth), [cube, depth]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    set.cubes.forEach(([x, y, r, g, b], i) => {
      o.position.set((x - set.w / 2 + 0.5) * cube, -(y - set.h / 2 + 0.5) * cube, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [set, cube]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, set.cubes.length]} castShadow>
      <meshStandardMaterial roughness={0.45} metalness={0.05} />
    </instancedMesh>
  );
};

/** deterministic 0..1 from a number */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
