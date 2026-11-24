import Link from 'next/link';
import { AppPage } from '@/components/app-shell/app-page';
import { RememberTabs } from '@/components/app-shell/item-details';
import { StoreItemCard, type StoreItemRow } from '@/components/my-items/store-item-card';
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEntitlements } from '@/lib/access';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { listCatalog, type CatalogEntry } from '@/lib/catalog';
import { getCatalogRecord } from '@/lib/catalog/records';
import { catalogListingDB } from '@/lib/catalog/store';
import { levelInfo } from '@/lib/catalog/types';
import { tierLabel } from '@/lib/memberships/tiers';
import { authorsOf, itemsAuthoredBy, shownAuthors } from '@/lib/submissions/authors';
import { submissionsDB } from '@/lib/submissions/store';
import { standing, type Submission } from '@/lib/submissions/submission';

export const metadata = { title: 'My store items · MediaMake' };

const KIND: Record<string, string> = { skill: 'Skill', mcp: 'MCP', app: 'App' };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const TABS = ['author', 'co-authored'] as const;
type Tab = (typeof TABS)[number];

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Grid({ items }: { items: StoreItemRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(item => (
        <StoreItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

/**
 * /app/my-items: the store items the person is an author of (lib/catalog/authors), as cards in two
 * tabs: Author, the ones they are the first author of (the sender of its first accepted submission),
 * and Co-authored, the ones an author added them to. A card opens the item's page for its authors
 * (./[kind]/[slug]), where they edit its listing, its authors and send a new version. Below, what
 * they sent that is not in the store yet.
 */
export default async function MyItemsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [viewer, { tab }] = await Promise.all([getAppViewer(), searchParams]);
  if (!viewer.clientId) return null; // the app's layout sends signed-out visitors to sign in
  const { clientId, isAdmin } = viewer;

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
  const items = (
    await Promise.all(
      (ids ?? []).map(async (id): Promise<(StoreItemRow & { first: boolean }) | null> => {
        const record = await getCatalogRecord(id).catch(() => null);
        if (!record) return null;
        const [listing, authors] = await Promise.all([catalogListingDB.get(id).catch(() => null), authorsOf(id).catch(() => [])]);
        const shown = await shownAuthors(id, authors).catch(() => []);
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
            itemTier === 'public' ? 'Public' : `${tierLabel(itemTier)}+`,
            levelInfo(entry?.readiness ?? record.readiness).label,
            ...(version ? [`v${version.replace(/^v/, '')}`] : []),
          ],
          authors: shown,
          ...(sent && { sent: `version ${sent.version} · ${standing(sent)} · ${day(sent.updatedAt)}` }),
          href: `/app/my-items/${id}`,
          // the first author is the one whose submission brought it into the store
          first: !authors.length || authors[0].clientId === clientId,
        };
      }),
    )
  ).filter((item): item is StoreItemRow & { first: boolean } => !!item);
  const own = items.filter(item => item.first);
  const coAuthored = items.filter(item => !item.first);
  const first: Tab = TABS.find(name => name === tab) ?? (own.length || !coAuthored.length ? 'author' : 'co-authored');
  // sent, and not an item of theirs yet: waiting for an admin, or changes asked for
  const waiting = submissions.filter(
    (submission, i) => (submission.status === 'pending' || submission.status === 'changes') && !ids?.includes(submission.itemId) && submissions.findIndex(other => other.itemId === submission.itemId) === i,
  );

  return (
    <AppPage title="My store items">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-6">
        <p className="max-w-3xl text-sm text-muted-foreground">
          The skills, MCPs and apps in the store that you are an author of. Open one to edit its listing (headshot, icon, description, tags, README and screenshots), change its authors and
          send a new version.
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

        {ids === null ? (
          <Card label="Your items">
            <p className="text-sm">Your items could not be read just now. Try again in a moment.</p>
          </Card>
        ) : (
          <RememberTabs defaultValue={first} className="gap-4">
            <TabsList>
              <TabsTrigger value="author" className="flex-none px-3">
                Author <span className="text-xs font-normal tabular-nums text-muted-foreground">{own.length}</span>
              </TabsTrigger>
              <TabsTrigger value="co-authored" className="flex-none px-3">
                Co-authored <span className="text-xs font-normal tabular-nums text-muted-foreground">{coAuthored.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="author">
              {own.length ? (
                <Grid items={own} />
              ) : (
                <Card label="Your items">
                  <p className="text-sm font-medium">Nothing of yours is in the store yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Built a skill, MCP or app and used it for real work? Ask Claude to &ldquo;make this public&rdquo;, or run <code>mm submit &lt;name&gt;</code> in a terminal. It is sent
                    privately with the finished production made with it, an admin reviews it, and once it is accepted it shows here with you as its author.
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="co-authored">
              {coAuthored.length ? (
                <Grid items={coAuthored} />
              ) : (
                <Card label="Co-authored">
                  <p className="text-sm text-muted-foreground">
                    None yet. An author of an item adds you to it by the email of your MediaMake account, and it shows here: you change it as they do.
                  </p>
                </Card>
              )}
            </TabsContent>
          </RememberTabs>
        )}

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
