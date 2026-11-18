'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftIcon, ArrowUpRightIcon, BookOpenIcon, CheckIcon, ChevronRightIcon, CloudIcon, CopyIcon, ExternalLinkIcon, ImagesIcon, LockIcon, MonitorIcon, PencilIcon, PlayIcon, RocketIcon, StoreIcon } from 'lucide-react';
import { AboutCard, ReadmeView } from '@/components/catalog/item-listing';
import { DependsOn, SkillFilesCard, SkillOwnerTools } from '@/components/catalog/skill-details';
import { ItemRating } from '@/components/ratings/item-rating';
import { Poster } from '@/components/catalog/proof-gallery';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DetailsDevice, ItemDetails } from '@/lib/app-shell/details';
import { itemPageHref, type Crumb } from '@/lib/app-shell/item-page';
import type { GalleryTile } from '@/lib/catalog/gallery';
import type { ListingBadge } from '@/lib/catalog/listing';
import { natureInfo, typeInfo } from '@/lib/catalog/skill-profile';
import { youtubeEmbedUrl } from '@/lib/catalog/video';

/**
 * An item's page: click a skill, MCP or app wherever it is listed (Home,
 * Explore, Mine, a space's Skills tab, a store page) and its page opens
 * (/app/item, lib/app-shell/item-page), the same for every item, private or
 * public, laid out as a space's Code tab is. A breadcrumb at the top says
 * where it was opened and goes back there. On the left the command that puts
 * it on the computer picked, its README (the item's store listing: a video
 * first, its title, its badges and how to use it) and what was made with it;
 * on the right what it is, its tags, its rating, its link in the store, what
 * it belongs to and which computers have it.
 *
 * DetailsButton is the link every list uses; ItemDetailsProvider marks where
 * it goes to the app's page (outside it, the link is `href` or plain text).
 */

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
    <div className="flex flex-col gap-1 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
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

