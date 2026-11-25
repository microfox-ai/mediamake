'use client';

import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { caretAt, slotOf, stepCaret, type Caret } from '@/lib/transcript-cleaner/lines';
import { clock, momentAt } from '@/lib/transcript-cleaner/transcript';
import type { TLine, TWord } from '@/lib/transcript-cleaner/types';
import { useTranscriptStore } from './store';
import { focusLines, isLong, LINES_EDITOR, RewriteInput, useRevisionWords, WordMenu } from './WordMenu';

/*
 * The song's lines under the timeline, edited like text. Click a word to put the caret there (before it, or after it
 * when you click its right half) and seek the song to the word's start. ← → move the caret a word at a time and
 * across lines, ↑ ↓ to the line above or below, Home and End (⌘← ⌘→) to the line's ends. Enter splits the line at the
 * caret: the words after it become a new line just below. Backspace at a line's start joins it to the line above;
 * elsewhere it strikes out the word before the caret, and Delete the word after it (at a line's end, Delete joins the
 * next line on). ⌘Z undoes, ⇧⌘Z redoes. Letters stay the screen's shortcuts: W T M X N mark the word at the caret, S
 * and E set its edges at the playhead, P plays it, Space plays the song, ⇧↵ rewrites the word. Right-click a word for
 * its menu. Esc leaves the lines.
 */

function CaretBar() {
  return (
    <span data-caret aria-hidden className="relative inline-block h-[1em] w-0 align-[-0.12em]">
      <span className="absolute -left-px -top-[0.06em] h-[1.15em] w-[2px] animate-[caret-blink_1.1s_infinite] rounded-full bg-sky-600 dark:bg-sky-400" />
    </span>
  );
}

interface LineWordProps {
  w: TWord;
  next: TWord | undefined;
  selected: boolean;
}

const LineWord = memo(function LineWord({ w, next, selected }: LineWordProps) {
  const setCaret = useTranscriptStore(s => s.setCaret);
  const seek = useTranscriptStore(s => s.seek);
  return (
    <WordMenu w={w} where="lines">
      <span
        data-word={w.i}
        title={`#${w.i} · ${clock(w.start)}–${clock(w.end)}${w.deleted ? ' · to delete' : ''}`}
        onClick={e => {
          e.stopPropagation();
          // a text editor puts the caret on the side of the word you click; the song seeks to the word either way
          const r = e.currentTarget.getBoundingClientRect();
          const after = e.clientX > r.left + r.width / 2;
          const caret: Caret = !after ? { i: w.i, end: false } : next ? { i: next.i, end: false } : { i: w.i, end: true };
          setCaret(caret, w.i);
          seek(w.start);
        }}
        className={cn('rounded-sm', selected && 'bg-sky-500/15', w.deleted && 'text-red-600/70 line-through dark:text-red-400/70')}
      >
        {w.text}
      </span>
    </WordMenu>
  );
});

interface RowProps {
  line: TLine;
  k: number;
  /** The caret's slot when it is on this line and the lines have the focus. */
  caretP: number | null;
  /** The selected word, when it is on this line and the lines have the focus. */
  selected: number | null;
  current: boolean;
  editing: number | null;
  flags: ReturnType<typeof useRevisionWords>;
}

