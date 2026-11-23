'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { MinusIcon, PauseIcon, PlayIcon, PlusIcon, RotateCcwIcon, Undo2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/revisions/keyboard';
import { cn } from '@/lib/utils';
import { clock, momentAt } from '@/lib/transcript-cleaner/transcript';
import { MARK_LABELS, type TLine, type TWord } from '@/lib/transcript-cleaner/types';
import { RATES, SPANS, useTranscriptStore } from './store';
import { isLong, MARK_KEYS, RewriteInput, useRevisionWords, WordMenu } from './WordMenu';

/*
 * The lyrics as they play: the line on screen large, every word lit while it sounds (shown `lead` seconds early, as the
 * videos show them; several at once when voices overlap), the lines before and after it small. In a gap or an
 * instrumental nothing is lit and the line dims, until the next line comes up. Right-click a word for its menu. Under
 * it the transport and the marking buttons, and at the bottom every line of the song to jump to.
 */

type WordState = 'now' | 'sung' | 'todo';

interface WordProps {
  w: TWord;
  state: WordState;
  big: boolean;
  selected: boolean;
  editing: boolean;
  marked: boolean;
  moved: boolean;
  rewritten: boolean;
  relined: boolean;
}

// props are all plain values, so a word re-renders only when its own state changes (the stage renders every frame)
const Word = memo(function Word({ w, state, big, selected, editing, ...flags }: WordProps) {
  const selectWord = useTranscriptStore(s => s.selectWord);
  const playRange = useTranscriptStore(s => s.playRange);
  if (editing) return <RewriteInput w={w} className={big ? 'text-3xl font-semibold leading-tight' : 'text-base'} />;
  const unconfirmed = w.verified && w.verified !== 'heard';
  const long = isLong(w);
  const was = useTranscriptStore.getState().song?.base[w.i]?.text;
  return (
    <WordMenu w={w} where="stage">
      <span
        role="button"
        tabIndex={-1}
        title={[
          `#${w.i} · ${w.start.toFixed(2)}–${w.end.toFixed(2)} s`,
          unconfirmed ? w.verified : '',
          flags.rewritten && was ? `was “${was}”` : '',
          flags.relined ? 'pushed to this line' : '',
          w.deleted ? 'to delete' : '',
          long ? `${(w.end - w.start).toFixed(1)} s long: may run into a gap` : '',
          'click: select, double-click: play it, right-click: menu',
        ]
          .filter(Boolean)
          .join(' · ')}
        onClick={() => selectWord(w.i, true)}
        onDoubleClick={() => playRange(w.start - 0.15, w.end + 0.15)}
        className={cn(
          'relative cursor-pointer rounded px-[0.12em] transition-colors',
          // the stage is dark in either theme: its words get fixed light colours
          big ? (state === 'todo' ? 'text-zinc-500' : 'text-zinc-50') : 'text-inherit',
          state === 'now' && 'bg-amber-400/20 text-amber-300',
          selected && 'ring-2 ring-sky-400',
          unconfirmed && 'underline decoration-orange-400 decoration-dotted underline-offset-4',
          flags.moved && 'underline decoration-sky-400 decoration-2 underline-offset-4',
          flags.relined && 'underline decoration-violet-400 decoration-2 underline-offset-4',
          flags.rewritten && 'underline decoration-emerald-400 decoration-2 underline-offset-4',
          w.deleted && 'line-through decoration-red-500 decoration-2 opacity-50',
        )}
      >
        {w.text}
        {flags.marked && <span className="absolute -top-1 right-0 size-1.5 rounded-full bg-red-500" />}
        {long && <span className="absolute -bottom-1 left-1/2 h-[3px] w-3 -translate-x-1/2 rounded-full bg-amber-400" />}
      </span>
    </WordMenu>
  );
});

function LineView({ line, active, t, size }: { line: TLine | undefined; active: Set<number>; t: number; size: 'big' | 'small' }) {
  const selected = useTranscriptStore(s => s.selected);
  const editing = useTranscriptStore(s => (s.editing?.where === 'stage' ? s.editing.i : null));
  const { marked, moved, rewritten, relined } = useRevisionWords();
  if (!line) return <div className={size === 'big' ? 'h-12' : 'h-6'} />;
  return (
    <div className={cn('flex flex-wrap justify-center gap-x-1.5 gap-y-1 text-center', size === 'big' ? 'text-3xl font-semibold leading-tight' : 'text-base text-zinc-500')}>
      {line.words.map(w => (
        <Word
          key={w.i}
          w={w}
          state={active.has(w.i) ? 'now' : !w.deleted && w.start <= t ? 'sung' : 'todo'}
          big={size === 'big'}
          marked={marked.has(w.i)}
          moved={moved.has(w.i)}
          rewritten={rewritten.has(w.i)}
          relined={relined.has(w.i)}
          selected={selected === w.i}
          editing={editing === w.i}
        />
      ))}
    </div>
  );
}

