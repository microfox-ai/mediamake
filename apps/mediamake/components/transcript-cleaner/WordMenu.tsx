'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLineIcon, ArrowUpToLineIcon, CornerDownLeftIcon, FlagIcon, MergeIcon, PencilIcon, PlayIcon, ScissorsIcon, Trash2Icon, Undo2Icon } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { clock, LONG_WORD, TRIM_TO } from '@/lib/transcript-cleaner/transcript';
import { MARK_LABELS, type MarkKind, type TWord } from '@/lib/transcript-cleaner/types';
import { useTranscriptStore, type EditWhere } from './store';

/*
 * A word's right-click menu, the same on the stage, the timeline and the song's lines: play it, rewrite or delete it,
 * mark it, start a new line from it or join its line to the one above, push it (and the words after or before it on its
 * line) to the next or the previous line, set its edges at the playhead, trim a long word, or undo what was done to it.
 * Everything lands in the open revision; the transcript itself never changes.
 */

export const MARK_KEYS: [MarkKind, string][] = [
  ['wrong-word', 'W'],
  ['wrong-timing', 'T'],
  ['missing-word', 'M'],
  ['extra-word', 'X'],
  ['note', 'N'],
];

/** Word indexes the open revision changes, by how (relined: pushed to another line on their own). */
export function useRevisionWords() {
  const revision = useTranscriptStore(s => s.revision);
  return useMemo(() => {
    const marked = new Set<number>();
    const moved = new Set<number>();
    for (const m of revision?.marks ?? []) if (m.word) marked.add(m.word.i);
    for (const t of revision?.timings ?? []) moved.add(t.i);
    const rewritten = new Set((revision?.rewrites ?? []).map(r => r.i));
    const moves = revision?.lineMoves ?? [];
    const relined = new Set(moves.filter(m => !m.by).map(m => m.i));
    const split = new Set(moves.filter(m => m.by === 'split').map(m => m.i));
    const joined = new Set(moves.filter(m => m.by === 'join').map(m => m.i));
    return { marked, moved, rewritten, relined, split, joined };
  }, [revision]);
}

export const isLong = (w: TWord) => !w.deleted && w.end - w.start >= LONG_WORD;

/** The attribute that names the song's lines (LinesEditor). */
export const LINES_EDITOR = 'data-lines-editor';

/** Put the focus back in the song's lines, after a word's menu or text box closes there. */
export const focusLines = () => document.querySelector<HTMLElement>(`[${LINES_EDITOR}]`)?.focus({ preventScroll: true });

