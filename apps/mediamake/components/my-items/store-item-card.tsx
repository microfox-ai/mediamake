import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';
import { AuthorsLine } from '@/components/catalog/authors';
import { ItemCardTools, type CardValues } from '@/components/catalog/item-card-editor';
import { AuthorsButton, UpdateButton } from '@/components/my-items/item-tools';
import type { AuthorShown } from '@/lib/catalog/authors';
import { itemPagePath } from '@/lib/catalog/paths';

/**
 * One store item on My store items (app/app/(account)/my-items): how it shows in the store, who its
 * authors are, where the last thing sent for it stands, and what an author does with it.
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
  /** What Edit card starts from: the listing's own values, and the item's own summary. */
  card: CardValues;
  /** The author's updates are published at once (Cohort and admins), not reviewed first. */
  direct: boolean;
}

export function StoreItemCard({ item }: { item: StoreItemRow }) {
  const { id, title, description, headshot, icon, facts, authors, sent, card, direct } = item;
  const [kind, slug] = id.split('/');
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row">
      <div className="relative aspect-video w-full shrink-0 self-start overflow-hidden rounded-xl border bg-muted sm:w-52">
        {headshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={headshot} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground">No headshot yet</span>
        )}
        {icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="absolute bottom-2 left-2 size-9 rounded-lg border bg-background object-cover shadow-sm" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="text-base font-semibold">
            <Link href={itemPagePath(id)} className="underline-offset-4 hover:underline">
              {title}
            </Link>
          </h2>
          <span className="font-mono text-xs text-muted-foreground">{id}</span>
          <Link href={itemPagePath(id)} className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            Its page <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {facts.map(fact => (
            <li key={fact} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {fact}
            </li>
          ))}
        </ul>
        {description && <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>}
        <AuthorsLine authors={authors} />
        {sent && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Last sent:</span> {sent}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-2">
          <ItemCardTools bare itemId={id} kind={kind} title={title} initial={card} />
          <AuthorsButton itemId={id} title={title} />
          <UpdateButton name={slug} kind={kind} title={title} direct={direct} />
        </div>
      </div>
    </section>
  );
}
