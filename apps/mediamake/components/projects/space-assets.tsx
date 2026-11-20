'use client';

import * as React from 'react';
import { CheckIcon, ClapperboardIcon, CodeIcon, CopyIcon, EyeIcon, FileIcon, FileTextIcon, FilmIcon, ImageIcon, Loader2Icon, MusicIcon, PackageIcon } from 'lucide-react';
import type { FileKind } from '@/lib/projectsync';
import { formatBytes } from '@/lib/projects/storage';
import type { SpaceStorage } from '@/lib/projects/storage-store';
import { BundleBrowser } from './bundle-browser';

/**
 * The Assets tab of a space's page (project-detail.tsx): what the space keeps on MediaMake, in one
 * place. Three cards say how much space its productions, its releases and its media use, and pick
 * which of the three is listed below. A production or a release is a card, three to a row: its
 * picture, how many versions and files it has (by kind) and what all its versions keep in storage,
 * with a button that copies a prompt naming it for Claude. It opens as a file browser
 * (./bundle-browser). Reading only: they are added from Claude.
 */

export interface Bundle {
  id: string;
  slug: string;
  title: string;
  latestVersion: number;
  status: string;
  /** The latest version's files, and what they come to. */
  fileCount: number;
  bytes: number;
  /** Every version together, a file they share counted once: what it keeps in storage. */
  storedBytes?: number;
  versionCount?: number;
  /** The latest version's files by kind. */
  kinds?: Partial<Record<FileKind, number>>;
  /** The file that stands for it: a signed link, good for an hour. */
  thumb?: { kind: 'image' | 'video'; path: string; url: string };
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
  projectId,
  projectName,
  productions,
  releases,
  media,
  storage,
  first = 'productions',
}: {
  projectId: string;
  /** The space's name, for the prompt a card copies. */ projectName?: string;
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

      {kind === 'productions' && <Bundles projectId={projectId} projectName={projectName} kind="productions" listing={productions} empty="No productions yet. A production is a video's code and renders, kept so any computer on the space can pick it up." />}
      {kind === 'releases' && <Bundles projectId={projectId} projectName={projectName} kind="releases" listing={releases} empty="No releases yet. A release is a whole kit: a YouTube upload pack, a DistroKid release." />}
      {kind === 'media' && <Media listing={media} />}
    </div>
  );
}

const KIND_ICON: Record<FileKind, { Icon: React.ComponentType<{ className?: string }>; one: string }> = {
  video: { Icon: FilmIcon, one: 'video' },
  image: { Icon: ImageIcon, one: 'picture' },
  audio: { Icon: MusicIcon, one: 'audio file' },
  doc: { Icon: FileTextIcon, one: 'document' },
  code: { Icon: CodeIcon, one: 'code file' },
  other: { Icon: FileIcon, one: 'other file' },
};
const KIND_ORDER: FileKind[] = ['video', 'image', 'audio', 'doc', 'code', 'other'];
/** The colours behind the icon of a card with no picture, by what it mostly holds. */
const GLOW: Record<FileKind, [string, string]> = {
  audio: ['#c084fc', '#4c1d95'],
  video: ['#fb7185', '#881337'],
  image: ['#38bdf8', '#0c4a6e'],
  doc: ['#fbbf24', '#78350f'],
  code: ['#34d399', '#064e3b'],
  other: ['#94a3b8', '#1e293b'],
};

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** What stands for a production or a release: its picture cropped square, a frame of its video, or an icon on a glow. */
function Thumb({ item }: { item: Bundle }) {
  const [broken, setBroken] = React.useState(false);
  const frame = 'size-16 shrink-0 overflow-hidden rounded-lg border bg-muted';
  if (item.thumb && !broken) {
    return item.thumb.kind === 'image' ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.thumb.url} alt="" loading="lazy" onError={() => setBroken(true)} className={`${frame} object-cover`} />
    ) : (
      // a frame a second in: the first one is often black
      <video src={`${item.thumb.url}#t=1`} muted playsInline preload="metadata" onError={() => setBroken(true)} className={`${frame} object-cover`} aria-hidden />
    );
  }
  const kinds = item.kinds ?? {};
  const main = (['audio', 'video', 'image', 'doc', 'code', 'other'] as FileKind[]).find(kind => kinds[kind]) ?? 'other';
  const { Icon } = KIND_ICON[main];
  const [from, to] = GLOW[main];
  return (
    <span className={`${frame} flex items-center justify-center border-transparent`} style={{ background: `radial-gradient(circle at 30% 25%, ${from}, ${to})` }} aria-hidden>
      <Icon className="size-7 text-white/90" />
    </span>
  );
}

