import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowUpRightIcon, BookOpenIcon } from 'lucide-react';
import { DetailsButton } from '@/components/app-shell/item-details';
import { ItemShell } from '@/components/app-shell/item-shell';
import { detailsKey } from '@/lib/app-shell/details-key';
import { AccessActions } from '@/app/(public)/access/access-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AboutCard, ReadmeView } from '@/components/catalog/item-listing';
import { ItemTabs } from '@/components/catalog/item-tabs';
import { ListingScreenshots } from '@/components/catalog/listing';
import { ItemRating } from '@/components/ratings/item-rating';
import { listingBadges } from '@/lib/catalog/listing';
import { itemReadme } from '@/lib/catalog/readme-data';
import { isFailed, proofOf } from '@/lib/catalog/types';
import { tierLabel } from '@/lib/memberships/tiers';
import { ratingsDB } from '@/lib/ratings/store';
import { MadeWithThis } from '@/components/catalog/made-with';
import { ItemFeedback } from '@/components/feedback/item-feedback';
import { MadeByLine, NeedBadge, UsesList } from '@/components/catalog/uses';
import { accessLevel, getEntitlements, getViewer, viewerTier } from '@/lib/access';
import { directoryUrlOf, installPromptFor, isInstallable, toCard, toEntry, type ItemUse } from '@/lib/catalog';
import { itemPagePath } from '@/lib/catalog/paths';
import { getCatalogRecord } from '@/lib/catalog/records';
import { releasesOf } from '@/lib/catalog/releases';
import { itemPath } from '@/lib/catalog/summary';
import { accessRequestsDB, catalogArchiveDB, catalogListingDB, catalogReadinessDB, catalogVideosDB } from '@/lib/catalog/store';
import type { CatalogKind } from '@/lib/catalog/types';
import { registry } from '@/lib/skills/registry';

const KIND_LABEL: Partial<Record<CatalogKind, string>> = { mcp: 'MCP', app: 'App' };
const LIST_TAB: Partial<Record<CatalogKind, { href: string; label: string }>> = {
  mcp: { href: '/?tab=mcps', label: 'All MCPs' },
  app: { href: '/?tab=apps', label: 'All apps' },
};

/** The item as the viewer may see it, or null: for the page and its share preview. */
export async function viewableItem(kind: CatalogKind, slug: string) {
  const id = `${kind}/${slug}`;
  const record = await getCatalogRecord(id).catch(() => null);
  if (!record || record.kind !== kind) return null;
  const viewer = await getViewer();
  const entitlements = await getEntitlements(viewer);
  return { record, viewer, entitlements, entry: toEntry(entitlements, toCard(record)) };
}

/**
 * An MCP's or an app's own page, the link to share, laid out like a skill's (/skills/<name>) as GitHub
 * lays out a repo: on the left its README (a video first, its icon and title, its badges, how to use it)
 * with tabs for what was made with it, its release notes and feedback; on the right a narrow column
 * with what it is, its tags, its rating, how to install or open it, what it works with and the skills
 * that use it, inside the app's sidebar (ItemShell). Who can see it follows the catalog: a locked item goes to its request-access page,
 * and one hidden from the viewer is not found.
 */
