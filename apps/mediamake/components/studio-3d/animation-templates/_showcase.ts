import type { SceneTemplate } from './types'
import { OBJECT_DEFAULTS } from '../types'

const PI = Math.PI

// ─── Cosmic Dance ─────────────────────────────────────────────────────────────

export const COSMIC_DANCE: SceneTemplate = {
  id: 'cosmic-dance',
  name: 'Cosmic Dance',
  description: 'Spinning torus knot with orbiting metallic shapes',
  emoji: '🌀',
  category: 'showcase',
  settings: {
    background: '#0f0820',
    environment: 'none',
    ambientIntensity: 0.3,
    directionalIntensity: 2.0,
    directionalPosition: [4, 8, 4],
    showGrid: false,
  },
  objects: [
    { ...OBJECT_DEFAULTS, id: 'tpl_cd_floor', name: 'Floor', type: 'plane',
      position: [0, -0.01, 0], rotation: [-PI / 2, 0, 0], scale: [12, 12, 1],
      color: '#1a0a2e', roughness: 0.95, metalness: 0, castShadow: false, receiveShadow: true },
    { ...OBJECT_DEFAULTS, id: 'tpl_cd_knot', name: 'Torus Knot', type: 'torusKnot',
      position: [0, 1.6, 0], rotation: [0, 0, 0], scale: [0.8, 0.8, 0.8],
      color: '#a855f7', roughness: 0.05, metalness: 0.95,
      emissive: '#581c87', emissiveIntensity: 0.5 },
    { ...OBJECT_DEFAULTS, id: 'tpl_cd_sphere', name: 'Orb', type: 'sphere',
      position: [-2.6, 0.85, 0.5], rotation: [0, 0, 0], scale: [0.85, 0.85, 0.85],
      color: '#38bdf8', roughness: 0.1, metalness: 0.9,
      emissive: '#0c4a6e', emissiveIntensity: 0.3 },
    { ...OBJECT_DEFAULTS, id: 'tpl_cd_box', name: 'Cube', type: 'box',
      position: [2.6, 0.5, -0.5], rotation: [0, 0, 0], scale: [1, 1, 1],
      color: '#fb923c', roughness: 0.15, metalness: 0.75,
      emissive: '#7c2d12', emissiveIntensity: 0.25 },
    { ...OBJECT_DEFAULTS, id: 'tpl_cd_ico', name: 'Gem', type: 'icosahedron',
      position: [0.3, 0.6, 2.8], rotation: [0, 0, 0], scale: [0.7, 0.7, 0.7],
      color: '#4ade80', roughness: 0.05, metalness: 0.95,
      emissive: '#14532d', emissiveIntensity: 0.3 },
  ],
  clips: [{
    id: 'tpl_cd_clip', name: 'Cosmic Dance', duration: 4, loop: true,
    tracks: [
      { objectId: 'tpl_cd_knot', keyframes: [
        { id: 'kf_k0', time: 0, position: [0, 1.6, 0], rotation: [0, 0, 0],          scale: [0.8, 0.8, 0.8],     easing: 'ease-in-out' },
        { id: 'kf_k1', time: 1, position: [0, 1.6, 0], rotation: [0.3, PI / 2, 0.2], scale: [0.85, 0.75, 0.85],  easing: 'ease-in-out' },
        { id: 'kf_k2', time: 2, position: [0, 1.6, 0], rotation: [0, PI, 0],          scale: [0.8, 0.8, 0.8],     easing: 'ease-in-out' },
        { id: 'kf_k3', time: 3, position: [0, 1.6, 0], rotation: [-0.3, 3*PI/2,-0.2], scale: [0.75, 0.85, 0.75],  easing: 'ease-in-out' },
        { id: 'kf_k4', time: 4, position: [0, 1.6, 0], rotation: [0, 2*PI, 0],         scale: [0.8, 0.8, 0.8],     easing: 'ease-in-out' },
      ]},
      { objectId: 'tpl_cd_sphere', keyframes: [
        { id: 'kf_s0', time: 0, position: [-2.6, 0.85, 0.5], rotation: [0, 0, 0],     scale: [0.85, 0.85, 0.85], easing: 'ease-in-out' },
        { id: 'kf_s1', time: 1, position: [-2.0, 2.4, -0.5], rotation: [0, PI, 0],     scale: [0.9, 0.9, 0.9],   easing: 'ease-in-out' },
        { id: 'kf_s2', time: 2, position: [-2.6, 0.85, 0.5], rotation: [0, 2*PI, 0],   scale: [0.85, 0.85, 0.85], easing: 'ease-in-out' },
        { id: 'kf_s3', time: 3, position: [-2.0, 2.4, -0.5], rotation: [0, 3*PI, 0],   scale: [0.9, 0.9, 0.9],   easing: 'ease-in-out' },
        { id: 'kf_s4', time: 4, position: [-2.6, 0.85, 0.5], rotation: [0, 4*PI, 0],   scale: [0.85, 0.85, 0.85], easing: 'ease-in-out' },
      ]},
      { objectId: 'tpl_cd_box', keyframes: [
        { id: 'kf_b0', time: 0, position: [2.6, 0.5, -0.5], rotation: [0, 0, 0],                       scale: [1, 1, 1],         easing: 'ease-in-out' },
        { id: 'kf_b1', time: 1, position: [2.6, 0.5, -0.5], rotation: [PI/4, PI/2, PI/6],              scale: [1.3, 0.6, 1.3],   easing: 'ease-in-out' },
        { id: 'kf_b2', time: 2, position: [2.6, 0.5, -0.5], rotation: [0, PI, 0],                       scale: [1, 1, 1],         easing: 'ease-in-out' },
        { id: 'kf_b3', time: 3, position: [2.6, 0.5, -0.5], rotation: [-PI/4, 3*PI/2, -PI/6],          scale: [1.3, 0.6, 1.3],   easing: 'ease-in-out' },
        { id: 'kf_b4', time: 4, position: [2.6, 0.5, -0.5], rotation: [0, 2*PI, 0],                     scale: [1, 1, 1],         easing: 'ease-in-out' },
      ]},
      { objectId: 'tpl_cd_ico', keyframes: [
        { id: 'kf_i0', time: 0, position: [0.3, 0.6, 2.8], rotation: [0, 0, 0],         scale: [0.7, 0.7, 0.7], easing: 'ease-in-out' },
        { id: 'kf_i1', time: 2, position: [0.3, 0.6, 2.8], rotation: [PI, PI, PI/2],    scale: [1.0, 0.5, 1.0], easing: 'ease-in-out' },
        { id: 'kf_i2', time: 4, position: [0.3, 0.6, 2.8], rotation: [2*PI, 2*PI, 0],   scale: [0.7, 0.7, 0.7], easing: 'ease-in-out' },
      ]},
    ],
  }],
}