/** What to paste into Claude so it knows which production or release is meant, and how to read it. */
export function bundlePrompt(kind: 'productions' | 'releases', item: Bundle, projectId: string, projectName?: string): string {
  const noun = kind === 'productions' ? 'production' : 'release';
  const about = [item.release && `a ${item.release.platform === 'other' ? '' : `${item.release.platform} `}release kit`, plural(item.versionCount ?? 1, 'version'), `latest v${item.latestVersion || 1} with ${plural(item.fileCount, 'file')}`].filter(Boolean).join(', ');
  return [
    `I mean the ${noun} "${item.title}" (slug ${item.slug}) in ${projectName ? `the MediaMake space "${projectName}"` : 'my MediaMake space'} (project id ${projectId}): ${about}.`,
    `Read it with the MediaMake Spaces MCP: get_${noun} with projectId "${projectId}" and slug "${item.slug}" (add saveTo to download its files).`,
  ].join('\n');
}

function CopyPrompt({ text, title }: { text: string; title: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no clipboard here
    }
  };
  return (
    <button type="button" onClick={copy} title={copied ? 'Copied' : 'Copy a prompt that tells Claude which one you mean'} aria-label={`Copy a prompt about ${title}`} className="absolute top-2 right-2 z-10 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
      {copied ? <CheckIcon className="size-3.5 text-emerald-600" aria-hidden /> : <CopyIcon className="size-3.5" aria-hidden />}
    </button>
  );
}

function Bundles({ projectId, projectName, kind, listing, empty }: { projectId: string; projectName?: string; kind: 'productions' | 'releases'; listing: Listing<Bundle> | null; empty: string }) {
  const [open, setOpen] = React.useState<Bundle | null>(null);
  if (!listing) return <Loading />;
  if (!listing.items.length) return <Empty>{empty}</Empty>;
  return (
    <>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {listing.items.map(item => {
          const versions = item.versionCount ?? 1;
          return (
            <li key={item.id} className="relative flex min-w-0 gap-3 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:bg-muted/40">
              <Thumb item={item} />
              <div className="flex min-w-0 flex-1 flex-col">
                {/* the whole card opens its files; the copy button sits above it */}
                <button type="button" onClick={() => setOpen(item)} aria-label={`Open the files of ${item.title}`} className="cursor-pointer truncate pr-7 text-left text-sm font-semibold after:absolute after:inset-0 after:rounded-xl">
                  {item.title}
                </button>
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate font-mono">{item.slug}</span>
                  {item.release && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px]">{item.release.platform}</span>}
                  {item.status !== 'ready' && <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">uploading</span>}
                </span>
                <span className="mt-1.5 text-xs tabular-nums">
                  {plural(versions, 'version')} · {plural(item.fileCount, 'file')} · <span className="font-medium">{formatBytes(item.storedBytes ?? item.bytes)}</span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs tabular-nums text-muted-foreground">
                  {KIND_ORDER.filter(each => item.kinds?.[each]).map(each => {
                    const { Icon, one } = KIND_ICON[each];
                    return (
                      <span key={each} className="inline-flex items-center gap-1" title={plural(item.kinds![each]!, one)}>
                        <Icon className="size-3.5" aria-hidden /> {item.kinds![each]}
                        <span className="sr-only"> {plural(item.kinds![each]!, one).replace(/^\d+ /, '')}</span>
                      </span>
                    );
                  })}
                  <span className="ml-auto shrink-0">{day(item.updatedAt)}</span>
                </span>
              </div>
              <CopyPrompt text={bundlePrompt(kind, item, projectId, projectName)} title={item.title} />
            </li>
          );
        })}
      </ul>
      {listing.total > listing.items.length && (
        <p className="text-xs text-muted-foreground">
          Showing the newest {listing.items.length} of {listing.total}.
        </p>
      )}
      <BundleBrowser projectId={projectId} kind={kind} bundle={open} onClose={() => setOpen(null)} />
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
            <a href={item.url} target="_blank" rel="noopener noreferrer" title="Preview in a new tab" aria-label={`Preview ${item.name} in a new tab`} className="shrink-0 self-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <EyeIcon className="size-3.5" aria-hidden />
            </a>
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
