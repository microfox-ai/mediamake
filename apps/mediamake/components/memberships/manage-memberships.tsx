'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Infinity as InfinityIcon, Link2, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auditText, type AuditEvent } from '@/lib/memberships/audit';
import { countByTier, daysLeft, endsSoon, type PersonRow } from '@/lib/memberships/people';
import { requestedTier } from '@/lib/memberships/requests';
import { MEMBER_TIERS, tierInfo, tierLabel, type MemberTier } from '@/lib/memberships/tiers';
import { cn } from '@/lib/utils';
import { ChangeDialog } from './change-dialog';
import { LinkDialog } from './link-dialog';
import { formatDay, formatMoment, howGot, isLink, mailedLine, membershipsCall, type Mailed, type MembershipsData } from './model';
import { Empty, MemberTierPill, Section } from './parts';
import { Suggested } from './suggested';

const TABS = ['people', 'requests', 'suggested', 'log'] as const;
type Tab = (typeof TABS)[number];

/**
 * /app/memberships: everyone with their tier, how they got it and when it
 * ends; changing one, with a reason; linking old accounts; requests
 * waiting for a decision; and the audit log.
 */
export function ManageMemberships() {
  const [data, setData] = useState<MembershipsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('people');
  const [changing, setChanging] = useState<PersonRow | null>(null);
  const [linking, setLinking] = useState<PersonRow | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await membershipsCall<MembershipsData>());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    // ?tab=requests links straight to a tab
    const wanted = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (wanted && TABS.includes(wanted)) setTab(wanted);
  }, [load]);

  /** Runs one change, says what happened (the mail included), and reloads. */
  const run = useCallback(
    async (label: string, body: Record<string, unknown>) => {
      try {
        const result = await membershipsCall<{ mailed?: Mailed }>(body);
        toast.success(label, { description: mailedLine(result.mailed) });
        await load();
        return result;
      } catch (e) {
        toast.error((e as Error).message);
        return null;
      }
    },
    [load],
  );

  const names = useMemo(() => new Map(data?.people.map(person => [person.clientId, person.name]) ?? []), [data]);
  const nameOf = useCallback((clientId?: string) => (clientId ? (names.get(clientId) ?? clientId) : ''), [names]);

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

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <p className="max-w-2xl text-sm text-muted-foreground">
          A membership comes from contributing or from an admin. There is nothing to pay. Every change here needs a reason, and the person is told by mail.
        </p>
        {data && !data.mail && (
          <p className="text-xs text-amber-700 dark:text-amber-300">Mail is not set up on this deployment (RESEND_API_KEY), so changes are saved without telling anyone.</p>
        )}
      </div>

      {data ? <TierCounts people={data.people} /> : <Skeleton className="h-24 rounded-2xl" />}

      <Tabs value={tab} onValueChange={value => setTab(value as Tab)} className="gap-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {data?.requests.length ? (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">{data.requests.length}</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="suggested">
              Suggested
              {data?.suggestions?.length ? (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">{data.suggestions.length}</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="log">Audit log</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" className="size-9" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </div>

        <TabsContent value="people">
          {data ? <People data={data} onChange={setChanging} onLink={setLinking} run={run} /> : <Skeleton className="h-96 rounded-2xl" />}
        </TabsContent>
        <TabsContent value="requests">{data && <Requests data={data} nameOf={nameOf} run={run} />}</TabsContent>
        <TabsContent value="suggested">{data && <Suggested data={data} run={run} />}</TabsContent>
        <TabsContent value="log">{data && <AuditLog events={data.audit} titles={data.titles} nameOf={nameOf} />}</TabsContent>
      </Tabs>

      <ChangeDialog person={changing} mail={!!data?.mail} onClose={() => setChanging(null)} onSave={body => run('Membership changed', body)} />
      <LinkDialog person={linking} onClose={() => setLinking(null)} onLinked={load} />
    </div>
  );
}

type Run = (label: string, body: Record<string, unknown>) => Promise<{ mailed?: Mailed } | null>;

