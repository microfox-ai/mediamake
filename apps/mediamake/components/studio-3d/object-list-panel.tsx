"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Eye, EyeOff, Trash2, Copy, ChevronUp, ChevronDown, Pencil, Check, X, ChevronRight,
  Lock, Unlock,
} from 'lucide-react'
import { useSceneStore } from './scene-store'
import { OBJECT_ICONS } from './types'
import { cn } from '@/lib/utils'

export function ObjectListPanel() {
  const objects         = useSceneStore(s => s.objects)
  const selectedId      = useSceneStore(s => s.selectedId)
  const selectedIds     = useSceneStore(s => s.selectedIds)
  const selectObject    = useSceneStore(s => s.selectObject)
  const toggleSelectObject = useSceneStore(s => s.toggleSelectObject)
  const removeObject    = useSceneStore(s => s.removeObject)
  const duplicateObject = useSceneStore(s => s.duplicateObject)
  const updateObject    = useSceneStore(s => s.updateObject)
  const moveObject      = useSceneStore(s => s.moveObject)
  const reparentObject  = useSceneStore(s => s.reparentObject)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleCollapse = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = () => {
    if (editingId && editingName.trim()) {
      updateObject(editingId, { name: editingName.trim() })
    }
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    if (!dragId || dragId === targetId) { setDragId(null); return }
    const targetObj = objects.find(o => o.id === targetId)
    if (!targetObj) { setDragId(null); return }
    if (targetObj.type === 'group') {
      reparentObject(dragId, targetId)
    } else if (targetObj.groupId) {
      reparentObject(dragId, targetObj.groupId)
    } else {
      reparentObject(dragId, null)
    }
    setDragId(null)
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Objects
        </span>
        <span className="text-xs text-muted-foreground">{objects.length}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          className="p-1 space-y-0.5"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (dragId) { reparentObject(dragId, null); setDragId(null); setDragOverId(null) } }}
        >
          {objects.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-3">
              No objects. Use Add in the toolbar.
            </p>
          )}

          {[...objects].reverse().map((obj) => {
            const isSelected  = selectedId === obj.id
            const isInSel     = selectedIds.includes(obj.id)
            const isEditing   = editingId === obj.id
            const isGroupType = obj.type === 'group'
            const isCollapsed = collapsedGroups.has(obj.id)
            const isDragOver  = dragOverId === obj.id && dragId !== obj.id
            const indent      = obj.groupId ? 'pl-4' : ''
            if (obj.groupId && collapsedGroups.has(obj.groupId)) return null

            return (
              <div
                key={obj.id}
                draggable={!isEditing}
                onDragStart={e => { setDragId(obj.id); e.dataTransfer.effectAllowed = 'move' }}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(obj.id) }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={e => { e.stopPropagation(); handleDrop(e, obj.id) }}
                onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                className={cn(
                  'group flex items-center gap-1.5 rounded px-2 py-1 cursor-pointer text-xs transition-colors select-none',
                  indent,
                  isDragOver && 'ring-1 ring-primary/50 bg-primary/5',
                  dragId === obj.id && 'opacity-40',
                  isSelected
                    ? 'bg-accent text-accent-foreground'
                    : isInSel
                      ? 'bg-primary/10 text-foreground'
                      : 'hover:bg-muted/60 text-foreground',
                )}
                onClick={e => {
                  if (isEditing) return
                  if (e.shiftKey) toggleSelectObject(obj.id)
                  else selectObject(obj.id)
                }}
              >
                {/* Collapse toggle for groups */}
                {isGroupType && (
                  <button
                    className="w-3 h-3 flex-shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={e => { e.stopPropagation(); toggleCollapse(obj.id) }}
                  >
                    <ChevronRight className={cn('h-3 w-3 transition-transform', !isCollapsed && 'rotate-90')} />
                  </button>
                )}
                {!isGroupType && obj.groupId && (
                  <span className="w-3 flex-shrink-0" />
                )}

                {/* Lock indicator */}
                {obj.locked && (
                  <Lock className="h-2.5 w-2.5 flex-shrink-0 text-amber-500" />
                )}

                {/* Type icon */}
                <span className="text-[11px] w-4 flex-shrink-0 text-center">{OBJECT_ICONS[obj.type]}</span>

                {/* Name / inline edit */}
                {isEditing ? (
                  <Input
                    ref={inputRef}
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    onBlur={commitEdit}
                    className="h-5 text-xs px-1 py-0 flex-1 min-w-0"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 truncate min-w-0 flex items-center gap-1">
                    {obj.name}
                    {isGroupType && (
                      <span className="text-[9px] text-muted-foreground flex-shrink-0">
                        ({objects.filter(o => o.groupId === obj.id).length})
                      </span>
                    )}
                  </span>
                )}

                {/* Action buttons — visible on hover or when selected */}
                <div className={cn(
                  'flex items-center gap-0.5 flex-shrink-0',
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}>
                  {/* Visibility */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon" variant="ghost" className="h-5 w-5"
                        onClick={e => { e.stopPropagation(); updateObject(obj.id, { visible: !obj.visible }) }}
                      >
                        {obj.visible
                          ? <Eye className="h-3 w-3" />
                          : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{obj.visible ? 'Hide' : 'Show'}</TooltipContent>
                  </Tooltip>

                  {/* Lock / Unlock */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon" variant="ghost" className="h-5 w-5"
                        onClick={e => { e.stopPropagation(); updateObject(obj.id, { locked: !obj.locked }) }}
                      >
                        {obj.locked
                          ? <Lock className="h-3 w-3 text-amber-500" />
                          : <Unlock className="h-3 w-3" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{obj.locked ? 'Unlock' : 'Lock'}</TooltipContent>
                  </Tooltip>

                  {/* Rename */}
                  {!isEditing && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon" variant="ghost" className="h-5 w-5"
                          onClick={e => { e.stopPropagation(); startEdit(obj.id, obj.name) }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Rename</TooltipContent>
                    </Tooltip>
                  )}

                  {/* Duplicate */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon" variant="ghost" className="h-5 w-5"
                        onClick={e => { e.stopPropagation(); duplicateObject(obj.id) }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Duplicate</TooltipContent>
                  </Tooltip>

                  {/* Move up/down */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon" variant="ghost" className="h-5 w-5"
                        onClick={e => { e.stopPropagation(); moveObject(obj.id, 'up') }}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Move up in list</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon" variant="ghost" className="h-5 w-5"
                        onClick={e => { e.stopPropagation(); moveObject(obj.id, 'down') }}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Move down in list</TooltipContent>
                  </Tooltip>

                  {/* Delete */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon" variant="ghost" className="h-5 w-5 hover:text-destructive"
                        onClick={e => { e.stopPropagation(); removeObject(obj.id) }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
