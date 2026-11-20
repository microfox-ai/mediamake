'use client';

import * as React from 'react';
import { CheckIcon, CircleDashedIcon, CircleIcon, HourglassIcon, ListTodoIcon, Loader2Icon, PauseIcon, PlayIcon, RefreshCwIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { CopyLine } from './copy-line';
import { Result, TODO_STATE, TodoDetail, button, list, mid, todoAbout, when, type TodoAsk } from './space-todos';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BOARD_FILTERS, BOARD_LABEL, boardCards, boardCounts, boardSkills, inFilter, type BoardCard, type BoardFilter, type BoardState } from '@/lib/space/board';
import type { RunStepView, RunsView, RunView } from '@/lib/space/runs';
import type { TodosView, TodoView } from '@/lib/space/todos';

/**
 * The Runs tab of a space's page: its runs (lib/space/runs: a production going through its skill's
 * steps) and its to-dos (lib/space/todos: a step waiting for a place that can do it) as one board
 * (lib/space/board). A small card each, three to a row; a tab a skill, and one filter at the right
 * (Open, Waiting, Paused, Running, Finished). A card opens its steps and its buttons in a popup.
 * The page refreshes it every 30 seconds and when the window is looked at again (project-detail).
 * Owners and editors work them; viewers read.
 */

