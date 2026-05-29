import type { SceneTemplate } from './types'
import type { SceneObject, AnimationTrack } from '../types'
import {
  obj, kf, spin, cameraOrbit, clip, uid, PI, TAU,
} from './helpers'

/**
 * Solar System — sun + 8 planets orbiting at different speeds, with their own
 * axial rotation. Saturn gets a ring. Slow cinematic camera orbit.
 */

interface PlanetDef {
  id: string
  name: string
  radius: number      // orbital radius
  size: number        // sphere scale
  color: string
  emissive?: string
  emissiveIntensity?: number
  cycles: number      // revolutions over the clip duration
  startAngle: number  // 0–TAU
  axialCycles?: number // spin around own Y per clip
  tilt?: number       // orbital plane tilt (radians)
  ring?: { inner: number; outer: number; color: string; tilt?: number }
}

const PLANETS: PlanetDef[] = [
  { id: 'mercury', name: 'Mercury', radius: 1.6,  size: 0.18, color: '#8a8a8a', cycles: 4.0,  startAngle: 0,           axialCycles: 6,  tilt: 0.02 },
  { id: 'venus',   name: 'Venus',   radius: 2.3,  size: 0.30, color: '#e6c89b', cycles: 2.7,  startAngle: TAU * 0.18,  axialCycles: -4, tilt: 0.05 },
  { id: 'earth',   name: 'Earth',   radius: 3.1,  size: 0.34, color: '#3b82f6', emissive: '#1e3a8a', emissiveIntensity: 0.1,
    cycles: 2.0,  startAngle: TAU * 0.45,  axialCycles: 8,  tilt: 0.0 },
  { id: 'mars',    name: 'Mars',    radius: 4.0,  size: 0.26, color: '#c1440e', cycles: 1.4,  startAngle: TAU * 0.6,   axialCycles: 7,  tilt: 0.03 },
  { id: 'jupiter', name: 'Jupiter', radius: 5.4,  size: 0.85, color: '#d6a86b', cycles: 0.7,  startAngle: TAU * 0.8,   axialCycles: 12, tilt: 0.02 },
  { id: 'saturn',  name: 'Saturn',  radius: 6.8,  size: 0.72, color: '#e9d68f', cycles: 0.5,  startAngle: TAU * 0.15,  axialCycles: 11, tilt: 0.08,
    ring: { inner: 1.4, outer: 2.2, color: '#d4b56a', tilt: 0.35 } },
  { id: 'uranus',  name: 'Uranus',  radius: 8.0,  size: 0.55, color: '#7fd6e3', cycles: 0.32, startAngle: TAU * 0.35,  axialCycles: 9,  tilt: 0.04 },
  { id: 'neptune', name: 'Neptune', radius: 9.2,  size: 0.55, color: '#3a5ed1', cycles: 0.22, startAngle: TAU * 0.7,   axialCycles: 9,  tilt: 0.03 },
]

const DURATION = 24

function buildObjects(): SceneObject[] {
  const objects: SceneObject[] = []

  // Sun
  objects.push(obj({
    id: 'ss_sun', name: 'Sun', type: 'sphere',
    position: [0, 0, 0], scale: [1.3, 1.3, 1.3],
    color: '#ffd84a', roughness: 1, metalness: 0,
    emissive: '#ffae00', emissiveIntensity: 1.4, castShadow: false,
  }))

  // Sun light core
  objects.push(obj({
    id: 'ss_sun_light', name: 'Sun Light', type: 'pointlight',
    position: [0, 0, 0],
    lightColor: '#ffd599', lightIntensity: 5.5, lightDistance: 35, lightDecay: 1.2,
  }))

  // Orbital trail rings (visual aid — ultra-thin tori)
  for (const p of PLANETS) {
    objects.push(obj({
      id: `ss_orbit_${p.id}`, name: `${p.name} Orbit`, type: 'torus',
      position: [0, 0, 0], rotation: [PI / 2 + (p.tilt ?? 0), 0, 0],
      scale: [p.radius, p.radius, 0.008],
      color: '#404060', roughness: 1, metalness: 0,
      emissive: '#202040', emissiveIntensity: 0.4,
      opacity: 0.5, castShadow: false, receiveShadow: false,
    }))
  }

  // Planets
  for (const p of PLANETS) {
    const x = Math.cos(p.startAngle) * p.radius
    const z = Math.sin(p.startAngle) * p.radius
    objects.push(obj({
      id: `ss_${p.id}`, name: p.name, type: 'sphere',
      position: [x, 0, z], scale: [p.size, p.size, p.size],
      color: p.color, roughness: 0.7, metalness: 0.1,
      emissive: p.emissive ?? '#000000', emissiveIntensity: p.emissiveIntensity ?? 0,
    }))

    if (p.ring) {
      objects.push(obj({
        id: `ss_${p.id}_ring`, name: `${p.name} Ring`, type: 'torus',
        position: [x, 0, z],
        rotation: [PI / 2 + (p.ring.tilt ?? 0), 0, 0],
        scale: [p.size * p.ring.outer, p.size * p.ring.outer, p.size * 0.04],
        color: p.ring.color, roughness: 0.85, metalness: 0.05,
        emissive: p.ring.color, emissiveIntensity: 0.15, opacity: 0.95,
      }))
    }
  }

  // Asteroid belt (between Mars and Jupiter)
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU + (i * 0.13)
    const r = 4.6 + (i % 3) * 0.18
    const s = 0.05 + (i % 5) * 0.015
    objects.push(obj({
      id: `ss_ast_${i}`, name: `Asteroid ${i + 1}`, type: 'dodecahedron',
      position: [Math.cos(a) * r, ((i % 3) - 1) * 0.08, Math.sin(a) * r],
      scale: [s, s, s],
      color: '#6b6b6b', roughness: 0.95, metalness: 0.05,
    }))
  }

  return objects
}

