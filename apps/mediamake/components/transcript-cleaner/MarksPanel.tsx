'use client';

import { useEffect, useMemo, useRef } from 'react';
import { CheckCheckIcon, ClipboardCopyIcon, PlayIcon, RotateCcwIcon, ScissorsIcon, Trash2Icon, Undo2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Hint } from '@/components/revisions/keyboard';
import { cn } from '@/lib/utils';
import { changeCount, clock, LONG_WORD, longWords, TRIM_TO } from '@/lib/transcript-cleaner/transcript';
import { MARK_LABELS, type LineMove, type Mark, type MarkKind } from '@/lib/transcript-cleaner/types';
import { useTranscriptStore } from './store';

/*
 * The open revision: every mark with the user's note, every word moved on the timeline, deleted, rewritten or pushed to
 * another line (each one undoable), the long words to check, and the button that copies it all for Claude. It saves
 * itself beside the transcript (<song>.transcript.revisions/rev-NNN.json and .md).
 */

const KIND_COLORS: Record<MarkKind, string> = {
  'wrong-word': 'text-red-300 border-red-500/40',
  'wrong-timing': 'text-sky-300 border-sky-500/40',
  'missing-word': 'text-violet-300 border-violet-500/40',
  'extra-word': 'text-orange-300 border-orange-500/40',
  note: 'text-zinc-300 border-zinc-500/40',
};

const PLACEHOLDER: Record<MarkKind, string> = {
  'wrong-word': 'What is sung instead (e.g. "rein, not reign")',
  'wrong-timing': 'What is off (e.g. "comes in a beat later", "the whole line is 1 s early")',
  'missing-word': 'The word(s) sung here that the transcript lacks',
  'extra-word': 'Anything to add (optional)',
  note: 'What to do',
};

function MarkCard({ mark }: { mark: Mark }) {
  const focusMark = useTranscriptStore(s => s.focusMark);
  const setFocusMark = useTranscriptStore(s => s.setFocusMark);
  const updateMark = useTranscriptStore(s => s.updateMark);
  const setMarkKind = useTranscriptStore(s => s.setMarkKind);
  const removeMark = useTranscriptStore(s => s.removeMark);
  const playRange = useTranscriptStore(s => s.playRange);
  const selectWord = useTranscriptStore(s => s.selectWord);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusMark !== mark.id) return;
    ref.current?.focus();
    ref.current?.scrollIntoView({ block: 'nearest' });
    setFocusMark(null);
  }, [focusMark, mark.id, setFocusMark]);
  const from = mark.word ? mark.word.start : mark.at;
  return (
    <div className={cn('space-y-1.5 rounded-md border bg-card/40 p-2', KIND_COLORS[mark.kind].split(' ')[1])}>
      <div className="flex items-center gap-1.5">
        <select
          value={mark.kind}
          onChange={e => setMarkKind(mark.id, e.target.value as MarkKind)}
          className={cn('h-6 rounded border bg-transparent px-1 text-[11px] font-medium', KIND_COLORS[mark.kind])}
        >
          {(Object.keys(MARK_LABELS) as MarkKind[]).map(k => (
            <option key={k} value={k} className="bg-background text-foreground">
              {MARK_LABELS[k]}
            </option>
          ))}
        </select>
        <Hint label="Play from just before it">
          <button
            className="flex items-center gap-1 rounded px-1 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              if (mark.word) selectWord(mark.word.i);
              playRange(from - 1.5, (mark.word?.end ?? mark.at) + 1.5);
            }}
          >
            <PlayIcon className="size-3" /> {clock(mark.at)}
          </button>
        </Hint>
        <Hint label="Remove the mark">
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-1.5 text-muted-foreground" onClick={() => removeMark(mark.id)}>
            <Trash2Icon className="size-3.5" />
          </Button>
        </Hint>
      </div>
      {(mark.word || mark.line) && (
        <div className="text-xs leading-snug">
          {mark.word && (
            <span className="font-medium">
              “{mark.word.text}” <span className="font-mono text-[10px] text-muted-foreground">#{mark.word.i}</span>
            </span>
          )}
          {mark.line && <div className="text-muted-foreground">{mark.line.text}</div>}
        </div>
      )}
      <Textarea
        ref={ref}
        value={mark.note}
        onChange={e => updateMark(mark.id, e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        placeholder={PLACEHOLDER[mark.kind]}
        rows={1}
        className="min-h-7 w-full min-w-0 resize-none px-2 py-1 text-xs md:text-xs"
      />
    </div>
  );
}

