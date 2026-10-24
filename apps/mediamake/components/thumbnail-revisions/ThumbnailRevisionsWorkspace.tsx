'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon, FolderOpenIcon, KeyboardIcon, LoaderIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Hint, isTextField, useKeys } from '@/components/revisions/keyboard';
import { JobsPanel } from './JobsPanel';
import { RevisionPanel } from './RevisionPanel';
import { ThumbGrid } from './ThumbGrid';
import { ZoomView } from './ZoomView';
import { useThumbRevisionsStore } from './store';

const SHORTCUTS: [string, string][] = [
  ['Click', 'Select / unselect (several at once)'],
  ['⇧ click', 'Select a range'],
  ['⌥ click', 'Select only that one'],
  ['Double-click', 'Zoom in on it'],
  ['Mod A / Esc', 'Select all / none'],
  ['Space or Z', 'Zoom in on the selection'],
  ['F / K / D', 'Final / keep / drop the selection'],
  ['C or Enter', 'Write a comment'],
  ['Mod Enter', 'Add the comment'],
  ['N', 'New revision'],
  ['Mod S', 'Save now'],
  ['In zoom: ← →', 'Previous / next thumbnail'],
  ['In zoom: click', 'Pin a comment to that spot'],
  ['In zoom: L / V', 'Magnifier / feed-size preview'],
  ['?', 'Show these shortcuts'],
];

function ShortcutKeys({ keys }: { keys: string }) {
  return <>{useKeys(keys)}</>;
}

function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useThumbRevisionsStore.getState();
      if (store.zoom) return; // the zoom view has its own keys
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void store.flushSaves();
        return;
      }
      if (isTextField(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (!store.job) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('[role="menu"],[role="listbox"],[role="dialog"]')) return;
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        store.selectAll();
        return;
      }
      if (mod || e.altKey) return;
      switch (e.key) {
        case 'Escape':
          store.clearSelection();
          break;
        case ' ':
        case 'z':
        case 'Z':
          e.preventDefault();
          store.openZoom();
          break;
        case 'f':
        case 'F':
          void store.toggleAction('final');
          break;
        case 'k':
        case 'K':
          void store.toggleAction('keep');
          break;
        case 'd':
        case 'D':
          void store.toggleAction('drop');
          break;
        case 'c':
        case 'C':
        case 'Enter':
          if (target?.closest('button,a,[role="button"]') && e.key === 'Enter') return;
          e.preventDefault();
          store.requestComposerFocus();
          break;
        case 'n':
        case 'N':
          void store.newRevision();
          break;
        case '?':
          store.setShortcutsOpen(!store.shortcutsOpen);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function SaveIndicator() {
  const saveState = useThumbRevisionsStore(s => s.saveState);
  const anyDirty = useThumbRevisionsStore(s => Object.values(s.dirty).some(Boolean));
  if (saveState === 'error')
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <TriangleAlertIcon className="size-3.5" /> Not saved
      </span>
    );
  if (saveState === 'saving' || anyDirty)
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <LoaderIcon className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  if (saveState === 'saved')
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <CheckIcon className="size-3.5" /> Saved to disk
      </span>
    );
  return null;
}

function Header() {
  const job = useThumbRevisionsStore(s => s.job);
  const renders = useThumbRevisionsStore(s => Object.keys(s.renders).length);
  const pickJob = useThumbRevisionsStore(s => s.pickJob);
  const shortcutsOpen = useThumbRevisionsStore(s => s.shortcutsOpen);
  const setShortcutsOpen = useThumbRevisionsStore(s => s.setShortcutsOpen);
  return (
    <header className="flex h-9 shrink-0 items-center gap-3 border-b px-2">
      <Hint label="Back to projects" side="bottom">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link href="/projects">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
      </Hint>
      <span className="text-sm font-semibold">Thumbnail Revisions</span>
      {job && (
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {job.index.title && <span className="text-foreground">{job.index.title} · </span>}
          {job.name} · {renders} thumbnails
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <Hint label="Video renders are reviewed here" side="bottom">
          <Link href="/remotion-revision" className="text-xs text-muted-foreground hover:text-foreground">
            Remotion revisions
          </Link>
        </Hint>
        <SaveIndicator />
        {job && (
          <Hint label="Open another job" side="bottom">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void pickJob()}>
              <FolderOpenIcon className="size-4" />
            </Button>
          </Hint>
        )}
        <Popover open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <Hint label="Keyboard shortcuts" keys="?" side="bottom">
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <KeyboardIcon className="size-4" />
              </Button>
            </PopoverTrigger>
          </Hint>
          <PopoverContent align="end" className="w-80 p-3">
            <div className="mb-2 text-xs font-semibold">Shortcuts</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {SHORTCUTS.map(([keys, label]) => (
                <div key={keys} className="contents">
                  <dt className="font-mono text-muted-foreground">
                    <ShortcutKeys keys={keys} />
                  </dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}

export function ThumbnailRevisionsWorkspace() {
  const init = useThumbRevisionsStore(s => s.init);
  const refresh = useThumbRevisionsStore(s => s.refresh);
  const rescanSources = useThumbRevisionsStore(s => s.rescanSources);
  const flushSaves = useThumbRevisionsStore(s => s.flushSaves);

  useShortcuts();

  useEffect(() => {
    void init();
  }, [init]);

  // Claude re-renders thumbnails and answers revisions while we're away: re-read on focus and every 5 s.
  useEffect(() => {
    const onFocus = () => {
      void refresh();
      void rescanSources();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') onFocus();
      else void flushSaves();
    };
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, rescanSources, flushSaves]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.values(useThumbRevisionsStore.getState().dirty).some(Boolean)) {
        void flushSaves();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flushSaves]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <ResizablePanelGroup direction="horizontal" autoSaveId="thumbnail-revisions" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={16} minSize={10} maxSize={30}>
          <JobsPanel />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={60} minSize={35}>
          <ThumbGrid />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={24} minSize={18} maxSize={40}>
          <RevisionPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
      <ZoomView />
    </div>
  );
}