/** How many people hold each tier, highest first. */
function TierCounts({ people }: { people: PersonRow[] }) {
  const counts = countByTier(people);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {[...MEMBER_TIERS].reverse().map(tier => (
        <div key={tier} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <MemberTierPill tier={tier} />
            <span className="text-2xl font-semibold tabular-nums">{counts[tier]}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{tierInfo(tier).how}</p>
        </div>
      ))}
    </div>
  );
}

function People({
  data,
  onChange,
  onLink,
  run,
}: {
  data: MembershipsData;
  onChange: (person: PersonRow) => void;
  onLink: (person: PersonRow) => void;
  run: Run;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MemberTier | 'all' | 'ending' | 'unlinked'>('all');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.people.filter(person => {
      if (filter === 'ending' ? !endsSoon(person.membership) : filter === 'unlinked' ? person.linked : filter !== 'all' && person.tier !== filter) return false;
      return !q || [person.name, person.email, person.clientId, person.githubLogin].some(value => value?.toLowerCase().includes(q));
    });
  }, [data.people, query, filter]);

  const ending = data.people.filter(person => endsSoon(person.membership)).length;
  const unlinked = data.people.filter(person => !person.linked).length;
  const filters: { value: typeof filter; label: string }[] = [
    { value: 'all', label: `All ${data.people.length}` },
    ...[...MEMBER_TIERS].reverse().map(tier => ({ value: tier, label: tierLabel(tier) })),
    ...(ending ? [{ value: 'ending' as const, label: `Ending soon ${ending}` }] : []),
    ...(unlinked ? [{ value: 'unlinked' as const, label: `Not linked ${unlinked}` }] : []),
  ];

  return (
    <Section
      title="Everyone"
      about="Each account, its membership, how they got it and when it ends."
      action={
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a person" className="h-9 pl-8 sm:w-56" />
        </div>
      }
    >
      <div className="flex flex-wrap gap-1 border-b px-5 py-3">
        {filters.map(option => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted',
              filter === option.value && 'bg-muted font-medium text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {shown.length ? (
        <ul className="divide-y">
          {shown.map(person => (
            <PersonLine key={person.clientId} person={person} onChange={onChange} onLink={onLink} run={run} />
          ))}
        </ul>
      ) : (
        <Empty>Nobody matches.</Empty>
      )}
    </Section>
  );
}

