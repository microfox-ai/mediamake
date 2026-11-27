import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { ItemIcon } from '@/components/catalog/item-listing';
import { VideoThumb } from '@/components/catalog/video';
import { detailsKey } from '@/lib/app-shell/details-key';
import { KIND_LABEL, launchedAt, type AppItem } from '@/lib/app-shell/member';
import type { BrandMarks } from '@/lib/brand-kit';
import { headshotOf } from '@/lib/catalog/listing';
import { placeholderBackground } from '@/lib/catalog/video';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StoreCard } from './explore';
import { HideWhileSearching, HomeFeed } from './home-feed';
import { DetailsButton } from './item-details';

/**
 * Home (/app), in two columns. The wide one: what is new on the store, then every item on the
 * store, a row each, more as the page is scrolled (./home-feed); the search beside the page's
 * title filters that list, and New on Store steps aside while it is on. The narrow one, three
 * boxes: the member's skills as pictures, their projects and their own space as marks (only
 * where Spaces open for them, lib/app-shell/nav), and their MCPs and apps as icons
 * (lib/app-shell/member › homeShelf: most used, then installed lately). A mark or an icon says
 * what it is in a few words on hover.
 */

export interface HomeProject {
  /** Its space's page: `/app/spaces/<projectId>`. */
  href: string;
  name: string;
  brand?: BrandMarks;
  /** A word under its name: `Your space`, `4 people`. */
  note: string;
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function SectionHead({ title, about, href, link }: { title: string; about?: string; href?: string; link?: string }) {
  return (
    <div className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold leading-tight tracking-tight">{title}</h2>
        {about && <p className="truncate text-xs text-muted-foreground">{about}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
          {link ?? 'See all'} <ArrowRightIcon className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** A narrow card of the right column: its title, how many, a link to all of them, then its grid. */
function Panel({ title, count, href, children }: { title: string; count?: number; href?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-baseline gap-1.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {count ? <span className="text-xs tabular-nums text-muted-foreground">{count}</span> : null}
        {href && (
          <Link href={href} className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            All
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Nothing({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
      {children}{' '}
      <Link href="/app/explore" className="font-medium text-foreground underline underline-offset-4">
        Explore
      </Link>
    </p>
  );
}

/** A project's mark: its favicon, else its logo, else its first letter on its own colour. */
function ProjectMark({ project }: { project: HomeProject }) {
  const src = project.brand?.favicon ?? project.brand?.logo;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="size-full object-contain p-2" />
  ) : (
    <span aria-hidden className="flex size-full items-center justify-center text-xl font-semibold text-white" style={{ background: placeholderBackground(project.name) }}>
      {project.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** A tile of the right column with a few plain words shown on hover (and on keyboard focus). */
function Hint({ words, children }: { words: React.ReactNode; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="max-w-60 text-left">
        {words}
      </TooltipContent>
    </Tooltip>
  );
}

export function HomeView({
  fresh,
  store,
  q = '',
  projects,
  skills,
  tools,
}: {
  fresh: AppItem[];
  /** The whole store as Home lists it (lib/app-shell/member › storeList). */
  store: AppItem[];
  /** The search the page opened with (`/app?q=…`). */
  q?: string;
  projects: HomeProject[] | null;
  skills: AppItem[];
  tools: AppItem[];
}) {
  return (
    <div className="mx-auto grid w-full max-w-7xl items-start gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-10">
        <HideWhileSearching initial={q}>
          <section aria-label="New on Store" className="flex flex-col gap-4">
            <SectionHead title="New on Store" about="The latest skills, MCPs and apps, newest first." href="/app/explore?view=all" />
            {fresh.length ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 xl:grid-cols-3">
                {fresh.map(item => (
                  <StoreCard key={item.id} item={item} note={day(launchedAt(item))} className="w-auto shrink sm:w-auto" />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing new on the store yet.</p>
            )}
          </section>
        </HideWhileSearching>

        <HomeFeed items={store} initial={q} />
      </div>

      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100svh-2rem)] lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
        <Panel title="Skills" count={skills.length} href="/app/mine">
          {skills.length ? (
            <ul className="grid grid-cols-2 gap-x-2.5 gap-y-3 sm:grid-cols-4 lg:grid-cols-2">
              {skills.map(item => (
                <li key={item.id} className="group relative flex min-w-0 flex-col gap-1.5">
                  <VideoThumb id={item.id} title={item.title} src={headshotOf(item)} size="sm" className="rounded-lg border transition-shadow group-hover:shadow-md" />
                  <DetailsButton detailsKey={detailsKey.catalog(item.id)} href={item.page} cover title={item.title} className="truncate text-xs font-medium hover:no-underline">
                    {item.title}
                  </DetailsButton>
                </li>
              ))}
            </ul>
          ) : (
            <Nothing>The skills you run and install show here. Find one in</Nothing>
          )}
        </Panel>

        {projects && (
          <Panel title="Projects" count={projects.length} href="/app/spaces">
            {projects.length ? (
              <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
                {projects.map(project => (
                  <Hint
                    key={project.href}
                    words={
                      <>
                        <span className="block font-medium">{project.name}</span>
                        <span className="block opacity-80">{project.note}</span>
                      </>
                    }
                  >
                    <li>
                      <Link
                        href={project.href}
                        aria-label={project.name}
                        className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-background outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ProjectMark project={project} />
                      </Link>
                    </li>
                  </Hint>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">You are on no project yet.</p>
            )}
          </Panel>
        )}

        <Panel title="MCPs & Apps" count={tools.length} href="/app/mine">
          {tools.length ? (
            <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
              {tools.map(item => (
                <Hint
                  key={item.id}
                  words={
                    <>
                      <span className="block font-medium">
                        {item.title} · {KIND_LABEL[item.kind].one}
                      </span>
                      {item.summary && <span className="line-clamp-3 opacity-80">{item.summary}</span>}
                    </>
                  }
                >
                  <li className="group relative">
                    <ItemIcon id={item.id} title={item.title} src={item.icon} className={cn('size-full aspect-square rounded-xl text-base transition-transform group-hover:-translate-y-0.5', item.locked && 'opacity-60')} />
                    <DetailsButton detailsKey={detailsKey.catalog(item.id)} href={item.page} cover aria-label={item.title} className="rounded-xl">
                      <span className="sr-only">{item.title}</span>
                    </DetailsButton>
                  </li>
                </Hint>
              ))}
            </ul>
          ) : (
            <Nothing>The MCPs and apps you use and install show here. Find them in</Nothing>
          )}
        </Panel>
      </aside>
    </div>
  );
}
