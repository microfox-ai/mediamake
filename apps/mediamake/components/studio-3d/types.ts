export type ObjectType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'torus'
  | 'cone'
  | 'plane'
  | 'ring'
  | 'icosahedron'
  | 'dodecahedron'
  | 'torusKnot'
  | 'gltf'
  | 'obj'
  | 'fbx'
  | 'stl'
  | 'image'
  | 'text3d'
  | 'particles'
  | 'spline'
  | 'pointlight'
  | 'spotlight'
  | 'rectlight'
  | 'group'
  | 'csg'

export type TransformMode = 'translate' | 'rotate' | 'scale'
export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

export interface ProceduralTextureConfig {
  type: 'checker' | 'gradient' | 'noise'
  color1: string
  color2: string
  scale: number
}

export interface SceneObject {
  id: string
  name: string
  type: ObjectType
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
  roughness: number
  metalness: number
  opacity: number
  wireframe: boolean
  emissive: string
  emissiveIntensity: number
  castShadow: boolean
  receiveShadow: boolean
  visible: boolean
  url?: string
  cacheKey?: string
  offset?: [number, number, number]
  customTexture?: string
  customTextureName?: string

  // ── Text3D ──────────────────────────────────────────────────────────────────
  text?: string
  fontSize?: number
  letterSpacing?: number
  bevelEnabled?: boolean
  bevelThickness?: number
  bevelSize?: number

  // ── Particles ────────────────────────────────────────────────────────────────
  particleCount?: number
  particleSize?: number
  particleSpeed?: number
  particleSpread?: number

  // ── Spline ───────────────────────────────────────────────────────────────────
  splinePoints?: [number, number, number][]
  splineClosed?: boolean

  // ── Lights (shared + type-specific) ─────────────────────────────────────────
  lightColor?: string
  lightIntensity?: number
  lightDistance?: number
  lightDecay?: number
  lightAngle?: number      // spotlight only
  lightPenumbra?: number   // spotlight only
  lightWidth?: number      // rectlight only
  lightHeight?: number     // rectlight only

  // ── Grouping ──────────────────────────────────────────────────────────────────
  groupId?: string         // parent group object ID

  // ── Mirror / Symmetry ────────────────────────────────────────────────────────
  mirrorX?: boolean
  mirrorY?: boolean
  mirrorZ?: boolean

  // ── Boolean CSG ──────────────────────────────────────────────────────────────
  csgGeometryData?: Record<string, unknown>  // serialized THREE.BufferGeometry

  // ── Procedural texture ────────────────────────────────────────────────────────
  proceduralTexture?: ProceduralTextureConfig

  // ── Paint ─────────────────────────────────────────────────────────────────────
  paintTexture?: string    // data URL of painted canvas
}

// ─── Animation ───────────────────────────────────────────────────────────────

export interface Keyframe {
  id: string
  time: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  easing: EasingType
}

export interface AnimationTrack {
  objectId: string
  keyframes: Keyframe[]
}

export interface CameraKeyframe {
  id: string
  time: number
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  easing: EasingType
}

export interface AnimationClip {
  id: string
  name: string
  duration: number
  loop: boolean
  tracks: AnimationTrack[]
  cameraTrack?: CameraKeyframe[]
}

// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentPreset =
  | 'none'
  | 'sunset'
  | 'dawn'
  | 'night'
  | 'warehouse'
  | 'forest'
  | 'apartment'
  | 'studio'
  | 'city'
  | 'park'
  | 'lobby'

export const OBJECT_DEFAULTS: Omit<SceneObject, 'id' | 'name' | 'type'> = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  color: '#4f8ef7',
  roughness: 0.5,
  metalness: 0.1,
  opacity: 1,
  wireframe: false,
  emissive: '#000000',
  emissiveIntensity: 0,
  castShadow: true,
  receiveShadow: true,
  visible: true,
}

export const OBJECT_LABELS: Record<ObjectType, string> = {
  box: 'Box',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  torus: 'Torus',
  cone: 'Cone',
  plane: 'Plane',
  ring: 'Ring',
  icosahedron: 'Icosahedron',
  dodecahedron: 'Dodecahedron',
  torusKnot: 'Torus Knot',
  gltf: 'Model',
  obj: 'OBJ Model',
  fbx: 'FBX Model',
  stl: 'STL Model',
  image: 'Image',
  text3d: '3D Text',
  particles: 'Particles',
  spline: 'Spline',
  pointlight: 'Point Light',
  spotlight: 'Spot Light',
  rectlight: 'Area Light',
  group: 'Group',
  csg: 'CSG Mesh',
}