const Row = memo(function Row({ line, k, caretP, selected, current, editing, flags }: RowProps) {
  const setCaret = useTranscriptStore(s => s.setCaret);
  const seek = useTranscriptStore(s => s.seek);
  const { marked, moved, rewritten, relined, split, joined } = flags;
  const nMarked = line.words.filter(w => marked.has(w.i)).length;
  const nMoved = line.words.filter(w => moved.has(w.i)).length;
  const nEdited = line.words.filter(w => w.deleted || rewritten.has(w.i) || relined.has(w.i)).length;
  const nLong = line.words.filter(isLong).length;
  const unconfirmed = line.words.filter(w => w.verified && w.verified !== 'heard').length;
  const isSplit = line.words.some(w => split.has(w.i));
  const isJoined = line.words.some(w => joined.has(w.i));
  const words = line.words;
  return (
    <div
      data-line={line.key}
      data-k={k}
      onClick={e => {
        // the line's time puts the caret at its start, the space after its words at its end; the song goes to the line
        const atStart = !!(e.target as HTMLElement).closest('[data-line-time]');
        setCaret(caretAt([line], 0, atStart ? 0 : words.length));
        seek(Math.max(0, line.start - 0.3));
      }}
      className={cn('flex w-full cursor-text items-baseline gap-3 px-3 py-1 text-left text-sm hover:bg-muted/40', current && 'bg-amber-400/10')}
    >
      <span data-line-time className="w-12 shrink-0 cursor-pointer font-mono text-[11px] tabular-nums text-muted-foreground">
        {clock(line.start, 1)}
      </span>
      <span className={cn('min-w-0 flex-1', current ? 'text-foreground' : 'text-foreground/80')}>
        {words.map((w, n) => (
          <Fragment key={w.i}>
            {n ? ' ' : ''}
            {caretP === n && <CaretBar />}
            {editing === w.i ? (
              <RewriteInput w={w} className="border-sky-500 bg-background px-0.5 text-sm text-foreground ring-sky-500/30" />
            ) : (
              <LineWord w={w} next={words[n + 1]} selected={selected === w.i} />
            )}
          </Fragment>
        ))}
        {caretP === words.length && <CaretBar />}
      </span>
      <span className="flex shrink-0 gap-1 text-[10px]">
        {isSplit && (
          <span className="rounded bg-violet-500/15 px-1 text-violet-700 dark:text-violet-300" title="Split off the line before it (⌘Z undoes)">
            split
          </span>
        )}
        {isJoined && (
          <span className="rounded bg-violet-500/15 px-1 text-violet-700 dark:text-violet-300" title="A line was joined onto it (⌘Z undoes)">
            joined
          </span>
        )}
        {line.check && (
          <span className="rounded bg-amber-500/15 px-1 text-amber-700 dark:text-amber-300" title={line.check.join(' · ')}>
            check
          </span>
        )}
        {unconfirmed > 0 && (
          <span className="rounded bg-orange-500/15 px-1 text-orange-700 dark:text-orange-300" title="Words no transcription heard (placed by the aligner or unconfirmed)">
            {unconfirmed} unheard
          </span>
        )}
        {nLong > 0 && (
          <span className="rounded bg-amber-500/15 px-1 text-amber-700 dark:text-amber-300" title="Words 2.5 s or longer: the aligner may have stretched them across a gap">
            {nLong} long
          </span>
        )}
        {nMoved > 0 && <span className="rounded bg-sky-500/15 px-1 text-sky-700 dark:text-sky-300">{nMoved} moved</span>}
        {nEdited > 0 && <span className="rounded bg-emerald-500/15 px-1 text-emerald-700 dark:text-emerald-300">{nEdited} edited</span>}
        {nMarked > 0 && <span className="rounded bg-red-500/15 px-1 text-red-700 dark:text-red-300">{nMarked} marked</span>}
      </span>
    </div>
  );
});

