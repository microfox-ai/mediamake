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
  | 'annotation'

export type TransformMode = 'translate' | 'rotate' | 'scale'

export type EasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic'
  | 'back-in'
  | 'back-out'
  | 'spring'
  | 'expo-in'
  | 'expo-out'
  | 'circ-in'
  | 'circ-out'
  | 'cubic-in'
  | 'cubic-out'

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

  // ── Lights ────────────────────────────────────────────────────────────────────
  lightColor?: string
  lightIntensity?: number
  lightDistance?: number
  lightDecay?: number
  lightAngle?: number
  lightPenumbra?: number
  lightWidth?: number
  lightHeight?: number

  // ── Grouping ──────────────────────────────────────────────────────────────────
  groupId?: string

  // ── Mirror / Symmetry ────────────────────────────────────────────────────────
  mirrorX?: boolean
  mirrorY?: boolean
  mirrorZ?: boolean

  // ── Boolean CSG ──────────────────────────────────────────────────────────────
  csgGeometryData?: Record<string, unknown>

  // ── Procedural texture ────────────────────────────────────────────────────────
  proceduralTexture?: ProceduralTextureConfig

  // ── Paint ─────────────────────────────────────────────────────────────────────
  paintTexture?: string

  // ── Path animation ────────────────────────────────────────────────────────────
  pathFollowId?: string   // ID of spline object to follow
  pathProgress?: number   // 0–1 position along the path

  // ── GLTF skeletal animation ───────────────────────────────────────────────────
  gltfAnimationIndex?: number
  gltfAnimationPlay?: boolean
  gltfAnimationSpeed?: number

  // ── Morph targets ─────────────────────────────────────────────────────────────
  morphInfluences?: Record<string, number>

  // ── GLTF metadata (populated at load time, not user-editable) ─────────────────
  gltfAnimationNames?: string[]
  gltfMorphNames?: string[]

  // ── Object flags ──────────────────────────────────────────────────────────────
  locked?: boolean

  // ── Annotation pin ────────────────────────────────────────────────────────────
  annotationText?: string
  annotationBgColor?: string
  annotationAlwaysVisible?: boolean
}

// ─── Animation ───────────────────────────────────────────────────────────────

