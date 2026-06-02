"use client"

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus, Move, RotateCcw, Maximize2, Grid3X3,
  Axis3D, Download, Video, StopCircle,
  Loader2, ChevronDown, Trash2, Sun, ArrowLeft,
  Play, Pause, Square, Diamond, Film, Package, Image,
  LayoutTemplate, Clapperboard, Type, Sparkles, Spline,
  Lightbulb, Zap, MonitorSpeaker, Cloud, Snowflake, CloudRain, Moon, CloudSun,
  FolderOpen, FolderMinus, Magnet, Undo2, Redo2, Save, MapPin,
} from 'lucide-react'
import type { SkyPreset } from './scene-store'
import { useSceneStore } from './scene-store'
import type { ViewportHandle } from './viewport'
import type { ObjectType } from './types'
import { OBJECT_LABELS, OBJECT_ICONS } from './types'
import { getTemplateGroups } from './animation-templates'
import { gltfFileCache } from './gltf-cache'

const SHAPES: ObjectType[] = [
  'box', 'sphere', 'cylinder', 'torus', 'cone',
  'plane', 'ring', 'icosahedron', 'dodecahedron', 'torusKnot',
]

const ENVIRONMENTS = [
  { value: 'none',      label: 'None (lights only)', emoji: '💡' },
  { value: 'sunset',    label: 'Sunset',             emoji: '🌅' },
  { value: 'dawn',      label: 'Dawn',               emoji: '🌄' },
  { value: 'night',     label: 'Night',              emoji: '🌙' },
  { value: 'warehouse', label: 'Warehouse',          emoji: '🏭' },
  { value: 'forest',    label: 'Forest',             emoji: '🌲' },
  { value: 'apartment', label: 'Apartment',          emoji: '🏠' },
  { value: 'studio',    label: 'Studio',             emoji: '🎬' },
  { value: 'city',      label: 'City',               emoji: '🏙️' },
  { value: 'park',      label: 'Park',               emoji: '🌳' },
  { value: 'lobby',     label: 'Lobby',              emoji: '🏛️' },
]

const SKY_PRESETS: { value: SkyPreset; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'sunny',    label: 'Sunny',    icon: <Sun className="h-3.5 w-3.5 text-yellow-500" />,  desc: 'Clear blue sky, high sun' },
  { value: 'cloudy',   label: 'Cloudy',   icon: <Cloud className="h-3.5 w-3.5 text-slate-400" />, desc: 'Overcast, soft diffuse light' },
  { value: 'rainy',    label: 'Rainy',    icon: <CloudRain className="h-3.5 w-3.5 text-blue-400" />, desc: 'Dark storm clouds with rain' },
  { value: 'snowfall', label: 'Snowfall', icon: <Snowflake className="h-3.5 w-3.5 text-cyan-300" />, desc: 'White sky with falling snow' },
  { value: 'night',    label: 'Night',    icon: <Moon className="h-3.5 w-3.5 text-indigo-400" />, desc: 'Dark sky with stars' },
]

interface ToolbarProps {
  viewportRef: React.RefObject<ViewportHandle | null>
  onOpenScenePresets?: () => void
  onOpenHQRender?: () => void
}