function PersonLine({ person, onChange, onLink, run }: { person: PersonRow; onChange: (person: PersonRow) => void; onLink: (person: PersonRow) => void; run: Run }) {
  const { membership } = person;
  const left = daysLeft(membership);
  const soon = endsSoon(membership);
  const until = person.isAdmin
    ? 'While they are an admin'
    : !membership
      ? person.legacy
        ? 'Until an admin changes it'
        : ''
      : membership.expiresAt
        ? `Until ${formatDay(membership.expiresAt)}`
        : membership.permanent
          ? 'Permanent'
          : 'Until an admin removes it';

  return (
    <li className="grid gap-x-4 gap-y-2 px-5 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          <span className="truncate">{person.name}</span>
          {!person.linked && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">Not linked</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {person.email ? `${person.email} · ` : ''}
          <span className="font-mono">{person.clientId}</span>
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <MemberTierPill tier={person.tier} />
          <span className="text-xs text-muted-foreground">{howGot(person)}</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {until && <span className={cn(soon && 'font-medium text-amber-700 dark:text-amber-300')}>{soon ? `Ends in ${left} day${left === 1 ? '' : 's'}, on ${formatDay(membership!.expiresAt!)}` : until}</span>}
          {membership?.ref && (
            <>
              {' · '}
              {isLink(membership.ref) ? (
                <a href={membership.ref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {membership.ref.replace(/^https:\/\/(www\.)?/, '')}
                </a>
              ) : (
                membership.ref
              )}
            </>
          )}
          {membership?.note && ` · ${membership.note}`}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 md:justify-end">
        {membership?.expiresAt && (
          <Button
            size="sm"
            variant="ghost"
            title="No expiry any more: it lasts until an admin removes it"
            onClick={() => run(`${person.name}'s membership is permanent`, { type: 'make_permanent', membershipId: membership.membershipId })}
          >
            <InfinityIcon className="size-3.5" />
            Make permanent
          </Button>
        )}
        {!person.linked && (
          <Button size="sm" variant="ghost" onClick={() => onLink(person)}>
            <Link2 className="size-3.5" />
            Link
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onChange(person)}>
          Change
        </Button>
      </div>
    </li>
  );
}

function Requests({ data, nameOf, run }: { data: MembershipsData; nameOf: (clientId?: string) => string; run: Run }) {
  return (
    <Section
      title="Waiting for a decision"
      about="People who asked for the next membership on their Subscription page, or for one locked item. Approving a membership gives it until an admin removes it; approving an item opens that item only."
    >
      {data.requests.length ? (
        <ul className="divide-y">
          {data.requests.map(request => {
            const tier = requestedTier(request.itemId);
            const what = tier ? `the ${tierLabel(tier)} membership` : (data.titles[request.itemId] ?? request.itemId);
            const person = data.people.find(p => p.clientId === request.clientId);
            return (
              <li key={request.requestId} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span>
                      <span className="font-medium">{nameOf(request.clientId)}</span> asks for {what}
                    </span>
                    {person && <MemberTierPill tier={person.tier} />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDay(request.createdAt)}
                    {request.message ? ` · “${request.message}”` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => run('Request rejected', { type: 'resolve_request', requestId: request.requestId, approve: false })}>
                    <X className="size-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run(tier ? `${nameOf(request.clientId)} is now ${tierLabel(tier)}` : 'Access given', { type: 'resolve_request', requestId: request.requestId, approve: true })}
                  >
                    <Check className="size-3.5" />
                    Approve
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>Nobody is waiting.</Empty>
      )}
    </Section>
  );
}

function AuditLog({ events, titles, nameOf }: { events: AuditEvent[]; titles: Record<string, string>; nameOf: (clientId?: string) => string }) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(100);
  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      events
        .map(event => ({ event, who: nameOf(event.clientId), by: nameOf(event.by), what: auditText(event, event.ref ? titles[event.ref] : undefined) }))
        .filter(row => !q || [row.who, row.by, row.what, row.event.reason, row.event.ref].some(value => value?.toLowerCase().includes(q))),
    [events, titles, nameOf, q],
  );

  return (
    <Section
      title="Audit log"
      about="Who changed whose membership, when and why. Read from the records themselves, which are never deleted."
      action={
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find in the log" className="h-9 pl-8 sm:w-56" />
        </div>
      }
    >
      {rows.length ? (
        <>
          <ul className="divide-y">
            {rows.slice(0, shown).map(({ event, who, by, what }) => (
              <li key={event.id} className="grid gap-x-4 gap-y-0.5 px-5 py-2.5 text-sm md:grid-cols-[11rem_minmax(0,1fr)]">
                <span className="text-xs tabular-nums text-muted-foreground md:pt-0.5">{formatMoment(event.at)}</span>
                <div className="min-w-0">
                  <p>
                    {who && <span className="font-medium">{who}: </span>}
                    {what}
                    {by && <span className="text-muted-foreground"> · by {by}</span>}
                  </p>
                  {(event.reason || (event.ref && event.kind === 'given')) && (
                    <p className="text-xs text-muted-foreground">
                      {event.reason}
                      {event.reason && event.ref && event.kind === 'given' ? ' · ' : ''}
                      {event.kind === 'given' && event.ref}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {rows.length > shown && (
            <div className="border-t px-5 py-3">
              <Button variant="ghost" size="sm" onClick={() => setShown(shown + 100)}>
                Show 100 more of {rows.length - shown}
              </Button>
            </div>
          )}
        </>
      ) : (
        <Empty>{q ? 'Nothing matches.' : 'Nothing has happened yet.'}</Empty>
      )}
    </Section>
  );
}