const PILL: Record<BoardState, { className: string; Icon: typeof CheckIcon }> = {
  paused: { className: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300', Icon: PauseIcon },
  waiting: { className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300', Icon: HourglassIcon },
  running: { className: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300', Icon: Loader2Icon },
  finished: { className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', Icon: CheckIcon },
};
const BAR: Record<BoardState, string> = { paused: 'bg-sky-500', waiting: 'bg-amber-500', running: 'bg-violet-500', finished: 'bg-emerald-500' };
const STEP_ICON: Record<RunStepView['state'], { Icon: typeof CheckIcon; className: string }> = {
  done: { Icon: CheckIcon, className: 'text-emerald-600' },
  started: { Icon: Loader2Icon, className: 'text-violet-600' },
  unsaved: { Icon: TriangleAlertIcon, className: 'text-amber-600' },
  waiting: { Icon: HourglassIcon, className: 'text-amber-600' },
  todo: { Icon: CircleIcon, className: 'text-muted-foreground/50' },
};

/** The word on a card's pill: its state, or how it ended. */
function pillOf(card: BoardCard): { label: string; className: string; Icon: typeof CheckIcon } {
  const pill = PILL[card.state];
  if (card.kind === 'run') {
    if (card.run.state === 'cancelled') return { label: 'Cancelled', className: 'text-muted-foreground', Icon: XIcon };
    return { ...pill, label: card.run.state === 'done' ? 'Done' : BOARD_LABEL[card.state] };
  }
  const { todo } = card;
  if (todo.state === 'done' || todo.state === 'cancelled') return TODO_STATE[todo.state];
  if (todo.state === 'failed') return { ...pill, label: 'Paused', Icon: TriangleAlertIcon };
  return { ...pill, label: todo.options && todo.state === 'open' ? 'A choice' : BOARD_LABEL[card.state] };
}

function Pill({ card }: { card: BoardCard }) {
  const { label, className, Icon } = pillOf(card);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      <Icon className="size-3" aria-hidden /> {label}
    </span>
  );
}

/** A card's one line under its title: what comes next, who has it, or how it ended. */
function lineOf(card: BoardCard): string {
  if (card.kind === 'run') {
    const { run } = card;
    if (run.state === 'done') return `Done ${when(run.doneAt ?? run.updatedAt)}`;
    if (run.state === 'cancelled') return run.reason ? `Cancelled: ${run.reason}` : 'Cancelled';
    if (run.state === 'running') return `${run.heldBy ?? 'Someone'}${run.heldOn ? ` on ${run.heldOn}` : ''}${run.next ? ` · step ${run.next.n}` : ''}`;
    return run.next ? `Next: ${run.next.n}. ${run.next.step}` : '';
  }
  const { todo } = card;
  if (todo.state === 'claimed') return `${todo.claimedBy ?? 'Someone'}${todo.claimedOn ? ` on ${todo.claimedOn}` : ''} ${todo.mine ? 'have' : 'has'} it`;
  if (todo.state === 'failed') return `Failed ${todo.failures} of 3${todo.reason ? `: ${todo.reason}` : ''}`;
  if (todo.state === 'done') return `Done ${todo.doneAt ? when(todo.doneAt) : ''}`;
  if (todo.state === 'cancelled') return todo.reason ? `Cancelled: ${todo.reason}` : 'Cancelled';
  if (todo.options) return 'A person picks one';
  return todo.places.length ? `${list(todo.places)} can do it` : 'No open place can do it yet';
}

/** One run or to-do, small: its state, its name, how far it is and what comes next. It opens the rest. */
function Card({ card, showSkill, onOpen }: { card: BoardCard; showSkill: boolean; onOpen: () => void }) {
  const title = card.kind === 'run' ? card.run.title : card.todo.title;
  const steps = card.kind === 'run' ? card.run.steps.length : 0;
  const done = card.kind === 'run' ? card.run.done : 0;
  return (
    <li className="min-w-0">
      <button type="button" onClick={onOpen} aria-label={`Open ${title}`} className="flex h-full w-full min-w-0 cursor-pointer flex-col gap-2 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/40">
        <span className="flex w-full items-center gap-2">
          <Pill card={card} />
          {card.kind === 'todo' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ListTodoIcon className="size-3" aria-hidden /> To-do
            </span>
          )}
          {card.kind === 'run' && (
            <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
              {done} of {steps}
            </span>
          )}
        </span>
        <span className="w-full truncate text-sm font-semibold">{title}</span>
        {card.kind === 'run' && (
          <span className="block h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className={`block h-full rounded-full ${card.run.state === 'cancelled' ? 'bg-muted-foreground/40' : BAR[card.state]}`} style={{ width: `${steps ? Math.round((done / steps) * 100) : 0}%` }} />
          </span>
        )}
        <span className="w-full truncate text-xs text-muted-foreground">{lineOf(card) || ' '}</span>
        {showSkill && card.skill && <span className="w-full truncate font-mono text-[11px] text-muted-foreground/80">{card.skill}</span>}
      </button>
    </li>
  );
}

/** One step: its name, then where it was done and what it saved, or what it waits for. */
function Step({ step, next }: { step: RunStepView; next: boolean }) {
  const { Icon, className } = STEP_ICON[step.state];
  const where = [step.place, step.at && when(step.at)].filter(Boolean).join(', ');
  return (
    <li className="flex min-w-0 items-start gap-2 text-xs">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${className}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <span className={next ? 'font-semibold' : step.state === 'todo' ? 'text-muted-foreground' : ''}>
          {step.n}. {step.step}
        </span>
        {step.state === 'done' && (
          <span className="text-muted-foreground">
            {where && ` · ${where}`}
            {step.lacked?.length ? ` · done without ${step.lacked.map(l => l.label).join(', ')}` : ''}
            {step.output && (
              <>
                {' · '}
                <Result text={step.output} />
              </>
            )}
          </span>
        )}
        {step.state === 'started' && (
          <span className="text-muted-foreground">
            {' '}
            · started{step.place ? ` on ${step.place}` : ''}
            {step.lacked?.length ? `, without ${step.lacked.map(l => l.label).join(', ')}` : ''}
          </span>
        )}
        {step.state === 'unsaved' && <span className="text-amber-700 dark:text-amber-300"> · started{step.place ? ` on ${step.place}` : ''} and never saved: it is done again</span>}
        {step.state === 'waiting' && (
          <span className="text-muted-foreground">
            {' '}
            · waits as to-do <span className="font-mono text-[11px]">{step.todo}</span>
            {step.todoState && step.todoState !== 'open' ? ` (${step.todoState === 'claimed' ? 'picked up' : step.todoState})` : ''}
          </span>
        )}
      </div>
    </li>
  );
}

/** A run, opened: every step, what the next one needs, the line that continues it, and its buttons. */
function RunDetail({ run, todos, canWork, owner, waiting, onRun, onTodo }: { run: RunView; todos: TodoView[]; canWork: boolean; owner: boolean; waiting: boolean; onRun: (action: 'stop' | 'cancel') => void; onTodo: (todo: TodoView, ask: TodoAsk) => void }) {
  const over = run.state === 'done' || run.state === 'cancelled';
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${run.steps.length ? Math.round((run.done / run.steps.length) * 100) : 0}%` }} />
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {run.done} of {run.steps.length} steps saved
        </span>
      </div>

      <ol className="flex min-h-0 flex-col gap-1.5 overflow-y-auto rounded-xl border bg-card p-3">
        {run.steps.map(step => (
          <Step key={step.n} step={step} next={!over && run.next?.n === step.n} />
        ))}
      </ol>

      {run.state === 'ready' && run.next && (
        <>
          <p className="text-xs">
            {run.next.places.length ? (
              <>
                <CheckIcon className="mr-1 inline size-3.5 text-emerald-600" aria-hidden />
                {list(run.next.places)} can do step {run.next.n}.
              </>
            ) : run.next.without ? (
              <>
                <CheckIcon className="mr-1 inline size-3.5 text-emerald-600" aria-hidden />
                Any place can do step {run.next.n} another way: {run.next.without}
              </>
            ) : (
              <span className="text-amber-700 dark:text-amber-300">
                <TriangleAlertIcon className="mr-1 inline size-3.5" aria-hidden />
                No open place has what step {run.next.n} needs yet. See Where it runs.
              </span>
            )}
          </p>
          {canWork && (
            <div>
              <CopyLine line={run.line} label="the line that continues this run" />
              <p className="mt-1 text-[11px] text-muted-foreground">Paste it into Claude on a place that can do the next step. Saved steps are never done again.</p>
            </div>
          )}
        </>
      )}
      {run.state === 'running' && (
        <p className="text-xs">
          {run.heldBy} {run.mine ? 'have' : 'has'} it{run.heldOn ? ` on ${run.heldOn}` : ''} since {run.heldSince && when(run.heldSince)}. After 2 hours with no step saved, another place may continue it.
        </p>
      )}
      {run.state === 'cancelled' && run.reason && <p className="text-xs text-muted-foreground">Why: {run.reason}</p>}

      {todos.map(todo => (
        <section key={todo.id} className="rounded-xl border bg-muted/30 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <ListTodoIcon className="size-3.5 text-muted-foreground" aria-hidden /> It waits for this to-do: {todo.title}
          </h3>
          <TodoDetail todo={todo} canWork={canWork} waiting={waiting} onAsk={ask => onTodo(todo, ask)} />
        </section>
      ))}
      {run.state === 'waiting' && run.next && !todos.length && <p className="text-xs">It goes on when the to-do of step {run.next.n} is done.</p>}

      {canWork && !over && (
        <div className="flex flex-wrap gap-2">
          {run.state === 'running' && (run.mine || owner) && (
            <button type="button" className={button} disabled={waiting} onClick={() => onRun('stop')}>
              {waiting && <Loader2Icon className="size-3.5 animate-spin" aria-hidden />} Let go of it
            </button>
          )}
          <button type="button" className={`${button} text-muted-foreground`} disabled={waiting} onClick={() => onRun('cancel')}>
            Cancel the run
          </button>
        </div>
      )}
    </div>
  );
}

const pillTab = (on: boolean) => `shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${on ? 'bg-background shadow-xs' : 'text-muted-foreground hover:text-foreground'}`;

export function RunsTab({
  runs,
  todos,
  error,
  first = 'open',
  updatedAt,
  refreshing = false,
  onChanged,
}: {
  runs: RunsView | null;
  todos: TodosView | null;
  error?: string | null;
  /** The filter to open on. */ first?: BoardFilter;
  /** When the board was last read. */ updatedAt?: number;
  refreshing?: boolean;
  /** Reads the runs and the to-dos again. */ onChanged: () => Promise<void> | void;
}) {
  const [filter, setFilter] = React.useState<BoardFilter>(first);
  const [skill, setSkill] = React.useState<string | null>(null);
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState<{ run: RunView } | { todo: TodoView } | null>(null);

  const cards = React.useMemo(() => boardCards(runs?.runs ?? [], todos?.todos ?? []), [runs, todos]);

  if (!runs || !todos) return error ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{error}</p> : <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />;

  const canWork = runs.role === 'owner' || runs.role === 'editor';
  const skills = boardSkills(cards);
  // a skill whose last card went away
  const picked = skill && skills.some(each => each.skill === skill) ? skill : null;
  const ofSkill = picked ? cards.filter(card => card.skill === picked) : cards;
  const counts = boardCounts(ofSkill);
  const shown = ofSkill.filter(card => inFilter(card, filter));
  const open = openKey ? (cards.find(card => card.key === openKey) ?? null) : null;

  const post = async (url: string, body: object) => {
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Could not change it (${res.status})`);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not change it');
    } finally {
      await onChanged();
      setBusy(false);
    }
  };
  const sendRun = (run: RunView, action: 'stop' | 'cancel') => post('/api/space/runs', { action, project: run.project, slug: run.slug });
  const sendTodo = (todo: TodoView, ask: TodoAsk) => post('/api/space/todos', { ...ask, id: todo.id });
  const askTodo = (todo: TodoView, ask: TodoAsk) => (ask.action === 'cancel' ? setCancelling({ todo }) : void sendTodo(todo, ask));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-1 flex min-w-0 flex-1 overflow-x-auto px-1">
          <div className="flex w-fit gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Skill">
            <button type="button" aria-pressed={!picked} onClick={() => setSkill(null)} className={pillTab(!picked)}>
              All <span className="tabular-nums text-muted-foreground">{boardCounts(cards)[filter]}</span>
            </button>
            {skills.map(each => (
              <button key={each.skill} type="button" aria-pressed={picked === each.skill} onClick={() => setSkill(each.skill)} className={pillTab(picked === each.skill)}>
                {each.skill} <span className="tabular-nums text-muted-foreground">{cards.filter(card => card.skill === each.skill && inFilter(card, filter)).length}</span>
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => void onChanged()} disabled={refreshing} title={updatedAt ? `Read at ${new Date(updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}. It refreshes every 30 seconds.` : 'Refresh'} aria-label="Refresh" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted">
          <RefreshCwIcon className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
        </button>
        <Select value={filter} onValueChange={value => setFilter(value as BoardFilter)}>
          <SelectTrigger className="h-8 w-36 shrink-0 text-xs" aria-label="Show">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {BOARD_FILTERS.map(each => (
              <SelectItem key={each} value={each} className="text-xs">
                {BOARD_LABEL[each]} <span className="tabular-nums text-muted-foreground">{counts[each]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {problem && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">{problem}</p>}

      {shown.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(card => (
            <Card key={card.key} card={card} showSkill={!picked} onOpen={() => setOpenKey(card.key)} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          <CircleDashedIcon className="mr-1.5 inline size-4" aria-hidden />
          {filter === 'open' ? 'Nothing is open. A session starts a run when it makes a production with a skill, and posts a to-do when it reaches a step it cannot do.' : `Nothing is ${BOARD_LABEL[filter].toLowerCase()}${picked ? ` for ${picked}` : ''}.`}
        </p>
      )}

      <Dialog open={!!open} onOpenChange={isOpen => !isOpen && setOpenKey(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                  <Pill card={open} />
                  <span className="min-w-0">{open.kind === 'run' ? open.run.title : open.todo.title}</span>
                </DialogTitle>
                <DialogDescription>
                  {open.kind === 'run' ? (
                    <>
                      {open.run.skill}
                      {open.run.title !== open.run.slug && (
                        <>
                          {' · '}
                          <span className="font-mono">{open.run.slug}</span>
                        </>
                      )}
                      {' · '}started by {mid(open.run.startedBy)}
                      {open.run.startedFrom ? ` from ${open.run.startedFrom}` : ''}, {when(open.run.startedAt)}
                    </>
                  ) : (
                    todoAbout(open.todo) || 'A to-do: a step waiting for a place that can do it'
                  )}
                </DialogDescription>
              </DialogHeader>
              {problem && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">{problem}</p>}
              <div className="flex min-h-0 flex-col overflow-y-auto">
                {open.kind === 'run' ? (
                  <RunDetail run={open.run} todos={open.todos} canWork={canWork} owner={runs.role === 'owner'} waiting={busy} onRun={action => (action === 'cancel' ? setCancelling({ run: open.run }) : void sendRun(open.run, action))} onTodo={askTodo} />
                ) : (
                  <TodoDetail todo={open.todo} canWork={canWork} waiting={busy} onAsk={ask => askTodo(open.todo, ask)} />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelling} onOpenChange={isOpen => !isOpen && setCancelling(null)}>
        <AlertDialogContent>
          {cancelling && 'run' in cancelling ? (
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this run?</AlertDialogTitle>
              <AlertDialogDescription>{cancelling.run.title}. No place will continue it, and the to-dos its steps wait for are cancelled too. What it saved to Productions and Releases stays.</AlertDialogDescription>
            </AlertDialogHeader>
          ) : (
            cancelling && (
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this to-do?</AlertDialogTitle>
                <AlertDialogDescription>
                  {cancelling.todo.title}. Nobody will be offered it any more
                  {cancelling.todo.state === 'claimed' ? `, and ${mid(cancelling.todo.claimedBy ?? 'whoever has it')} ${cancelling.todo.mine ? 'are' : 'is'} told to stop when they try to finish it` : ''}. You can open it again from Finished.
                </AlertDialogDescription>
              </AlertDialogHeader>
            )
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelling) void ('run' in cancelling ? sendRun(cancelling.run, 'cancel') : sendTodo(cancelling.todo, { action: 'cancel' }));
                setCancelling(null);
              }}
            >
              {cancelling && 'run' in cancelling ? 'Cancel the run' : 'Cancel the to-do'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
