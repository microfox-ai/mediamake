'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon, CircleCheckIcon, FolderOpenIcon, KeyboardIcon, LoaderIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Hint, isTextField, useKeys } from '@/components/revisions/keyboard';
import { cn } from '@/lib/utils';
import { LONG_WORD, momentAt } from '@/lib/transcript-cleaner/transcript';
import type { MarkKind } from '@/lib/transcript-cleaner/types';
import { MarksPanel } from './MarksPanel';
import { SongsPanel } from './SongsPanel';
import { LinesEditor } from './LinesEditor';
import { Stage } from './Stage';
import { WordTimeline } from './WordTimeline';
import { isLong } from './WordMenu';
import { RATES, useTranscriptStore } from './store';

/*
 * /transcript-cleaner, the Transcript Cleaner: clean a song's timed words by ear. Open a folder of songs (a channel
 * folder whose song folders each hold <audio>.transcript.json beside the audio), play a song with its words lit as
 * they're sung, pause where something is off and mark it, drag the words' times on the timeline, or right-click a word
 * to delete, rewrite or re-line it. Everything is saved as a revision beside the transcript, and "Copy for Claude"
 * gives the text to paste in the chat; Claude changes the transcript. A song that's right is marked clean (a green
 * check in the song list). In development the folder can be named in the link:
 * ?path=/Users/…/Downloads/GIZ&song=<song folder>.
 */

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause'],
  ['← →', '2 s back / ahead (⇧: 0.5 s)'],
  ['R', 'Play the line on screen from its start'],
  ['↑ ↓', 'Previous / next line'],
  [', .', 'Previous / next word (selects it)'],
  ['P', 'Play the selected word'],
  ['Mod Z', 'Undo a word edit: split, join, push, delete, rewrite (⇧: redo)'],
  ['Right-click a word', 'Its menu: rewrite, delete, mark, new line, join, push to the next or previous line, trim'],
  ['↵', 'Rewrite the selected word'],
  ['⌫', 'Delete the selected word (again: keep it)'],
  ['W', 'Mark a wrong word'],
  ['T', 'Mark a wrong timing'],
  ['M', 'Mark a missing word'],
  ['X', 'Mark an extra word (not sung)'],
  ['N', 'Write a note'],
  ['S / E', 'Selected word starts / ends at the playhead'],
  ['⌥ ← →', 'Move the selected word 0.02 s (⇧: 0.1 s)'],
  ['Drag a word', 'Its edges: start or end; its middle: move it (⇧ the rest of the line too); it may overlap others'],
  ['- =', 'Zoom the timeline out / in (⌘-scroll too)'],
  ['[ ]', 'Slower / faster'],
  ['⌥ ↑ ↓', 'Previous / next song'],
  ['C', 'Copy the revision for Claude'],
  ['⇧ C', 'Mark the song clean (again: not clean)'],
  ['Esc', 'Deselect the word'],
  ['Mod S', 'Save now'],
  ['?', 'Show these shortcuts'],
];

/** In the song's lines under the timeline, where a caret moves through the words as in a text editor. */
const LINE_SHORTCUTS: [string, string][] = [
  ['Click a word', 'The caret there (its right half: after it), the song to its start'],
  ['↵', 'Split the line at the caret: the words after it become a new line'],
  ['⌫', 'At a line’s start: join it to the line above; else strike out the word before the caret'],
  ['⌦', 'Strike out the word after the caret (fn ⌫ on a Mac); at a line’s end: join the next line on'],
  ['← → ↑ ↓', 'Move the caret (Home, End or Mod ← →: the line’s ends)'],
  ['⇧ ↵', 'Rewrite the word at the caret'],
  ['W T M X N S E P', 'As everywhere, on the word at the caret; Space still plays'],
  ['Esc', 'Leave the lines'],
];

const MARK_BY_KEY: Record<string, MarkKind> = { w: 'wrong-word', t: 'wrong-timing', m: 'missing-word', x: 'extra-word', n: 'note' };

function ShortcutKeys({ keys }: { keys: string }) {
  return <>{useKeys(keys)}</>;
}

