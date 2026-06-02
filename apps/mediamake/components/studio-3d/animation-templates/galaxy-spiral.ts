import type { SceneTemplate } from './types'
import type { SceneObject, AnimationTrack } from '../types'
import {
  obj, kf, clip, uid, cameraOrbit, logSpiral, hslHex, TAU,
} from './helpers'

/**
 * Galaxy Spiral — a logarithmic spiral of glowing star points across multiple arms.
 * The whole galaxy slowly rotates, with star colors shifting from white-hot center
 * to deep blue at the edges. Optional bright bulge in the middle.
 */

const ARMS  = 3
const STARS = 220
const DURATION = 30
const Y_JITTER = 0.6

function buildObjects(): SceneObject[] {
  const objects: SceneObject[] = []

  // Bulge — bright central sphere
  objects.push(obj({
    id: 'gx_bulge', name: 'Galactic Core', type: 'sphere',
    position: [0, 0, 0], scale: [0.55, 0.55, 0.55],
    color: '#fff8d6', roughness: 1, metalness: 0,
    emissive: '#ffd166', emissiveIntensity: 2.5,
    castShadow: false,
  }))

  // Outer halo (very dim large sphere — gives glow effect without volumetrics)
  objects.push(obj({
    id: 'gx_halo', name: 'Halo', type: 'sphere',
    position: [0, 0, 0], scale: [1.4, 1.4, 1.4],
    color: '#332244', roughness: 1, metalness: 0,
    emissive: '#553388', emissiveIntensity: 0.6,
    opacity: 0.3, castShadow: false, receiveShadow: false,
  }))

  // Stars on the spiral
  const points = logSpiral({
    count: STARS, a: 0.18, b: 0.18, arms: ARMS, y: 0, jitter: 0.25,
  })

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const distFromCenter = Math.sqrt(p[0] * p[0] + p[2] * p[2])
    const norm = Math.min(1, distFromCenter / 6.5)

    // Y jitter — gives the disk slight thickness
    const seed = Math.sin(i * 13.37) * 10000
    const y = ((seed - Math.floor(seed)) - 0.5) * Y_JITTER * (1 - norm * 0.6)

    // Hue cycles from warm yellow center → magenta arms → cool blue tips
    const hue = 50 + norm * 230
    const color = hslHex(hue, 0.85, 0.6)
    const size  = 0.05 + (1 - norm) * 0.07

    objects.push(obj({
      id: `gx_s_${i}`, name: `Star ${i + 1}`, type: 'sphere',
      position: [p[0], y, p[2]], scale: [size, size, size],
      color, roughness: 0.3, metalness: 0.4,
      emissive: color, emissiveIntensity: 0.9 + (1 - norm) * 0.6,
      castShadow: false, receiveShadow: false,
    }))
  }

  // Soft fill light
  objects.push(obj({
    id: 'gx_light', name: 'Galactic Light', type: 'pointlight',
    position: [0, 1, 0],
    lightColor: '#ffbb88', lightIntensity: 2.5, lightDistance: 18, lightDecay: 1.4,
  }))

  return objects
}

function buildTracks(): AnimationTrack[] {
  const tracks: AnimationTrack[] = []

  // Each star sweeps around the galactic center.
  // Inner stars rotate faster (Keplerian-ish), outer stars slower — gives an
  // organic differential rotation.
  const points = logSpiral({
    count: STARS, a: 0.18, b: 0.18, arms: ARMS, y: 0, jitter: 0.25,
  })
  for (let i = 0; i < points.length; i++) {
    const [x0, _y, z0] = points[i]
    const r = Math.sqrt(x0 * x0 + z0 * z0)
    const baseAngle = Math.atan2(z0, x0)
    const seed = Math.sin(i * 13.37) * 10000
    const y = ((seed - Math.floor(seed)) - 0.5) * Y_JITTER * (1 - Math.min(1, r / 6.5) * 0.6)

    // Faster rotation closer to the center
    const cycles = 0.4 + 0.8 / Math.max(0.5, r)
    const steps = 24
    const frames = []
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * DURATION
      const a = baseAngle + (s / steps) * cycles * TAU
      frames.push(kf(t, { position: [Math.cos(a) * r, y, Math.sin(a) * r] }, 'linear'))
    }
    tracks.push({ objectId: `gx_s_${i}`, keyframes: frames })
  }

  // Bulge slow spin
  tracks.push({
    objectId: 'gx_bulge',
    keyframes: [
      kf(0,        { rotation: [0, 0, 0] }, 'linear'),
      kf(DURATION, { rotation: [0, TAU * 0.3, 0] }, 'linear'),
    ],
  })

  return tracks
}

export const GALAXY_SPIRAL: SceneTemplate = {
  id: 'galaxy-spiral',
  name: 'Galaxy Spiral',
  description: '3-armed logarithmic spiral of 220 stars with differential rotation',
  emoji: '🌌',
  category: 'space',
  settings: {
    background: '#01010a',
    environment: 'none',
    ambientIntensity: 0.05,
    directionalIntensity: 0.0,
    directionalPosition: [0, 10, 0],
    showGrid: false,
    skyEnabled: true,
    skyPreset: 'night',
  },
  objects: buildObjects(),
  clips: [clip({
    id: uid('clip'),
    name: 'Galactic Rotation',
    duration: DURATION,
    loop: true,
    tracks: buildTracks(),
    cameraTrack: cameraOrbit({
      duration: DURATION,
      radius: 12,
      height: 4,
      cycles: 0.4,
      steps: 16,
      fov: 60,
    }),
  })],
}
