import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { ItemIcon } from '@/components/catalog/item-listing';
import { VideoThumb } from '@/components/catalog/video';
import { detailsKey } from '@/lib/app-shell/details-key';
import { launchedAt, type AppItem } from '@/lib/app-shell/member';
import type { BrandMarks } from '@/lib/brand-kit';
import { headshotOf } from '@/lib/catalog/listing';
import { placeholderBackground } from '@/lib/catalog/video';
import { cn } from '@/lib/utils';
import { StoreCard } from './explore';
import { DetailsButton } from './item-details';

/**
 * Home (/app), in two columns. The wide one: what is new on the store, then the member's
 * projects and their own space as a grid of marks (only where Spaces open for them,
 * lib/app-shell/nav). The narrow one: their skills as pictures, their MCPs and apps as
 * icons (lib/app-shell/member › homeShelf: most used, then installed lately), and a
 * section kept for what comes next.
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

export function HomeView({ fresh, projects, skills, tools }: { fresh: AppItem[]; projects: HomeProject[] | null; skills: AppItem[]; tools: AppItem[] }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl items-start gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-10">
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

        {projects && (
          <section aria-label="Projects" className="flex flex-col gap-4">
            <SectionHead title="Projects" about="Your space and the projects you are on." href="/app/spaces" link="Spaces" />
            {projects.length ? (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                {projects.map(project => (
                  <li key={project.href}>
                    <Link href={project.href} className="group flex flex-col items-center gap-2 rounded-xl p-2 text-center outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border bg-background shadow-xs transition-shadow group-hover:shadow-md">
                        <ProjectMark project={project} />
                      </span>
                      <span className="flex w-full min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">{project.name}</span>
                        <span className="truncate text-[11px] text-muted-foreground">{project.note}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">You are on no project yet.</p>
            )}
          </section>
        )}
      </div>

      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
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

        <Panel title="MCPs & Apps" count={tools.length} href="/app/mine">
          {tools.length ? (
            <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
              {tools.map(item => (
                <li key={item.id} className="group relative">
                  <ItemIcon id={item.id} title={item.title} src={item.icon} className={cn('size-full aspect-square rounded-xl text-base transition-transform group-hover:-translate-y-0.5', item.locked && 'opacity-60')} />
                  <DetailsButton detailsKey={detailsKey.catalog(item.id)} href={item.page} cover title={item.title} aria-label={item.title} className="rounded-xl">
                    <span className="sr-only">{item.title}</span>
                  </DetailsButton>
                </li>
              ))}
            </ul>
          ) : (
            <Nothing>The MCPs and apps you use and install show here. Find them in</Nothing>
          )}
        </Panel>

        {/* kept empty for what comes next */}
        <section aria-hidden className="min-h-40 rounded-2xl border border-dashed" />
      </aside>
    </div>
  );
}
