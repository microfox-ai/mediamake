'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, CopyIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Skill } from '@/lib/library/types';
import { ChannelCard, MediaCard, MiniRow, ProductionCard, SkillCard } from './Cards';
import { bytes, copy, itemPath, plural, tilde } from './format';
import { useMatchingMedia, useMatchingProductions, useMatchingSkills } from './hooks';
import { useNearView } from './Thumb';
import { Triage } from './Triage';
import { useLibraryStore } from './store';

export const GRID = {
  sm: 'grid-cols-[repeat(auto-fill,minmax(170px,1fr))]',
  md: 'grid-cols-[repeat(auto-fill,minmax(230px,1fr))]',
  lg: 'grid-cols-[repeat(auto-fill,minmax(320px,1fr))]',
} as const;

function Nothing({ children }: { children: React.ReactNode }) {
  return <div className="grid h-64 place-items-center text-center text-sm text-muted-foreground">{children}</div>;
}

function SectionTitle({ title, count, about, action }: { title: React.ReactNode; count?: number; about?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline gap-2 px-1.5">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
      {about && <span className="truncate text-xs text-muted-foreground">· {about}</span>}
      {action && <span className="ml-auto">{action}</span>}
    </div>
  );
}

export function ChannelsView() {
  const library = useLibraryStore(s => s.library);
  const query = useLibraryStore(s => s.queries.channels).toLowerCase();
  const showChannel = useLibraryStore(s => s.showChannel);
  const channels = library.channels.filter(c => !query || `${c.name} ${c.id} ${c.folder}`.toLowerCase().includes(query));
  const orphans = library.productions.filter(p => !p.channel || !library.channel[p.channel]);
  if (!library.channels.length) return <Nothing>No channels in the export yet.</Nothing>;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {channels.map(c => (
          <ChannelCard key={c.id} channel={c} onOpen={() => showChannel(c.id)} />
        ))}
      </div>
      {orphans.length > 0 && !query && (
        <section>
          <SectionTitle title="No channel" count={orphans.length} about="productions not on a channel yet: open one to set it" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-x-3 gap-y-4">
            {orphans.map(p => (
              <ProductionCard key={p.slug} production={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ProductionsView() {
  const productions = useMatchingProductions();
  const library = useLibraryStore(s => s.library);
  const size = useLibraryStore(s => s.cardSize);
  const channelId = useLibraryStore(s => s.productionFilters.channel);
  const setView = useLibraryStore(s => s.setView);
  const setFilters = useLibraryStore(s => s.setProductionFilters);
  if (!library.productions.length) return <Nothing>No productions in the export yet.</Nothing>;
  if (!productions.length) return <Nothing>No productions match.</Nothing>;
  const channel = channelId && channelId !== 'none' ? library.channel[channelId] : null;
  const back = (
    <button
      type="button"
      onClick={() => {
        setFilters({ channel: null });
        setView('channels');
      }}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-3.5" /> Channels
    </button>
  );
  if (channelId) {
    return (
      <section>
        <SectionTitle title={channel?.name ?? 'No channel'} count={productions.length} about={channel ? `Downloads/${channel.folder}` : undefined} action={back} />
        <div className={cn('grid gap-x-3 gap-y-4', GRID[size])}>
          {productions.map(p => (
            <ProductionCard key={p.slug} production={p} size={size} />
          ))}
        </div>
      </section>
    );
  }
  const groups = new Map<string, typeof productions>();
  for (const p of productions) {
    const key = p.channel && library.channel[p.channel] ? p.channel : '';
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const order = [...library.channels.map(c => c.id), ''];
  return (
    <div className="space-y-9">
      {[...groups].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([id, list]) => (
        <section key={id || 'none'}>
          <SectionTitle title={id ? library.channel[id].name : 'No channel'} count={list.length} />
          <div className={cn('grid gap-x-3 gap-y-4', GRID[size])}>
            {list.map(p => (
              <ProductionCard key={p.slug} production={p} size={size} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Skills by category, each base followed by its variants. */
export function SkillsView() {
  const matching = useMatchingSkills();
  const library = useLibraryStore(s => s.library);
  const size = useLibraryStore(s => s.cardSize);
  if (!library.skills.length) return <Nothing>No skills: skills.json is missing from this build and the export has none.</Nothing>;
  if (!matching.length) return <Nothing>No skills match.</Nothing>;
  const hit = new Set(matching.map(s => s.name));
  // a family stays together: base first, then its variants (variants of variants after their parent)
  const ordered: Skill[] = [];
  const add = (s: Skill) => {
    if (hit.has(s.name) && !ordered.includes(s)) ordered.push(s);
    for (const v of s.variants) if (library.skill[v]) add(library.skill[v]);
  };
  for (const s of library.skills) if (!s.variantOf || !library.skill[s.variantOf]) add(s);
  const byCategory = new Map<string, Skill[]>();
  for (const s of ordered) byCategory.set(library.skill[s.family]?.category ?? s.category, [...(byCategory.get(library.skill[s.family]?.category ?? s.category) ?? []), s]);
  const order = library.categories.map(c => c.id);
  return (
    <div className="space-y-9">
      {[...byCategory].sort((a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99)).map(([cat, list]) => (
        <section key={cat}>
          <SectionTitle title={<span className="capitalize">{cat}</span>} count={list.length} about={library.categories.find(c => c.id === cat)?.about} />
          <div className={cn('grid gap-x-3 gap-y-4', GRID[size])}>
            {list.map(s => (
              <SkillCard key={s.name} skill={s} size={size} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const PAGE = 120;

/** Calls onNear once it scrolls into view; a new key makes a new one for the next page. */
function Sentinel({ onNear, children }: { onNear: () => void; children: React.ReactNode }) {
  const [ref, near] = useNearView<HTMLDivElement>();
  const latest = useRef(onNear);
  useEffect(() => {
    latest.current = onNear;
  });
  useEffect(() => {
    if (near) latest.current();
  }, [near]);
  return (
    <div ref={ref} className="py-8 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

/** Cards as they scroll in: a big library renders a page at a time. */
function MediaGrid() {
  const items = useMatchingMedia();
  const size = useLibraryStore(s => s.cardSize);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [items]);
  if (!items.length) return <Nothing>Nothing matches.</Nothing>;
  return (
    <>
      <div className={cn('grid gap-x-3 gap-y-4', GRID[size])}>
        {items.slice(0, shown).map(m => (
          <MediaCard key={m.id} item={m} size={size} />
        ))}
      </div>
      {shown < items.length && (
        <Sentinel key={shown} onNear={() => setShown(n => n + PAGE)}>
          {shown} of {items.length}
        </Sentinel>
      )}
    </>
  );
}

function Duplicates() {
  const items = useMatchingMedia();
  const library = useLibraryStore(s => s.library);
  const select = useLibraryStore(s => s.select);
  if (!items.length) return <Nothing>No duplicates: every item is kept once.</Nothing>;
  const spare = items.reduce((n, m) => n + m.bytes * (m.dupes?.length ?? 0), 0);
  return (
    <div className="space-y-4">
      <p className="px-1.5 text-sm text-muted-foreground">
        {plural(items.length, 'item')} kept in more than one place, {bytes(spare)} in extra copies. The library keeps the first path; the copies are listed under it.
      </p>
      {items.map(m => {
        const main = itemPath(library, m);
        return (
          <div key={m.id} className="rounded-2xl border p-2">
            <MiniRow image={m.thumb} seed={m.subject ?? m.kind} title={m.title} subtitle={`${m.kind} · ${bytes(m.bytes)} · ${main.shown}`} onClick={() => select({ kind: 'item', id: m.id })} />
            <div className="mt-1 space-y-0.5 pl-[76px]">
              {(m.dupes ?? []).map(d => (
                <button key={d} type="button" onClick={() => void copy(d, 'Path copied')} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
                  <CopyIcon className="size-3 shrink-0" />
                  <span className="truncate">{tilde(d)}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MediaView() {
  const mode = useLibraryStore(s => s.mediaMode);
  if (mode === 'inbox') return <Triage />;
  if (mode === 'dupes') return <Duplicates />;
  return <MediaGrid />;
}
