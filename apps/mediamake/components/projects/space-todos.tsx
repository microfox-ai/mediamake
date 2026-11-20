'use client';

import * as React from 'react';
import { CheckIcon, CircleDashedIcon, Loader2Icon, TriangleAlertIcon, UserIcon, XIcon } from 'lucide-react';
import { CopyLine } from './copy-line';
import type { TodoView } from '@/lib/space/todos';

export const list = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
export const cap = (text: string) => text.replace(/^./, c => c.toUpperCase());
/** "You" inside a sentence. */
export const mid = (name: string) => (name === 'You' ? 'you' : name);
export const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const TODO_STATE: Record<TodoView['state'], { label: string; className: string; Icon: typeof CheckIcon }> = {
  open: { label: 'To do', className: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300', Icon: CircleDashedIcon },
  claimed: { label: 'Picked up', className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300', Icon: UserIcon },
  done: { label: 'Done', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', Icon: CheckIcon },
  failed: { label: 'Failed', className: 'border-destructive/40 bg-destructive/10 text-destructive', Icon: TriangleAlertIcon },
  cancelled: { label: 'Cancelled', className: 'text-muted-foreground', Icon: XIcon },
};

export type TodoAsk = { action: 'yes' | 'release' | 'reopen' | 'cancel' } | { action: 'done'; result: string };

export const button = 'inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50';

/** A result that is a link opens; anything else is read. */
export function Result({ text }: { text: string }) {
  return /^https:\/\/\S+$/.test(text) ? (
    <a href={text} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">
      {text}
    </a>
  ) : (
    <span className="break-words">{text}</span>
  );
}

/** What a to-do is about, in a line: its skill and step, and the work it belongs to. */
export function todoAbout(todo: TodoView): string {
  const work = todo.release ? `release ${todo.release}` : todo.production ? `production ${todo.production}` : null;
  return cap([todo.skill && (todo.step ? `${todo.skill}, step ${todo.step}` : todo.skill), work && `${work}${todo.version ? ` ${todo.version}` : ''}`].filter(Boolean).join(' · '));
}

/**
 * One to-do, opened (the Runs tab's popup, ./space-runs): what it needs and which place can do it,
 * the line to paste or who has it, what came of it, and its buttons.
 */
export function TodoDetail({ todo, canWork, waiting, onAsk }: { todo: TodoView; canWork: boolean; waiting: boolean; onAsk: (ask: TodoAsk) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        <span className="font-mono text-[11px]">{todo.id}</span> · posted by {mid(todo.postedBy)}
        {todo.postedFrom ? ` from ${todo.postedFrom}` : ''}, {when(todo.postedAt)}
      </p>
      {todo.notes && <p className="whitespace-pre-wrap text-xs">{todo.notes}</p>}

      {todo.state === 'open' && !todo.options && (
        <>
          {todo.needs.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {todo.needs.map(need => (
                <li key={need.need} title={need.need} className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs">
                  {cap(need.label.replace(/^the /, ''))}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs">
            {todo.places.length ? (
              <>
                <CheckIcon className="mr-1 inline size-3.5 text-emerald-600" aria-hidden />
                {list(todo.places)} can do it.
              </>
            ) : (
              <span className="text-amber-700 dark:text-amber-300">
                <TriangleAlertIcon className="mr-1 inline size-3.5" aria-hidden />
                No open place has what it needs yet. See Where it runs.
              </span>
            )}
          </p>
          {todo.needsYes && <p className="text-xs font-medium">It waits for a person&apos;s yes before it runs.</p>}
          {canWork && (
            <div>
              <CopyLine line={todo.line} label="the line that picks this to-do up" />
              <p className="mt-1 text-[11px] text-muted-foreground">Paste it into Claude on a computer that can do it. Only one pick-up succeeds.</p>
            </div>
          )}
        </>
      )}

      {todo.state === 'open' && todo.options && (
        <div className="flex flex-wrap gap-2">
          {todo.options.map(option => (
            <button key={option} type="button" className={button} disabled={!canWork || waiting} onClick={() => onAsk({ action: 'done', result: option })}>
              {option}
            </button>
          ))}
        </div>
      )}

      {todo.state === 'claimed' && (
        <p className="text-xs">
          {todo.claimedBy} {todo.mine ? 'have' : 'has'} it{todo.claimedOn ? ` on ${todo.claimedOn}` : ''} since {todo.claimedAt && when(todo.claimedAt)}. Unfinished, it comes back here after 2 hours.
        </p>
      )}
      {todo.state === 'done' && (
        <p className="text-xs">
          {todo.result && (
            <>
              <Result text={todo.result} />{' '}
            </>
          )}
          <span className="text-muted-foreground">
            {todo.doneBy ? `by ${mid(todo.doneBy)}` : ''}
            {todo.doneAt ? `, ${when(todo.doneAt)}` : ''}
          </span>
        </p>
      )}
      {(todo.state === 'failed' || todo.state === 'cancelled' || (todo.state === 'open' && todo.failures > 0)) && todo.reason && (
        <p className="text-xs text-muted-foreground">
          {todo.state === 'cancelled' ? 'Why: ' : `Failed ${todo.failures} of 3: `}
          {todo.reason}
        </p>
      )}
      {todo.then && todo.state !== 'cancelled' && <p className="text-xs text-muted-foreground">After it: {todo.then}</p>}

      {canWork && todo.state !== 'done' && (
        <div className="flex flex-wrap gap-2 pt-1">
          {todo.needsYes && todo.state !== 'cancelled' && (
            <button type="button" className={button} disabled={waiting} onClick={() => onAsk({ action: 'yes' })}>
              {waiting && <Loader2Icon className="size-3.5 animate-spin" aria-hidden />} Say yes
            </button>
          )}
          {todo.mine && (
            <button type="button" className={button} disabled={waiting} onClick={() => onAsk({ action: 'release' })}>
              Give it back
            </button>
          )}
          {(todo.state === 'failed' || todo.state === 'cancelled') && (
            <button type="button" className={button} disabled={waiting} onClick={() => onAsk({ action: 'reopen' })}>
              Open it again
            </button>
          )}
          {todo.state !== 'cancelled' && (
            <button type="button" className={`${button} text-muted-foreground`} disabled={waiting} onClick={() => onAsk({ action: 'cancel' })}>
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

