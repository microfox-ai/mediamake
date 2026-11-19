'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon, LockIcon, SearchIcon, SlidersHorizontalIcon, StarIcon, XIcon } from 'lucide-react';
import { HealthBadge } from '@/components/catalog/health';
import { RunsBadges } from '@/components/catalog/runs';
import { MadeByLine } from '@/components/catalog/uses';
import { ItemIcon } from '@/components/catalog/item-listing';
import { VideoThumb } from '@/components/catalog/video';
import { RatingChip } from '@/components/ratings/item-rating';
import { headshotOf } from '@/lib/catalog/listing';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EXPLORE_PARAMS, KIND_LABEL, MEMBER_KINDS, explore, launchedAt, storefront, type AppItem, type ExploreFilters, type MemberKind, type Storefront } from '@/lib/app-shell/member';
import { detailsKey } from '@/lib/app-shell/details-key';
import { cn } from '@/lib/utils';
import { AdviceBadge, AdviceNote, FailedNote, ItemActions, LevelBadge, RuleLine, TierBadge } from './item-bits';
import { DetailsButton } from './item-details';

function writeFilters(f: ExploreFilters) {
  const url = new URL(window.location.href);
  for (const key of EXPLORE_PARAMS) url.searchParams.delete(key);
  if (f.q.trim()) url.searchParams.set('q', f.q.trim());
  if (f.kind) url.searchParams.set('kind', f.kind);
  if (f.category) url.searchParams.set('category', f.category);
  const show = [f.failed && 'failed', f.internal && 'internal', f.archived && 'archived', f.alpha && 'alpha', f.deprecated && 'deprecated', f.admin && 'admin'].filter(Boolean).join(',');
  if (show) url.searchParams.set('show', show);
  if (!f.locked) url.searchParams.set('locked', '0');
  // the list with nothing asked of it: say so, or the address would open the store front
  if (f.view === 'list' && ![...url.searchParams.keys()].some(key => (EXPLORE_PARAMS as readonly string[]).includes(key))) url.searchParams.set('view', 'all');
  window.history.replaceState(null, '', url);
}

/** The tab of the store front; the others are the list, whole or one kind of it. */
const FEATURED = 'featured';
const ALL = 'all';

