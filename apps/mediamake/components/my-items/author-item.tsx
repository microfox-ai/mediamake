'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react';
import { AuthorsLine } from '@/components/catalog/authors';
import { ItemIcon } from '@/components/catalog/item-listing';
import { VideoThumb } from '@/components/catalog/video';
import { CardSection, ListingCallsContext, ReadmeEditor, SaveBar, ScreenshotsSection, useListingDraft, type ListingCalls } from '@/components/releases/listing-editor';
import type { ItemDetail } from '@/components/releases/model';
import { AuthorsButton, UpdateButton } from '@/components/my-items/item-tools';
import { Button } from '@/components/ui/button';
import { itemPagePath } from '@/lib/catalog/paths';
import { itemTier, levelInfo } from '@/lib/catalog/types';
import { tierLabel } from '@/lib/memberships/tiers';
import { cn } from '@/lib/utils';

/**
 * An item's page for its authors (My store items › the item, app/app/(account)/my-items/[kind]/[slug]),
 * modelled on its release page (components/releases/release-item): everything about its store listing
 * that is theirs, with the same editors. Listing: its headshot, icon, description and tags (the top of
 * the page shows them as its card will, while they are typed). README: its README. Screenshots: its
 * pictures and videos. Versions: what was published. Its authors and a new version are in the header.
 * What is an admin's (its level, tier, health, advice, editors' pick, archive, who it is granted to)
 * is not here. Saved through the authors' API (POST /api/catalog/listing, lib/catalog/author-listing).
 */

const KIND_LABEL: Record<string, string> = { skill: 'Skill', mcp: 'MCP', app: 'App' };

