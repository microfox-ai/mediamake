"use client"

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Play, Pause, Square, Plus, Trash2, Copy, Repeat,
  ChevronRight, Link2, Diamond, X, Keyboard, Clapperboard,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { useSceneStore } from './scene-store'
import { OBJECT_ICONS } from './types'
import type { EasingType } from './types'
import { cn } from '@/lib/utils'

const PX_PER_SEC = 90
const ROW_H      = 30
const RULER_H    = 22
const LABEL_W    = 140
const CLIP_W     = 160

function formatTime(t: number) {
  const m  = Math.floor(t / 60)
  const s  = Math.floor(t % 60)
  const cs = Math.floor((t % 1) * 100)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

// ─── Easing options ───────────────────────────────────────────────────────────

const EASINGS: EasingType[] = ['linear', 'ease-in', 'ease-out', 'ease-in-out']

// ─── Ruler + track area ───────────────────────────────────────────────────────

function TrackArea() {
  const clips           = useSceneStore(s => s.clips)
  const activeClipId    = useSceneStore(s => s.activeClipId)
  const currentTime     = useSceneStore(s => s.currentTime)
  const objects         = useSceneStore(s => s.objects)
  const setCurrentTime  = useSceneStore(s => s.setCurrentTime)
  const captureKeyframe = useSceneStore(s => s.captureKeyframe)
  const removeKeyframe  = useSceneStore(s => s.removeKeyframe)
  const setKeyframeEasing = useSceneStore(s => s.setKeyframeEasing)
  const selectedId      = useSceneStore(s => s.selectedId)
  const captureCameraKeyframe  = useSceneStore(s => s.captureCameraKeyframe)
  const removeCameraKeyframe   = useSceneStore(s => s.removeCameraKeyframe)
  const setCameraKeyframeEasing = useSceneStore(s => s.setCameraKeyframeEasing)

  const clip       = clips.find(c => c.id === activeClipId) ?? null
  const scrollRef  = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const totalWidth = clip ? clip.duration * PX_PER_SEC + 60 : 400

  const timeFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!scrollRef.current) return 0
    const rect = scrollRef.current.getBoundingClientRect()
    const x    = e.clientX - rect.left + scrollRef.current.scrollLeft
    return Math.max(0, Math.min(clip?.duration ?? 0, x / PX_PER_SEC))
  }, [clip])

  const handleRulerDown = useCallback((e: React.MouseEvent) => {
    setDragging(true)
    setCurrentTime(timeFromEvent(e))
  }, [setCurrentTime, timeFromEvent])

  useEffect(() => {
    if (!dragging) return
    const move = (e: MouseEvent) => setCurrentTime(timeFromEvent(e))
    const up   = () => setDragging(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dragging, setCurrentTime, timeFromEvent])

  if (!clip) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">No clip selected</p>
          <p className="text-[10px] text-muted-foreground/60">Create a clip using the + button</p>
        </div>
      </div>
    )
  }

  const trackedIds = new Set(clip.tracks.map(t => t.objectId))
  if (selectedId) trackedIds.add(selectedId)
  const trackObjects = objects.filter(o => trackedIds.has(o.id))

  // Ruler tick marks every 0.25s, label every 1s
  const ticks: number[] = []
  for (let t = 0; t <= clip.duration + 0.001; t = parseFloat((t + 0.25).toFixed(3))) {
    ticks.push(t)
  }

  const playheadX = currentTime * PX_PER_SEC

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto relative select-none" style={{ position: 'relative' }}>
      <div style={{ width: totalWidth, minHeight: '100%', position: 'relative' }}>

        {/* Ruler */}
        <div
          className="sticky top-0 z-20 bg-muted/90 backdrop-blur-sm border-b border-border/60 cursor-col-resize"
          style={{ height: RULER_H, width: totalWidth }}
          onMouseDown={handleRulerDown}
        >
          {/* Ruler bg gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-transparent pointer-events-none" />
          {ticks.map(t => {
            const isSecond = Math.abs(t % 1) < 0.001
            const isHalf   = Math.abs((t % 1) - 0.5) < 0.001
            return (
              <div
                key={t}
                className="absolute top-0 flex flex-col items-start pointer-events-none"
                style={{ left: t * PX_PER_SEC }}
              >
                <div
                  className={cn(
                    'bg-muted-foreground/50',
                    isSecond ? 'w-px h-4 bg-muted-foreground/70' : isHalf ? 'w-px h-2.5' : 'w-px h-1.5 bg-muted-foreground/30',
                  )}
                />
                {isSecond && (
                  <span className="text-[9px] text-muted-foreground/80 font-mono ml-0.5 mt-0.5 tabular-nums">
                    {formatTime(t)}
                  </span>
                )}
              </div>
            )
          })}

          {/* Playhead on ruler */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none"
            style={{ left: playheadX }}
          >
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary rotate-45" />
          </div>
        </div>

        {/* Camera track row */}
        <TrackRow
          label={null}
          isCamera
          height={ROW_H}
          totalWidth={totalWidth}
          altRow={false}
          onClick={(t) => { setCurrentTime(t); captureCameraKeyframe() }}
        >
          {(clip.cameraTrack ?? []).map(kf => (
            <KeyframeDiamond
              key={kf.id}
              x={kf.time * PX_PER_SEC}
              tooltip={`${formatTime(kf.time)} · ${kf.easing}`}
              color="blue"
              easing={kf.easing}
              onEasing={e => setCameraKeyframeEasing(clip.id, kf.id, e)}
              onDelete={() => removeCameraKeyframe(clip.id, kf.id)}
            />
          ))}
        </TrackRow>

        {/* Object track rows */}
        {trackObjects.map((obj, idx) => {
          const track = clip.tracks.find(t => t.objectId === obj.id)
          return (
            <TrackRow
              key={obj.id}
              label={null}
              isCamera={false}
              height={ROW_H}
              totalWidth={totalWidth}
              altRow={idx % 2 === 0}
              onClick={(t) => { setCurrentTime(t); captureKeyframe(obj.id) }}
            >
              {track?.keyframes.map(kf => (
                <KeyframeDiamond
                  key={kf.id}
                  x={kf.time * PX_PER_SEC}
                  tooltip={`${formatTime(kf.time)} · ${kf.easing}`}
                  color="primary"
                  easing={kf.easing}
                  onEasing={e => setKeyframeEasing(clip.id, obj.id, kf.id, e)}
                  onDelete={() => removeKeyframe(clip.id, obj.id, kf.id)}
                />
              ))}
            </TrackRow>
          )
        })}

        {/* Playhead line across all rows */}
        <div
          className="absolute top-0 bottom-0 w-px bg-primary/40 pointer-events-none z-10"
          style={{ left: playheadX, top: RULER_H }}
        />
      </div>
    </div>
  )
}

