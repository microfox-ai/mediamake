"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Eye, EyeOff, Trash2, Copy, ChevronUp, ChevronDown, Pencil, Check, X, ChevronRight,
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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
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

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Objects
        </span>
        <span className="text-xs text-muted-foreground">{objects.length}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1 space-y-0.5">
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
            const indent      = obj.groupId ? 'pl-4' : ''
            // Hide children of collapsed groups
            if (obj.groupId && collapsedGroups.has(obj.groupId)) return null

            return (
              <div
                key={obj.id}
                className={cn(
                  'group flex items-center gap-1.5 rounded px-2 py-1 cursor-pointer text-xs transition-colors select-none',
                  indent,
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
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={e => { e.stopPropagation(); updateObject(obj.id, { visible: !obj.visible }) }}
                      >
                        {obj.visible
                          ? <Eye className="h-3 w-3" />
                          : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{obj.visible ? 'Hide' : 'Show'}</TooltipContent>
                  </Tooltip>

                  {/* Rename */}
                  {!isEditing && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
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
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
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
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
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
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
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
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 hover:text-destructive"
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
      </ScrollArea>
    </div>
  )
}
