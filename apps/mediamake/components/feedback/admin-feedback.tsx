'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowUpRight, Check, GitPullRequestDraft, Link2, ListPlus, MessageSquareReply, RefreshCw, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import { MemberTierPill, Empty, Section } from '@/components/memberships/parts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { itemPagePath } from '@/lib/catalog/paths';
import { FEEDBACK_KINDS, GENERAL, isOpen, KIND_LABEL, type Feedback, type FeedbackGroup, type FeedbackKind } from '@/lib/feedback/feedback';
import type { KnownIssue } from '@/lib/feedback/known-issues';
import { cn } from '@/lib/utils';
import { BudgetCard } from './budget-card';
import { feedbackCall, formatDay, KIND_ORDER, KIND_STYLE, prWords, SEVERITY_WORDS, standing, type FeedbackData } from './model';

type Run = (label: string, body: Record<string, unknown>) => Promise<boolean>;

/** What a dialog asks for before an action runs. */
type Ask =
  | { type: 'answer'; feedback: Feedback }
  | { type: 'link_pr'; feedback: Feedback }
  | { type: 'ship'; feedback: Feedback }
  | { type: 'dismiss'; feedback: Feedback }
  | { type: 'issue_add'; itemId: string; feedback?: Feedback }
  | { type: 'issue_update'; issue: KnownIssue }
  | { type: 'issue_fixed'; issue: KnownIssue };

/**
 * /app/feedback: everything members sent, grouped by item, sorted by Claude
 * (bug, major problem, improvement, question, praise) with repeats folded
 * under the first report. From any feedback an admin can raise an automatic
 * draft pull request, tie it to an existing one, answer, add it to the item's
 * known issues, mark it shipped or dismiss it.
 */
