import type { SceneTemplate } from './types'
import type { SceneObject, AnimationTrack } from '../types'
import {
  obj, kf, clip, uid, expandPulse, scaleWave, orbit, PI, TAU, hslHex, rainbow,
} from './helpers'

/**
 * Music Visualizer — way better than NCS:
 *   • Pulsing central icosahedron core with inner sphere
 *   • 24 spectrum bars in a circle that "race" with traveling sine envelope
 *   • 4 expanding rings popping outward like NCS, each on a beat offset
 *   • 8 satellite gems orbiting + bouncing in Y
 *   • 2 colored point lights orbiting in opposite directions
 *   • Glossy reflective floor, mirrored everywhere
 *   • Camera does a slow orbit with a push-in on the "drop"
 *
 * Tempo: 8s loop, 8 beats (= 60 BPM feel with a half-time pattern).
 */

const DURATION = 8
const BEATS    = 8
const BAR_COUNT = 24
const SAT_COUNT = 8

const ACCENT_A = '#00f0ff' // cyan
const ACCENT_B = '#ff00d4' // magenta
const ACCENT_C = '#fff200' // yellow

function buildObjects(): SceneObject[] {
  const objects: SceneObject[] = []

  // Glossy floor — black mirror
  objects.push(obj({
    id: 'mv_floor', name: 'Floor', type: 'plane',
    position: [0, 0, 0], rotation: [-PI / 2, 0, 0], scale: [40, 40, 1],
    color: '#050008', roughness: 0.15, metalness: 0.85,
    castShadow: false, receiveShadow: true,
  }))

  // Central core — big icosahedron with strong emissive
  objects.push(obj({
    id: 'mv_core', name: 'Core', type: 'icosahedron',
    position: [0, 1.4, 0], scale: [0.9, 0.9, 0.9],
    color: ACCENT_A, roughness: 0, metalness: 1,
    emissive: ACCENT_A, emissiveIntensity: 1.6,
  }))

  // Inner core — small sphere counter-pulse
  objects.push(obj({
    id: 'mv_core_inner', name: 'Inner Core', type: 'sphere',
    position: [0, 1.4, 0], scale: [0.4, 0.4, 0.4],
    color: '#ffffff', roughness: 0, metalness: 1,
    emissive: '#ffffff', emissiveIntensity: 2,
  }))

  // 4 expanding rings around the core
  const ringColors = [ACCENT_A, ACCENT_B, ACCENT_C, '#7c3aed']
  for (let i = 0; i < 4; i++) {
    objects.push(obj({
      id: `mv_ring_${i}`, name: `Pulse Ring ${i + 1}`, type: 'torus',
      position: [0, 1.4, 0], rotation: [PI / 2, 0, 0], scale: [0.1, 0.1, 0.1],
      color: ringColors[i], roughness: 0, metalness: 1,
      emissive: ringColors[i], emissiveIntensity: 1.3, opacity: 0.85,
    }))
  }

  // Spectrum bars in a circle — 24 thin tall boxes
  const barColors = rainbow(BAR_COUNT, 0.85, 0.55)
  for (let i = 0; i < BAR_COUNT; i++) {
    const a = (i / BAR_COUNT) * TAU
    const r = 4.4
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    objects.push(obj({
      id: `mv_bar_${i}`, name: `Bar ${i + 1}`, type: 'box',
      position: [x, 0.5, z], rotation: [0, -a, 0], scale: [0.18, 1, 0.18],
      color: barColors[i], roughness: 0.1, metalness: 0.9,
      emissive: barColors[i], emissiveIntensity: 0.85,
    }))
  }

  // 8 satellite gems orbiting between core and bars
  for (let i = 0; i < SAT_COUNT; i++) {
    const a = (i / SAT_COUNT) * TAU
    const r = 2.6
    const c = hslHex(i * (360 / SAT_COUNT))
    objects.push(obj({
      id: `mv_sat_${i}`, name: `Satellite ${i + 1}`, type: 'icosahedron',
      position: [Math.cos(a) * r, 2.5, Math.sin(a) * r],
      scale: [0.32, 0.32, 0.32],
      color: c, roughness: 0.05, metalness: 0.95,
      emissive: c, emissiveIntensity: 0.9,
    }))
  }

  // Orbital point lights (magenta + cyan) — club lighting
  objects.push(obj({
    id: 'mv_light_a', name: 'Light A', type: 'pointlight',
    position: [4, 3, 0],
    lightColor: ACCENT_B, lightIntensity: 7, lightDistance: 18, lightDecay: 1.5,
  }))
  objects.push(obj({
    id: 'mv_light_b', name: 'Light B', type: 'pointlight',
    position: [-4, 3, 0],
    lightColor: ACCENT_A, lightIntensity: 7, lightDistance: 18, lightDecay: 1.5,
  }))

  // Floating sparkle particle cloud overhead
  objects.push(obj({
    id: 'mv_particles', name: 'Sparkle', type: 'particles',
    position: [0, 4, 0],
    particleCount: 800, particleSize: 0.04, particleSpeed: 0.4, particleSpread: 6,
    color: '#ffffff', opacity: 0.9,
  }))

  return objects
}