function stepLine(d: number) {
  const s = useTranscriptStore.getState();
  const at = s.lines.length ? momentAt(s.words, s.lines, s.time + s.lead).line : -1;
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
      if (mod) {
        // ⌘Z undoes the last word edit (a split, a join, a push, a delete, a rewrite), ⇧⌘Z or Ctrl+Y redoes it
        const key = e.key.toLowerCase();
        if ((key === 'z' || key === 'y') && !e.altKey) {
          e.preventDefault();
          if (key === 'y' || e.shiftKey) s.redo();
          else s.undo();
        }
        return;
      }
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
          // ⇧C marks the song clean (by the shift key, not the letter's case: Caps Lock alone still copies)
          if (e.shiftKey) void s.toggleClean();
          else void s.copyInstructions();
          break;
        case 'Enter': {
          if (target?.closest('button,a,[role="button"]:not([data-slot="context-menu-trigger"])')) break;
          if (s.selected === null) {
            toast.message('Select a word first (click it), then press Enter to rewrite it');
            break;
          }
          e.preventDefault();
          const w = s.words[s.selected];
          // rewritten on the stage: its line stays there while the box is open
          if (w) s.startRewrite(w.i, 'stage');
          break;
        }
        case 'Backspace':
        case 'Delete':
          e.preventDefault();
          if (s.selected !== null) s.toggleDelete(s.selected);
          else toast.message('Select a word first (click it), then press ⌫ to delete it');
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

function CleanButton() {
  const clean = useTranscriptStore(s => !!s.song?.entry.clean);
  const toggleClean = useTranscriptStore(s => s.toggleClean);
  return (
    <Hint label={clean ? 'Marked clean: click to unmark' : 'Mark this transcript clean: you went through it and it is right'} keys="⇧ C" side="bottom">
      <Button
        variant={clean ? 'secondary' : 'outline'}
        size="sm"
        className={cn('h-7 gap-1 px-2 text-xs', clean && 'text-emerald-400 hover:text-emerald-300')}
        onClick={() => void toggleClean()}
      >
        <CircleCheckIcon className={cn('size-3.5', clean && 'text-emerald-400')} />
        {clean ? 'Clean' : 'Mark clean'}
      </Button>
    </Hint>
  );
}

function Header() {
  const song = useTranscriptStore(s => s.song);
  const words = useTranscriptStore(s => s.words.length);
  const long = useTranscriptStore(s => s.words.filter(isLong).length);
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
      <span className="text-sm font-semibold">Transcript Cleaner</span>
      {song && (
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          <span className="text-foreground">{song.entry.folder || song.entry.title}</span> · {words} words
          {unheard ? ` · ${unheard} not heard by a transcription` : ''}
          {checks ? ` · ${checks} lines to check` : ''}
          {long ? <span className="text-amber-300" title={`Words ${LONG_WORD} s or longer: the aligner may have stretched them across a gap`}>{` · ${long} long words`}</span> : ''}
        </span>
      )}
      {song && <CleanButton />}
      <div className="ml-auto flex items-center gap-3">
        <Hint label="Songs are mastered and compared here" side="bottom">
          <Link href="/stem-player" className="text-xs text-muted-foreground hover:text-foreground">
            Stem Player
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
          <PopoverContent align="end" className="max-h-[min(80vh,var(--radix-popover-content-available-height))] w-[26rem] overflow-y-auto p-3">
            {[
              ['Shortcuts', SHORTCUTS],
              ['In the song’s lines', LINE_SHORTCUTS],
            ].map(([title, list], n) => (
              <div key={n} className={cn(n > 0 && 'mt-3 border-t pt-3')}>
                <div className="mb-2 text-xs font-semibold">{title as string}</div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {(list as [string, string][]).map(([keys, label]) => (
                    <div key={keys} className="contents">
                      <dt className="font-mono text-muted-foreground">
                        <ShortcutKeys keys={keys} />
                      </dt>
                      <dd>{label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
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
        <LinesEditor />
      </div>
    </div>
  );
}

export function TranscriptCleanerWorkspace() {
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
      <ResizablePanelGroup direction="horizontal" autoSaveId="transcript-cleaner" className="min-h-0 flex-1">
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
