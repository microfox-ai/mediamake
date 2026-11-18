'use client';

import * as React from 'react';
import { CheckIcon, CircleDashedIcon, Loader2Icon, TriangleAlertIcon, UserIcon, XIcon } from 'lucide-react';
import { CopyLine } from './copy-line';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { TodosView, TodoView } from '@/lib/space/todos';

const list = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
const cap = (text: string) => text.replace(/^./, c => c.toUpperCase());
/** "You" inside a sentence. */
const mid = (name: string) => (name === 'You' ? 'you' : name);
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const STATE: Record<TodoView['state'], { label: string; className: string; Icon: typeof CheckIcon }> = {
  open: { label: 'To do', className: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300', Icon: CircleDashedIcon },
  claimed: { label: 'Picked up', className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300', Icon: UserIcon },
  done: { label: 'Done', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', Icon: CheckIcon },
  failed: { label: 'Failed', className: 'border-destructive/40 bg-destructive/10 text-destructive', Icon: TriangleAlertIcon },
  cancelled: { label: 'Cancelled', className: 'text-muted-foreground', Icon: XIcon },
};

type Ask = { action: 'yes' | 'release' | 'reopen' | 'cancel' } | { action: 'done'; result: string };

const button = 'inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50';

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

/** One to-do: what it is, what it needs and which place can do it, then the line to paste or who has it. */
function TodoCard({ todo, canWork, waiting, onAsk }: { todo: TodoView; canWork: boolean; waiting: boolean; onAsk: (ask: Ask) => void }) {
  const { label, className, Icon } = STATE[todo.state];
  const work = todo.release ? `release ${todo.release}` : todo.production ? `production ${todo.production}` : null;
  const about = [todo.skill && (todo.step ? `${todo.skill}, step ${todo.step}` : todo.skill), work && `${work}${todo.version ? ` ${todo.version}` : ''}`].filter(Boolean).join(' · ');
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}>
          <Icon className="size-3" aria-hidden /> {todo.options && todo.state === 'open' ? 'A choice' : label}
        </span>
        <h3 className="min-w-0 flex-1 text-sm font-semibold">{todo.title}</h3>
        <span className="font-mono text-[11px] text-muted-foreground">{todo.id}</span>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">
        {about && `${cap(about)} · `}posted by {mid(todo.postedBy)}
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
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
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
    </li>
  );
}

/**
 * A project's to-do queue (lib/space/todos): the steps a session could not do where it ran, each
 * waiting for a place that has what it needs. A card each: what waits first, then what someone
 * picked up; the finished ones are behind their own switch. Owners and editors work them; viewers read.
 */
export function TodosTab({ view, error, onChanged }: { view: TodosView | null; error?: string | null; onChanged: () => Promise<void> | void }) {
  const [show, setShow] = React.useState<'waiting' | 'finished'>('waiting');
  const [busyWith, setBusyWith] = React.useState<string | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState<TodoView | null>(null);

  if (!view) return error ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{error}</p> : <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />;

  const canWork = view.role === 'owner' || view.role === 'editor';
  const waiting = view.todos.filter(todo => todo.state === 'open' || todo.state === 'claimed' || todo.state === 'failed');
  const finished = view.todos.filter(todo => todo.state === 'done' || todo.state === 'cancelled');
  const shown = show === 'waiting' ? waiting : finished;

  const send = async (todo: TodoView, ask: Ask) => {
    setBusyWith(todo.id);
    setProblem(null);
    try {
      const res = await fetch('/api/space/todos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ask, id: todo.id }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Could not change it (${res.status})`);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not change it');
    } finally {
      await onChanged();
      setBusyWith(null);
    }
  };
  const tab = (value: 'waiting' | 'finished', label: string, count: number) => (
    <button type="button" aria-pressed={show === value} onClick={() => setShow(value)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${show === value ? 'bg-background shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}>
      {label} <span className="tabular-nums text-muted-foreground">{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        A step a session could not do where it ran, such as an upload that needs a signed-in browser, waits here for a computer that can. Paste its line into Claude on that computer, or run{' '}
        <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">mm todo</span> there.
      </p>
      {problem && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">{problem}</p>}
      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {tab('waiting', 'Open', waiting.length)}
        {tab('finished', 'Finished', finished.length)}
      </div>

      {shown.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map(todo => (
            <TodoCard key={todo.id} todo={todo} canWork={canWork} waiting={busyWith === todo.id} onAsk={ask => (ask.action === 'cancel' ? setCancelling(todo) : send(todo, ask))} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{show === 'waiting' ? 'Nothing waits. A session posts a to-do here when it reaches a step it cannot do.' : 'Nothing finished yet.'}</p>
      )}

      <AlertDialog open={!!cancelling} onOpenChange={open => !open && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this to-do?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling?.title}. Nobody will be offered it any more{cancelling?.state === 'claimed' ? `, and ${mid(cancelling.claimedBy ?? 'whoever has it')} ${cancelling.mine ? 'are' : 'is'} told to stop when they try to finish it` : ''}. You can open it again from Finished.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelling) void send(cancelling, { action: 'cancel' });
                setCancelling(null);
              }}
            >
              Cancel the to-do
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
