'use client';

import { useEffect, useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { handlesFromDrop } from '@/lib/local-media/file-access';
import { useRevisionsStore } from './store';
import { RevisionsHeader } from './RevisionsHeader';
import { FilesPanel } from './FilesPanel';
import { VideoStage } from './VideoStage';
import { RevisionTimeline } from './RevisionTimeline';
import { RevisionPanel } from './RevisionPanel';

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  if (target.tagName !== 'INPUT') return false;
  const type = (target as HTMLInputElement).type;
  return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset'].includes(type);
}

/**
 * Window-wide shortcuts. ⌘/Ctrl + arrows jump between shots from anywhere,
 * text boxes included (that also stops Chrome's ⌘← "Back").
 */
function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useRevisionsStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const inText = isTextField(e.target);

      if (mod && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey) {
        if (!store.video) return;
        e.preventDefault();
        store.jump(e.key === 'ArrowRight' ? 1 : -1, e.shiftKey ? 'section' : 'shot');
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void store.flushSaves();
        return;
      }
      if (inText || mod || e.altKey || !store.video) {
        if (inText && e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      // Open menus and selects keep their own arrow/Enter handling.
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('[role="menu"],[role="listbox"],[role="dialog"]')) return;
      const onControl = !!target?.closest('button,a,[role="button"],[role="tab"]');
      if (onControl && e.key === 'Enter') return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          store.togglePlay();
          break;
        case 'ArrowLeft':
        case 'ArrowRight': {
          e.preventDefault();
          const sign = e.key === 'ArrowRight' ? 1 : -1;
          if (e.shiftKey) {
            store.pause();
            store.seek(store.currentTime + sign);
          } else {
            store.stepFrames(sign);
          }
          break;
        }
        case 'i':
        case 'I':
          store.setIn();
          break;
        case 'o':
        case 'O':
          store.setOut();
          break;
        case 'l':
        case 'L':
          store.toggleLoop();
          break;
        case 'Escape':
          store.setSelection(null);
          break;
        case 'c':
        case 'C':
        case 'Enter':
          e.preventDefault();
          store.requestComposerFocus();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

export function RevisionsWorkspace() {
  const init = useRevisionsStore((s) => s.init);
  const refreshFromDisk = useRevisionsStore((s) => s.refreshFromDisk);
  const flushSaves = useRevisionsStore((s) => s.flushSaves);
  const openDropped = useRevisionsStore((s) => s.openDropped);
  const [dragging, setDragging] = useState(false);

  useShortcuts();

  useEffect(() => {
    void init();
  }, [init]);

  // Claude (or another tab) may have edited revision files while we were away.
  useEffect(() => {
    const onFocus = () => void refreshFromDisk();
    const onVisible = () => {
      if (document.visibilityState === 'visible') onFocus();
      else void flushSaves();
    };
    // Also poll while visible, for edits made while this window keeps focus (second screen).
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') onFocus();
    }, 5000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshFromDisk, flushSaves]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const { dirty } = useRevisionsStore.getState();
      if (Object.values(dirty).some(Boolean)) {
        void flushSaves();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flushSaves]);

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden bg-background"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        // Handles must be taken synchronously, before the event returns.
        void handlesFromDrop(e.dataTransfer).then(openDropped);
      }}
    >
      <RevisionsHeader />
      <ResizablePanelGroup direction="vertical" autoSaveId="revisions-vertical" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={72} minSize={35}>
          <ResizablePanelGroup direction="horizontal" autoSaveId="revisions-horizontal">
            <ResizablePanel defaultSize={18} minSize={12} maxSize={35}>
              <FilesPanel />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={55} minSize={30}>
              <VideoStage />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={27} minSize={18} maxSize={45}>
              <RevisionPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={28} minSize={14} maxSize={55}>
          <RevisionTimeline />
        </ResizablePanel>
      </ResizablePanelGroup>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-lg border-2 border-dashed border-primary px-8 py-6 text-sm font-medium">
            Drop a folder (or a video) to review it
          </div>
        </div>
      )}
    </div>
  );
}