function Moves() {
  const revision = useTranscriptStore(s => s.revision);
  const playRange = useTranscriptStore(s => s.playRange);
  const resetWord = useTranscriptStore(s => s.resetWord);
  const resetAll = useTranscriptStore(s => s.resetAll);
  const selectWord = useTranscriptStore(s => s.selectWord);
  const timings = [...(revision?.timings ?? [])].sort((a, b) => a.to.start - b.to.start);
  if (!timings.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center text-xs font-semibold">
        Moved words ({timings.length})
        <Hint label="Put every moved word back where the transcript has it">
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-1.5 text-[11px] text-muted-foreground" onClick={resetAll}>
            <Undo2Icon className="size-3" /> All back
          </Button>
        </Hint>
      </div>
      {timings.map(t => (
        <div key={t.i} className="flex items-center gap-1.5 rounded border border-sky-500/30 px-2 py-1 text-xs">
          <button
            className="min-w-0 flex-1 truncate text-left hover:underline"
            onClick={() => {
              selectWord(t.i);
              playRange(t.to.start - 0.6, t.to.end + 0.6);
            }}
            title="Select it and play it"
          >
            “{t.text}” <span className="font-mono text-[10px] text-muted-foreground">#{t.i}</span>
          </button>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {t.from.start.toFixed(2)}→<span className="text-sky-300">{t.to.start.toFixed(2)}</span>
            {Math.abs(t.to.end - t.to.start - (t.from.end - t.from.start)) > 0.005 && ` (${(t.to.end - t.to.start).toFixed(2)} s)`}
          </span>
          <Hint label="Put it back">
            <Button variant="ghost" size="sm" className="h-5 px-1 text-muted-foreground" onClick={() => resetWord(t.i)}>
              <RotateCcwIcon className="size-3" />
            </Button>
          </Hint>
        </div>
      ))}
    </div>
  );
}

function LongWords() {
  const words = useTranscriptStore(s => s.words);
  const selected = useTranscriptStore(s => s.selected);
  const playRange = useTranscriptStore(s => s.playRange);
  const selectWord = useTranscriptStore(s => s.selectWord);
  const trimWord = useTranscriptStore(s => s.trimWord);
  const long = useMemo(() => longWords(words), [words]);
  if (!long.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold">
        Long words ({long.length}) <span className="font-normal text-muted-foreground">· {LONG_WORD} s or more</span>
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">
        The aligner sometimes stretches a word's start or end across a gap or an instrumental. Play it: trim the side that runs on, or select it and press S or E where it really starts or ends.
      </p>
      {long.map(w => (
        <div key={w.i} className={cn('flex items-center gap-1 rounded border border-amber-500/30 px-2 py-1 text-xs', selected === w.i && 'border-sky-400')}>
          <button
            className="min-w-0 flex-1 truncate text-left hover:underline"
            onClick={() => {
              selectWord(w.i);
              playRange(w.start - 1, w.end + 0.5);
            }}
            title="Select it and play it, from a second before"
          >
            “{w.text}” <span className="font-mono text-[10px] text-muted-foreground">{clock(w.start, 1)}</span>
          </button>
          <span className="shrink-0 font-mono text-[10px] text-amber-300">{(w.end - w.start).toFixed(1)} s</span>
          <Hint label={`Trim its start: keep the last ${TRIM_TO} s`}>
            <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px] text-muted-foreground" onClick={() => trimWord(w.i, 'start')}>
              <ScissorsIcon className="size-3" />
              start
            </Button>
          </Hint>
          <Hint label={`Trim its end: keep the first ${TRIM_TO} s`}>
            <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px] text-muted-foreground" onClick={() => trimWord(w.i, 'end')}>
              <ScissorsIcon className="size-3" />
              end
            </Button>
          </Hint>
        </div>
      ))}
    </div>
  );
}

