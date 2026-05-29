import type {
  SceneObject, AnimationClip, AnimationTrack, Keyframe,
  CameraKeyframe, EasingType, ObjectType,
} from '../types'
import { OBJECT_DEFAULTS, typeSpecificDefaults } from '../types'

export const PI  = Math.PI
export const TAU = Math.PI * 2

// ── ID generation ─────────────────────────────────────────────────────────────

let _idCounter = 0
export function uid(prefix = 'k'): string {
  _idCounter += 1
  return `${prefix}_${_idCounter}`
}

// ── Object factory ────────────────────────────────────────────────────────────

type ObjOpts =
  & Omit<Partial<SceneObject>, 'id' | 'name' | 'type'>
  & { id: string; name: string; type: ObjectType }

export function obj(opts: ObjOpts): SceneObject {
  return {
    ...OBJECT_DEFAULTS,
    ...typeSpecificDefaults(opts.type),
    ...opts,
  } as SceneObject
}

// ── Keyframe factory ──────────────────────────────────────────────────────────

export function kf(
  time: number,
  props: Partial<Pick<Keyframe, 'position' | 'rotation' | 'scale' | 'pathProgress'>>,
  easing: EasingType = 'ease-in-out',
): Keyframe {
  return { id: uid('kf'), time, ...props, easing }
}

export function camKf(
  time: number,
  position: [number, number, number],
  target: [number, number, number],
  fov = 55,
  easing: EasingType = 'ease-in-out',
): CameraKeyframe {
  return { id: uid('cam'), time, position, target, fov, easing }
}

// ── Track builders ────────────────────────────────────────────────────────────

/** Orbit an object around a center on the XZ plane. */
export function orbit(opts: {
  objectId: string
  center?: [number, number, number]
  radius: number
  duration: number
  startAngle?: number
  cycles?: number
  height?: number
  steps?: number
  easing?: EasingType
  /** Tilt the orbit plane around X axis (radians) */
  tilt?: number
  /** Direction: 1 = CCW (default), -1 = CW */
  direction?: 1 | -1
}): AnimationTrack {
  const center = opts.center ?? [0, 0, 0]
  const cycles = opts.cycles ?? 1
  const steps  = opts.steps ?? Math.max(8, Math.ceil(cycles * 12))
  const easing = opts.easing ?? 'linear'
  const start  = opts.startAngle ?? 0
  const height = opts.height ?? center[1]
  const tilt   = opts.tilt ?? 0
  const dir    = opts.direction ?? 1

  const frames: Keyframe[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * opts.duration
    const angle = start + dir * (i / steps) * cycles * TAU
    const cx = Math.cos(angle) * opts.radius
    const cz = Math.sin(angle) * opts.radius
    const y  = height + Math.sin(tilt) * cz
    const z  = Math.cos(tilt) * cz
    frames.push(kf(t, { position: [center[0] + cx, y, center[2] + z] }, easing))
  }
  return { objectId: opts.objectId, keyframes: frames }
}

/** Spin around an axis. Keeps position/scale fixed if provided. */
export function spin(opts: {
  objectId: string
  axis?: 'x' | 'y' | 'z' | 'xyz'
  duration: number
  cycles?: number
  position?: [number, number, number]
  scale?: [number, number, number]
  easing?: EasingType
}): AnimationTrack {
  const cycles = opts.cycles ?? 1
  const easing = opts.easing ?? 'linear'
  const total  = cycles * TAU
  const rot: [number, number, number] =
    opts.axis === 'x'   ? [total, 0, 0] :
    opts.axis === 'z'   ? [0, 0, total] :
    opts.axis === 'xyz' ? [total, total, total] :
                          [0, total, 0]
  return {
    objectId: opts.objectId,
    keyframes: [
      kf(0,             { rotation: [0, 0, 0], position: opts.position, scale: opts.scale }, easing),
      kf(opts.duration, { rotation: rot,        position: opts.position, scale: opts.scale }, easing),
    ],
  }
}