/** What was made with the item, as a grid. Its trailer is not here: it plays above the README. */
function Outputs({ itemId, tiles }: { itemId: string; tiles: GalleryTile[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
      {tiles.map(tile => (
        <OutputTile key={tile.key} itemId={itemId} tile={tile} />
      ))}
    </ul>
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

/** A private item's badges: where it stands, and its version. A store item's come with its listing. */
function badgesOf(item: ItemDetails): ListingBadge[] {
  return [
    ...item.status.map(status => ({ label: status.label, tone: status.tone, title: status.note })),
    ...(item.listing?.badges ?? (item.version ? [{ label: `v${item.version.replace(/^v/, '')}`, tone: 'plain' as const }] : [])),
  ];
}

/**
 * An item's page, laid out as a space's Code tab is: the breadcrumb back to where it was opened, then on
 * the left what puts it on a computer, its README (the video first, the title, the badges, how to use
 * it) and what was made with it; on the right what it is, its tags, its rating and where it lives. The
 * same page for every item, private or public.
 */
export function ItemView({ itemKey, item, crumbs }: { itemKey: string; item: ItemDetails; crumbs: Crumb[] }) {
  const notes = item.status.filter(status => status.note && status.tone !== 'good' && status.tone !== 'plain');
  // a private-use skill needs no production to prove it: its page has no "Made with it"
  const made = item.skill?.nature === 'private-use' ? 0 : item.outputs.length;
  const readme = item.readme ?? { html: '', written: false };
  const back = [...crumbs].reverse().find(crumb => crumb.href);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 lg:px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        {back?.href && (
          <Link href={back.href} className="flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Back to ${back.label}`}>
            <ArrowLeftIcon className="size-4" aria-hidden />
          </Link>
        )}
        <ol className="flex min-w-0 flex-wrap items-center gap-1 text-muted-foreground">
          {crumbs.map((crumb, index) => (
            <li key={`${index}-${crumb.label}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />}
              {crumb.href ? (
                <Link href={crumb.href} className="truncate hover:text-foreground hover:underline underline-offset-4">
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-foreground" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
        <span className="ml-auto hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
          {item.kind}/{item.name}
        </span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {(item.locked || item.install || item.open) && (
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <Install key={itemKey} item={item} />
            </div>
          )}
          {item.files && <SkillFilesCard key={`files-${itemKey}`} files={item.files} />}
          <section id="readme" className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
              <BookOpenIcon className="size-4 text-muted-foreground" aria-hidden /> README
            </div>
            <div className="px-5 py-5 sm:px-8">
              <ReadmeView id={itemKey} kind={item.kind} title={item.title} readme={readme} badges={badgesOf(item)} video={item.video} headshot={item.listing?.headshot} icon={item.listing?.icon} heading="h1" />
            </div>
          </section>
          {made > 0 && (
            <section id="made" className="overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
                <ImagesIcon className="size-4 text-muted-foreground" aria-hidden /> Made with it
                <span className="rounded-full bg-muted px-1.5 text-[11px] font-normal tabular-nums text-muted-foreground">{made}</span>
              </div>
              <div className="p-4">
                <Outputs itemId={itemKey} tiles={item.outputs} />
              </div>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col divide-y [&>section]:py-5 [&>section:first-child]:pt-0">
          <section>
            <AboutCard
              kind={item.kind}
              description={item.summary}
              tags={item.skill ? [...item.skill.ownTags, ...item.skill.tags] : item.listing?.tags}
              rating={item.itemId ? <ItemRating itemId={item.itemId} title={item.title} version={item.version} initial={item.listing?.rating} /> : undefined}
              facts={{
                version: item.version,
                people: item.people,
                size: item.listing?.size,
                ...(item.skill ? { nature: natureInfo(item.skill.nature), ...(item.skill.type && { type: typeInfo(item.skill.type) }) } : { deps: item.listing?.deps }),
              }}
            >
              {notes.length > 0 && (
                <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {notes.map(status => (
                    <li key={status.label}>
                      <span className="font-medium text-foreground">{status.label}:</span> {status.note}
                    </li>
                  ))}
                </ul>
              )}
              {item.skill && item.canEdit && <SkillOwnerTools itemKey={itemKey} title={item.title} view={item.skill} checks={item.readmeChecks} canEdit />}
            </AboutCard>
          </section>

          {item.depends && item.depends.length > 0 && <DependsOn depends={item.depends} />}

          {item.manage && (
            <section>
              <Manage manage={item.manage} />
            </section>
          )}

          <section>
            <dl className="divide-y">
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
                        <Go href={entry.href} className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium hover:border-foreground/40 hover:bg-muted">
                          {entry.label} <ArrowUpRightIcon className="size-3" aria-hidden />
                        </Go>
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{entry.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Row>
              {item.used !== undefined && !item.open && !item.locked && (
                <Row label="Computers">
                  <Devices devices={item.devices} />
                </Row>
              )}
              {item.used && <Row label="Last used">{item.used}</Row>}
              {item.itemId && item.store.href && (
                <Row label="Feedback">
                  <Link href={`${item.store.href}#feedback`} className="font-medium underline underline-offset-4 hover:text-primary">
                    Known issues and feedback
                  </Link>
                </Row>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Whether links open the app's item page: inside the app, and on a store page for someone signed in. */
const Context = React.createContext<{ inApp: boolean }>({ inApp: false });

/** Makes every item name under it a link to the item's page (/app/item), with where it was opened from. */
export function ItemDetailsProvider({ inApp = true, children }: { inApp?: boolean; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ inApp }), [inApp]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

const HERE_CHANGED = 'mm:here';

/**
 * Keeps a page's open tab in its address (`?tab=skills`), without a navigation, so the breadcrumb of an
 * item opened from that tab leads back to it.
 */
export function rememberTab(value: string, param = 'tab') {
  const url = new URL(window.location.href);
  url.searchParams.set(param, value);
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new Event(HERE_CHANGED));
}

/** The page this one is, path and query, so an item's breadcrumb leads back to the same tab. */
function useHere(): string {
  const pathname = usePathname() ?? '';
  const [search, setSearch] = React.useState('');
  React.useEffect(() => {
    const read = () => setSearch(window.location.search);
    read();
    window.addEventListener(HERE_CHANGED, read);
    window.addEventListener('popstate', read);
    return () => {
      window.removeEventListener(HERE_CHANGED, read);
      window.removeEventListener('popstate', read);
    };
  }, [pathname]);
  return pathname + search;
}

/**
 * An item's name that opens its page. `cover` makes the whole card or row around it (the nearest
 * `relative` parent) the click target; other buttons there need `relative z-10` to stay clickable.
 * Outside the app (a store page for someone signed out) it is a link to `href` when there is one, else
 * plain text.
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
  /** Where the name goes outside the app. */
  href?: string;
  cover?: boolean;
  className?: string;
  children: React.ReactNode;
} & Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'tabIndex' | 'aria-hidden' | 'aria-label'>) {
  const { inApp } = React.useContext(Context);
  const here = useHere();
  const to = inApp && detailsKey ? itemPageHref(detailsKey, here) : href;
  if (!to) return <span className={className}>{children}</span>;
  return (
    <Link
      href={to}
      data-details
      className={cn('underline-offset-4 outline-none hover:underline focus-visible:underline', cover && 'after:absolute after:inset-0 after:rounded-[inherit]', className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
