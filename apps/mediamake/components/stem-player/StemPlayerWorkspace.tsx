'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon, CopyIcon, FolderOpenIcon, FolderSearchIcon, KeyboardIcon, LoaderIcon, MessageSquareTextIcon, TriangleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';
import { copyPath, revealOrCopy } from '@/lib/file-revisions/reveal';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Hint, isTextField, useKeys } from '@/components/revisions/keyboard';
import { cn } from '@/lib/utils';
import { Lanes } from './Lanes';
import { NotesPanel } from './NotesPanel';
import { Sidebar } from './Sidebar';
import { LevelHint, Transport } from './Transport';
import { absPathOf, isReviewable, jobNameOf, notesVisible, selectCurrent, useStemStore } from './store';

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause (from the start when it is at the end)'],
  ['↑ ↓', 'Previous / next track (the playhead stays)'],
  ['⇧ ↑ ↓', 'Select more tracks: they play together'],
  ['Mod click', 'Add a track to what plays, or take it out'],
  ['⇧ click', 'Select a range of tracks'],
  ['Mod A', 'Every track of this folder'],
  ['1–9', 'That track of this folder (or a version by its letter)'],
  ['← →', '5 s back / ahead (⇧: 1 s)'],
  ['Home', 'Back to the start'],
  ['Drag on the waveform', 'Choose a range to loop (click: seek)'],
  ['[ ]', 'Loop start / end at the playhead'],
  ['L', 'Loop the range on / off'],
  ['Esc / double-click', 'Clear the range'],
  ['M', 'Match levels on / off (a folder of versions)'],
  ['Enter / Delete', 'Final / drop the version you are on'],
  ['N', 'Write a note on it'],
  ['Mod Enter', 'Add the note'],
  ['Mod S', 'Save now'],
  ['?', 'Show these shortcuts'],
];

function ShortcutKeys({ keys }: { keys: string }) {
  return <>{useKeys(keys)}</>;
}

/**
 * The keys work from anywhere on the page except a text box. Sidebar rows never take the focus,
 * and a button that has it is not clicked by the Space that played.
 */
function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useStemStore.getState();
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
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('[role="menu"],[role="dialog"]')) return;
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        store.selectProject();
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) store.togglePlay();
        return;
      }
      // the volume slider keeps its own arrow keys
      const onSlider = !!target?.closest('[role="slider"]');
      const folder = selectCurrent(store);
      const reviewable = isReviewable(folder);
      const focus = store.sel.focus ? store.tracks[store.sel.focus] : undefined;
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
          if (onSlider) return;
          e.preventDefault();
          store.moveFocus(e.key === 'ArrowUp' ? -1 : 1, e.shiftKey);
          return;
        case 'ArrowLeft':
        case 'ArrowRight':
          if (onSlider) return;
          e.preventDefault();
          store.nudge((e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 5));
          return;
        case 'Home':
          e.preventDefault();
          store.seek(0);
          return;
        case '[':
          store.setLoopEdge('start');
          return;
        case ']':
          store.setLoopEdge('end');
          return;
        case 'Escape':
          store.setLoop(null);
          return;
        case '?':
          store.setShortcutsOpen(!store.shortcutsOpen);
          return;
        case 'Enter':
          if (target?.closest('button,a,[role="button"]') || !reviewable || !focus) return;
          e.preventDefault();
          void store.toggleAction('final', focus.id);
          return;
        case 'Delete':
        case 'Backspace':
          if (!reviewable || !focus) return;
          e.preventDefault();
          void store.toggleAction('drop', focus.id);
          return;
      }
      if (e.key.length !== 1) return;
      const key = e.key.toUpperCase();
      if (key === 'L') {
        if (store.loop) store.setLooping(!store.looping);
        else toast.message('Drag on the waveform to choose a range to loop ([ and ] set its edges at the playhead)');
      } else if (key === 'M') {
        if (folder && reviewable) store.setMatched(!store.matched[folder.key]);
        else toast.message('Match levels is for a folder of versions of one song: open Notes to compare versions here');
      } else if (key === 'N') {
        e.preventDefault();
        if (reviewable) store.requestComposerFocus();
        else store.setNotesOpen(true);
      } else if (store.selectByKey(key)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isTextField(e.target)) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}

