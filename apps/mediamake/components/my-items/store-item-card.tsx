import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';
import { LevelBadge, TierBadge } from '@/components/app-shell/item-bits';
import { ItemCardTools, type CardValues } from '@/components/catalog/item-card-editor';
import { ItemIcon } from '@/components/catalog/item-listing';
import { VideoThumb } from '@/components/catalog/video';
import { AuthorsButton, Initial, UpdateButton } from '@/components/my-items/item-tools';
import type { AuthorShown } from '@/lib/catalog/authors';
import { itemPagePath } from '@/lib/catalog/paths';
import type { ItemTier, Readiness } from '@/lib/catalog/types';
import { cn } from '@/lib/utils';

/**
 * One store item on My store items (app/app/(account)/my-items), drawn with the store's own parts
 * (its headshot, icon and badges, as Explore shows them): how it shows, who looks after it, where
 * the last thing its author sent stands, and what an author does with it. Edit card is the main
 * action; the picture and the name open its page in the store.
 */

/** How the last thing sent stands, as a colour: live, waiting for an admin, needs the author, or over. */
export type SentTone = 'good' | 'wait' | 'bad' | 'plain';

export interface StoreItemRow {
  /** `skill/<name>`, `mcp/<name>` or `app/<name>`. */
  id: string;
  title: string;
  /** What its cards say: its listing's description, else its own summary. */
  description?: string;
  headshot?: string;
  icon?: string;
  /** Skill, MCP or App. */
  kindLabel: string;
  level: Readiness | undefined;
  tier: ItemTier;
  version?: string;
  authors: AuthorShown[];
  /** The newest thing this author sent for it, and where it stands. */
  sent?: { version: string; standing: string; day: string; tone: SentTone };
  /** What Edit card starts from: the listing's own values, and the item's own summary. */
  card: CardValues;
  /** The author's updates are published at once (Cohort and admins), not reviewed first. */
  direct: boolean;
}

const DOT: Record<SentTone, string> = {
  good: 'bg-emerald-500',
  wait: 'bg-amber-500',
  bad: 'bg-red-500',
  plain: 'bg-muted-foreground/40',
};

const chip = 'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium';
const label = 'text-[11px] font-medium uppercase tracking-wide text-muted-foreground';

/** A coloured dot before a line that says where something stands. */
export function StandingDot({ tone, className }: { tone: SentTone; className?: string }) {
  return <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[tone], className)} />;
}

export function StoreItemCard({ item }: { item: StoreItemRow }) {
  const { id, title, description, headshot, icon, kindLabel, level, tier, version, authors, sent, card, direct } = item;
  const [kind, slug] = id.split('/');
  const page = itemPagePath(id);
  return (
    <article className="group/item grid overflow-hidden rounded-2xl border bg-card transition-shadow duration-200 hover:shadow-md md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="p-4 md:p-5 md:pr-0">
        <Link href={page} aria-label={`${title}, as it shows in the store`} className="block overflow-hidden rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <VideoThumb id={id} title={title} src={headshot} className="transition-transform duration-300 ease-out group-hover/item:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover/item:scale-100" />
        </Link>
      </div>

      <div className="flex min-w-0 flex-col gap-4 p-4 pt-0 md:p-5">
        <header className="flex items-start gap-3">
          {kind !== 'skill' && <ItemIcon id={id} title={title} src={icon} className="size-11 rounded-xl" />}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold leading-tight tracking-tight">
              <Link href={page} className="underline-offset-4 hover:underline">
                {title}
              </Link>
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{id}</p>
          </div>
          {/* on a phone the picture and the name already open it */}
          <Link href={page} className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex">
            View in the store <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </header>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(chip, 'border')}>{kindLabel}</span>
          {level === 'ready' ? <span className={cn(chip, 'bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-300')}>Production</span> : <LevelBadge item={{ level: level ?? 'beta' }} />}
          <TierBadge item={{ tier, locked: false }} always />
          {version && <span className="font-mono text-[11px] text-muted-foreground">v{version.replace(/^v/, '')}</span>}
        </div>

        {description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}

        <dl className="grid gap-x-8 gap-y-3 border-t pt-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className={label}>{authors.length === 1 ? 'Author' : 'Authors'}</dt>
            <dd className="mt-1.5 flex items-center gap-2 text-sm">
              <span className="flex shrink-0 -space-x-1.5">
                {authors.slice(0, 4).map((author, i) => (
                  <Initial key={`${author.name}-${i}`} name={author.name} className="ring-2 ring-card" />
                ))}
              </span>
              <span className="min-w-0 truncate">{authors.length ? authors.map(author => author.name).join(', ') : 'Not named yet'}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className={label}>Last sent by you</dt>
            <dd className="mt-1.5 flex items-start gap-2 text-sm">
              {sent ? (
                <>
                  <StandingDot tone={sent.tone} />
                  <span className="min-w-0">
                    <span className="font-medium">Version {sent.version}</span> <span className="text-muted-foreground">· {sent.day}</span>
                    <span className="block text-xs text-muted-foreground">{sent.standing}</span>
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Nothing yet</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <ItemCardTools bare primary itemId={id} kind={kind} title={title} initial={card} />
          <UpdateButton name={slug} kind={kind} title={title} direct={direct} />
          <AuthorsButton itemId={id} title={title} />
        </div>
      </div>
    </article>
  );
}
