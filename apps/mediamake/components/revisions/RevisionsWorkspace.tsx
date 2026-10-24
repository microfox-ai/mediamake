'use client';

import { useEffect, useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { handlesFromDrop } from '@/lib/local-media/file-access';
import { useRevisionsStore } from './store';
import { isTextField } from './keyboard';
import { RevisionsHeader } from './RevisionsHeader';
import { FilesPanel } from './FilesPanel';
import { togglePlayerFullscreen, VideoStage } from './VideoStage';
import { RevisionTimeline } from './RevisionTimeline';
import { RevisionPanel } from './RevisionPanel';

/**
 * Window-wide shortcuts. ⌘/Ctrl + arrows jump between shots, ⌘/Ctrl + [ / ]
 * set the selection's start / end, and ⌘/Ctrl + P or ⌥/Ctrl/⌘ + Space play,
 * all from anywhere, text boxes included (plain Space types there).
 * Blocking ⌘← and ⌘[ also stops Chrome's "Back", ⌘P its print dialog.
 */
function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useRevisionsStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const inText = isTextField(e.target);

      if (
        mod &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        !e.altKey
      ) {
        if (!store.video) return;
        e.preventDefault();
        store.jump(
          e.key === 'ArrowRight' ? 1 : -1,
          e.shiftKey ? 'section' : 'shot',
        );
        return;
      }
      // By character or key position, so other layouts work too; ⌘⇧[ ] stay
      // Chrome's tab switching.
      const bracketIn = e.key === '[' || e.code === 'BracketLeft';
      const bracketOut = e.key === ']' || e.code === 'BracketRight';
      if (mod && (bracketIn || bracketOut) && !e.shiftKey && !e.altKey) {
        if (!store.video) return;
        e.preventDefault();
        if (bracketIn) store.setIn();
        else store.setOut();
        return;
      }
      // ⌘Space is Spotlight on macOS, so ⌘P, ⌥Space and ⌃Space are accepted too.
      if (
        (mod && e.key.toLowerCase() === 'p' && !e.shiftKey && !e.altKey) ||
        ((mod || e.altKey) && e.code === 'Space')
      ) {
        if (!store.video) return;
        e.preventDefault();
        store.togglePlay();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void store.flushSaves();
        return;
      }
      if (!inText && !mod && e.key === '?') {
        store.setShortcutsOpen(!store.shortcutsOpen);
        return;
      }
      if (inText || mod || e.altKey || !store.video) {
        if (inText && e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      // Open menus and selects keep their own arrow/Enter handling.
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('[role="menu"],[role="listbox"],[role="dialog"]'))
        return;
      const onControl = !!target?.closest(
        'button,a,[role="button"],[role="tab"]',
      );
      if (onControl && e.key === 'Enter') return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          store.togglePlay();
          break;
        case ',':
        case '.':
          store.stepFrames(e.key === '.' ? 1 : -1);
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
        case 'm':
        case 'M':
          store.toggleMute();
          break;
        case 'f':
        case 'F':
          togglePlayerFullscreen();
          break;
        case 'n':
        case 'N':
          void store.newRevision();
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
  const init = useRevisionsStore(s => s.init);
  const refreshFromDisk = useRevisionsStore(s => s.refreshFromDisk);
  const rescanSources = useRevisionsStore(s => s.rescanSources);
  const flushSaves = useRevisionsStore(s => s.flushSaves);
  const openDropped = useRevisionsStore(s => s.openDropped);
  const [dragging, setDragging] = useState(false);

  useShortcuts();

  useEffect(() => {
    void init();
  }, [init]);

  // Claude (or another tab) may have edited revision files or rendered new
  // videos while we were away. Sources are rescanned on focus only: a scan
  // touches every video in them.
  useEffect(() => {
    const onFocus = () => {
      void refreshFromDisk();
      void rescanSources();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') onFocus();
      else void flushSaves();
    };
    // Also poll while visible, for edits made while this window keeps focus (second screen).
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshFromDisk();
    }, 5000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshFromDisk, rescanSources, flushSaves]);

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
        e.preventDefault();
        setDragging(false);
        // Handles must be taken synchronously, before the event returns.
        void handlesFromDrop(e.dataTransfer).then(openDropped);
      }}
    >
      <RevisionsHeader />
      <ResizablePanelGroup
        direction="vertical"
        autoSaveId="revisions-vertical"
        className="min-h-0 flex-1"
      >
        <ResizablePanel defaultSize={72} minSize={35}>
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="revisions-horizontal"
          >
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
