'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { slugOf, type CatalogItemRecord, type CatalogKind, type ReleaseTier } from '@/lib/catalog/types';
import { cn } from '@/lib/utils';
import { KIND_ICON } from './release-board';
import { ArchivedPill, TierPill } from './parts';
import { TIER_META, TIER_ORDER, itemPath, originOf, tierOf, type AdminCatalog } from './model';

const KIND_ORDER: CatalogKind[] = ['mcp', 'skill', 'app', 'tutorial', 'course'];
const KIND_PLURAL: Record<CatalogKind, string> = { mcp: 'MCPs', skill: 'Skills', app: 'Apps', tutorial: 'Tutorials', course: 'Courses' };

const ROW = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 md:grid-cols-[minmax(0,1.3fr)_9.5rem_minmax(0,1fr)_minmax(0,1.2fr)_1rem]';

/**
 * Everything in the catalog by kind, one row each: who can open it, where it
 * comes from, and what it connects to. Each row opens the item's page.
 */
export function ReleaseList({ data, items, now }: { data: AdminCatalog; items: CatalogItemRecord[]; now: number }) {
  // what needs or uses each item, across the whole catalog (not only the rows a search left)
  const usedBy = useMemo(() => {
    const users = new Map<string, Set<string>>();
    for (const item of [...data.items, ...data.thirdParty, ...data.cards, ...data.skills]) {
      const ids = [
        ...(item.install?.requires ?? []).flatMap(req => (req.type === 'item' ? [req.id] : [])),
        ...(item.install?.uses ?? []).map(use => use.id),
      ];
      for (const id of ids) users.set(id, (users.get(id) ?? new Set()).add(item.id));
    }
    return users;
  }, [data]);

  const groups = KIND_ORDER.map(kind => ({
    kind,
    rows: items
      .filter(item => item.kind === kind)
      .map(item => ({ item, tier: tierOf(item, now) }))
      // archived ones last, then by tier and title
      .sort(
        (a, b) =>
          Number(!!a.item.archivedAt) - Number(!!b.item.archivedAt) ||
          TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
          a.item.title.localeCompare(b.item.title),
      ),
  })).filter(group => group.rows.length);

  if (!groups.length) {
    return <p className="rounded-2xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">Nothing matches.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ kind, rows }) => (
        <section key={kind} className="overflow-hidden rounded-2xl border bg-card">
          <header className="flex items-baseline justify-between border-b px-5 py-3">
            <h3 className="text-sm font-semibold">{KIND_PLURAL[kind]}</h3>
            <span className="text-xs tabular-nums text-muted-foreground">{rows.length}</span>
          </header>
          <div className={cn(ROW, 'hidden border-b py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid')}>
            <span>Item</span>
            <span>Who can open it</span>
            <span>Comes from</span>
            <span>Connections</span>
            <span />
          </div>
          <ul className="divide-y">
            {rows.map(({ item, tier }) => (
              <Row key={item.id} item={item} tier={tier} usedBy={usedBy.get(item.id)?.size ?? 0} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ item, tier, usedBy }: { item: CatalogItemRecord; tier: ReleaseTier; usedBy: number }) {
  const Icon = KIND_ICON[item.kind];
  const uses = item.install?.uses ?? [];
  const connections = [
    uses.length ? `Works with ${uses.map(use => `${slugOf(use.id)}${use.need === 'required' ? ' (required)' : ''}`).join(', ')}` : '',
    usedBy ? `Used by ${usedBy}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className={cn(item.archivedAt && 'opacity-60')}>
      <Link href={itemPath(item.id)} className={cn(ROW, 'group py-3 transition-colors hover:bg-muted/40')}>
        <span className="flex min-w-0 items-center gap-3">
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TIER_META[tier].soft)}>
            <Icon className="size-4 opacity-80" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{item.title}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground">{item.id}</span>
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <TierPill tier={tier} />
          {item.archivedAt && <ArchivedPill />}
        </span>
        <span className="hidden truncate text-xs text-muted-foreground md:block">{originOf(item)}</span>
        <span
          className="hidden truncate text-xs text-muted-foreground md:block"
          title={uses.map(use => `${use.id} (${use.need}): ${use.for}`).join('\n') || undefined}
        >
          {connections || '—'}
        </span>
        <ChevronRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 md:block" />
      </Link>
    </li>
  );
}
