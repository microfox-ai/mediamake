'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MinusIcon, PauseIcon, PlayIcon, PlusIcon, RotateCcwIcon, Undo2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/revisions/keyboard';
import { cn } from '@/lib/utils';
import { clock, lineOf, wordAt } from '@/lib/transcript-revisions/transcript';
import { MARK_LABELS, type MarkKind, type TLine, type TWord } from '@/lib/transcript-revisions/types';
import { RATES, SPANS, useTranscriptStore } from './store';

/*
 * The lyrics as they play: the line on screen large, its words lit as they're sung (shown `lead` seconds early, as the
 * videos show them), the lines before and after it dim. Under it the transport and the marking buttons, and at the
 * bottom every line of the song to jump to.
 */

export const MARK_KEYS: [MarkKind, string][] = [
  ['wrong-word', 'W'],
  ['wrong-timing', 'T'],
  ['missing-word', 'M'],
  ['extra-word', 'X'],
  ['note', 'N'],
];

/** Word indexes the open revision marks or moves. */
export function useRevisionWords() {
  const revision = useTranscriptStore(s => s.revision);
  return useMemo(() => {
    const marked = new Set<number>();
    const moved = new Set<number>();
    for (const m of revision?.marks ?? []) if (m.word) marked.add(m.word.i);
    for (const t of revision?.timings ?? []) moved.add(t.i);
    return { marked, moved };
  }, [revision]);
}

function Word({ w, shown, onLine }: { w: TWord; shown: number | null; onLine: boolean }) {
  const selected = useTranscriptStore(s => s.selected);
  const selectWord = useTranscriptStore(s => s.selectWord);
  const playRange = useTranscriptStore(s => s.playRange);
  const { marked, moved } = useRevisionWords();
  const sung = shown !== null && w.i <= shown;
  const now = shown === w.i;
  const unconfirmed = w.verified && w.verified !== 'heard';
  return (
    <span
      role="button"
      tabIndex={-1}
      title={`#${w.i} · ${w.start.toFixed(2)}–${w.end.toFixed(2)} s${unconfirmed ? ` · ${w.verified}` : ''} · click: select, double-click: play it`}
      onClick={() => selectWord(w.i, true)}
      onDoubleClick={() => playRange(w.start - 0.15, w.end + 0.15)}
      className={cn(
        'relative cursor-pointer rounded px-[0.12em] transition-colors',
        onLine ? (sung ? 'text-foreground' : 'text-muted-foreground/60') : 'text-inherit',
        now && 'bg-amber-400/20 text-amber-300',
        selected === w.i && 'ring-2 ring-sky-400',
        unconfirmed && 'underline decoration-orange-400 decoration-dotted underline-offset-4',
        moved.has(w.i) && 'underline decoration-sky-400 decoration-2 underline-offset-4',
      )}
    >
      {w.text}
      {marked.has(w.i) && <span className="absolute -top-1 right-0 size-1.5 rounded-full bg-red-500" />}
    </span>
  );
}

function LineView({ line, shown, size }: { line: TLine | undefined; shown: number | null; size: 'big' | 'small' }) {
  if (!line) return <div className={size === 'big' ? 'h-12' : 'h-6'} />;
  return (
    <div className={cn('flex flex-wrap justify-center gap-x-1.5 gap-y-1 text-center', size === 'big' ? 'text-3xl font-semibold leading-tight' : 'text-base text-muted-foreground/50')}>
      {line.words.map(w => (
        <Word key={w.i} w={w} shown={shown} onLine={size === 'big'} />
      ))}
    </div>
  );
}

function Lyrics() {
  const words = useTranscriptStore(s => s.words);
  const lines = useTranscriptStore(s => s.lines);
  const shown = useTranscriptStore(s => wordAt(s.words, s.time + s.lead)?.i ?? null);
  const at = useMemo(() => {
    const l = lineOf(lines, shown === null ? null : words[shown]);
    return l ? lines.indexOf(l) : 0;
  }, [lines, words, shown]);
  const line = lines[at];
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-md bg-zinc-950 px-6 py-5">
      <LineView line={lines[at - 1]} shown={shown} size="small" />
      <LineView line={line} shown={shown} size="big" />
      <LineView line={lines[at + 1]} shown={shown} size="small" />
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
  const words = useTranscriptStore(s => s.words);
  const playing = useTranscriptStore(s => s.playing);
  const shown = useTranscriptStore(s => wordAt(s.words, s.time + s.lead)?.i ?? null);
  const seek = useTranscriptStore(s => s.seek);
  const selectWord = useTranscriptStore(s => s.selectWord);
  const { marked, moved } = useRevisionWords();
  const current = useMemo(() => lineOf(lines, shown === null ? null : words[shown])?.key ?? null, [lines, words, shown]);
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
            <span className={cn('min-w-0 flex-1', l.key === current ? 'text-foreground' : 'text-foreground/80')}>{l.text}</span>
            <span className="flex shrink-0 gap-1 text-[10px]">
              {l.check && <span className="rounded bg-amber-500/15 px-1 text-amber-300" title={l.check.join(' · ')}>check</span>}
              {unconfirmed > 0 && <span className="rounded bg-orange-500/15 px-1 text-orange-300" title="Words no transcription heard (placed by the aligner or unconfirmed)">{unconfirmed} unheard</span>}
              {nMoved > 0 && <span className="rounded bg-sky-500/15 px-1 text-sky-300">{nMoved} moved</span>}
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