function WordMenuItems({ w, where }: { w: TWord; where: EditWhere }) {
  const s = useTranscriptStore.getState();
  const lines = useTranscriptStore(st => st.lines);
  const { moved, rewritten, relined } = useRevisionWords();
  const k = lines.findIndex(l => l.words.some(x => x.i === w.i));
  const line = lines[k];
  const after = line ? line.words.filter(x => x.i > w.i).length : 0;
  const before = line ? line.words.filter(x => x.i < w.i).length : 0;
  const numbered = w.stanza !== undefined || w.line !== undefined;
  const long = isLong(w);
  const changed = moved.has(w.i) || rewritten.has(w.i) || !!w.deleted;
  const mark = (kind: MarkKind) => {
    s.selectWord(w.i);
    s.addMark(kind);
  };
  return (
    <>
      <ContextMenuLabel className="flex items-baseline gap-2 text-xs">
        <span className="truncate">“{w.text}”</span>
        <span className="ml-auto shrink-0 font-mono text-[10px] font-normal text-muted-foreground">
          #{w.i} · {clock(w.start)}–{clock(w.end)}
        </span>
      </ContextMenuLabel>
      <ContextMenuItem onSelect={() => s.playRange(w.start - 0.15, w.end + 0.15)}>
        <PlayIcon /> Play it <ContextMenuShortcut>P</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => s.startRewrite(w.i, where)}>
        <PencilIcon /> Rewrite… <ContextMenuShortcut>↵</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem variant={w.deleted ? 'default' : 'destructive'} onSelect={() => s.toggleDelete(w.i)}>
        {w.deleted ? <Undo2Icon /> : <Trash2Icon />} {w.deleted ? 'Keep it (undo delete)' : 'Delete'} <ContextMenuShortcut>⌫</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-2">
          <FlagIcon className="size-4 text-muted-foreground" /> Mark
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-52">
          {MARK_KEYS.map(([kind, key]) => (
            <ContextMenuItem key={kind} onSelect={() => mark(kind)}>
              {MARK_LABELS[kind]} <ContextMenuShortcut>{key}</ContextMenuShortcut>
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem disabled={!numbered || !before} onSelect={() => s.splitLineAt(w.i)}>
        <CornerDownLeftIcon /> New line from here{after ? ` (+${after} after it)` : ''} {where === 'lines' && <ContextMenuShortcut>↵</ContextMenuShortcut>}
      </ContextMenuItem>
      <ContextMenuItem disabled={!numbered || k < 1} onSelect={() => s.joinLineUp(k)}>
        <MergeIcon /> Join its line to the line above {where === 'lines' && <ContextMenuShortcut>⌫</ContextMenuShortcut>}
      </ContextMenuItem>
      <ContextMenuItem disabled={!numbered || !lines[k + 1]} onSelect={() => s.pushLine(w.i, 1)}>
        <ArrowDownToLineIcon /> Push to next line{after ? ` (+${after} after it)` : ''}
      </ContextMenuItem>
      <ContextMenuItem disabled={!numbered || !lines[k - 1]} onSelect={() => s.pushLine(w.i, -1)}>
        <ArrowUpToLineIcon /> Push to previous line{before ? ` (+${before} before it)` : ''}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => s.setEdgeAtPlayhead('start', w.i)}>
        Start at the playhead <ContextMenuShortcut>S</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => s.setEdgeAtPlayhead('end', w.i)}>
        End at the playhead <ContextMenuShortcut>E</ContextMenuShortcut>
      </ContextMenuItem>
      {long && (
        <>
          <ContextMenuItem className="text-amber-300" onSelect={() => s.trimWord(w.i, 'end')}>
            <ScissorsIcon className="text-amber-300" /> Trim its end (keep {TRIM_TO} s)
          </ContextMenuItem>
          <ContextMenuItem className="text-amber-300" onSelect={() => s.trimWord(w.i, 'start')}>
            <ScissorsIcon className="text-amber-300" /> Trim its start (keep {TRIM_TO} s)
          </ContextMenuItem>
        </>
      )}
      {(changed || relined.has(w.i)) && <ContextMenuSeparator />}
      {changed && (
        <ContextMenuItem onSelect={() => s.restoreWord(w.i)}>
          <Undo2Icon /> Undo its time, text and delete
        </ContextMenuItem>
      )}
      {relined.has(w.i) && (
        <ContextMenuItem onSelect={() => s.undoLineMoves([w.i])}>
          <Undo2Icon /> Back to its own line
        </ContextMenuItem>
      )}
    </>
  );
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/** Right-click on `children` (one element) opens the word's menu. */
export function WordMenu({ w, where, children }: { w: TWord; where: EditWhere; children: React.ReactElement }) {
  return (
    <ContextMenu
      onOpenChange={open => {
        if (open) useTranscriptStore.getState().selectWord(w.i);
      }}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      {/*
        the rewrite box takes the focus when the menu closes; and the menu is a portal, so React would bubble its
        clicks up to the word and the timeline under it (select, seek, drag): they stop here
      */}
      <ContextMenuContent
        className="w-72"
        onCloseAutoFocus={e => {
          e.preventDefault();
          // in the song's lines the caret carries on after the menu (the rewrite box takes the focus itself)
          if (where === 'lines' && !useTranscriptStore.getState().editing) focusLines();
        }}
        onPointerDown={stop}
        onPointerUp={stop}
        onClick={stop}
        onDoubleClick={stop}
      >
        <WordMenuItems w={w} where={where} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** The text box a word is rewritten in: Enter or leaving it keeps the text, Esc cancels. */
export function RewriteInput({ w, className }: { w: TWord; className?: string }) {
  const rewriteWord = useTranscriptStore(s => s.rewriteWord);
  const endRewrite = useTranscriptStore(s => s.endRewrite);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const [value, setValue] = useState(w.text);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const finish = (keep: boolean) => {
    if (done.current) return;
    done.current = true;
    if (keep) rewriteWord(w.i, value);
    else endRewrite();
  };
  return (
    <input
      ref={ref}
      value={value}
      size={Math.max(4, value.length + 1)}
      aria-label={`Rewrite “${w.text}”`}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          finish(e.key === 'Enter');
        }
      }}
      onBlur={() => finish(true)}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      className={cn('rounded border border-emerald-400 bg-zinc-900 px-1 text-zinc-50 outline-none ring-2 ring-emerald-400/30', className)}
    />
  );
}
