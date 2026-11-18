'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRightIcon, CheckIcon, CloudIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, LockIcon, MonitorIcon, PencilIcon, PlayIcon, RocketIcon, StoreIcon, UsersIcon } from 'lucide-react';
import { Poster, Stage } from '@/components/catalog/proof-gallery';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { DetailsDevice, DetailsStatus, ItemDetails } from '@/lib/app-shell/details';
import type { GalleryTile } from '@/lib/catalog/gallery';
import { youtubeEmbedUrl } from '@/lib/catalog/video';

/**
 * The item dialog: click a skill, MCP or app wherever it is listed (Home,
 * Explore, Mine, a space's Skills tab, an item's own page) and the same
 * dialog opens. On the left, what it is and where it stands, its link in the
 * store, what it belongs to (each project a link), who can use it and which
 * computers have it; on the right, what was made with it, the trailer first;
 * at the foot, the command that puts it on the computer picked, with the
 * steps that set MediaMake up first when that computer is new.
 *
 * ItemDetailsProvider holds the one dialog and asks /api/catalog/details for
 * an item's details the first time it is opened (lib/app-shell/details);
 * DetailsButton is what opens it. Outside a provider the button is a link
 * to `href`, or plain text.
 */

const Context = React.createContext<{ open: (key: string) => void } | null>(null);

const KIND: Record<ItemDetails['kind'], string> = { skill: 'Skill', mcp: 'MCP', app: 'App' };

const TONE: Record<DetailsStatus['tone'], string> = {
  good: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  warn: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  bad: 'bg-red-500/15 text-red-700 dark:text-red-300',
  plain: 'bg-muted text-muted-foreground',
};

const DOT: Record<DetailsDevice['state'], string> = {
  has: 'bg-emerald-500',
  older: 'bg-sky-500',
  unsent: 'bg-amber-500',
  missing: 'bg-muted-foreground/30',
};

/** The picker's choice for a computer that isn't listed. */
const NEW = 'new';

