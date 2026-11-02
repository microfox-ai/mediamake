'use client';

import { useMemo, useState } from 'react';
import { ChevronRightIcon, CopyIcon, InboxIcon, LayoutGridIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { drifted, facetCounts, inMode, NO_FACETS, NO_PRODUCTION_FILTERS, NO_SKILL_FILTERS, QUALITIES, type MediaFacets } from '@/lib/library/filter';
import { MEDIA_KINDS, PRODUCTION_STATUSES } from '@/lib/library/types';
import { useLibraryStore } from './store';

function Heading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
      {action}
    </div>
  );
}

function Option({ active, onClick, label, count, hint, indent }: { active: boolean; onClick: () => void; label: React.ReactNode; count?: number; hint?: string; indent?: boolean }) {
  return (
    <button
      type="button"
      title={hint}
      onClick={onClick}
      className={cn('flex h-8 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] transition hover:bg-muted', indent && 'pl-6', active ? 'bg-foreground text-background hover:bg-foreground' : 'text-foreground/80', count === 0 && !active && 'opacity-45')}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className={cn('text-[11px] tabular-nums', active ? 'text-background/70' : 'text-muted-foreground')}>{count}</span>}
    </button>
  );
}

function Clear({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <div className="px-1">
      <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={onClick}>
        Clear filters
      </Button>
    </div>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

function ProductionFiltersPanel() {
  const library = useLibraryStore(s => s.library);
  const f = useLibraryStore(s => s.productionFilters);
  const set = useLibraryStore(s => s.setProductionFilters);
  const orphans = library.productions.filter(p => !p.channel || !library.channel[p.channel]).length;
  return (
    <>
      <section>
        <Heading>Channel</Heading>
        <Option active={!f.channel} onClick={() => set({ channel: null })} label="All channels" count={library.productions.length} />
        {library.channels.map(c => (
          <Option key={c.id} active={f.channel === c.id} onClick={() => set({ channel: f.channel === c.id ? null : c.id })} label={c.name} count={c.productions.filter(s => library.production[s]).length} />
        ))}
        {orphans > 0 && <Option active={f.channel === 'none'} onClick={() => set({ channel: f.channel === 'none' ? null : 'none' })} label="No channel" count={orphans} />}
      </section>
      <section>
        <Heading>Status</Heading>
        {PRODUCTION_STATUSES.map(s => (
          <Option key={s} active={f.status === s} onClick={() => set({ status: f.status === s ? null : s })} label={<span className="capitalize">{s}</span>} count={library.productions.filter(p => p.status === s).length} />
        ))}
      </section>
      <Clear show={JSON.stringify(f) !== JSON.stringify(NO_PRODUCTION_FILTERS)} onClick={() => set(NO_PRODUCTION_FILTERS)} />
    </>
  );
}

function SkillFiltersPanel() {
  const library = useLibraryStore(s => s.library);
  const f = useLibraryStore(s => s.skillFilters);
  const set = useLibraryStore(s => s.setSkillFilters);
  const skills = library.skills;
  const variants = skills.filter(s => s.variantOf);
  const counts = new Map<string, number>();
  for (const s of skills) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  const categories = library.categories.length ? library.categories.filter(c => counts.has(c.id)) : [...counts.keys()].map(id => ({ id, about: '' }));
  return (
    <>
      <section>
        <Heading>Type</Heading>
        <Option active={f.type === 'all'} onClick={() => set({ type: 'all' })} label="Everything" count={skills.length} />
        <Option active={f.type === 'base'} onClick={() => set({ type: 'base' })} label="Base skills" count={skills.length - variants.length} />
        <Option active={f.type === 'variant'} onClick={() => set({ type: 'variant' })} label="Variants" count={variants.length} />
        <Option active={f.type === 'drift'} onClick={() => set({ type: f.type === 'drift' ? 'all' : 'drift' })} label="Base moved on" hint="Variants whose base skill changed since the fork" count={variants.filter(drifted).length} indent />
      </section>
      <section>
        <Heading>Used</Heading>
        <Option active={f.usage === 'used'} onClick={() => set({ usage: f.usage === 'used' ? 'all' : 'used' })} label="Run at least once" count={skills.filter(s => s.runs).length} />
        <Option active={f.usage === 'unused'} onClick={() => set({ usage: f.usage === 'unused' ? 'all' : 'unused' })} label="Never run" count={skills.filter(s => !s.runs).length} />
      </section>
      <section>
        <Heading>Category</Heading>
        {categories.map(c => (
          <Option key={c.id} active={f.category === c.id} onClick={() => set({ category: f.category === c.id ? null : c.id })} label={<span className="capitalize">{c.id}</span>} count={counts.get(c.id)} hint={c.about} />
        ))}
      </section>
      <Clear show={JSON.stringify(f) !== JSON.stringify(NO_SKILL_FILTERS)} onClick={() => set(NO_SKILL_FILTERS)} />
    </>
  );
}

const RATINGS: [string, string][] = [
  ['5', '★★★★★'],
  ['4', '★★★★ and up'],
  ['3', '★★★ and up'],
  ['unrated', 'Unrated'],
];

function MediaFacetsPanel() {
  const library = useLibraryStore(s => s.library);
  const query = useLibraryStore(s => s.queries.media);
  const mode = useLibraryStore(s => s.mediaMode);
  const setMode = useLibraryStore(s => s.setMediaMode);
  const f = useLibraryStore(s => s.facets);
  const set = useLibraryStore(s => s.setFacets);
  const [allTags, setAllTags] = useState(false);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const items = useMemo(() => library.media.filter(m => inMode(m, mode)), [library.media, mode]);
  const c = useMemo(() => facetCounts(library, items, query, f), [library, items, query, f]);
  const inbox = library.media.filter(m => m.kind === 'unsorted').length;
  const dupes = library.media.filter(m => m.dupes?.length).length;

  const tops = [...c.subject].filter(([s]) => !s.includes('/')).sort((a, b) => b[1] - a[1]);
  const tags = [...c.tags].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const used = [...c.usedIn].filter(([k]) => k !== 'none').sort((a, b) => b[1] - a[1]);
  const facet = <K extends keyof MediaFacets>(k: K, v: MediaFacets[K]) => set({ [k]: v } as Partial<MediaFacets>);

  return (
    <>
      <section>
        <Option active={mode === 'all'} onClick={() => setMode('all')} label={<span className="flex items-center gap-2"><LayoutGridIcon className="size-3.5" /> All media</span>} count={library.media.length} />
        <Option active={mode === 'inbox'} onClick={() => setMode('inbox')} label={<span className="flex items-center gap-2"><InboxIcon className="size-3.5" /> Inbox</span>} count={inbox} hint="What the library couldn't place: sort it" />
        <Option active={mode === 'dupes'} onClick={() => setMode('dupes')} label={<span className="flex items-center gap-2"><CopyIcon className="size-3.5" /> Duplicates</span>} count={dupes} hint="Items kept in more than one place" />
      </section>

      {mode !== 'inbox' && (
        <section>
          <Heading>Kind</Heading>
          {MEDIA_KINDS.filter(k => c.kind.has(k) || f.kind.includes(k)).map(k => (
            <Option key={k} active={f.kind.includes(k)} onClick={() => facet('kind', toggle(f.kind, k))} label={<span className="capitalize">{k}</span>} count={c.kind.get(k) ?? 0} />
          ))}
        </section>
      )}

      {tops.length > 0 && (
        <section>
          <Heading>Subject</Heading>
          {tops.map(([s, n]) => {
            const kids = [...c.subject].filter(([k]) => k.startsWith(`${s}/`) && k.split('/').length === 2).sort((a, b) => b[1] - a[1]);
            const open = openSubject === s || f.subject?.startsWith(`${s}/`) || f.subject === s;
            return (
              <div key={s}>
                <div className="flex items-center">
                  <button type="button" aria-label={open ? 'Fold' : 'Unfold'} className={cn('grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted', !kids.length && 'invisible')} onClick={() => setOpenSubject(open ? null : s)}>
                    <ChevronRightIcon className={cn('size-3.5 transition', open && 'rotate-90')} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <Option active={f.subject === s} onClick={() => facet('subject', f.subject === s ? null : s)} label={s} count={n} />
                  </div>
                </div>
                {open && kids.map(([k, kn]) => <Option key={k} indent active={f.subject === k} onClick={() => facet('subject', f.subject === k ? null : k)} label={k.split('/')[1]} count={kn} />)}
              </div>
            );
          })}
        </section>
      )}

      {tags.length > 0 && (
        <section>
          <Heading
            action={
              tags.length > 12 && (
                <button type="button" className="normal-case tracking-normal hover:text-foreground" onClick={() => setAllTags(!allTags)}>
                  {allTags ? 'Fewer' : `All ${tags.length}`}
                </button>
              )
            }
          >
            Tags
          </Heading>
          <div className="flex flex-wrap gap-1 px-3 pb-1">
            {(allTags ? tags : tags.slice(0, 12)).map(([t, n]) => (
              <button
                key={t}
                type="button"
                onClick={() => facet('tags', toggle(f.tags, t))}
                className={cn('rounded-full border px-2 py-0.5 text-[11px] transition', f.tags.includes(t) ? 'border-foreground bg-foreground text-background' : 'text-foreground/80 hover:bg-muted')}
              >
                {t} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <Heading>Quality</Heading>
        {QUALITIES.filter(q => c.quality.has(q) || f.quality.includes(q)).map(q => (
          <Option key={q} active={f.quality.includes(q)} onClick={() => facet('quality', toggle(f.quality, q))} label={q} count={c.quality.get(q) ?? 0} />
        ))}
      </section>

      {c.source.size > 0 && (
        <section>
          <Heading>Source</Heading>
          {[...c.source].sort((a, b) => b[1] - a[1]).map(([s, n]) => (
            <Option key={s} active={f.source.includes(s)} onClick={() => facet('source', toggle(f.source, s))} label={s === 'unknown' ? 'Not known' : s} count={n} />
          ))}
        </section>
      )}

      <section>
        <Heading>Rating</Heading>
        {RATINGS.map(([v, label]) => (
          <Option key={v} active={f.rating === v} onClick={() => facet('rating', f.rating === v ? null : v)} label={label} count={c.rating.get(v) ?? 0} />
        ))}
      </section>

      <section>
        <Heading>Used in</Heading>
        <Option active={f.usedIn === 'none'} onClick={() => facet('usedIn', f.usedIn === 'none' ? null : 'none')} label="Not used yet" count={c.usedIn.get('none') ?? 0} />
        {used.map(([slug, n]) => (
          <Option key={slug} active={f.usedIn === slug} onClick={() => facet('usedIn', f.usedIn === slug ? null : slug)} label={library.production[slug]?.title ?? slug} count={n} />
        ))}
      </section>

      {[...c.status.keys()].some(s => s !== 'online') && (
        <section>
          <Heading>Where</Heading>
          {(['online', 'cold', 'missing'] as const).map(s => (
            <Option key={s} active={f.status.includes(s)} onClick={() => facet('status', toggle(f.status, s))} label={s === 'online' ? 'On this Mac' : s === 'cold' ? 'On an unplugged disk' : 'Missing'} count={c.status.get(s) ?? 0} />
          ))}
        </section>
      )}

      <Clear show={JSON.stringify(f) !== JSON.stringify(NO_FACETS)} onClick={() => set(NO_FACETS)} />
    </>
  );
}

export function Sidebar() {
  const view = useLibraryStore(s => s.view);
  if (view === 'channels') return null;
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-muted/20">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 px-2 py-3">
          {view === 'productions' && <ProductionFiltersPanel />}
          {view === 'skills' && <SkillFiltersPanel />}
          {view === 'media' && <MediaFacetsPanel />}
        </div>
      </div>
    </aside>
  );
}
