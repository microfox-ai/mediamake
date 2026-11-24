import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { AuthorsLine } from '@/components/catalog/authors';
import { ItemIcon } from '@/components/catalog/item-listing';
import { VideoThumb } from '@/components/catalog/video';
import type { AuthorShown } from '@/lib/catalog/authors';
import { cn } from '@/lib/utils';

/**
 * One store item on My store items (app/app/(account)/my-items), as a card: how it shows in the
 * store (its headshot, icon, name and description), who its authors are and where the last thing
 * sent for it stands. All of it opens the item's page for its authors, where everything that is
 * theirs is edited (app/app/(account)/my-items/[kind]/[slug]).
 */
export interface StoreItemRow {
  /** `skill/<name>`, `mcp/<name>` or `app/<name>`. */
  id: string;
  title: string;
  /** What its cards say: its listing's description, else its own summary. */
  description?: string;
  headshot?: string;
  icon?: string;
  /** Its kind, who it opens for, its level and its version, in that order. */
  facts: string[];
  authors: AuthorShown[];
  /** Where the newest thing its author sent stands, in a line. */
  sent?: string;
  /** The page an author edits it on. */
  href: string;
}

export function StoreItemCard({ item }: { item: StoreItemRow }) {
  const { id, title, description, headshot, icon, facts, authors, sent, href } = item;
  const kind = id.split('/')[0];
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
      <div className="relative">
        <VideoThumb id={id} title={title} src={headshot} className="border-b" />
        {kind !== 'skill' && <ItemIcon id={id} title={title} src={icon} className="absolute bottom-3 left-3 size-11 rounded-xl text-base shadow-sm ring-2 ring-background" />}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold leading-snug">
            <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:underline">
              {title}
            </Link>
          </h2>
          <span className="truncate font-mono text-[11px] text-muted-foreground">{id}</span>
        </div>
        <ul className="flex flex-wrap gap-1">
          {facts.map((fact, i) => (
            <li key={fact} className={cn('rounded-md px-1.5 py-0.5 text-[11px]', i === 0 ? 'border font-medium' : 'bg-muted text-muted-foreground')}>
              {fact}
            </li>
          ))}
        </ul>
        {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <AuthorsLine authors={authors} className="relative z-10 truncate" />
          {sent && (
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Last sent:</span> {sent}
            </p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          Edit its listing <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </article>
  );
}
