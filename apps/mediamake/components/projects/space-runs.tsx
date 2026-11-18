'use client';

import * as React from 'react';
import { CheckIcon, CircleDashedIcon, CircleIcon, HourglassIcon, Loader2Icon, PlayIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { CopyLine } from './copy-line';
import { Result } from './space-todos';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { RunStepView, RunsView, RunView } from '@/lib/space/runs';

const list = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
const mid = (name: string) => (name === 'You' ? 'you' : name);
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const STATE: Record<RunView['state'], { label: string; className: string; Icon: typeof CheckIcon }> = {
  ready: { label: 'Ready to continue', className: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300', Icon: PlayIcon },
  waiting: { label: 'Waits for a to-do', className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300', Icon: HourglassIcon },
  running: { label: 'Running', className: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300', Icon: Loader2Icon },
  done: { label: 'Done', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', Icon: CheckIcon },
  cancelled: { label: 'Cancelled', className: 'text-muted-foreground', Icon: XIcon },
};
const STEP_ICON: Record<RunStepView['state'], { Icon: typeof CheckIcon; className: string }> = {
  done: { Icon: CheckIcon, className: 'text-emerald-600' },
  started: { Icon: Loader2Icon, className: 'text-violet-600' },
  unsaved: { Icon: TriangleAlertIcon, className: 'text-amber-600' },
  waiting: { Icon: HourglassIcon, className: 'text-amber-600' },
  todo: { Icon: CircleIcon, className: 'text-muted-foreground/50' },
};

const button = 'inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50';

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
            · waits in To do as <span className="font-mono text-[11px]">{step.todo}</span>
            {step.todoState && step.todoState !== 'open' ? ` (${step.todoState === 'claimed' ? 'picked up' : step.todoState})` : ''}
          </span>
        )}
      </div>
    </li>
  );
}

/** One production's run: how far it is, every step, and for one that can go on, the line that continues it. */
function RunCard({ run, canWork, owner, waiting, onAsk }: { run: RunView; canWork: boolean; owner: boolean; waiting: boolean; onAsk: (action: 'stop' | 'cancel') => void }) {
  const { label, className, Icon } = STATE[run.state];
  const over = run.state === 'done' || run.state === 'cancelled';
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}>
          <Icon className="size-3" aria-hidden /> {label}
        </span>
        <h3 className="min-w-0 flex-1 text-sm font-semibold">{run.title}</h3>
        {run.title !== run.slug && <span className="font-mono text-[11px] text-muted-foreground">{run.slug}</span>}
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">
        {run.skill} · {run.done} of {run.steps.length} steps saved · started by {mid(run.startedBy)}
        {run.startedFrom ? ` from ${run.startedFrom}` : ''}, {when(run.startedAt)}
      </p>

      <ol className="flex flex-col gap-1.5">
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
      {run.state === 'waiting' && run.next && <p className="text-xs">It goes on when step {run.next.n} is done in To do.</p>}
      {run.state === 'running' && (
        <p className="text-xs">
          {run.heldBy} {run.mine ? 'have' : 'has'} it{run.heldOn ? ` on ${run.heldOn}` : ''} since {run.heldSince && when(run.heldSince)}. After 2 hours with no step saved, another place may continue it.
        </p>
      )}
      {run.state === 'cancelled' && run.reason && <p className="text-xs text-muted-foreground">Why: {run.reason}</p>}

      {canWork && !over && (
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {run.state === 'running' && (run.mine || owner) && (
            <button type="button" className={button} disabled={waiting} onClick={() => onAsk('stop')}>
              {waiting && <Loader2Icon className="size-3.5 animate-spin" aria-hidden />} Let go of it
            </button>
          )}
          <button type="button" className={`${button} text-muted-foreground`} disabled={waiting} onClick={() => onAsk('cancel')}>
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * A project's runs (lib/space/runs): each production as it goes through its skill's steps, which are
 * saved, where, and which is next. A card each: the ones any place can continue first, then the ones
 * that wait or run; the finished ones are behind their own switch. Owners and editors run them;
 * viewers read.
 */
export function RunsTab({ view, error, onChanged }: { view: RunsView | null; error?: string | null; onChanged: () => Promise<void> | void }) {
  const [show, setShow] = React.useState<'open' | 'finished'>('open');
  const [busyWith, setBusyWith] = React.useState<string | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState<RunView | null>(null);

  if (!view) return error ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{error}</p> : <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />;

  const canWork = view.role === 'owner' || view.role === 'editor';
  const open = view.runs.filter(run => run.state !== 'done' && run.state !== 'cancelled');
  const finished = view.runs.filter(run => run.state === 'done' || run.state === 'cancelled');
  const shown = show === 'open' ? open : finished;

  const send = async (run: RunView, action: 'stop' | 'cancel') => {
    setBusyWith(run.slug);
    setProblem(null);
    try {
      const res = await fetch('/api/space/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, project: run.project, slug: run.slug }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Could not change it (${res.status})`);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not change it');
    } finally {
      await onChanged();
      setBusyWith(null);
    }
  };
  const tab = (value: 'open' | 'finished', label: string, count: number) => (
    <button type="button" aria-pressed={show === value} onClick={() => setShow(value)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${show === value ? 'bg-background shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}>
      {label} <span className="tabular-nums text-muted-foreground">{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        A production goes through its skill&apos;s steps, and every step is saved here. So it can stop in one place and go on in another: paste a run&apos;s line into Claude there, or run{' '}
        <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">mm run</span>.
      </p>
      {problem && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">{problem}</p>}
      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {tab('open', 'Open', open.length)}
        {tab('finished', 'Finished', finished.length)}
      </div>

      {shown.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map(run => (
            <RunCard key={run.slug} run={run} canWork={canWork} owner={view.role === 'owner'} waiting={busyWith === run.slug} onAsk={action => (action === 'cancel' ? setCancelling(run) : send(run, action))} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {show === 'open' ? (
            <>
              <CircleDashedIcon className="mr-1.5 inline size-4" aria-hidden />
              No run is open. A session starts one when it makes a production with a skill.
            </>
          ) : (
            'Nothing finished yet.'
          )}
        </p>
      )}

      <AlertDialog open={!!cancelling} onOpenChange={isOpen => !isOpen && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this run?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling?.title}. No place will continue it, and the to-dos its steps wait for are cancelled too. What it saved to Productions and Releases stays.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelling) void send(cancelling, 'cancel');
                setCancelling(null);
              }}
            >
              Cancel the run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