/** Pulse scale between min and max for N beats. */
export function pulse(opts: {
  objectId: string
  duration: number
  minScale: number
  maxScale: number
  beats?: number
  position?: [number, number, number]
  easing?: EasingType
  /** Phase offset 0–1 — shifts where the pulse starts. */
  phase?: number
}): AnimationTrack {
  const beats  = opts.beats ?? 4
  const easing = opts.easing ?? 'ease-out'
  const phase  = opts.phase ?? 0
  const frames: Keyframe[] = []

  for (let i = 0; i <= beats * 2; i++) {
    const t = (i / (beats * 2)) * opts.duration
    const idxPhased = i + Math.round(phase * 2)
    const s = idxPhased % 2 === 0 ? opts.minScale : opts.maxScale
    frames.push(kf(t, { position: opts.position, scale: [s, s, s] }, easing))
  }
  return { objectId: opts.objectId, keyframes: frames }
}

/** Sample a continuous sine wave into N keyframes. */
export function sineWave(opts: {
  objectId: string
  duration: number
  basePosition: [number, number, number]
  amplitude: [number, number, number]
  frequency?: number
  phase?: number
  steps?: number
  easing?: EasingType
}): AnimationTrack {
  const frequency = opts.frequency ?? 1
  const steps     = opts.steps ?? 24
  const easing    = opts.easing ?? 'ease-in-out'
  const phase     = opts.phase ?? 0
  const [bx, by, bz] = opts.basePosition
  const [ax, ay, az] = opts.amplitude

  const frames: Keyframe[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * opts.duration
    const w = (i / steps) * frequency * TAU + phase * TAU
    const x = bx + Math.sin(w) * ax
    const y = by + Math.sin(w) * ay
    const z = bz + Math.sin(w) * az
    frames.push(kf(t, { position: [x, y, z] }, easing))
  }
  return { objectId: opts.objectId, keyframes: frames }
}

/** Scale wave — useful for spectrum-bar pulsing. */
export function scaleWave(opts: {
  objectId: string
  duration: number
  baseScale: [number, number, number]
  amplitude: [number, number, number]
  frequency?: number
  phase?: number
  steps?: number
  position?: [number, number, number]
  easing?: EasingType
  /** Use abs(sin) so the pulse always pops upward */
  rectified?: boolean
}): AnimationTrack {
  const frequency = opts.frequency ?? 1
  const steps     = opts.steps ?? 24
  const easing    = opts.easing ?? 'ease-in-out'
  const phase     = opts.phase ?? 0
  const rectified = opts.rectified ?? true
  const [bx, by, bz] = opts.baseScale
  const [ax, ay, az] = opts.amplitude

  const frames: Keyframe[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * opts.duration
    const w = (i / steps) * frequency * TAU + phase * TAU
    const env = rectified ? Math.abs(Math.sin(w)) : (Math.sin(w) + 1) / 2
    frames.push(kf(t, {
      position: opts.position,
      scale: [bx + env * ax, by + env * ay, bz + env * az],
    }, easing))
  }
  return { objectId: opts.objectId, keyframes: frames }
}

/** Expanding ring — grows from start to end scale then snaps back, with optional spin. */
export function expandPulse(opts: {
  objectId: string
  duration: number
  startScale: number
  endScale: number
  position?: [number, number, number]
  beats?: number
  phase?: number
  spinAxis?: 'x' | 'y' | 'z'
  spinCycles?: number
  easing?: EasingType
}): AnimationTrack {
  const beats    = opts.beats ?? 4
  const easing   = opts.easing ?? 'ease-out'
  const phase    = opts.phase ?? 0
  const beatDur  = opts.duration / beats
  const rotMax   = (opts.spinCycles ?? 0) * TAU
  const axisIdx  = opts.spinAxis === 'x' ? 0 : opts.spinAxis === 'z' ? 2 : 1

  const frames: Keyframe[] = []
  for (let b = 0; b < beats; b++) {
    const t0 = (b + phase) * beatDur
    const tMid = t0 + beatDur * 0.6
    const t1 = t0 + beatDur

    const rot0: [number, number, number] = [0, 0, 0]
    const rotM: [number, number, number] = [0, 0, 0]
    rotM[axisIdx] = rotMax * 0.6
    const rot1: [number, number, number] = [0, 0, 0]
    rot1[axisIdx] = rotMax

    frames.push(kf(t0,   { position: opts.position, scale: [opts.startScale, opts.startScale, opts.startScale], rotation: rot0 }, 'ease-out'))
    frames.push(kf(tMid, { position: opts.position, scale: [opts.endScale,   opts.endScale,   opts.endScale],   rotation: rotM }, easing))
    frames.push(kf(t1,   { position: opts.position, scale: [opts.startScale, opts.startScale, opts.startScale], rotation: rot1 }, 'ease-in'))
  }
  return { objectId: opts.objectId, keyframes: frames }
}

