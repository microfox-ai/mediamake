"use client"

import { Suspense, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import {
  OrbitControls,
  Grid,
  Environment,
  Sky,
  Stars,
  GizmoHelper,
  GizmoViewport,
  Stats,
} from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { SceneObjectMesh } from './scene-object-mesh'
import { useSceneStore } from './scene-store'
import type { SkyPreset } from './scene-store'
import { interpolateTrack, interpolateCameraTrack } from './types'

// ─── Weather particle systems ─────────────────────────────────────────────────

function RainEffect() {
  const COUNT = 3000
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 60
      pos[i * 3 + 1] = Math.random() * 30
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60
    }
    return pos
  }, [])
  const speeds = useMemo(() => {
    const s = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) s[i] = 0.15 + Math.random() * 0.1
    return s
  }, [])
  useFrame(() => {
    if (!geoRef.current) return
    const pos = geoRef.current.attributes.position.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] -= speeds[i]
      if (pos[i * 3 + 1] < -2) pos[i * 3 + 1] = 28
    }
    geoRef.current.attributes.position.needsUpdate = true
  })
  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
      </bufferGeometry>
      <pointsMaterial color="#aaccff" size={0.07} transparent opacity={0.55} sizeAttenuation />
    </points>
  )
}

function SnowEffect() {
  const COUNT = 1500
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 50
      pos[i * 3 + 1] = Math.random() * 25
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50
    }
    return pos
  }, [])
  const speeds = useMemo(() => {
    const s = new Float32Array(COUNT * 2) // [fallSpeed, driftPhase]
    for (let i = 0; i < COUNT; i++) {
      s[i * 2]     = 0.015 + Math.random() * 0.02
      s[i * 2 + 1] = Math.random() * Math.PI * 2
    }
    return s
  }, [])
  const timeRef = useRef(0)
  useFrame((_, delta) => {
    if (!geoRef.current) return
    timeRef.current += delta
    const pos = geoRef.current.attributes.position.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     += Math.sin(timeRef.current + speeds[i * 2 + 1]) * 0.003
      pos[i * 3 + 1] -= speeds[i * 2]
      if (pos[i * 3 + 1] < -2) pos[i * 3 + 1] = 23
    }
    geoRef.current.attributes.position.needsUpdate = true
  })
  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.14} transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

function WeatherEffects({ preset }: { preset: SkyPreset }) {
  if (preset === 'rain')     return <RainEffect />
  if (preset === 'snowfall') return <SnowEffect />
  if (preset === 'night')    return <Stars radius={80} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
  return null
}

// ─── Export handle ────────────────────────────────────────────────────────────

export interface ViewportHandle {
  exportPng: () => string | null
  startRecording: (durationMs: number, onDone: (blob: Blob) => void) => void
  stopRecording: () => void
}

// ─── Animation playback engine (lives inside Canvas for useFrame) ─────────────

function AnimationPlayer({ orbitRef }: { orbitRef: React.RefObject<OrbitControlsImpl | null> }) {
  const isPlaying = useSceneStore(s => s.isPlaying)
  const { camera } = useThree()

  useFrame((_, delta) => {
    if (!isPlaying) return

    const s = useSceneStore.getState()
    const { activeClipId, clips, currentTime, sequenceMode } = s
    if (!activeClipId) return

    const clipIdx = clips.findIndex(c => c.id === activeClipId)
    const clip = clips[clipIdx]
    if (!clip) return

    let nextTime = currentTime + delta

    if (nextTime >= clip.duration) {
      if (clip.loop) {
        nextTime = nextTime % clip.duration
      } else if (sequenceMode) {
        const nextIdx = (clipIdx + 1) % clips.length
        s.setActiveClip(clips[nextIdx].id)
        s.setCurrentTime(0)
        return
      } else {
        s.setCurrentTime(clip.duration)
        s.setIsPlaying(false)
        return
      }
    }

    s.setCurrentTime(nextTime)

    // Drive viewport camera from cameraTrack if present
    if (clip.cameraTrack && clip.cameraTrack.length > 0) {
      const camState = interpolateCameraTrack(clip.cameraTrack, nextTime)
      if (camState) {
        camera.position.set(...camState.position)
        camera.lookAt(...camState.target)
        const orbit = orbitRef.current as any
        if (orbit) orbit.target.set(...camState.target)
        ;(camera as THREE.PerspectiveCamera).fov = camState.fov
        camera.updateProjectionMatrix()
        s.updateViewportCamera(camState.position, camState.target, camState.fov)
      }
    }

    // Apply interpolated transforms for every object track
    for (const track of clip.tracks) {
      const props = interpolateTrack(track, nextTime)
      if (Object.keys(props).length > 0) s.updateObject(track.objectId, props)
    }
  })

  return null
}

// ─── Scene content ────────────────────────────────────────────────────────────

