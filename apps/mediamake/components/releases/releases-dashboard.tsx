'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, CalendarClock, GraduationCap, Lock, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import type { CatalogItemRecord, CatalogKind, ItemTier } from '@/lib/catalog/types';
import { CATALOG_KINDS } from '@/lib/catalog/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ReleaseBoard } from './release-board';
import { ReleaseList } from './release-list';
import { ReleaseTimeline } from './release-timeline';
import { ItemAccessSheet } from './item-access-sheet';
import { ScheduleDialog } from './schedule-dialog';
import { NewVideoItemDialog } from './video-panel';
import {
  TIER_META,
  TIER_ORDER,
  adminCall,
  gateOf,
  tierOf,
  type AdminCatalog,
} from './model';

const TOAST_MS = 3000;

export type ItemAction =
  | { type: 'set_item_tier'; tier: ItemTier }
  | { type: 'cancel_release' }
  | { type: 'schedule' }
  | { type: 'access' };

const ACTION_LABEL: Record<ItemTier | 'cancel_release', string> = {
  admin: 'Moved to the vault',
  cohort: 'Moved to the cohort',
  pro: 'Moved to Pro',
  plus: 'Moved to Plus',
  public: 'Released to the public',
  cancel_release: 'Gate cancelled',
};

/**
 * Admin dashboard for release tiers: every item and what it connects to
 * (each opens its own page, /app/releases/<kind>/<slug>); which items sit in
 * the vault, with the cohort, Pro, Plus or public; the gates
 * that turn gated items public by themselves; and who holds each
 * tier. Tutorials and courses are added here (New tutorial, New course).
 * `?access=<id>` opens that item's access sheet.
 */