/** Line moves in runs: the words one push moved together, undone together so the line stays whole. */
function runsOf(moves: LineMove[]): LineMove[][] {
  const runs: LineMove[][] = [];
  for (const m of [...moves].sort((a, b) => a.i - b.i)) {
    const run = runs.at(-1);
    const last = run?.at(-1);
    if (run && last && last.i === m.i - 1 && last.to.stanza === m.to.stanza && last.to.line === m.to.line && last.from.stanza === m.from.stanza && last.from.line === m.from.line) run.push(m);
    else runs.push([m]);
  }
  return runs;
}

function EditRow({ onPlay, onUndo, undo, children }: { onPlay: () => void; onUndo: () => void; undo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded border border-emerald-500/30 px-2 py-1 text-xs">
      <button className="min-w-0 flex-1 truncate text-left hover:underline" onClick={onPlay} title="Select it and play it">
        {children}
      </button>
      <Hint label={undo}>
        <Button variant="ghost" size="sm" className="h-5 px-1 text-muted-foreground" onClick={onUndo}>
          <RotateCcwIcon className="size-3" />
        </Button>
      </Hint>
    </div>
  );
}

function Edits() {
  const revision = useTranscriptStore(s => s.revision);
  const words = useTranscriptStore(s => s.words);
  const selectWord = useTranscriptStore(s => s.selectWord);
  const playRange = useTranscriptStore(s => s.playRange);
  const toggleDelete = useTranscriptStore(s => s.toggleDelete);
  const undoRewrite = useTranscriptStore(s => s.undoRewrite);
  const undoLineMoves = useTranscriptStore(s => s.undoLineMoves);
  const rewrites = [...(revision?.rewrites ?? [])].sort((a, b) => a.i - b.i);
  const runs = runsOf(revision?.lineMoves ?? []);
  const deleted = [...(revision?.deleted ?? [])].sort((a, b) => a.i - b.i);
  const n = rewrites.length + (revision?.lineMoves?.length ?? 0) + deleted.length;
  if (!n) return null;
  const play = (i: number) => {
    const w = words[i];
    if (!w) return;
    selectWord(i);
    playRange(w.start - 0.6, w.end + 0.6);
  };
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold">Edited words ({n})</div>
      {rewrites.map(r => (
        <EditRow key={`rw-${r.i}`} onPlay={() => play(r.i)} onUndo={() => undoRewrite(r.i)} undo="Undo the rewrite">
          <span className="text-muted-foreground line-through">{r.from}</span> → <span className="text-emerald-300">{r.to}</span>{' '}
          <span className="font-mono text-[10px] text-muted-foreground">#{r.i}</span>
        </EditRow>
      ))}
      {runs.map(run => (
        <EditRow key={`ln-${run[0].i}`} onPlay={() => play(run[0].i)} onUndo={() => undoLineMoves(run.map(m => m.i))} undo="Back to their own line">
          “{run.map(m => m.text).join(' ')}” <span className="text-violet-300">→ {run[0].to.line === undefined ? 'another' : `line ${run[0].to.stanza ?? ''}.${run[0].to.line}`}</span>{' '}
          <span className="text-muted-foreground">“{run[0].toLine}”</span>
        </EditRow>
      ))}
      {deleted.map(d => (
        <EditRow key={`del-${d.i}`} onPlay={() => play(d.i)} onUndo={() => toggleDelete(d.i)} undo="Keep it (undo the delete)">
          <span className="text-red-300 line-through">{d.text}</span> <span className="font-mono text-[10px] text-muted-foreground">#{d.i} · delete</span>
        </EditRow>
      ))}
    </div>
  );
}