// ─── Neon Pulse ───────────────────────────────────────────────────────────────

export const NEON_PULSE: SceneTemplate = {
  id: 'neon-pulse',
  name: 'Neon Pulse',
  description: 'Glowing emissive rings pulsing in a dark void',
  emoji: '💫',
  category: 'showcase',
  settings: {
    background: '#020208', environment: 'none',
    ambientIntensity: 0.05, directionalIntensity: 0.3,
    directionalPosition: [0, 10, 0], showGrid: false,
  },
  objects: [
    { ...OBJECT_DEFAULTS, id: 'tpl_np_ico', name: 'Core', type: 'icosahedron',
      position: [0, 1.2, 0], scale: [0.9, 0.9, 0.9],
      color: '#00ffcc', roughness: 0, metalness: 1,
      emissive: '#00ffcc', emissiveIntensity: 1.2 },
    { ...OBJECT_DEFAULTS, id: 'tpl_np_ring_x', name: 'Ring X', type: 'torus',
      position: [0, 1.2, 0], scale: [2, 2, 2],
      color: '#ff00aa', roughness: 0, metalness: 1,
      emissive: '#ff00aa', emissiveIntensity: 0.9, opacity: 0.85 },
    { ...OBJECT_DEFAULTS, id: 'tpl_np_ring_z', name: 'Ring Z', type: 'torus',
      position: [0, 1.2, 0], rotation: [PI / 2, 0, 0], scale: [2, 2, 2],
      color: '#ffdd00', roughness: 0, metalness: 1,
      emissive: '#ffdd00', emissiveIntensity: 0.9, opacity: 0.85 },
    { ...OBJECT_DEFAULTS, id: 'tpl_np_ring_y', name: 'Ring Y', type: 'torus',
      position: [0, 1.2, 0], rotation: [0, PI / 4, PI / 2], scale: [2, 2, 2],
      color: '#00aaff', roughness: 0, metalness: 1,
      emissive: '#00aaff', emissiveIntensity: 0.9, opacity: 0.85 },
  ],
  clips: [{
    id: 'tpl_np_clip', name: 'Neon Pulse', duration: 3, loop: true,
    tracks: [
      { objectId: 'tpl_np_ico', keyframes: [
        { id: 'kf_ni0', time: 0,    position: [0, 1.2, 0], rotation: [0, 0, 0],          scale: [0.9, 0.9, 0.9], easing: 'ease-in-out' },
        { id: 'kf_ni1', time: 0.75, position: [0, 1.2, 0], rotation: [0.5, 0.5, 0],      scale: [1.4, 1.4, 1.4], easing: 'ease-in-out' },
        { id: 'kf_ni2', time: 1.5,  position: [0, 1.2, 0], rotation: [0, PI, 0],          scale: [0.9, 0.9, 0.9], easing: 'ease-in-out' },
        { id: 'kf_ni3', time: 2.25, position: [0, 1.2, 0], rotation: [-0.5, 1.5*PI, 0],   scale: [1.4, 1.4, 1.4], easing: 'ease-in-out' },
        { id: 'kf_ni4', time: 3,    position: [0, 1.2, 0], rotation: [0, 2*PI, 0],        scale: [0.9, 0.9, 0.9], easing: 'ease-in-out' },
      ]},
      { objectId: 'tpl_np_ring_x', keyframes: [
        { id: 'kf_rx0', time: 0, position: [0, 1.2, 0], rotation: [0, 0, 0],      scale: [2, 2, 2], easing: 'linear' },
        { id: 'kf_rx1', time: 3, position: [0, 1.2, 0], rotation: [2*PI, 0, 0],   scale: [2, 2, 2], easing: 'linear' },
      ]},
      { objectId: 'tpl_np_ring_z', keyframes: [
        { id: 'kf_rz0', time: 0, position: [0, 1.2, 0], rotation: [PI/2, 0, 0],         scale: [2, 2, 2], easing: 'linear' },
        { id: 'kf_rz1', time: 3, position: [0, 1.2, 0], rotation: [PI/2, 0, -2*PI],     scale: [2, 2, 2], easing: 'linear' },
      ]},
      { objectId: 'tpl_np_ring_y', keyframes: [
        { id: 'kf_ry0', time: 0, position: [0, 1.2, 0], rotation: [0, PI/4, PI/2],      scale: [2, 2, 2], easing: 'linear' },
        { id: 'kf_ry1', time: 3, position: [0, 1.2, 0], rotation: [2*PI, PI/4, PI/2],   scale: [2, 2, 2], easing: 'linear' },
      ]},
    ],
  }],
}