export function ReleasesDashboard() {
  const [data, setData] = useState<AdminCatalog | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<CatalogKind | 'all'>('all');
  // ?tab=board links straight to a tab. People moved to Manage Memberships: old ?tab=people links follow.
  const [tab, setTab] = useState('items');
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (wanted === 'people') return window.location.replace('/app/memberships');
    if (wanted && ['items', 'board', 'timeline'].includes(wanted)) setTab(wanted);
  }, []);
  const [tier, setTier] = useState<ItemTier | 'all'>('all');
  const [scheduling, setScheduling] = useState<CatalogItemRecord | null>(null);
  const [accessFor, setAccessFor] = useState<CatalogItemRecord | null>(null);
  const [adding, setAdding] = useState<'tutorial' | 'course' | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setData(await adminCall<AdminCatalog>());
      setError(null);
      setNow(Date.now());
    } catch (e) {
      setError({ message: (e as Error).message, status: (e as { status?: number }).status });
    }
  }, []);

  useEffect(() => {
    load();
    // Keep countdowns honest while the page is open.
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  // An item page's "Manage access" lands here with ?access=<id>: open that sheet once.
  const openedFromLink = useRef(false);
  useEffect(() => {
    if (!data || openedFromLink.current) return;
    openedFromLink.current = true;
    const url = new URL(window.location.href);
    const wanted = url.searchParams.get('access');
    const found = wanted ? [...data.items, ...data.thirdParty, ...data.cards, ...data.skills].find(item => item.id === wanted) : undefined;
    if (!found) return;
    setAccessFor(found);
    url.searchParams.delete('access');
    window.history.replaceState(null, '', url);
  }, [data]);

  const run = useCallback(
    async (label: string, body: Record<string, unknown>) => {
      try {
        await adminCall(body);
        toast.success(label, { duration: TOAST_MS });
        await load();
        return true;
      } catch (e) {
        toast.error((e as Error).message, { duration: TOAST_MS * 2 });
        return false;
      }
    },
    [load],
  );

  const onAction = useCallback(
    (item: CatalogItemRecord, action: ItemAction) => {
      switch (action.type) {
        case 'schedule':
          return setScheduling(item);
        case 'access':
          return setAccessFor(item);
        case 'set_item_tier':
          return run(ACTION_LABEL[action.tier], { type: 'set_item_tier', itemId: item.id, tier: action.tier });
        case 'cancel_release':
          return run(ACTION_LABEL.cancel_release, { type: 'cancel_release', itemId: item.id });
      }
    },
    [run],
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(data?.items ?? []), ...(data?.thirdParty ?? []), ...(data?.cards ?? []), ...(data?.skills ?? [])].filter(
      item =>
        (kind === 'all' || item.kind === kind) &&
        (!q || item.title.toLowerCase().includes(q) || item.id.includes(q) || item.tags?.some(t => t.toLowerCase().includes(q))),
    );
  }, [data, query, kind]);

  // items defined in the repo (skills, third-party items, cards) were never released through a gate: the timeline leaves them out
  const released = useMemo(() => {
    const fromRepo = new Set([...(data?.skills ?? []), ...(data?.thirdParty ?? []), ...(data?.cards ?? [])].map(item => item.id));
    return items.filter(item => !fromRepo.has(item.id));
  }, [data, items]);

  const counts = useMemo(() => {
    const result: Record<ItemTier, number> = { admin: 0, cohort: 0, pro: 0, plus: 0, public: 0 };
    for (const item of items) result[tierOf(item, now)] += 1;
    return result;
  }, [items, now]);

  const upcoming = useMemo(
    () => items.filter(item => gateOf(item, now)).sort((a, b) => a.publicAt!.localeCompare(b.publicAt!)),
    [items, now],
  );

  if (error?.status === 403) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-5" />}
        title="Admins only"
        body="Releases are managed by the site owner. Ask them if you need access to something."
      />
    );
  }

  if (error && !data) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-5" />}
        title="Couldn't load releases"
        body={error.message}
        action={<Button variant="outline" size="sm" onClick={load}>Try again</Button>}
      />
    );
  }

  const nextUp = upcoming[0];
  const visibleTiers = tier === 'all' ? TIER_ORDER : [tier];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Releases</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Every skill, MCP, app, tutorial and course MediaMake hands out: who can open it, where it comes from and what it
            works with. Open one to edit its whole store listing: its level (Alpha, Beta, Production), advice, card, README and video. Our apps,
            MCPs, tutorials and courses move between the vault, the cohort, Pro, Plus and the public on the Board; skills in the
            public repo, and MCPs or skills made by others, are always public.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdding('tutorial')} disabled={!data}>
            <BookOpen />
            New tutorial
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAdding('course')} disabled={!data}>
            <GraduationCap />
            New course
          </Button>
        </div>
      </div>

      {data && !data.publicReleasesOpen && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Public releases are locked site-wide.</span> Public items, including ones whose gate has ended,
            stay visible only to members (Plus and above) and grants until <code className="rounded bg-muted px-1 py-0.5 text-xs">MEDIAMAKE_PUBLIC_RELEASES=open</code> is set.
            Skills are open to everyone either way.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {TIER_ORDER.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(tier === t ? 'all' : t)}
            className={cn(
              'group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-foreground/20',
              tier === t && 'ring-2 ring-offset-0 ' + TIER_META[t].ring,
            )}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className={cn('size-2 rounded-full', TIER_META[t].dot)} />
              {TIER_META[t].label}
            </span>
            <span className="text-3xl font-semibold tabular-nums tracking-tight">
              {data ? counts[t] : <Skeleton className="h-8 w-10" />}
            </span>
            <span className="text-xs text-muted-foreground">{TIER_META[t].who}</span>
          </button>
        ))}
        <div className="col-span-2 flex flex-col gap-3 rounded-xl border bg-card p-4 lg:col-span-1">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CalendarClock className="size-3.5" />
            Next to go public
          </span>
          {nextUp ? (
            <>
              <span className="truncate text-base font-semibold">{nextUp.title}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(nextUp.publicAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {upcoming.length} gated
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{data ? 'Nothing scheduled' : <Skeleton className="h-5 w-24" />}</span>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        {/* stacked until there is room for the tabs, the search and every kind side by side */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-9">
              <Link href="/app/memberships">
                People
                {data?.requests.length ? (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">{data.requests.length}</span>
                ) : null}
              </Link>
            </Button>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search items" className="h-9 w-52 pl-8" />
            </div>
            <div className="flex rounded-lg border p-0.5">
              {(['all', ...CATALOG_KINDS] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs capitalize text-muted-foreground transition',
                    kind === k && 'bg-muted font-medium text-foreground',
                  )}
                >
                  {k === 'all' ? 'All' : `${k}s`}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="size-9" onClick={load} aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="items">
          {data ? (
            <ReleaseList data={data} items={tier === 'all' ? items : items.filter(item => tierOf(item, now) === tier)} now={now} />
          ) : (
            <div className="flex flex-col gap-6">
              {[0, 1].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="board">
          {data ? (
            <ReleaseBoard
              data={data}
              items={items}
              tiers={visibleTiers}
              now={now}
              onAction={onAction}
              collapseSkills={kind === 'all' && !query.trim()}
              onShowSkills={() => setKind('skill')}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {TIER_ORDER.map(t => <Skeleton key={t} className="h-64 rounded-xl" />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          {data && <ReleaseTimeline data={data} items={released} now={now} onAction={onAction} />}
        </TabsContent>

      </Tabs>

      {data && (
        <>
          <ScheduleDialog
            item={scheduling}
            defaultDays={data.defaultGateDays}
            onClose={() => setScheduling(null)}
            onSchedule={async (item, body) => {
              if (await run(`${item.title} goes public ${body.label}`, { type: 'schedule_release', itemId: item.id, ...body.request })) {
                setScheduling(null);
              }
            }}
          />
          <NewVideoItemDialog kind={adding} existing={data.items} onClose={() => setAdding(null)} />
          <ItemAccessSheet
            data={data}
            item={accessFor ? data.items.find(i => i.id === accessFor.id) ?? accessFor : null}
            onClose={() => setAccessFor(null)}
            run={run}
          />
        </>
      )}
    </div>
  );
}

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        {action}
      </div>
    </div>
  );
}
