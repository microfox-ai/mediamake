"use client"

import { useState, useMemo, useCallback } from 'react'
import { useSceneStore } from './scene-store'
import {
  interpolateTrack,
  CURVE_CHANNEL_COLORS, CURVE_CHANNEL_LABELS, ALL_CURVE_CHANNELS,
  EASING_PRESETS, sampleEasingCurve,
} from './types'
import type { CurveChannel, EasingType } from './types'
import { cn } from '@/lib/utils'

const SVG_W = 800, SVG_H = 200
const PAD_L = 42, PAD_R = 12, PAD_T = 12, PAD_B = 22
const PLOT_W = SVG_W - PAD_L - PAD_R
const PLOT_H = SVG_H - PAD_T - PAD_B
const SAMPLES = 240

function getKfChannelValue(kf: any, ch: CurveChannel): number | undefined {
  if (ch === 'pathProgress') return kf.pathProgress
  const [prop, ax] = ch.split('.') as ['position' | 'rotation' | 'scale', 'x' | 'y' | 'z']
  const ai = ax === 'x' ? 0 : ax === 'y' ? 1 : 2
  return Array.isArray(kf[prop]) ? kf[prop][ai] : undefined
}

// ─── Easing mini-preview SVG ──────────────────────────────────────────────────

export function EasingMiniCurve({ easing, w = 44, h = 30, color = '#60a5fa', selected = false }: {
  easing: EasingType; w?: number; h?: number; color?: string; selected?: boolean
}) {
  const pts = sampleEasingCurve(easing, 32)
  const pad = 3
  const pathD = pts.map(([t, v], i) => {
    const x = pad + t * (w - pad * 2)
    const y = h - pad - v * (h - pad * 2)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      {/* bg */}
      <rect width={w} height={h} rx="3" fill={selected ? `${color}22` : 'transparent'} />
      {/* border */}
      {selected && <rect width={w} height={h} rx="3" fill="none" stroke={color} strokeWidth="1" />}
      {/* axis lines */}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.5" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.5" />
      {/* curve */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Easing presets panel ─────────────────────────────────────────────────────

export function EasingPresetsPanel({
  currentEasing,
  onApply,
}: {
  currentEasing: EasingType | null
  onApply: (e: EasingType) => void
}) {
  return (
    <div className="w-56 flex-shrink-0 border-l bg-background flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b flex-shrink-0">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Easing Library</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1">
          {EASING_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => onApply(p.value)}
              className={cn(
                'flex flex-col items-center gap-1 p-1.5 rounded-md border transition-all hover:border-primary/50 text-center',
                currentEasing === p.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border/40 hover:bg-muted/40',
              )}
            >
              <EasingMiniCurve easing={p.value} selected={currentEasing === p.value} />
              <span className="text-[9px] font-medium text-foreground/80 leading-tight">{p.label}</span>
              <span className="text-[8px] text-muted-foreground leading-tight">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Curves / Graph editor ────────────────────────────────────────────────────

export function CurvesEditor() {
  const clips        = useSceneStore(s => s.clips)
  const activeClipId = useSceneStore(s => s.activeClipId)
  const objects      = useSceneStore(s => s.objects)
  const selectedId   = useSceneStore(s => s.selectedId)
  const currentTime  = useSceneStore(s => s.currentTime)
  const setKeyframeValue = useSceneStore(s => s.setKeyframeValue)
  const setCurrentTime   = useSceneStore(s => s.setCurrentTime)
  const setKeyframeEasing = useSceneStore(s => s.setKeyframeEasing)

  const [activeChannels, setActiveChannels] = useState<Set<CurveChannel>>(
    () => new Set<CurveChannel>(['position.x', 'position.y', 'position.z']),
  )
  const [selectedKf, setSelectedKf] = useState<{ kfId: string; ch: CurveChannel } | null>(null)
  const [showEasingPanel, setShowEasingPanel] = useState(false)

  const clip  = clips.find(c => c.id === activeClipId) ?? null
  const track = clip?.tracks.find(t => t.objectId === selectedId) ?? null

  // which channels have any data
  const channelsWithData = useMemo(() => {
    const set = new Set<CurveChannel>()
    if (!track) return set
    for (const kf of track.keyframes) {
      if (kf.position)            { set.add('position.x'); set.add('position.y'); set.add('position.z') }
      if (kf.rotation)            { set.add('rotation.x'); set.add('rotation.y'); set.add('rotation.z') }
      if (kf.scale)               { set.add('scale.x');    set.add('scale.y');    set.add('scale.z') }
      if (kf.pathProgress !== undefined) set.add('pathProgress')
    }
    return set
  }, [track])

  // Sample curves at SAMPLES points
  const curves = useMemo(() => {
    if (!track || !clip) return null
    const result = new Map<CurveChannel, [number, number][]>()
    for (const ch of ALL_CURVE_CHANNELS) {
      if (!activeChannels.has(ch)) continue
      const pts: [number, number][] = []
      for (let i = 0; i <= SAMPLES; i++) {
        const t = (i / SAMPLES) * clip.duration
        const interp = interpolateTrack(track, t)
        const [prop, ax] = ch.split('.') as ['position' | 'rotation' | 'scale', 'x' | 'y' | 'z']
        const ai = ax === 'x' ? 0 : ax === 'y' ? 1 : 2
        const val = (interp as any)[prop]
        pts.push([t, Array.isArray(val) ? val[ai] : 0])
      }
      result.set(ch, pts)
    }
    return result
  }, [track, clip, activeChannels])

  const { yMin, yMax } = useMemo(() => {
    if (!curves || curves.size === 0) return { yMin: -1, yMax: 1 }
    let mn = Infinity, mx = -Infinity
    for (const pts of curves.values()) {
      for (const [, y] of pts) { if (y < mn) mn = y; if (y > mx) mx = y }
    }
    if (mn === mx) { mn -= 0.5; mx += 0.5 }
    const m = (mx - mn) * 0.12
    return { yMin: mn - m, yMax: mx + m }
  }, [curves])

  const toX = useCallback((t: number) => PAD_L + (t / (clip?.duration ?? 1)) * PLOT_W, [clip])
  const toY = useCallback((v: number) => PAD_T + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H, [yMin, yMax])
  const fromSvgX = useCallback((px: number, rect: DOMRect) => {
    const svgX = (px - rect.left) * (SVG_W / rect.width)
    return Math.max(0, Math.min(clip?.duration ?? 0, (svgX - PAD_L) / PLOT_W * (clip?.duration ?? 1)))
  }, [clip])

  const selectedKfEasing = useMemo(() => {
    if (!selectedKf || !track) return null
    return track.keyframes.find(k => k.id === selectedKf.kfId)?.easing ?? null
  }, [selectedKf, track])

  const handleApplyEasing = useCallback((e: EasingType) => {
    if (!selectedKf || !clip || !track) return
    setKeyframeEasing(clip.id, track.objectId, selectedKf.kfId, e)
  }, [selectedKf, clip, track, setKeyframeEasing])

  if (!clip) return (
    <div className="flex items-center justify-center flex-1 h-full">
      <p className="text-xs text-muted-foreground">No active clip</p>
    </div>
  )

  // Y axis labels
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (i / 4) * (yMax - yMin))

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Channel toggle bar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b flex-shrink-0 flex-wrap bg-muted/20">
          {ALL_CURVE_CHANNELS.filter(ch => channelsWithData.has(ch) || activeChannels.has(ch)).map(ch => {
            const on = activeChannels.has(ch)
            const has = channelsWithData.has(ch)
            return (
              <button
                key={ch}
                onClick={() => setActiveChannels(prev => {
                  const next = new Set(prev)
                  if (next.has(ch)) next.delete(ch); else next.add(ch)
                  return next
                })}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all border',
                  on ? 'border-transparent text-white' : 'border-border/40 text-muted-foreground/50',
                  !has && 'opacity-40',
                )}
                style={on ? { backgroundColor: CURVE_CHANNEL_COLORS[ch] } : {}}
              >
                {CURVE_CHANNEL_LABELS[ch]}
              </button>
            )
          })}
          <div className="flex-1" />
          <button
            onClick={() => setShowEasingPanel(v => !v)}
            className={cn(
              'text-[9px] px-2 py-0.5 rounded border font-medium transition-colors',
              showEasingPanel ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground hover:border-primary/50',
            )}
          >
            Easing Library
          </button>
        </div>

        {/* SVG plot area */}
        {!track ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Select an object with a track to view curves</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden bg-background/60">
            <svg
              width="100%" height="100%"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="none"
              className="select-none cursor-crosshair"
              onMouseDown={e => {
                const t = fromSvgX(e.clientX, (e.currentTarget as SVGElement).getBoundingClientRect())
                setCurrentTime(t)
              }}
              onMouseMove={e => {
                if (e.buttons !== 1) return
                const t = fromSvgX(e.clientX, (e.currentTarget as SVGElement).getBoundingClientRect())
                setCurrentTime(t)
              }}
            >
              {/* Grid */}
              {yTicks.map((v, i) => (
                <g key={i}>
                  <line x1={PAD_L} x2={SVG_W - PAD_R} y1={toY(v)} y2={toY(v)}
                    stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
                  <text x={PAD_L - 4} y={toY(v) + 3.5} textAnchor="end" fontSize="7.5"
                    fill="currentColor" fillOpacity="0.45" className="font-mono">
                    {v.toFixed(2)}
                  </text>
                </g>
              ))}

              {/* Vertical time guides */}
              {Array.from({ length: Math.floor(clip.duration) + 1 }, (_, i) => (
                <g key={i}>
                  <line x1={toX(i)} x2={toX(i)} y1={PAD_T} y2={SVG_H - PAD_B}
                    stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
                  <text x={toX(i)} y={SVG_H - PAD_B + 12} textAnchor="middle"
                    fontSize="7.5" fill="currentColor" fillOpacity="0.45">{i}s</text>
                </g>
              ))}

              {/* Zero line */}
              {yMin < 0 && yMax > 0 && (
                <line x1={PAD_L} x2={SVG_W - PAD_R} y1={toY(0)} y2={toY(0)}
                  stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3,3" />
              )}

              {/* Curves */}
              {curves && Array.from(curves.entries()).map(([ch, pts]) => (
                <polyline key={ch}
                  points={pts.map(([t, v]) => `${toX(t).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')}
                  fill="none" stroke={CURVE_CHANNEL_COLORS[ch]} strokeWidth="1.8" strokeOpacity="0.9"
                />
              ))}

              {/* Keyframe dots */}
              {track.keyframes.map(kf =>
                ALL_CURVE_CHANNELS.filter(ch => activeChannels.has(ch) && channelsWithData.has(ch)).map(ch => {
                  const val = getKfChannelValue(kf, ch)
                  if (val === undefined) return null
                  const cx = toX(kf.time), cy = toY(val)
                  const isSel = selectedKf?.kfId === kf.id && selectedKf?.ch === ch
                  return (
                    <g key={`${kf.id}-${ch}`}>
                      {isSel && (
                        <circle cx={cx} cy={cy} r="9" fill={CURVE_CHANNEL_COLORS[ch]} fillOpacity="0.2" />
                      )}
                      <circle
                        cx={cx} cy={cy} r="4.5"
                        fill={isSel ? CURVE_CHANNEL_COLORS[ch] : 'var(--background)'}
                        stroke={CURVE_CHANNEL_COLORS[ch]}
                        strokeWidth={isSel ? 2 : 1.5}
                        style={{ cursor: 'ns-resize' }}
                        onMouseDown={e => {
                          e.stopPropagation()
                          setSelectedKf({ kfId: kf.id, ch })
                          const startY = e.clientY
                          const startVal = val
                          const rect = (e.currentTarget.ownerSVGElement as SVGElement).getBoundingClientRect()
                          const svgScale = SVG_H / rect.height
                          const range = yMax - yMin
                          const onMove = (ev: MouseEvent) => {
                            const dy = (ev.clientY - startY) * svgScale
                            const nv = startVal - (dy / PLOT_H) * range
                            setKeyframeValue(clip.id, track.objectId, kf.id, ch, nv)
                          }
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove)
                            window.removeEventListener('mouseup', onUp)
                          }
                          window.addEventListener('mousemove', onMove)
                          window.addEventListener('mouseup', onUp)
                        }}
                      />
                    </g>
                  )
                })
              )}

              {/* Playhead */}
              <line x1={toX(currentTime)} x2={toX(currentTime)} y1={PAD_T} y2={SVG_H - PAD_B}
                stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.9" pointerEvents="none" />
              <polygon
                points={`${toX(currentTime) - 5},${PAD_T} ${toX(currentTime) + 5},${PAD_T} ${toX(currentTime)},${PAD_T + 8}`}
                fill="hsl(var(--primary))" pointerEvents="none"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Easing panel */}
      {showEasingPanel && (
        <EasingPresetsPanel
          currentEasing={selectedKfEasing}
          onApply={handleApplyEasing}
        />
      )}
    </div>
  )
}