function useCopy() {
  const [copied, setCopied] = React.useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy this:', text);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return [copied, copy] as const;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

/** A link inside the app, or one that leaves it. */
function Go({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return href.startsWith('/') ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}

/** Edit its store listing (a page), or release it (a line to copy). */
function Manage({ manage }: { manage: NonNullable<ItemDetails['manage']> }) {
  const [copied, copy] = useCopy();
  if (manage.href) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button asChild variant="outline" size="sm" className="h-8">
          <Link href={manage.href}>
            <PencilIcon /> {manage.label}
          </Link>
        </Button>
        {manage.note && <span className="min-w-0 text-xs text-muted-foreground">{manage.note}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <Button variant="outline" size="sm" className="h-8" title={`Copies: ${manage.copy}`} onClick={() => copy(manage.copy ?? '')}>
          {copied ? <CheckIcon /> : <RocketIcon />} {copied ? 'Copied the line' : manage.label}
        </Button>
      </div>
      {copied && manage.note && (
        <p className="text-xs text-muted-foreground" role="status">
          {manage.note}
        </p>
      )}
    </div>
  );
}

function Devices({ devices }: { devices: DetailsDevice[] }) {
  if (!devices.length) return <p className="text-xs text-muted-foreground">No computer has reported yet.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {devices.map(device => (
        <li key={device.key} className="flex items-start gap-2">
          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[device.state])} aria-hidden />
          <span className="min-w-0">
            <span className="inline-flex items-center gap-1 font-medium">
              {device.cloud && <CloudIcon className="size-3.5 text-muted-foreground" aria-hidden />}
              {device.name}
            </span>{' '}
            <span className="text-xs text-muted-foreground">{device.note}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One thing made with the item, small: it plays or opens in place. */
function OutputTile({ itemId, tile }: { itemId: string; tile: GalleryTile }) {
  const [playing, setPlaying] = React.useState(false);
  let stage: React.ReactNode;
  if (tile.kind === 'video' && tile.src) {
    stage = <video src={tile.src} poster={tile.poster} controls playsInline preload="metadata" className="absolute inset-0 size-full bg-black object-contain" />;
  } else if (tile.kind === 'youtube' && tile.youtubeId) {
    stage = playing ? (
      <iframe
        src={`${youtubeEmbedUrl(tile.youtubeId)}&autoplay=1`}
        title={tile.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 size-full border-0"
      />
    ) : (
      <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${tile.title}`} className="group absolute inset-0 size-full">
        <Poster itemId={itemId} tile={tile} small />
        <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/25">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/95 text-black shadow">
            <PlayIcon className="size-3.5 translate-x-px fill-current" />
          </span>
        </span>
      </button>
    );
  } else {
    const poster = <Poster itemId={itemId} tile={tile} small whole={tile.kind === 'image'} />;
    stage = tile.href ? (
      <Go href={tile.href} className="absolute inset-0">
        {poster}
        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white">
          <ExternalLinkIcon className="size-3" aria-hidden />
        </span>
      </Go>
    ) : (
      poster
    );
  }
  return (
    <li className="min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-md border bg-black">{stage}</div>
      <p className="mt-1 truncate text-xs" title={tile.title}>
        {tile.title}
      </p>
      {tile.description && <p className="truncate text-[11px] text-muted-foreground">{tile.description}</p>}
    </li>
  );
}

/** What was made with the item: the trailer on top when it has one, then a grid of the rest. */
function Outputs({ itemId, tiles }: { itemId: string; tiles: GalleryTile[] }) {
  const [playing, setPlaying] = React.useState(false);
  const trailer = tiles.find(tile => tile.trailer);
  const rest = tiles.filter(tile => tile !== trailer);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Made with it</h3>
      {trailer && (
        <div>
          <div className="relative aspect-video overflow-hidden rounded-lg border bg-black">
            <Stage itemId={itemId} tile={trailer} playing={playing} onPlay={() => setPlaying(true)} />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs">
            <span className="rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">Trailer</span>
            <span className="truncate font-medium">{trailer.title}</span>
          </p>
        </div>
      )}
      {rest.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-2 gap-y-3">
          {rest.map(tile => (
            <OutputTile key={tile.key} itemId={itemId} tile={tile} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** The foot: pick the computer, copy the command that puts the item there. */
function Install({ item }: { item: ItemDetails }) {
  const [copied, copy] = useCopy();
  const yours = item.devices.filter(device => device.command);
  // the first computer that doesn't have it yet, else the first one
  const [picked, setPicked] = React.useState(() => (yours.find(device => device.state !== 'has') ?? yours[0])?.key ?? NEW);

  if (item.locked) {
    return (
      <p className="flex items-center gap-1.5 text-sm">
        <LockIcon className="size-4 text-muted-foreground" aria-hidden />
        <span>
          Opens with <span className="font-medium">{item.locked}</span>.{' '}
          <Link href="/app/subscription" className="underline underline-offset-4">
            How to get it
          </Link>
        </span>
      </p>
    );
  }
  if (!item.install) {
    return item.open ? (
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">It runs in MediaMake. Nothing to install.</p>
        <Button asChild size="sm">
          <Go href={item.open}>
            <ArrowUpRightIcon /> Open {item.title}
          </Go>
        </Button>
      </div>
    ) : null;
  }

  const device = yours.find(entry => entry.key === picked);
  const text = device?.command ?? item.install.setup;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <MonitorIcon className="size-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">For</span>
          <select value={device ? picked : NEW} onChange={event => setPicked(event.target.value)} className="h-8 max-w-44 rounded-md border bg-background px-2 text-xs text-foreground" aria-label="The computer you will use it on">
            {yours.map(entry => (
              <option key={entry.key} value={entry.key}>
                {entry.name}
              </option>
            ))}
            <option value={NEW}>A new computer</option>
          </select>
        </label>
        <code className="min-w-0 flex-1 basis-40 truncate rounded-md border bg-muted/50 px-2.5 py-1.5 font-mono text-xs" title={text}>
          {text.split('\n')[0]}
        </code>
        <Button size="sm" className="h-8 shrink-0" onClick={() => copy(text)}>
          {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy command'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {device ? `${device.name} has MediaMake: run it there, or paste it into Claude.` : 'Copies the command with the steps that set MediaMake up first. Paste it into Claude Code on that computer.'}
      </p>
    </div>
  );
}

function Details({ itemKey, item }: { itemKey: string; item: ItemDetails }) {
  const notes = item.status.filter(status => status.note && status.tone !== 'good' && status.tone !== 'plain');
  const wide = item.outputs.length > 0;
  return (
    <>
      <div className={cn('min-h-0 flex-1 overflow-y-auto', wide && 'lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:overflow-hidden')}>
        <div className="flex flex-col gap-4 p-6 lg:overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-1.5 pr-8">
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{KIND[item.kind]}</span>
              {item.version && <span className="text-xs tabular-nums text-muted-foreground">v{item.version.replace(/^v/, '')}</span>}
              {item.status.map(status => (
                <span key={status.label} title={status.note} className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', TONE[status.tone])}>
                  {status.label}
                </span>
              ))}
            </div>
            <DialogTitle>{item.title}</DialogTitle>
            <DialogDescription>{item.summary ?? item.name}</DialogDescription>
          </DialogHeader>

          {notes.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {notes.map(status => (
                <li key={status.label}>
                  <span className="font-medium text-foreground">{status.label}:</span> {status.note}
                </li>
              ))}
            </ul>
          )}

          {item.manage && <Manage manage={item.manage} />}

          <dl className="divide-y border-y">
            <Row label="Store">
              {item.store.href ? (
                <>
                  <Link href={item.store.href} className="inline-flex items-center gap-1 font-medium underline underline-offset-4 hover:text-primary">
                    <StoreIcon className="size-3.5" aria-hidden /> In the store
                  </Link>
                  <span className="text-xs text-muted-foreground"> · {item.store.note}</span>
                </>
              ) : (
                <span className="text-muted-foreground">{item.store.note}</span>
              )}
            </Row>
            <Row label="Belongs to">
              <ul className="flex flex-wrap gap-1.5">
                {item.belongs.map(entry => (
                  <li key={entry.label}>
                    {entry.href ? (
                      <Go href={entry.href} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium hover:border-foreground/40 hover:bg-muted">
                        {entry.label} <ArrowUpRightIcon className="size-3" aria-hidden />
                      </Go>
                    ) : (
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{entry.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Row>
            <Row label="Access">
              <p className="flex items-start gap-1.5">
                <UsersIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span>{item.people}</span>
              </p>
              {item.used !== undefined && !item.open && !item.locked && (
                <div className="mt-2.5">
                  <Devices devices={item.devices} />
                </div>
              )}
            </Row>
            {item.used && <Row label="Last used">{item.used}</Row>}
          </dl>
        </div>

        {wide && (
          <div className="border-t bg-muted/30 p-4 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:pt-12">
            <Outputs itemId={itemKey} tiles={item.outputs} />
          </div>
        )}
      </div>

      {(item.locked || item.install || item.open) && (
        <div className="shrink-0 border-t bg-background px-6 py-3">
          <Install key={itemKey} item={item} />
        </div>
      )}
    </>
  );
}

type Loaded = { item: ItemDetails } | { error: string };

/** The one dialog, for everything under it. `details` are ones the page already has, by key. */
export function ItemDetailsProvider({ details, children }: { details?: Record<string, ItemDetails>; children: React.ReactNode }) {
  const [open, setOpen] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState<Record<string, Loaded>>({});
  const asked = React.useRef(new Set<string>());

  const show = React.useCallback(
    (key: string) => {
      setOpen(key);
      if (details?.[key] || asked.current.has(key)) return;
      asked.current.add(key);
      fetch(`/api/catalog/details?key=${encodeURIComponent(key)}`)
        .then(async response => {
          const json = await response.json().catch(() => ({}));
          if (!response.ok || !json.details) throw new Error(response.status === 404 ? 'It is not listed for you any more.' : (json.error ?? `Could not load it (${response.status}).`));
          setLoaded(current => ({ ...current, [key]: { item: json.details as ItemDetails } }));
        })
        .catch(error => {
          // asking again is allowed after a failure
          asked.current.delete(key);
          setLoaded(current => ({ ...current, [key]: { error: error instanceof Error ? error.message : 'Could not load it.' } }));
        });
    },
    [details],
  );
  const value = React.useMemo(() => ({ open: show }), [show]);

  const given = open ? details?.[open] : undefined;
  const state: Loaded | undefined = given ? { item: given } : open ? loaded[open] : undefined;
  const item = state && 'item' in state ? state.item : undefined;
  return (
    <Context.Provider value={value}>
      {children}
      <Dialog open={!!open} onOpenChange={next => !next && setOpen(null)}>
        <DialogContent className={cn('flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl', item && item.outputs.length > 0 && 'lg:max-w-5xl')}>
          {item && open ? (
            <Details itemKey={open} item={item} />
          ) : (
            <div className="flex flex-col gap-2 p-6">
              <DialogTitle className="text-base">{state && 'error' in state ? 'Could not open it' : 'Loading'}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                {state && 'error' in state ? (
                  state.error
                ) : (
                  <>
                    <Loader2Icon className="size-4 animate-spin" aria-hidden /> Getting its details
                  </>
                )}
              </DialogDescription>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Context.Provider>
  );
}

/**
 * An item's name that opens its dialog. `cover` makes the whole card or
 * row around it (the nearest `relative` parent) the click target; other
 * buttons there need `relative z-10` to stay clickable. Outside a provider
 * it is a link to `href` when there is one, else plain text.
 */
export function DetailsButton({
  detailsKey,
  href,
  cover = false,
  className,
  children,
  ...rest
}: {
  detailsKey?: string;
  /** Where the name goes when there is no dialog to open. */
  href?: string;
  cover?: boolean;
  className?: string;
  children: React.ReactNode;
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'tabIndex' | 'aria-hidden' | 'aria-label'>) {
  const context = React.useContext(Context);
  if (!detailsKey || !context) {
    return href ? (
      <Link href={href} className={cn('underline-offset-4 hover:underline', className)}>
        {children}
      </Link>
    ) : (
      <span className={className}>{children}</span>
    );
  }
  return (
    <button
      type="button"
      data-details
      className={cn('cursor-pointer text-left underline-offset-4 outline-none hover:underline focus-visible:underline', cover && 'after:absolute after:inset-0 after:rounded-[inherit]', className)}
      onClick={() => context.open(detailsKey)}
      {...rest}
    >
      {children}
    </button>
  );
}