function buildTracks(): AnimationTrack[] {
  const tracks: AnimationTrack[] = []

  // Sun gentle spin
  tracks.push(spin({ objectId: 'ss_sun', axis: 'y', duration: DURATION, cycles: 0.3 }))

  // Planet orbits + axial spin (use combined keyframes so position + rotation animate)
  for (const p of PLANETS) {
    const steps = Math.max(24, Math.ceil(p.cycles * 32))
    const frames = []
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * DURATION
      const angle = p.startAngle + (i / steps) * p.cycles * TAU
      const tilt = p.tilt ?? 0
      const cz = Math.sin(angle) * p.radius
      const x = Math.cos(angle) * p.radius
      const y = Math.sin(tilt) * cz
      const z = Math.cos(tilt) * cz
      const yaw = (i / steps) * (p.axialCycles ?? 1) * TAU
      frames.push(kf(t, { position: [x, y, z], rotation: [0, yaw, 0] }, 'linear'))
    }
    tracks.push({ objectId: `ss_${p.id}`, keyframes: frames })

    // Ring follows the planet
    if (p.ring) {
      const ringFrames = []
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * DURATION
        const angle = p.startAngle + (i / steps) * p.cycles * TAU
        const tilt = p.tilt ?? 0
        const cz = Math.sin(angle) * p.radius
        const x = Math.cos(angle) * p.radius
        const y = Math.sin(tilt) * cz
        const z = Math.cos(tilt) * cz
        ringFrames.push(kf(t, {
          position: [x, y, z],
          rotation: [PI / 2 + (p.ring.tilt ?? 0), (i / steps) * 0.2 * TAU, 0],
        }, 'linear'))
      }
      tracks.push({ objectId: `ss_${p.id}_ring`, keyframes: ringFrames })
    }
  }

  // Asteroid belt slow rotation by orbiting each asteroid
  for (let i = 0; i < 36; i++) {
    const a0 = (i / 36) * TAU + (i * 0.13)
    const r = 4.6 + (i % 3) * 0.18
    const y = ((i % 3) - 1) * 0.08
    const steps = 24
    const frames = []
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * DURATION
      const a = a0 + (s / steps) * 0.6 * TAU
      frames.push(kf(t, { position: [Math.cos(a) * r, y, Math.sin(a) * r] }, 'linear'))
    }
    tracks.push({ objectId: `ss_ast_${i}`, keyframes: frames })
  }

  return tracks
}

export const SOLAR_SYSTEM: SceneTemplate = {
  id: 'solar-system',
  name: 'Solar System',
  description: '8 planets, asteroid belt, ringed Saturn, cinematic camera orbit',
  emoji: '🪐',
  category: 'space',
  settings: {
    background: '#02020a',
    environment: 'none',
    ambientIntensity: 0.08,
    directionalIntensity: 0.0,
    directionalPosition: [0, 10, 0],
    showGrid: false,
    skyEnabled: true,
    skyPreset: 'night',
  },
  objects: buildObjects(),
  clips: [clip({
    id: uid('clip'),
    name: 'Orbital Motion',
    duration: DURATION,
    loop: true,
    tracks: buildTracks(),
    cameraTrack: cameraOrbit({
      duration: DURATION,
      radius: 14,
      height: 5,
      cycles: 0.5,
      steps: 16,
      fov: 55,
      target: [0, 0, 0],
    }),
  })],
}
