import { create } from 'zustand'
import type {
  SceneObject, TransformMode, EnvironmentPreset, ObjectType,
  AnimationClip, AnimationTrack, Keyframe, EasingType, CameraKeyframe,
  ClipMarker, CurveChannel,
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

// ─── Undo / Redo ─────────────────────────────────────────────────────────────

type UndoEntry = { objects: SceneObject[]; clips: AnimationClip[]; activeClipId: string | null }

// ─── Scene save slots ─────────────────────────────────────────────────────────

export type SceneSlot = { id: string; name: string; timestamp: number; snapshot: Snapshot }
const SLOTS_KEY = 'mediamake_scene_slots_v1'
function loadSlots(): SceneSlot[] {
  if (typeof window === 'undefined') return []
  try { const r = localStorage.getItem(SLOTS_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
}
function persistSlots(slots: SceneSlot[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(SLOTS_KEY, JSON.stringify(slots)) } catch { }
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
  autoKeyframe: boolean
  snapEnabled: boolean
  snapTranslate: number
  snapRotate: number
  snapScale: number
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
      autoKeyframe: (saved as any).autoKeyframe ?? false,
      skyTurbidity: saved.skyTurbidity ?? 10,
      skyRayleigh: saved.skyRayleigh ?? 3,
      skyInclination: saved.skyInclination ?? 0.49,
      skyAzimuth: saved.skyAzimuth ?? 0.25,
      snapEnabled: (saved as any).snapEnabled ?? false,
      snapTranslate: (saved as any).snapTranslate ?? 0.25,
      snapRotate: (saved as any).snapRotate ?? 0.2618,
      snapScale: (saved as any).snapScale ?? 0.1,
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
    autoKeyframe: false,
    skyTurbidity: 10,
    skyRayleigh: 3,
    skyInclination: 0.49,
    skyAzimuth: 0.25,
    snapEnabled: false,
    snapTranslate: 0.25,
    snapRotate: 0.2618,
    snapScale: 0.1,
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

  autoKeyframe: boolean

  // Undo / Redo (non-persisted)
  undoStack: UndoEntry[]
  redoStack: UndoEntry[]

  // Snap
  snapEnabled: boolean
  snapTranslate: number
  snapRotate: number
  snapScale: number

  // Focus (non-persisted counter)
  focusRequest: number

  // Scene save slots (non-persisted in main state)
  savedSlots: SceneSlot[]

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

  pushUndo: () => void
  undo: () => void
  redo: () => void

  toggleSnap: () => void
  setSnapTranslate: (v: number) => void
  setSnapRotate: (v: number) => void
  setSnapScale: (v: number) => void

  triggerFocus: () => void

  saveSceneSlot: (name: string) => void
  loadSceneSlot: (id: string) => void
  deleteSceneSlot: (id: string) => void
  importSceneJSON: (json: string) => string | null

  reparentObject: (objectId: string, newParentId: string | null) => void

  toggleAutoKeyframe: () => void
  setKeyframeValue: (clipId: string, objectId: string, kfId: string, channel: CurveChannel, value: number) => void
  addClipMarker: (clipId: string, time: number) => void
  updateClipMarker: (clipId: string, markerId: string, updates: Partial<Pick<ClipMarker, 'label' | 'time' | 'color'>>) => void
  removeClipMarker: (clipId: string, markerId: string) => void
  applyRigPreset: (preset: 'handheld' | 'dolly-zoom' | 'orbit') => void

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
      skyAzimuth: s.skyAzimuth, autoKeyframe: s.autoKeyframe,
      snapEnabled: s.snapEnabled, snapTranslate: s.snapTranslate,
      snapRotate: s.snapRotate, snapScale: s.snapScale,
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
    autoKeyframe: init.autoKeyframe,
    undoStack: [],
    redoStack: [],
    snapEnabled: init.snapEnabled,
    snapTranslate: init.snapTranslate,
    snapRotate: init.snapRotate,
    snapScale: init.snapScale,
    focusRequest: 0,
    savedSlots: loadSlots(),
    skyEnabled: init.skyEnabled,
    skyPreset: init.skyPreset,
    skyTurbidity: init.skyTurbidity,
    skyRayleigh: init.skyRayleigh,
    skyInclination: init.skyInclination,
    skyAzimuth: init.skyAzimuth,

    // ── Object actions ────────────────────────────────────────────────────────────

    addObject: (type) => {
      get().pushUndo()
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
      get().pushUndo()
      const { objects } = get()
      const id = genId()
      set({
        objects: [...objects, { ...OBJECT_DEFAULTS, id, name, type: 'gltf' as const, url, cacheKey, position: [0, 0, 0] as [number, number, number] }],
        selectedId: id, selectedIds: [id],
      })
      persist(snap())
    },

    addModelObject: (url, name, type, cacheKey) => {
      get().pushUndo()
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
      get().pushUndo()
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
      get().pushUndo()
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

    updateObject: (id, updates) => {
      set(s => ({ objects: s.objects.map(o => o.id === id ? { ...o, ...updates } : o) }))
      const s = get()
      if (s.autoKeyframe && s.activeClipId && !s.isPlaying && (updates.position || updates.rotation || updates.scale || updates.pathProgress !== undefined)) {
        get().captureKeyframe(id)
      }
    },

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
      get().pushUndo()
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
      get().pushUndo()
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

    // ── Undo / Redo ───────────────────────────────────────────────────────────────

    pushUndo: () => {
      const { objects, clips, activeClipId, undoStack } = get()
      set({ undoStack: [...undoStack.slice(-49), { objects, clips, activeClipId }], redoStack: [] })
    },

    undo: () => {
      const { undoStack, objects, clips, activeClipId } = get()
      if (undoStack.length === 0) return
      const prev = undoStack[undoStack.length - 1]
      set(s => ({
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack.slice(-49), { objects, clips, activeClipId }],
        objects: prev.objects, clips: prev.clips, activeClipId: prev.activeClipId,
        selectedId: null, selectedIds: [],
      }))
      persist(snap())
    },

    redo: () => {
      const { redoStack, objects, clips, activeClipId } = get()
      if (redoStack.length === 0) return
      const next = redoStack[redoStack.length - 1]
      set(s => ({
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack.slice(-49), { objects, clips, activeClipId }],
        objects: next.objects, clips: next.clips, activeClipId: next.activeClipId,
        selectedId: null, selectedIds: [],
      }))
      persist(snap())
    },

    // ── Snap ─────────────────────────────────────────────────────────────────────

    toggleSnap: () => { set(s => ({ snapEnabled: !s.snapEnabled })); persist(snap()) },
    setSnapTranslate: (v) => { set({ snapTranslate: v }); persist(snap()) },
    setSnapRotate: (v) => { set({ snapRotate: v }); persist(snap()) },
    setSnapScale: (v) => { set({ snapScale: v }); persist(snap()) },

    // ── Focus ─────────────────────────────────────────────────────────────────────

    triggerFocus: () => set(s => ({ focusRequest: s.focusRequest + 1 })),

    // ── Scene slots ───────────────────────────────────────────────────────────────

    saveSceneSlot: (name) => {
      const slot: SceneSlot = { id: `slot_${Date.now()}`, name, timestamp: Date.now(), snapshot: snap() }
      set(s => {
        const slots = [...s.savedSlots, slot]
        persistSlots(slots)
        return { savedSlots: slots }
      })
    },

    loadSceneSlot: (id) => {
      const { savedSlots } = get()
      const slot = savedSlots.find(s => s.id === id)
      if (!slot) return
      get().pushUndo()
      const s = slot.snapshot
      set({
        objects: s.objects ?? [], clips: s.clips ?? [], activeClipId: s.activeClipId ?? null,
        background: s.background, environment: s.environment,
        ambientIntensity: s.ambientIntensity, directionalIntensity: s.directionalIntensity,
        directionalPosition: s.directionalPosition, showGrid: s.showGrid, showAxes: s.showAxes,
        skyEnabled: s.skyEnabled ?? false, skyPreset: s.skyPreset ?? 'sunny',
        skyTurbidity: s.skyTurbidity ?? 10, skyRayleigh: s.skyRayleigh ?? 3,
        skyInclination: s.skyInclination ?? 0.49, skyAzimuth: s.skyAzimuth ?? 0.25,
        selectedId: null, selectedIds: [], isPlaying: false, currentTime: 0,
      })
      persist(snap())
    },

    deleteSceneSlot: (id) => {
      set(s => {
        const slots = s.savedSlots.filter(x => x.id !== id)
        persistSlots(slots)
        return { savedSlots: slots }
      })
    },

    importSceneJSON: (json) => {
      try {
        const parsed = JSON.parse(json) as Partial<Snapshot>
        if (!Array.isArray(parsed.objects)) return 'Invalid JSON: missing objects array'
        get().pushUndo()
        set({
          objects: parsed.objects, clips: parsed.clips ?? [],
          activeClipId: parsed.activeClipId ?? null,
          background: parsed.background ?? '#1a1a2e',
          environment: parsed.environment ?? 'none',
          ambientIntensity: parsed.ambientIntensity ?? 0.5,
          directionalIntensity: parsed.directionalIntensity ?? 1.5,
          directionalPosition: parsed.directionalPosition ?? [5, 10, 5],
          showGrid: parsed.showGrid ?? true, showAxes: parsed.showAxes ?? false,
          skyEnabled: parsed.skyEnabled ?? false,
          selectedId: null, selectedIds: [], isPlaying: false, currentTime: 0,
        })
        persist(snap())
        return null
      } catch (e) { return String(e) }
    },

    // ── Hierarchy ─────────────────────────────────────────────────────────────────

    reparentObject: (objectId, newParentId) => {
      set(s => ({
        objects: s.objects.map(o => o.id === objectId ? { ...o, groupId: newParentId ?? undefined } : o),
      }))
      persist(snap())
    },

    toggleAutoKeyframe: () => { set(s => ({ autoKeyframe: !s.autoKeyframe })); persist(snap()) },

    setKeyframeValue: (clipId, objectId, kfId, channel, value) => {
      set(s => {
        const ci = s.clips.findIndex(c => c.id === clipId)
        if (ci < 0) return s
        const ti = s.clips[ci].tracks.findIndex(t => t.objectId === objectId)
        if (ti < 0) return s
        const ki = s.clips[ci].tracks[ti].keyframes.findIndex(k => k.id === kfId)
        if (ki < 0) return s
        const kf = s.clips[ci].tracks[ti].keyframes[ki]
        let newKf: Keyframe
        if (channel === 'pathProgress') {
          newKf = { ...kf, pathProgress: value }
        } else {
          const [prop, ax] = channel.split('.') as ['position' | 'rotation' | 'scale', 'x' | 'y' | 'z']
          const ai = ax === 'x' ? 0 : ax === 'y' ? 1 : 2
          const arr = [...(kf[prop] ?? [0, 0, 0])] as [number, number, number]
          arr[ai] = value
          newKf = { ...kf, [prop]: arr }
        }
        const newClips = s.clips.map((c, ci2) => ci2 !== ci ? c : {
          ...c, tracks: c.tracks.map((t, ti2) => ti2 !== ti ? t : {
            ...t, keyframes: t.keyframes.map((k, ki2) => ki2 !== ki ? k : newKf),
          }),
        })
        return { clips: newClips }
      })
      persist(snap())
    },

    addClipMarker: (clipId, time) => {
      const id = genKfId()
      const COLORS = ['#f87171','#fb923c','#facc15','#4ade80','#60a5fa','#a78bfa','#f472b6']
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      set(s => ({
        clips: s.clips.map(c => c.id !== clipId ? c : {
          ...c, markers: [...(c.markers ?? []), { id, time: parseFloat(time.toFixed(3)), label: 'Marker', color }],
        }),
      }))
      persist(snap())
    },

    updateClipMarker: (clipId, markerId, updates) => {
      set(s => ({
        clips: s.clips.map(c => c.id !== clipId ? c : {
          ...c, markers: (c.markers ?? []).map(m => m.id !== markerId ? m : { ...m, ...updates }),
        }),
      }))
      persist(snap())
    },

    removeClipMarker: (clipId, markerId) => {
      set(s => ({
        clips: s.clips.map(c => c.id !== clipId ? c : {
          ...c, markers: (c.markers ?? []).filter(m => m.id !== markerId),
        }),
      }))
      persist(snap())
    },

    applyRigPreset: (preset) => {
      const s = get()
      if (!s.activeClipId) return
      const clip = s.clips.find(c => c.id === s.activeClipId)
      if (!clip) return
      const { position, target, fov } = s.viewportCamera
      const steps = preset === 'handheld' ? Math.ceil(clip.duration * 8) : 30
      const keyframes: CameraKeyframe[] = []

      if (preset === 'handheld') {
        const interval = clip.duration / steps
        for (let i = 0; i <= steps; i++) {
          const shake = 0.06
          keyframes.push({
            id: genKfId(), time: parseFloat((i * interval).toFixed(3)),
            position: [
              position[0] + (Math.random() - 0.5) * shake * 2,
              position[1] + (Math.random() - 0.5) * shake,
              position[2] + (Math.random() - 0.5) * shake * 2,
            ],
            target: [
              target[0] + (Math.random() - 0.5) * shake * 0.3,
              target[1] + (Math.random() - 0.5) * shake * 0.3,
              target[2] + (Math.random() - 0.5) * shake * 0.3,
            ],
            fov: fov + (Math.random() - 0.5) * 2,
            easing: 'linear',
          })
        }
      } else if (preset === 'dolly-zoom') {
        const dx = position[0] - target[0], dy = position[1] - target[1], dz = position[2] - target[2]
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
        const endDist = dist * 0.3
        const endFov  = Math.min(110, fov * (dist / endDist))
        const dirN    = [dx / dist, dy / dist, dz / dist]
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const d = dist + (endDist - dist) * t
          keyframes.push({
            id: genKfId(), time: parseFloat((t * clip.duration).toFixed(3)),
            position: [target[0] + dirN[0]*d, target[1] + dirN[1]*d, target[2] + dirN[2]*d],
            target, fov: fov + (endFov - fov) * t, easing: 'ease-in-out',
          })
        }
      } else { // orbit
        const dx = position[0] - target[0], dz = position[2] - target[2]
        const radius = Math.sqrt(dx*dx + dz*dz)
        const startAngle = Math.atan2(dz, dx)
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const angle = startAngle + t * Math.PI * 2
          keyframes.push({
            id: genKfId(), time: parseFloat((t * clip.duration).toFixed(3)),
            position: [target[0] + Math.cos(angle)*radius, position[1], target[2] + Math.sin(angle)*radius],
            target, fov, easing: 'linear',
          })
        }
      }

      set(s => ({
        clips: s.clips.map(c => c.id !== s.activeClipId ? c : { ...c, cameraTrack: keyframes }),
      }))
      persist(snap())
    },

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
      get().pushUndo()
      const s = template.settings
      set({
        objects: template.objects,
        clips: template.clips,
        activeClipId: template.clips[0]?.id ?? null,
        showTimeline: template.clips.length > 0,
        background: s.background,
        environment: s.environment,
        ambientIntensity: s.ambientIntensity,
        directionalIntensity: s.directionalIntensity,
        directionalPosition: s.directionalPosition,
        showGrid: s.showGrid,
        ...(s.skyEnabled !== undefined ? { skyEnabled: s.skyEnabled } : {}),
        ...(s.skyPreset ? { skyPreset: s.skyPreset } : {}),
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
