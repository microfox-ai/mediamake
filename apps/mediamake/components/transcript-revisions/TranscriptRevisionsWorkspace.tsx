'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon, FolderOpenIcon, KeyboardIcon, LoaderIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Hint, isTextField, useKeys } from '@/components/revisions/keyboard';
import { lineOf, wordAt } from '@/lib/transcript-revisions/transcript';
import type { MarkKind } from '@/lib/transcript-revisions/types';
import { MarksPanel } from './MarksPanel';
import { SongsPanel } from './SongsPanel';
import { LinesList, Stage } from './Stage';
import { WordTimeline } from './WordTimeline';
import { RATES, useTranscriptStore } from './store';

/*
 * /transcript-revision: review a song's timed words by ear. Open a folder of songs (a channel folder whose song
 * folders each hold <audio>.transcript.json beside the audio), play a song with its words lit as they're sung, pause
 * where something is off and mark it, or drag the words' times on the timeline. The marks and moved words are saved
 * as a revision beside the transcript, and "Copy for Claude" gives the text to paste in the chat; Claude changes the
 * transcript. In development the folder can be named in the link: ?path=/Users/…/Downloads/GIZ&song=<song folder>.
 */

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause'],
  ['← →', '2 s back / ahead (⇧: 0.5 s)'],
  ['R', 'Play the line on screen from its start'],
  ['↑ ↓', 'Previous / next line'],
  [', .', 'Previous / next word (selects it)'],
  ['P', 'Play the selected word'],
  ['W', 'Mark a wrong word'],
  ['T', 'Mark a wrong timing'],
  ['M', 'Mark a missing word'],
  ['X', 'Mark an extra word (not sung)'],
  ['N', 'Write a note'],
  ['S / E', 'Selected word starts / ends at the playhead'],
  ['⌥ ← →', 'Move the selected word 0.02 s (⇧: 0.1 s)'],
  ['Drag a word', 'Its edges: start or end; its middle: move it (⇧ the rest of the line too, ⌥ past its neighbours)'],
  ['- =', 'Zoom the timeline out / in (⌘-scroll too)'],
  ['[ ]', 'Slower / faster'],
  ['⌥ ↑ ↓', 'Previous / next song'],
  ['C', 'Copy the revision for Claude'],
  ['Esc', 'Deselect the word'],
  ['Mod S', 'Save now'],
  ['?', 'Show these shortcuts'],
];

const MARK_BY_KEY: Record<string, MarkKind> = { w: 'wrong-word', t: 'wrong-timing', m: 'missing-word', x: 'extra-word', n: 'note' };

function ShortcutKeys({ keys }: { keys: string }) {
  return <>{useKeys(keys)}</>;
}

function stepLine(d: number) {
  const s = useTranscriptStore.getState();
  const l = lineOf(s.lines, wordAt(s.words, s.time + s.lead));
  const at = l ? s.lines.indexOf(l) : -1;
  const next = s.lines[Math.max(0, Math.min(s.lines.length - 1, at + d))];
  if (!next) return;
  s.selectWord(null);
  s.seek(Math.max(0, next.start - 0.3));
}