export function AdminFeedback() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await feedbackCall<FeedbackData>());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run: Run = useCallback(
    async (label, body) => {
      try {
        const result = await feedbackCall<{ mailed?: { sent: boolean; to?: string; why?: string } | number; shipped?: number }>(body);
        const mailed = result.mailed;
        const description =
          typeof mailed === 'number'
            ? `${mailed} of ${result.shipped ?? mailed} mailed`
            : mailed
              ? mailed.sent
                ? `Mailed to ${mailed.to}`
                : `No mail sent: ${mailed.why ?? 'unknown reason'}`
              : undefined;
        toast.success(label, { description });
        await load();
        return true;
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      }
    },
    [load],
  );

  if (error && !data) {
    return (
      <div className="px-4 py-10 lg:px-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }

  const openCount = data?.groups.reduce((sum, group) => sum + group.open, 0) ?? 0;
  const openIssues = data?.issues.filter(issue => issue.status === 'open').length ?? 0;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Claude reads every feedback and sorts it. A bug or a major problem from a Plus member or above gets a draft pull request on its own; you can raise one from any
          feedback. Nothing merges without you, and the writer is mailed when the fix ships.
        </p>
        {data && <SetupNotes setup={data.setup} />}
      </div>

      {data ? <BudgetCard budget={data.budget} setup={data.setup} /> : <Skeleton className="h-28 rounded-2xl" />}

      <Tabs defaultValue="feedback" className="gap-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="feedback">
              Feedback
              {openCount > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">{openCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="issues">
              Known issues
              {openIssues > 0 && <span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 text-[10px] font-medium">{openIssues}</span>}
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" className="size-9" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </div>
        <TabsContent value="feedback">{data ? <Groups data={data} run={run} onAsk={setAsk} /> : <Skeleton className="h-64 rounded-2xl" />}</TabsContent>
        <TabsContent value="issues">{data ? <Issues data={data} run={run} onAsk={setAsk} /> : <Skeleton className="h-64 rounded-2xl" />}</TabsContent>
      </Tabs>

      <AskDialog ask={ask} data={data} run={run} onClose={() => setAsk(null)} />
    </div>
  );
}

function SetupNotes({ setup }: { setup: FeedbackData['setup'] }) {
  const notes = [
    !setup.triage && 'Claude is not reading feedback on this deployment: set ANTHROPIC_API_KEY.',
    !setup.prs && 'Draft pull requests are off: set FEEDBACK_GITHUB_TOKEN and FEEDBACK_HOOK_SECRET (docs/feedback.md).',
    !setup.mail && 'Mail is not set up (RESEND_API_KEY), so writers are not told when you answer or ship.',
  ].filter(Boolean) as string[];
  if (notes.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5 text-xs text-amber-700 dark:text-amber-300">
      {notes.map(note => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

function KindPill({ kind, count }: { kind: FeedbackKind | 'unread'; count?: number }) {
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', KIND_STYLE[kind])}>
      {kind === 'unread' ? 'Not read' : KIND_LABEL[kind]}
      {count !== undefined && <span className="tabular-nums opacity-70">{count}</span>}
    </span>
  );
}

function Groups({ data, run, onAsk }: { data: FeedbackData; run: Run; onAsk: (ask: Ask) => void }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<FeedbackKind | 'unread' | 'all'>('all');
  const [closed, setClosed] = useState(false);

  const groups = useMemo(() => {
    const words = query.trim().toLowerCase();
    const shows = (feedback: Feedback) =>
      (closed || isOpen(feedback)) &&
      (kind === 'all' || (feedback.triage?.kind ?? 'unread') === kind) &&
      (!words ||
        [feedback.text, feedback.triage?.summary, feedback.itemId, data.titles[feedback.itemId ?? ''], data.people[feedback.clientId], feedback.clientId].some(value =>
          value?.toLowerCase().includes(words),
        ));
    return data.groups
      .map(group => ({ ...group, threads: group.threads.filter(thread => shows(thread.feedback) || thread.duplicates.some(shows)) }))
      .filter(group => group.threads.length > 0);
  }, [data, query, kind, closed]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search feedback, items, people" className="pl-8" aria-label="Search feedback" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Kind">
          {(['all', ...FEEDBACK_KINDS, 'unread'] as const).map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
              className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', kind === value ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
            >
              {value === 'all' ? 'All' : value === 'unread' ? 'Not read' : KIND_LABEL[value]}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={closed} onChange={event => setClosed(event.target.checked)} className="size-3.5" />
          Show shipped and dismissed
        </label>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <Empty>{data.groups.length === 0 ? 'No feedback yet. It arrives from the item pages and from Claude through mm-use.' : 'Nothing matches. Clear the search or show shipped and dismissed.'}</Empty>
        </div>
      ) : (
        groups.map(group => <Group key={group.key} group={group} data={data} run={run} onAsk={onAsk} />)
      )}
    </div>
  );
}

function Group({ group, data, run, onAsk }: { group: FeedbackGroup; data: FeedbackData; run: Run; onAsk: (ask: Ask) => void }) {
  const general = group.key === GENERAL;
  const issues = data.issues.filter(issue => issue.itemId === group.key && issue.status === 'open').length;
  return (
    <Section
      title={general ? 'MediaMake as a whole' : (data.titles[group.key] ?? group.key)}
      about={general ? 'Feedback that names no item' : `${group.key} · ${group.open} open of ${group.total}${issues ? ` · ${issues} known ${issues === 1 ? 'issue' : 'issues'}` : ''}`}
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          {KIND_ORDER.filter(kind => group.byKind[kind]).map(kind => (
            <KindPill key={kind} kind={kind} count={group.byKind[kind]} />
          ))}
          {!general && (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link href={itemPagePath(group.key)}>
                Its page <ArrowUpRight className="size-3" />
              </Link>
            </Button>
          )}
        </div>
      }
    >
      <ul className="divide-y">
        {group.threads.map(thread => (
          <Thread key={thread.feedback.feedbackId} feedback={thread.feedback} duplicates={thread.duplicates} data={data} run={run} onAsk={onAsk} />
        ))}
      </ul>
    </Section>
  );
}

function Thread({ feedback, duplicates, data, run, onAsk }: { feedback: Feedback; duplicates: Feedback[]; data: FeedbackData; run: Run; onAsk: (ask: Ask) => void }) {
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (label: string, body: Record<string, unknown>) => {
    setBusy(body.type as string);
    await run(label, { ...body, feedbackId: feedback.feedbackId });
    setBusy(null);
  };
  const triage = feedback.triage;
  const stands = standing(feedback);
  const open = isOpen(feedback);
  const pr = feedback.pr;
  const prLive = pr?.state === 'requested' || pr?.state === 'open';

  return (
    <li className="flex flex-col gap-2 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <KindPill kind={triage?.kind ?? 'unread'} />
        {triage && <span className="text-xs text-muted-foreground">{SEVERITY_WORDS[triage.severity]} severity</span>}
        {stands && <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', stands.style)}>{stands.label}</span>}
        {duplicates.length > 0 && (
          <button type="button" onClick={() => setMore(value => !value)} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium hover:bg-muted-foreground/20" aria-expanded={more}>
            +{duplicates.length} {duplicates.length === 1 ? 'says' : 'say'} the same
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          <time dateTime={feedback.createdAt}>{formatDay(feedback.createdAt)}</time>
        </span>
      </div>

      {triage && <p className="text-sm font-medium">{triage.summary}</p>}
      <p className={cn('whitespace-pre-line text-sm', triage && 'text-muted-foreground')}>{feedback.text}</p>
      {!triage && feedback.triageSkipped && <p className="text-xs text-amber-700 dark:text-amber-300">{feedback.triageSkipped}</p>}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{data.people[feedback.clientId] ?? feedback.clientId}</span>
        <MemberTierPill tier={feedback.tier} />
        {feedback.version && <span className="font-mono">v{feedback.version.replace(/^v/, '')}</span>}
        <span>{feedback.source === 'mm-use' ? 'from Claude' : feedback.source === 'web' ? 'from its page' : `from ${feedback.source}`}</span>
      </div>

      {pr && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs">
          <GitPullRequestDraft className={cn('size-3.5', pr.state === 'failed' ? 'text-amber-600' : pr.state === 'merged' ? 'text-violet-600' : 'text-emerald-600')} />
          {pr.url ? (
            <a href={pr.url} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
              {prWords(pr)}
            </a>
          ) : (
            <span className="font-medium">{prWords(pr)}</span>
          )}
          {pr.runUrl && (
            <a href={pr.runUrl} target="_blank" rel="noreferrer" className="text-muted-foreground underline underline-offset-4">
              the run
            </a>
          )}
          {open && pr.state !== 'requested' && (
            <button type="button" className="text-muted-foreground underline underline-offset-4" onClick={() => act('Pull request untied', { type: 'unlink_pr' })}>
              untie
            </button>
          )}
        </p>
      )}

      {feedback.answer && (
        <p className="whitespace-pre-line border-l-2 pl-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Answered {formatDay(feedback.answer.at)}: </span>
          {feedback.answer.text}
        </p>
      )}
      {feedback.dismissed?.reason && <p className="text-xs text-muted-foreground">Dismissed: {feedback.dismissed.reason}</p>}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {open ? (
          <>
            {!prLive && (
              <Button size="sm" variant="outline" disabled={!data.setup.prs || busy !== null} onClick={() => act('Fix run started. The draft pull request shows here when it is up', { type: 'raise_pr' })} title={data.setup.prs ? `Claude Code makes a draft pull request on ${data.setup.prRepo}` : 'Draft pull requests are not set up'}>
                <GitPullRequestDraft /> {busy === 'raise_pr' ? 'Starting…' : pr?.state === 'failed' ? 'Try the fix again' : 'Raise a draft PR'}
              </Button>
            )}
            {!prLive && (
              <Button size="sm" variant="ghost" onClick={() => onAsk({ type: 'link_pr', feedback })}>
                <Link2 /> Add to an existing PR
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onAsk({ type: 'answer', feedback })}>
              <MessageSquareReply /> {feedback.answer ? 'Answer again' : 'Answer'}
            </Button>
            {feedback.itemId && (
              <Button size="sm" variant="ghost" onClick={() => onAsk({ type: 'issue_add', itemId: feedback.itemId!, feedback })}>
                <ListPlus /> Known issue
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onAsk({ type: 'ship', feedback })}>
              <Check /> Shipped
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onAsk({ type: 'dismiss', feedback })}>
              <X /> Dismiss
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => act('Reopened', { type: 'reopen' })}>
            <RotateCcw /> Reopen
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={!data.setup.triage || busy !== null} onClick={() => act('Read by Claude', { type: 'triage' })} className="text-muted-foreground">
          <Sparkles /> {busy === 'triage' ? 'Reading…' : triage ? 'Read again' : 'Read with Claude'}
        </Button>
      </div>

      {more && (
        <ul className="mt-1 flex flex-col gap-2 border-l-2 pl-4">
          {duplicates.map(repeat => (
            <li key={repeat.feedbackId} className="flex flex-col gap-1">
              <p className="whitespace-pre-line text-sm text-muted-foreground">{repeat.text}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{data.people[repeat.clientId] ?? repeat.clientId}</span>
                <MemberTierPill tier={repeat.tier} />
                <time dateTime={repeat.createdAt}>{formatDay(repeat.createdAt)}</time>
                {standing(repeat) && <span>{standing(repeat)!.label}</span>}
              </div>
            </li>
          ))}
          <li className="text-xs text-muted-foreground">They ship with it: each writer is mailed when this one is marked shipped.</li>
        </ul>
      )}
    </li>
  );
}

function Issues({ data, run, onAsk }: { data: FeedbackData; run: Run; onAsk: (ask: Ask) => void }) {
  const [itemId, setItemId] = useState('');
  const byItem = useMemo(() => {
    const map = new Map<string, KnownIssue[]>();
    for (const issue of data.issues) map.set(issue.itemId, [...(map.get(issue.itemId) ?? []), issue]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data.issues]);
  const valid = /^(skill|mcp|app|tutorial|course)\/[a-z0-9][a-z0-9-]{0,63}$/.test(itemId.trim());

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Known issues"
        about="The list each item's page shows to everyone who can open it. Feedback stays private; this is what you choose to tell. A fixed issue stays on the page for 30 days."
        action={
          <form
            className="flex items-center gap-2"
            onSubmit={event => {
              event.preventDefault();
              if (valid) onAsk({ type: 'issue_add', itemId: itemId.trim() });
            }}
          >
            <Input value={itemId} onChange={event => setItemId(event.target.value)} placeholder="skill/pack-brand-kit" className="h-8 w-52 font-mono text-xs" aria-label="Item id" />
            <Button type="submit" size="sm" disabled={!valid}>
              <ListPlus /> Add
            </Button>
          </form>
        }
      >
        {byItem.length === 0 ? (
          <Empty>No known issues. Add one from a feedback, or by an item&apos;s id here.</Empty>
        ) : (
          <div className="divide-y">
            {byItem.map(([id, issues]) => (
              <div key={id} className="px-5 py-4">
                <Link href={itemPagePath(id)} className="text-sm font-semibold hover:underline">
                  {data.titles[id] ?? id}
                </Link>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{id}</span>
                <ul className="mt-2 flex flex-col gap-3">
                  {issues.map(issue => (
                    <li key={issue.issueId} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <p className={cn('text-sm', issue.status === 'fixed' ? 'text-muted-foreground line-through' : 'font-medium')}>{issue.title}</p>
                        {issue.note && <p className="whitespace-pre-line text-xs text-muted-foreground">{issue.note}</p>}
                        <p className="text-xs text-muted-foreground">
                          {issue.status === 'fixed' && issue.fixedAt ? `Fixed${issue.fixedIn ? ` in v${issue.fixedIn.replace(/^v/, '')}` : ''} on ${formatDay(issue.fixedAt)}` : `Since ${formatDay(issue.createdAt)}`}
                          {issue.feedbackIds.length > 0 && ` · from ${issue.feedbackIds.length} feedback`}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onAsk({ type: 'issue_update', issue })}>
                          Edit
                        </Button>
                        {issue.status === 'open' ? (
                          <Button size="sm" variant="ghost" onClick={() => onAsk({ type: 'issue_fixed', issue })}>
                            <Check /> Fixed
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => run('Reopened', { type: 'issue_reopen', issueId: issue.issueId })}>
                            <RotateCcw /> Reopen
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => run('Removed', { type: 'issue_remove', issueId: issue.issueId })}>
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/** One dialog for every action that needs words first. */
function AskDialog({ ask, data, run, onClose }: { ask: Ask | null; data: FeedbackData | null; run: Run; onClose: () => void }) {
  const [main, setMain] = useState('');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ask) return;
    setBusy(false);
    setMain(ask.type === 'issue_add' ? (ask.feedback?.triage?.summary ?? '') : ask.type === 'issue_update' ? ask.issue.title : ask.type === 'ship' ? (ask.feedback.version ?? '') : '');
    setExtra(ask.type === 'issue_update' ? (ask.issue.note ?? '') : '');
  }, [ask]);

  if (!ask || !data) return null;
  const item = 'feedback' in ask && ask.feedback?.itemId ? (data.titles[ask.feedback.itemId] ?? ask.feedback.itemId) : 'itemId' in ask ? (data.titles[ask.itemId] ?? ask.itemId) : 'issue' in ask ? (data.titles[ask.issue.itemId] ?? ask.issue.itemId) : 'MediaMake';
  const sameItem = ask.type === 'issue_add' && ask.feedback ? data.issues.filter(issue => issue.itemId === ask.itemId && issue.status === 'open' && !issue.feedbackIds.includes(ask.feedback!.feedbackId)) : [];

  const copy = {
    answer: { title: 'Answer this feedback', about: `Your answer shows on ${item}'s page for its writer${data.setup.mail ? ', and is mailed to them' : ''}.`, main: 'Your answer', long: true, button: 'Send the answer', need: true },
    link_pr: { title: 'Add to an existing pull request', about: 'When that pull request merges, this feedback ships and its writer is mailed.', main: 'Its link, owner/name#12, or its number', long: false, button: 'Tie them', need: true },
    ship: { title: 'The fix is out', about: `Marks it shipped, with everything that says the same, and mails each writer${data.setup.mail ? '' : ' once mail is set up'}.`, main: 'Fixed in version (optional)', long: false, button: 'Mark shipped', need: false },
    dismiss: { title: 'Dismiss this feedback', about: 'It leaves the open list. Its writer is not told.', main: 'Why (optional, for the other admins)', long: false, button: 'Dismiss', need: false },
    issue_add: { title: `A known issue for ${item}`, about: 'Shown on its page to everyone who can open it. Say what goes wrong, in your words, with nothing private from the feedback.', main: 'What goes wrong', long: false, button: 'Add to known issues', need: true },
    issue_update: { title: 'Edit the known issue', about: `Shown on ${item}'s page.`, main: 'What goes wrong', long: false, button: 'Save', need: true },
    issue_fixed: { title: 'Mark it fixed', about: 'It stays on the page as fixed for 30 days.', main: 'Fixed in version (optional)', long: false, button: 'Mark fixed', need: false },
  }[ask.type];
  const hasNote = ask.type === 'issue_add' || ask.type === 'issue_update' || ask.type === 'ship';

  const submit = async () => {
    setBusy(true);
    const value = main.trim();
    const note = extra.trim() || undefined;
    const done =
      ask.type === 'answer'
        ? await run('Answered', { type: 'answer', feedbackId: ask.feedback.feedbackId, text: value })
        : ask.type === 'link_pr'
          ? await run('Tied to the pull request', { type: 'link_pr', feedbackId: ask.feedback.feedbackId, pr: value })
          : ask.type === 'ship'
            ? await run('Marked shipped', { type: 'ship', feedbackId: ask.feedback.feedbackId, version: value || undefined, note })
            : ask.type === 'dismiss'
              ? await run('Dismissed', { type: 'dismiss', feedbackId: ask.feedback.feedbackId, reason: value || undefined })
              : ask.type === 'issue_add'
                ? await run('Added to known issues', { type: 'issue_add', itemId: ask.itemId, title: value, note, feedbackId: ask.feedback?.feedbackId })
                : ask.type === 'issue_update'
                  ? await run('Saved', { type: 'issue_update', issueId: ask.issue.issueId, title: value, note })
                  : await run('Marked fixed', { type: 'issue_fixed', issueId: ask.issue.issueId, fixedIn: value || undefined });
    setBusy(false);
    if (done) onClose();
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.about}</DialogDescription>
        </DialogHeader>
        {'feedback' in ask && ask.feedback && <p className="line-clamp-4 whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{ask.feedback.text}</p>}
        {sameItem.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Already on the list? Tie this feedback to it instead:</p>
            {sameItem.map(issue => (
              <button
                key={issue.issueId}
                type="button"
                className="rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={async () => {
                  if (ask.type === 'issue_add' && ask.feedback && (await run('Tied to the known issue', { type: 'issue_link', issueId: issue.issueId, feedbackId: ask.feedback.feedbackId }))) onClose();
                }}
              >
                {issue.title}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex flex-col gap-3"
          onSubmit={event => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="feedback-ask-main">{copy.main}</Label>
            {copy.long ? (
              <Textarea id="feedback-ask-main" value={main} onChange={event => setMain(event.target.value)} className="min-h-28" maxLength={4000} autoFocus />
            ) : (
              <Input id="feedback-ask-main" value={main} onChange={event => setMain(event.target.value)} maxLength={300} autoFocus />
            )}
          </div>
          {hasNote && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-ask-note">{ask.type === 'ship' ? 'A line for the mail (optional)' : 'A workaround, or what is being done (optional)'}</Label>
              <Textarea id="feedback-ask-note" value={extra} onChange={event => setExtra(event.target.value)} maxLength={600} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || (copy.need && main.trim().length < 2)}>
              {busy ? 'Saving…' : copy.button}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
