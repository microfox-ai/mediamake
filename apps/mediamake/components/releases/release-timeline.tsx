'use client';

import type { CatalogItemRecord } from '@/lib/catalog/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ItemAction } from './releases-dashboard';
import { KIND_ICON } from './release-board';
import { TIER_META, formatDate, formatLeft, gateOf, tierOf, type AdminCatalog } from './model';

/**
 * Gated items in the order they go public, then the most recent releases.
 */
export function ReleaseTimeline({
  data,
  items,
  now,
  onAction,
}: {
  data: AdminCatalog;
  items: CatalogItemRecord[];
  now: number;
  onAction: (item: CatalogItemRecord, action: ItemAction) => void;
}) {
  const upcoming = items
    .map(item => ({ item, gate: gateOf(item, now) }))
    .filter((row): row is { item: CatalogItemRecord; gate: NonNullable<ReturnType<typeof gateOf>> } => !!row.gate)
    .sort((a, b) => a.gate.end - b.gate.end);
  const released = items
    .filter(item => tierOf(item, now) === 'public')
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
    .slice(0, 12);
  const ungated = items.filter(item => tierOf(item, now) === 'community' && !item.publicAt);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-2xl border bg-card">
        <header className="border-b px-5 py-4">
          <h3 className="text-sm font-semibold">Going public</h3>
          <p className="text-xs text-muted-foreground">Community items with a gate. Each turns public by itself on its date.</p>
        </header>
        {upcoming.length ? (
          <ol className="relative px-5 py-4">
            <span className="absolute bottom-6 left-[29px] top-6 w-px bg-border" aria-hidden />
            {upcoming.map(({ item, gate }) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <li key={item.id} className="relative flex items-center gap-4 py-3">
                  <span className="relative z-10 flex size-5 items-center justify-center rounded-full border-2 border-violet-500 bg-card" />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className={cn('flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg', TIER_META.community.soft)}>
                      {item.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.cover} alt="" onError={e => (e.currentTarget.style.display = 'none')} className="size-full object-cover" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.id}</p>
                    </div>
                  </div>
                  <div className="hidden w-40 flex-col gap-1 sm:flex">
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(gate.progress * 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{formatLeft(gate.msLeft)} left</span>
                  </div>
                  <span className="w-24 text-right text-sm tabular-nums">{formatDate(gate.end)}</span>
                  <Button variant="ghost" size="sm" onClick={() => onAction(item, { type: 'schedule' })}>
                    Change
                  </Button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No gates running. Mark an item ready from the board to start its {data.defaultGateDays}-day gate.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-6">
        {ungated.length > 0 && (
          <section className="rounded-2xl border bg-card">
            <header className="border-b px-5 py-4">
              <h3 className="text-sm font-semibold">Community, no date</h3>
              <p className="text-xs text-muted-foreground">Ready, but not scheduled to go public.</p>
            </header>
            <ul className="divide-y">
              {ungated.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="truncate text-sm">{item.title}</span>
                  <Button variant="outline" size="sm" onClick={() => onAction(item, { type: 'schedule' })}>
                    Start gate
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border bg-card">
          <header className="border-b px-5 py-4">
            <h3 className="text-sm font-semibold">Recently released</h3>
          </header>
          {released.length ? (
            <ul className="divide-y">
              {released.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('size-1.5 shrink-0 rounded-full', TIER_META.public.dot)} />
                    <span className="truncate text-sm">{item.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.releasedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing released yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