function SaveIndicator() {
  const review = useStemStore(s => s.review);
  const saveState = useStemStore(s => s.saveState);
  const anyDirty = useStemStore(s => Object.values(s.dirty).some(Boolean));
  if (!review) return null;
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

/** What is heard: the folder's name and the selected tracks' labels. */
function NowPlaying() {
  const folder = useStemStore(selectCurrent);
  const selected = useStemStore(s => s.sel.selected);
  const tracks = useStemStore(s => s.tracks);
  const labels = useMemo(() => selected.map(uid => tracks[uid]?.label).filter(Boolean) as string[], [selected, tracks]);
  if (!folder) return null;
  const title = folder.remaster?.title ?? folder.name;
  return (
    <span className="min-w-0 truncate text-xs text-muted-foreground" title={labels.join(' + ')}>
      <span className="text-foreground">{title}</span>
      {labels.length > 0 && ` · ${labels.length > 4 ? `${labels.length} tracks together` : labels.join(' + ')}`}
      {folder.remaster?.note ? ` · ${folder.remaster.note}` : ''}
    </span>
  );
}

function Header() {
  const folder = useStemStore(selectCurrent);
  const path = useStemStore(s => (folder ? absPathOf(s, folder) : null));
  const name = useStemStore(s => (folder ? jobNameOf(s, folder) : ''));
  const notes = useStemStore(notesVisible);
  const setNotesOpen = useStemStore(s => s.setNotesOpen);
  const shortcutsOpen = useStemStore(s => s.shortcutsOpen);
  const setShortcutsOpen = useStemStore(s => s.setShortcutsOpen);
  return (
    <header className="flex h-9 shrink-0 items-center gap-3 border-b px-2">
      <Hint label="Back to the app" side="bottom">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link href="/app">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
      </Hint>
      <span className="shrink-0 text-sm font-semibold">Stem Player</span>
      <NowPlaying />
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Hint label="Clean a song's timed words by ear" side="bottom">
          <Link href="/transcript-cleaner" className="text-xs text-muted-foreground hover:text-foreground">
            Transcript Cleaner
          </Link>
        </Hint>
        <SaveIndicator />
        {folder && (
          <span className="flex items-center">
            <Hint label={`Show this folder in Finder${path ? '' : ' (its path is not known: copies its name)'}`} side="bottom">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void revealOrCopy(path, name)}>
                <FolderSearchIcon className="size-4" />
              </Button>
            </Hint>
            <Hint label="Copy this folder's path" side="bottom">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void copyPath(path, name)}>
                <CopyIcon className="size-4" />
              </Button>
            </Hint>
          </span>
        )}
        {folder && (
          <Hint label={notes ? 'Hide the notes' : 'Notes, the final pick and Match levels, for versions of one song'} keys="N" side="bottom">
            <Button variant={notes ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => setNotesOpen(!notes)}>
              <MessageSquareTextIcon className="size-4" /> Notes
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
          <PopoverContent align="end" className="w-[26rem] p-3">
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

function KeysLine() {
  const mod = useKeys('Mod');
  const Key = ({ children }: { children: React.ReactNode }) => <kbd className="rounded border px-1 font-mono text-[10px]">{children}</kbd>;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span>
        <Key>Space</Key> play
      </span>
      <span>
        <Key>↑</Key> <Key>↓</Key> move between tracks
      </span>
      <span>
        <Key>⇧</Key> + <Key>↑</Key> <Key>↓</Key> select more
      </span>
      <span>
        <Key>{mod}</Key> + click add or remove
      </span>
      <span>
        <Key>←</Key> <Key>→</Key> 5 s
      </span>
    </p>
  );
}

function Stage() {
  const support = useStemStore(s => s.support);
  const empty = useStemStore(s => s.roots.length === 0);
  const pickRoot = useStemStore(s => s.pickRoot);
  if (empty && (support === 'browser' || support === 'insecure'))
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {support === 'browser' ? 'This screen reads folders on your computer through the File System Access API: open it in Chrome, Edge or another Chromium browser.' : 'This screen needs a secure page (https or localhost) to read folders.'}
      </div>
    );
  if (empty && support === 'ok')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Open a folder of audio: the stems of a song, its versions, or a folder above them. Select tracks in the sidebar to hear them, alone or together, from one playhead that never resets when you switch. Nothing is uploaded.
        </p>
        <Button onClick={() => void pickRoot()}>
          <FolderOpenIcon className="size-4" /> Open a folder
        </Button>
      </div>
    );
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-3 p-4">
        <Lanes />
        <Transport />
        <LevelHint />
        <KeysLine />
      </div>
    </div>
  );
}

export function StemPlayerWorkspace() {
  const init = useStemStore(s => s.init);
  const refresh = useStemStore(s => s.refresh);
  const flushSaves = useStemStore(s => s.flushSaves);
  const notes = useStemStore(notesVisible);

  useShortcuts();

  useEffect(() => {
    void init();
  }, [init]);

  // Claude answers revisions and re-renders versions while we're away: re-read the folder under review on focus and every 5 s.
  useEffect(() => {
    const onFocus = () => void refresh();
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
  }, [refresh, flushSaves]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.values(useStemStore.getState().dirty).some(Boolean)) {
        void flushSaves();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flushSaves]);

  return (
    <div className={cn('relative flex h-screen flex-col overflow-hidden bg-background')}>
      <Header />
      <ResizablePanelGroup direction="horizontal" autoSaveId="stem-player" className="min-h-0 flex-1">
        <ResizablePanel id="sidebar" order={1} defaultSize={22} minSize={14} maxSize={40}>
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="stage" order={2} defaultSize={56} minSize={30}>
          <Stage />
        </ResizablePanel>
        {notes && (
          <>
            <ResizableHandle />
            <ResizablePanel id="notes" order={3} defaultSize={22} minSize={16} maxSize={40}>
              <NotesPanel />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