function Lyrics() {
  const words = useTranscriptStore(s => s.words);
  const lines = useTranscriptStore(s => s.lines);
  const t = useTranscriptStore(s => s.time + s.lead);
  const editing = useTranscriptStore(s => (s.editing?.where === 'stage' ? s.editing.i : null));
  const moment = useMemo(() => momentAt(words, lines, t), [words, lines, t]);
  const active = useMemo(() => new Set(moment.active), [moment]);
  // a word being rewritten keeps its line on stage
  const at = editing !== null ? Math.max(0, lines.findIndex(l => l.words.some(w => w.i === editing))) : moment.line;
  const line = lines[at];
  const dim = editing === null && (moment.mode === 'gap' || moment.mode === 'after');
  const wait = moment.next ? Math.ceil(moment.next.start - t) : 0;
  return (
    <div className="relative flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-md bg-zinc-950 px-6 py-5">
      <LineView line={lines[at - 1]} active={active} t={t} size="small" />
      <div className={cn('transition-opacity duration-300', dim && 'opacity-35')}>
        <LineView line={line} active={active} t={t} size="big" />
      </div>
      <LineView line={lines[at + 1]} active={active} t={t} size="small" />
      {editing === null && (moment.mode === 'gap' || moment.mode === 'before' || moment.mode === 'after') && (
        <div className="absolute right-3 top-2 font-mono text-[11px] text-zinc-400">
          {moment.mode === 'after' ? '♪ after the last word' : moment.mode === 'before' ? `♪ words start in ${wait} s` : `♪ gap · next line in ${wait} s`}
        </div>
      )}
      {moment.mode === 'coming' && editing === null && <div className="absolute right-3 top-2 font-mono text-[11px] text-zinc-400">coming up</div>}
      {line?.check && (
        <div className="mt-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">The transcript lists this line to check: {line.check.join(' · ')}</div>
      )}
    </div>
  );
}

