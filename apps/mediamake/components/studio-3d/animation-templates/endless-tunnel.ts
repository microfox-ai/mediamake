import type { SceneTemplate } from './types'
import type { SceneObject, AnimationTrack } from '../types'
import { obj, kf, clip, uid, hslHex, TAU } from './helpers'

/**
 * Endless Tunnel — 28 concentric rings stacked along Z, all rushing toward the
 * camera. When a ring passes the camera it teleports to the far end, creating
 * an infinite tunnel zoom. Rings rotate around their own Z axis and shift hue
 * along the tunnel length.
 *
 * The camera is parked at the near end facing into the tunnel.
 */

const RINGS    = 28
const SPACING  = 1.6        // distance between rings along Z
const NEAR_Z   = -3         // closest ring Z (behind camera)
const FAR_Z    = NEAR_Z + RINGS * SPACING  // farthest ring
const DURATION = 8

function buildObjects(): SceneObject[] {
  const objects: SceneObject[] = []

  for (let i = 0; i < RINGS; i++) {
    const z = NEAR_Z + i * SPACING
    const tNorm = i / RINGS
    const color = hslHex(280 - tNorm * 280, 0.85, 0.55)
    const ringScale = 2.5 + (i % 3 === 0 ? 0.4 : 0)  // accent every 3rd ring

    objects.push(obj({
      id: `tn_ring_${i}`, name: `Ring ${i + 1}`, type: 'torus',
      position: [0, 0, z],
      rotation: [0, 0, (i / RINGS) * TAU],
      scale: [ringScale, ringScale, 0.18],
      color, roughness: 0, metalness: 1,
      emissive: color, emissiveIntensity: 1.2,
      opacity: 0.95, castShadow: false, receiveShadow: false,
    }))
  }

  // 3 floating accent cubes that race forward separately
  for (let i = 0; i < 3; i++) {
    const z = NEAR_Z + (RINGS / 3) * SPACING * i
    objects.push(obj({
      id: `tn_acc_${i}`, name: `Accent ${i + 1}`, type: 'box',
      position: [Math.cos(i) * 1.4, Math.sin(i * 1.7) * 1.2, z],
      scale: [0.25, 0.25, 0.25],
      color: '#ffffff', roughness: 0.05, metalness: 0.95,
      emissive: '#ffffff', emissiveIntensity: 1.4,
    }))
  }

  // Soft white point light at the camera position
  objects.push(obj({
    id: 'tn_light', name: 'Tunnel Light', type: 'pointlight',
    position: [0, 0, NEAR_Z],
    lightColor: '#ffffff', lightIntensity: 3, lightDistance: 16, lightDecay: 1.2,
  }))

  return objects
}

