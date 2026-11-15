'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LockIcon, SearchIcon, XIcon } from 'lucide-react';
import { HealthBadge } from '@/components/catalog/health';
import { RunsBadges } from '@/components/catalog/runs';
import { MadeByLine } from '@/components/catalog/uses';
import { VideoThumb } from '@/components/catalog/video';
import { Input } from '@/components/ui/input';
import { EXPLORE_PARAMS, KIND_LABEL, MEMBER_KINDS, explore, type AppItem, type ExploreFilters, type MemberKind } from '@/lib/app-shell/member';
import { cn } from '@/lib/utils';
import { BetaBadge, FailedNote, ItemActions, RuleLine, TierBadge } from './item-bits';

function writeFilters(f: ExploreFilters) {
  const url = new URL(window.location.href);
  for (const key of EXPLORE_PARAMS) url.searchParams.delete(key);
  if (f.q.trim()) url.searchParams.set('q', f.q.trim());
  if (f.kind) url.searchParams.set('kind', f.kind);
  if (f.category) url.searchParams.set('category', f.category);
  const show = [f.failed && 'failed', f.internal && 'internal', f.archived && 'archived'].filter(Boolean).join(',');
  if (show) url.searchParams.set('show', show);
  if (!f.locked) url.searchParams.set('locked', '0');
  window.history.replaceState(null, '', url);
}

/**
 * Explore: every skill, MCP and app the member's membership opens, and the
 * ones a higher membership would open, locked and saying which (the cohort's
 * never reach this page: lib/app-shell/member › appItems). Search, kind and
 * category; Beta and membership badges; failed items only behind their
 * filter, with the reason.
 */
