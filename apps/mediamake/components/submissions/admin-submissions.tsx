'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ArrowUpRight, Check, FileText, GitPullRequest, Package, RefreshCw, ShieldCheck, Undo2, X } from 'lucide-react';
import { Empty, MemberTierPill, Section } from '@/components/memberships/parts';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { tierLabel, type GrantableTier } from '@/lib/memberships/tiers';
import { isUndecided, type MembershipChoice, type Submission, type SubmissionTier } from '@/lib/submissions/submission';
import { cn } from '@/lib/utils';
import { formatBytes, formatDay, KIND_WORDS, STATUS_STYLE, STATUS_WORDS, submissionsCall, type ShownFile, type SubmissionDetail, type SubmissionsData } from './model';

const RULE = "We publish nothing we don't use.";

/**
 * /app/submissions: what members sent to be listed in the store. An admin
 * opens one, reads its files and the production that proves it, picks the
 * lowest membership that opens it and approves, asks for changes or declines.
 */
export function AdminSubmissions() {
  const [data, setData] = useState<SubmissionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const open = useSearchParams().get('id');

  const load = useCallback(async () => {
    try {
      setData(await submissionsCall<SubmissionsData>());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const show = useCallback((id: string | null) => router.replace(id ? `${pathname}?id=${encodeURIComponent(id)}` : pathname, { scroll: false }), [router, pathname]);

  const groups = useMemo(() => {
    const all = data?.submissions ?? [];
    return {
      waiting: all.filter(submission => isUndecided(submission.status)),
      accepted: all.filter(submission => submission.status === 'approved' || submission.status === 'live'),
      closed: all.filter(submission => submission.status === 'declined' || submission.status === 'withdrawn'),
    };
  }, [data]);

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

  const waiting = data?.counts.pending ?? 0;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Members ask Claude to make what they built public, and it arrives here privately with the production made with it. Pick the lowest membership that opens it and
          approve. A Public skill becomes a pull request on {data?.setup.publicRepo ?? 'the public repository'}; everything else goes to {data?.setup.storeRepo ?? 'the store repository'} and
          is released as a package. Every item enters as Beta, and accepting one gives its sender a membership for 3 months.
        </p>
        <p className="text-xs font-medium text-muted-foreground">{RULE}</p>
        {data && <SetupNotes setup={data.setup} />}
      </div>

      <Tabs defaultValue="waiting" className="gap-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="waiting">
              Waiting
              {waiting > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">{waiting}</span>}
            </TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" className="size-9" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </div>
        {(['waiting', 'accepted', 'closed'] as const).map(tab => (
          <TabsContent key={tab} value={tab}>
            {data ? (
              <Section
                title={tab === 'waiting' ? 'Waiting for a decision' : tab === 'accepted' ? 'Accepted' : 'Declined and withdrawn'}
                about={
                  tab === 'waiting'
                    ? 'Newest first. One with changes asked comes back here when its sender sends it again.'
                    : tab === 'accepted'
                      ? 'Accepted items, with where each went.'
                      : 'Kept for the record. Their files are deleted.'
                }
              >
                {groups[tab].length === 0 ? (
                  <Empty>{tab === 'waiting' ? 'Nothing is waiting. A member sends one by asking Claude to make something they built public.' : 'Nothing here yet.'}</Empty>
                ) : (
                  <ul className="divide-y">
                    {groups[tab].map(submission => (
                      <Row key={submission.submissionId} submission={submission} sender={data.people[submission.clientId]} onOpen={() => show(submission.submissionId)} />
                    ))}
                  </ul>
                )}
              </Section>
            ) : (
              <Skeleton className="h-64 rounded-2xl" />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Review
        id={open}
        data={data}
        onClose={() => show(null)}
        onChanged={async () => {
          await load();
        }}
      />
    </div>
  );
}

function SetupNotes({ setup }: { setup: SubmissionsData['setup'] }) {
  const notes = [
    !setup.github && `Approving is off: set STORE_GITHUB_TOKEN, a token that can write contents and pull requests on ${setup.publicRepo} and ${setup.storeRepo} (docs/submissions.md).`,
    !setup.mail && 'Mail is not set up (RESEND_API_KEY), so senders are not told what you decide.',
  ].filter(Boolean) as string[];
  if (notes.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
      {notes.map(note => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

function StatusPill({ submission }: { submission: Submission }) {
  return <span className={cn('inline-flex w-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[submission.status])}>{STATUS_WORDS[submission.status]}</span>;
}

function Row({ submission, sender, onOpen }: { submission: Submission; sender?: { name: string; github?: string }; onOpen: () => void }) {
  const problems = submission.checks.problems.length;
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{submission.title}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{KIND_WORDS[submission.kind]}</span>
            <code className="text-xs text-muted-foreground">
              {submission.itemId}@{submission.version}
            </code>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{submission.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sender?.name ?? submission.clientId} · {formatDay(submission.updatedAt)}
            {submission.round > 1 && ` · sent ${submission.round} times`} · {submission.made ? `made with it: ${submission.made.title}` : 'no production named'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {problems > 0 && isUndecided(submission.status) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertTriangle className="size-3" />
              {problems} to fix
            </span>
          )}
          {submission.decision && <MemberTierPill tier={submission.decision.tier} />}
          <StatusPill submission={submission} />
        </div>
      </button>
    </li>
  );
}

/** One submission, opened: what it is, its proof, the checks, its files and the decision. */
function Review({ id, data, onClose, onChanged }: { id: string | null; data: SubmissionsData | null; onClose: () => void; onChanged: () => Promise<void> }) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setDetail(await submissionsCall<SubmissionDetail>(undefined, `?id=${encodeURIComponent(id)}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    setDetail(null);
    setError(null);
    void load();
  }, [load]);

  const submission = detail?.submission.submissionId === id ? detail.submission : null;
  const sender = submission && data?.people[submission.clientId];

  return (
    <Sheet open={!!id} onOpenChange={next => !next && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {submission?.title ?? 'Submission'}
            {submission && <StatusPill submission={submission} />}
          </SheetTitle>
          <SheetDescription>
            {submission ? (
              <>
                {KIND_WORDS[submission.kind]} <code>{submission.itemId}</code>, version {submission.version}, from {sender?.name ?? submission.clientId}
                {sender?.github && ` (${sender.github} on GitHub)`}
              </>
            ) : (
              'Loading…'
            )}
          </SheetDescription>
        </SheetHeader>

        {error ? (
          <p className="px-5 py-6 text-sm text-destructive">{error}</p>
        ) : !submission || !detail ? (
          <div className="flex flex-col gap-3 px-5 py-6">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 px-5 py-5">
            <Block title="What it does">
              <p className="text-sm">{submission.summary}</p>
              {submission.note && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">From the sender: {submission.note}</p>}
              {detail.existing && (
                <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  {detail.existing.madeBy
                    ? `The catalog already has ${submission.itemId}, made by ${detail.existing.madeBy}.`
                    : `This updates an item the catalog already has: ${detail.existing.title}, ${tierLabel(detail.existing.tier as never)}${detail.existing.version ? `, version ${detail.existing.version}` : ''}${detail.existing.inRepo ? ', a skill in the public repository (it can only stay Public)' : ''}.`}
                </p>
              )}
            </Block>

            <Block title="Made with this" about={RULE}>
              {submission.made ? (
                <>
                  <p className="text-sm font-medium">{submission.made.title}</p>
                  {submission.made.url ? (
                    <a href={submission.made.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-sm text-primary underline-offset-4 hover:underline">
                      {submission.made.url}
                      <ArrowUpRight className="size-3.5 shrink-0" />
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No link: the sender says it is not online. Ask for one if you cannot tell it is a finished production.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">None named: the sender is a Cohort member or an admin, who need not name one.</p>
              )}
            </Block>

            <Checks submission={submission} />
            <Files submission={submission} files={detail.files} />

            {isUndecided(submission.status) ? (
              <Decide
                submission={submission}
                data={data}
                existingInRepo={!!detail.existing?.inRepo}
                onDone={async () => {
                  await Promise.all([load(), onChanged()]);
                }}
              />
            ) : (
              <Decided
                submission={submission}
                onDone={async () => {
                  await Promise.all([load(), onChanged()]);
                }}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Block({ title, about, children }: { title: string; about?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {about && <p className="mt-0.5 text-xs text-muted-foreground">{about}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Checks({ submission }: { submission: Submission }) {
  const { problems, notes } = submission.checks;
  return (
    <Block title="Leak checks" about="Run again on the server when it arrived: keys, tokens and paths on a computer stop an approval.">
      {problems.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="size-4" />
          Nothing found
        </p>
      ) : (
        <ul className="flex flex-col gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
          {problems.map(problem => (
            <li key={problem}>
              <code>{problem}</code>
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          {notes.map(note => (
            <li key={note}>Look at: {note}</li>
          ))}
        </ul>
      )}
    </Block>
  );
}

function Files({ submission, files }: { submission: Submission; files: ShownFile[] }) {
  const first = files.find(file => file.path === 'SKILL.md') ?? files.find(file => 'text' in file) ?? files[0];
  const [path, setPath] = useState<string | undefined>(first?.path);
  const shown = files.find(file => file.path === path) ?? first;
  const sizes = useMemo(() => new Map(submission.files.map(file => [file.path, file.bytes])), [submission.files]);

  if (files.length === 0) {
    return (
      <Block title="Files">
        <p className="text-sm text-muted-foreground">
          {submission.files.length} files, {formatBytes(submission.bytes)}. They are no longer kept here: {submission.delivery ? 'the repository has them.' : 'it was closed.'}
        </p>
      </Block>
    );
  }
  return (
    <Block title="Files" about={`${files.length} files, ${formatBytes(submission.bytes)}. Read them before approving: a Public item is on GitHub for good.`}>
      <div className="overflow-hidden rounded-xl border">
        <ul className="max-h-40 overflow-y-auto border-b bg-muted/40 py-1 text-xs">
          {files.map(file => (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => setPath(file.path)}
                className={cn('flex w-full items-center gap-2 px-3 py-1 text-left hover:bg-muted', shown?.path === file.path && 'bg-muted font-medium')}
              >
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{file.path}</span>
                <span className="shrink-0 text-muted-foreground">{formatBytes(sizes.get(file.path) ?? 0)}</span>
              </button>
            </li>
          ))}
        </ul>
        {shown && 'text' in shown ? (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-xs leading-relaxed">
            {shown.text}
            {shown.cut && '\n… the rest is not shown here'}
          </pre>
        ) : (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">{shown?.path} is not text, so it is not shown.</p>
        )}
      </div>
    </Block>
  );
}

const TIER_ABOUT: Record<SubmissionTier, string> = {
  public: 'Everyone',
  plus: 'Plus members and above',
  pro: 'Pro members and above',
  cohort: 'The cohort only, hidden from everyone else',
};

function Decide({ submission, data, existingInRepo, onDone }: { submission: Submission; data: SubmissionsData | null; existingInRepo: boolean; onDone: () => Promise<void> }) {
  const [tier, setTier] = useState<SubmissionTier>('public');
  const [membership, setMembership] = useState<MembershipChoice | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const rows = data?.tiers ?? [];
  const row = rows.find(entry => entry.tier === tier);
  const earns: MembershipChoice = membership ?? row?.earns ?? 'plus';
  const route = row ? (submission.kind === 'skill' ? row.skill : row.other) : 'store';
  const blocked = submission.checks.problems.length > 0;

  const act = async (type: 'approve' | 'changes' | 'decline') => {
    setBusy(type);
    try {
      const result = await submissionsCall<{ mailed?: { sent: boolean; to?: string; why?: string }; notes?: string[]; listing?: string }>({
        type,
        submissionId: submission.submissionId,
        note,
        ...(type === 'approve' && { tier, membership: earns }),
      });
      const mailed = result.mailed ? (result.mailed.sent ? `Mailed to ${result.mailed.to}.` : `No mail sent: ${result.mailed.why ?? 'unknown reason'}.`) : '';
      toast.success(type === 'approve' ? 'Accepted' : type === 'changes' ? 'Changes asked' : 'Declined', { description: [mailed, result.listing, ...(result.notes ?? [])].filter(Boolean).join(' ') || undefined });
      await onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Block title="Decide">
      <div className="flex flex-col gap-4 rounded-xl border p-4">
        <div>
          <Label className="text-xs">Who opens it</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {rows.map(entry => {
              const refused = existingInRepo && entry.tier !== 'public';
              return (
                <button
                  key={entry.tier}
                  type="button"
                  disabled={refused}
                  onClick={() => {
                    setTier(entry.tier);
                    setMembership(null);
                  }}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/50 disabled:opacity-40',
                    tier === entry.tier && 'border-primary bg-primary/5',
                  )}
                >
                  <MemberTierPill tier={entry.tier} />
                  <span className="text-xs text-muted-foreground">{TIER_ABOUT[entry.tier]}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            {route === 'pr' ? <GitPullRequest className="mt-0.5 size-3.5 shrink-0" /> : <Package className="mt-0.5 size-3.5 shrink-0" />}
            {route === 'pr'
              ? `Opens a pull request on ${data?.setup.publicRepo}. It goes live when you merge it.`
              : `Goes to ${data?.setup.storeRepo} and is released as a package${submission.kind === 'mcp' ? ' when its folder holds a built .mcpb' : ''}. It is live at once.`}{' '}
            It enters as Beta.
          </p>
        </div>

        <div>
          <Label className="text-xs">Membership it earns its sender, for 3 months</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['none', 'plus', 'pro', 'cohort'] as MembershipChoice[]).map(choice => (
              <button
                key={choice}
                type="button"
                onClick={() => setMembership(choice)}
                className={cn('rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted/50', earns === choice && 'border-primary bg-primary/5 font-medium')}
              >
                {choice === 'none' ? 'None' : tierLabel(choice as GrantableTier)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Contributing again renews it. Nothing they already hold ends, and you can make it permanent on Manage Memberships.</p>
        </div>

        <div>
          <Label htmlFor="submission-note" className="text-xs">
            Note to the sender
          </Label>
          <Textarea id="submission-note" value={note} onChange={event => setNote(event.target.value)} rows={3} className="mt-2" placeholder="Needed to ask for changes or to decline. Optional when accepting." />
        </div>

        {blocked && <p className="text-xs text-red-700 dark:text-red-300">The leak checks stop on this one, so it cannot be accepted. Ask for changes.</p>}
        {data && !data.setup.github && <p className="text-xs text-amber-700 dark:text-amber-300">Approving needs STORE_GITHUB_TOKEN.</p>}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!!busy || blocked || !data?.setup.github} onClick={() => act('approve')}>
            <Check className="size-4" />
            {busy === 'approve' ? 'Accepting…' : `Accept as ${tierLabel(tier)}`}
          </Button>
          <Button size="sm" variant="outline" disabled={!!busy || note.trim().length < 3} onClick={() => act('changes')}>
            <Undo2 className="size-4" />
            Ask for changes
          </Button>
          <Button size="sm" variant="ghost" disabled={!!busy || note.trim().length < 3} onClick={() => act('decline')}>
            <X className="size-4" />
            Decline
          </Button>
        </div>
      </div>
    </Block>
  );
}

function Decided({ submission, onDone }: { submission: Submission; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const { decision, delivery, review } = submission;
  const finish = async (type: 'release' | 'released') => {
    setBusy(true);
    try {
      const result = await submissionsCall<{ notes?: string[]; listing?: string }>({ type, submissionId: submission.submissionId });
      // what its listing took from the package's README.md, and what was left as set by hand
      toast.success('It is live', { description: [result.listing, ...(result.notes ?? [])].filter(Boolean).join(' ') || undefined });
      await onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Block title="Decision">
      <div className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
        {decision ? (
          <>
            <p className="flex flex-wrap items-center gap-2">
              Accepted on {formatDay(decision.at)} as <MemberTierPill tier={decision.tier} />, in Beta.
            </p>
            <p className="text-xs text-muted-foreground">
              {decision.membership
                ? `Its sender earned ${tierLabel(decision.membership.tier)}${decision.membership.expiresAt ? ` until ${formatDay(decision.membership.expiresAt)}` : ''}.`
                : `No membership given${decision.noMembership ? `: ${decision.noMembership}` : ''}.`}
            </p>
            {decision.note && <p className="rounded-lg bg-muted px-3 py-2 text-xs">Note: {decision.note}</p>}
            {delivery?.kind === 'pr' && (
              <a href={delivery.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline">
                <GitPullRequest className="size-4" />
                Pull request #{delivery.number} on {delivery.repo}, {delivery.state === 'merged' ? 'merged' : 'open: it goes live when you merge it'}
              </a>
            )}
            {delivery?.kind === 'store' && (
              <>
                <a href={delivery.commitUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline">
                  <Package className="size-4" />
                  {delivery.path} in {delivery.repo}
                </a>
                {delivery.released ? (
                  <Link href={`/app/releases/${submission.itemId}#v${submission.version}`} className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                    Its release page
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                ) : (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    <p>Not released yet. {delivery.why}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => finish('release')}>
                        Try the release again
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => finish('released')}>
                        I released it by hand
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Mark it Ready on its release page once you have seen it proven, with the production above (<Link href={`/app/releases/${submission.itemId}`} className="underline underline-offset-2">release page</Link>).
            </p>
          </>
        ) : (
          <p>
            {STATUS_WORDS[submission.status]}
            {review && ` on ${formatDay(review.at)}: ${review.note}`}
          </p>
        )}
      </div>
    </Block>
  );
}
