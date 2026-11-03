'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { slugOf, type CatalogEntry } from '@/lib/catalog/types';
import { CatalogCard } from './catalog-card';
import { SKILL_FILTER_PARAMS, type SkillCategoryInfo, type SkillFacet, type SkillFilters } from './skill-filters';

function writeFilters(f: SkillFilters) {
  const url = new URL(window.location.href);
  for (const key of SKILL_FILTER_PARAMS) url.searchParams.delete(key);
  if (f.q.trim()) url.searchParams.set('q', f.q.trim());
  if (f.category) url.searchParams.set('category', f.category);
  if (f.mcp) url.searchParams.set('mcp', f.mcp);
  const show = [f.internal && 'internal', f.archived && 'archived'].filter(Boolean).join(',');
  if (show) url.searchParams.set('show', show);
  if (!f.variants) url.searchParams.set('variants', '0');
  window.history.replaceState(null, '', url);
}

const OTHER: SkillFacet = { category: 'other', text: '', mcps: [] };

/**
 * The homepage's Skills tab: every skill, searchable, by category and by the MCP it works with.
 * Sub-skills and housekeeping (analyze-video, cleanup-*, the Remotion reference…) and archived
 * skills stay out of the list until their filter is on; a search says how many of them it found.
 */
export function SkillsTab({
  cards,
  facets,
  categories,
  initial,
}: {
  /** The skill cards, archived ones too. */
  cards: CatalogEntry[];
  facets: Record<string, SkillFacet>;
  categories: SkillCategoryInfo[];
  initial: SkillFilters;
}) {
  const [filters, setFilters] = useState(initial);
  const update = (change: Partial<SkillFilters>) =>
    setFilters(f => {
      const next = { ...f, ...change };
      writeFilters(next);
      return next;
    });

  // "/" jumps to the search, as on GitHub
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

  const order = useMemo(() => new Map(categories.map((c, i) => [c.id, i])), [categories]);
  const internalCategory = useMemo(() => new Set(categories.filter(c => c.internal).map(c => c.id)), [categories]);
  const facetOf = (card: CatalogEntry) => facets[card.id] ?? OTHER;
  const isInternal = (card: CatalogEntry) => {
    const facet = facetOf(card);
    return facet.internal ?? internalCategory.has(facet.category);
  };

  const { shown, hidden, counts, mcps } = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const score = (card: CatalogEntry) => {
      if (!words.length) return 1;
      const facet = facetOf(card);
      const name = slugOf(card.id);
      const haystack = `${name} ${card.title} ${card.summary} ${facet.text}`.toLowerCase();
      if (!words.every(w => haystack.includes(w))) return 0;
      return name === q ? 4 : name.includes(q) ? 3 : words.every(w => name.includes(w)) ? 2 : 1;
    };
    // what the type toggles let through (internal, variants, archived)
    const allowed = (card: CatalogEntry) =>
      (filters.internal || !isInternal(card)) && (filters.variants || !facetOf(card).variantOf) && (filters.archived || !card.archivedAt);

    const matching = cards.map(card => ({ card, score: score(card) })).filter(m => m.score > 0);
    const byMcp = (card: CatalogEntry) => !filters.mcp || facetOf(card).mcps.includes(filters.mcp);
    const byCategory = (card: CatalogEntry) => !filters.category || facetOf(card).category === filters.category;

    const counts = new Map<string, number>();
    for (const { card } of matching) if (allowed(card) && byMcp(card)) counts.set(facetOf(card).category, (counts.get(facetOf(card).category) ?? 0) + 1);

    const shown = matching
      .filter(m => allowed(m.card) && byMcp(m.card) && byCategory(m.card))
      .sort(
        (a, b) =>
          b.score - a.score ||
          (order.get(facetOf(a.card).category) ?? 99) - (order.get(facetOf(b.card).category) ?? 99) ||
          slugOf(a.card.id).localeCompare(slugOf(b.card.id)),
      )
      .map(m => m.card);
    // matches a toggle keeps out, so a search never comes up empty without saying why
    const hidden = matching.filter(m => !allowed(m.card) && byMcp(m.card) && byCategory(m.card)).map(m => m.card);

    const mcps = [...new Set(cards.filter(allowed).flatMap(card => facetOf(card).mcps))].sort();
    return { shown, hidden, counts, mcps };
  }, [cards, facets, filters, order, internalCategory]);

  const visibleCategories = categories.filter(c => (filters.internal || !c.internal) && (counts.get(c.id) || filters.category === c.id));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const hiddenInternal = hidden.filter(isInternal).length;
  const hiddenArchived = hidden.filter(card => card.archivedAt && !isInternal(card)).length;
  const hiddenVariants = hidden.length - hiddenInternal - hiddenArchived;
  const filtered = !!(filters.q.trim() || filters.category || filters.mcp);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={search}
            type="search"
            value={filters.q}
            onChange={e => update({ q: e.target.value })}
            placeholder="Search skills: what it makes, an MCP, a style…"
            aria-label="Search skills"
            className="h-10 pl-9 pr-9"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-[10px] text-muted-foreground sm:block">/</kbd>
        </div>
        <Select value={filters.mcp ?? 'any'} onValueChange={value => update({ mcp: value === 'any' ? null : value })}>
          <SelectTrigger className="h-10 w-full sm:w-56" aria-label="Works with">
            <SelectValue placeholder="Works with any MCP" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Works with any MCP</SelectItem>
            {mcps.map(id => (
              <SelectItem key={id} value={id}>
                Works with {slugOf(id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          <Chip active={!filters.category} onClick={() => update({ category: null })}>
            All <Count n={total} />
          </Chip>
          {visibleCategories.map(c => (
            <Chip key={c.id} active={filters.category === c.id} title={c.about} onClick={() => update({ category: filters.category === c.id ? null : c.id })}>
              {c.id} <Count n={counts.get(c.id) ?? 0} />
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Show">
          <span className="text-xs text-muted-foreground">Show</span>
          <Toggle on={filters.variants} onClick={() => update({ variants: !filters.variants })} title="Skills forked from another to match a production's style">
            Variants
          </Toggle>
          <Toggle
            on={filters.internal}
            onClick={() => update({ internal: !filters.internal, ...(filters.internal && filters.category && internalCategory.has(filters.category) && { category: null }) })}
            title="Sub-skills other skills run (analyze-video), housekeeping (cleanup-*, update-*), managing skills, and the Remotion reference"
          >
            Internal &amp; sub-skills
          </Toggle>
          <Toggle on={filters.archived} onClick={() => update({ archived: !filters.archived })} title="Not in use any more: still public and installable">
            Archived
          </Toggle>
          {filtered && (
            <button type="button" onClick={() => update({ q: '', category: null, mcp: null })} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <XIcon className="size-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {shown.length} skill{shown.length === 1 ? '' : 's'}
        {hidden.length > 0 && filters.q.trim() && (
          <>
            {' · '}
            {[
              hiddenInternal > 0 && (
                <HiddenLink key="i" n={hiddenInternal} label="internal" onClick={() => update({ internal: true })} />
              ),
              hiddenVariants > 0 && <HiddenLink key="v" n={hiddenVariants} label="variant" onClick={() => update({ variants: true })} />,
              hiddenArchived > 0 && <HiddenLink key="a" n={hiddenArchived} label="archived" onClick={() => update({ archived: true })} />,
            ]
              .filter(Boolean)
              .flatMap((el, i) => (i ? [', ', el] : [el]))}{' '}
            hidden by the filters
          </>
        )}
      </p>

      {shown.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(card => (
            <CatalogCard key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No skill matches.</div>
      )}
    </div>
  );
}

function Chip({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
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
    <button type="button" onClick={onClick} className="font-medium text-foreground underline underline-offset-4">
      {n} {label}
    </button>
  );
}
