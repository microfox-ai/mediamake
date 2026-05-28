"use client"

import { useRef, useState, useCallback, useEffect, useMemo, Suspense, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { useThree, useLoader, useFrame } from '@react-three/fiber'
import { TransformControls, Text3D, Center, CatmullRomLine, Html } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { SceneObject, TransformMode } from './types'
import { PRIMITIVE_TYPES } from './types'
import { useSceneStore } from './scene-store'
import { gltfFileCache } from './gltf-cache'
import { meshRegistry } from './mesh-registry'
import {
  getOrCreatePaintCanvas, getOrCreatePaintTexture,
  generateProceduralTexture,
} from './paint-canvas'

// Default CDN font for Text3D (helvetiker from three.js examples)
const DEFAULT_FONT_URL =
  'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/fonts/helvetiker_regular.typeface.json'

interface SceneObjectMeshProps {
  object: SceneObject
  isSelected: boolean
  transformMode: TransformMode
}

// ─── Primitive geometry ───────────────────────────────────────────────────────

function ObjectGeometry({ type }: { type: SceneObject['type'] }) {
  switch (type) {
    case 'box':         return <boxGeometry args={[1, 1, 1]} />
    case 'sphere':      return <sphereGeometry args={[0.5, 32, 32]} />
    case 'cylinder':    return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
    case 'torus':       return <torusGeometry args={[0.4, 0.18, 16, 64]} />
    case 'cone':        return <coneGeometry args={[0.5, 1, 32]} />
    case 'plane':       return <planeGeometry args={[1, 1]} />
    case 'ring':        return <ringGeometry args={[0.25, 0.5, 32]} />
    case 'icosahedron': return <icosahedronGeometry args={[0.5, 0]} />
    case 'dodecahedron':return <dodecahedronGeometry args={[0.5, 0]} />
    case 'torusKnot':   return <torusKnotGeometry args={[0.3, 0.1, 128, 16]} />
    default:            return <boxGeometry args={[1, 1, 1]} />
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function makeUrlModifierFn(fileMap: Map<string, string>) {
  return (rawUrl: string) => {
    const filename = rawUrl.split(/[/\\]/).pop() ?? rawUrl
    if (fileMap.has(filename)) return fileMap.get(filename)!
    for (const [key, blobUrl] of fileMap) {
      if (rawUrl.endsWith(key) || rawUrl.includes(key)) return blobUrl
    }
    return rawUrl
  }
}

function applyCustomTexture(root: THREE.Object3D, textureUrl: string, invalidate: () => void) {
  const loader = new THREE.TextureLoader()
  loader.load(textureUrl, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace
    root.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach(mat => {
          ;(mat as THREE.MeshStandardMaterial).map = tex
          mat.needsUpdate = true
        })
      }
    })
    invalidate()
  })
}

// ─── GLTF error boundary ──────────────────────────────────────────────────────

class GltfErrorBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(err: Error, _info: ErrorInfo) {
    console.warn(
      `[3D Studio] Could not load model "${this.props.name}": ${err.message}\n` +
      'If the model uses external files (.bin / textures), select the .gltf AND all\n' +
      'its companion files together in the picker, or export as a self-contained .glb.'
    )
  }

  render() {
    if (this.state.failed) {
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ef4444" wireframe />
        </mesh>
      )
    }
    return this.props.children
  }
}

function suppressGltfAssetErrors(loader: GLTFLoader) {
  const original = console.error
  let restored = false
  const restore = () => { if (!restored) { restored = true; console.error = original } }
  console.error = (...args: any[]) => {
    const first = args[0]
    if (first instanceof ProgressEvent) return
    if (typeof first === 'string' && first.includes('THREE.')) return
    original(...args)
  }
  loader.manager.onLoad  = restore
  loader.manager.onError = (failedUrl: string) => {
    console.warn(`[3D Studio] Skipped missing asset: ${failedUrl}`)
    restore()
  }
}

// ─── GLTF loader ─────────────────────────────────────────────────────────────