export interface Keyframe {
  id: string
  time: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  pathProgress?: number
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

export interface ClipMarker {
  id: string
  time: number
  label: string
  color: string
}

export interface AnimationClip {
  id: string
  name: string
  duration: number
  loop: boolean
  tracks: AnimationTrack[]
  cameraTrack?: CameraKeyframe[]
  markers?: ClipMarker[]
}

// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentPreset =
  | 'none' | 'sunset' | 'dawn' | 'night' | 'warehouse'
  | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby'

export const OBJECT_DEFAULTS: Omit<SceneObject, 'id' | 'name' | 'type'> = {
  position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  color: '#4f8ef7', roughness: 0.5, metalness: 0.1, opacity: 1,
  wireframe: false, emissive: '#000000', emissiveIntensity: 0,
  castShadow: true, receiveShadow: true, visible: true,
}

export const OBJECT_LABELS: Record<ObjectType, string> = {
  box: 'Box', sphere: 'Sphere', cylinder: 'Cylinder', torus: 'Torus', cone: 'Cone',
  plane: 'Plane', ring: 'Ring', icosahedron: 'Icosahedron', dodecahedron: 'Dodecahedron',
  torusKnot: 'Torus Knot', gltf: 'Model', obj: 'OBJ Model', fbx: 'FBX Model',
  stl: 'STL Model', image: 'Image', text3d: '3D Text', particles: 'Particles',
  spline: 'Spline', pointlight: 'Point Light', spotlight: 'Spot Light',
  rectlight: 'Area Light', group: 'Group', csg: 'CSG Mesh', annotation: 'Annotation',
}

export const OBJECT_ICONS: Record<ObjectType, string> = {
  box: '⬛', sphere: '⚪', cylinder: '🔵', torus: '💿', cone: '🔺',
  plane: '▬', ring: '⭕', icosahedron: '🔷', dodecahedron: '🔹', torusKnot: '🌀',
  gltf: '📦', obj: '📦', fbx: '📦', stl: '🧱', image: '🖼️',
  text3d: '📝', particles: '✨', spline: '〰️',
  pointlight: '💡', spotlight: '🔦', rectlight: '🔆',
  group: '📁', csg: '🔲', annotation: '📌',
}

export const MODEL_TYPES    = new Set<ObjectType>(['gltf', 'obj', 'fbx', 'stl', 'image'])
export const PRIMITIVE_TYPES = new Set<ObjectType>([
  'box', 'sphere', 'cylinder', 'torus', 'cone', 'plane', 'ring',
  'icosahedron', 'dodecahedron', 'torusKnot', 'csg',
])
export const LIGHT_TYPES = new Set<ObjectType>(['pointlight', 'spotlight', 'rectlight'])

// ─── Type-specific defaults ───────────────────────────────────────────────────

export function typeSpecificDefaults(type: ObjectType): Partial<SceneObject> {
  switch (type) {
    case 'text3d':    return { text: 'Hello', fontSize: 0.5, letterSpacing: 0, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.01, color: '#ffffff', roughness: 0.3, metalness: 0.6 }
    case 'particles': return { particleCount: 600, particleSize: 0.04, particleSpeed: 0.5, particleSpread: 2.5, color: '#88ccff', opacity: 0.85 }
    case 'spline':    return { splinePoints: [[0, 0, 0], [1, 1, 0], [2, 0, 0], [3, 1, 0]], splineClosed: false, color: '#60a5fa' }
    case 'pointlight': return { lightColor: '#ffffff', lightIntensity: 2, lightDistance: 10, lightDecay: 2 }
    case 'spotlight':  return { lightColor: '#ffffff', lightIntensity: 3, lightDistance: 15, lightDecay: 2, lightAngle: 0.4, lightPenumbra: 0.3 }
    case 'rectlight':  return { lightColor: '#ffffff', lightIntensity: 5, lightWidth: 2, lightHeight: 2 }
    case 'group': return {}
    case 'csg':   return { color: '#aaaaaa', roughness: 0.4, metalness: 0.1 }
    case 'annotation': return { annotationText: 'Label', annotationBgColor: '#1e293b', annotationAlwaysVisible: true, castShadow: false, receiveShadow: false }
    default: return {}
  }
}

// ─── Easing functions ─────────────────────────────────────────────────────────

function bounceOut(t: number): number {
  const n1 = 7.5625, d1 = 2.75
  if (t < 1 / d1)     return n1 * t * t
  if (t < 2 / d1)     return n1 * (t -= 1.5 / d1) * t + 0.75
  if (t < 2.5 / d1)   return n1 * (t -= 2.25 / d1) * t + 0.9375
  return n1 * (t -= 2.625 / d1) * t + 0.984375
}
function elasticOut(t: number): number {
  if (t === 0 || t === 1) return t
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1
}
function backIn(t: number): number {
  const c = 1.70158
  return c * t * t * t - c * t * t
}
function backOut(t: number): number {
  const c = 1.70158; const s = 1 - t
  return 1 - (c * s * s * s - c * s * s)
}
function springOut(t: number): number {
  return 1 - Math.exp(-6 * t) * Math.cos(4 * Math.PI * t)
}

export function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case 'ease-in':     return t * t
    case 'ease-out':    return t * (2 - t)
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    case 'bounce':      return bounceOut(t)
    case 'elastic':     return elasticOut(t)
    case 'back-in':     return backIn(t)
    case 'back-out':    return backOut(t)
    case 'spring':      return springOut(t)
    case 'expo-in':     return t === 0 ? 0 : Math.pow(2, 10 * t - 10)
    case 'expo-out':    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    case 'circ-in':     return 1 - Math.sqrt(1 - t * t)
    case 'circ-out':    return Math.sqrt(1 - (t - 1) * (t - 1))
    case 'cubic-in':    return t * t * t
    case 'cubic-out':   { const s = 1 - t; return 1 - s * s * s }
    default:            return t
  }
}

export function sampleEasingCurve(easing: EasingType, n = 40): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([t, applyEasing(t, easing)])
  }
  return pts
}

export interface EasingPreset {
  value: EasingType
  label: string
  desc: string
}