/**
 * Explore, laid out like an app store. Featured is the store front: the
 * editors' picks (an admin's flag on an item's listing), what is new, and a
 * row a tag, each with See all. All, Skills, MCPs and Apps are the list:
 * every skill, MCP and app the member's membership opens, and the ones a
 * higher membership would open, locked and saying which (the cohort's never
 * reach this page: lib/app-shell/member › appItems), by category, with failed,
 * internal, archived, Alpha, deprecated and admin-only items behind Filters.
 * A search always shows the list.
 * A card's picture or name opens the item's page (./item-details).
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
  const front = useMemo(() => storefront(items, categories), [items, categories]);
  const allKinds = MEMBER_KINDS.reduce((sum, kind) => sum + result.kinds[kind], 0);
  const lockedCount = useMemo(() => items.filter(item => item.locked).length, [items]);
  const failedCount = useMemo(() => items.filter(item => item.failed).length, [items]);
  const alphaCount = useMemo(() => items.filter(item => item.alpha).length, [items]);
  const deprecatedCount = useMemo(() => items.filter(item => item.deprecated).length, [items]);
  // only admins see the vault's items: the filter is theirs alone
  const adminCount = useMemo(() => items.filter(item => item.adminOnly).length, [items]);
  const filtered = !!(filters.q.trim() || filters.category);
  const hiddenTotal = Object.values(result.hidden).reduce((sum, n) => sum + n, 0);
  const filtersOn = [!filters.locked, filters.failed, filters.internal, filters.archived, filters.alpha, filters.deprecated, filters.admin].filter(Boolean).length;

  const tab = filters.view === 'store' ? FEATURED : (filters.kind ?? ALL);
  const openTab = (next: string) => {
    if (next === FEATURED) update({ view: 'store', q: '', kind: null, category: null });
    else update({ view: 'list', kind: next === ALL ? null : (next as MemberKind), category: null });
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-6 lg:px-6">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={search}
          type="search"
          value={filters.q}
          onChange={e => update({ q: e.target.value, ...(e.target.value.trim() && { view: 'list' }) })}
          placeholder="Search skills, MCPs and apps: what it makes, a name, a style…"
          aria-label="Search"
          className="h-10 pl-9 pr-9"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-[10px] text-muted-foreground sm:block">/</kbd>
      </div>

      <Tabs value={tab} onValueChange={openTab} className="gap-5">
        <div className="-mx-4 overflow-x-auto px-4 lg:-mx-6 lg:px-6">
          <TabsList>
            <TabsTrigger value={FEATURED} className="px-3">
              Featured
            </TabsTrigger>
            <TabsTrigger value={ALL} className="px-3">
              All <Count n={allKinds} />
            </TabsTrigger>
            {MEMBER_KINDS.map(kind => (
              <TabsTrigger key={kind} value={kind} className="px-3">
                {KIND_LABEL[kind].many} <Count n={result.kinds[kind]} />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={tab} className="flex flex-col gap-5">
          {filters.view === 'store' ? (
            <StoreFront front={front} onSeeAll={category => update({ view: 'list', kind: null, category })} onSeeNew={() => update({ view: 'list', kind: null, category: null })} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5" role="group" aria-label="Category">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <SlidersHorizontalIcon /> Filters {filtersOn > 0 && <Count n={filtersOn} />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    {lockedCount > 0 && (
                      <DropdownMenuCheckboxItem checked={filters.locked} onCheckedChange={on => update({ locked: !!on })} onSelect={e => e.preventDefault()} title={`What a higher membership opens. Yours is ${membership}.`}>
                        Locked for {membership}
                      </DropdownMenuCheckboxItem>
                    )}
                    <DropdownMenuCheckboxItem checked={filters.failed} onCheckedChange={on => update({ failed: !!on })} onSelect={e => e.preventDefault()} title="Broken right now, each with the reason. Don't install one until it is fixed.">
                      Failed {failedCount > 0 && <Count n={failedCount} />}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={filters.internal} onCheckedChange={on => update({ internal: !!on })} onSelect={e => e.preventDefault()} title="Sub-skills other skills run, housekeeping, managing skills, and the Remotion reference">
                      Internal &amp; sub-skills
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={filters.archived} onCheckedChange={on => update({ archived: !!on })} onSelect={e => e.preventDefault()} title="Not in use any more: still installable">
                      Archived
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={filters.alpha} onCheckedChange={on => update({ alpha: !!on })} onSelect={e => e.preventDefault()} title="Still being tried by their makers">
                      Alpha {alphaCount > 0 && <Count n={alphaCount} />}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={filters.deprecated} onCheckedChange={on => update({ deprecated: !!on })} onSelect={e => e.preventDefault()} title="On their way out: each page says what to use instead">
                      Deprecated {deprecatedCount > 0 && <Count n={deprecatedCount} />}
                    </DropdownMenuCheckboxItem>
                    {adminCount > 0 && (
                      <DropdownMenuCheckboxItem checked={filters.admin} onCheckedChange={on => update({ admin: !!on })} onSelect={e => e.preventDefault()} title="The vault: admins and the people granted them only">
                        Admin only <Count n={adminCount} />
                      </DropdownMenuCheckboxItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                <span>
                  {result.shown.length} item{result.shown.length === 1 ? '' : 's'}
                  {hiddenTotal > 0 && (filters.q.trim() || result.shown.length === 0) && (
                    <>
                      {' · '}
                      {[
                        result.hidden.failed > 0 && <HiddenLink key="f" n={result.hidden.failed} label="failed" onClick={() => update({ failed: true })} />,
                        result.hidden.internal > 0 && <HiddenLink key="i" n={result.hidden.internal} label="internal" onClick={() => update({ internal: true })} />,
                        result.hidden.archived > 0 && <HiddenLink key="a" n={result.hidden.archived} label="archived" onClick={() => update({ archived: true })} />,
                        result.hidden.alpha > 0 && <HiddenLink key="al" n={result.hidden.alpha} label="alpha" onClick={() => update({ alpha: true })} />,
                        result.hidden.deprecated > 0 && <HiddenLink key="d" n={result.hidden.deprecated} label="deprecated" onClick={() => update({ deprecated: true })} />,
                        result.hidden.admin > 0 && <HiddenLink key="ad" n={result.hidden.admin} label="admin only" onClick={() => update({ admin: true })} />,
                      ]
                        .filter(Boolean)
                        .flatMap((el, i) => (i ? [', ', el] : [el]))}{' '}
                      hidden by the filters
                    </>
                  )}
                </span>
                {filtered && (
                  <button type="button" onClick={() => update({ q: '', category: null })} className="ml-auto inline-flex cursor-pointer items-center gap-1 hover:text-foreground">
                    <XIcon className="size-3.5" /> Clear
                  </button>
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
            </>
          )}
        </TabsContent>
      </Tabs>

      <RuleLine rule={rule} className="border-t pt-4" />
    </div>
  );
}

/* ---------- The store front ---------- */

