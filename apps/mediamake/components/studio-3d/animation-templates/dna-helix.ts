import type { SceneTemplate } from './types'
import type { SceneObject, AnimationTrack } from '../types'
import { obj, kf, clip, uid, cameraOrbit, PI, TAU, lerpColor } from './helpers'

/**
 * DNA Helix — two intertwined strands of glowing spheres connected by rungs.
 * Rotates around the Y axis. Camera slowly orbits at a low angle.
 */

const TURNS    = 4         // helical turns along the height
const STEPS    = 28        // spheres per strand
const HEIGHT   = 6         // total height
const RADIUS   = 0.7       // helix radius
const DURATION = 12

const COLOR_A = '#22d3ee'  // cyan
const COLOR_B = '#a855f7'  // purple

function buildObjects(): SceneObject[] {
  const objects: SceneObject[] = []

  // Floor — dark glossy
  objects.push(obj({
    id: 'dna_floor', name: 'Floor', type: 'plane',
    position: [0, -0.01, 0], rotation: [-PI / 2, 0, 0], scale: [16, 16, 1],
    color: '#0a0814', roughness: 0.2, metalness: 0.7,
    castShadow: false, receiveShadow: true,
  }))

  // Strand A and B spheres
  for (let i = 0; i < STEPS; i++) {
    const t = i / (STEPS - 1)
    const y = t * HEIGHT
    const angle = t * TURNS * TAU
    const xA = Math.cos(angle) * RADIUS
    const zA = Math.sin(angle) * RADIUS
    const xB = Math.cos(angle + PI) * RADIUS
    const zB = Math.sin(angle + PI) * RADIUS
    const colorT = i / (STEPS - 1)

    objects.push(obj({
      id: `dna_a_${i}`, name: `A${i}`, type: 'sphere',
      position: [xA, y, zA], scale: [0.18, 0.18, 0.18],
      color: lerpColor(COLOR_A, COLOR_B, colorT * 0.4),
      roughness: 0.1, metalness: 0.9,
      emissive: lerpColor(COLOR_A, COLOR_B, colorT * 0.4),
      emissiveIntensity: 0.7,
    }))
    objects.push(obj({
      id: `dna_b_${i}`, name: `B${i}`, type: 'sphere',
      position: [xB, y, zB], scale: [0.18, 0.18, 0.18],
      color: lerpColor(COLOR_B, COLOR_A, colorT * 0.4),
      roughness: 0.1, metalness: 0.9,
      emissive: lerpColor(COLOR_B, COLOR_A, colorT * 0.4),
      emissiveIntensity: 0.7,
    }))

    // Connecting rung — a cylinder between the two strand spheres
    if (i % 1 === 0) {
      const cx = (xA + xB) / 2
      const cz = (zA + zB) / 2
      // Rung scale: thin & spanning the diameter
      objects.push(obj({
        id: `dna_rung_${i}`, name: `Rung ${i}`, type: 'cylinder',
        position: [cx, y, cz],
        // Cylinder grows along Y by default — rotate so it lies between the two strand points
        rotation: [0, -angle + PI / 2, PI / 2],
        scale: [0.04, RADIUS * 2, 0.04],
        color: '#ffffff', roughness: 0.3, metalness: 0.7,
        emissive: '#88aaff', emissiveIntensity: 0.35, opacity: 0.85,
      }))
    }
  }

  // Two point lights for color
  objects.push(obj({
    id: 'dna_light_a', name: 'Light Cyan', type: 'pointlight',
    position: [3, HEIGHT * 0.65, 2],
    lightColor: COLOR_A, lightIntensity: 4, lightDistance: 12, lightDecay: 1.4,
  }))
  objects.push(obj({
    id: 'dna_light_b', name: 'Light Purple', type: 'pointlight',
    position: [-3, HEIGHT * 0.35, -2],
    lightColor: COLOR_B, lightIntensity: 4, lightDistance: 12, lightDecay: 1.4,
  }))

  return objects
}

function buildTracks(): AnimationTrack[] {
  const tracks: AnimationTrack[] = []

  // Each sphere orbits its strand axis (the Y line at origin)
  // We rotate the whole helix by animating each sphere along its circular path.
  for (let i = 0; i < STEPS; i++) {
    const t = i / (STEPS - 1)
    const y = t * HEIGHT
    const baseAngle = t * TURNS * TAU
    const subSteps = 16

    const framesA = [], framesB = [], framesR = []
    for (let s = 0; s <= subSteps; s++) {
      const tt = (s / subSteps) * DURATION
      const rot = (s / subSteps) * TAU // one full revolution per clip
      const aA = baseAngle + rot
      const aB = baseAngle + PI + rot
      const xA = Math.cos(aA) * RADIUS, zA = Math.sin(aA) * RADIUS
      const xB = Math.cos(aB) * RADIUS, zB = Math.sin(aB) * RADIUS
      framesA.push(kf(tt, { position: [xA, y, zA] }, 'linear'))
      framesB.push(kf(tt, { position: [xB, y, zB] }, 'linear'))
      const cx = (xA + xB) / 2, cz = (zA + zB) / 2
      framesR.push(kf(tt, {
        position: [cx, y, cz],
        rotation: [0, -aA + PI / 2, PI / 2],
      }, 'linear'))
    }
    tracks.push({ objectId: `dna_a_${i}`, keyframes: framesA })
    tracks.push({ objectId: `dna_b_${i}`, keyframes: framesB })
    tracks.push({ objectId: `dna_rung_${i}`, keyframes: framesR })
  }

  return tracks
}

export const DNA_HELIX: SceneTemplate = {
  id: 'dna-helix',
  name: 'DNA Helix',
  description: 'Two glowing strands twisting around each other with connecting rungs',
  emoji: '🧬',
  category: 'organic',
  settings: {
    background: '#04020c',
    environment: 'none',
    ambientIntensity: 0.15,
    directionalIntensity: 0.5,
    directionalPosition: [4, 8, 4],
    showGrid: false,
  },
  objects: buildObjects(),
  clips: [clip({
    id: uid('clip'),
    name: 'Helix Spin',
    duration: DURATION,
    loop: true,
    tracks: buildTracks(),
    cameraTrack: cameraOrbit({
      duration: DURATION,
      radius: 5,
      height: 3.2,
      target: [0, HEIGHT / 2, 0],
      cycles: 0.5,
      steps: 16,
      fov: 50,
    }),
  })],
}
