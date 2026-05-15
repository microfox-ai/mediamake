"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toolbar } from './toolbar'
import { ObjectListPanel } from './object-list-panel'
import { Viewport } from './viewport'
import { PropertiesPanel } from './properties-panel'
import { TimelinePanel } from './timeline-panel'
import { useSceneStore } from './scene-store'
import type { ViewportHandle } from './viewport'

const MIN_SIDEBAR = 160
const MAX_SIDEBAR = 480

function useKeyboardShortcuts() {
  const setTransformMode  = useSceneStore(s => s.setTransformMode)
  const removeObject      = useSceneStore(s => s.removeObject)
  const duplicateObject   = useSceneStore(s => s.duplicateObject)
  const selectObject      = useSceneStore(s => s.selectObject)
  const setIsPlaying      = useSceneStore(s => s.setIsPlaying)
  const stopAnimation     = useSceneStore(s => s.stopAnimation)
  const captureKeyframe        = useSceneStore(s => s.captureKeyframe)
  const captureCameraKeyframe  = useSceneStore(s => s.captureCameraKeyframe)
  const toggleTimeline         = useSceneStore(s => s.toggleTimeline)

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

      const s = useSceneStore.getState()

      switch (e.key) {
        case 'g': case 'G':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); setTransformMode('translate') }
          break
        case 'r': case 'R':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); setTransformMode('rotate') }
          break
        case 's': case 'S':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); setTransformMode('scale') }
          break
        case 'Delete': case 'Backspace':
          if (s.selectedId) { e.preventDefault(); removeObject(s.selectedId) }
          break
        case 'd': case 'D':
          if ((e.ctrlKey || e.metaKey) && s.selectedId) { e.preventDefault(); duplicateObject(s.selectedId) }
          break
        case 'Escape':
          selectObject(null)
          stopAnimation()
          break
        case ' ':
          e.preventDefault()
          if (s.clips.length > 0) setIsPlaying(!s.isPlaying)
          break
        case 'i': case 'I':
          if (!e.ctrlKey && !e.metaKey && s.activeClipId) {
            e.preventDefault()
            if (s.selectedId) captureKeyframe(s.selectedId)
            else captureCameraKeyframe()
          }
          break
        case 'c': case 'C':
          if (!e.ctrlKey && !e.metaKey && s.activeClipId) {
            e.preventDefault()
            captureCameraKeyframe()
          }
          break
        case 't': case 'T':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleTimeline() }
          break
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [setTransformMode, removeObject, duplicateObject, selectObject, setIsPlaying, stopAnimation, captureKeyframe, captureCameraKeyframe, toggleTimeline])
}

// ─── Resize handle ────────────────────────────────────────────────────────────

function ResizeHandle({
  onDrag,
  side,
}: {
  onDrag: (delta: number) => void
  side: 'left' | 'right'
}) {
  const dragging = useRef(false)
  const lastX = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastX.current = e.clientX
    e.preventDefault()

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = ev.clientX - lastX.current
      lastX.current = ev.clientX
      onDrag(side === 'left' ? delta : -delta)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onDrag, side])

  return (
    <div
      className="w-1 flex-shrink-0 cursor-col-resize group relative hover:bg-primary/30 transition-colors"
      onMouseDown={onMouseDown}
    >
      <div className="absolute inset-y-0 -left-0.5 -right-0.5 group-hover:bg-primary/20 rounded-full transition-colors" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Studio3DPage() {
  const viewportRef  = useRef<ViewportHandle | null>(null)
  const showTimeline = useSceneStore(s => s.showTimeline)
  useKeyboardShortcuts()

  const [leftWidth,  setLeftWidth]  = useState(208)
  const [rightWidth, setRightWidth] = useState(240)

  const handleLeftResize  = useCallback((delta: number) => {
    setLeftWidth(w => Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, w + delta)))
  }, [])
  const handleRightResize = useCallback((delta: number) => {
    setRightWidth(w => Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, w + delta)))
  }, [])

  return (
    <TooltipProvider delayDuration={400}>
      <div className="fixed inset-0 z-[40] flex flex-col overflow-hidden bg-background">
        <Toolbar viewportRef={viewportRef} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left sidebar */}
          <div
            className="flex-shrink-0 flex flex-col min-h-0 overflow-hidden border-r"
            style={{ width: leftWidth }}
          >
            <ObjectListPanel />
          </div>

          <ResizeHandle onDrag={handleLeftResize} side="left" />

          {/* Viewport */}
          <div className="flex-1 min-w-0 relative overflow-hidden">
            <Viewport ref={viewportRef} />
          </div>

          <ResizeHandle onDrag={handleRightResize} side="right" />

          {/* Right sidebar */}
          <div
            className="flex-shrink-0 flex flex-col min-h-0 overflow-hidden border-l"
            style={{ width: rightWidth }}
          >
            <PropertiesPanel />
          </div>
        </div>

        {showTimeline && <TimelinePanel />}
      </div>
    </TooltipProvider>
  )
}
