import { create } from 'zustand'
import type {
  SceneObject, TransformMode, EnvironmentPreset, ObjectType,
  AnimationClip, AnimationTrack, Keyframe, EasingType, CameraKeyframe,
} from './types'
import { OBJECT_DEFAULTS, MODEL_TYPES, LIGHT_TYPES, typeSpecificDefaults, OBJECT_LABELS } from './types'
import type { SceneTemplate } from './animation-templates'
import { DEFAULT_TEMPLATE } from './animation-templates'

export type SkyPreset = 'sunny' | 'cloudy' | 'rainy' | 'snowfall' | 'night' | 'custom'

export const SKY_PRESET_PARAMS: Record<Exclude<SkyPreset, 'custom'>, {
  turbidity: number; rayleigh: number; inclination: number; azimuth: number
}> = {
  sunny:    { turbidity: 2,  rayleigh: 1,   inclination: 0.30, azimuth: 0.25 },
  cloudy:   { turbidity: 20, rayleigh: 4,   inclination: 0.50, azimuth: 0.25 },
  rainy:    { turbidity: 20, rayleigh: 7,   inclination: 0.50, azimuth: 0.25 },
  snowfall: { turbidity: 15, rayleigh: 4,   inclination: 0.50, azimuth: 0.25 },
  night:    { turbidity: 1,  rayleigh: 0.5, inclination: 0.90, azimuth: 0.25 },
}

const ENV_SKY_MAP: Partial<Record<string, { turbidity: number; rayleigh: number; inclination: number; azimuth: number; preset: SkyPreset }>> = {
  sunset:    { turbidity: 10, rayleigh: 3,   inclination: 0.49, azimuth: 0.25, preset: 'sunny' },
  dawn:      { turbidity: 6,  rayleigh: 2,   inclination: 0.47, azimuth: 0.28, preset: 'sunny' },
  night:     { turbidity: 1,  rayleigh: 0.5, inclination: 0.90, azimuth: 0.25, preset: 'night' },
  warehouse: { turbidity: 20, rayleigh: 4,   inclination: 0.50, azimuth: 0.25, preset: 'cloudy' },
  forest:    { turbidity: 12, rayleigh: 3,   inclination: 0.38, azimuth: 0.25, preset: 'cloudy' },
  apartment: { turbidity: 8,  rayleigh: 3,   inclination: 0.45, azimuth: 0.25, preset: 'sunny' },
  studio:    { turbidity: 4,  rayleigh: 2,   inclination: 0.35, azimuth: 0.25, preset: 'sunny' },
  city:      { turbidity: 3,  rayleigh: 1.5, inclination: 0.35, azimuth: 0.25, preset: 'sunny' },
  park:      { turbidity: 2,  rayleigh: 1,   inclination: 0.30, azimuth: 0.25, preset: 'sunny' },
  lobby:     { turbidity: 6,  rayleigh: 2,   inclination: 0.40, azimuth: 0.25, preset: 'sunny' },
}

let nextId = 1
const genId     = () => `obj_${Date.now()}_${nextId++}`
const genClipId = () => `clip_${Date.now()}_${nextId++}`
const genKfId   = () => `kf_${Date.now()}_${nextId++}`

function countOfType(objects: SceneObject[], type: ObjectType) {
  return objects.filter(o => o.type === type).length + 1
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mediamake_studio3d_v1'

type Snapshot = {
  objects: SceneObject[]
  clips: AnimationClip[]
  activeClipId: string | null
  sequenceMode: boolean
  showTimeline: boolean
  background: string
  environment: EnvironmentPreset
  ambientIntensity: number
  directionalIntensity: number
  directionalPosition: [number, number, number]
  showGrid: boolean
  showAxes: boolean
  skyEnabled: boolean
  skyPreset: SkyPreset
  skyTurbidity: number
  skyRayleigh: number
  skyInclination: number
  skyAzimuth: number
}

function loadFromStorage(): Snapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Snapshot) : null
  } catch { return null }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null