export const EASING_PRESETS: EasingPreset[] = [
  { value: 'linear',      label: 'Linear',    desc: 'Constant speed' },
  { value: 'ease-in',     label: 'Ease In',   desc: 'Slow start' },
  { value: 'ease-out',    label: 'Ease Out',  desc: 'Slow end' },
  { value: 'ease-in-out', label: 'Smooth',    desc: 'Slow start & end' },
  { value: 'cubic-in',    label: 'Cubic In',  desc: 'Strong accel' },
  { value: 'cubic-out',   label: 'Cubic Out', desc: 'Strong decel' },
  { value: 'expo-in',     label: 'Expo In',   desc: 'Explosive start' },
  { value: 'expo-out',    label: 'Expo Out',  desc: 'Explosive stop' },
  { value: 'circ-in',     label: 'Circ In',   desc: 'Circular accel' },
  { value: 'circ-out',    label: 'Circ Out',  desc: 'Circular decel' },
  { value: 'back-in',     label: 'Back In',   desc: 'Slight recoil first' },
  { value: 'back-out',    label: 'Back Out',  desc: 'Overshoot end' },
  { value: 'bounce',      label: 'Bounce',    desc: 'Bounces at end' },
  { value: 'elastic',     label: 'Elastic',   desc: 'Spring oscillation' },
  { value: 'spring',      label: 'Spring',    desc: 'Damped spring' },
]

// ─── Curve channel types for graph editor ────────────────────────────────────

export type CurveChannel =
  | 'position.x' | 'position.y' | 'position.z'
  | 'rotation.x' | 'rotation.y' | 'rotation.z'
  | 'scale.x'    | 'scale.y'    | 'scale.z'
  | 'pathProgress'

export const CURVE_CHANNEL_COLORS: Record<CurveChannel, string> = {
  'position.x': '#f87171', 'position.y': '#4ade80', 'position.z': '#60a5fa',
  'rotation.x': '#fb923c', 'rotation.y': '#a3e635', 'rotation.z': '#38bdf8',
  'scale.x':    '#f43f5e', 'scale.y':    '#84cc16', 'scale.z':    '#06b6d4',
  'pathProgress': '#a78bfa',
}

export const CURVE_CHANNEL_LABELS: Record<CurveChannel, string> = {
  'position.x': 'Pos X', 'position.y': 'Pos Y', 'position.z': 'Pos Z',
  'rotation.x': 'Rot X', 'rotation.y': 'Rot Y', 'rotation.z': 'Rot Z',
  'scale.x':    'Scl X', 'scale.y':    'Scl Y', 'scale.z':    'Scl Z',
  'pathProgress': 'Path%',
}

export const ALL_CURVE_CHANNELS: CurveChannel[] = [
  'position.x', 'position.y', 'position.z',
  'rotation.x', 'rotation.y', 'rotation.z',
  'scale.x', 'scale.y', 'scale.z',
]

// ─── Interpolation helpers ────────────────────────────────────────────────────

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
): Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale' | 'pathProgress'>> {
  const kfs = [...track.keyframes].sort((a, b) => a.time - b.time)
  if (kfs.length === 0) return {}

  if (time <= kfs[0].time) {
    const k = kfs[0]
    return { position: k.position, rotation: k.rotation, scale: k.scale, pathProgress: k.pathProgress }
  }
  const last = kfs[kfs.length - 1]
  if (time >= last.time)
    return { position: last.position, rotation: last.rotation, scale: last.scale, pathProgress: last.pathProgress }

  const afterIdx = kfs.findIndex(k => k.time > time)
  const before = kfs[afterIdx - 1]
  const after  = kfs[afterIdx]
  const rawT   = (time - before.time) / (after.time - before.time)
  const t      = applyEasing(rawT, after.easing)

  const result: Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale' | 'pathProgress'>> = {}
  if (before.position && after.position) result.position = lerpV3(before.position, after.position, t)
  else if (before.position) result.position = before.position
  if (before.rotation && after.rotation) result.rotation = lerpV3(before.rotation, after.rotation, t)
  else if (before.rotation) result.rotation = before.rotation
  if (before.scale && after.scale) result.scale = lerpV3(before.scale, after.scale, t)
  else if (before.scale) result.scale = before.scale
  if (before.pathProgress !== undefined && after.pathProgress !== undefined)
    result.pathProgress = before.pathProgress + (after.pathProgress - before.pathProgress) * t
  else if (before.pathProgress !== undefined)
    result.pathProgress = before.pathProgress

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
  const after  = kfs[afterIdx]
  const rawT   = (time - before.time) / (after.time - before.time)
  const t      = applyEasing(rawT, after.easing)

  return {
    position: lerpV3(before.position, after.position, t),
    target:   lerpV3(before.target,   after.target,   t),
    fov:      before.fov + (after.fov - before.fov) * t,
  }
}