export const OBJECT_ICONS: Record<ObjectType, string> = {
  box: '⬛',
  sphere: '⚪',
  cylinder: '🔵',
  torus: '💿',
  cone: '🔺',
  plane: '▬',
  ring: '⭕',
  icosahedron: '🔷',
  dodecahedron: '🔹',
  torusKnot: '🌀',
  gltf: '📦',
  obj: '📦',
  fbx: '📦',
  stl: '🧱',
  image: '🖼️',
  text3d: '📝',
  particles: '✨',
  spline: '〰️',
  pointlight: '💡',
  spotlight: '🔦',
  rectlight: '🔆',
  group: '📁',
  csg: '🔲',
}

// Model types that load from external files and use the pivot-offset system
export const MODEL_TYPES = new Set<ObjectType>(['gltf', 'obj', 'fbx', 'stl', 'image'])

// Primitive mesh types (rendered as a single Three.js mesh, no group wrapper)
export const PRIMITIVE_TYPES = new Set<ObjectType>([
  'box', 'sphere', 'cylinder', 'torus', 'cone',
  'plane', 'ring', 'icosahedron', 'dodecahedron', 'torusKnot',
  'csg',
])

// Light object types
export const LIGHT_TYPES = new Set<ObjectType>(['pointlight', 'spotlight', 'rectlight'])

// ─── Type-specific defaults ───────────────────────────────────────────────────

export function typeSpecificDefaults(type: ObjectType): Partial<SceneObject> {
  switch (type) {
    case 'text3d':
      return {
        text: 'Hello',
        fontSize: 0.5,
        letterSpacing: 0,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        color: '#ffffff',
        roughness: 0.3,
        metalness: 0.6,
      }
    case 'particles':
      return {
        particleCount: 600,
        particleSize: 0.04,
        particleSpeed: 0.5,
        particleSpread: 2.5,
        color: '#88ccff',
        opacity: 0.85,
      }
    case 'spline':
      return {
        splinePoints: [[0, 0, 0], [1, 1, 0], [2, 0, 0], [3, 1, 0]],
        splineClosed: false,
        color: '#60a5fa',
      }
    case 'pointlight':
      return { lightColor: '#ffffff', lightIntensity: 2, lightDistance: 10, lightDecay: 2 }
    case 'spotlight':
      return {
        lightColor: '#ffffff',
        lightIntensity: 3,
        lightDistance: 15,
        lightDecay: 2,
        lightAngle: 0.4,
        lightPenumbra: 0.3,
      }
    case 'rectlight':
      return { lightColor: '#ffffff', lightIntensity: 5, lightWidth: 2, lightHeight: 2 }
    case 'group':
      return {}
    case 'csg':
      return { color: '#aaaaaa', roughness: 0.4, metalness: 0.1 }
    default:
      return {}
  }
}

// ─── Interpolation helpers ────────────────────────────────────────────────────

function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case 'ease-in':     return t * t
    case 'ease-out':    return t * (2 - t)
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    default:            return t
  }
}

function lerpV3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function interpolateTrack(
  track: AnimationTrack,
  time: number,
): Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale'>> {
  const kfs = [...track.keyframes].sort((a, b) => a.time - b.time)
  if (kfs.length === 0) return {}

  if (time <= kfs[0].time) {
    const k = kfs[0]
    return { position: k.position, rotation: k.rotation, scale: k.scale }
  }
  const last = kfs[kfs.length - 1]
  if (time >= last.time) {
    return { position: last.position, rotation: last.rotation, scale: last.scale }
  }

  const afterIdx = kfs.findIndex(k => k.time > time)
  const before = kfs[afterIdx - 1]
  const after = kfs[afterIdx]
  const rawT = (time - before.time) / (after.time - before.time)
  const t = applyEasing(rawT, after.easing)

  const result: Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale'>> = {}
  if (before.position && after.position) result.position = lerpV3(before.position, after.position, t)
  else if (before.position) result.position = before.position

  if (before.rotation && after.rotation) result.rotation = lerpV3(before.rotation, after.rotation, t)
  else if (before.rotation) result.rotation = before.rotation

  if (before.scale && after.scale) result.scale = lerpV3(before.scale, after.scale, t)
  else if (before.scale) result.scale = before.scale

  return result
}

export function interpolateCameraTrack(
  keyframes: CameraKeyframe[],
  time: number,
): { position: [number, number, number]; target: [number, number, number]; fov: number } | null {
  const kfs = [...keyframes].sort((a, b) => a.time - b.time)
  if (kfs.length === 0) return null

  if (time <= kfs[0].time) return { position: kfs[0].position, target: kfs[0].target, fov: kfs[0].fov }
  const last = kfs[kfs.length - 1]
  if (time >= last.time) return { position: last.position, target: last.target, fov: last.fov }

  const afterIdx = kfs.findIndex(k => k.time > time)
  const before = kfs[afterIdx - 1]
  const after = kfs[afterIdx]
  const rawT = (time - before.time) / (after.time - before.time)
  const t = applyEasing(rawT, after.easing)

  return {
    position: lerpV3(before.position, after.position, t),
    target:   lerpV3(before.target,   after.target,   t),
    fov:      before.fov + (after.fov - before.fov) * t,
  }
}
