"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Download, Loader2, X, Film, Camera } from 'lucide-react'
import { useSceneStore } from './scene-store'
import type { ViewportHandle } from './viewport'

interface Props {
  open: boolean
  onClose: () => void
  viewportRef: React.RefObject<ViewportHandle | null>
}

const RESOLUTIONS = [
  { label: '720p',  w: 1280, h: 720 },
  { label: '1080p', w: 1920, h: 1080 },
  { label: '1440p', w: 2560, h: 1440 },
  { label: '4K',    w: 3840, h: 2160 },
]

const FPS_OPTIONS = [24, 30, 60]

// Bitrate by resolution (Mbps)
function suggestedBitrate(w: number, h: number, fps: number): number {
  const pixels = w * h
  if (pixels >= 3840 * 2160) return fps >= 50 ? 60_000_000 : 35_000_000
  if (pixels >= 2560 * 1440) return fps >= 50 ? 28_000_000 : 18_000_000
  if (pixels >= 1920 * 1080) return fps >= 50 ? 16_000_000 :  9_000_000
  return fps >= 50 ? 8_000_000 : 5_000_000
}

type Phase = 'idle' | 'preparing' | 'rendering' | 'finalizing' | 'done' | 'error'

export function HighQualityRenderDialog({ open, onClose, viewportRef }: Props) {
  const clips        = useSceneStore(s => s.clips)
  const activeClipId = useSceneStore(s => s.activeClipId)

  const [resIdx,   setResIdx]   = useState(1)        // default 1080p
  const [fpsIdx,   setFpsIdx]   = useState(1)        // default 30
  const [duration, setDuration] = useState<number>(0)
  const [phase,    setPhase]    = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)        // 0–1
  const [error,    setError]    = useState<string>('')
  const [downloadUrl, setDownloadUrl] = useState<string>('')
  const cancelRef = useRef(false)

  const activeClip = clips.find(c => c.id === activeClipId) ?? clips[0]
  const res = RESOLUTIONS[resIdx]
  const fps = FPS_OPTIONS[fpsIdx]

  // Sync duration to clip when opening
  useEffect(() => {
    if (open && activeClip) setDuration(activeClip.duration)
  }, [open, activeClip])

  const reset = useCallback(() => {
    cancelRef.current = false
    setPhase('idle')
    setProgress(0)
    setError('')
    if (downloadUrl) { URL.revokeObjectURL(downloadUrl); setDownloadUrl('') }
  }, [downloadUrl])

  const handleClose = useCallback(() => {
    cancelRef.current = true
    reset()
    onClose()
  }, [reset, onClose])

  const handleCancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  const handleRender = useCallback(async () => {
    if (!activeClip) { setError('No active clip to render.'); setPhase('error'); return }
    const handle = viewportRef.current
    if (!handle) { setError('Viewport not ready.'); setPhase('error'); return }
    const canvas = handle.getCanvas()
    if (!canvas) { setError('Canvas not available.'); setPhase('error'); return }

    reset()
    setPhase('preparing')

    // Pause normal playback
    const store = useSceneStore.getState()
    store.setIsPlaying(false)

    // Resize renderer to target resolution
    handle.setRenderSize({ width: res.w, height: res.h })
    await new Promise(r => requestAnimationFrame(() => r(null)))   // let resize settle

    // Pre-warm: render frame 0 once so the canvas surface is fully initialized
    handle.renderFrameAt(activeClip.id, 0)
    await new Promise(r => requestAnimationFrame(() => r(null)))

    const totalFrames = Math.max(1, Math.round(duration * fps))
    const frameMs     = 1000 / fps
    const bitrate     = suggestedBitrate(res.w, res.h, fps)

    // ── Choose the best MediaRecorder mime type ───────────────────────────
    const mimeCandidates = [
      'video/mp4;codecs=avc1',           // Safari, recent Chrome
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    const mimeType = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm'
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'

    let recorder: MediaRecorder
    try {
      const stream = (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(fps)
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate })
    } catch (e) {
      setError('MediaRecorder failed to initialize: ' + (e instanceof Error ? e.message : String(e)))
      setPhase('error')
      handle.setRenderSize(null)
      return
    }

    const chunks: BlobPart[] = []
    recorder.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunks.push(e.data) }

    const finalize = () => new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
      recorder.onerror = (ev: Event) => reject(new Error((ev as ErrorEvent).message || 'Recorder error'))
      if (recorder.state === 'recording') recorder.stop()
    })

    recorder.start()
    setPhase('rendering')

    // ── Frame loop: render each frame at real-time pace ──────────────────
    // We pace at wall-clock 1/fps so MediaRecorder captures at the expected
    // framerate. If the GPU can't keep up the recording will be slow but
    // correctly proportioned in time.
    const startedAt = performance.now()
    for (let i = 0; i < totalFrames; i++) {
      if (cancelRef.current) break
      const t = (i / fps)

      // Wait until wall clock catches up to this frame's slot
      const slotAt = startedAt + i * frameMs
      const now = performance.now()
      if (now < slotAt) {
        await new Promise(r => setTimeout(r, slotAt - now))
      }

      // Render frame
      handle.renderFrameAt(activeClip.id, Math.min(t, activeClip.duration - 0.0001))
      // Allow the browser to actually paint
      await new Promise(r => requestAnimationFrame(() => r(null)))

      setProgress(i / totalFrames)
    }

    setPhase('finalizing')

    let blob: Blob
    try {
      blob = await finalize()
    } catch (e) {
      setError('Encoder finalize failed: ' + (e instanceof Error ? e.message : String(e)))
      setPhase('error')
      handle.setRenderSize(null)
      return
    }

    // Restore viewport size
    handle.setRenderSize(null)

    if (cancelRef.current) { setPhase('idle'); return }

    const url = URL.createObjectURL(blob)
    setDownloadUrl(url)
    setProgress(1)
    setPhase('done')

    // Auto-download
    const a = document.createElement('a')
    a.href = url
    a.download = `studio3d_${activeClip.name.replace(/\s+/g, '_')}_${res.label}_${fps}fps.${ext}`
    a.click()
  }, [activeClip, viewportRef, res, fps, duration, reset])

  const totalFrames = Math.max(1, Math.round(duration * fps))
  const estSeconds  = totalFrames / fps
  const busy = phase !== 'idle' && phase !== 'done' && phase !== 'error'

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !busy) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Film className="h-4 w-4" /> High Quality Render
          </DialogTitle>
        </DialogHeader>

        {!activeClip ? (
          <p className="text-xs text-muted-foreground py-2">
            No animation clip available to render. Create or load a template first.
          </p>
        ) : (
          <>
            {/* Clip info */}
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <p className="font-medium truncate">{activeClip.name}</p>
              <p className="text-muted-foreground">
                Clip duration: {activeClip.duration.toFixed(2)}s · {activeClip.tracks.length} tracks
              </p>
            </div>

            {/* Resolution */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Resolution</Label>
              <div className="grid grid-cols-4 gap-1">
                {RESOLUTIONS.map((r, i) => (
                  <button
                    key={r.label}
                    disabled={busy}
                    onClick={() => setResIdx(i)}
                    className={`h-7 rounded border text-[11px] transition-colors ${
                      i === resIdx ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'
                    } disabled:opacity-50`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {res.w}×{res.h}px
              </p>
            </div>

            {/* Framerate */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Framerate</Label>
              <div className="grid grid-cols-3 gap-1">
                {FPS_OPTIONS.map((f, i) => (
                  <button
                    key={f}
                    disabled={busy}
                    onClick={() => setFpsIdx(i)}
                    className={`h-7 rounded border text-[11px] transition-colors ${
                      i === fpsIdx ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'
                    } disabled:opacity-50`}
                  >
                    {f} fps
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Duration</Label>
                <span className="text-[10px] tabular-nums text-muted-foreground">{duration.toFixed(2)}s</span>
              </div>
              <Slider
                value={[duration]}
                min={0.5}
                max={activeClip.duration}
                step={0.1}
                onValueChange={([v]) => setDuration(v)}
                disabled={busy}
              />
            </div>

            <Separator />

            {/* Summary */}
            <div className="rounded-md bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground space-y-0.5">
              <div className="flex justify-between"><span>Frames</span><span className="tabular-nums">{totalFrames}</span></div>
              <div className="flex justify-between"><span>Output duration</span><span className="tabular-nums">{estSeconds.toFixed(2)}s</span></div>
              <div className="flex justify-between"><span>Bitrate</span><span className="tabular-nums">{(suggestedBitrate(res.w, res.h, fps) / 1_000_000).toFixed(1)} Mbps</span></div>
            </div>

            {/* Phase / progress */}
            {phase !== 'idle' && (
              <div className="rounded-md border px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    {(phase === 'preparing' || phase === 'rendering' || phase === 'finalizing') && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    {phase === 'done' && <Camera className="h-3 w-3 text-emerald-500" />}
                    {phase === 'error' && <X className="h-3 w-3 text-destructive" />}
                    <span className="font-medium capitalize">{phase}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${phase === 'error' ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                {error && <p className="text-[10px] text-destructive">{error}</p>}
                {phase === 'done' && downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" /> Download again
                  </a>
                )}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Pauses live playback and renders frame-by-frame at the target framerate. The viewport
              will briefly resize to the output resolution; it is restored automatically when finished.
              Heavy scenes may render slower than real-time — that&apos;s expected; the resulting video
              is still played back at the requested fps.
            </p>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              {busy ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCancel}>
                  Cancel
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleClose}>
                    Close
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleRender}>
                    <Film className="h-3.5 w-3.5" />
                    {phase === 'done' ? 'Render Again' : 'Start Render'}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