function persist(snap: Snapshot) {
  if (typeof window === 'undefined') return
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snap)) } catch { /* quota */ }
  }, 600)
}

// ─── Initial state ────────────────────────────────────────────────────────────

function buildInit(): Snapshot {
  const saved = loadFromStorage()
  if (saved) {
    const objects = saved.objects
      .filter(o => (o.type as string) !== 'camera')
      .map(o => {
        const stripped = { ...o }
        if (MODEL_TYPES.has(o.type) && o.url?.startsWith('blob:')) stripped.url = undefined
        if (o.customTexture?.startsWith('blob:')) {
          stripped.customTexture = undefined
          stripped.customTextureName = undefined
        }
        return stripped
      })
    return {
      ...saved,
      objects,
      // default sky fields for snapshots saved before sky feature was added
      skyEnabled: saved.skyEnabled ?? false,
      skyPreset: (saved as any).skyPreset ?? 'custom',
      skyTurbidity: saved.skyTurbidity ?? 10,
      skyRayleigh: saved.skyRayleigh ?? 3,
      skyInclination: saved.skyInclination ?? 0.49,
      skyAzimuth: saved.skyAzimuth ?? 0.25,
    }
  }
  const t = DEFAULT_TEMPLATE
  return {
    objects: t.objects,
    clips: t.clips,
    activeClipId: t.clips[0]?.id ?? null,
    sequenceMode: false,
    showTimeline: t.clips.length > 0,
    background: t.settings.background,
    environment: t.settings.environment,
    ambientIntensity: t.settings.ambientIntensity,
    directionalIntensity: t.settings.directionalIntensity,
    directionalPosition: t.settings.directionalPosition,
    showGrid: t.settings.showGrid,
    showAxes: false,
    skyEnabled: false,
    skyPreset: 'sunny' as SkyPreset,
    skyTurbidity: 10,
    skyRayleigh: 3,
    skyInclination: 0.49,
    skyAzimuth: 0.25,
  }
}

// ─── State shape ─────────────────────────────────────────────────────────────

interface SceneState {
  objects: SceneObject[]
  selectedId: string | null
  selectedIds: string[]       // all currently selected (includes selectedId)
  paintObjectId: string | null
  paintBrushColor: string
  paintBrushSize: number
  transformMode: TransformMode
  ambientIntensity: number
  directionalIntensity: number
  directionalPosition: [number, number, number]
  environment: EnvironmentPreset
  background: string
  showGrid: boolean
  showAxes: boolean
  showStats: boolean
  isRecording: boolean
  recordingDuration: number
  clips: AnimationClip[]
  activeClipId: string | null
  isPlaying: boolean
  currentTime: number
  sequenceMode: boolean
  showTimeline: boolean
  viewportCamera: { position: [number, number, number]; target: [number, number, number]; fov: number }

  // Sky
  skyEnabled: boolean
  skyPreset: SkyPreset
  skyTurbidity: number
  skyRayleigh: number
  skyInclination: number
  skyAzimuth: number

  addObject: (type: ObjectType) => void
  addGltfObject: (url: string, name: string, cacheKey?: string) => void
  addModelObject: (url: string, name: string, type: 'obj' | 'fbx' | 'stl', cacheKey?: string) => void
  addImageObject: (url: string, name: string) => void
  removeObject: (id: string) => void
  duplicateObject: (id: string) => void
  updateObject: (id: string, updates: Partial<SceneObject>) => void
  selectObject: (id: string | null) => void
  toggleSelectObject: (id: string) => void
  setSelectedIds: (ids: string[]) => void
  groupSelected: () => void
  ungroupObject: (groupId: string) => void
  addCsgObject: (idA: string, idB: string, operation: string, geoData: Record<string, unknown>, color: string) => void
  moveObject: (id: string, direction: 'up' | 'down') => void
  clearScene: () => void