function buildTracks(): AnimationTrack[] {
  const tracks: AnimationTrack[] = []

  // Core: strong pulse on each beat (1.0 → 1.6) using rectified sine,
  // with a slow tumble baked in so we don't conflict with a second track.
  const coreTrack = scaleWave({
    objectId: 'mv_core',
    duration: DURATION,
    baseScale: [0.9, 0.9, 0.9],
    amplitude: [0.7, 0.7, 0.7],
    frequency: BEATS,
    steps: BEATS * 4,
    rectified: true,
    position: [0, 1.4, 0],
    easing: 'ease-out',
  })
  coreTrack.keyframes.forEach((k, idx) => {
    const t = idx / (coreTrack.keyframes.length - 1)
    k.rotation = [t * TAU, t * TAU, t * PI]
  })
  tracks.push(coreTrack)

  // Inner core: counter-pulse (smaller → larger when core shrinks)
  tracks.push(scaleWave({
    objectId: 'mv_core_inner',
    duration: DURATION,
    baseScale: [0.4, 0.4, 0.4],
    amplitude: [0.5, 0.5, 0.5],
    frequency: BEATS,
    phase: 0.25, // out of phase with core
    steps: BEATS * 4,
    rectified: true,
    position: [0, 1.4, 0],
    easing: 'ease-out',
  }))

  // Spectrum bars — traveling sine wave around the circle
  // Each bar pulses with phase offset proportional to its position.
  for (let i = 0; i < BAR_COUNT; i++) {
    const a = (i / BAR_COUNT) * TAU
    const r = 4.4
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    // Phase = bar index travels twice around the circle per loop
    const phase = (i / BAR_COUNT) * 2
    tracks.push(scaleWave({
      objectId: `mv_bar_${i}`,
      duration: DURATION,
      baseScale: [0.18, 0.6, 0.18],
      amplitude: [0, 2.4, 0], // only Y grows
      frequency: BEATS,
      phase,
      steps: BEATS * 3,
      rectified: true,
      position: [x, 0.5, z],
      easing: 'ease-out',
    }))
    // Also offset Y position to anchor the bar to the floor as it grows
    // (the bars are scaled around their center, so half the growth pushes upward).
    // We bake position into the same track so it shifts smoothly.
    const t = tracks[tracks.length - 1]
    t.keyframes.forEach((k) => {
      const yScale = k.scale ? k.scale[1] : 0.6
      // Re-anchor: bottom of bar should sit at y=0
      k.position = [x, yScale / 2, z]
    })
  }

  // 4 expanding rings — each on a separate beat offset
  for (let i = 0; i < 4; i++) {
    tracks.push(expandPulse({
      objectId: `mv_ring_${i}`,
      duration: DURATION,
      startScale: 0.1,
      endScale: 5.5 + i * 0.6,
      position: [0, 1.4, 0],
      beats: 4,
      phase: i * 0.25,
      spinAxis: 'y',
      spinCycles: 0.5,
    }))
  }

  // Satellites: orbit around the core + Y bounce
  for (let i = 0; i < SAT_COUNT; i++) {
    const startAngle = (i / SAT_COUNT) * TAU
    const r = 2.6
    const baseY = 2.5
    const steps = 32
    const frames = []
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * DURATION
      const ang = startAngle + (s / steps) * TAU
      const beat = (s / steps) * BEATS
      const y = baseY + Math.abs(Math.sin(beat * PI)) * 0.7
      const spin = (s / steps) * 4 * TAU
      frames.push(kf(t, {
        position: [Math.cos(ang) * r, y, Math.sin(ang) * r],
        rotation: [spin, spin, 0],
      }, 'linear'))
    }
    tracks.push({ objectId: `mv_sat_${i}`, keyframes: frames })
  }

  // Orbital lights — opposite directions, fast
  tracks.push(orbit({
    objectId: 'mv_light_a', center: [0, 3, 0], radius: 4,
    duration: DURATION, cycles: 1, direction: 1, steps: 24,
  }))
  tracks.push(orbit({
    objectId: 'mv_light_b', center: [0, 3, 0], radius: 4,
    duration: DURATION, cycles: 1, direction: -1, startAngle: PI, steps: 24,
  }))

  return tracks
}

/**
 * Camera: orbit around the core with a subtle push-in near the half-way "drop".
 */
function buildCamera() {
  const steps = 32
  const frames = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * DURATION
    const ang = (i / steps) * TAU * 0.5 // half orbit total
    // Push-in envelope: closer to core mid-clip
    const env = Math.sin((i / steps) * PI)
    const radius = 9 - env * 2.5
    const height = 2.8 + Math.sin((i / steps) * TAU) * 0.4
    const x = Math.cos(ang) * radius
    const z = Math.sin(ang) * radius
    const fov = 55 + env * 8
    frames.push({
      id: uid('cam'),
      time: t,
      position: [x, height, z] as [number, number, number],
      target: [0, 1.4, 0] as [number, number, number],
      fov,
      easing: 'ease-in-out' as const,
    })
  }
  return frames
}

export const MUSIC_VISUALIZER: SceneTemplate = {
  id: 'music-visualizer',
  name: 'Music Visualizer',
  description: '24 spectrum bars + pulsing core + expanding rings — drop-ready loop',
  emoji: '🎵',
  category: 'music',
  settings: {
    background: '#030008',
    environment: 'none',
    ambientIntensity: 0.06,
    directionalIntensity: 0.0,
    directionalPosition: [0, 10, 0],
    showGrid: false,
  },
  objects: buildObjects(),
  clips: [clip({
    id: uid('clip'),
    name: 'Drop',
    duration: DURATION,
    loop: true,
    tracks: buildTracks(),
    cameraTrack: buildCamera(),
  })],
}
