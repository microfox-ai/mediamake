"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Save, Trash2, FolderOpen, Download, Upload } from 'lucide-react'
import { useSceneStore } from './scene-store'

interface Props {
  open: boolean
  onClose: () => void
}

export function ScenePresetsDialog({ open, onClose }: Props) {
  const savedSlots      = useSceneStore(s => s.savedSlots)
  const saveSceneSlot   = useSceneStore(s => s.saveSceneSlot)
  const loadSceneSlot   = useSceneStore(s => s.loadSceneSlot)
  const deleteSceneSlot = useSceneStore(s => s.deleteSceneSlot)
  const importSceneJSON = useSceneStore(s => s.importSceneJSON)

  const [slotName, setSlotName]       = useState('')
  const [importText, setImportText]   = useState('')
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSave = () => {
    const name = slotName.trim() || `Scene ${savedSlots.length + 1}`
    saveSceneSlot(name)
    setSlotName('')
  }

  const handleExportJSON = () => {
    const { objects, clips, activeClipId } = useSceneStore.getState()
    const json = JSON.stringify({ objects, clips, activeClipId }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `scene_${Date.now()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  const handleImportText = () => {
    setImportError('')
    const err = importSceneJSON(importText)
    if (err) {
      setImportError(err)
    } else {
      setImportText('')
      onClose()
    }
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const err = importSceneJSON(reader.result as string)
      if (err) setImportError(err)
      else onClose()
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const fmtDate = (ts: number) => {
    try { return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) }
    catch { return String(ts) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Scenes</DialogTitle>
        </DialogHeader>

        {/* Save new slot */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Save Current Scene</Label>
          <div className="flex gap-2">
            <Input
              value={slotName}
              onChange={e => setSlotName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="Slot name (optional)"
              className="h-8 text-xs flex-1"
            />
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>

        {/* Saved slots */}
        {savedSlots.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
              {savedSlots.map(slot => (
                <div key={slot.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{slot.name}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(slot.timestamp)} · {slot.snapshot.objects.length} object{slot.snapshot.objects.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Button
                    size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"
                    title="Load scene"
                    onClick={() => { if (confirm(`Load "${slot.name}"? Current scene will be replaced.`)) { loadSceneSlot(slot.id); onClose() } }}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0 hover:text-destructive"
                    title="Delete slot"
                    onClick={() => deleteSceneSlot(slot.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {savedSlots.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-2">No saved scenes yet.</p>
        )}

        <Separator />

        {/* Export / Import JSON */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">JSON Export / Import</Label>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleExportJSON}>
              <Download className="h-3.5 w-3.5" /> Export JSON
            </Button>
          </div>

          <textarea
            value={importText}
            onChange={e => { setImportText(e.target.value); setImportError('') }}
            placeholder='Paste scene JSON here…'
            rows={4}
            className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {importError && (
            <p className="text-[11px] text-destructive">{importError}</p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm" variant="default" className="h-7 gap-1.5 text-xs flex-1"
              disabled={!importText.trim()}
              onClick={handleImportText}
            >
              Import from text
            </Button>
            <label className="inline-flex items-center gap-1.5 h-7 px-3 text-xs rounded-md border border-input cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors font-medium">
              <Upload className="h-3.5 w-3.5" /> From file
              <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" onChange={handleImportFile} />
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