type TabId = 'listing' | 'readme' | 'screenshots' | 'versions';
const TAB_LABEL: Record<TabId, string> = { listing: 'Listing', readme: 'README', screenshots: 'Screenshots', versions: 'Versions' };

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/catalog/listing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Could not save (${res.status})`);
  return json as T;
}

/** The authors' API, in place of the release page's admin one. */
const AUTHOR_CALLS: ListingCalls = {
  setListing: (itemId, fields) => post({ type: 'set', itemId, ...fields }),
  createUpload: (itemId, file) => post<{ uploadUrl: string; publicUrl: string }>({ type: 'create_upload', itemId, ...file }),
};

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function AuthorItem({ detail, role, direct }: { detail: ItemDetail; role: 'author' | 'co-author' | 'admin'; direct: boolean }) {
  return (
    <ListingCallsContext.Provider value={AUTHOR_CALLS}>
      <AuthorEditor detail={detail} role={role} direct={direct} />
    </ListingCallsContext.Provider>
  );
}

function AuthorEditor({ detail, role, direct }: { detail: ItemDetail; role: 'author' | 'co-author' | 'admin'; direct: boolean }) {
  const router = useRouter();
  const state = useListingDraft(detail, () => router.refresh());
  const tabs: TabId[] = ['listing', ...(detail.readme ? (['readme'] as const) : []), 'screenshots', 'versions'];
  const [tab, setTab] = React.useState<TabId>('listing');

  // the tab a link names (`?tab=readme`), once on the client
  React.useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('tab') as TabId | null;
    if (asked && tabs.includes(asked)) setTab(asked);
  }, []);
  const open = (next: TabId) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'listing') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(window.history.state, '', url);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <Link href="/app/my-items" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> My store items
      </Link>

      <Hero detail={detail} state={state} role={role} direct={direct} />

      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b px-1" role="tablist" aria-label="Its listing">
        {tabs.map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => open(id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2 text-sm transition-colors',
              tab === id ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {TAB_LABEL[id]}
            {id === 'screenshots' && detail.listing?.media.length ? <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">{detail.listing.media.length}</span> : null}
          </button>
        ))}
      </nav>

      {tab === 'listing' && (
        <div className="flex max-w-3xl flex-col gap-10">
          <CardSection detail={detail} state={state} />
        </div>
      )}
      {tab === 'readme' && <ReadmeEditor detail={detail} state={state} />}
      {tab === 'screenshots' && (
        <div className="max-w-3xl">
          <ScreenshotsSection detail={detail} onChanged={() => router.refresh()} />
        </div>
      )}
      {tab === 'versions' && <Versions detail={detail} />}

      <SaveBar state={state} />
    </div>
  );
}

/**
 * The top of the page: the item as its card will show it, from what is typed below (the headshot, the
 * icon, the description), with where it stands, its authors and what an author does with it.
 */
function Hero({ detail, state, role, direct }: { detail: ItemDetail; state: ReturnType<typeof useListingDraft>; role: 'author' | 'co-author' | 'admin'; direct: boolean }) {
  const { item } = detail;
  const { draft } = state;
  const headshot = draft.headshot.trim() || item.video?.thumbnail || undefined;
  const icon = draft.icon.trim() || undefined;
  const about = draft.description.trim() || item.summary;
  const version = item.versions.at(-1)?.version ?? item.version;
  const tier = itemTier(item);
  const facts = [
    KIND_LABEL[item.kind] ?? item.kind,
    levelInfo(item.readiness).label,
    tier === 'public' ? 'Public' : `${tierLabel(tier)} and above`,
    ...(version ? [`v${version.replace(/^v/, '')}`] : []),
  ];
  const [kind, slug] = item.id.split('/');
  return (
    <section className="grid overflow-hidden rounded-2xl border bg-card md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="relative max-md:border-b md:border-r">
        <VideoThumb id={item.id} title={item.title} src={/^https:\/\//.test(headshot ?? '') ? headshot : undefined} className="h-full" />
        {kind !== 'skill' && (
          <ItemIcon id={item.id} title={item.title} src={/^https:\/\//.test(icon ?? '') ? icon : undefined} className="absolute bottom-3 left-3 size-12 rounded-xl text-lg shadow-sm ring-2 ring-background" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {facts.map((fact, i) => (
            <span key={fact} className={cn('rounded-md px-1.5 py-0.5 text-[11px]', i === 0 ? 'border font-medium' : 'bg-muted text-muted-foreground')}>
              {fact}
            </span>
          ))}
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {role === 'author' ? 'You are its author' : role === 'co-author' ? 'You are a co-author' : 'Admin'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{item.title}</h1>
          <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">{about}</p>
        {detail.authors && <AuthorsLine authors={detail.authors} />}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button size="sm" className="h-8" asChild>
            <a href={itemPagePath(item.id)} target="_blank" rel="noreferrer">
              <ExternalLinkIcon /> Its page
            </a>
          </Button>
          <AuthorsButton itemId={item.id} title={item.title} />
          <UpdateButton name={slug} kind={kind} title={item.title} direct={direct} />
        </div>
      </div>
    </section>
  );
}

/** What was published, newest first, with its notes. */
function Versions({ detail }: { detail: ItemDetail }) {
  const versions = [...detail.item.versions].reverse();
  if (!versions.length) {
    return (
      <p className="max-w-3xl rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {detail.item.kind === 'skill' ? 'A skill from the repo goes out with the repo: its versions are its commits.' : 'No version published here yet.'}
      </p>
    );
  }
  return (
    <ol className="flex max-w-3xl flex-col divide-y rounded-2xl border bg-card">
      {versions.map((version, i) => (
        <li key={version.version} id={`v${version.version.replace(/^v/, '')}`} className="flex flex-col gap-1 px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-sm font-semibold">v{version.version.replace(/^v/, '')}</span>
            {i === 0 && <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Latest</span>}
            <span className="ml-auto text-xs text-muted-foreground">{day(version.publishedAt)}</span>
          </div>
          {version.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{version.notes}</p>}
        </li>
      ))}
    </ol>
  );
}
