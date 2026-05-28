import type { SceneTemplate } from './types'
import type { SceneObject, AnimationTrack } from '../types'
import { obj, kf, clip, uid, cameraOrbit, hslHex, PI } from './helpers'

/**
 * Domino Cascade — 24 colorful dominos arranged in a curving line.
 * They fall one after another with rotational easing, like the real thing.
 * Loops back upright at the end with a brief reset frame.
 */

const COUNT     = 24
const DURATION  = 8
const FALL_TIME = 0.45        // time each domino takes to tip over
const STAGGER   = (DURATION - FALL_TIME - 1.5) / (COUNT - 1)  // delay between adjacent dominos
const DOMINO    = {
  width:  0.18,
  height: 1.0,
  depth:  0.5,
}
const SPACING   = 0.55        // distance between domino centers along the path

// Build a gentle S-curve path
function pathPoint(i: number): { pos: [number, number, number]; yaw: number } {
  const t = i / (COUNT - 1)
  const x = (i - (COUNT - 1) / 2) * SPACING
  const z = Math.sin(t * Math.PI * 2) * 1.4
  // Yaw the domino so it faces along the path direction
  // dz/dt = 1.4 * 2π * cos(t * 2π)
  const dz = 1.4 * 2 * Math.PI * Math.cos(t * Math.PI * 2)
  const yaw = Math.atan2(dz, SPACING * (COUNT - 1)) * 0.7
  return { pos: [x, DOMINO.height / 2, z], yaw }
}

function buildObjects(): SceneObject[] {
  const objects: SceneObject[] = []

  // Floor
  objects.push(obj({
    id: 'dom_floor', name: 'Floor', type: 'plane',
    position: [0, 0, 0], rotation: [-PI / 2, 0, 0], scale: [40, 18, 1],
    color: '#1e1e26', roughness: 0.85, metalness: 0.15,
    castShadow: false, receiveShadow: true,
  }))

  for (let i = 0; i < COUNT; i++) {
    const { pos, yaw } = pathPoint(i)
    const color = hslHex((i / COUNT) * 320 + 10, 0.85, 0.55)
    objects.push(obj({
      id: `dom_${i}`, name: `Domino ${i + 1}`, type: 'box',
      position: pos, rotation: [0, yaw, 0],
      scale: [DOMINO.width, DOMINO.height, DOMINO.depth],
      color, roughness: 0.3, metalness: 0.5,
      emissive: color, emissiveIntensity: 0.12,
    }))
  }

  // Lights
  objects.push(obj({
    id: 'dom_key', name: 'Key Light', type: 'spotlight',
    position: [-5, 9, 5],
    lightColor: '#ffffff', lightIntensity: 5, lightDistance: 25, lightDecay: 1.4,
    lightAngle: 0.7, lightPenumbra: 0.5,
  }))
  objects.push(obj({
    id: 'dom_fill', name: 'Fill Light', type: 'pointlight',
    position: [6, 3, -4],
    lightColor: '#ff5577', lightIntensity: 2, lightDistance: 14, lightDecay: 1.6,
  }))

  return objects
}

function buildTracks(): AnimationTrack[] {
  const tracks: AnimationTrack[] = []

  for (let i = 0; i < COUNT; i++) {
    const { pos, yaw } = pathPoint(i)
    const startTime = i * STAGGER
    const midTime = startTime + FALL_TIME * 0.55
    const endTime = startTime + FALL_TIME

    // The domino tips forward by 90° around X (in its local frame).
    // After tipping, its center drops slightly because we're rotating around the base.
    // For simplicity we approximate: y drops to depth/2, z shifts by height/2 forward.
    const baseY = DOMINO.height / 2
    const fallenY = DOMINO.depth / 2
    // Forward direction in world coords given yaw
    const fx = Math.sin(yaw)
    const fz = Math.cos(yaw)
    const fallenPos: [number, number, number] = [
      pos[0] + fx * DOMINO.height / 2,
      fallenY,
      pos[2] + fz * DOMINO.height / 2,
    ]
    const midPos: [number, number, number] = [
      pos[0] + fx * DOMINO.height / 3.5,
      baseY * 0.78,
      pos[2] + fz * DOMINO.height / 3.5,
    ]

    const frames = [
      kf(0,         { position: pos, rotation: [0, yaw, 0], scale: [DOMINO.width, DOMINO.height, DOMINO.depth] }, 'linear'),
      kf(startTime, { position: pos, rotation: [0, yaw, 0], scale: [DOMINO.width, DOMINO.height, DOMINO.depth] }, 'ease-in'),
      kf(midTime,   { position: midPos, rotation: [0, yaw, -PI / 4], scale: [DOMINO.width, DOMINO.height, DOMINO.depth] }, 'ease-in'),
      kf(endTime,   { position: fallenPos, rotation: [0, yaw, -PI / 2], scale: [DOMINO.width, DOMINO.height, DOMINO.depth] }, 'bounce'),
      kf(DURATION - 1.0, { position: fallenPos, rotation: [0, yaw, -PI / 2], scale: [DOMINO.width, DOMINO.height, DOMINO.depth] }, 'ease-in-out'),
      // Reset back upright at the end so the loop reads cleanly
      kf(DURATION,  { position: pos, rotation: [0, yaw, 0], scale: [DOMINO.width, DOMINO.height, DOMINO.depth] }, 'ease-out'),
    ]
    tracks.push({ objectId: `dom_${i}`, keyframes: frames })
  }

  return tracks
}

export const DOMINO_CASCADE: SceneTemplate = {
  id: 'domino-cascade',
  name: 'Domino Cascade',
  description: '24 dominos tipping in sequence along a curving path',
  emoji: '🁢',
  category: 'physics',
  settings: {
    background: '#0e0a18',
    environment: 'studio',
    ambientIntensity: 0.25,
    directionalIntensity: 1.5,
    directionalPosition: [6, 10, 4],
    showGrid: false,
  },
  objects: buildObjects(),
  clips: [clip({
    id: uid('clip'),
    name: 'Cascade',
    duration: DURATION,
    loop: true,
    tracks: buildTracks(),
    cameraTrack: cameraOrbit({
      duration: DURATION,
      radius: 9,
      height: 3.6,
      target: [0, 0.4, 0],
      cycles: 0.25,
      steps: 16,
      fov: 55,
    }),
  })],
}