function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useTranscriptStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void s.flushSave();
        return;
      }
      if (isTextField(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('[role="menu"],[role="listbox"],[role="dialog"]')) return;
      if (mod) return;
      if (e.altKey) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          s.stepSong(e.key === 'ArrowUp' ? -1 : 1);
        } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && s.selected !== null) {
          e.preventDefault();
          const w = s.words[s.selected];
          const d = (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 0.1 : 0.02);
          if (w) s.setTimes([{ i: w.i, start: Math.max(0, w.start + d), end: Math.max(0, w.end + d) }]);
        }
        return;
      }
      if (!s.song) return;
      const key = e.key.toLowerCase();
      if (MARK_BY_KEY[key] && !e.shiftKey) {
        e.preventDefault();
        s.addMark(MARK_BY_KEY[key]);
        return;
      }
      switch (e.key) {
        case ' ':
          if (target?.closest('button,a,[role="button"]')) target.blur();
          e.preventDefault();
          s.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          s.nudge(e.shiftKey ? -0.5 : -2);
          break;
        case 'ArrowRight':
          e.preventDefault();
          s.nudge(e.shiftKey ? 0.5 : 2);
          break;
        case 'ArrowUp':
          e.preventDefault();
          stepLine(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          stepLine(1);
          break;
        case ',':
          s.stepWord(-1);
          break;
        case '.':
          s.stepWord(1);
          break;
        case 'r':
        case 'R':
          s.replayLine();
          break;
        case 'p':
        case 'P': {
          const w = s.selected !== null ? s.words[s.selected] : null;
          if (w) s.playRange(w.start - 0.15, w.end + 0.15);
          else toast.message('Select a word first (click it)');
          break;
        }
        case 's':
        case 'S':
          s.setEdgeAtPlayhead('start');
          break;
        case 'e':
        case 'E':
          s.setEdgeAtPlayhead('end');
          break;
        case '-':
        case '_':
          s.zoom(1);
          break;
        case '=':
        case '+':
          s.zoom(-1);
          break;
        case '[':
          s.setRate(RATES[Math.max(0, RATES.indexOf(s.rate) - 1)]);
          break;
        case ']':
          s.setRate(RATES[Math.min(RATES.length - 1, RATES.indexOf(s.rate) + 1)]);
          break;
        case 'c':
        case 'C':
          void s.copyInstructions();
          break;
        case 'Escape':
          s.selectWord(null);
          break;
        case '?':
          s.setShortcutsOpen(!s.shortcutsOpen);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function SaveIndicator() {
  const saveState = useTranscriptStore(s => s.saveState);
  if (saveState === 'error')
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <TriangleAlertIcon className="size-3.5" /> Not saved
      </span>
    );
  if (saveState === 'saving')
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
  const song = useTranscriptStore(s => s.song);
  const words = useTranscriptStore(s => s.words.length);
  const unheard = useTranscriptStore(s => s.words.filter(w => w.verified && w.verified !== 'heard').length);
  const checks = useTranscriptStore(s => s.lines.filter(l => l.check).length);
  const reloadSong = useTranscriptStore(s => s.reloadSong);
  const shortcutsOpen = useTranscriptStore(s => s.shortcutsOpen);
  const setShortcutsOpen = useTranscriptStore(s => s.setShortcutsOpen);
  return (
    <header className="flex h-9 shrink-0 items-center gap-3 border-b px-2">
      <Hint label="Back to the app" side="bottom">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link href="/app">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
      </Hint>
      <span className="text-sm font-semibold">Transcript Revisions</span>
      {song && (
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          <span className="text-foreground">{song.entry.folder || song.entry.title}</span> · {words} words
          {unheard ? ` · ${unheard} not heard by a transcription` : ''}
          {checks ? ` · ${checks} lines to check` : ''}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <Hint label="Songs are mastered and compared here" side="bottom">
          <Link href="/remaster-revision" className="text-xs text-muted-foreground hover:text-foreground">
            Remaster revisions
          </Link>
        </Hint>
        <Hint label="Videos are reviewed here" side="bottom">
          <Link href="/video-revision" className="text-xs text-muted-foreground hover:text-foreground">
            Video revisions
          </Link>
        </Hint>
        <SaveIndicator />
        {song && (
          <Hint label="Read the transcript again (after Claude changed it)" side="bottom">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void reloadSong()}>
              <RefreshCwIcon className="size-4" />
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

function Empty() {
  const support = useTranscriptStore(s => s.support);
  const pickRoot = useTranscriptStore(s => s.pickRoot);
  const error = useTranscriptStore(s => s.error);
  const loading = useTranscriptStore(s => s.loading);
  const root = useTranscriptStore(s => s.root);
  if (support === 'browser' || support === 'insecure')
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {support === 'browser' ? 'This screen reads folders on your computer through the File System Access API: open it in Chrome, Edge or another Chromium browser.' : 'This screen needs a secure page (https or localhost) to read folders.'}
      </div>
    );
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" /> {loading}
        </p>
      ) : root ? (
        <p className="text-sm text-muted-foreground">{error ?? 'Pick a song on the left.'}</p>
      ) : (
        <>
          <p className="max-w-md text-sm text-muted-foreground">
            Open a folder of songs: a channel folder whose song folders each hold <code>&lt;audio&gt;.transcript.json</code> beside the audio, or one song's folder. Play a song with its words lit as
            they're sung, mark what's wrong and fix word times on the timeline. Your marks are saved beside the transcript for Claude; nothing is uploaded.
          </p>
          {error && <p className="max-w-md text-xs text-destructive">{error}</p>}
          <Button onClick={() => void pickRoot()}>
            <FolderOpenIcon className="size-4" /> Open a folder
          </Button>
        </>
      )}
    </div>
  );
}

function Center() {
  const song = useTranscriptStore(s => s.song);
  if (!song) return <Empty />;
  // the stage and the timeline stay in view; only the song's lines scroll under them
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-3 p-4">
      <Stage />
      <WordTimeline />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <LinesList />
      </div>
    </div>
  );
}

export function TranscriptRevisionsWorkspace() {
  const init = useTranscriptStore(s => s.init);
  const flushSave = useTranscriptStore(s => s.flushSave);

  useShortcuts();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flushSave();
    };
    const onBeforeUnload = () => void flushSave();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [flushSave]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <ResizablePanelGroup direction="horizontal" autoSaveId="transcript-revisions" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={17} minSize={10} maxSize={30}>
          <SongsPanel />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={60} minSize={35}>
          <Center />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={23} minSize={16} maxSize={40}>
          <MarksPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
