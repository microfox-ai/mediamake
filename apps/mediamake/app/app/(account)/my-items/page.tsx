import Link from 'next/link';
import { AppPage } from '@/components/app-shell/app-page';
import { StoreItemCard, type StoreItemRow } from '@/components/my-items/store-item-card';
import { getEntitlements } from '@/lib/access';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { listCatalog, type CatalogEntry } from '@/lib/catalog';
import type { AuthorShown } from '@/lib/catalog/authors';
import { getCatalogRecord } from '@/lib/catalog/records';
import { catalogListingDB } from '@/lib/catalog/store';
import { levelInfo } from '@/lib/catalog/types';
import { tierLabel } from '@/lib/memberships/tiers';
import { itemsAuthoredBy, shownAuthors } from '@/lib/submissions/authors';
import { submissionsDB } from '@/lib/submissions/store';
import { standing, updatesDirectly, type Submission } from '@/lib/submissions/submission';

export const metadata = { title: 'My store items · MediaMake' };

const KIND: Record<string, string> = { skill: 'Skill', mcp: 'MCP', app: 'App' };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

/**
 * /app/my-items: the store items the person is an author of (lib/catalog/authors), each with what an
 * author does with it: edit its card (description, headshot, icon), change its authors, and send a
 * new version. Below, what they sent that is not in the store yet. An item becomes theirs when a
 * submission of it is accepted, or when one of its authors adds them.
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
        const itemTier = entry?.tier ?? record.tier ?? 'public';
        const version = entry?.version ?? record.version;
        return {
          id,
          title: entry?.title ?? record.title,
          description: listing?.description ?? record.summary,
          headshot: listing?.headshot ?? entry?.headshot,
          icon: listing?.icon ?? entry?.icon,
          facts: [
            KIND[record.kind] ?? record.kind,
            itemTier === 'public' ? 'Public' : `${tierLabel(itemTier)} and above`,
            levelInfo(entry?.readiness ?? record.readiness).label,
            ...(version ? [`v${version.replace(/^v/, '')}`] : []),
          ],
          authors,
          ...(sent && { sent: `version ${sent.version} · ${standing(sent)} · ${day(sent.updatedAt)}` }),
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 lg:px-6">
        <p className="text-sm text-muted-foreground">
          The skills, MCPs and apps in the store that you are an author of. Edit how each one shows, change its authors, and send new versions.
          {isAdmin && (
            <>
              {' '}
              As an admin you change every item on{' '}
              <Link href="/app/releases" className="font-medium text-foreground underline underline-offset-2">
                Releases
              </Link>
              .
            </>
          )}
        </p>

        {ids === null && (
          <Card label="Your items">
            <p className="text-sm">Your items could not be read just now. Try again in a moment.</p>
          </Card>
        )}

        {ids !== null && items.length === 0 && (
          <Card label="Your items">
            <p className="text-sm font-medium">Nothing of yours is in the store yet.</p>
            <p className="text-sm text-muted-foreground">
              Built a skill, MCP or app and used it for real work? Ask Claude to &ldquo;make this public&rdquo;, or run <code>mm submit &lt;name&gt;</code> in a terminal. It is sent privately
              with the finished production made with it, an admin reviews it, and once it is accepted it shows here with you as its author.
            </p>
            <p className="text-sm text-muted-foreground">An author of an item can also add you to it, by the email of your MediaMake account.</p>
          </Card>
        )}

        {items.map(item => (
          <StoreItemCard key={item.id} item={item} />
        ))}

        {waiting.length > 0 && (
          <Card label="Sent, not in the store yet">
            <ul className="flex flex-col divide-y">
              {waiting.map(submission => (
                <li key={submission.submissionId} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium">
                    {submission.title}{' '}
                    <span className="font-normal text-muted-foreground">
                      · {submission.itemId}, version {submission.version}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {standing(submission)} · {day(submission.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </AppPage>
  );
}
