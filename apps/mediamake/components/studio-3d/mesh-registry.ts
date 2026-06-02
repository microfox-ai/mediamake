import * as THREE from 'three'

/**
 * Plain-JS registry of `objectId → Object3D` so animation playback can write
 * transforms directly to Three.js meshes without going through Zustand and
 * triggering React re-renders for every keyframe sample.
 *
 * The bottleneck this solves:
 *   AnimationPlayer used to call `useSceneStore.getState().updateObject(id, {position, rotation, scale})`
 *   once per track per frame. On a scene with 200+ animated objects that's 200+
 *   store updates per frame, each fanning out to every subscriber. The fix is
 *   to write `mesh.position.set(...)` directly during playback; the store only
 *   matters when the user is editing.
 */

interface MeshEntry {
  mesh: THREE.Object3D
  /** Curve for path-following objects, if any. */
  pathCurve?: THREE.CatmullRomCurve3 | null
  /**
   * Transient pathProgress override set during animation playback (or offline
   * render). When non-null it takes precedence over `object.pathProgress` so the
   * scene reflects the interpolated playback state without going through Zustand.
   * SceneObjectMesh's path useFrame consults this field.
   */
  transientPathProgress?: number | null
}

const entries = new Map<string, MeshEntry>()

export const meshRegistry = {
  register(id: string, mesh: THREE.Object3D) {
    const prev = entries.get(id)
    entries.set(id, { mesh, pathCurve: prev?.pathCurve ?? null })
  },

  unregister(id: string, mesh?: THREE.Object3D) {
    // Only unregister if the mesh matches (avoid stomping on a remount race).
    const prev = entries.get(id)
    if (!prev) return
    if (mesh && prev.mesh !== mesh) return
    entries.delete(id)
  },

  setPathCurve(id: string, curve: THREE.CatmullRomCurve3 | null) {
    const prev = entries.get(id)
    if (prev) prev.pathCurve = curve
  },

  setTransientPathProgress(id: string, value: number | null) {
    const prev = entries.get(id)
    if (prev) prev.transientPathProgress = value
  },

  get(id: string): THREE.Object3D | undefined {
    return entries.get(id)?.mesh
  },

  getEntry(id: string): MeshEntry | undefined {
    return entries.get(id)
  },

  all(): Iterable<[string, MeshEntry]> {
    return entries.entries()
  },

  size(): number {
    return entries.size
  },
}
