'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon, CopyIcon, FolderOpenIcon, FolderSearchIcon, KeyboardIcon, LoaderIcon, TriangleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';
import { absolutePath, copyPath, revealOrCopy } from '@/lib/file-revisions/reveal';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hint, isTextField, useKeys } from '@/components/revisions/keyboard';
import { LaddersPanel } from './LaddersPanel';
import { RevisionPanel } from './RevisionPanel';
import { Timeline } from './Timeline';
import { Versions } from './Versions';
import { useRemasterStore } from './store';

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause'],
  ['1–9 or A–Z', 'Listen to that version (same moment, no gap)'],
  ['↑ ↓', 'Previous / next version'],
  ['← →', '5 s back / ahead (⇧: 1 s)'],
  ['Home', 'Back to the start'],
  ['Drag on the waveform', 'Choose a range to loop (click: seek)'],
  ['[ ]', 'Loop start / end at the playhead'],
  ['L', 'Loop the range on / off'],
  ['Esc / double-click', 'Clear the range'],
  ['M', 'Match levels on / off'],
  ['Enter / Delete', 'Final / drop the version playing'],
  ['N', 'Write a note on the version playing'],
  ['T', 'Attach the moment to the note'],
  ['Mod Enter', 'Add the note'],
  ['Mod S', 'Save now'],
  ['?', 'Show these shortcuts'],
];

function ShortcutKeys({ keys }: { keys: string }) {
  return <>{useKeys(keys)}</>;
}

function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useRemasterStore.getState();
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
      if (mod || e.altKey) return;
      const versions = store.job.ladder.versions;
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const byKey = versions.find(v => v.key === key);
      if (byKey && key !== ' ') {
        e.preventDefault();
        store.setActive(byKey.id);
        return;
      }
      switch (e.key) {
        case ' ':
          e.preventDefault();
          store.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          store.nudge(e.shiftKey ? -1 : -5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          store.nudge(e.shiftKey ? 1 : 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          store.stepActive(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          store.stepActive(1);
          break;
        case 'Home':
          e.preventDefault();
          store.seek(0);
          break;
        case '[':
          store.setLoopEdge('start');
          break;
        case ']':
          store.setLoopEdge('end');
          break;
        case 'l':
        case 'L':
          if (store.loop) store.setLooping(!store.looping);
          else toast.message('Drag on the waveform to choose a range to loop ([ and ] set its edges at the playhead)');
          break;
        case 'Escape':
          store.setLoop(null);
          break;
        case 'm':
        case 'M':
          store.setMatched(!store.matched);
          break;
        case 'Enter':
          if (target?.closest('button,a,[role="button"]')) return;
          e.preventDefault();
          if (store.active) void store.toggleAction('final', store.active);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (store.active) void store.toggleAction('drop', store.active);
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          store.requestComposerFocus();
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
  const saveState = useRemasterStore(s => s.saveState);
  const anyDirty = useRemasterStore(s => Object.values(s.dirty).some(Boolean));
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
  const job = useRemasterStore(s => s.job);
  const pickJob = useRemasterStore(s => s.pickJob);
  const shortcutsOpen = useRemasterStore(s => s.shortcutsOpen);
  const setShortcutsOpen = useRemasterStore(s => s.setShortcutsOpen);
  const path = job ? absolutePath(job.ladder.index) : null;
  return (
    <header className="flex h-9 shrink-0 items-center gap-3 border-b px-2">
      <Hint label="Back to projects" side="bottom">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link href="/core/projects">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
      </Hint>
      <span className="text-sm font-semibold">Remaster Revisions</span>
      {job && (
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          <span className="text-foreground">{job.ladder.title}</span> · {job.path ?? job.name} · {job.ladder.versions.length} versions
          {job.ladder.remaster?.note ? ` · ${job.ladder.remaster.note}` : ''}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <Hint label="Images, videos and any other files are reviewed here" side="bottom">
          <Link href="/file-revision" className="text-xs text-muted-foreground hover:text-foreground">
            File revisions
          </Link>
        </Hint>
        <Hint label="Videos are reviewed here, with comments on frames and ranges" side="bottom">
          <Link href="/video-revision" className="text-xs text-muted-foreground hover:text-foreground">
            Video revisions
          </Link>
        </Hint>
        <SaveIndicator />
        {job && (
          <span className="flex items-center">
            <Hint label={`Show the ladder's folder in Finder${path ? '' : ' (no path recorded: copies its name)'}`} side="bottom">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void revealOrCopy(path, job.path ?? job.name)}>
                <FolderSearchIcon className="size-4" />
              </Button>
            </Hint>
            <Hint label="Copy the ladder's folder path" side="bottom">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void copyPath(path, job.path ?? job.name)}>
                <CopyIcon className="size-4" />
              </Button>
            </Hint>
          </span>
        )}
        {job && (
          <Hint label="Open another ladder" side="bottom">
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
          <PopoverContent align="end" className="w-96 p-3">
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

function Empty() {
  const support = useRemasterStore(s => s.support);
  const pickJob = useRemasterStore(s => s.pickJob);
  if (support === 'browser' || support === 'insecure')
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {support === 'browser' ? 'This screen reads folders on your computer through the File System Access API: open it in Chrome, Edge or another Chromium browser.' : 'This screen needs a secure page (https or localhost) to read folders.'}
      </div>
    );
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="max-w-md text-sm text-muted-foreground">
        Open a remaster ladder (a song's <code>remaster/v1</code> folder with its versions as WAV, MP3 or FLAC). Every version loads once and plays from one shared playhead: switch between them mid-song and judge the difference, loop a chorus, mark the final and leave notes. Nothing is uploaded.
      </p>
      <Button onClick={() => void pickJob()}>
        <FolderOpenIcon className="size-4" /> Open a folder
      </Button>
    </div>
  );
}

function Stage() {
  const job = useRemasterStore(s => s.job);
  if (!job) return <Empty />;
  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Timeline />
        <Versions />
      </div>
    </ScrollArea>
  );
}

export function RemasterRevisionsWorkspace() {
  const init = useRemasterStore(s => s.init);
  const refresh = useRemasterStore(s => s.refresh);
  const rescanSources = useRemasterStore(s => s.rescanSources);
  const flushSaves = useRemasterStore(s => s.flushSaves);

  useShortcuts();

  useEffect(() => {
    void init();
  }, [init]);

  // Claude answers revisions and writes remaster.json while we're away: re-read on focus and every 5 s.
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
      if (Object.values(useRemasterStore.getState().dirty).some(Boolean)) {
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
      <ResizablePanelGroup direction="horizontal" autoSaveId="remaster-revisions" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={16} minSize={10} maxSize={30}>
          <LaddersPanel />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={60} minSize={35}>
          <Stage />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={24} minSize={18} maxSize={40}>
          <RevisionPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