// ─── Float & Drift ────────────────────────────────────────────────────────────

export const FLOAT_DRIFT: SceneTemplate = {
  id: 'float-drift',
  name: 'Float & Drift',
  description: 'Pastel shapes drifting gently in dawn light',
  emoji: '🫧',
  category: 'showcase',
  settings: {
    background: '#e8f4f8', environment: 'dawn',
    ambientIntensity: 0.8, directionalIntensity: 0.6,
    directionalPosition: [3, 5, 3], showGrid: false,
  },
  objects: [
    { ...OBJECT_DEFAULTS, id: 'tpl_fd_dodec', name: 'Center', type: 'dodecahedron',
      position: [0, 1.2, 0], color: '#c084fc', roughness: 0.3, metalness: 0.4,
      emissive: '#7e22ce', emissiveIntensity: 0.1 },
    { ...OBJECT_DEFAULTS, id: 'tpl_fd_s1', name: 'Sphere A', type: 'sphere',
      position: [-2, 1.5, -1], scale: [0.7, 0.7, 0.7], color: '#86efac', roughness: 0.4, metalness: 0.2 },
    { ...OBJECT_DEFAULTS, id: 'tpl_fd_s2', name: 'Sphere B', type: 'sphere',
      position: [2, 0.8, 1], scale: [0.6, 0.6, 0.6], color: '#93c5fd', roughness: 0.4, metalness: 0.2 },
    { ...OBJECT_DEFAULTS, id: 'tpl_fd_s3', name: 'Sphere C', type: 'sphere',
      position: [0.5, 2, 2.2], scale: [0.5, 0.5, 0.5], color: '#fda4af', roughness: 0.4, metalness: 0.2 },
    { ...OBJECT_DEFAULTS, id: 'tpl_fd_cone', name: 'Cone', type: 'cone',
      position: [-1.5, 0.8, 2], scale: [0.7, 1.2, 0.7], color: '#fde68a', roughness: 0.35, metalness: 0.15 },
  ],
  clips: [{
    id: 'tpl_fd_clip', name: 'Float & Drift', duration: 5, loop: true,
    tracks: [
      { objectId: 'tpl_fd_dodec', keyframes: [
        { id: 'kf_fd0', time: 0,   position: [0, 1.2, 0], rotation: [0, 0, 0],       scale: [1, 1, 1],          easing: 'ease-in-out' },
        { id: 'kf_fd1', time: 2.5, position: [0, 2.0, 0], rotation: [0, PI, PI / 8], scale: [1.05, 1.05, 1.05], easing: 'ease-in-out' },
        { id: 'kf_fd2', time: 5,   position: [0, 1.2, 0], rotation: [0, 2*PI, 0],    scale: [1, 1, 1],          easing: 'ease-in-out' },
      ]},
      { objectId: 'tpl_fd_s1', keyframes: [
        { id: 'kf_s1a', time: 0,   position: [-2, 1.5, -1],     rotation: [0, 0, 0],     scale: [0.7, 0.7, 0.7],   easing: 'ease-in-out' },
        { id: 'kf_s1b', time: 1.5, position: [-2.3, 2.5, -1.2], rotation: [0, PI/2, 0],  scale: [0.75, 0.75, 0.75],easing: 'ease-in-out' },
        { id: 'kf_s1c', time: 3,   position: [-1.7, 1.5, -0.8], rotation: [0, PI, 0],    scale: [0.7, 0.7, 0.7],   easing: 'ease-in-out' },
        { id: 'kf_s1d', time: 5,   position: [-2, 1.5, -1],     rotation: [0, 2*PI, 0],  scale: [0.7, 0.7, 0.7],   easing: 'ease-in-out' },
      ]},
      { objectId: 'tpl_fd_s2', keyframes: [
        { id: 'kf_s2a', time: 0,   position: [2, 0.8, 1],     rotation: [0, 0, 0],     scale: [0.6, 0.6, 0.6],    easing: 'ease-in-out' },
        { id: 'kf_s2b', time: 2,   position: [2.4, 2.0, 0.7], rotation: [0, PI, 0],    scale: [0.65, 0.65, 0.65], easing: 'ease-in-out' },
        { id: 'kf_s2c', time: 4,   position: [1.6, 0.8, 1.3], rotation: [0, 2*PI, 0],  scale: [0.6, 0.6, 0.6],    easing: 'ease-in-out' },
        { id: 'kf_s2d', time: 5,   position: [2, 0.8, 1],     rotation: [0, 2*PI, 0],  scale: [0.6, 0.6, 0.6],    easing: 'ease-in-out' },
      ]},
      { objectId: 'tpl_fd_s3', keyframes: [
        { id: 'kf_s3a', time: 0,   position: [0.5, 2, 2.2],   rotation: [0, 0, 0],     scale: [0.5, 0.5, 0.5],    easing: 'ease-in-out' },
        { id: 'kf_s3b', time: 2.5, position: [0.8, 3.0, 2.0], rotation: [0, PI, 0],    scale: [0.55, 0.55, 0.55], easing: 'ease-in-out' },
        { id: 'kf_s3c', time: 5,   position: [0.5, 2, 2.2],   rotation: [0, 2*PI, 0],  scale: [0.5, 0.5, 0.5],    easing: 'ease-in-out' },
      ]},
      { objectId: 'tpl_fd_cone', keyframes: [
        { id: 'kf_c0', time: 0,   position: [-1.5, 0.8, 2], rotation: [0, 0, 0],          scale: [0.7, 1.2, 0.7], easing: 'ease-in-out' },
        { id: 'kf_c1', time: 2.5, position: [-1.5, 1.8, 2], rotation: [0.2, PI, -0.2],     scale: [0.8, 1.0, 0.8], easing: 'ease-in-out' },
        { id: 'kf_c2', time: 5,   position: [-1.5, 0.8, 2], rotation: [0, 2*PI, 0],        scale: [0.7, 1.2, 0.7], easing: 'ease-in-out' },
      ]},
    ],
  }],
}

