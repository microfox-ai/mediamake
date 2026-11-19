'use client';

import * as React from 'react';
import { ClapperboardIcon, ImageIcon, Loader2Icon, PackageIcon } from 'lucide-react';
import { formatBytes } from '@/lib/projects/storage';
import type { SpaceStorage } from '@/lib/projects/storage-store';

/**
 * The Assets tab of a space's page (project-detail.tsx): what the space keeps on MediaMake, in one
 * place. Three cards say how much space its productions, its releases and its media use, and pick
 * which of the three is listed below. Reading only: they are added from Claude.
 */

export interface Bundle {
  id: string;
  slug: string;
  title: string;
  latestVersion: number;
  status: string;
  fileCount: number;
  bytes: number;
  updatedAt: string;
  release?: { platform: string };
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  contentType?: string;
  size?: number;
  createdAt?: string;
}

export interface Listing<T> {
  total: number;
  items: T[];
}

export const ASSET_KINDS = ['productions', 'releases', 'media'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export const isAssetKind = (value: unknown): value is AssetKind => ASSET_KINDS.includes(value as AssetKind);

const KINDS: { kind: AssetKind; label: string; noun: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { kind: 'productions', label: 'Productions', noun: 'production', icon: ClapperboardIcon },
  { kind: 'releases', label: 'Releases', noun: 'release', icon: PackageIcon },
  { kind: 'media', label: 'Media', noun: 'media file', icon: ImageIcon },
];

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const Loading = () => (
  <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
    <Loader2Icon className="size-3.5 animate-spin" /> Loading
  </p>
);

const Empty = ({ children }: { children: React.ReactNode }) => <p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">{children}</p>;

export function AssetsTab({
  productions,
  releases,
  media,
  storage,
  first = 'productions',
}: {
  productions: Listing<Bundle> | null;
  releases: Listing<Bundle> | null;
  media: Listing<MediaItem> | null;
  /** What the space stores, by kind. Not loaded yet, or it could not be counted: the sizes are left out. */ storage: SpaceStorage | null;
  /** The list to open on. */ first?: AssetKind;
}) {
  const [kind, setKind] = React.useState<AssetKind>(first);
  const totals: Record<AssetKind, number | undefined> = { productions: productions?.total, releases: releases?.total, media: media?.total };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Which assets">
        {KINDS.map(({ kind: each, label, noun, icon: Icon }) => {
          const count = totals[each];
          return (
            <button
              key={each}
              type="button"
              aria-pressed={kind === each}
              onClick={() => setKind(each)}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 text-left transition-colors ${kind === each ? 'border-foreground/40 bg-muted/60' : 'bg-card hover:bg-muted/40'}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4 text-muted-foreground" aria-hidden /> {label}
              </span>
              <span className="text-2xl leading-tight font-semibold tabular-nums">{storage ? formatBytes(storage[each]) : '–'}</span>
              <span className="text-xs text-muted-foreground">{count === undefined ? 'Loading' : `${count} ${noun}${count === 1 ? '' : 's'}`}</span>
            </button>
          );
        })}
      </div>

      {kind === 'productions' && <Bundles listing={productions} empty="No productions yet. A production is a video's code and renders, kept so any computer on the space can pick it up." />}
      {kind === 'releases' && <Bundles listing={releases} empty="No releases yet. A release is a whole kit: a YouTube upload pack, a DistroKid release." />}
      {kind === 'media' && <Media listing={media} />}
    </div>
  );
}

function Bundles({ listing, empty }: { listing: Listing<Bundle> | null; empty: string }) {
  if (!listing) return <Loading />;
  if (!listing.items.length) return <Empty>{empty}</Empty>;
  return (
    <>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {listing.items.map(item => (
          <li key={item.id} className="flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{item.title}</span>
              {item.release && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{item.release.platform}</span>}
              {item.status !== 'ready' && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">uploading</span>}
              <span className="ml-auto shrink-0 text-sm font-medium tabular-nums">{formatBytes(item.bytes)}</span>
            </div>
            <span className="mt-0.5 font-mono text-xs text-muted-foreground">{item.slug}</span>
            <span className="mt-3 text-xs tabular-nums text-muted-foreground">
              v{item.latestVersion || 1} · {item.fileCount} file{item.fileCount === 1 ? '' : 's'} · {day(item.updatedAt)}
            </span>
          </li>
        ))}
      </ul>
      {listing.total > listing.items.length && (
        <p className="text-xs text-muted-foreground">
          Showing the newest {listing.items.length} of {listing.total}.
        </p>
      )}
    </>
  );
}

function Media({ listing }: { listing: Listing<MediaItem> | null }) {
  if (!listing) return <Loading />;
  if (!listing.items.length) return <Empty>No media yet. Shared pictures, songs and clips of the space show here.</Empty>;
  return (
    <>
      <ul className="divide-y rounded-xl border bg-card px-4">
        {listing.items.map(item => (
          <li key={item.id} className="flex items-baseline gap-3 py-2.5 text-sm">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate underline-offset-4 hover:underline">
              {item.name}
            </a>
            <span className="text-xs text-muted-foreground">{item.contentType}</span>
            <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatBytes(item.size ?? 0)} · {day(item.createdAt)}
            </span>
          </li>
        ))}
      </ul>
      {listing.total > listing.items.length && (
        <p className="text-xs text-muted-foreground">
          Showing the newest {listing.items.length} of {listing.total}.
        </p>
      )}
    </>
  );
}