// ─── Track row helper ─────────────────────────────────────────────────────────

function TrackRow({
  children, height, totalWidth, altRow, isCamera, onClick,
}: {
  children?: React.ReactNode
  height: number
  totalWidth: number
  altRow: boolean
  isCamera: boolean
  label: null
  onClick: (t: number) => void
}) {
  return (
    <div
      className={cn(
        'relative border-b border-border/30 flex items-center group',
        altRow ? 'bg-muted/10' : '',
        isCamera ? 'bg-blue-500/5 border-blue-400/20' : '',
      )}
      style={{ height, width: totalWidth }}
    >
      <div
        className="absolute inset-0 hover:bg-primary/5 transition-colors cursor-crosshair"
        onClick={e => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const scrollLeft = (e.currentTarget.parentElement?.parentElement as HTMLDivElement)?.scrollLeft ?? 0
          const t = Math.max(0, (e.clientX - rect.left + scrollLeft) / PX_PER_SEC)
          onClick(t)
        }}
      />
      {children}
    </div>
  )
}

// ─── Keyframe diamond ─────────────────────────────────────────────────────────

function KeyframeDiamond({
  x, tooltip, color, easing, onEasing, onDelete,
}: {
  x: number
  tooltip: string
  color: 'primary' | 'blue'
  easing: EasingType
  onEasing: (e: EasingType) => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 top-1/2 cursor-pointer hover:scale-150 transition-transform group/kf"
              style={{ left: x }}
              onClick={e => e.stopPropagation()}
            >
              <Diamond
                className={cn(
                  'h-2.5 w-2.5 drop-shadow transition-all',
                  color === 'blue'
                    ? 'fill-blue-400 text-blue-400 group-hover/kf:fill-blue-300'
                    : 'fill-primary text-primary group-hover/kf:fill-primary/80',
                )}
              />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">{tooltip}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="w-44">
        <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Easing
        </div>
        {EASINGS.map(e => (
          <DropdownMenuItem
            key={e}
            onClick={() => onEasing(e)}
            className={cn('text-xs gap-2', easing === e && 'text-primary font-medium bg-primary/5')}
          >
            {easing === e && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
            {e}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-xs text-destructive gap-2">
          <Trash2 className="h-3 w-3" /> Delete keyframe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Track labels (sticky left column) ───────────────────────────────────────

function TrackLabels() {
  const clips        = useSceneStore(s => s.clips)
  const activeClipId = useSceneStore(s => s.activeClipId)
  const objects      = useSceneStore(s => s.objects)
  const selectedId   = useSceneStore(s => s.selectedId)
  const removeTrack  = useSceneStore(s => s.removeTrack)
  const clearCameraTrack = useSceneStore(s => s.clearCameraTrack)

  const clip = clips.find(c => c.id === activeClipId) ?? null
  if (!clip) return <div style={{ width: LABEL_W }} className="flex-shrink-0 border-r bg-background" />

  const trackedIds = new Set(clip.tracks.map(t => t.objectId))
  if (selectedId) trackedIds.add(selectedId)
  const trackObjects = objects.filter(o => trackedIds.has(o.id))
  const hasCameraKeys = (clip.cameraTrack?.length ?? 0) > 0

  return (
    <div className="flex-shrink-0 border-r bg-background flex flex-col" style={{ width: LABEL_W }}>
      {/* Ruler spacer */}
      <div style={{ height: RULER_H }} className="border-b bg-muted/60 flex-shrink-0 flex items-center px-2">
        <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Track</span>
      </div>

      {/* Camera label */}
      <div
        className="group flex items-center gap-1.5 px-2 border-b border-border/30 bg-blue-500/5"
        style={{ height: ROW_H }}
      >
        <Clapperboard className="h-3 w-3 flex-shrink-0 text-blue-400" />
        <span className="flex-1 truncate text-[10px] text-muted-foreground font-medium">Viewport Cam</span>
        {hasCameraKeys && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => clearCameraTrack(clip.id)}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[10px]">Clear camera track</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Object labels */}
      {trackObjects.map((obj, idx) => {
        const hasTrack = clip.tracks.some(t => t.objectId === obj.id)
        return (
          <div
            key={obj.id}
            className={cn(
              'group flex items-center gap-1.5 px-2 border-b border-border/30',
              idx % 2 === 0 ? 'bg-muted/10' : '',
            )}
            style={{ height: ROW_H }}
          >
            <span className="text-[10px] flex-shrink-0">{OBJECT_ICONS[obj.type]}</span>
            <span className="flex-1 truncate text-[10px] text-foreground/80 font-medium">{obj.name}</span>
            {hasTrack && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => removeTrack(clip.id, obj.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[10px]">Clear track</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Clip list ────────────────────────────────────────────────────────────────

function ClipList() {
  const clips          = useSceneStore(s => s.clips)
  const activeClipId   = useSceneStore(s => s.activeClipId)
  const sequenceMode   = useSceneStore(s => s.sequenceMode)
  const addClip        = useSceneStore(s => s.addClip)
  const removeClip     = useSceneStore(s => s.removeClip)
  const duplicateClip  = useSceneStore(s => s.duplicateClip)
  const updateClip     = useSceneStore(s => s.updateClip)
  const setActiveClip  = useSceneStore(s => s.setActiveClip)
  const toggleSequenceMode = useSceneStore(s => s.toggleSequenceMode)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName]   = useState('')

  const startEdit  = (id: string, name: string) => { setEditingId(id); setEditName(name) }
  const commitEdit = () => {
    if (editingId && editName.trim()) updateClip(editingId, { name: editName.trim() })
    setEditingId(null)
  }

  return (
    <div className="flex-shrink-0 flex flex-col border-r bg-background" style={{ width: CLIP_W }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 border-b bg-muted/40 flex-shrink-0" style={{ height: RULER_H }}>
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Clips</span>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon" variant={sequenceMode ? 'secondary' : 'ghost'}
                className="h-4 w-4"
                onClick={toggleSequenceMode}
              >
                <Link2 className="h-2.5 w-2.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Sequence mode</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-4 w-4" onClick={addClip}>
                <Plus className="h-2.5 w-2.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">New clip</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {clips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 px-3 gap-1">
            <p className="text-[10px] text-muted-foreground text-center">No clips yet</p>
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 mt-1" onClick={addClip}>
              <Plus className="h-3 w-3" /> New Clip
            </Button>
          </div>
        )}
        {clips.map((clip, idx) => (
          <div
            key={clip.id}
            className={cn(
              'group flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer text-xs border-b border-border/20 transition-colors',
              activeClipId === clip.id
                ? 'bg-primary/10 text-foreground border-l-2 border-l-primary'
                : 'hover:bg-muted/40 border-l-2 border-l-transparent',
            )}
            onClick={() => setActiveClip(clip.id)}
          >
            {sequenceMode && (
              <span className="text-[9px] font-mono text-muted-foreground w-3 text-center flex-shrink-0">{idx + 1}</span>
            )}
            <ChevronRight
              className={cn('h-3 w-3 flex-shrink-0 text-primary transition-transform', activeClipId !== clip.id && 'opacity-0')}
            />

            {editingId === clip.id ? (
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                onBlur={commitEdit}
                autoFocus
                className="h-5 text-[10px] px-1 py-0 flex-1 min-w-0"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 truncate min-w-0 text-[11px] font-medium"
                onDoubleClick={() => startEdit(clip.id, clip.name)}
              >
                {clip.name}
              </span>
            )}

            <div className="flex-shrink-0 flex items-center gap-0.5">
              <span className="text-[9px] text-muted-foreground font-mono tabular-nums">{clip.duration}s</span>
              {clip.loop && <Repeat className="h-2.5 w-2.5 text-primary/70 flex-shrink-0" />}
            </div>

            <div className={cn(
              'flex items-center gap-0.5 flex-shrink-0 transition-opacity',
              activeClipId === clip.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}>
              <button
                className="p-0.5 rounded hover:bg-muted/80 transition-colors"
                onClick={e => { e.stopPropagation(); duplicateClip(clip.id) }}
              >
                <Copy className="h-2.5 w-2.5" />
              </button>
              <button
                className="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
                onClick={e => { e.stopPropagation(); removeClip(clip.id) }}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}

// ─── Playback bar ─────────────────────────────────────────────────────────────

function PlaybackBar({ timelineHeight, onHeightChange }: { timelineHeight: number; onHeightChange: (h: number) => void }) {
  const isPlaying    = useSceneStore(s => s.isPlaying)
  const currentTime  = useSceneStore(s => s.currentTime)
  const clips        = useSceneStore(s => s.clips)
  const activeClipId = useSceneStore(s => s.activeClipId)
  const selectedId   = useSceneStore(s => s.selectedId)
  const setIsPlaying  = useSceneStore(s => s.setIsPlaying)
  const stopAnimation = useSceneStore(s => s.stopAnimation)
  const updateClip    = useSceneStore(s => s.updateClip)
  const captureKeyframe = useSceneStore(s => s.captureKeyframe)
  const captureCameraKeyframe = useSceneStore(s => s.captureCameraKeyframe)

  const clip = clips.find(c => c.id === activeClipId) ?? null
  const pct  = clip ? (currentTime / clip.duration) * 100 : 0

  return (
    <div className="flex-shrink-0 bg-background border-t">
      {/* Progress bar */}
      <div className="h-1 bg-muted relative overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 bg-primary/60 transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center gap-1.5 px-3 h-9">
        {/* Resize handle – drag up to expand timeline */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col gap-0.5 cursor-ns-resize px-0.5 opacity-40 hover:opacity-80 transition-opacity"
              onMouseDown={e => {
                const startY = e.clientY
                const startH = timelineHeight
                const onMove = (ev: MouseEvent) => onHeightChange(Math.max(150, Math.min(500, startH - (ev.clientY - startY))))
                const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
                e.preventDefault()
              }}
            >
              <ChevronUp className="h-2.5 w-2.5" />
              <ChevronDown className="h-2.5 w-2.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Drag to resize timeline</TooltipContent>
        </Tooltip>

        {/* Transport */}
        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full"
          onClick={() => setIsPlaying(!isPlaying)} disabled={!clip}>
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={stopAnimation} disabled={!clip}>
          <Square className="h-3 w-3" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon" variant={clip?.loop ? 'secondary' : 'ghost'}
              className="h-6 w-6" disabled={!clip}
              onClick={() => clip && updateClip(clip.id, { loop: !clip.loop })}
            >
              <Repeat className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Loop clip</TooltipContent>
        </Tooltip>

        {/* Time */}
        <div className="flex items-center gap-1 ml-1">
          <span className="text-[11px] tabular-nums text-foreground font-mono font-medium">
            {formatTime(currentTime)}
          </span>
          <span className="text-muted-foreground/50 text-[11px]">/</span>
          <span className="text-[10px] tabular-nums text-muted-foreground font-mono">
            {formatTime(clip?.duration ?? 0)}
          </span>
        </div>

        {/* Duration */}
        {clip && (
          <div className="flex items-center gap-1 ml-1 pl-2 border-l">
            <span className="text-[10px] text-muted-foreground">dur</span>
            <Input
              type="number" min={0.5} max={300} step={0.5}
              value={clip.duration}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v > 0) updateClip(clip.id, { duration: v })
              }}
              className="h-5 w-14 text-[10px] px-1.5 tabular-nums font-mono"
            />
            <span className="text-[10px] text-muted-foreground">s</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Insert keyframe buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm" variant="ghost"
              className="h-6 gap-1.5 text-[10px] px-2 rounded-md"
              disabled={!clip || !selectedId}
              onClick={() => selectedId && captureKeyframe(selectedId)}
            >
              <Diamond className="h-2.5 w-2.5 fill-primary text-primary" />
              Key <kbd className="font-mono text-[9px] opacity-40 ml-0.5">I</kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert object keyframe at {formatTime(currentTime)}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm" variant="ghost"
              className="h-6 gap-1.5 text-[10px] px-2 rounded-md"
              disabled={!clip}
              onClick={() => captureCameraKeyframe()}
            >
              <Clapperboard className="h-2.5 w-2.5 text-blue-400" />
              Cam <kbd className="font-mono text-[9px] opacity-40 ml-0.5">C</kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert camera keyframe at {formatTime(currentTime)}</TooltipContent>
        </Tooltip>

        {/* Shortcuts */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6">
                  <Keyboard className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Keyboard shortcuts</TooltipContent>
          </Tooltip>
          <PopoverContent side="top" align="end" className="w-60 p-3 z-[200]">
            <p className="text-xs font-semibold mb-2">Keyboard Shortcuts</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              {[
                ['G', 'Move'], ['R', 'Rotate'], ['S', 'Scale'],
                ['I', 'Insert key'], ['C', 'Camera key'],
                ['Space', 'Play / Pause'], ['T', 'Toggle timeline'],
                ['Del', 'Delete'], ['Ctrl+D', 'Duplicate'], ['Esc', 'Deselect'],
              ].map(([key, desc]) => (
                <div key={key} className="contents">
                  <kbd className="font-mono bg-muted px-1 rounded text-[9px] self-center">{key}</kbd>
                  <span className="text-muted-foreground self-center">{desc}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

// ─── Timeline panel ───────────────────────────────────────────────────────────

export function TimelinePanel() {
  const [height, setHeight] = useState(220)

  return (
    <div
      className="flex flex-col flex-shrink-0 bg-background"
      style={{ height }}
    >
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ClipList />
        <div className="flex flex-1 min-w-0 min-h-0 flex-col">
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <TrackLabels />
            <TrackArea />
          </div>
        </div>
      </div>
      <PlaybackBar timelineHeight={height} onHeightChange={setHeight} />
    </div>
  )
}