export function Explore({
  items,
  categories,
  initial,
  rule,
  membership,
}: {
  items: AppItem[];
  /** The skill registry's categories, in their order, with what each is. */
  categories: { id: string; about: string }[];
  initial: ExploreFilters;
  rule: string;
  /** The member's own membership, e.g. `Public`. */
  membership: string;
}) {
  const [filters, setFilters] = useState(initial);
  const update = (change: Partial<ExploreFilters>) =>
    setFilters(current => {
      const next = { ...current, ...change };
      writeFilters(next);
      return next;
    });

  // "/" jumps to the search, as on the site's Skills tab
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key !== '/' || target?.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const order = useMemo(() => categories.map(category => category.id), [categories]);
  const about = useMemo(() => new Map(categories.map(category => [category.id, category.about])), [categories]);
  const result = useMemo(() => explore(items, filters, order), [items, filters, order]);
  const allKinds = MEMBER_KINDS.reduce((sum, kind) => sum + result.kinds[kind], 0);
  const lockedCount = useMemo(() => items.filter(item => item.locked).length, [items]);
  const failedCount = useMemo(() => items.filter(item => item.failed).length, [items]);
  const filtered = !!(filters.q.trim() || filters.kind || filters.category);
  const hiddenTotal = result.hidden.failed + result.hidden.internal + result.hidden.archived;

  return (
    <div className="flex flex-col gap-5 px-4 py-6 lg:px-6">
      <RuleLine rule={rule} />

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={search}
          type="search"
          value={filters.q}
          onChange={e => update({ q: e.target.value })}
          placeholder="Search skills, MCPs and apps: what it makes, a name, a style…"
          aria-label="Search"
          className="h-10 pl-9 pr-9"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-[10px] text-muted-foreground sm:block">/</kbd>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Kind">
          <Chip active={!filters.kind} onClick={() => update({ kind: null })}>
            All <Count n={allKinds} />
          </Chip>
          {MEMBER_KINDS.map(kind => (
            <Chip key={kind} active={filters.kind === kind} onClick={() => update({ kind: filters.kind === kind ? null : (kind as MemberKind), category: null })}>
              {KIND_LABEL[kind].many} <Count n={result.kinds[kind]} />
            </Chip>
          ))}
        </div>

        {result.categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Category">
            <span className="mr-1 text-xs text-muted-foreground">Category</span>
            {result.categories.map(category => (
              <Chip
                key={category.id}
                small
                active={filters.category === category.id}
                title={about.get(category.id)}
                onClick={() => update({ category: filters.category === category.id ? null : category.id })}
              >
                {category.id} <Count n={category.count} />
              </Chip>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Show">
          <span className="text-xs text-muted-foreground">Show</span>
          {lockedCount > 0 && (
            <Toggle on={filters.locked} onClick={() => update({ locked: !filters.locked })} title={`What a higher membership opens. Yours is ${membership}.`}>
              Locked for {membership}
            </Toggle>
          )}
          <Toggle on={filters.failed} onClick={() => update({ failed: !filters.failed })} title="Broken right now, each with the reason. Don't install one until it is fixed.">
            Failed{failedCount > 0 && <Count n={failedCount} />}
          </Toggle>
          <Toggle on={filters.internal} onClick={() => update({ internal: !filters.internal })} title="Sub-skills other skills run, housekeeping, managing skills, and the Remotion reference">
            Internal &amp; sub-skills
          </Toggle>
          <Toggle on={filters.archived} onClick={() => update({ archived: !filters.archived })} title="Not in use any more: still installable">
            Archived
          </Toggle>
          {filtered && (
            <button type="button" onClick={() => update({ q: '', kind: null, category: null })} className="ml-auto inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <XIcon className="size-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {result.shown.length} item{result.shown.length === 1 ? '' : 's'}
        {hiddenTotal > 0 && (filters.q.trim() || result.shown.length === 0) && (
          <>
            {' · '}
            {[
              result.hidden.failed > 0 && <HiddenLink key="f" n={result.hidden.failed} label="failed" onClick={() => update({ failed: true })} />,
              result.hidden.internal > 0 && <HiddenLink key="i" n={result.hidden.internal} label="internal" onClick={() => update({ internal: true })} />,
              result.hidden.archived > 0 && <HiddenLink key="a" n={result.hidden.archived} label="archived" onClick={() => update({ archived: true })} />,
            ]
              .filter(Boolean)
              .flatMap((el, i) => (i ? [', ', el] : [el]))}{' '}
            hidden by the filters
          </>
        )}
      </p>

      {result.shown.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.shown.map(item => (
            <ExploreCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Nothing matches.</div>
      )}
    </div>
  );
}

function ExploreCard({ item }: { item: AppItem }) {
  const thumb = !!item.video?.thumbnail || item.kind === 'skill';
  return (
    <article className={cn('flex h-full flex-col overflow-hidden rounded-xl border bg-card', item.locked && 'border-dashed', item.failed && 'border-red-500/40')}>
      {thumb && (
        <Link href={item.page} tabIndex={-1} aria-hidden>
          <VideoThumb id={item.id} title={item.video?.title || item.title} src={item.video?.thumbnail} className={cn('border-b', item.locked && 'opacity-60')} />
        </Link>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded border px-1.5 py-0.5 text-[11px] font-medium">{KIND_LABEL[item.kind].one}</span>
          <RunsBadges runs={item.runs} />
          {item.beta && <BetaBadge />}
          <TierBadge item={item} />
          {/* a failed item says so in full below */}
          {!item.failed && item.health && item.health !== 'healthy' && <HealthBadge health={item.health} note={item.healthNote} />}
          {item.archivedAt && !item.health && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Archived</span>}
          {!item.locked && item.version && <span className="ml-auto font-mono text-[11px] text-muted-foreground">v{item.version}</span>}
        </div>

        <div className={cn('flex flex-col gap-1', item.locked && 'opacity-70')}>
          <h3 className="font-semibold leading-snug">
            <Link href={item.page} className="underline-offset-4 hover:underline">
              {item.title}
            </Link>
          </h3>
          <p className="line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
          {item.madeBy && <MadeByLine madeBy={item.madeBy} link={false} />}
        </div>

        {item.failed && <FailedNote item={item} />}

        <div className="mt-auto flex flex-wrap items-center gap-2">
          {item.locked ? (
            <p className="flex items-center gap-1.5 text-xs">
              <LockIcon className="size-3.5 text-muted-foreground" aria-hidden />
              <span>
                Opens with <span className="font-medium">{item.opensWith}</span>.{' '}
                <Link href="/app/subscription" className="underline underline-offset-4">
                  How to get it
                </Link>
              </span>
            </p>
          ) : (
            <ItemActions item={item} labels />
          )}
        </div>
      </div>
    </article>
  );
}

function Chip({ active, small, onClick, title, children }: { active: boolean; small?: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border transition-colors',
        small ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        active ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:border-foreground/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Count({ n }: { n: number }) {
  return <span className="text-xs opacity-60">{n}</span>;
}

function Toggle({ on, onClick, title, children }: { on: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs transition-colors',
        on ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-dashed text-muted-foreground hover:text-foreground',
      )}
    >
      <span className={cn('size-1.5 rounded-full', on ? 'bg-primary' : 'bg-muted-foreground/40')} />
      {children}
    </button>
  );
}

function HiddenLink({ n, label, onClick }: { n: number; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="cursor-pointer font-medium text-foreground underline underline-offset-4">
      {n} {label}
    </button>
  );
}
