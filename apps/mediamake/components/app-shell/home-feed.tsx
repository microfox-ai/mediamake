'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SearchIcon, XIcon } from 'lucide-react';
import { ItemIcon } from '@/components/catalog/item-listing';
import { VideoThumb } from '@/components/catalog/video';
import { Input } from '@/components/ui/input';
import { detailsKey } from '@/lib/app-shell/details-key';
import { launchedAt, storeList, type AppItem } from '@/lib/app-shell/member';
import { headshotOf } from '@/lib/catalog/listing';
import { cn } from '@/lib/utils';
import { StoreMeta } from './explore';
import { DetailsButton } from './item-details';

/**
 * Home's search and its list of the whole store. The search sits in the title bar and the list
 * in the page, so the words live in the address (`/app?q=…`), written without a navigation:
 * both read them from there.
 */

const PARAM = 'q';
const SEARCH_CHANGED = 'mm:home-search';
/** How many rows the list starts with, and adds each time its end comes into view. */
const PAGE = 8;

/** The words searched for, from the address, and a way to change them. */
function useHomeSearch(initial: string): [string, (q: string) => void] {
  const [q, setQ] = useState(initial);
  useEffect(() => {
    const read = () => setQ(new URL(window.location.href).searchParams.get(PARAM) ?? '');
    read();
    window.addEventListener(SEARCH_CHANGED, read);
    window.addEventListener('popstate', read);
    return () => {
      window.removeEventListener(SEARCH_CHANGED, read);
      window.removeEventListener('popstate', read);
    };
  }, []);
  const write = (next: string) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set(PARAM, next);
    else url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new Event(SEARCH_CHANGED));
  };
  return [q, write];
}

/** The search beside Home's title: what is typed filters the list of the store below, as it is typed. */
export function HomeSearch({ initial = '' }: { initial?: string }) {
  const [q, setQ] = useHomeSearch(initial);
  const input = useRef<HTMLInputElement>(null);
  // "/" jumps to the search, as on Explore
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key !== '/' || target?.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative ml-2 min-w-0 max-w-md flex-1 sm:ml-4">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input ref={input} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search the store" aria-label="Search the store" className="h-8 rounded-full pl-8" />
    </div>
  );
}

/** Home's parts that step aside while a search is on (New on Store), so its results come first. */
export function HideWhileSearching({ initial = '', children }: { initial?: string; children: React.ReactNode }) {
  const [q] = useHomeSearch(initial);
  return q.trim() ? null : <>{children}</>;
}

const day = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

/**
 * Every item on the store, a row each (its picture, then its name, what it is and a line about
 * it), more of them as the end of the list comes into view. With a search on, only what matches.
 * `items` is the store as Home lists it (lib/app-shell/member › storeList): no internal skills.
 */
export function HomeFeed({ items, initial = '' }: { items: AppItem[]; initial?: string }) {
  const [q, setQ] = useHomeSearch(initial);
  const words = q.trim();
  const list = useMemo(() => (words ? storeList(items, words) : items), [items, words]);

  const [count, setCount] = useState(PAGE);
  useEffect(() => setCount(PAGE), [words]);
  const end = useRef<HTMLDivElement>(null);
  const more = count < list.length;
  useEffect(() => {
    const el = end.current;
    if (!el || !more) return;
    // a new watcher after each batch: when the end is still in view, the next batch follows
    const watcher = new IntersectionObserver(entries => entries.some(entry => entry.isIntersecting) && setCount(n => n + PAGE), { rootMargin: '600px 0px' });
    watcher.observe(el);
    return () => watcher.disconnect();
  }, [more, count]);

  return (
    <section aria-label={words ? 'Search results' : 'All on Store'} className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold leading-tight tracking-tight">{words ? `Results for “${words}”` : 'All on Store'}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {list.length} item{list.length === 1 ? '' : 's'}
          </p>
        </div>
        {words && (
          <button type="button" onClick={() => setQ('')} className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <XIcon className="size-3.5" aria-hidden /> Clear
          </button>
        )}
      </div>

      {list.length ? (
        <ul className="flex flex-col gap-4">
          {list.slice(0, count).map(item => (
            <li key={item.id}>
              <FeedRow item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing matches.{' '}
          <Link href={`/app/explore?q=${encodeURIComponent(words)}`} className="font-medium text-foreground underline underline-offset-4">
            Search in Explore
          </Link>
        </p>
      )}

      {more ? <div ref={end} aria-hidden className="h-8" /> : list.length > PAGE ? <p className="py-2 text-center text-xs text-muted-foreground">That is everything on the store.</p> : null}
    </section>
  );
}

/** One item as a search result: its picture on the left, the rest beside it. All of it opens the item's page. */
function FeedRow({ item }: { item: AppItem }) {
  return (
    <article className="group relative flex gap-3 rounded-xl sm:gap-4">
      <VideoThumb
        id={item.id}
        title={item.video?.title || item.title}
        src={headshotOf(item)}
        size="sm"
        className={cn('w-36 shrink-0 self-start rounded-xl border transition-shadow group-hover:shadow-md sm:w-56 xl:w-64', item.locked && 'opacity-60')}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold leading-snug sm:text-base">
          {item.kind !== 'skill' && <ItemIcon id={item.id} title={item.title} src={item.icon} className="size-6 rounded-md text-xs" />}
          <DetailsButton detailsKey={detailsKey.catalog(item.id)} href={item.page} cover className="line-clamp-2 hover:no-underline">
            {item.title}
          </DetailsButton>
        </h3>
        <StoreMeta item={item} note={day(launchedAt(item))} />
        <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{item.summary}</p>
      </div>
    </article>
  );
}
