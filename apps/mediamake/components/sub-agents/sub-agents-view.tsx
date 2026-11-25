'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  BotIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  ClockIcon,
  CopyIcon,
  MessageCircleQuestionIcon,
  OctagonAlertIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  SquareIcon,
  UnplugIcon,
  XCircleIcon,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EFFORTS, MODELS, isActive, type AgentEvent, type AgentState, type AgentsView as View, type PlaceView, type RunCard, type RunView } from '@/lib/sub-agents/agents';
import { cn } from '@/lib/utils';

/**
 * The Sub-agents page (/app/sub-agents): the account's runs on the left, the one that is open on the
 * right with its conversation, and a box to answer it. It asks /api/sub-agents every few seconds while
 * the tab is in front, so a run that is working is seen working.
 */

/* ---------- words ---------- */

const money = (n: number) => (n > 0 && n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
const ago = (iso: string, now: number) => {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  return min < 1 ? 'now' : min < 60 ? `${min}m` : min < 48 * 60 ? `${Math.round(min / 60)}h` : `${Math.round(min / 1440)}d`;
};
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const folderName = (cwd: string) => cwd.split(/[\\/]/).filter(Boolean).slice(-2).join('/');

const STATE: Record<AgentState, { label: string; tone: string; icon?: LucideIcon }> = {
  running: { label: 'Running', tone: 'text-emerald-600 dark:text-emerald-400' },
  queued: { label: 'Waiting its turn', tone: 'text-muted-foreground', icon: ClockIcon },
  'needs-you': { label: 'Needs you', tone: 'text-amber-600 dark:text-amber-400', icon: MessageCircleQuestionIcon },
  blocked: { label: 'Blocked', tone: 'text-amber-600 dark:text-amber-400', icon: OctagonAlertIcon },
  capped: { label: 'At its cap', tone: 'text-amber-600 dark:text-amber-400', icon: CircleDollarSignIcon },
  done: { label: 'Done', tone: 'text-muted-foreground', icon: CheckIcon },
  stopped: { label: 'Stopped', tone: 'text-muted-foreground', icon: SquareIcon },
  failed: { label: 'Failed', tone: 'text-red-600 dark:text-red-400', icon: XCircleIcon },
  lost: { label: 'Lost', tone: 'text-red-600 dark:text-red-400', icon: UnplugIcon },
};

const GROUPS: { title: string; has: (state: AgentState) => boolean }[] = [
  { title: 'Needs you', has: s => s === 'needs-you' || s === 'capped' || s === 'blocked' },
  { title: 'Running', has: s => s === 'running' },
  { title: 'Waiting', has: s => s === 'queued' },
  { title: 'Earlier', has: s => s === 'done' || s === 'stopped' || s === 'failed' || s === 'lost' },
];

function StateMark({ state, className }: { state: AgentState; className?: string }) {
  const { tone, icon: Icon } = STATE[state];
  if (!Icon)
    return (
      <span className={cn('relative flex size-3.5 items-center justify-center', className)} aria-hidden>
        <span className="absolute size-2.5 animate-ping rounded-full bg-emerald-500/50" />
        <span className="size-2 rounded-full bg-emerald-500" />
      </span>
    );
  return <Icon className={cn('size-3.5 shrink-0', tone, className)} aria-hidden />;
}

function Copy({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        });
      }}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs transition-colors hover:bg-muted"
      title="Copy"
    >
      <span className="truncate">{label ?? text}</span>
      {done ? <CheckIcon className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <CopyIcon className="size-3 shrink-0 text-muted-foreground" />}
    </button>
  );
}

/* ---------- asking the API ---------- */