function SceneContent() {
  const objects      = useSceneStore(s => s.objects)
  const selectedId   = useSceneStore(s => s.selectedId)
  const transformMode = useSceneStore(s => s.transformMode)
  const ambientIntensity = useSceneStore(s => s.ambientIntensity)
  const directionalIntensity = useSceneStore(s => s.directionalIntensity)
  const directionalPosition = useSceneStore(s => s.directionalPosition)
  const environment  = useSceneStore(s => s.environment)
  const background   = useSceneStore(s => s.background)
  const showGrid     = useSceneStore(s => s.showGrid)
  const showAxes     = useSceneStore(s => s.showAxes)
  const showStats    = useSceneStore(s => s.showStats)
  const skyEnabled     = useSceneStore(s => s.skyEnabled)
  const skyPreset      = useSceneStore(s => s.skyPreset)
  const skyTurbidity   = useSceneStore(s => s.skyTurbidity)
  const skyRayleigh    = useSceneStore(s => s.skyRayleigh)
  const skyInclination = useSceneStore(s => s.skyInclination)
  const skyAzimuth     = useSceneStore(s => s.skyAzimuth)
  const selectObject = useSceneStore(s => s.selectObject)
  const isPlaying    = useSceneStore(s => s.isPlaying)
  const clips        = useSceneStore(s => s.clips)
  const activeClipId = useSceneStore(s => s.activeClipId)

  const orbitRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()

  // Sync viewport camera → store whenever OrbitControls changes (pan/orbit/zoom).
  // Uses useSceneStore.getState() so it reads fresh state without closures.
  const handleOrbitChange = useCallback(() => {
    const s = useSceneStore.getState()
    if (s.isPlaying) return
    const orbit = orbitRef.current as any
    s.updateViewportCamera(
      camera.position.toArray() as [number, number, number],
      orbit ? orbit.target.toArray() as [number, number, number] : s.viewportCamera.target,
      (camera as THREE.PerspectiveCamera).fov,
    )
  }, [camera])

  const orbitDisabled = useMemo(() => {
    if (!isPlaying || !activeClipId) return false
    const clip = clips.find(c => c.id === activeClipId)
    return (clip?.cameraTrack?.length ?? 0) > 0
  }, [isPlaying, activeClipId, clips])

  return (
    <>
      <color attach="background" args={[background]} />

      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={directionalPosition}
        intensity={directionalIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {skyEnabled && (
        <Sky
          distance={4500}
          turbidity={skyTurbidity}
          rayleigh={skyRayleigh}
          inclination={skyInclination}
          azimuth={skyAzimuth}
        />
      )}
      {skyEnabled && <WeatherEffects preset={skyPreset} />}

      {environment !== 'none' && (
        <Suspense fallback={null}>
          <Environment preset={environment as any} background={false} />
        </Suspense>
      )}

      {showGrid && (
        <Grid
          args={[30, 30]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#555577"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#8888aa"
          fadeDistance={40}
          fadeStrength={1}
          position={[0, -0.005, 0]}
        />
      )}

      {showAxes && <primitive object={new THREE.AxesHelper(5)} />}
      {showStats && <Stats />}

      {objects.map(obj => (
        <SceneObjectMesh
          key={obj.id}
          object={obj}
          isSelected={selectedId === obj.id}
          transformMode={transformMode}
        />
      ))}

      <OrbitControls
        ref={orbitRef}
        makeDefault
        enabled={!orbitDisabled}
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
        onChange={handleOrbitChange}
      />

      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport axisColors={['#f87171', '#4ade80', '#60a5fa']} labelColor="white" />
      </GizmoHelper>

      <AnimationPlayer orbitRef={orbitRef} />
    </>
  )
}

// ─── Capture helpers ──────────────────────────────────────────────────────────

function CaptureController({ onReady }: { onReady: (fn: () => string | null, canvas: HTMLCanvasElement) => void }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    onReady(() => { gl.render(scene, camera); return gl.domElement.toDataURL('image/png') }, gl.domElement)
  }, [gl, scene, camera, onReady])
  return null
}

// ─── Viewport ─────────────────────────────────────────────────────────────────

const Viewport = forwardRef<ViewportHandle>((_, ref) => {
  const exportFnRef = useRef<(() => string | null) | null>(null)
  const canvasRef   = useRef<HTMLCanvasElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const selectObject = useSceneStore(s => s.selectObject)

  useImperativeHandle(ref, () => ({
    exportPng: () => exportFnRef.current?.() ?? null,

    startRecording: (durationMs, onDone) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const stream   = (canvas as any).captureStream(30)
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: BlobPart[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => onDone(new Blob(chunks, { type: mimeType }))
      recorder.start()
      recorderRef.current = recorder
      if (durationMs > 0) setTimeout(() => recorder.state === 'recording' && recorder.stop(), durationMs)
    },

    stopRecording: () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    },
  }))

  return (
    <Canvas
      shadows
      camera={{ position: [5, 4, 6], fov: 55, near: 0.01, far: 1000 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onPointerMissed={() => selectObject(null)}
      className="w-full h-full"
    >
      <CaptureController onReady={(fn, canvas) => { exportFnRef.current = fn; canvasRef.current = canvas }} />
      <SceneContent />
    </Canvas>
  )
})

Viewport.displayName = 'Viewport'
export { Viewport }