  setPaintObjectId: (id: string | null) => void
  setPaintBrushColor: (v: string) => void
  setPaintBrushSize: (v: number) => void

  setTransformMode: (mode: TransformMode) => void
  setAmbientIntensity: (v: number) => void
  setDirectionalIntensity: (v: number) => void
  setDirectionalPosition: (pos: [number, number, number]) => void
  setEnvironment: (env: EnvironmentPreset) => void
  setBackground: (color: string) => void
  toggleGrid: () => void
  toggleAxes: () => void
  toggleStats: () => void
  setIsRecording: (v: boolean) => void
  setRecordingDuration: (v: number) => void
  updateViewportCamera: (position: [number, number, number], target: [number, number, number], fov: number) => void

  setSkyEnabled: (v: boolean) => void
  setSkyPreset: (preset: SkyPreset) => void
  setSkyParams: (p: Partial<Pick<SceneState, 'skyTurbidity' | 'skyRayleigh' | 'skyInclination' | 'skyAzimuth'>>) => void

  addClip: () => void
  removeClip: (id: string) => void
  duplicateClip: (id: string) => void
  updateClip: (id: string, updates: Partial<Pick<AnimationClip, 'name' | 'duration' | 'loop'>>) => void
  setActiveClip: (id: string | null) => void
  captureKeyframe: (objectId: string) => void
  removeKeyframe: (clipId: string, objectId: string, kfId: string) => void
  removeTrack: (clipId: string, objectId: string) => void
  setKeyframeEasing: (clipId: string, objectId: string, kfId: string, easing: EasingType) => void
  captureCameraKeyframe: () => void
  removeCameraKeyframe: (clipId: string, kfId: string) => void
  setCameraKeyframeEasing: (clipId: string, kfId: string, easing: EasingType) => void
  clearCameraTrack: (clipId: string) => void
  setIsPlaying: (v: boolean) => void
  stopAnimation: () => void
  setCurrentTime: (t: number) => void
  toggleSequenceMode: () => void
  toggleTimeline: () => void

