'use client';

import { useEffect, useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { isTextField } from '@/components/revisions/keyboard';
import { handlesFromDrop } from '@/lib/local-media/file-access';
import { resetElement, resetPropFields, setElementEdit } from '@/lib/remotion-editor/edits';
import { EditorHeader } from './EditorHeader';
import { ElementsPanel } from './ElementsPanel';
import { Inspector } from './Inspector';
import { Stage } from './Stage';
import { player, selectDirty, useEditor } from './store';
import { Transport } from './Transport';

function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 's') {
        e.preventDefault();
        void s.save();
        return;
      }
      if (isTextField(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod || e.altKey || !s.compiled) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('[role="menu"],[role="listbox"],[role="dialog"]')) return;

      const fps = s.compiled.project.fps;
      const seek = (frame: number) => {
        player.current?.pause();
        player.current?.seekTo(Math.min(s.durationInFrames - 1, Math.max(0, frame)));
      };
      const id = s.selectedId;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          player.current?.toggle();
          break;
        case ',':
        case '.':
          seek(s.frame + (e.key === '.' ? 1 : -1));
          break;
        case 'Escape':
          s.select(null);
          break;
        case 'Delete':
        case 'Backspace':
          if (!id) break;
          e.preventDefault();
          s.change(ed => {
            const info = s.selected;
            const next = resetElement(ed, id);
            return info?.layer && info.propsPath !== null
              ? resetPropFields(next, info.layer, info.propsPath, info.fields)
              : next;
          });
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          e.preventDefault();
          const sign = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
          if (!id) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              seek(s.frame + sign * (e.shiftKey ? fps : 1));
            }
            break;
          }
          const step = (e.shiftKey ? 10 : 1) * sign;
          const horizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
          const cur = s.edits.elements[id] ?? {};
          s.change(
            ed =>
              setElementEdit(
                ed,
                id,
                horizontal ? { x: (cur.x ?? 0) + step } : { y: (cur.y ?? 0) + step },
                { label: s.selected?.label, at: s.frame / fps },
              ),
            { coalesce: `nudge:${id}` },
          );
          break;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

/** Saves a moment after the last change, and never in the middle of a drag. */
function useAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useEditor.subscribe((s, prev) => {
      if (s.edits === prev.edits && s.dragging === prev.dragging) return;
      clearTimeout(timer);
      if (!s.dragging) timer = setTimeout(() => void useEditor.getState().save(), 600);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}

/** Claude (or an editor) may change the project's code or edits.json while the page is open. */
function useDiskWatch() {
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') void useEditor.getState().checkDisk();
    };
    const poll = setInterval(check, 2000);
    window.addEventListener('focus', check);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!selectDirty(useEditor.getState())) return;
      void useEditor.getState().save();
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', check);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);
}

export function RemotionEditorWorkspace() {
  const init = useEditor(s => s.init);
  const openDropped = useEditor(s => s.openDropped);
  const [dragging, setDragging] = useState(false);
  useShortcuts();
  useAutosave();
  useDiskWatch();

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden bg-background"
      onDragOver={e => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={e => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={e => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(false);
        // handles must be taken synchronously, before the event returns
        void handlesFromDrop(e.dataTransfer).then(openDropped);
      }}
    >
      <EditorHeader />
      <ResizablePanelGroup
        direction="vertical"
        autoSaveId="remotion-editor-vertical"
        className="min-h-0 flex-1"
      >
        <ResizablePanel defaultSize={82} minSize={40}>
          <ResizablePanelGroup direction="horizontal" autoSaveId="remotion-editor-horizontal">
            <ResizablePanel defaultSize={18} minSize={12} maxSize={35}>
              <ElementsPanel />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={58} minSize={30}>
              <Stage />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={24} minSize={16} maxSize={40}>
              <Inspector />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={18} minSize={10} maxSize={40}>
          <Transport />
        </ResizablePanel>
      </ResizablePanelGroup>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-lg border-2 border-dashed border-primary px-8 py-6 text-sm font-medium">
            Drop the lyrics_videos folder to open its projects
          </div>
        </div>
      )}
    </div>
  );
}