export function Toolbar({ viewportRef, onOpenScenePresets, onOpenHQRender }: ToolbarProps) {
  const router = useRouter()

  // Scene
  const transformMode  = useSceneStore(s => s.transformMode)
  const setTransformMode = useSceneStore(s => s.setTransformMode)
  const addObject      = useSceneStore(s => s.addObject)
  const showGrid       = useSceneStore(s => s.showGrid)
  const showAxes       = useSceneStore(s => s.showAxes)
  const toggleGrid     = useSceneStore(s => s.toggleGrid)
  const toggleAxes     = useSceneStore(s => s.toggleAxes)
  const environment    = useSceneStore(s => s.environment)
  const setEnvironment = useSceneStore(s => s.setEnvironment)
  const clearScene     = useSceneStore(s => s.clearScene)
  const isRecording    = useSceneStore(s => s.isRecording)
  const recordingDuration = useSceneStore(s => s.recordingDuration)
  const setIsRecording = useSceneStore(s => s.setIsRecording)
  const addGltfObject   = useSceneStore(s => s.addGltfObject)
  const addModelObject  = useSceneStore(s => s.addModelObject)
  const addImageObject  = useSceneStore(s => s.addImageObject)
  const captureCameraKeyframe = useSceneStore(s => s.captureCameraKeyframe)
  const loadTemplate    = useSceneStore(s => s.loadTemplate)
  const skyEnabled      = useSceneStore(s => s.skyEnabled)
  const skyPreset       = useSceneStore(s => s.skyPreset)
  const setSkyEnabled   = useSceneStore(s => s.setSkyEnabled)
  const setSkyPreset    = useSceneStore(s => s.setSkyPreset)
  const selectedIds     = useSceneStore(s => s.selectedIds)
  const objects         = useSceneStore(s => s.objects)
  const groupSelected   = useSceneStore(s => s.groupSelected)
  const ungroupObject   = useSceneStore(s => s.ungroupObject)
  const undoStack       = useSceneStore(s => s.undoStack)
  const redoStack       = useSceneStore(s => s.redoStack)
  const undo            = useSceneStore(s => s.undo)
  const redo            = useSceneStore(s => s.redo)
  const snapEnabled     = useSceneStore(s => s.snapEnabled)
  const toggleSnap      = useSceneStore(s => s.toggleSnap)

  // Animation
  const isPlaying      = useSceneStore(s => s.isPlaying)
  const currentTime    = useSceneStore(s => s.currentTime)
  const clips          = useSceneStore(s => s.clips)
  const activeClipId   = useSceneStore(s => s.activeClipId)
  const selectedId     = useSceneStore(s => s.selectedId)
  const showTimeline   = useSceneStore(s => s.showTimeline)
  const setIsPlaying   = useSceneStore(s => s.setIsPlaying)
  const stopAnimation  = useSceneStore(s => s.stopAnimation)
  const addClip        = useSceneStore(s => s.addClip)
  const captureKeyframe = useSceneStore(s => s.captureKeyframe)
  const toggleTimeline = useSceneStore(s => s.toggleTimeline)

  const activeClip = clips.find(c => c.id === activeClipId) ?? null

  const [exportLoading, setExportLoading] = useState(false)
  const [recordingTimer, setRecordingTimer] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Import handlers ────────────────────────────────────────────────────
  // Converts a TIFF file to a PNG blob URL via canvas, since browsers can't decode .tif natively.
  const tiffToPngUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = document.createElement('img')
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height
          canvas.getContext('2d')!.drawImage(img, 0, 0)
          canvas.toBlob(blob => {
            if (blob) resolve(URL.createObjectURL(blob))
            else reject(new Error('canvas.toBlob failed'))
          }, 'image/png')
        }
        img.onerror = () => reject(new Error(`Could not decode ${file.name}`))
        img.src = reader.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  const handleModelFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    // Find the primary model file
    const mainFile = files.find(f => /\.(glb|gltf|obj|fbx|stl)$/i.test(f.name))
    if (!mainFile) return

    const ext = mainFile.name.split('.').pop()?.toLowerCase() ?? ''
    const name = mainFile.name.replace(/\.[^.]+$/, '')
    const mainUrl = URL.createObjectURL(mainFile)

    // Build file map, converting .tif/.tiff to PNG blobs since browsers can't decode them
    const buildFileMap = async (fileList: File[]) => {
      const map = new Map<string, string>()
      await Promise.all(fileList.map(async (f) => {
        const fext = f.name.split('.').pop()?.toLowerCase() ?? ''
        if (fext === 'tif' || fext === 'tiff') {
          try {
            const pngUrl = await tiffToPngUrl(f)
            map.set(f.name, pngUrl)
          } catch {
            // Most browsers can't decode TIFF — user must convert to PNG/JPG first
            console.warn(`[3D Studio] Skipped ${f.name}: browsers cannot decode TIFF. Convert to PNG or JPG first.`)
            alert(`⚠️ "${f.name}" is a TIFF file — most browsers cannot decode it.\nPlease convert it to PNG or JPG before importing.`)
          }
        } else {
          map.set(f.name, URL.createObjectURL(f))
        }
      }))
      return map
    }

    if (ext === 'obj' || ext === 'fbx') {
      // Support multi-file selection: .obj/.fbx + .mtl + textures
      if (files.length === 1) {
        addModelObject(mainUrl, name, ext as 'obj' | 'fbx')
      } else {
        const key = `${ext}_${Date.now()}`
        const fileMap = await buildFileMap(files)
        gltfFileCache.set(key, fileMap)
        addModelObject(mainUrl, name, ext as 'obj' | 'fbx', key)
      }
    } else if (ext === 'stl') {
      addModelObject(mainUrl, name, 'stl')
    } else {
      // GLTF/GLB — support multi-file selection for .gltf + assets
      if (files.length === 1) {
        addGltfObject(mainUrl, name)
      } else {
        const key = `gltf_${Date.now()}`
        const fileMap = await buildFileMap(files)
        gltfFileCache.set(key, fileMap)
        addGltfObject(mainUrl, name, key)
      }
    }
    e.target.value = ''
  }, [addGltfObject, addModelObject, tiffToPngUrl])

  const handleImageFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    addImageObject(URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, ''))
    e.target.value = ''
  }, [addImageObject])

  // ── Export PNG ─────────────────────────────────────────────────────────
  const handleExportPng = useCallback(() => {
    setExportLoading(true)
    setTimeout(() => {
      const dataUrl = viewportRef.current?.exportPng()
      if (dataUrl) {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `scene_${Date.now()}.png`
        a.click()
      }
      setExportLoading(false)
    }, 100)
  }, [viewportRef])

  // ── Record video ───────────────────────────────────────────────────────
  const handleStartRecording = useCallback(() => {
    setIsRecording(true)
    setRecordingTimer(0)
    timerRef.current = setInterval(() => setRecordingTimer(t => t + 1), 1000)
    const durationMs = recordingDuration > 0 ? recordingDuration * 1000 : 0
    viewportRef.current?.startRecording(durationMs, (blob) => {
      if (timerRef.current) clearInterval(timerRef.current)
      setIsRecording(false)
      setRecordingTimer(0)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scene_${Date.now()}.webm`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    })
  }, [viewportRef, recordingDuration, setIsRecording])

  const handleStopRecording = useCallback(() => {
    viewportRef.current?.stopRecording()
    if (timerRef.current) clearInterval(timerRef.current)
  }, [viewportRef])

  // ── Time display ───────────────────────────────────────────────────────
  const fmtTime = (t: number) =>
    `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${Math.floor((t % 1) * 10)}`

  return (
    <div className="flex items-center gap-1 px-3 h-11 border-b bg-background flex-shrink-0 overflow-x-auto">

      {/* Back */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 mr-1" onClick={() => router.back()}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back</TooltipContent>
      </Tooltip>

      <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:block">3D Studio</span>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Add object */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="default" className="gap-1.5 h-7 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="text-xs">Shapes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SHAPES.map(type => (
            <DropdownMenuItem key={type} onClick={() => addObject(type)} className="gap-2 text-sm">
              <span>{OBJECT_ICONS[type]}</span>
              {OBJECT_LABELS[type]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs">Objects</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => addObject('text3d')} className="gap-2 text-sm">
            <Type className="h-3.5 w-3.5" /> 3D Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addObject('particles')} className="gap-2 text-sm">
            <Sparkles className="h-3.5 w-3.5" /> Particles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addObject('spline')} className="gap-2 text-sm">
            <Spline className="h-3.5 w-3.5" /> Spline Path
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addObject('annotation')} className="gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5" /> Annotation Pin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Lights */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs">
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lights</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="text-xs">Add Light</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => addObject('pointlight')} className="gap-2 text-sm">
            <Lightbulb className="h-3.5 w-3.5" /> Point Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addObject('spotlight')} className="gap-2 text-sm">
            <Zap className="h-3.5 w-3.5" /> Spot Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addObject('rectlight')} className="gap-2 text-sm">
            <MonitorSpeaker className="h-3.5 w-3.5" /> Area Light
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Group / Ungroup */}
      {selectedIds.length >= 2 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={groupSelected}>
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Group</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Group selected objects ({selectedIds.length})</TooltipContent>
        </Tooltip>
      )}
      {selectedId && objects.find(o => o.id === selectedId)?.type === 'group' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => selectedId && ungroupObject(selectedId)}>
              <FolderMinus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ungroup</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ungroup and release members</TooltipContent>
        </Tooltip>
      )}

      {/* Import 3D model — label wraps input so browser handles the dialog natively */}
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="inline-flex items-center gap-1.5 h-7 px-2 text-xs rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors font-medium">
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Model</span>
            <input type="file" accept=".glb,.gltf,.obj,.fbx,.stl,.mtl,.png,.jpg,.jpeg,.webp,.bmp,.tga,.tif,.tiff" multiple className="sr-only" onChange={handleModelFile} />
          </label>
        </TooltipTrigger>
        <TooltipContent>Import 3D model (.glb/.gltf/.obj/.fbx/.stl) — for .obj/.fbx/.gltf select the model + .mtl + textures together</TooltipContent>
      </Tooltip>

      {/* Import image */}
      <Tooltip>
        <TooltipTrigger asChild>
          <label className="inline-flex items-center gap-1.5 h-7 px-2 text-xs rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors font-medium">
            <Image className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Image</span>
            <input type="file" accept="image/*" className="sr-only" onChange={handleImageFile} />
          </label>
        </TooltipTrigger>
        <TooltipContent>Import image as 2D layer (.jpg / .png / .webp…)</TooltipContent>
      </Tooltip>

      {/* Templates */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs">
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Templates</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 max-h-[70vh] overflow-y-auto">
          <DropdownMenuLabel className="text-xs">Load Template</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {getTemplateGroups().map((group, gi) => (
            <div key={group.category}>
              {gi > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1">
                {group.label}
              </DropdownMenuLabel>
              {group.templates.map(tpl => (
                <DropdownMenuItem
                  key={tpl.id}
                  className="flex flex-col items-start gap-0.5 py-2"
                  onClick={() => {
                    if (confirm(`Load "${tpl.name}"? This will replace your current scene.`)) {
                      loadTemplate(tpl)
                    }
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-base leading-none">{tpl.emoji}</span>
                    <span className="font-medium text-sm">{tpl.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-6 leading-snug">{tpl.description}</p>
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Transform modes */}
      {([
        { mode: 'translate' as const, icon: <Move className="h-3.5 w-3.5" />, label: 'Move  G' },
        { mode: 'rotate'    as const, icon: <RotateCcw className="h-3.5 w-3.5" />, label: 'Rotate  R' },
        { mode: 'scale'     as const, icon: <Maximize2 className="h-3.5 w-3.5" />, label: 'Scale  S' },
      ] as const).map(({ mode, icon, label }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={transformMode === mode ? 'secondary' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setTransformMode(mode)}
            >
              {icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* View toggles */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant={showGrid ? 'secondary' : 'ghost'} className="h-7 w-7 p-0" onClick={toggleGrid}>
            <Grid3X3 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle Grid</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant={showAxes ? 'secondary' : 'ghost'} className="h-7 w-7 p-0" onClick={toggleAxes}>
            <Axis3D className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle Axes</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant={snapEnabled ? 'secondary' : 'ghost'} className="h-7 w-7 p-0" onClick={toggleSnap}>
            <Magnet className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Snap to Grid ({snapEnabled ? 'On' : 'Off'})</TooltipContent>
      </Tooltip>

      {/* Sky preset dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant={skyEnabled ? 'secondary' : 'ghost'}
            className="gap-1.5 h-7 text-xs"
          >
            {skyEnabled
              ? SKY_PRESETS.find(p => p.value === skyPreset)?.icon ?? <CloudSun className="h-3.5 w-3.5" />
              : <CloudSun className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">
              {skyEnabled ? (SKY_PRESETS.find(p => p.value === skyPreset)?.label ?? 'Sky') : 'Sky'}
            </span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52">
          <DropdownMenuLabel className="text-xs">Sky Preset</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setSkyEnabled(false)}
            className={`text-sm gap-2 ${!skyEnabled ? 'text-primary font-medium' : ''}`}
          >
            <span className="w-4 text-center opacity-50">—</span>
            <div className="flex flex-col">
              <span>Off</span>
              <span className="text-[10px] text-muted-foreground font-normal">No sky background</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {SKY_PRESETS.map(p => (
            <DropdownMenuItem
              key={p.value}
              onClick={() => setSkyPreset(p.value)}
              className={`text-sm gap-2 ${skyEnabled && skyPreset === p.value ? 'text-primary font-medium bg-primary/5' : ''}`}
            >
              <span className="w-4 flex-shrink-0">{p.icon}</span>
              <div className="flex flex-col">
                <span>{p.label}</span>
                <span className="text-[10px] text-muted-foreground font-normal">{p.desc}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Environment / HDRI */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs">
            <Sun className="h-3.5 w-3.5" />
            <span className="capitalize hidden sm:inline">
              {environment === 'none' ? 'Env' : (ENVIRONMENTS.find(e => e.value === environment)?.emoji + ' ' + environment)}
            </span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52">
          <DropdownMenuLabel className="text-xs">HDRI Environment</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ENVIRONMENTS.map(e => (
            <DropdownMenuItem
              key={e.value}
              onClick={() => setEnvironment(e.value as any)}
              className={`text-sm gap-2 ${environment === e.value ? 'text-primary font-medium bg-primary/5' : ''}`}
            >
              <span className="w-5 text-center text-base">{e.emoji}</span>
              <span>{e.label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground leading-relaxed">
            Selecting an environment also updates the sky automatically.
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Export PNG */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={handleExportPng} disabled={exportLoading}>
            {exportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            PNG
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export current frame as PNG</TooltipContent>
      </Tooltip>

      {/* High-quality offline render */}
      {onOpenHQRender && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={onOpenHQRender}>
              <Film className="h-3.5 w-3.5 text-emerald-500" />
              HQ
            </Button>
          </TooltipTrigger>
          <TooltipContent>High-quality offline render (custom resolution + fps)</TooltipContent>
        </Tooltip>
      )}

      {/* Record video */}
      {!isRecording ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs">
              <Video className="h-3.5 w-3.5 text-red-500" />
              Record
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="text-xs">Record Duration</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[3, 5, 10, 15, 30].map(sec => (
              <DropdownMenuItem
                key={sec}
                onClick={() => { useSceneStore.getState().setRecordingDuration(sec); handleStartRecording() }}
                className="text-sm"
              >
                {sec} seconds
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { useSceneStore.getState().setRecordingDuration(0); handleStartRecording() }}
              className="text-sm"
            >
              Manual stop
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-red-500" onClick={handleStopRecording}>
          <StopCircle className="h-3.5 w-3.5 animate-pulse" />
          Stop ({recordingTimer}s)
        </Button>
      )}

      {isRecording && (
        <Badge variant="destructive" className="h-5 text-[10px] gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
          REC
        </Badge>
      )}

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Animation */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant={showTimeline ? 'secondary' : 'ghost'} className="h-7 gap-1.5 text-xs" onClick={toggleTimeline}>
            <Film className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Animate</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle animation timeline</TooltipContent>
      </Tooltip>

      {!activeClip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={addClip}>
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">New Clip</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create a new animation clip</TooltipContent>
        </Tooltip>
      ) : (
        <>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={stopAnimation}>
            <Square className="h-3 w-3" />
          </Button>
          <span className="text-[10px] tabular-nums text-muted-foreground font-mono min-w-[52px]">
            {fmtTime(currentTime)}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                disabled={!selectedId}
                onClick={() => selectedId && captureKeyframe(selectedId)}
              >
                <Diamond className="h-3 w-3 fill-primary text-primary" />
                <span className="hidden sm:inline">Key</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert keyframe for selected object at {fmtTime(currentTime)} · shortcut: I</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                onClick={captureCameraKeyframe}
              >
                <Clapperboard className="h-3 w-3 text-primary" />
                <span className="hidden sm:inline">Cam</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Capture viewport camera keyframe at {fmtTime(currentTime)} · shortcut: I (nothing selected)</TooltipContent>
          </Tooltip>
        </>
      )}

      <div className="flex-1" />

      {/* Undo / Redo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={undo} disabled={undoStack.length === 0}>
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo  Ctrl+Z</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={redo} disabled={redoStack.length === 0}>
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo  Ctrl+Y</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Scene presets */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={onOpenScenePresets}>
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Scenes</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save / Load scene slots and import JSON</TooltipContent>
      </Tooltip>

      {/* Clear scene */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => { if (confirm('Clear all objects?')) clearScene() }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Clear Scene</TooltipContent>
      </Tooltip>
    </div>
  )
}