function Transport() {
  const song = useTranscriptStore(s => s.song);
  const playing = useTranscriptStore(s => s.playing);
  const time = useTranscriptStore(s => s.time);
  const rate = useTranscriptStore(s => s.rate);
  const lead = useTranscriptStore(s => s.lead);
  const span = useTranscriptStore(s => s.span);
  const togglePlay = useTranscriptStore(s => s.togglePlay);
  const replayLine = useTranscriptStore(s => s.replayLine);
  const nudge = useTranscriptStore(s => s.nudge);
  const setRate = useTranscriptStore(s => s.setRate);
  const setLead = useTranscriptStore(s => s.setLead);
  const zoom = useTranscriptStore(s => s.zoom);
  const addMark = useTranscriptStore(s => s.addMark);
  const disabled = !song?.url;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Hint label={playing ? 'Pause' : 'Play'} keys="Space">
        <Button size="sm" className="h-8 w-9 px-0" disabled={disabled} onClick={togglePlay}>
          {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
        </Button>
      </Hint>
      <Hint label="2 s back (⇧: 0.5 s)" keys="←">
        <Button variant="ghost" size="sm" className="h-8 px-2" disabled={disabled} onClick={() => nudge(-2)}>
          <Undo2Icon className="size-4" />
        </Button>
      </Hint>
      <Hint label="Play the line from its start" keys="R">
        <Button variant="ghost" size="sm" className="h-8 px-2" disabled={disabled} onClick={replayLine}>
          <RotateCcwIcon className="size-4" />
        </Button>
      </Hint>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        <span className="text-foreground">{clock(time)}</span> / {clock(song?.duration ?? 0, 0)}
      </span>
      <div className="mx-1 h-5 w-px bg-border" />
      <Hint label="Speed" keys="[ ]">
        <div className="flex overflow-hidden rounded-md border">
          {RATES.map(r => (
            <button key={r} onClick={() => setRate(r)} className={cn('px-1.5 py-0.5 text-[11px] tabular-nums', r === rate ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {r}×
            </button>
          ))}
        </div>
      </Hint>
      <Hint label="Words show this far ahead of the sound (display only: the times saved are audio times)">
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          lead
          <input
            type="number"
            step={0.05}
            min={0}
            max={1}
            value={lead}
            onChange={e => setLead(Number(e.target.value))}
            className="h-6 w-14 rounded border bg-transparent px-1 text-right font-mono text-[11px] text-foreground"
          />
          s
        </label>
      </Hint>
      <Hint label="Timeline zoom" keys="- =">
        <div className="flex items-center text-[11px] text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-6 px-1" disabled={span === SPANS.at(-1)} onClick={() => zoom(1)}>
            <MinusIcon className="size-3" />
          </Button>
          <span className="w-7 text-center font-mono tabular-nums">{span}s</span>
          <Button variant="ghost" size="sm" className="h-6 px-1" disabled={span === SPANS[0]} onClick={() => zoom(-1)}>
            <PlusIcon className="size-3" />
          </Button>
        </div>
      </Hint>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        {MARK_KEYS.map(([kind, key]) => (
          <Hint key={kind} label={`Mark: ${MARK_LABELS[kind].toLowerCase()} (the selected word, else the one on screen)`} keys={key}>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={!song} onClick={() => addMark(kind)}>
              {MARK_LABELS[kind].replace(' (not sung)', '')}
              <kbd className="ml-1 font-mono text-[10px] text-muted-foreground">{key}</kbd>
            </Button>
          </Hint>
        ))}
      </div>
    </div>
  );
}

export function LinesList() {
  const lines = useTranscriptStore(s => s.lines);
  const playing = useTranscriptStore(s => s.playing);
  const current = useTranscriptStore(s => s.lines[momentAt(s.words, s.lines, s.time + s.lead).line]?.key ?? null);
  const seek = useTranscriptStore(s => s.seek);
  const selectWord = useTranscriptStore(s => s.selectWord);
  const { marked, moved, rewritten, relined } = useRevisionWords();
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!playing || !current) return;
    const el = boxRef.current?.querySelector(`[data-line="${CSS.escape(current)}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current, playing]);
  return (
    <div ref={boxRef} className="divide-y divide-border/40 rounded-md border">
      {lines.map(l => {
        const nMarked = l.words.filter(w => marked.has(w.i)).length;
        const nMoved = l.words.filter(w => moved.has(w.i)).length;
        const nEdited = l.words.filter(w => w.deleted || rewritten.has(w.i) || relined.has(w.i)).length;
        const nLong = l.words.filter(isLong).length;
        const unconfirmed = l.words.filter(w => w.verified && w.verified !== 'heard').length;
        return (
          <button
            key={l.key}
            data-line={l.key}
            onClick={() => {
              selectWord(null);
              seek(Math.max(0, l.start - 0.3));
            }}
            className={cn('flex w-full items-baseline gap-3 px-3 py-1 text-left text-sm hover:bg-muted/40', l.key === current && 'bg-amber-400/10')}
          >
            <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{clock(l.start, 1)}</span>
            <span className={cn('min-w-0 flex-1', l.key === current ? 'text-foreground' : 'text-foreground/80')}>
              {l.words.map((w, n) => (
                <span key={w.i} className={cn(w.deleted && 'text-red-400/70 line-through')}>
                  {n ? ' ' : ''}
                  {w.text}
                </span>
              ))}
            </span>
            <span className="flex shrink-0 gap-1 text-[10px]">
              {l.check && <span className="rounded bg-amber-500/15 px-1 text-amber-300" title={l.check.join(' · ')}>check</span>}
              {unconfirmed > 0 && <span className="rounded bg-orange-500/15 px-1 text-orange-300" title="Words no transcription heard (placed by the aligner or unconfirmed)">{unconfirmed} unheard</span>}
              {nLong > 0 && (
                <span className="rounded bg-amber-500/15 px-1 text-amber-300" title="Words 2.5 s or longer: the aligner may have stretched them across a gap">
                  {nLong} long
                </span>
              )}
              {nMoved > 0 && <span className="rounded bg-sky-500/15 px-1 text-sky-300">{nMoved} moved</span>}
              {nEdited > 0 && <span className="rounded bg-emerald-500/15 px-1 text-emerald-300">{nEdited} edited</span>}
              {nMarked > 0 && <span className="rounded bg-red-500/15 px-1 text-red-300">{nMarked} marked</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Stage() {
  return (
    <div className="space-y-3">
      <Lyrics />
      <Transport />
    </div>
  );
}