function StoreFront({ front, onSeeAll, onSeeNew }: { front: Storefront; onSeeAll: (tag: string) => void; onSeeNew: () => void }) {
  return (
    <div className="flex flex-col gap-8">
      {front.hero && <Hero item={front.hero} />}
      {front.picks.length > 0 && (
        <Shelf title="Editors' picks" about="Chosen by the MediaMake team">
          {front.picks.map(item => (
            <StoreCard key={item.id} item={item} />
          ))}
        </Shelf>
      )}
      {front.fresh.length > 0 && (
        <Shelf title="New" about="The latest to come out" onSeeAll={onSeeNew}>
          {front.fresh.map(item => (
            <StoreCard key={item.id} item={item} note={dayLabel(launchedAt(item))} />
          ))}
        </Shelf>
      )}
      {front.tags.map(row => (
        <Shelf key={row.tag} title={row.title} about={row.about} onSeeAll={() => onSeeAll(row.tag)} count={row.total}>
          {row.items.map(item => (
            <StoreCard key={item.id} item={item} />
          ))}
        </Shelf>
      ))}
    </div>
  );
}

/** `2026-11-08` as `8 Nov`. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** What an item is, in small words under its name: its kind, its level (Beta, Alpha), a warning, the membership that opens it, its rating. */
function StoreMeta({ item, note }: { item: AppItem; note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>{KIND_LABEL[item.kind].one}</span>
      {note && <span>· {note}</span>}
      <LevelBadge item={item} />
      <AdviceBadge item={item} />
      <TierBadge item={item} />
      <RatingChip rating={item.rating} />
    </div>
  );
}

/** The first editors' pick, large: its picture beside what it is. All of it opens the item's page. */
function Hero({ item }: { item: AppItem }) {
  return (
    <section aria-label="Editors' pick" className="relative grid overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <VideoThumb id={item.id} title={item.video?.title || item.title} src={headshotOf(item)} className="max-md:border-b md:border-r" />
      <div className="flex flex-col justify-center gap-3 p-5 lg:p-8">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <StarIcon className="size-3.5 fill-amber-400 text-amber-400" aria-hidden /> Editors&apos; pick
        </p>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight lg:text-3xl">
          <DetailsButton detailsKey={detailsKey.catalog(item.id)} href={item.page} cover className="hover:no-underline">
            {item.title}
          </DetailsButton>
        </h2>
        <p className="line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
        <StoreMeta item={item} />
      </div>
    </section>
  );
}

/** One item in a row: its picture, its name and a line on what it is. All of it opens the item's page. */
function StoreCard({ item, note }: { item: AppItem; note?: string }) {
  return (
    <article className="group relative flex w-60 shrink-0 snap-start flex-col gap-2.5 sm:w-64">
      <VideoThumb id={item.id} title={item.video?.title || item.title} src={headshotOf(item)} className={cn('rounded-xl border transition-shadow group-hover:shadow-md', item.locked && 'opacity-60')} />
      <div className="flex items-start gap-2.5">
        {item.kind !== 'skill' && <ItemIcon id={item.id} title={item.title} src={item.icon} className="size-9 rounded-lg text-sm" />}
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate text-sm font-semibold leading-snug">
            <DetailsButton detailsKey={detailsKey.catalog(item.id)} href={item.page} cover className="hover:no-underline">
              {item.title}
            </DetailsButton>
          </h3>
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
          <StoreMeta item={item} note={note} />
        </div>
      </div>
    </article>
  );
}