function GltfInner({ url, castShadow, receiveShadow, cacheKey, customTexture,
  gltfAnimationIndex, gltfAnimationPlay, gltfAnimationSpeed, morphInfluences, onMetaReady,
}: {
  url: string; castShadow: boolean; receiveShadow: boolean; cacheKey?: string; customTexture?: string
  gltfAnimationIndex?: number; gltfAnimationPlay?: boolean; gltfAnimationSpeed?: number
  morphInfluences?: Record<string, number>
  onMetaReady?: (animationNames: string[], morphTargetNames: string[]) => void
}) {
  const { invalidate } = useThree()
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    suppressGltfAssetErrors(loader)
    const fileMap = cacheKey ? gltfFileCache.get(cacheKey) : undefined
    if (fileMap) loader.manager.setURLModifier(makeUrlModifierFn(fileMap))
  })

  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  // Init AnimationMixer
  useEffect(() => {
    const mixer = new THREE.AnimationMixer(gltf.scene)
    mixerRef.current = mixer
    return () => { mixer.stopAllAction(); mixerRef.current = null }
  }, [gltf.scene])

  // Report animation names + morph target names to parent (once per GLTF load)
  useEffect(() => {
    if (!onMetaReady) return
    const animNames = gltf.animations.map(a => a.name)
    const morphSet = new Set<string>()
    gltf.scene.traverse(node => {
      const m = node as THREE.Mesh
      if (m.isMesh && m.morphTargetDictionary) Object.keys(m.morphTargetDictionary).forEach(n => morphSet.add(n))
    })
    onMetaReady(animNames, [...morphSet])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf])

  // Animation playback control
  useEffect(() => {
    const mixer = mixerRef.current
    if (!mixer) return
    mixer.stopAllAction()
    if (gltfAnimationPlay && gltf.animations.length > 0) {
      const idx = Math.min(gltfAnimationIndex ?? 0, gltf.animations.length - 1)
      const action = mixer.clipAction(gltf.animations[idx])
      action.timeScale = gltfAnimationSpeed ?? 1
      action.play()
    }
  }, [gltf, gltfAnimationIndex, gltfAnimationPlay, gltfAnimationSpeed])

  // Apply morph target influences
  useEffect(() => {
    if (!morphInfluences) return
    gltf.scene.traverse(node => {
      const m = node as THREE.Mesh
      if (!m.isMesh || !m.morphTargetDictionary || !m.morphTargetInfluences) return
      for (const [name, value] of Object.entries(morphInfluences)) {
        const idx = m.morphTargetDictionary[name]
        if (idx !== undefined) m.morphTargetInfluences[idx] = value
      }
    })
  }, [gltf, morphInfluences])

  // Update mixer every frame
  useFrame((_, delta) => {
    if (mixerRef.current && gltfAnimationPlay) mixerRef.current.update(delta)
  })

  useEffect(() => {
    gltf.scene.traverse((node: THREE.Object3D) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh
        mesh.castShadow = castShadow
        mesh.receiveShadow = receiveShadow
      }
    })
  }, [gltf, castShadow, receiveShadow])

  useEffect(() => {
    if (!customTexture) return
    applyCustomTexture(gltf.scene, customTexture, invalidate)
  }, [gltf, customTexture, invalidate])

  return <primitive object={gltf.scene} />
}

// ─── OBJ loader ──────────────────────────────────────────────────────────────

function ObjInner({ url, castShadow, receiveShadow, cacheKey, customTexture }: {
  url: string; castShadow: boolean; receiveShadow: boolean; cacheKey?: string; customTexture?: string
}) {
  const { invalidate } = useThree()
  const [object, setObject] = useState<THREE.Group | null>(null)

  useEffect(() => {
    const fileMap = cacheKey ? gltfFileCache.get(cacheKey) : undefined
    const makeUrlModifier = (manager: THREE.LoadingManager) => {
      if (!fileMap) return
      manager.setURLModifier(makeUrlModifierFn(fileMap))
    }

    let mtlUrl: string | undefined
    if (fileMap) {
      for (const [key, blobUrl] of fileMap) {
        if (key.endsWith('.mtl')) { mtlUrl = blobUrl; break }
      }
    }

    const loadObj = (materials?: any) => {
      const manager = new THREE.LoadingManager()
      makeUrlModifier(manager)
      const loader = new OBJLoader(manager)
      if (materials) loader.setMaterials(materials)
      loader.load(url, (group) => {
        group.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh
            mesh.castShadow = castShadow
            mesh.receiveShadow = receiveShadow
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            mats.forEach(mat => {
              const m = mat as THREE.MeshStandardMaterial
              if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
              if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace
            })
          }
        })
        setObject(group)
      })
    }

    if (mtlUrl) {
      const manager = new THREE.LoadingManager()
      makeUrlModifier(manager)
      const mtlLoader = new MTLLoader(manager)
      mtlLoader.load(mtlUrl, (materials) => {
        materials.preload()
        loadObj(materials)
      }, undefined, () => loadObj())
    } else {
      loadObj()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, cacheKey])

  useEffect(() => {
    object?.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh
        mesh.castShadow = castShadow
        mesh.receiveShadow = receiveShadow
      }
    })
  }, [object, castShadow, receiveShadow])

  useEffect(() => {
    if (!object || !customTexture) return
    applyCustomTexture(object, customTexture, invalidate)
  }, [object, customTexture, invalidate])

  if (!object) return null
  return <primitive object={object} />
}

// ─── FBX loader ──────────────────────────────────────────────────────────────