export async function CatalogItemPage({ kind, slug }: { kind: 'mcp' | 'app'; slug: string }) {
  const found = await viewableItem(kind, slug);
  if (!found) notFound();
  const { record, viewer, entitlements, entry: item } = found;
  if (item.access === 'locked') {
    if (record.listed === false) notFound();
    redirect(`/access?item=${encodeURIComponent(item.id)}`);
  }

  const [video, archived, readiness, listing, rating, pendingIds] = await Promise.all([
    catalogVideosDB.get(item.id).catch(() => null),
    catalogArchiveDB.get(item.id).catch(() => null),
    catalogReadinessDB.get(item.id).catch(() => null),
    catalogListingDB.get(item.id).catch(() => null),
    ratingsDB.summary(item.id).catch(() => null),
    viewer.clientId ? accessRequestsDB.pendingFor(viewer.clientId).catch((): string[] => []) : Promise.resolve([] as string[]),
  ]);
  // its own tags, then the ones an admin added to its listing
  const tags = [...new Set([...(item.tags ?? []), ...(listing?.tags ?? [])])];
  const installable = isInstallable(record);
  const releases = releasesOf(record.versions, 20);
  const directoryUrl = directoryUrlOf(record.install?.source);
  const here = itemPagePath(item.id);
  const loginHref = `/login?redirectTo=${encodeURIComponent(here)}`;
  // what it works with, named and linked when this viewer can open it
  const uses: (ItemUse & { title?: string; href?: string })[] = await Promise.all(
    (record.install?.uses ?? []).map(async use => {
      const used = await getCatalogRecord(use.id).catch(() => null);
      return used && accessLevel(entitlements, used) !== 'locked' ? { ...use, title: used.title, href: itemPagePath(use.id) } : use;
    }),
  );
  // the repo's skills that work with this MCP
  const usedBy = kind === 'mcp' ? (registry?.skills ?? []).flatMap(skill => skill.mcps?.filter(m => m.id === item.id).map(m => ({ skill, use: m })) ?? []) : [];
  const back = LIST_TAB[kind]!;
  // the frame's sidebar: the app's own when signed in, a Sign in button when not
  const shellViewer = viewer.clientId ? { clientId: viewer.clientId, tier: viewerTier(entitlements), isAdmin: entitlements.isAdmin } : null;

  const proof = proofOf(readiness);
  const ready = proof.length > 0;
  const description = listing?.description ?? item.summary;
  const headshot = listing?.headshot ?? item.headshot ?? video?.thumbnail;
  const tier = item.tier ?? 'public';
  const size = toCard(record).size;
  const failed = isFailed(item);
  // an app that runs in MediaMake opens where it is; it has nothing to install
  const opens = kind === 'app' && item.href && !installable ? item.href : undefined;
  const readme = await itemReadme({
    facts: { kind, name: slug, title: item.title, summary: description, youtubeId: video?.youtubeId, open: opens },
    listingReadme: listing?.readme,
  });
  const made = proof.length + (listing?.media.length ?? 0);

  return (
    <ItemShell viewer={shellViewer} back={back} releasePath={itemPath(item.id)}>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-muted-foreground">
            <span>{KIND_LABEL[kind]}</span>
            <span aria-hidden>/</span>
            <span className="font-semibold text-foreground">{slug}</span>
            {item.visibility !== 'public' && <span className="rounded-full border px-2 py-0.5 font-sans text-[11px]">{item.visibility === 'network' ? 'Community' : 'Private'}</span>}
            {archived && <span className="rounded-full border px-2 py-0.5 font-sans text-[11px]">Archived</span>}
          </p>
          <ItemTabs
            aliases={{ 'made-with-this': 'made', screenshots: 'made', 'v*': 'releases' }}
            tabs={[
              {
                id: 'readme',
                label: 'README',
                content: (
                  <ReadmeView
                    id={item.id}
                    kind={kind}
                    title={item.title}
                    readme={readme}
                    badges={listingBadges({ beta: !ready, failed, tier, version: item.version, size, deps: uses.length })}
                    video={video}
                    headshot={headshot}
                    icon={listing?.icon ?? item.icon}
                  />
                ),
              },
              {
                id: 'made',
                label: 'Made with this',
                count: made,
                content: (
                  <div className="flex flex-col gap-6">
                    <MadeWithThis itemId={item.id} mark={readiness} video={video} />
                    <ListingScreenshots itemId={item.id} media={listing?.media} />
                  </div>
                ),
              },
              ...(releases.length > 0
                ? [
                    {
                      id: 'releases',
                      label: 'Release notes',
                      count: releases.length,
                      content: (
                        <section className="flex flex-col gap-4">
                          <p className="text-xs text-muted-foreground">Installed copies update to the latest version: say &ldquo;update {item.title}&rdquo; to Claude.</p>
                          {releases.map((release, i) => (
                            <section key={release.version} id={`v${release.version}`} className="flex scroll-mt-6 flex-col gap-1.5 rounded-xl border bg-card p-4">
                              <h3 className="flex items-baseline gap-2 text-sm font-semibold">
                                <span className="font-mono">v{release.version}</span>
                                {i === 0 && <Badge variant="secondary">Latest</Badge>}
                                <time dateTime={release.publishedAt} className="text-xs font-normal text-muted-foreground">
                                  {new Date(release.publishedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </time>
                              </h3>
                              <p className="whitespace-pre-line text-sm text-muted-foreground">{release.notes ?? 'No notes for this release.'}</p>
                            </section>
                          ))}
                        </section>
                      ),
                    },
                  ]
                : []),
              { id: 'feedback', label: 'Feedback', content: <ItemFeedback itemId={item.id} title={item.title} version={item.version} /> },
            ]}
          />
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <AboutCard
            kind={kind}
            description={description}
            tags={tags}
            rating={<ItemRating itemId={item.id} title={item.title} version={item.version} initial={item.rating ?? rating} />}
            facts={{ ready, tier: tier === 'public' ? 'Public · open to everyone' : `${tierLabel(tier)} and above`, version: item.version, size, deps: uses.length }}
          >
            {item.madeBy && <MadeByLine madeBy={item.madeBy} />}
            {directoryUrl && (
              <p className="text-xs text-muted-foreground">
                In Claude&apos;s connector directory:{' '}
                <a href={directoryUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
                  {directoryUrl.replace('https://', '')}
                </a>
              </p>
            )}
          </AboutCard>

          <section className="flex flex-col gap-3 border-t pt-5">
            <h2 className="text-sm font-semibold">{kind === 'app' && item.href && !installable ? 'Open' : 'Install'}</h2>
            {kind === 'app' && item.href && (
              <Button asChild>
                <Link href={item.href}>
                  Open {item.title} <ArrowUpRightIcon />
                </Link>
              </Button>
            )}
            {(kind === 'mcp' || installable) && (
              <AccessActions
                itemId={item.id}
                access={item.access}
                hasPackage={record.versions.length > 0}
                signedIn={!!viewer.clientId}
                pending={pendingIds.includes(item.id)}
                installPrompt={installable ? installPromptFor(item.id) : undefined}
                worksWith={uses.length > 0}
                loginHref={loginHref}
              />
            )}
            {kind === 'mcp' && item.href && (
              <Link href={item.href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                <BookOpenIcon className="size-3" /> Step-by-step setup
              </Link>
            )}
          </section>

          {uses.length > 0 && (
            <section className="border-t pt-5">
              <UsesList uses={uses} />
            </section>
          )}

          {usedBy.length > 0 && (
            <section className="flex flex-col gap-1 border-t pt-5">
              <h2 className="text-sm font-semibold">Skills that use it</h2>
              <ul className="divide-y">
                {usedBy.map(({ skill, use }) => (
                  <li key={skill.name} className="flex flex-col gap-1 py-2">
                    <div className="flex items-center gap-2">
                      <DetailsButton detailsKey={detailsKey.catalog(`skill/${skill.name}`)} href={`/skills/${skill.name}`} className="font-mono text-sm font-medium">
                        {skill.name}
                      </DetailsButton>
                      <NeedBadge need={use.need} />
                    </div>
                    <p className="text-xs text-muted-foreground">{use.for}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </main>
    </ItemShell>
  );
}