  loadTemplate: (template: SceneTemplate) => void
  clearStorage: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

const init = buildInit()

export const useSceneStore = create<SceneState>()((set, get) => {
  const snap = (): Snapshot => {
    const s = get()
    return {
      objects: s.objects, clips: s.clips, activeClipId: s.activeClipId,
      sequenceMode: s.sequenceMode, showTimeline: s.showTimeline,
      background: s.background, environment: s.environment,
      ambientIntensity: s.ambientIntensity,
      directionalIntensity: s.directionalIntensity,
      directionalPosition: s.directionalPosition,
      showGrid: s.showGrid, showAxes: s.showAxes,
      skyEnabled: s.skyEnabled, skyPreset: s.skyPreset, skyTurbidity: s.skyTurbidity,
      skyRayleigh: s.skyRayleigh, skyInclination: s.skyInclination,
      skyAzimuth: s.skyAzimuth,
    }
  }

  return {
    objects: init.objects,
    selectedId: null,
    selectedIds: [],
    paintObjectId: null,
    paintBrushColor: '#ff0000',
    paintBrushSize: 0.05,
    transformMode: 'translate',
    ambientIntensity: init.ambientIntensity,
    directionalIntensity: init.directionalIntensity,
    directionalPosition: init.directionalPosition,
    environment: init.environment,
    background: init.background,
    showGrid: init.showGrid,
    showAxes: init.showAxes,
    showStats: false,
    isRecording: false,
    recordingDuration: 5,
    clips: init.clips,
    activeClipId: init.activeClipId,
    isPlaying: false,
    currentTime: 0,
    sequenceMode: init.sequenceMode,
    showTimeline: init.showTimeline,
    viewportCamera: { position: [5, 4, 6], target: [0, 0, 0], fov: 55 },
    skyEnabled: init.skyEnabled,
    skyPreset: init.skyPreset,
    skyTurbidity: init.skyTurbidity,
    skyRayleigh: init.skyRayleigh,
    skyInclination: init.skyInclination,
    skyAzimuth: init.skyAzimuth,

    // ── Object actions ────────────────────────────────────────────────────────────

    addObject: (type) => {
      const { objects } = get()
      const id = genId()
      const offset = objects.length * 0.1
      const extras = typeSpecificDefaults(type)
      const startPos: [number, number, number] = LIGHT_TYPES.has(type)
        ? [0, 2.5, 0]
        : [offset % 2, 0.5, 0]
      set({
        objects: [...objects, {
          ...OBJECT_DEFAULTS, ...extras, id,
          name: `${OBJECT_LABELS[type] ?? type} ${countOfType(objects, type)}`,
          type,
          position: startPos,
        }],
        selectedId: id,
        selectedIds: [id],
      })
      persist(snap())
    },

    addGltfObject: (url, name, cacheKey) => {
      const { objects } = get()
      const id = genId()
      set({
        objects: [...objects, { ...OBJECT_DEFAULTS, id, name, type: 'gltf' as const, url, cacheKey, position: [0, 0, 0] as [number, number, number] }],
        selectedId: id, selectedIds: [id],
      })
      persist(snap())
    },

    addModelObject: (url, name, type, cacheKey) => {
      const { objects } = get()
      const id = genId()
      set({
        objects: [...objects, { ...OBJECT_DEFAULTS, id, name, type, url, cacheKey, position: [0, 0, 0] as [number, number, number] }],
        selectedId: id, selectedIds: [id],
      })
      persist(snap())
    },

    addImageObject: (url, name) => {
      const { objects } = get()
      const id = genId()
      set({
        objects: [...objects, { ...OBJECT_DEFAULTS, id, name, type: 'image' as const, url, position: [0, 1, 0] as [number, number, number] }],
        selectedId: id, selectedIds: [id],
      })
      persist(snap())
    },

    removeObject: (id) => {
      set(s => {
        const obj = s.objects.find(o => o.id === id)
        let objs = s.objects.filter(o => o.id !== id)
        // If removing a group, clear groupId from its children
        if (obj?.type === 'group') {
          objs = objs.map(o => o.groupId === id ? { ...o, groupId: undefined } : o)
        }
        return {
          objects: objs,
          selectedId: s.selectedId === id ? null : s.selectedId,
          selectedIds: s.selectedIds.filter(sid => sid !== id),
        }
      })
      persist(snap())
    },

    duplicateObject: (id) => {
      const src = get().objects.find(o => o.id === id)
      if (!src) return
      const newId = genId()
      set(s => ({
        objects: [...s.objects, {
          ...src, id: newId, name: src.name + ' Copy',
          groupId: undefined,  // duplicated object leaves the group
          position: [src.position[0] + 0.5, src.position[1], src.position[2] + 0.5] as [number, number, number],
        }],
        selectedId: newId,
        selectedIds: [newId],
      }))
      persist(snap())
    },

    updateObject: (id, updates) =>
      set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, ...updates } : o) })),

    selectObject: (id) => {
      if (!id) { set({ selectedId: null, selectedIds: [] }); return }
      const { objects } = get()
      const obj = objects.find(o => o.id === id)
      // Selecting a group also selects all its children
      if (obj?.type === 'group') {
        const childIds = objects.filter(o => o.groupId === id).map(o => o.id)
        set({ selectedId: id, selectedIds: [id, ...childIds] })
      } else {
        set({ selectedId: id, selectedIds: [id] })
      }
    },

    toggleSelectObject: (id) => {
      const { selectedIds } = get()
      const newIds = selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
      set({ selectedIds: newIds, selectedId: newIds[newIds.length - 1] ?? null })
    },

    setSelectedIds: (ids) => set({ selectedIds: ids, selectedId: ids[ids.length - 1] ?? null }),

    groupSelected: () => {
      const { objects, selectedIds } = get()
      if (selectedIds.length < 2) return
      const id = genId()
      const sel = objects.filter(o => selectedIds.includes(o.id))
      const cx = sel.reduce((s, o) => s + o.position[0], 0) / sel.length
      const cy = sel.reduce((s, o) => s + o.position[1], 0) / sel.length
      const cz = sel.reduce((s, o) => s + o.position[2], 0) / sel.length
      const groupObj: SceneObject = {
        ...OBJECT_DEFAULTS, id,
        name: `Group ${countOfType(objects, 'group')}`,
        type: 'group',
        position: [cx, cy, cz],
      }
      const childIds = objects.filter(o => selectedIds.includes(o.id)).map(o => o.id)
      set({
        objects: [groupObj, ...objects.map(o => selectedIds.includes(o.id) ? { ...o, groupId: id } : o)],
        selectedId: id,
        selectedIds: [id, ...childIds],
      })
      persist(snap())
    },

    ungroupObject: (groupId) => {
      set(s => ({
        objects: s.objects.filter(o => o.id !== groupId)
          .map(o => o.groupId === groupId ? { ...o, groupId: undefined } : o),
        selectedId: s.selectedId === groupId ? null : s.selectedId,
        selectedIds: s.selectedIds.filter(id => id !== groupId),
      }))
      persist(snap())
    },

    addCsgObject: (idA, idB, operation, geoData, color) => {
      const { objects } = get()
      const objA = objects.find(o => o.id === idA)
      const id = genId()
      const label = operation === 'subtract' ? 'Subtract' : operation === 'union' ? 'Union' : 'Intersect'
      set(s => ({
        objects: [
          ...s.objects.filter(o => o.id !== idA && o.id !== idB),
          {
            ...OBJECT_DEFAULTS, id,
            name: `CSG ${label}`,
            type: 'csg' as const,
            position: objA?.position ?? ([0, 0, 0] as [number, number, number]),
            rotation: [0, 0, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number],
            color,
            roughness: 0.4,
            metalness: 0.1,
            csgGeometryData: geoData,
          },
        ],
        selectedId: id,
        selectedIds: [id],
      }))
      persist(snap())
    },

    moveObject: (id, direction) => {
      const { objects } = get()
      const idx = objects.findIndex(o => o.id === id)
      if (idx < 0) return
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= objects.length) return
      const next = [...objects]
      const [obj] = next.splice(idx, 1)
      next.splice(newIdx, 0, obj)
      set({ objects: next })
      persist(snap())
    },

    clearScene: () => {
      set({ objects: [], selectedId: null, selectedIds: [], paintObjectId: null })
      persist(snap())
    },

    setPaintObjectId: (id) => set({ paintObjectId: id }),
    setPaintBrushColor: (v) => set({ paintBrushColor: v }),
    setPaintBrushSize: (v) => set({ paintBrushSize: v }),

    // ── Scene actions ─────────────────────────────────────────────────────────────

    setTransformMode: (mode) => set({ transformMode: mode }),

    setAmbientIntensity: (v) => { set({ ambientIntensity: v }); persist(snap()) },
    setDirectionalIntensity: (v) => { set({ directionalIntensity: v }); persist(snap()) },
    setDirectionalPosition: (pos) => { set({ directionalPosition: pos }); persist(snap()) },
    setEnvironment: (env) => {
      const skyMap = ENV_SKY_MAP[env]
      if (skyMap) {
        set({
          environment: env, skyEnabled: true, skyPreset: skyMap.preset,
          skyTurbidity: skyMap.turbidity, skyRayleigh: skyMap.rayleigh,
          skyInclination: skyMap.inclination, skyAzimuth: skyMap.azimuth,
        })
      } else {
        set({ environment: env })
      }
      persist(snap())
    },
    setBackground: (color) => { set({ background: color }); persist(snap()) },

    toggleGrid: () => { set(s => ({ showGrid: !s.showGrid })); persist(snap()) },
    toggleAxes: () => { set(s => ({ showAxes: !s.showAxes })); persist(snap()) },
    toggleStats: () => set(s => ({ showStats: !s.showStats })),

    setIsRecording: (v) => set({ isRecording: v }),
    setRecordingDuration: (v) => set({ recordingDuration: v }),

    updateViewportCamera: (position, target, fov) =>
      set({ viewportCamera: { position, target, fov } }),

    setSkyEnabled: (v) => { set({ skyEnabled: v }); persist(snap()) },
    setSkyPreset: (preset) => {
      if (preset === 'custom') { set({ skyPreset: 'custom', skyEnabled: true }); persist(snap()); return }
      const params = SKY_PRESET_PARAMS[preset]
      set({ skyPreset: preset, skyEnabled: true, ...params })
      persist(snap())
    },
    setSkyParams: (p) => { set({ ...p, skyPreset: 'custom' }); persist(snap()) },

    // ── Animation actions ─────────────────────────────────────────────────────────

    addClip: () => {
      const { clips } = get()
      const id = genClipId()
      set({ clips: [...clips, { id, name: `Clip ${clips.length + 1}`, duration: 5, loop: false, tracks: [] }], activeClipId: id, showTimeline: true })
      persist(snap())
    },

    removeClip: (id) => {
      set(s => {
        const clips = s.clips.filter(c => c.id !== id)
        return { clips, activeClipId: s.activeClipId === id ? (clips[0]?.id ?? null) : s.activeClipId }
      })
      persist(snap())
    },

    duplicateClip: (id) => {
      const src = get().clips.find(c => c.id === id)
      if (!src) return
      const newId = genClipId()
      set(s => ({ clips: [...s.clips, { ...src, id: newId, name: src.name + ' Copy' }], activeClipId: newId }))
      persist(snap())
    },

    updateClip: (id, updates) => {
      set(s => ({ clips: s.clips.map(c => c.id === id ? { ...c, ...updates } : c) }))
      persist(snap())
    },

    setActiveClip: (id) => { set({ activeClipId: id }); persist(snap()) },

    captureKeyframe: (objectId) => {
      const { activeClipId, clips, currentTime, objects } = get()
      if (!activeClipId) return
      const obj = objects.find(o => o.id === objectId)
      if (!obj) return

      const kf: Keyframe = {
        id: genKfId(),
        time: parseFloat(currentTime.toFixed(3)),
        position: [...obj.position] as [number, number, number],
        rotation: [...obj.rotation] as [number, number, number],
        scale: [...obj.scale] as [number, number, number],
        easing: 'ease-in-out',
      }

      set(s => {
        const clipIdx = s.clips.findIndex(c => c.id === activeClipId)
        if (clipIdx < 0) return s
        const clip = s.clips[clipIdx]
        const trackIdx = clip.tracks.findIndex(t => t.objectId === objectId)

        let newTracks: AnimationTrack[]
        if (trackIdx >= 0) {
          const track = clip.tracks[trackIdx]
          const existingIdx = track.keyframes.findIndex(k => Math.abs(k.time - currentTime) < 0.05)
          const newKfs = existingIdx >= 0
            ? track.keyframes.map((k, i) => i === existingIdx ? kf : k)
            : [...track.keyframes, kf]
          newTracks = clip.tracks.map((t, i) => i === trackIdx ? { ...t, keyframes: newKfs } : t)
        } else {
          newTracks = [...clip.tracks, { objectId, keyframes: [kf] }]
        }

        return { clips: s.clips.map((c, i) => i === clipIdx ? { ...c, tracks: newTracks } : c) }
      })
      persist(snap())
    },

    captureCameraKeyframe: () => {
      const { activeClipId, clips, currentTime, viewportCamera } = get()
      if (!activeClipId) return

      const kf: CameraKeyframe = {
        id: genKfId(),
        time: parseFloat(currentTime.toFixed(3)),
        position: [...viewportCamera.position] as [number, number, number],
        target:   [...viewportCamera.target]   as [number, number, number],
        fov:      viewportCamera.fov,
        easing: 'ease-in-out',
      }

      set(s => {
        const clipIdx = s.clips.findIndex(c => c.id === activeClipId)
        if (clipIdx < 0) return s
        const clip = s.clips[clipIdx]
        const existing = clip.cameraTrack ?? []
        const existingIdx = existing.findIndex(k => Math.abs(k.time - currentTime) < 0.05)
        const newTrack = existingIdx >= 0
          ? existing.map((k, i) => i === existingIdx ? kf : k)
          : [...existing, kf]
        return { clips: s.clips.map((c, i) => i === clipIdx ? { ...c, cameraTrack: newTrack } : c) }
      })
      persist(snap())
    },

    removeCameraKeyframe: (clipId, kfId) => {
      set(s => ({
        clips: s.clips.map(c => c.id !== clipId ? c : {
          ...c, cameraTrack: (c.cameraTrack ?? []).filter(k => k.id !== kfId),
        }),
      }))
      persist(snap())
    },

    setCameraKeyframeEasing: (clipId, kfId, easing) => {
      set(s => ({
        clips: s.clips.map(c => c.id !== clipId ? c : {
          ...c, cameraTrack: (c.cameraTrack ?? []).map(k => k.id === kfId ? { ...k, easing } : k),
        }),
      }))
      persist(snap())
    },

    clearCameraTrack: (clipId) => {
      set(s => ({
        clips: s.clips.map(c => c.id !== clipId ? c : { ...c, cameraTrack: [] }),
      }))
      persist(snap())
    },

    removeKeyframe: (clipId, objectId, kfId) => {
      set(s => ({
        clips: s.clips.map(c => c.id !== clipId ? c : {
          ...c,
          tracks: c.tracks.map(t => t.objectId !== objectId ? t : {
            ...t, keyframes: t.keyframes.filter(k => k.id !== kfId),
          }).filter(t => t.keyframes.length > 0),
        }),
      }))
      persist(snap())
    },

    removeTrack: (clipId, objectId) => {
      set(s => ({
        clips: s.clips.map(c => c.id !== clipId ? c : {
          ...c, tracks: c.tracks.filter(t => t.objectId !== objectId),
        }),
      }))
      persist(snap())
    },

    setKeyframeEasing: (clipId, objectId, kfId, easing) => {
      set(s => ({
        clips: s.clips.map(c => c.id !== clipId ? c : {
          ...c,
          tracks: c.tracks.map(t => t.objectId !== objectId ? t : {
            ...t, keyframes: t.keyframes.map(k => k.id === kfId ? { ...k, easing } : k),
          }),
        }),
      }))
      persist(snap())
    },

    setIsPlaying: (v) => set({ isPlaying: v }),
    stopAnimation: () => set({ isPlaying: false, currentTime: 0 }),
    setCurrentTime: (t) => set({ currentTime: t }),

    toggleSequenceMode: () => {
      set(s => ({ sequenceMode: !s.sequenceMode }))
      persist(snap())
    },

    toggleTimeline: () => {
      set(s => ({ showTimeline: !s.showTimeline }))
      persist(snap())
    },

    // ── Templates ─────────────────────────────────────────────────────────────────

    loadTemplate: (template) => {
      set({
        objects: template.objects,
        clips: template.clips,
        activeClipId: template.clips[0]?.id ?? null,
        showTimeline: template.clips.length > 0,
        background: template.settings.background,
        environment: template.settings.environment,
        ambientIntensity: template.settings.ambientIntensity,
        directionalIntensity: template.settings.directionalIntensity,
        directionalPosition: template.settings.directionalPosition,
        showGrid: template.settings.showGrid,
        selectedId: null,
        selectedIds: [],
        paintObjectId: null,
        isPlaying: false,
        currentTime: 0,
        sequenceMode: false,
      })
      persist(snap())
    },

    clearStorage: () => {
      if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    },
  }
})