function HowTo() {
  return (
    <div className="space-y-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">How to review</p>
      <ol className="list-decimal space-y-1 pl-4">
        <li>Play (Space). When something sounds off, pause.</li>
        <li>
          Click the word it's about (or leave it: the word on screen is used), then press <b>W</b> wrong word, <b>T</b> wrong timing, <b>M</b> missing word, <b>X</b> extra word or <b>N</b> note, and type
          what you hear.
        </li>
        <li>
          Or fix a time yourself: drag a word's edges or middle on the timeline (⇧ drags the rest of the line with it); words may overlap. With a word selected, <b>S</b> and <b>E</b> set its start and end
          at the playhead.
        </li>
        <li>
          Right-click a word to <b>rewrite</b> it (↵), <b>delete</b> it (⌫), mark it, or <b>push it to the next or previous line</b>.
        </li>
        <li>
          <b>Copy for Claude</b> and paste it in the chat. Nothing changes in the transcript until Claude applies it.
        </li>
        <li>
          When the song is right, <b>Mark clean</b> (⇧C): it gets a green check in the song list.
        </li>
      </ol>
    </div>
  );
}

export function MarksPanel() {
  const song = useTranscriptStore(s => s.song);
  const revision = useTranscriptStore(s => s.revision);
  const copyInstructions = useTranscriptStore(s => s.copyInstructions);
  const setStatus = useTranscriptStore(s => s.setStatus);
  const marks = [...(revision?.marks ?? [])].sort((a, b) => a.at - b.at);
  const count = changeCount(revision);
  const edits = (revision?.deleted?.length ?? 0) + (revision?.rewrites?.length ?? 0) + (revision?.lineMoves?.length ?? 0);
  if (!song) return <div className="p-4 text-xs text-muted-foreground">Open a song to mark what's wrong in it.</div>;
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold">{revision ? revision.id : 'No revision yet'}</div>
          <div className="text-[10px] text-muted-foreground">
            {revision
              ? `${revision.status === 'ready' ? 'ready for Claude' : revision.status} · ${marks.length} marks · ${revision.timings.length} moved${edits ? ` · ${edits} edited` : ''}`
              : 'starts with your first change'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {revision && (
            <Hint label={revision.status === 'ready' ? 'Reopen it' : 'Mark it ready: you are done with this song for now'}>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setStatus(revision.status === 'ready' ? 'open' : 'ready')}>
                <CheckCheckIcon className={cn('size-4', revision.status === 'ready' && 'text-emerald-400')} />
              </Button>
            </Hint>
          )}
          <Hint label="Copy the marks and changed words as instructions for Claude" keys="C">
            <Button size="sm" className="h-7 px-2 text-xs" disabled={!count} onClick={() => void copyInstructions()}>
              <ClipboardCopyIcon className="size-3.5" /> Copy for Claude
            </Button>
          </Hint>
        </div>
      </div>
      {/* a plain scroller: the note boxes size to their text, which a ScrollArea's table layout lets overflow */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 p-3">
          {marks.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold">Marks ({marks.length})</div>
              {marks.map(m => (
                <MarkCard key={m.id} mark={m} />
              ))}
            </div>
          )}
          <Edits />
          <Moves />
          <LongWords />
          {!count && <HowTo />}
        </div>
      </div>
      <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground" title="Saved beside the transcript, for Claude to read">
        Saves to {song.entry.folder ? `${song.entry.folder}/` : ''}
        {song.entry.title}.transcript.revisions/
      </div>
    </div>
  );
}