// ─── Geo Spin ─────────────────────────────────────────────────────────────────

export const GEO_SPIN: SceneTemplate = {
  id: 'geo-spin',
  name: 'Geo Spin',
  description: 'Metallic geometry spinning on every axis',
  emoji: '⚙️',
  category: 'showcase',
  settings: {
    background: '#0a0a0f', environment: 'studio',
    ambientIntensity: 0.2, directionalIntensity: 1.8,
    directionalPosition: [5, 10, 3], showGrid: true,
  },
  objects: [
    { ...OBJECT_DEFAULTS, id: 'tpl_gs_floor', name: 'Floor', type: 'plane',
      position: [0, -0.01, 0], rotation: [-PI / 2, 0, 0], scale: [10, 10, 1],
      color: '#111118', roughness: 0.8, metalness: 0.3, castShadow: false, receiveShadow: true },
    { ...OBJECT_DEFAULTS, id: 'tpl_gs_ico', name: 'Icosahedron', type: 'icosahedron',
      position: [0, 1.2, 0], color: '#e2e8f0', roughness: 0.05, metalness: 1 },
    { ...OBJECT_DEFAULTS, id: 'tpl_gs_knot', name: 'Knot', type: 'torusKnot',
      position: [-2.5, 1, 0], scale: [0.65, 0.65, 0.65], color: '#f97316', roughness: 0.1, metalness: 0.9 },
    { ...OBJECT_DEFAULTS, id: 'tpl_gs_dodec', name: 'Dodecahedron', type: 'dodecahedron',
      position: [2.5, 1, 0], scale: [0.8, 0.8, 0.8], color: '#22d3ee', roughness: 0.05, metalness: 0.95 },
    { ...OBJECT_DEFAULTS, id: 'tpl_gs_ring', name: 'Ring', type: 'ring',
      position: [0, 1.2, 2.5], scale: [1.2, 1.2, 0.05], color: '#a3e635', roughness: 0.1, metalness: 0.9 },
  ],
  clips: [{
    id: 'tpl_gs_clip', name: 'Geo Spin', duration: 4, loop: true,
    tracks: [
      { objectId: 'tpl_gs_ico', keyframes: [
        { id: 'gs_i0', time: 0, position: [0, 1.2, 0], rotation: [0, 0, 0],            scale: [1, 1, 1], easing: 'linear' },
        { id: 'gs_i1', time: 4, position: [0, 1.2, 0], rotation: [2*PI, 2*PI, PI],     scale: [1, 1, 1], easing: 'linear' },
      ]},
      { objectId: 'tpl_gs_knot', keyframes: [
        { id: 'gs_k0', time: 0, position: [-2.5, 1, 0], rotation: [0, 0, 0],         scale: [0.65, 0.65, 0.65], easing: 'linear' },
        { id: 'gs_k1', time: 4, position: [-2.5, 1, 0], rotation: [0, 2*PI, 0],      scale: [0.65, 0.65, 0.65], easing: 'linear' },
      ]},
      { objectId: 'tpl_gs_dodec', keyframes: [
        { id: 'gs_d0', time: 0, position: [2.5, 1, 0], rotation: [0, 0, 0],           scale: [0.8, 0.8, 0.8], easing: 'ease-in-out' },
        { id: 'gs_d1', time: 2, position: [2.5, 1, 0], rotation: [PI, 0, PI],          scale: [1.1, 0.7, 1.1], easing: 'ease-in-out' },
        { id: 'gs_d2', time: 4, position: [2.5, 1, 0], rotation: [2*PI, 0, 2*PI],     scale: [0.8, 0.8, 0.8], easing: 'ease-in-out' },
      ]},
      { objectId: 'tpl_gs_ring', keyframes: [
        { id: 'gs_r0', time: 0, position: [0, 1.2, 2.5], rotation: [0, 0, 0],         scale: [1.2, 1.2, 0.05], easing: 'linear' },
        { id: 'gs_r1', time: 4, position: [0, 1.2, 2.5], rotation: [0, 2*PI, 0],      scale: [1.2, 1.2, 0.05], easing: 'linear' },
      ]},
    ],
  }],
}

// ─── Empty Stage ──────────────────────────────────────────────────────────────

export const EMPTY_STAGE: SceneTemplate = {
  id: 'empty-stage',
  name: 'Empty Stage',
  description: 'Clean slate — just a floor and good lighting',
  emoji: '🎬',
  category: 'minimal',
  settings: {
    background: '#1a1a2e', environment: 'none',
    ambientIntensity: 0.6, directionalIntensity: 1.2,
    directionalPosition: [5, 8, 3], showGrid: true,
  },
  objects: [
    { ...OBJECT_DEFAULTS, id: 'stage_floor', name: 'Floor', type: 'plane',
      position: [0, -0.01, 0], rotation: [-PI / 2, 0, 0], scale: [8, 8, 1],
      color: '#cccccc', roughness: 0.9, metalness: 0, castShadow: false, receiveShadow: true },
  ],
  clips: [],
}