function buildTracks(): AnimationTrack[] {
  const tracks: AnimationTrack[] = []

  // Each ring moves from its start position toward the camera, wraps around.
  // We use TWO sub-segments per ring so the position wraps cleanly mid-clip
  // without a visible jump.
  for (let i = 0; i < RINGS; i++) {
    const startZ = NEAR_Z + i * SPACING
    const range = RINGS * SPACING
    const speed = range / DURATION  // units per second
    // Time at which this ring reaches the camera (z = NEAR_Z)
    const reachT = (startZ - NEAR_Z) / speed
    const tNorm  = i / RINGS

    const frames = []
    // Phase 1: travel from startZ → NEAR_Z at time reachT
    frames.push(kf(0, {
      position: [0, 0, startZ],
      rotation: [0, 0, tNorm * TAU],
      scale: [2.5 + (i % 3 === 0 ? 0.4 : 0), 2.5 + (i % 3 === 0 ? 0.4 : 0), 0.18],
    }, 'linear'))
    frames.push(kf(reachT, {
      position: [0, 0, NEAR_Z],
      rotation: [0, 0, tNorm * TAU + TAU * 0.5],
      scale: [2.5 + (i % 3 === 0 ? 0.4 : 0), 2.5 + (i % 3 === 0 ? 0.4 : 0), 0.18],
    }, 'linear'))
    // Phase 2: teleport to far end and continue traveling
    // We do this by adding a duplicate keyframe at the same time but new position.
    // The engine interpolates between adjacent keyframes — duplicate-time keyframes
    // create a near-instant jump.
    frames.push(kf(reachT + 0.0001, {
      position: [0, 0, FAR_Z],
      rotation: [0, 0, tNorm * TAU + TAU * 0.5],
      scale: [2.5 + (i % 3 === 0 ? 0.4 : 0), 2.5 + (i % 3 === 0 ? 0.4 : 0), 0.18],
    }, 'linear'))
    frames.push(kf(DURATION, {
      position: [0, 0, FAR_Z - speed * (DURATION - reachT)],
      rotation: [0, 0, tNorm * TAU + TAU * 1.0],
      scale: [2.5 + (i % 3 === 0 ? 0.4 : 0), 2.5 + (i % 3 === 0 ? 0.4 : 0), 0.18],
    }, 'linear'))

    tracks.push({ objectId: `tn_ring_${i}`, keyframes: frames })
  }

  // Accent cubes: same forward-travel + a gentle swirl in XY
  for (let i = 0; i < 3; i++) {
    const startZ = NEAR_Z + (RINGS / 3) * SPACING * i
    const range = RINGS * SPACING
    const speed = range / DURATION
    const reachT = (startZ - NEAR_Z) / speed

    const swirl = (t: number) => [Math.cos(t * TAU + i) * 1.4, Math.sin(t * TAU * 1.7 + i) * 1.2] as [number, number]

    const frames = []
    const stepsPre = 4, stepsPost = 4
    for (let s = 0; s <= stepsPre; s++) {
      const localT = (s / stepsPre) * reachT
      const [xx, yy] = swirl(localT / DURATION)
      const z = startZ - localT * speed
      frames.push(kf(localT, { position: [xx, yy, z], rotation: [localT * TAU, localT * TAU, 0] }, 'linear'))
    }
    for (let s = 0; s <= stepsPost; s++) {
      const localT = reachT + (s / stepsPost) * (DURATION - reachT)
      const [xx, yy] = swirl(localT / DURATION)
      const z = (s === 0 ? FAR_Z : FAR_Z - (localT - reachT) * speed)
      frames.push(kf(localT + (s === 0 ? 0.0001 : 0), {
        position: [xx, yy, z],
        rotation: [localT * TAU, localT * TAU, 0],
      }, 'linear'))
    }
    tracks.push({ objectId: `tn_acc_${i}`, keyframes: frames })
  }

  return tracks
}

export const ENDLESS_TUNNEL: SceneTemplate = {
  id: 'endless-tunnel',
  name: 'Endless Tunnel',
  description: 'Hyperspeed neon-ring tunnel rushing past the camera, infinite loop',
  emoji: '🛸',
  category: 'sci-fi',
  settings: {
    background: '#000000',
    environment: 'none',
    ambientIntensity: 0.0,
    directionalIntensity: 0.0,
    directionalPosition: [0, 10, 0],
    showGrid: false,
  },
  objects: buildObjects(),
  clips: [clip({
    id: uid('clip'),
    name: 'Hyperspeed',
    duration: DURATION,
    loop: true,
    tracks: buildTracks(),
    cameraTrack: [
      {
        id: uid('cam'),
        time: 0,
        position: [0, 0, NEAR_Z - 1.5],
        target: [0, 0, FAR_Z * 0.5],
        fov: 75,
        easing: 'ease-in-out',
      },
      {
        id: uid('cam'),
        time: DURATION,
        position: [0, 0, NEAR_Z - 1.5],
        target: [0, 0, FAR_Z * 0.5],
        fov: 75,
        easing: 'ease-in-out',
      },
    ],
  })],
}
