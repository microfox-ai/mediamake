'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, Lock, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import type { CatalogItemRecord, CatalogKind, ReleaseTier } from '@/lib/catalog/types';
import { CATALOG_KINDS } from '@/lib/catalog/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ReleaseBoard } from './release-board';
import { ReleaseTimeline } from './release-timeline';
import { PeoplePanel } from './people-panel';
import { ItemAccessSheet } from './item-access-sheet';
import { ScheduleDialog } from './schedule-dialog';
import {
  COMMUNITY_GROUP,
  PRIVATE_GROUP,
  TIER_META,
  TIER_ORDER,
  adminCall,
  gateOf,
  groupMembers,
  tierOf,
  type AdminCatalog,
} from './model';

const TOAST_MS = 3000;

export type ItemAction =
  | { type: 'set_visibility'; visibility: 'private' | 'network' | 'public' }
  | { type: 'cancel_release' }
  | { type: 'set_never_publish'; neverPublish: boolean }
  | { type: 'schedule' }
  | { type: 'access' };

const ACTION_LABEL: Record<string, string> = {
  private: 'Moved to development',
  network: 'Marked production ready',
  public: 'Released to the public',
  cancel_release: 'Gate cancelled',
  vault_on: 'Moved to the vault',
  vault_off: 'Taken out of the vault',
};

/**
 * Admin dashboard for release tiers: which items sit in the vault, in
 * development, with the community or in public; the gates that turn
 * community items public by themselves; and who belongs to each tier.
 */
export function ReleasesDashboard() {
  const [data, setData] = useState<AdminCatalog | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<CatalogKind | 'all'>('all');
  const [tier, setTier] = useState<ReleaseTier | 'all'>('all');
  const [scheduling, setScheduling] = useState<CatalogItemRecord | null>(null);
  const [accessFor, setAccessFor] = useState<CatalogItemRecord | null>(null);
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
        case 'set_visibility':
          return run(ACTION_LABEL[action.visibility], { type: 'set_visibility', itemId: item.id, visibility: action.visibility });
        case 'cancel_release':
          return run(ACTION_LABEL.cancel_release, { type: 'cancel_release', itemId: item.id });
        case 'set_never_publish':
          return run(ACTION_LABEL[action.neverPublish ? 'vault_on' : 'vault_off'], {
            type: 'set_never_publish',
            itemId: item.id,
            neverPublish: action.neverPublish,
          });
      }
    },
    [run],
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.items ?? []).filter(
      item =>
        (kind === 'all' || item.kind === kind) &&
        (!q || item.title.toLowerCase().includes(q) || item.id.includes(q) || item.tags?.some(t => t.toLowerCase().includes(q))),
    );
  }, [data, query, kind]);

  const counts = useMemo(() => {
    const result: Record<ReleaseTier, number> = { vault: 0, development: 0, community: 0, public: 0 };
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
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Releases</h2>
        <p className="text-sm text-muted-foreground">
          Move skills, MCPs and apps from the vault to the public. Community items go public by themselves when their gate ends.
        </p>
      </div>

      {data && !data.publicReleasesOpen && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Public releases are locked site-wide.</span> Public items, including ones whose gate has ended,
            stay visible only to the community, private testers and grants until <code className="rounded bg-muted px-1 py-0.5 text-xs">MEDIAMAKE_PUBLIC_RELEASES=open</code> is set.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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

      <Tabs defaultValue="board" className="gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="people">
              People
              {data?.requests.length ? (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">{data.requests.length}</span>
              ) : null}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
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

        <TabsContent value="board">
          {data ? (
            <ReleaseBoard data={data} items={items} tiers={visibleTiers} now={now} onAction={onAction} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {TIER_ORDER.map(t => <Skeleton key={t} className="h-64 rounded-xl" />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          {data && <ReleaseTimeline data={data} items={items} now={now} onAction={onAction} />}
        </TabsContent>

        <TabsContent value="people">
          {data && (
            <PeoplePanel
              data={data}
              privateMembers={groupMembers(data, PRIVATE_GROUP)}
              communityMembers={groupMembers(data, COMMUNITY_GROUP)}
              run={run}
            />
          )}
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
