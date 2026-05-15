"use client"

import { useCallback, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Upload, X, Plus, Minus, Paintbrush, Save, Trash2, RefreshCw } from 'lucide-react'
import { useSceneStore } from './scene-store'
import type { SceneObject } from './types'
import { MODEL_TYPES, LIGHT_TYPES, PRIMITIVE_TYPES } from './types'
import { runCSG } from './csg-utils'
import { savePaintToDataUrl, clearPaintCanvas } from './paint-canvas'

// ─── Reusable sub-components ─────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
    </div>
  )
}

interface Vec3InputProps {
  label: string
  value: [number, number, number]
  step?: number
  onChange: (v: [number, number, number]) => void
}

function Vec3Input({ label, value, step = 0.01, onChange }: Vec3InputProps) {
  const handle = (axis: 0 | 1 | 2, raw: string) => {
    const n = parseFloat(raw)
    if (isNaN(n)) return
    const next = [...value] as [number, number, number]
    next[axis] = n
    onChange(next)
  }

  return (
    <div className="px-3 py-1">
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <div className="grid grid-cols-3 gap-1">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <div key={axis} className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-muted-foreground w-3">{axis}</span>
            <Input
              type="number"
              step={step}
              value={parseFloat(value[i].toFixed(4))}
              onChange={e => handle(i as 0 | 1 | 2, e.target.value)}
              className="h-6 text-xs px-1.5 tabular-nums"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}

function SliderRow({ label, value, min = 0, max = 1, step = 0.01, onChange }: SliderRowProps) {
  return (
    <div className="px-3 py-1">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-[10px] tabular-nums text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  )
}

interface SwitchRowProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function SwitchRow({ label, checked, onChange }: SwitchRowProps) {
  return (
    <div className="px-3 py-1 flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-75 origin-right" />
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="px-3 py-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="h-5 w-8 rounded border border-input cursor-pointer p-0"
          />
          <span className="text-[10px] tabular-nums text-muted-foreground">{value}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Scene settings (no object selected) ─────────────────────────────────────

function SceneSettings() {
  const ambientIntensity    = useSceneStore(s => s.ambientIntensity)
  const directionalIntensity = useSceneStore(s => s.directionalIntensity)
  const directionalPosition  = useSceneStore(s => s.directionalPosition)
  const background          = useSceneStore(s => s.background)
  const showStats           = useSceneStore(s => s.showStats)
  const skyEnabled          = useSceneStore(s => s.skyEnabled)
  const skyTurbidity        = useSceneStore(s => s.skyTurbidity)
  const skyRayleigh         = useSceneStore(s => s.skyRayleigh)
  const skyInclination      = useSceneStore(s => s.skyInclination)
  const skyAzimuth          = useSceneStore(s => s.skyAzimuth)
  const setAmbientIntensity    = useSceneStore(s => s.setAmbientIntensity)
  const setDirectionalIntensity = useSceneStore(s => s.setDirectionalIntensity)
  const setDirectionalPosition  = useSceneStore(s => s.setDirectionalPosition)
  const setBackground       = useSceneStore(s => s.setBackground)
  const toggleStats         = useSceneStore(s => s.toggleStats)
  const setSkyEnabled       = useSceneStore(s => s.setSkyEnabled)
  const setSkyParams        = useSceneStore(s => s.setSkyParams)

  return (
    <>
      <SectionHeader>Scene</SectionHeader>
      <div className="px-3 py-1">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs text-muted-foreground">Background</Label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={background}
              onChange={e => setBackground(e.target.value)}
              className="h-5 w-8 rounded border border-input cursor-pointer p-0"
            />
            <span className="text-[10px] tabular-nums text-muted-foreground">{background}</span>
          </div>
        </div>
      </div>
      <SwitchRow label="Show Stats" checked={showStats} onChange={toggleStats} />

      <Separator className="my-1" />
      <SectionHeader>Lighting</SectionHeader>
      <SliderRow label="Ambient Intensity" value={ambientIntensity} max={3} onChange={setAmbientIntensity} />
      <SliderRow label="Directional Intensity" value={directionalIntensity} max={5} onChange={setDirectionalIntensity} />
      <Vec3Input label="Light Position" value={directionalPosition} step={0.5} onChange={setDirectionalPosition} />

      <Separator className="my-1" />
      <SectionHeader>Procedural Sky</SectionHeader>
      <SwitchRow label="Enable Sky" checked={skyEnabled} onChange={setSkyEnabled} />
      {skyEnabled && (
        <>
          <SliderRow label="Turbidity" value={skyTurbidity} min={0} max={20} step={0.1} onChange={v => setSkyParams({ skyTurbidity: v })} />
          <SliderRow label="Rayleigh" value={skyRayleigh} min={0} max={4} step={0.05} onChange={v => setSkyParams({ skyRayleigh: v })} />
          <SliderRow label="Sun Height" value={skyInclination} min={0} max={1} step={0.01} onChange={v => setSkyParams({ skyInclination: v })} />
          <SliderRow label="Sun Azimuth" value={skyAzimuth} min={0} max={1} step={0.01} onChange={v => setSkyParams({ skyAzimuth: v })} />
          <div className="px-3 pb-1">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Sun Height: 0 = zenith, 0.5 = horizon, 1 = below. Azimuth: compass direction 0–1.
            </p>
          </div>
        </>
      )}
    </>
  )
}

// ─── Object properties ────────────────────────────────────────────────────────

function ObjectProperties({ obj }: { obj: SceneObject }) {
  const updateObject      = useSceneStore(s => s.updateObject)
  const selectedIds       = useSceneStore(s => s.selectedIds)
  const objects           = useSceneStore(s => s.objects)
  const addCsgObject      = useSceneStore(s => s.addCsgObject)
  const ungroupObject     = useSceneStore(s => s.ungroupObject)
  const paintObjectId     = useSceneStore(s => s.paintObjectId)
  const paintBrushColor   = useSceneStore(s => s.paintBrushColor)
  const paintBrushSize    = useSceneStore(s => s.paintBrushSize)
  const setPaintObjectId  = useSceneStore(s => s.setPaintObjectId)
  const setPaintBrushColor = useSceneStore(s => s.setPaintBrushColor)
  const setPaintBrushSize = useSceneStore(s => s.setPaintBrushSize)

  const [csgLoading, setCsgLoading] = useState(false)

  const up = useCallback(
    (updates: Partial<SceneObject>) => updateObject(obj.id, updates),
    [obj.id, updateObject],
  )

  const handleTextureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    up({ customTexture: url, customTextureName: file.name })
    e.target.value = ''
  }, [up])

  const handleTextureRemove = useCallback(() => {
    up({ customTexture: undefined, customTextureName: undefined })
  }, [up])

  const handleCSG = useCallback(async (operation: 'subtract' | 'union' | 'intersect') => {
    const otherIds = selectedIds.filter(id => id !== obj.id)
    if (otherIds.length !== 1) return
    const other = objects.find(o => o.id === otherIds[0])
    if (!other) return
    setCsgLoading(true)
    try {
      const geoData = await runCSG(obj, other, operation)
      addCsgObject(obj.id, other.id, operation, geoData, obj.color)
    } catch (err) {
      console.error('CSG failed', err)
    } finally {
      setCsgLoading(false)
    }
  }, [obj, selectedIds, objects, addCsgObject])

  const isLight     = LIGHT_TYPES.has(obj.type)
  const isPrimitive = PRIMITIVE_TYPES.has(obj.type)
  const isText3D    = obj.type === 'text3d'
  const isParticles = obj.type === 'particles'
  const isSpline    = obj.type === 'spline'
  const isGroup     = obj.type === 'group'
  const isCsg       = obj.type === 'csg'

  // For Boolean ops: show when exactly 2 primitives (or CSGs) are selected
  const canBoolean = selectedIds.length === 2 && selectedIds.includes(obj.id) &&
    selectedIds.every(id => {
      const o = objects.find(x => x.id === id)
      return o && (PRIMITIVE_TYPES.has(o.type))
    })

  const isPaintActive = paintObjectId === obj.id

  return (
    <>
      {/* Transform */}
      <SectionHeader>Transform</SectionHeader>
      <Vec3Input label="Position" value={obj.position} onChange={v => up({ position: v })} />
      <Vec3Input label="Rotation (rad)" value={obj.rotation} step={0.01} onChange={v => up({ rotation: v })} />
      <Vec3Input label="Scale" value={obj.scale} onChange={v => up({ scale: v })} />

      {/* Pivot offset — only for imported models and images */}
      {MODEL_TYPES.has(obj.type) && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Pivot Offset</SectionHeader>
          <Vec3Input label="Offset" value={obj.offset ?? [0, 0, 0]} onChange={v => up({ offset: v })} />
          <div className="px-3 py-0.5">
            <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground w-full justify-start px-1" onClick={() => up({ offset: [0, 0, 0] })}>
              Reset to origin
            </Button>
          </div>
          <div className="px-3 pb-1">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Shifts the geometry relative to the move/rotate gizmo.
            </p>
          </div>
        </>
      )}

      {/* ── Light properties ─────────────────────────────────────────────── */}
      {isLight && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Light</SectionHeader>
          <ColorRow label="Color" value={obj.lightColor ?? '#ffffff'} onChange={v => up({ lightColor: v })} />
          <SliderRow label="Intensity" value={obj.lightIntensity ?? 2} min={0} max={20} step={0.1} onChange={v => up({ lightIntensity: v })} />
          {obj.type !== 'rectlight' && (
            <>
              <SliderRow label="Distance" value={obj.lightDistance ?? 10} min={0} max={50} step={0.5} onChange={v => up({ lightDistance: v })} />
              <SliderRow label="Decay" value={obj.lightDecay ?? 2} min={0} max={5} step={0.1} onChange={v => up({ lightDecay: v })} />
            </>
          )}
          {obj.type === 'spotlight' && (
            <>
              <SliderRow label="Angle (rad)" value={obj.lightAngle ?? 0.4} min={0.01} max={Math.PI / 2} step={0.01} onChange={v => up({ lightAngle: v })} />
              <SliderRow label="Penumbra" value={obj.lightPenumbra ?? 0.3} min={0} max={1} step={0.01} onChange={v => up({ lightPenumbra: v })} />
              <div className="px-3 pb-1">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Spotlight points straight down by default. Rotate with the gizmo to aim it.
                </p>
              </div>
            </>
          )}
          {obj.type === 'rectlight' && (
            <>
              <SliderRow label="Width" value={obj.lightWidth ?? 2} min={0.1} max={10} step={0.1} onChange={v => up({ lightWidth: v })} />
              <SliderRow label="Height" value={obj.lightHeight ?? 2} min={0.1} max={10} step={0.1} onChange={v => up({ lightHeight: v })} />
              <div className="px-3 pb-1">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Area light — no shadow support. Rotate to aim.
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Text3D properties ────────────────────────────────────────────── */}
      {isText3D && (
        <>
          <Separator className="my-1" />
          <SectionHeader>3D Text</SectionHeader>
          <div className="px-3 py-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Content</Label>
            <Input
              value={obj.text ?? 'Hello'}
              onChange={e => up({ text: e.target.value })}
              className="h-7 text-xs"
              placeholder="Enter text..."
            />
          </div>
          <SliderRow label="Font Size" value={obj.fontSize ?? 0.5} min={0.05} max={3} step={0.05} onChange={v => up({ fontSize: v })} />
          <SliderRow label="Letter Spacing" value={obj.letterSpacing ?? 0} min={-0.2} max={0.5} step={0.01} onChange={v => up({ letterSpacing: v })} />
          <SwitchRow label="Bevel" checked={obj.bevelEnabled ?? true} onChange={v => up({ bevelEnabled: v })} />
          {(obj.bevelEnabled ?? true) && (
            <>
              <SliderRow label="Bevel Thickness" value={obj.bevelThickness ?? 0.02} min={0.001} max={0.2} step={0.001} onChange={v => up({ bevelThickness: v })} />
              <SliderRow label="Bevel Size" value={obj.bevelSize ?? 0.01} min={0.001} max={0.1} step={0.001} onChange={v => up({ bevelSize: v })} />
            </>
          )}
          <Separator className="my-1" />
          <SectionHeader>Material</SectionHeader>
          <ColorRow label="Color" value={obj.color} onChange={v => up({ color: v })} />
          <SliderRow label="Roughness" value={obj.roughness} onChange={v => up({ roughness: v })} />
          <SliderRow label="Metalness" value={obj.metalness} onChange={v => up({ metalness: v })} />
          <SliderRow label="Opacity" value={obj.opacity} onChange={v => up({ opacity: v })} />
          <ColorRow label="Emissive" value={obj.emissive} onChange={v => up({ emissive: v })} />
          <SliderRow label="Emissive Intensity" value={obj.emissiveIntensity} max={5} onChange={v => up({ emissiveIntensity: v })} />
        </>
      )}

      {/* ── Particle properties ──────────────────────────────────────────── */}
      {isParticles && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Particles</SectionHeader>
          <div className="px-3 py-1">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Count</Label>
              <span className="text-[10px] tabular-nums text-muted-foreground">{obj.particleCount ?? 600}</span>
            </div>
            <Slider value={[obj.particleCount ?? 600]} min={10} max={2000} step={10} onValueChange={([v]) => up({ particleCount: v })} className="w-full" />
          </div>
          <SliderRow label="Size" value={obj.particleSize ?? 0.04} min={0.005} max={0.3} step={0.005} onChange={v => up({ particleSize: v })} />
          <SliderRow label="Speed" value={obj.particleSpeed ?? 0.5} min={0} max={5} step={0.05} onChange={v => up({ particleSpeed: v })} />
          <SliderRow label="Spread" value={obj.particleSpread ?? 2.5} min={0.5} max={10} step={0.1} onChange={v => up({ particleSpread: v })} />
          <ColorRow label="Color" value={obj.color} onChange={v => up({ color: v })} />
          <SliderRow label="Opacity" value={obj.opacity} onChange={v => up({ opacity: v })} />
        </>
      )}

      {/* ── Spline properties ────────────────────────────────────────────── */}
      {isSpline && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Spline</SectionHeader>
          <SwitchRow label="Closed" checked={obj.splineClosed ?? false} onChange={v => up({ splineClosed: v })} />
          <ColorRow label="Color" value={obj.color} onChange={v => up({ color: v })} />
          <Separator className="my-1" />
          <SectionHeader>Control Points</SectionHeader>
          <div className="px-3 pb-1 flex flex-col gap-1">
            {(obj.splinePoints ?? [[0,0,0],[1,1,0],[2,0,0],[3,1,0]]).map((pt, i, arr) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                {([0, 1, 2] as const).map(axis => (
                  <Input
                    key={axis}
                    type="number"
                    step={0.1}
                    value={parseFloat(pt[axis].toFixed(3))}
                    onChange={e => {
                      const n = parseFloat(e.target.value)
                      if (isNaN(n)) return
                      const next = arr.map((p, j) =>
                        j === i ? [j === i && axis === 0 ? n : p[0], j === i && axis === 1 ? n : p[1], j === i && axis === 2 ? n : p[2]] as [number,number,number] : p
                      ) as [number,number,number][]
                      up({ splinePoints: next })
                    }}
                    className="h-6 text-xs px-1 tabular-nums flex-1 min-w-0"
                  />
                ))}
                <Button
                  size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => {
                    const next = arr.filter((_, j) => j !== i) as [number,number,number][]
                    if (next.length >= 2) up({ splinePoints: next })
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground justify-start px-1 mt-0.5"
              onClick={() => {
                const pts = obj.splinePoints ?? [[0,0,0],[1,1,0],[2,0,0],[3,1,0]]
                const last = pts[pts.length - 1]
                up({ splinePoints: [...pts, [last[0] + 1, last[1], last[2]]] as [number,number,number][] })
              }}
            >
              <Plus className="h-3 w-3" /> Add point
            </Button>
          </div>
        </>
      )}

      {/* ── Group info ──────────────────────────────────────────────────── */}
      {isGroup && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Group</SectionHeader>
          <div className="px-3 py-1">
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5">
              Moving this group moves all member objects together. Shift+click to add objects to a multi-select before grouping.
            </p>
            <Button
              size="sm" variant="outline" className="h-6 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => ungroupObject(obj.id)}
            >
              Ungroup
            </Button>
          </div>
        </>
      )}

      {/* ── Boolean CSG ─────────────────────────────────────────────────── */}
      {canBoolean && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Boolean Operations</SectionHeader>
          <div className="px-3 py-1 flex flex-col gap-1">
            <p className="text-[10px] text-muted-foreground mb-1 leading-relaxed">
              Apply CSG between this object (A) and the other selected (B). Source objects are consumed.
            </p>
            {(['subtract', 'union', 'intersect'] as const).map(op => (
              <Button
                key={op}
                size="sm" variant="outline" className="h-6 text-xs capitalize justify-start"
                disabled={csgLoading}
                onClick={() => handleCSG(op)}
              >
                {csgLoading ? '…' : op === 'subtract' ? 'A − B  Subtract' : op === 'union' ? 'A ∪ B  Union' : 'A ∩ B  Intersect'}
              </Button>
            ))}
          </div>
        </>
      )}

      {/* ── Mirror / Symmetry ─────────────────────────────────────────── */}
      {(isPrimitive || isCsg) && !isGroup && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Mirror / Symmetry</SectionHeader>
          <SwitchRow label="Mirror X (across YZ)" checked={obj.mirrorX ?? false} onChange={v => up({ mirrorX: v })} />
          <SwitchRow label="Mirror Y (across XZ)" checked={obj.mirrorY ?? false} onChange={v => up({ mirrorY: v })} />
          <SwitchRow label="Mirror Z (across XY)" checked={obj.mirrorZ ?? false} onChange={v => up({ mirrorZ: v })} />
          <div className="px-3 pb-1">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Renders a reflected copy across the world origin. The copy is display-only.
            </p>
          </div>
        </>
      )}

      {/* ── Procedural Texture ────────────────────────────────────────── */}
      {(isPrimitive || isCsg) && !isGroup && !isParticles && !isSpline && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Procedural Texture</SectionHeader>
          <div className="px-3 py-1">
            <div className="flex items-center gap-1 mb-1.5">
              {(['none', 'checker', 'gradient', 'noise'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    if (t === 'none') {
                      up({ proceduralTexture: undefined })
                    } else {
                      up({
                        proceduralTexture: {
                          type: t,
                          color1: obj.proceduralTexture?.color1 ?? '#ffffff',
                          color2: obj.proceduralTexture?.color2 ?? '#000000',
                          scale: obj.proceduralTexture?.scale ?? 1,
                        },
                      })
                    }
                  }}
                  className={`h-5 px-1.5 text-[10px] rounded border transition-colors ${
                    (t === 'none' && !obj.proceduralTexture) || obj.proceduralTexture?.type === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  {t === 'none' ? 'Off' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {obj.proceduralTexture && (
              <>
                <ColorRow label="Color 1" value={obj.proceduralTexture.color1} onChange={v => up({ proceduralTexture: { ...obj.proceduralTexture!, color1: v } })} />
                <ColorRow label="Color 2" value={obj.proceduralTexture.color2} onChange={v => up({ proceduralTexture: { ...obj.proceduralTexture!, color2: v } })} />
                {obj.proceduralTexture.type !== 'noise' && (
                  <SliderRow label="Scale" value={obj.proceduralTexture.scale} min={0.1} max={5} step={0.1} onChange={v => up({ proceduralTexture: { ...obj.proceduralTexture!, scale: v } })} />
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Texture Painting ──────────────────────────────────────────── */}
      {isPrimitive && !isGroup && !isCsg && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Texture Paint</SectionHeader>
          <div className="px-3 py-1 flex flex-col gap-1">
            {!isPaintActive ? (
              <Button
                size="sm" variant="outline" className="h-6 text-xs gap-1.5 justify-start"
                onClick={() => setPaintObjectId(obj.id)}
              >
                <Paintbrush className="h-3 w-3" /> Start Painting
              </Button>
            ) : (
              <>
                <ColorRow label="Brush Color" value={paintBrushColor} onChange={setPaintBrushColor} />
                <SliderRow label="Brush Size" value={paintBrushSize} min={0.01} max={1} step={0.01} onChange={setPaintBrushSize} />
                <div className="flex gap-1 mt-0.5">
                  <Button
                    size="sm" variant="default" className="h-6 text-xs gap-1 flex-1"
                    onClick={() => {
                      const dataUrl = savePaintToDataUrl(obj.id)
                      if (dataUrl) up({ paintTexture: dataUrl })
                      setPaintObjectId(null)
                    }}
                  >
                    <Save className="h-3 w-3" /> Save
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-6 text-xs gap-1 flex-1"
                    onClick={() => clearPaintCanvas(obj.id)}
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-6 text-xs gap-1 flex-1 text-muted-foreground"
                    onClick={() => setPaintObjectId(null)}
                  >
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                </div>
              </>
            )}
            {obj.paintTexture && !isPaintActive && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-muted-foreground flex-1">Saved paint applied</span>
                <Button
                  size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => up({ paintTexture: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground"
                  title="Edit paint"
                  onClick={() => setPaintObjectId(obj.id)}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Standard Material (primitives, STL, model types except gltf/obj/fbx) ── */}
      {!isLight && !isText3D && !isParticles && !isSpline && !isGroup &&
        obj.type !== 'gltf' && obj.type !== 'obj' && obj.type !== 'fbx' && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Material</SectionHeader>
          <ColorRow label="Color" value={obj.color} onChange={v => up({ color: v })} />
          {obj.type !== 'image' && obj.type !== 'stl' && (
            <>
              <SliderRow label="Roughness" value={obj.roughness} onChange={v => up({ roughness: v })} />
              <SliderRow label="Metalness" value={obj.metalness} onChange={v => up({ metalness: v })} />
            </>
          )}
          <SliderRow label="Opacity" value={obj.opacity} onChange={v => up({ opacity: v })} />
          {obj.type !== 'image' && (
            <>
              <ColorRow label="Emissive" value={obj.emissive} onChange={v => up({ emissive: v })} />
              <SliderRow label="Emissive Intensity" value={obj.emissiveIntensity} max={5} onChange={v => up({ emissiveIntensity: v })} />
            </>
          )}
        </>
      )}

      {/* Custom Texture — not for lights, particles, spline, image, or group */}
      {!isLight && !isParticles && !isSpline && !isGroup && obj.type !== 'image' && (
        <>
          <Separator className="my-1" />
          <SectionHeader>Texture</SectionHeader>
          <div className="px-3 py-1">
            <label className="cursor-pointer">
              <div className="inline-flex items-center gap-1.5 h-6 px-2 text-xs rounded-md border border-input hover:bg-accent hover:text-accent-foreground transition-colors font-medium">
                <Upload className="h-3 w-3" />
                {obj.customTextureName ? 'Replace' : 'Apply Texture'}
              </div>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" className="sr-only" onChange={handleTextureUpload} />
            </label>
            {obj.customTextureName ? (
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground truncate flex-1" title={obj.customTextureName}>{obj.customTextureName}</span>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={handleTextureRemove}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">Override material with a custom image.</p>
            )}
          </div>
        </>
      )}

      {!isGroup && <Separator className="my-1" />}

      {/* Flags — not for group */}
      {!isGroup && (
        <>
          <SectionHeader>Flags</SectionHeader>
          {(isPrimitive || isCsg) && !isGroup && (
            <SwitchRow label="Wireframe" checked={obj.wireframe} onChange={v => up({ wireframe: v })} />
          )}
          <SwitchRow label="Visible" checked={obj.visible} onChange={v => up({ visible: v })} />
          {!isLight && (
            <>
              <SwitchRow label="Cast Shadow" checked={obj.castShadow} onChange={v => up({ castShadow: v })} />
              <SwitchRow label="Receive Shadow" checked={obj.receiveShadow} onChange={v => up({ receiveShadow: v })} />
            </>
          )}
        </>
      )}
    </>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function PropertiesPanel() {
  const selectedId = useSceneStore(s => s.selectedId)
  const objects = useSceneStore(s => s.objects)
  const selectedObj = objects.find(o => o.id === selectedId) ?? null

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="flex items-center justify-between px-3 h-9 border-b flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {selectedObj ? selectedObj.name : 'Scene'}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {selectedObj ? (
            <ObjectProperties obj={selectedObj} />
          ) : (
            <SceneSettings />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