export function LinesEditor() {
  const lines = useTranscriptStore(s => s.lines);
  const caret = useTranscriptStore(s => s.caret);
  const selected = useTranscriptStore(s => s.selected);
  const playing = useTranscriptStore(s => s.playing);
  const editing = useTranscriptStore(s => (s.editing?.where === 'lines' ? s.editing.i : null));
  const currentK = useTranscriptStore(s => (s.lines.length ? momentAt(s.words, s.lines, s.time + s.lead).line : -1));
  const flags = useRevisionWords();
  const boxRef = useRef<HTMLDivElement>(null);
  /** Where ↑ and ↓ aim (px), kept while the caret goes up or down, as a text editor keeps its column. */
  const goalX = useRef<number | null>(null);
  const [focused, setFocused] = useState(false);
  const slot = useMemo(() => slotOf(lines, caret), [lines, caret]);
  const selectedK = useMemo(() => (selected === null ? -1 : lines.findIndex(l => l.words.some(w => w.i === selected))), [lines, selected]);
  const current = lines[currentK]?.key ?? null;

  // while the song plays, its line stays in view
  useEffect(() => {
    if (!playing || !current) return;
    boxRef.current?.querySelector(`[data-line="${CSS.escape(current)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current, playing]);

  // and the caret's line while it moves
  useEffect(() => {
    if (!focused || !slot) return;
    boxRef.current?.querySelector(`[data-k="${slot.k}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focused, slot]);

  // after a word's text box in the lines closes, the caret carries on there (unless the focus went somewhere else)
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing !== null) wasEditing.current = true;
    else if (wasEditing.current) {
      wasEditing.current = false;
      if (!document.activeElement || document.activeElement === document.body) focusLines();
    }
  }, [editing]);

  const move = (c: Caret | null, vertical = false) => {
    if (!vertical) goalX.current = null;
    if (c) useTranscriptStore.getState().setCaret(c);
  };

  /** The caret to the line above or below, at the word boundary nearest the column it is in. */
  const moveVertical = (from: { k: number; p: number }, d: -1 | 1) => {
    const ls = useTranscriptStore.getState().lines;
    const k = from.k + d;
    // past the first or the last line: its start or its end, as a text editor does
    if (k < 0) return move(caretAt(ls, 0, 0));
    if (k >= ls.length) return move(caretAt(ls, ls.length - 1, ls[ls.length - 1].words.length));
    const box = boxRef.current;
    if (goalX.current === null) goalX.current = box?.querySelector('[data-caret]')?.getBoundingClientRect().left ?? null;
    const spans = Array.from(box?.querySelectorAll<HTMLElement>(`[data-k="${k}"] [data-word]`) ?? []);
    const goal = goalX.current;
    if (goal === null || spans.length !== ls[k].words.length) return move(caretAt(ls, k, from.p), true);
    const xs = spans.map(el => el.getBoundingClientRect().left);
    xs.push(spans[spans.length - 1].getBoundingClientRect().right);
    let best = 0;
    xs.forEach((x, p) => {
      if (Math.abs(x - goal) < Math.abs(xs[best] - goal)) best = p;
    });
    move(caretAt(ls, k, best), true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // keys typed in a word's text box are that box's; ⌥ keys stay the screen's (move a word's time, change song)
    if (e.target !== e.currentTarget || e.altKey || e.nativeEvent.isComposing) return;
    const s = useTranscriptStore.getState();
    const ls = s.lines;
    const at = slotOf(ls, s.caret) ?? { k: Math.max(0, currentK), p: 0 };
    const line = ls[at.k];
    if (!line) return;
    const len = line.words.length;
    const mod = e.metaKey || e.ctrlKey;
    const take = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        // ⇧← ⇧→ stay the screen's: the playhead 0.5 s back or ahead
        if (e.shiftKey) return;
        take();
        const d = e.key === 'ArrowLeft' ? -1 : 1;
        if (mod) move(caretAt(ls, at.k, d < 0 ? 0 : len));
        else move(s.caret ? stepCaret(ls, s.caret, d) : caretAt(ls, at.k, at.p));
        return;
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        if (e.shiftKey) return;
        take();
        const d = e.key === 'ArrowUp' ? -1 : 1;
        if (mod) move(d < 0 ? caretAt(ls, 0, 0) : caretAt(ls, ls.length - 1, ls[ls.length - 1].words.length));
        else moveVertical(at, d);
        return;
      }
      case 'Home':
      case 'End':
        take();
        move(caretAt(ls, at.k, e.key === 'Home' ? 0 : len));
        return;
      case 'Enter': {
        if (mod) return;
        take();
        goalX.current = null;
        // ⇧↵ rewrites the word at the caret, in place
        if (e.shiftKey) {
          if (s.selected !== null) s.startRewrite(s.selected, 'lines');
          return;
        }
        if (at.p >= len) {
          toast.message('The caret is at the end of the line: put it before the word the new line should start with');
          return;
        }
        s.splitLineAt(line.words[at.p].i);
        return;
      }
      case 'Backspace':
      case 'Delete': {
        if (mod) return;
        take();
        goalX.current = null;
        const back = e.key === 'Backspace';
        if (back && at.p === 0) {
          s.joinLineUp(at.k);
          return;
        }
        if (!back && at.p >= len) {
          if (at.k < ls.length - 1) s.joinLineUp(at.k + 1);
          return;
        }
        // the word before the caret (Backspace) or after it (Delete) is struck out, and the caret steps past it, as
        // deleting text moves a caret; a word already struck out is just stepped over
        const w = line.words[back ? at.p - 1 : at.p];
        if (!w.deleted) s.toggleDelete(w.i);
        move(caretAt(useTranscriptStore.getState().lines, at.k, back ? at.p - 1 : at.p + 1));
        return;
      }
      case 'Escape':
        take();
        s.selectWord(null);
        boxRef.current?.blur();
        return;
    }
  };

  return (
    <div
      ref={boxRef}
      {...{ [LINES_EDITOR]: '' }}
      role="textbox"
      aria-multiline="true"
      aria-label="The song's lines. Enter splits a line at the caret, Backspace at a line's start joins it to the line above, Command Z undoes."
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={e => {
        if (e.target !== e.currentTarget) return;
        setFocused(true);
        // the caret starts at the line on screen
        const s = useTranscriptStore.getState();
        if (!s.caret) s.setCaret(caretAt(s.lines, Math.max(0, currentK), 0));
      }}
      onBlur={e => {
        if (e.target === e.currentTarget) setFocused(false);
      }}
      className={cn('divide-y divide-border/40 rounded-md border outline-none transition-colors', focused && 'border-sky-500/50')}
    >
      {lines.map((l, k) => (
        <Row
          key={l.key}
          line={l}
          k={k}
          caretP={focused && slot?.k === k ? slot.p : null}
          selected={focused && selectedK === k ? selected : null}
          current={k === currentK}
          editing={editing !== null && l.words.some(w => w.i === editing) ? editing : null}
          flags={flags}
        />
      ))}
    </div>
  );
}
