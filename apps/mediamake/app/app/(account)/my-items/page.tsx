import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';
import { AppPage } from '@/components/app-shell/app-page';
import { PublishButton, PublishSteps } from '@/components/my-items/item-tools';
import { StandingDot, StoreItemCard, type SentTone, type StoreItemRow } from '@/components/my-items/store-item-card';
import { getEntitlements } from '@/lib/access';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { listCatalog, type CatalogEntry } from '@/lib/catalog';
import type { AuthorShown } from '@/lib/catalog/authors';
import { getCatalogRecord } from '@/lib/catalog/records';
import { catalogListingDB } from '@/lib/catalog/store';
import { CONTRIBUTION_MONTHS } from '@/lib/memberships/membership';
import { itemsAuthoredBy, shownAuthors } from '@/lib/submissions/authors';
import { submissionsDB } from '@/lib/submissions/store';
import { standing, updatesDirectly, type Submission } from '@/lib/submissions/submission';

export const metadata = { title: 'My store items · MediaMake' };

const KIND: Record<string, string> = { skill: 'Skill', mcp: 'MCP', app: 'App' };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Where a submission stands, as a colour: live, waiting for an admin, needs its author, or over. */
function toneOf(status: Submission['status']): SentTone {
  if (status === 'live' || status === 'approved') return 'good';
  if (status === 'pending') return 'wait';
  if (status === 'changes' || status === 'declined') return 'bad';
  return 'plain';
}

/**
 * /app/my-items: the store items the person is an author of (lib/catalog/authors), each drawn as
 * the store shows it, with what an author does with it: edit its card (description, headshot,
 * icon), send a new version, and change its authors. Below, what they sent that is not in the
 * store yet. An item becomes theirs when a submission of it is accepted, or when one of its
 * authors adds them.
 */
export default async function MyItemsPage() {
  const viewer = await getAppViewer();
  if (!viewer.clientId) return null; // the app's layout sends signed-out visitors to sign in
  const { clientId, tier, isAdmin } = viewer;

  // null: the list could not be read, which is not the same as having none
  const ids = await itemsAuthoredBy(clientId).catch((error): null => {
    console.error('[my-items] Could not read the items this account authors:', error);
    return null;
  });
  const [catalog, submissions] = await Promise.all([
    getEntitlements({ clientId })
      .then(entitlements => listCatalog({ clientId }, undefined, { entitlements, locked: 'show' }))
      .catch((): CatalogEntry[] => []),
    submissionsDB.listFor(clientId, 100).catch((): Submission[] => []),
  ]);
  const direct = updatesDirectly(tier);
  const items = (
    await Promise.all(
      (ids ?? []).map(async (id): Promise<StoreItemRow | null> => {
        const record = await getCatalogRecord(id).catch(() => null);
        if (!record) return null;
        const [listing, authors] = await Promise.all([catalogListingDB.get(id).catch(() => null), shownAuthors(id).catch((): AuthorShown[] => [])]);
        // as the catalog shows it to them (its listing applied); the catalog may leave it out (archived)
        const entry = catalog.find(found => found.id === id);
        const sent = submissions.find(submission => submission.itemId === id);
        return {
          id,
          title: entry?.title ?? record.title,
          description: listing?.description ?? record.summary,
          headshot: listing?.headshot ?? entry?.headshot,
          icon: listing?.icon ?? entry?.icon,
          kindLabel: KIND[record.kind] ?? record.kind,
          level: entry?.readiness ?? record.readiness,
          tier: entry?.tier ?? record.tier ?? 'public',
          version: entry?.version ?? record.version,
          authors,
          ...(sent && { sent: { version: sent.version, standing: standing(sent), day: day(sent.updatedAt), tone: toneOf(sent.status) } }),
          card: { description: listing?.description, summary: record.summary, headshot: listing?.headshot, icon: listing?.icon },
          direct,
        };
      }),
    )
  ).filter((item): item is StoreItemRow => !!item);
  // sent, and not an item of theirs yet: waiting for an admin, or changes asked for
  const waiting = submissions.filter(
    (submission, i) => (submission.status === 'pending' || submission.status === 'changes') && !ids?.includes(submission.itemId) && submissions.findIndex(other => other.itemId === submission.itemId) === i,
  );

  return (
    <AppPage title="My store items">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 max-w-2xl">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight">
              {ids === null ? 'Your items in the store' : items.length === 0 ? 'Nothing of yours is in the store yet' : `${items.length} of your ${items.length === 1 ? 'items is' : 'items are'} in the store`}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {items.length > 0 ? 'Edit how each one shows, send new versions, and change who looks after it.' : 'The skills, MCPs and apps you publish show here, with you as their author.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Link href="/app/releases" className="-ml-3 inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:ml-0">
                Every item, on Releases <ArrowUpRightIcon className="size-3.5" aria-hidden />
              </Link>
            )}
            {items.length > 0 && <PublishButton months={CONTRIBUTION_MONTHS} />}
          </div>
        </header>

        {ids === null && (
          <section role="status" className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">Your items could not be read just now.</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing is lost. Reload the page in a moment.</p>
          </section>
        )}

        {items.map(item => (
          <StoreItemCard key={item.id} item={item} />
        ))}

        {ids !== null && items.length === 0 && (
          <section aria-label="How an item gets into the store" className="grid gap-8 rounded-2xl border bg-card p-6 md:grid-cols-[minmax(0,4fr)_minmax(0,5fr)] lg:p-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold leading-tight tracking-tight">Publish a skill, MCP or app you built</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">It is sent privately. Nothing is public until an admin accepts it, and it enters the store in Beta.</p>
              <p className="text-sm leading-relaxed text-muted-foreground">An author of an item that is already in the store can also add you to it, by the email of your MediaMake account.</p>
            </div>
            <PublishSteps months={CONTRIBUTION_MONTHS} />
          </section>
        )}

        {waiting.length > 0 && (
          <section aria-labelledby="waiting-title" className="flex flex-col gap-3">
            <h2 id="waiting-title" className="text-lg font-semibold leading-tight tracking-tight">
              Sent, not in the store yet
            </h2>
            <ul className="flex flex-col divide-y rounded-2xl border bg-card">
              {waiting.map(submission => (
                <li key={submission.submissionId} className="flex items-start gap-3 px-5 py-4">
                  <StandingDot tone={toneOf(submission.status)} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm font-medium">
                      {submission.title} <span className="font-mono text-xs font-normal text-muted-foreground">{submission.itemId}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{standing(submission)}</p>
                  </div>
                  <p className="shrink-0 text-right text-xs text-muted-foreground">
                    Version {submission.version}
                    <span className="block">{day(submission.updatedAt)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppPage>
  );
}