// ── Camera helpers ────────────────────────────────────────────────────────────

export function cameraOrbit(opts: {
  duration: number
  radius: number
  height: number
  target?: [number, number, number]
  cycles?: number
  steps?: number
  fov?: number
  startAngle?: number
  easing?: EasingType
}): CameraKeyframe[] {
  const target = opts.target ?? [0, 0, 0]
  const cycles = opts.cycles ?? 1
  const steps  = opts.steps ?? Math.max(8, Math.ceil(cycles * 12))
  const easing = opts.easing ?? 'linear'
  const fov    = opts.fov ?? 55
  const start  = opts.startAngle ?? 0

  const frames: CameraKeyframe[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * opts.duration
    const angle = start + (i / steps) * cycles * TAU
    const x = target[0] + Math.cos(angle) * opts.radius
    const z = target[2] + Math.sin(angle) * opts.radius
    frames.push(camKf(t, [x, target[1] + opts.height, z], target, fov, easing))
  }
  return frames
}

// ── Spatial distribution helpers ──────────────────────────────────────────────

export function pointsOnCircle(n: number, radius: number, y = 0, startAngle = 0):
  [number, number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = startAngle + (i / n) * TAU
    return [Math.cos(a) * radius, y, Math.sin(a) * radius]
  })
}

export function pointsOnSphere(n: number, radius: number): [number, number, number][] {
  const points: [number, number, number][] = []
  const phi = PI * (Math.sqrt(5) - 1)
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i
    points.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius])
  }
  return points
}

/** Logarithmic spiral arm in the XZ plane. */
export function logSpiral(opts: {
  count: number
  a?: number   // initial radius
  b?: number   // tightness
  arms?: number
  y?: number
  jitter?: number
}): [number, number, number][] {
  const a = opts.a ?? 0.15
  const b = opts.b ?? 0.22
  const arms = opts.arms ?? 2
  const y = opts.y ?? 0
  const jitter = opts.jitter ?? 0

  const points: [number, number, number][] = []
  for (let i = 0; i < opts.count; i++) {
    const arm   = i % arms
    const tNorm = i / opts.count
    const theta = tNorm * 6 * PI + (arm / arms) * TAU
    const r     = a * Math.exp(b * theta)
    const jx = (Math.random() - 0.5) * jitter
    const jz = (Math.random() - 0.5) * jitter
    points.push([Math.cos(theta) * r + jx, y, Math.sin(theta) * r + jz])
  }
  return points
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function rgb2hex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const a = hex2rgb(c1), b = hex2rgb(c2)
  return rgb2hex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)
}

export function hslHex(h: number, s = 0.8, l = 0.55): string {
  h = ((h % 360) + 360) % 360 / 360
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function rainbow(n: number, s = 0.8, l = 0.55, startHue = 0): string[] {
  return Array.from({ length: n }, (_, i) => hslHex(startHue + (i / n) * 360, s, l))
}

export function gradient(c1: string, c2: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => lerpColor(c1, c2, n === 1 ? 0 : i / (n - 1)))
}

// ── Clip factory ──────────────────────────────────────────────────────────────

export function clip(opts: {
  id: string
  name: string
  duration: number
  loop?: boolean
  tracks: AnimationTrack[]
  cameraTrack?: CameraKeyframe[]
}): AnimationClip {
  return {
    id: opts.id,
    name: opts.name,
    duration: opts.duration,
    loop: opts.loop ?? true,
    tracks: opts.tracks,
    cameraTrack: opts.cameraTrack,
  }
}

// ── Misc ──────────────────────────────────────────────────────────────────────

export function rand(min: number, max: number, seed?: number): number {
  if (seed === undefined) return min + Math.random() * (max - min)
  // Deterministic mulberry32
  let t = seed | 0
  t = (t + 0x6D2B79F5) | 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
  return min + (((r ^ (r >>> 14)) >>> 0) / 4294967296) * (max - min)
}