async function api<T>(body?: Record<string, unknown>, query = ''): Promise<T> {
  const res = await fetch(`/api/sub-agents${query}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `MediaMake answered ${res.status}`);
  return data;
}

/** Runs `tick` now and every `ms`, only while the tab is in front. */
function useEvery(tick: () => void, ms: number) {
  const saved = useRef(tick);
  saved.current = tick;
  useEffect(() => {
    const run = () => {
      if (document.visibilityState === 'visible') saved.current();
    };
    run();
    const timer = setInterval(run, ms);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
    };
  }, [ms]);
}

/* ---------- the top strip ---------- */

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-xl border bg-card px-3.5 py-2.5', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Summary({ view }: { view: View }) {
  const { credit, counts } = view;
  const used = credit ? Math.min(100, (credit.spent / credit.total) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-2.5 border-b px-4 py-3 lg:grid-cols-4 lg:px-6">
      <Tile label={credit ? (credit.ended ? 'Credit (ended)' : 'Credit left') : 'Spent'}>
        {credit ? (
          <>
            <p className="mt-0.5 text-lg font-semibold tabular-nums leading-tight">
              {money(credit.left)} <span className="text-xs font-normal text-muted-foreground">of {money(credit.total)}</span>
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full', used > 90 ? 'bg-red-500' : used > 70 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${used}%` }} />
            </div>
            {credit.ends && <p className="mt-1 text-[11px] text-muted-foreground">{credit.ended ? `Ended ${when(credit.ends)}: runs now bill the key` : `Until ${when(credit.ends)}`}</p>}
          </>
        ) : (
          <>
            <p className="mt-0.5 text-lg font-semibold tabular-nums leading-tight">{money(view.spent)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">No credit set on a computer yet</p>
          </>
        )}
      </Tile>
      <Tile label="Today">
        <p className="mt-0.5 text-lg font-semibold tabular-nums leading-tight">{money(view.spentToday)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{money(view.spent)} in all · Claude Code&apos;s count</p>
      </Tile>
      <Tile label="Now">
        <p className="mt-0.5 flex items-baseline gap-1.5 text-lg font-semibold tabular-nums leading-tight">
          {counts.running} <span className="text-xs font-normal text-muted-foreground">running</span>
          {counts.waiting > 0 && (
            <>
              {counts.waiting} <span className="text-xs font-normal text-muted-foreground">waiting</span>
            </>
          )}
        </p>
        <p className={cn('mt-1 text-[11px]', counts.needsYou ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{counts.needsYou ? `${counts.needsYou} need${counts.needsYou === 1 ? 's' : ''} you` : 'None waiting on you'}</p>
      </Tile>
      <Tile label="Places">
        <ul className="mt-1 space-y-0.5">
          {view.places.slice(0, 3).map(place => (
            <li key={place.name} className="flex items-center gap-1.5 text-xs">
              <span className={cn('size-1.5 shrink-0 rounded-full', place.listening ? 'bg-emerald-500' : 'bg-muted-foreground/40')} aria-hidden />
              <span className="truncate font-medium">{place.name}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">{place.listening ? 'listening' : 'not listening'}</span>
            </li>
          ))}
          {!view.places.length && <li className="text-xs text-muted-foreground">None has reported yet</li>}
        </ul>
      </Tile>
    </div>
  );
}

/* ---------- the list ---------- */

function RunRow({ run, open, now, onOpen }: { run: RunCard; open: boolean; now: number; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className={cn('flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors', open ? 'bg-accent' : 'hover:bg-accent/50')}>
        <StateMark state={run.state} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">{run.title}</span>
            <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{money(run.cost)}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {run.last ?? (
              <>
                {run.model} · {run.effort} · {run.place} · {ago(run.updated, now)}
              </>
            )}
          </span>
          {!!run.waiting && <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium">Your message is waiting</span>}
        </span>
      </button>
    </li>
  );
}

function RunList({ runs, openId, now, onOpen, onNew }: { runs: RunCard[]; openId: string | null; now: number; onOpen: (id: string) => void; onNew: () => void }) {
  const [find, setFind] = useState('');
  const shown = useMemo(() => {
    const words = find.trim().toLowerCase();
    return words ? runs.filter(run => `${run.title} ${run.id} ${run.model} ${run.place}`.toLowerCase().includes(words)) : runs;
  }, [runs, find]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-3 pt-3">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={find} onChange={e => setFind(e.target.value)} placeholder={`Search ${runs.length} sub-agent${runs.length === 1 ? '' : 's'}`} className="h-8 pl-8 text-sm" />
        </div>
        <Button size="sm" onClick={onNew} className="h-8 shrink-0">
          <PlusIcon className="size-4" /> New
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
        {GROUPS.map(group => {
          const rows = shown.filter(run => group.has(run.state));
          if (!rows.length) return null;
          return (
            <section key={group.title} className="mb-2">
              <h2 className="flex items-baseline gap-1.5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.title} <span className="tabular-nums">{rows.length}</span>
              </h2>
              <ul>
                {rows.map(run => (
                  <RunRow key={run.id} run={run} open={run.id === openId} now={now} onOpen={() => onOpen(run.id)} />
                ))}
              </ul>
            </section>
          );
        })}
        {!shown.length && <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">{runs.length ? <>Nothing matches &ldquo;{find}&rdquo;.</> : 'No runs yet. Start one with New, or with mm agents start.'}</p>}
      </div>
    </div>
  );
}

/* ---------- the conversation ---------- */

interface Step {
  tool?: AgentEvent;
  results: AgentEvent[];
  text?: AgentEvent;
  end?: AgentEvent;
}
interface TurnBlock {
  n: number;
  you?: AgentEvent;
  steps: Step[];
}

/** The events as turns: your message, then its words and each tool with the result that followed it. */
function turnsOf(events: AgentEvent[]): TurnBlock[] {
  const turns: TurnBlock[] = [];
  for (const event of events) {
    if (event.kind === 'you' || !turns.length) turns.push({ n: event.turn ?? turns.length + 1, ...(event.kind === 'you' && { you: event }), steps: [] });
    const turn = turns[turns.length - 1];
    if (event.kind === 'agent') turn.steps.push({ text: event, results: [] });
    else if (event.kind === 'tool') turn.steps.push({ tool: event, results: [] });
    else if (event.kind === 'result') {
      const last = [...turn.steps].reverse().find(step => step.tool && !step.results.length) ?? turn.steps[turn.steps.length - 1];
      if (last?.tool) last.results.push(event);
    } else if (event.kind === 'end') turn.steps.push({ end: event, results: [] });
  }
  return turns;
}

function ToolLine({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const failed = step.results.some(result => result.error);
  if (!step.tool) return null;
  return (
    <div className="rounded-lg border bg-muted/30">
      <button type="button" onClick={() => setOpen(!open)} disabled={!step.results.length} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
        <ChevronRightIcon className={cn('size-3 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90', !step.results.length && 'opacity-0')} aria-hidden />
        <span className={cn('shrink-0 text-xs font-medium', failed && 'text-red-600 dark:text-red-400')}>{step.tool.name}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{step.tool.text}</span>
      </button>
      {open && (
        <div className="space-y-1.5 border-t px-2.5 py-2">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs">{step.tool.text}</pre>
          {step.results.map(result => (
            <pre key={result.seq} className={cn('max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-background p-2 font-mono text-[11px] text-muted-foreground', result.error && 'text-red-600 dark:text-red-400')}>
              {result.text || '(nothing printed)'}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}

function Conversation({ run, events }: { run: RunView; events: AgentEvent[] }) {
  const turns = useMemo(() => turnsOf(events), [events]);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 lg:px-6">
      {turns.map(turn => {
        const facts = run.turnsList.find(t => t.n === turn.n);
        return (
          <section key={turn.n} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="font-medium uppercase tracking-wide">Turn {turn.n}</span>
              {turn.you?.at && <span>{when(turn.you.at)}</span>}
              <span className="h-px flex-1 bg-border" />
              {facts?.cost !== undefined && <span className="tabular-nums">{money(facts.cost)}</span>}
              {!!facts?.calls && <span className="tabular-nums">{facts.calls} tool calls</span>}
            </div>
            {turn.you && <p className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">{turn.you.text}</p>}
            {turn.steps.map((step, i) =>
              step.text ? (
                <p key={step.text.seq} className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {step.text.text}
                </p>
              ) : step.tool ? (
                <ToolLine key={step.tool.seq} step={step} />
              ) : step.end && i === turn.steps.length - 1 ? (
                <p key={step.end.seq} className="text-[11px] text-muted-foreground first-letter:uppercase">
                  {step.end.text}
                </p>
              ) : null,
            )}
            {facts?.error && <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300">{facts.error}</p>}
            {!!facts?.denied?.length && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
                <p className="font-medium text-amber-700 dark:text-amber-300">Not allowed in this run ({run.mode} permissions)</p>
                <ul className="mt-1 space-y-0.5 font-mono text-muted-foreground">
                  {facts.denied.map((line, n) => (
                    <li key={n} className="truncate">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
      {run.state === 'running' && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <StateMark state="running" />
          <span className="truncate">{run.last ?? 'Working'}</span>
        </p>
      )}
      {run.queued
        .filter(command => command.kind === 'message')
        .map(command => (
          <div key={command.id} className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
            <p className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-dashed px-3.5 py-2 text-sm text-muted-foreground">{command.message}</p>
            <UnsendButton id={command.id} />
          </div>
        ))}
      {run.refused && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {run.place} could not send {run.refused.message ? <>&ldquo;{run.refused.message.slice(0, 80)}&rdquo;</> : 'it'}: {run.refused.note}
        </p>
      )}
    </div>
  );
}

function UnsendButton({ id }: { id: string }) {
  const [gone, setGone] = useState(false);
  return (
    <button
      type="button"
      disabled={gone}
      onClick={() => {
        setGone(true);
        void api({ action: 'unsend', command: id }).catch(() => setGone(false));
      }}
      className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
    >
      Waiting to be read · take it back
    </button>
  );
}

/* ---------- one run ---------- */

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">{children}</dd>
    </div>
  );
}

function RunPane({ run, events, loading, onBack, onChanged, onForget }: { run: RunView; events: AgentEvent[]; loading: boolean; onBack: () => void; onChanged: () => void; onForget: () => void }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const scroller = useRef<HTMLDivElement>(null);
  const active = isActive(run.state);

  // stay at the newest line unless the reader scrolled up
  useEffect(() => {
    if (stuck.current) bottom.current?.scrollIntoView({ block: 'end' });
  }, [events.length, run.queued.length, run.state]);

  const ask = async (body: Record<string, unknown>) => {
    setBusy(true);
    setProblem(null);
    try {
      await api({ action: 'ask', ...body });
      onChanged();
      return true;
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'It could not be sent');
      return false;
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    const message = draft.trim();
    if (!message || busy) return;
    if (await ask({ kind: 'message', run: run.id, message })) setDraft('');
  };

  const hint = active
    ? 'It reads your message when this turn ends.'
    : run.state === 'lost'
      ? `${run.place} stopped reporting this run. Your message waits until that place listens again.`
      : run.listening
        ? `${run.place} is listening: your message starts the next turn there.`
        : null;
  const left = Math.max(0, run.cap - run.cost);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="border-b px-4 py-3 lg:px-6">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 size-8 md:hidden" aria-label="Back to the list">
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">{run.title}</h2>
            <p className={cn('mt-0.5 flex items-center gap-1.5 text-xs font-medium', STATE[run.state].tone)}>
              <StateMark state={run.state} />
              {STATE[run.state].label}
              <span className="font-normal text-muted-foreground">· {run.id}</span>
            </p>
          </div>
          {active && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void ask({ kind: 'stop', run: run.id })}>
              <SquareIcon className="size-3.5" /> Stop
            </Button>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Fact label="Model">
            {run.model} · {run.effort}
          </Fact>
          <Fact label="Place">
            {run.place} · <span className="text-muted-foreground">{folderName(run.cwd)}</span>
          </Fact>
          <Fact label="Spent">
            <span className="tabular-nums">{money(run.cost)}</span> <span className="text-muted-foreground">of {money(run.cap)}</span>
          </Fact>
          <Fact label="Turns">
            {run.turns} · <span className="text-muted-foreground">started {when(run.created)}</span>
          </Fact>
        </dl>
        <button type="button" onClick={() => setMore(!more)} className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <ChevronRightIcon className={cn('size-3 transition-transform', more && 'rotate-90')} aria-hidden /> {more ? 'Less' : 'More about this run'}
        </button>
        {more && (
          <div className="mt-2 space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <p>
              <span className="text-muted-foreground">Folder</span> <span className="break-all font-mono">{run.cwd}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Permissions</span> {run.mode}
              {run.loaded?.key && (
                <>
                  {' '}
                  · <span className="text-muted-foreground">Key</span> {run.loaded.key === 'ANTHROPIC_API_KEY' ? 'the API key' : run.loaded.key}
                </>
              )}
              {run.loaded?.claude && (
                <>
                  {' '}
                  · <span className="text-muted-foreground">Claude Code</span> {run.loaded.claude}
                </>
              )}
            </p>
            {run.from?.note && (
              <p>
                <span className="text-muted-foreground">Started for</span> {run.from.note}
              </p>
            )}
            {!!run.loaded?.mcp?.length && (
              <p>
                <span className="text-muted-foreground">MCPs it loaded</span> {run.loaded.mcp.join(', ')}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Copy text={`mm agents show ${run.id}`} />
              <Copy text={`mm agents continue ${run.id} "<message>"`} />
              <button
                type="button"
                className="ml-auto text-[11px] text-muted-foreground underline underline-offset-2 hover:text-red-600"
                onClick={() => {
                  if (window.confirm(`Remove "${run.title}" from this page? Its record stays on ${run.place}.`)) onForget();
                }}
              >
                Remove from this page
              </button>
            </div>
          </div>
        )}
      </header>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={e => {
          const el = e.currentTarget;
          stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {loading && !events.length ? <p className="px-6 py-8 text-center text-xs text-muted-foreground">Loading its conversation…</p> : <Conversation run={run} events={events} />}
        <div ref={bottom} />
      </div>

      <footer className="border-t px-4 py-3 lg:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {!active && !run.listening && run.state !== 'lost' && (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{run.place}</span> isn&apos;t listening, so a message waits. Start listening there:
              </span>
              <Copy text="mm agents watch" />
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send();
              }}
              rows={2}
              placeholder={run.state === 'needs-you' ? 'Answer its question…' : run.state === 'capped' ? 'Its cap is spent: raise it on its place to go on' : 'Message this sub-agent…'}
              className="max-h-40 min-h-16 flex-1 resize-none text-sm"
            />
            <Button onClick={() => void send()} disabled={!draft.trim() || busy} className="h-10">
              <SendIcon className="size-4" /> Send
            </Button>
          </div>
          <p className={cn('mt-1.5 text-[11px]', problem ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            {problem ?? (
              <>
                {hint ? `${hint} ` : ''}Up to {money(left)} is left of its cap. ⌘ Enter sends.
              </>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ---------- a new one ---------- */

function NewDialog({ open, places, onClose, onSent }: { open: boolean; places: PlaceView[]; onClose: () => void; onSent: (note: string) => void }) {
  const first = places.find(place => place.listening) ?? places[0];
  const [placeName, setPlaceName] = useState(first?.name ?? '');
  const place = places.find(p => p.name === placeName) ?? first;
  const [cwd, setCwd] = useState('');
  const [task, setTask] = useState('');
  const [title, setTitle] = useState('');
  const [model, setModel] = useState('');
  const [effort, setEffort] = useState('');
  const [cap, setCap] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const folder = cwd && place?.folders.includes(cwd) ? cwd : (place?.folders[0] ?? '');
  const defaults = place?.defaults ?? { model: 'opus', effort: 'high', cap: 15 };

  const send = async () => {
    if (!place) return;
    setBusy(true);
    setProblem(null);
    try {
      await api({ action: 'ask', kind: 'start', place: place.name, start: { task, cwd: folder, ...(title.trim() && { title: title.trim() }), model: model || defaults.model, effort: effort || defaults.effort, cap: Number(cap) > 0 ? Number(cap) : defaults.cap } });
      onSent(place.listening ? `Sent to ${place.name}: it appears here as it starts.` : `Waiting for ${place.name} to listen: run mm agents watch there.`);
      setTask('');
      setTitle('');
      onClose();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'It could not be sent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New sub-agent</DialogTitle>
          <DialogDescription>It runs on your API key, in a place of yours that is listening. It can&apos;t ask you anything mid-run, so put every choice in the task.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="agent-task">Task</Label>
            <Textarea id="agent-task" value={task} onChange={e => setTask(e.target.value)} rows={5} placeholder="What it should do, what done looks like, the skill to use, and where to stop for your review." className="text-sm" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="agent-title">Title</Label>
            <Input id="agent-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="A few words, or leave it to the task's first line" />
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Place</Label>
              <Select value={place?.name ?? ''} onValueChange={setPlaceName}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a place" />
                </SelectTrigger>
                <SelectContent>
                  {places.map(p => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} · {p.listening ? 'listening' : 'not listening'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Folder</Label>
              <Select value={folder} onValueChange={setCwd}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Where it works" />
                </SelectTrigger>
                <SelectContent>
                  {(place?.folders ?? []).map(f => (
                    <SelectItem key={f} value={f}>
                      {folderName(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3.5">
            <div className="grid gap-1.5">
              <Label>Model</Label>
              <Select value={model || defaults.model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([defaults.model, ...MODELS])].map(m => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Effort</Label>
              <Select value={effort || defaults.effort} onValueChange={setEffort}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EFFORTS.map(e => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="agent-cap">Cap, $</Label>
              <Input id="agent-cap" inputMode="decimal" value={cap} onChange={e => setCap(e.target.value)} placeholder={String(defaults.cap)} />
            </div>
          </div>
          {place && !place.listening && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{place.name}</span> isn&apos;t listening. It starts once you run this there:
              </span>
              <Copy text="mm agents watch" />
            </div>
          )}
          {problem && <p className="text-xs text-red-600 dark:text-red-400">{problem}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void send()} disabled={busy || !task.trim() || !folder}>
            Start, up to {money(Number(cap) > 0 ? Number(cap) : defaults.cap)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- nothing yet ---------- */

function Welcome() {
  const steps: [string, string, string][] = [
    ['Say what it would cost', 'mm agents start "<task>"', 'The model, the folder and the most it can spend. Nothing starts.'],
    ['Start it', 'mm agents start "<task>" --yes', 'A headless Claude Code on your API key, with your skills, mm and local MCPs.'],
    ['Let this page drive', 'mm agents watch', 'While it listens, you can answer, stop and start sub-agents from here.'],
  ];
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-12 lg:px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border bg-card">
          <BotIcon className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">No sub-agents yet</h2>
          <p className="text-sm text-muted-foreground">Runs on your Anthropic API key show up here as they work, from every computer and cloud session.</p>
        </div>
      </div>
      <ol className="divide-y rounded-xl border bg-card">
        {steps.map(([name, command, about], i) => (
          <li key={command} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">{i + 1}</span>
            <div className="min-w-48 flex-1">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{about}</p>
            </div>
            <Copy text={command} />
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">Or ask Claude: &ldquo;start a sub-agent to …&rdquo; with the use-api-agents skill. What each run sends here is yours alone: its title, cost, messages and tool calls, never a key.</p>
    </div>
  );
}

/* ---------- the page ---------- */

export function AgentsView({ initial }: { initial: View | null }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const openId = params.get('id');
  const [view, setView] = useState<View | null>(initial);
  const [failed, setFailed] = useState<string | null>(initial ? null : 'The sub-agents could not be read');
  const [detail, setDetail] = useState<{ id: string; run: RunView; events: AgentEvent[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const reading = useRef(false);

  // the address names the open run without asking the server for the page again
  const open = useCallback(
    (id: string | null) => {
      window.history.pushState(null, '', id ? `${pathname}?id=${id}` : pathname);
    },
    [pathname],
  );

  const readList = useCallback(async () => {
    try {
      setView(await api<View>());
      setFailed(null);
      setNow(Date.now());
    } catch (error) {
      setFailed(error instanceof Error ? error.message : 'The sub-agents could not be read');
    }
  }, []);
  useEvery(() => void readList(), 4000);

  const readOne = useCallback(async () => {
    if (!openId || reading.current) return;
    reading.current = true;
    try {
      const have = detail?.id === openId ? detail.events : [];
      let events = have;
      let run: RunView | null = null;
      for (let page = 0; page < 60; page++) {
        const after = events.length ? events[events.length - 1].seq : -1;
        const got = await api<{ run: RunView; events: AgentEvent[]; more: boolean }>(undefined, `?id=${openId}&after=${after}`);
        run = got.run;
        events = got.events.length ? [...events, ...got.events] : events;
        if (!got.more) break;
      }
      if (run) setDetail({ id: openId, run, events });
    } catch {
      // gone, or the network dropped: the list says which
    } finally {
      reading.current = false;
      setLoading(false);
    }
  }, [openId, detail]);

  useEffect(() => {
    if (!openId) return setDetail(null);
    if (detail?.id !== openId) {
      setDetail(null);
      setLoading(true);
    }
  }, [openId]);
  const lively = !!detail && (isActive(detail.run.state) || detail.run.queued.length > 0);
  useEvery(() => void readOne(), lively || loading ? 2500 : 10000);

  // on a wide screen the first run is open, so the right side is never empty
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  useEffect(() => {
    if (!openId && wide && view?.runs.length) open(view.runs[0].id);
  }, [openId, wide, view, open]);

  if (!view) return <p className="px-6 py-10 text-sm text-muted-foreground">{failed ?? 'Loading…'}</p>;
  if (!view.runs.length && !view.places.length) return <Welcome />;

  const shown = detail && detail.id === openId ? detail : null;
  return (
    <div className="flex h-[calc(100svh-var(--header-height))] min-h-0 flex-col md:h-[calc(100svh-var(--header-height)-1rem)]">
      <div className={cn(openId && 'hidden md:block')}>
        <Summary view={view} />
        {(note || failed) && (
          <p className={cn('border-b px-4 py-1.5 text-xs lg:px-6', failed ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            {failed ?? note}
            {note && !failed && (
              <button type="button" className="ml-2 underline underline-offset-2" onClick={() => setNote(null)}>
                Dismiss
              </button>
            )}
          </p>
        )}
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className={cn('min-h-0 w-full shrink-0 flex-col border-r md:flex md:w-80 lg:w-96', openId ? 'hidden' : 'flex')}>
          <RunList runs={view.runs} openId={openId} now={now} onOpen={open} onNew={() => setCreating(true)} />
        </aside>
        <div className={cn('min-h-0 min-w-0 flex-1 md:flex', openId ? 'flex' : 'hidden')}>
          {shown ? (
            <RunPane
              key={shown.id}
              run={shown.run}
              events={shown.events}
              loading={loading}
              onBack={() => open(null)}
              onChanged={() => {
                void readOne();
                void readList();
              }}
              onForget={() => {
                void api({ action: 'forget', run: shown.id }).then(() => {
                  open(null);
                  void readList();
                });
              }}
            />
          ) : (
            <p className="m-auto px-6 text-center text-sm text-muted-foreground">{openId ? (loading ? 'Loading…' : 'That sub-agent is not on this page any more.') : 'Pick a sub-agent to see what it did.'}</p>
          )}
        </div>
      </div>
      <NewDialog open={creating} places={view.places} onClose={() => setCreating(false)} onSent={setNote} />
    </div>
  );
}