function FbxInner({ url, castShadow, receiveShadow, cacheKey, customTexture,
  gltfAnimationIndex, gltfAnimationPlay, gltfAnimationSpeed, onMetaReady,
}: {
  url: string; castShadow: boolean; receiveShadow: boolean; cacheKey?: string; customTexture?: string
  gltfAnimationIndex?: number; gltfAnimationPlay?: boolean; gltfAnimationSpeed?: number
  onMetaReady?: (animationNames: string[], morphTargetNames: string[]) => void
}) {
  const { invalidate } = useThree()
  const fbx = useLoader(FBXLoader, url, (loader) => {
    const fileMap = cacheKey ? gltfFileCache.get(cacheKey) : undefined
    if (fileMap) loader.manager.setURLModifier(makeUrlModifierFn(fileMap))
  })

  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  useEffect(() => {
    fbx.traverse((node: THREE.Object3D) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh
        mesh.castShadow = castShadow
        mesh.receiveShadow = receiveShadow
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach(mat => {
          const m = mat as THREE.MeshStandardMaterial
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
          if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace
        })
      }
    })
    const box = new THREE.Box3().setFromObject(fbx)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 50) fbx.scale.setScalar(0.01)
  }, [fbx, castShadow, receiveShadow])

  // Init AnimationMixer
  useEffect(() => {
    const mixer = new THREE.AnimationMixer(fbx)
    mixerRef.current = mixer
    return () => { mixer.stopAllAction(); mixerRef.current = null }
  }, [fbx])

  // Report animation names to parent
  useEffect(() => {
    if (!onMetaReady) return
    onMetaReady(fbx.animations.map(a => a.name), [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbx])

  // Animation playback control
  useEffect(() => {
    const mixer = mixerRef.current
    if (!mixer) return
    mixer.stopAllAction()
    if (gltfAnimationPlay && fbx.animations.length > 0) {
      const idx = Math.min(gltfAnimationIndex ?? 0, fbx.animations.length - 1)
      const action = mixer.clipAction(fbx.animations[idx])
      action.timeScale = gltfAnimationSpeed ?? 1
      action.play()
    }
  }, [fbx, gltfAnimationIndex, gltfAnimationPlay, gltfAnimationSpeed])

  useFrame((_, delta) => {
    if (mixerRef.current && gltfAnimationPlay) mixerRef.current.update(delta)
  })

  useEffect(() => {
    if (!customTexture) return
    applyCustomTexture(fbx, customTexture, invalidate)
  }, [fbx, customTexture, invalidate])

  return <primitive object={fbx} />
}

// ─── STL loader ──────────────────────────────────────────────────────────────

function StlInner({ url, castShadow, receiveShadow, color, customTexture }: {
  url: string; castShadow: boolean; receiveShadow: boolean; color: string; customTexture?: string
}) {
  const [customTex, setCustomTex] = useState<THREE.Texture | null>(null)
  const geo = useLoader(STLLoader, url)

  useEffect(() => {
    if (!geo.attributes.normal) geo.computeVertexNormals()
  }, [geo])

  useEffect(() => {
    if (!customTexture) { setCustomTex(null); return }
    let cancelled = false
    new THREE.TextureLoader().load(customTexture, (tex) => {
      if (cancelled) return
      tex.colorSpace = THREE.SRGBColorSpace
      setCustomTex(tex)
    })
    return () => { cancelled = true }
  }, [customTexture])

  return (
    <mesh castShadow={castShadow} receiveShadow={receiveShadow} geometry={geo}>
      <meshStandardMaterial color={customTex ? '#ffffff' : color} map={customTex} roughness={0.5} metalness={0.1} />
    </mesh>
  )
}

// ─── Image plane ──────────────────────────────────────────────────────────────

function ImagePlane({ url, opacity }: { url: string; opacity: number }) {
  const texture = useLoader(THREE.TextureLoader, url)
  const aspect = (texture.image as HTMLImageElement | undefined)?.naturalWidth &&
    (texture.image as HTMLImageElement | undefined)?.naturalHeight
    ? (texture.image as HTMLImageElement).naturalWidth /
      (texture.image as HTMLImageElement).naturalHeight
    : 1
  return (
    <mesh>
      <planeGeometry args={[aspect, 1]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} side={THREE.DoubleSide} toneMapped={false} depthWrite={opacity >= 1} />
    </mesh>
  )
}

// ─── Text3D ───────────────────────────────────────────────────────────────────

function Text3DInner({ object }: { object: SceneObject }) {
  const font    = DEFAULT_FONT_URL
  const text    = object.text ?? 'Hello'
  const size    = object.fontSize ?? 0.5
  const height  = size * 0.2
  const bevel   = object.bevelEnabled ?? true

  return (
    <Center>
      <Text3D
        font={font}
        size={size}
        height={height}
        letterSpacing={object.letterSpacing ?? 0}
        bevelEnabled={bevel}
        bevelThickness={object.bevelThickness ?? 0.02}
        bevelSize={object.bevelSize ?? 0.01}
        bevelSegments={4}
        castShadow={object.castShadow}
        receiveShadow={object.receiveShadow}
      >
        {text}
        <meshStandardMaterial
          color={object.color}
          roughness={object.roughness}
          metalness={object.metalness}
          opacity={object.opacity}
          transparent={object.opacity < 1}
          emissive={object.emissive}
          emissiveIntensity={object.emissiveIntensity}
        />
      </Text3D>
    </Center>
  )
}

// ─── Particles ────────────────────────────────────────────────────────────────

function ParticlesInner({ object }: { object: SceneObject }) {
  const count  = Math.max(10, Math.min(2000, object.particleCount ?? 600))
  const size   = object.particleSize ?? 0.04
  const speed  = object.particleSpeed ?? 0.5
  const spread = object.particleSpread ?? 2.5
  const color  = object.color
  const opacity = object.opacity

  const pointsRef = useRef<THREE.Points>(null)

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * spread
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread
      vel[i * 3]     = (Math.random() - 0.5) * 0.008 * speed
      vel[i * 3 + 1] = (Math.random() * 0.6 + 0.4) * 0.008 * speed
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.008 * speed
    }
    return { positions: pos, velocities: vel }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, spread, speed])

  useFrame(() => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const n = pos.length / 3
    const h = spread / 2
    for (let i = 0; i < n; i++) {
      pos[i * 3]     += velocities[i * 3]
      pos[i * 3 + 1] += velocities[i * 3 + 1]
      pos[i * 3 + 2] += velocities[i * 3 + 2]
      if (pos[i * 3 + 1] > h) pos[i * 3 + 1] = -h
      if (Math.abs(pos[i * 3]) > h) velocities[i * 3] *= -1
      if (Math.abs(pos[i * 3 + 2]) > h) velocities[i * 3 + 2] *= -1
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={size} color={color} transparent opacity={opacity} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// ─── Spline ───────────────────────────────────────────────────────────────────

function SplineInner({ object, isSelected }: { object: SceneObject; isSelected: boolean }) {
  const pts    = object.splinePoints ?? [[0, 0, 0], [1, 1, 0], [2, 0, 0], [3, 1, 0]]
  const closed = object.splineClosed ?? false
  const color  = object.color

  const linePoints = useMemo(
    () => pts.map(p => new THREE.Vector3(...p)),
    [pts],
  )

  return (
    <>
      <CatmullRomLine points={linePoints} closed={closed} color={color} lineWidth={2} />
      {/* Control point spheres shown when selected */}
      {isSelected && pts.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </>
  )
}

// ─── Point Light ─────────────────────────────────────────────────────────────

function PointLightInner({ object }: { object: SceneObject }) {
  const lc = object.lightColor ?? '#ffffff'
  const li = object.lightIntensity ?? 2
  const ld = object.lightDistance ?? 10
  const lk = object.lightDecay ?? 2
  return (
    <>
      <pointLight color={lc} intensity={li} distance={ld} decay={lk} castShadow />
      <mesh>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshBasicMaterial color={lc} />
      </mesh>
    </>
  )
}

// ─── Spot Light ───────────────────────────────────────────────────────────────

function SpotLightInner({ object }: { object: SceneObject }) {
  const lc  = object.lightColor ?? '#ffffff'
  const li  = object.lightIntensity ?? 3
  const ld  = object.lightDistance ?? 15
  const lk  = object.lightDecay ?? 2
  const la  = object.lightAngle ?? 0.4
  const lp  = object.lightPenumbra ?? 0.3

  const spotRef = useRef<THREE.SpotLight>(null)
  const wpRef   = useRef(new THREE.Vector3())
  const { scene } = useThree()

  useEffect(() => {
    const light = spotRef.current
    if (!light) return
    scene.add(light.target)
    return () => { scene.remove(light.target) }
  }, [scene])

  // Keep target directly below the light every frame
  useFrame(() => {
    const light = spotRef.current
    if (!light) return
    light.getWorldPosition(wpRef.current)
    light.target.position.set(wpRef.current.x, wpRef.current.y - 8, wpRef.current.z)
    light.target.updateMatrixWorld()
  })

  return (
    <>
      <spotLight ref={spotRef} color={lc} intensity={li} distance={ld} decay={lk} angle={la} penumbra={lp} castShadow />
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshBasicMaterial color={lc} />
      </mesh>
      {/* Cone indicator */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[Math.tan(la) * 0.7, 0.7, 12, 1, true]} />
        <meshBasicMaterial color={lc} wireframe transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// ─── Rect Area Light ─────────────────────────────────────────────────────────

function RectLightInner({ object }: { object: SceneObject }) {
  const lc  = object.lightColor ?? '#ffffff'
  const li  = object.lightIntensity ?? 5
  const lw  = object.lightWidth ?? 2
  const lh  = object.lightHeight ?? 2

  return (
    <>
      {/* Point downward by default */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <rectAreaLight color={lc} intensity={li} width={lw} height={lh} />
        {/* Visual plane */}
        <mesh>
          <planeGeometry args={[lw, lh]} />
          <meshBasicMaterial color={lc} transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
        {/* Border */}
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(lw, lh)]} />
          <lineBasicMaterial color={lc} />
        </lineSegments>
      </group>
    </>
  )
}

// ─── Primitive mesh (also handles CSG, procedural textures, and paint) ────────

function PrimitiveMesh({ object, meshCallback, groupEvents, isPaintActive, paintBrushColor, paintBrushSize }: {
  object: SceneObject
  meshCallback: (node: THREE.Object3D | null) => void
  groupEvents: Record<string, (e?: any) => void>
  isPaintActive?: boolean
  paintBrushColor?: string
  paintBrushSize?: number
}) {
  const [customTex, setCustomTex] = useState<THREE.Texture | null>(null)
  const [isPaintDragging, setIsPaintDragging] = useState(false)
  const { invalidate } = useThree()

  useEffect(() => {
    if (!object.customTexture) { setCustomTex(null); return }
    let cancelled = false
    new THREE.TextureLoader().load(object.customTexture, (tex) => {
      if (cancelled) return
      tex.colorSpace = THREE.SRGBColorSpace
      setCustomTex(tex)
    })
    return () => { cancelled = true }
  }, [object.customTexture])

  // Procedural texture
  const ptConf = object.proceduralTexture
  const proceduralTex = useMemo(() => {
    if (!ptConf) return null
    return generateProceduralTexture(ptConf)
  }, [ptConf])

  // Paint texture — active painting OR saved paint data
  const needsPaintTex = isPaintActive || !!object.paintTexture
  const paintTex = needsPaintTex ? getOrCreatePaintTexture(object.id) : null
  useEffect(() => {
    if (!object.paintTexture) return
    getOrCreatePaintCanvas(object.id, object.paintTexture)
    const tex = getOrCreatePaintTexture(object.id)
    tex.needsUpdate = true
    setTimeout(() => invalidate(), 60)
  }, [object.id, object.paintTexture, invalidate])

  const finalMap = customTex ?? paintTex ?? proceduralTex

  // Paint pointer handlers
  const handlePaintDown = useCallback(() => setIsPaintDragging(true), [])
  const handlePaintUp   = useCallback(() => setIsPaintDragging(false), [])
  const handlePaintMove = useCallback((e: any) => {
    if (!isPaintActive || !isPaintDragging || !e.uv) return
    e.stopPropagation()
    const canvas = getOrCreatePaintCanvas(object.id)
    const ctx = canvas.getContext('2d')!
    const x = e.uv.x * 512
    const y = (1 - e.uv.y) * 512
    const radius = Math.max(2, (paintBrushSize ?? 0.2) * 50)
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = paintBrushColor ?? '#ff0000'
    ctx.fill()
    getOrCreatePaintTexture(object.id).needsUpdate = true
    invalidate()
  }, [isPaintActive, isPaintDragging, object.id, paintBrushColor, paintBrushSize, invalidate])

  const events = isPaintActive ? {
    onPointerDown: (e: any) => { e.stopPropagation(); handlePaintDown() },
    onPointerMove: handlePaintMove,
    onPointerUp:   (e: any) => { e.stopPropagation(); handlePaintUp() },
    onPointerOver: groupEvents.onPointerOver,
    onPointerOut:  groupEvents.onPointerOut,
  } : groupEvents

  // CSG: parse geometry from stored JSON
  const csgGeo = useMemo(() => {
    if (object.type !== 'csg' || !object.csgGeometryData) return null
    return new THREE.BufferGeometryLoader().parse(object.csgGeometryData as any)
  }, [object.type, object.csgGeometryData])

  const extraGeoProps = csgGeo ? { geometry: csgGeo } : {}

  return (
    <mesh
      ref={meshCallback as any}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      castShadow={object.castShadow}
      receiveShadow={object.receiveShadow}
      visible={object.visible}
      {...extraGeoProps}
      {...events}
    >
      {!csgGeo && <ObjectGeometry type={object.type} />}
      <meshStandardMaterial
        color={finalMap ? '#ffffff' : object.color}
        map={finalMap ?? undefined}
        roughness={object.roughness}
        metalness={object.metalness}
        opacity={object.opacity}
        transparent={object.opacity < 1}
        wireframe={object.wireframe}
        emissive={object.emissive}
        emissiveIntensity={object.emissiveIntensity}
        side={object.type === 'plane' ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  )
}

// ─── Mirror copy ──────────────────────────────────────────────────────────────

function MirrorMesh({ object, axis }: { object: SceneObject; axis: 'x' | 'y' | 'z' }) {
  const mirPos: [number, number, number] = [
    axis === 'x' ? -object.position[0] : object.position[0],
    axis === 'y' ? -object.position[1] : object.position[1],
    axis === 'z' ? -object.position[2] : object.position[2],
  ]
  const mirScale: [number, number, number] = [
    axis === 'x' ? -object.scale[0] : object.scale[0],
    axis === 'y' ? -object.scale[1] : object.scale[1],
    axis === 'z' ? -object.scale[2] : object.scale[2],
  ]
  const csgGeo = useMemo(() => {
    if (object.type !== 'csg' || !object.csgGeometryData) return null
    return new THREE.BufferGeometryLoader().parse(object.csgGeometryData as any)
  }, [object.type, object.csgGeometryData])

  return (
    <mesh
      position={mirPos}
      rotation={object.rotation}
      scale={mirScale}
      castShadow={object.castShadow}
      receiveShadow={object.receiveShadow}
      {...(csgGeo ? { geometry: csgGeo } : {})}
    >
      {!csgGeo && <ObjectGeometry type={object.type} />}
      <meshStandardMaterial
        color={object.color}
        roughness={object.roughness}
        metalness={object.metalness}
        opacity={object.opacity}
        transparent={object.opacity < 1}
        wireframe={object.wireframe}
        emissive={object.emissive}
        emissiveIntensity={object.emissiveIntensity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Main mesh ────────────────────────────────────────────────────────────────

export function SceneObjectMesh({ object, isSelected, transformMode }: SceneObjectMeshProps) {
  const meshRef = useRef<THREE.Object3D>(null)
  const [attachedMesh, setAttachedMesh] = useState<THREE.Object3D | null>(null)
  const lastPosRef = useRef<[number, number, number]>([...object.position])
  const curveRef   = useRef<THREE.CatmullRomCurve3 | null>(null)

  const updateObject       = useSceneStore(s => s.updateObject)
  const selectObject       = useSceneStore(s => s.selectObject)
  const toggleSelectObject = useSceneStore(s => s.toggleSelectObject)
  const selectedIds        = useSceneStore(s => s.selectedIds)
  const paintObjectId      = useSceneStore(s => s.paintObjectId)
  const paintBrushColor    = useSceneStore(s => s.paintBrushColor)
  const paintBrushSize     = useSceneStore(s => s.paintBrushSize)
  const snapEnabled        = useSceneStore(s => s.snapEnabled)
  const snapTranslate      = useSceneStore(s => s.snapTranslate)
  const snapRotate         = useSceneStore(s => s.snapRotate)
  const snapScale          = useSceneStore(s => s.snapScale)
  const { invalidate } = useThree()

  const meshCallback = useCallback((node: THREE.Object3D | null) => {
    const prev = meshRef.current
    meshRef.current = node
    setAttachedMesh(node)
    if (prev && prev !== node) meshRegistry.unregister(object.id, prev)
    if (node) meshRegistry.register(object.id, node)
  }, [object.id])

  // Unregister on unmount so stale entries can't leak into AnimationPlayer.
  useEffect(() => {
    return () => {
      const node = meshRef.current
      if (node) meshRegistry.unregister(object.id, node)
    }
  }, [object.id])

  // Build spline curve when pathFollowId changes
  useEffect(() => {
    if (!object.pathFollowId) {
      curveRef.current = null
      meshRegistry.setPathCurve(object.id, null)
      return
    }
    const spline = useSceneStore.getState().objects.find(o => o.id === object.pathFollowId)
    if (!spline?.splinePoints || spline.splinePoints.length < 2) return
    const curve = new THREE.CatmullRomCurve3(
      spline.splinePoints.map(p => new THREE.Vector3(p[0], p[1], p[2])),
      spline.splineClosed ?? false,
    )
    curveRef.current = curve
    meshRegistry.setPathCurve(object.id, curve)
  }, [object.id, object.pathFollowId])

  // Drive position along path every frame. During playback AnimationPlayer
  // sets the position directly, so we only run this when there's no transient
  // override (avoids fighting the player).
  useFrame(() => {
    if (!object.pathFollowId || !curveRef.current || !meshRef.current) return
    const entry = meshRegistry.getEntry(object.id)
    if (entry && entry.transientPathProgress != null) return  // player owns this frame
    const t = Math.max(0, Math.min(1, object.pathProgress ?? 0))
    const pt = curveRef.current.getPointAt(t)
    meshRef.current.position.set(pt.x, pt.y, pt.z)
  })

  // Callback so GltfInner/FbxInner can report discovered animation & morph names
  const handleGltfMetaReady = useCallback((animationNames: string[], morphNames: string[]) => {
    if (
      JSON.stringify(animationNames) !== JSON.stringify(object.gltfAnimationNames) ||
      JSON.stringify(morphNames)     !== JSON.stringify(object.gltfMorphNames)
    ) {
      updateObject(object.id, { gltfAnimationNames: animationNames, gltfMorphNames: morphNames })
    }
  }, [object.id, object.gltfAnimationNames, object.gltfMorphNames, updateObject])

  useEffect(() => {
    const node = meshRef.current
    if (!node) return
    // Skip position sync when path-following (useFrame drives position)
    if (!object.pathFollowId) node.position.set(...object.position)
    node.rotation.set(...object.rotation)
    node.scale.set(...object.scale)
    lastPosRef.current = [...object.position]
    invalidate()
  }, [object.position, object.rotation, object.scale, object.pathFollowId, invalidate])

  const handleTransformChange = useCallback(() => {
    const node = meshRef.current
    if (!node) return
    const newPos = node.position.toArray() as [number, number, number]
    const newRot: [number, number, number] = [node.rotation.x, node.rotation.y, node.rotation.z]
    const newScale = node.scale.toArray() as [number, number, number]
    const delta: [number, number, number] = [
      newPos[0] - lastPosRef.current[0],
      newPos[1] - lastPosRef.current[1],
      newPos[2] - lastPosRef.current[2],
    ]
    lastPosRef.current = newPos

    updateObject(object.id, { position: newPos, rotation: newRot, scale: newScale })

    const s = useSceneStore.getState()

    // Group: propagate position delta to all children
    if (object.type === 'group') {
      for (const child of s.objects.filter(o => o.groupId === object.id)) {
        updateObject(child.id, {
          position: [
            child.position[0] + delta[0],
            child.position[1] + delta[1],
            child.position[2] + delta[2],
          ],
        })
      }
      return
    }

    // Multi-select translate: propagate delta to all other selected objects
    if (transformMode === 'translate' && s.selectedIds.length > 1) {
      for (const otherId of s.selectedIds) {
        if (otherId === object.id) continue
        const other = s.objects.find(o => o.id === otherId)
        if (!other || other.type === 'group') continue
        updateObject(otherId, {
          position: [
            other.position[0] + delta[0],
            other.position[1] + delta[1],
            other.position[2] + delta[2],
          ],
        })
      }
    }
  }, [object.id, object.type, updateObject, transformMode])

  const isPrimitive = PRIMITIVE_TYPES.has(object.type)
  const offset = object.offset ?? [0, 0, 0] as [number, number, number]
  const isPaintActive = paintObjectId === object.id
  const isMultiSelected = selectedIds.length > 1 && selectedIds.includes(object.id)

  const handleClick = useCallback((e: any) => {
    e.stopPropagation()
    if (e.shiftKey) {
      toggleSelectObject(object.id)
    } else if (object.groupId) {
      selectObject(object.groupId)
    } else {
      selectObject(object.id)
    }
  }, [object.id, object.groupId, selectObject, toggleSelectObject])

  const groupEvents = {
    onClick:       handleClick,
    onPointerOver: (e: any) => { e.stopPropagation(); document.body.style.cursor = 'pointer' },
    onPointerOut:  ()        => { document.body.style.cursor = 'default' },
  }

  return (
    <>
      {object.type === 'group' ? (
        /* ── Group placeholder ─────────────────────────────────────────── */
        <mesh
          ref={meshCallback as any}
          position={object.position}
          rotation={object.rotation}
          scale={[1, 1, 1]}
          {...groupEvents}
        >
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={isSelected ? 0.55 : 0.08} />
        </mesh>
      ) : isPrimitive ? (
        /* ── Primitive / CSG mesh ─────────────────────────────────────── */
        <PrimitiveMesh
          object={object}
          meshCallback={meshCallback}
          groupEvents={groupEvents}
          isPaintActive={isPaintActive}
          paintBrushColor={paintBrushColor}
          paintBrushSize={paintBrushSize}
        />
      ) : (
        /* ── Group-based types (models, text3d, particles, spline, lights) ── */
        <group
          ref={meshCallback as any}
          position={object.position}
          rotation={object.rotation}
          scale={object.scale}
          visible={object.visible}
          {...groupEvents}
        >
          <group position={offset}>

            {/* ── Imported models ── */}
            {object.type === 'gltf' && object.url && (
              <GltfErrorBoundary key={object.url} name={object.name}>
                <Suspense fallback={null}>
                  <GltfInner
                    url={object.url}
                    castShadow={object.castShadow}
                    receiveShadow={object.receiveShadow}
                    cacheKey={object.cacheKey}
                    customTexture={object.customTexture}
                    gltfAnimationIndex={object.gltfAnimationIndex}
                    gltfAnimationPlay={object.gltfAnimationPlay}
                    gltfAnimationSpeed={object.gltfAnimationSpeed}
                    morphInfluences={object.morphInfluences}
                    onMetaReady={handleGltfMetaReady}
                  />
                </Suspense>
              </GltfErrorBoundary>
            )}
            {object.type === 'obj' && object.url && (
              <GltfErrorBoundary key={object.url} name={object.name}>
                <Suspense fallback={null}>
                  <ObjInner url={object.url} castShadow={object.castShadow} receiveShadow={object.receiveShadow} cacheKey={object.cacheKey} customTexture={object.customTexture} />
                </Suspense>
              </GltfErrorBoundary>
            )}
            {object.type === 'fbx' && object.url && (
              <GltfErrorBoundary key={object.url} name={object.name}>
                <Suspense fallback={null}>
                  <FbxInner
                    url={object.url}
                    castShadow={object.castShadow}
                    receiveShadow={object.receiveShadow}
                    cacheKey={object.cacheKey}
                    customTexture={object.customTexture}
                    gltfAnimationIndex={object.gltfAnimationIndex}
                    gltfAnimationPlay={object.gltfAnimationPlay}
                    gltfAnimationSpeed={object.gltfAnimationSpeed}
                    onMetaReady={handleGltfMetaReady}
                  />
                </Suspense>
              </GltfErrorBoundary>
            )}
            {object.type === 'stl' && object.url && (
              <GltfErrorBoundary key={object.url} name={object.name}>
                <Suspense fallback={null}>
                  <StlInner url={object.url} castShadow={object.castShadow} receiveShadow={object.receiveShadow} color={object.color} customTexture={object.customTexture} />
                </Suspense>
              </GltfErrorBoundary>
            )}
            {object.type === 'image' && object.url && (
              <Suspense fallback={null}>
                <ImagePlane url={object.url} opacity={object.opacity} />
              </Suspense>
            )}

            {/* ── Text3D ── */}
            {object.type === 'text3d' && (
              <Suspense fallback={null}>
                <Text3DInner object={object} />
              </Suspense>
            )}

            {/* ── Particles ── */}
            {object.type === 'particles' && <ParticlesInner object={object} />}

            {/* ── Spline ── */}
            {object.type === 'spline' && <SplineInner object={object} isSelected={isSelected} />}

            {/* ── Lights ── */}
            {object.type === 'pointlight' && <PointLightInner object={object} />}
            {object.type === 'spotlight'  && <SpotLightInner object={object} />}
            {object.type === 'rectlight'  && <RectLightInner object={object} />}

            {/* ── Annotation pin ── */}
            {object.type === 'annotation' && (
              <>
                <Html
                  center
                  distanceFactor={object.annotationAlwaysVisible ? undefined : 10}
                  occlude={!object.annotationAlwaysVisible}
                >
                  <div style={{
                    background: object.annotationBgColor ?? 'rgba(15,15,30,0.85)',
                    color: '#fff',
                    padding: '3px 9px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(4px)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}>
                    {object.annotationText || 'Annotation'}
                  </div>
                </Html>
                <mesh>
                  <sphereGeometry args={[0.06, 8, 8]} />
                  <meshBasicMaterial color={object.annotationBgColor ?? '#60a5fa'} />
                </mesh>
              </>
            )}

          </group>
        </group>
      )}

      {/* Selection outline — primitives and groups, not plane */}
      {(isSelected || isMultiSelected) && attachedMesh && object.type !== 'plane' && (
        isPrimitive ? (
          <mesh
            position={object.position}
            rotation={object.rotation}
            scale={object.scale.map(s => s * 1.02) as [number, number, number]}
          >
            {object.type === 'csg' && object.csgGeometryData ? (
              <primitive object={new THREE.BufferGeometryLoader().parse(object.csgGeometryData as any)} attach="geometry" />
            ) : (
              <ObjectGeometry type={object.type} />
            )}
            <meshBasicMaterial color={isMultiSelected && !isSelected ? '#f59e0b' : '#60a5fa'} wireframe transparent opacity={0.35} />
          </mesh>
        ) : object.type === 'group' ? (
          <mesh position={object.position}>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
            <meshBasicMaterial color="#60a5fa" wireframe transparent opacity={0.5} />
          </mesh>
        ) : null
      )}

      {/* Mirror copies for primitives */}
      {isPrimitive && (object.mirrorX || object.mirrorY || object.mirrorZ) && (
        <>
          {object.mirrorX && <MirrorMesh object={object} axis="x" />}
          {object.mirrorY && <MirrorMesh object={object} axis="y" />}
          {object.mirrorZ && <MirrorMesh object={object} axis="z" />}
        </>
      )}

      {/* Transform gizmo — hidden when locked */}
      {isSelected && attachedMesh && !isPaintActive && !object.locked && (
        <TransformControls
          object={attachedMesh}
          mode={transformMode}
          translationSnap={snapEnabled && transformMode === 'translate' ? snapTranslate : undefined}
          rotationSnap={snapEnabled && transformMode === 'rotate' ? snapRotate : undefined}
          scaleSnap={snapEnabled && transformMode === 'scale' ? snapScale : undefined}
          onObjectChange={handleTransformChange}
          onMouseDown={() => useSceneStore.getState().pushUndo()}
        />
      )}
    </>
  )
}