/** One row of the store front: its title, See all, and its cards side by side, moved with the arrows or by swiping. */
function Shelf({ title, about, count, onSeeAll, children }: { title: string; about?: string; count?: number; onSeeAll?: () => void; children: React.ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });
  const measure = () => {
    const el = strip.current;
    if (el) setEnds({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const move = (by: number) => strip.current?.scrollBy({ left: by * strip.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight tracking-tight">{title}</h2>
          {about && <p className="truncate text-xs text-muted-foreground">{about}</p>}
        </div>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll} className="shrink-0 cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline">
            See all{count ? ` ${count}` : ''}
          </button>
        )}
        {!(ends.start && ends.end) && (
          <div className="hidden shrink-0 gap-1 sm:flex">
            <Button variant="outline" size="icon" className="size-7 rounded-full" disabled={ends.start} onClick={() => move(-1)} aria-label={`Earlier in ${title}`}>
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="icon" className="size-7 rounded-full" disabled={ends.end} onClick={() => move(1)} aria-label={`More of ${title}`}>
              <ChevronRightIcon />
            </Button>
          </div>
        )}
      </div>
      <div ref={strip} onScroll={measure} className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:-mx-6 lg:scroll-px-6 lg:px-6 [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

/* ---------- The list ---------- */

function ExploreCard({ item }: { item: AppItem }) {
  // every item has a headshot: the one its listing names, else its video's thumbnail, else its title on its own colour
  const headshot = headshotOf(item);
  return (
    <article className={cn('flex h-full flex-col overflow-hidden rounded-xl border bg-card', item.locked && 'border-dashed', (item.failed || item.advice) && 'border-red-500/40')}>
      <DetailsButton detailsKey={detailsKey.catalog(item.id)} href={item.page} tabIndex={-1} aria-hidden className="block w-full">
        <VideoThumb id={item.id} title={item.video?.title || item.title} src={headshot} className={cn('border-b', item.locked && 'opacity-60')} />
      </DetailsButton>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded border px-1.5 py-0.5 text-[11px] font-medium">{KIND_LABEL[item.kind].one}</span>
          <RunsBadges runs={item.runs} />
          <LevelBadge item={item} />
          {item.deprecated && <AdviceBadge item={item} />}
          <TierBadge item={item} />
          {/* a failed item says so in full below */}
          {!item.failed && item.health && item.health !== 'healthy' && <HealthBadge health={item.health} note={item.healthNote} />}
          {item.archivedAt && !item.health && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Archived</span>}
          {!item.locked && item.version && <span className="ml-auto font-mono text-[11px] text-muted-foreground">v{item.version}</span>}
        </div>

        <div className={cn('flex flex-col gap-1', item.locked && 'opacity-70')}>
          <div className="flex items-center gap-2">
            {item.kind !== 'skill' && <ItemIcon id={item.id} title={item.title} src={item.icon} className="size-7 rounded-md text-xs" />}
            <h3 className="min-w-0 flex-1 font-semibold leading-snug">
              <DetailsButton detailsKey={detailsKey.catalog(item.id)} href={item.page}>
                {item.title}
              </DetailsButton>
            </h3>
            <RatingChip rating={item.rating} />
          </div>
          <p className="line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
          {item.madeBy && <MadeByLine madeBy={item.madeBy} link={false} />}
        </div>

        {item.failed && <FailedNote item={item} />}
        {/* not recommended or deprecated, and why */}
        {!item.failed && <AdviceNote item={item} />}

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

function HiddenLink({ n, label, onClick }: { n: number; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="cursor-pointer font-medium text-foreground underline underline-offset-4">
      {n} {label}
    </button>
  );
}
