import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRightIcon, BookOpenIcon, LockIcon } from 'lucide-react';
import { ItemShell } from '@/components/app-shell/item-shell';
import { detailsKey } from '@/lib/app-shell/details-key';
import { HeroInstall } from '@/components/catalog/access-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AboutCard, AdviceBanner, ItemHero, ItemMedia, ReadmeView } from '@/components/catalog/item-listing';
import { ItemCardTools } from '@/components/catalog/item-card-editor';
import { ItemTabs } from '@/components/catalog/item-tabs';
import { ListingScreenshots } from '@/components/catalog/listing';
import { ItemRating } from '@/components/ratings/item-rating';
import { listingBadges } from '@/lib/catalog/listing';
import { itemReadme } from '@/lib/catalog/readme-data';
import { isFailed, proofOf } from '@/lib/catalog/types';
import { tierLabel, type MemberTier } from '@/lib/memberships/tiers';
import { ratingsDB } from '@/lib/ratings/store';
import { MadeWithThis } from '@/components/catalog/made-with';
import { ItemFeedback } from '@/components/feedback/item-feedback';
import { MadeByLine } from '@/components/catalog/uses';
import { AuthorsLine } from '@/components/catalog/authors';
import { DependsOn, UsesThis } from '@/components/catalog/skill-details';
import { madeShown } from '@/lib/catalog/made';
import { madeDB } from '@/lib/catalog/made-store';
import { itemUsers, useDependencies } from '@/lib/catalog/skill-profile';
import { accessLevel, getEntitlements, getViewer, viewerTier } from '@/lib/access';
import { directoryUrlOf, installPromptFor, isInstallable, listCatalog, toCard, toEntry, type ItemUse } from '@/lib/catalog';
import { itemPagePath } from '@/lib/catalog/paths';
import { getCatalogRecord } from '@/lib/catalog/records';
import { releasesOf } from '@/lib/catalog/releases';
import { itemPath } from '@/lib/catalog/summary';
import { accessRequestsDB, catalogArchiveDB, catalogListingDB, catalogReadinessDB, catalogVideosDB } from '@/lib/catalog/store';
import type { CatalogKind, Readiness } from '@/lib/catalog/types';
import { registry } from '@/lib/skills/registry';
import { shownAuthors } from '@/lib/submissions/authors';

const KIND_LABEL: Partial<Record<CatalogKind, string>> = { skill: 'Skill', mcp: 'MCP', app: 'App' };
const LIST_TAB: Partial<Record<CatalogKind, { href: string; label: string }>> = {
  skill: { href: '/?tab=skills', label: 'All skills' },
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
 * An MCP's or an app's own page (and a skill's that is not in this repo: third-party, or released by
 * hand), the link to share, laid out like a skill's (/skills/<name>) and like an app store's listing: on
 * top its icon, title, what it is in a line, its badges (its level first) and the install button
 * (ItemHero), a warning when it is not recommended or deprecated (AdviceBanner), then its video or
 * headshot and tabs for its README, what was made with it, its release notes and feedback; on the right
 * a narrow column with what it is, its tags, its rating, what it depends on and what uses it (each a
 * link to that item's page),
 * inside the app's sidebar (ItemShell). Who can see it follows the catalog: a locked item shows only
 * what its card shows and which membership opens it, and one hidden from the viewer is not found.
 */
export async function CatalogItemPage({ kind, slug }: { kind: 'skill' | 'mcp' | 'app'; slug: string }) {
  const found = await viewableItem(kind, slug);
  if (!found) notFound();
  const { record, viewer, entitlements, entry: item } = found;
  const back = LIST_TAB[kind]!;
  // the frame's sidebar: the app's own when signed in, a Sign in button when not
  const shellViewer = viewer.clientId ? { clientId: viewer.clientId, tier: viewerTier(entitlements), isAdmin: entitlements.isAdmin } : null;
  if (item.access === 'locked') {
    if (record.listed === false) notFound();
    return (
      <ItemShell viewer={shellViewer} back={back}>
        <LockedItem kind={kind} slug={slug} title={item.title} summary={item.summary} tier={item.tier} signedIn={!!viewer.clientId} />
      </ItemShell>
    );
  }

  const key = detailsKey.catalog(item.id);
  const [video, archived, readiness, listing, rating, pendingIds, members, authors] = await Promise.all([
    catalogVideosDB.get(item.id).catch(() => null),
    catalogArchiveDB.get(item.id).catch(() => null),
    catalogReadinessDB.get(item.id).catch(() => null),
    catalogListingDB.get(item.id).catch(() => null),
    ratingsDB.summary(item.id).catch(() => null),
    viewer.clientId ? accessRequestsDB.pendingFor(viewer.clientId).catch((): string[] => []) : Promise.resolve([] as string[]),
    madeDB.list(key).then(entries => madeShown(entries, viewer.clientId)).catch(() => []),
    // who looks after it: a GitHub login or a display name, never an email
    item.madeBy ? Promise.resolve([]) : shownAuthors(item.id).catch(() => []),
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
  // what uses it, the other way round: the repo's skills that name it, and the catalog items that work with it
  const usedBy = itemUsers(item.id, await listCatalog(viewer, undefined, { entitlements }).catch(() => []), registry?.skills ?? []);

  const proof = proofOf(readiness);
  // Production is the admin's mark; the productions made with it are shown when there are any
  const level: Readiness = readiness?.readiness === 'ready' ? 'ready' : readiness?.readiness === 'alpha' ? 'alpha' : 'beta';
  // what MediaMake says about using it: its listing's (an admin's), else the one its entry in the repo carries
  const advice = listing?.advice ?? item.advice;
  const adviceNote = listing?.advice ? listing.adviceNote : item.adviceNote;
  const insteadOf = listing?.advice ? listing.insteadOf : item.insteadOf;
  // what to use instead, named and linked when this viewer can open it
  const insteadRecord = advice && insteadOf ? await getCatalogRecord(insteadOf).catch(() => null) : null;
  const instead = insteadRecord ? { title: insteadRecord.title, ...(accessLevel(entitlements, insteadRecord) !== 'locked' && { href: itemPagePath(insteadRecord.id) }) } : undefined;
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
  const made = proof.length + members.length + (listing?.media.length ?? 0);
  const title = readme.title ?? item.title;
  const icon = listing?.icon ?? item.icon;

  return (
    <ItemShell viewer={shellViewer} back={back} releasePath={itemPath(item.id)}>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
          <span>{KIND_LABEL[kind]}</span>
          <span aria-hidden>/</span>
          <span className="text-foreground">{slug}</span>
          {item.visibility !== 'public' && <span className="rounded-full border px-2 py-0.5 font-sans text-[11px]">{item.visibility === 'network' ? 'Community' : 'Private'}</span>}
          {archived && <span className="rounded-full border px-2 py-0.5 font-sans text-[11px]">Archived</span>}
        </p>
        <ItemHero
          id={item.id}
          kind={kind}
          title={title}
          description={description}
          icon={icon}
          badges={listingBadges({ level, advice, failed, tier, version: item.version, size, deps: uses.length })}
          actions={
            <div className="flex flex-col gap-3">
              {kind === 'app' && item.href && (
                <Button asChild className="w-fit">
                  <Link href={item.href}>
                    Open {item.title} <ArrowUpRightIcon />
                  </Link>
                </Button>
              )}
              {(kind === 'mcp' || installable) && (
                <HeroInstall
                  itemId={item.id}
                  title={item.title}
                  access={item.access}
                  hasPackage={record.versions.length > 0}
                  signedIn={!!viewer.clientId}
                  pending={pendingIds.includes(item.id)}
                  installPrompt={installable ? installPromptFor(item.id) : undefined}
                  worksWith={uses.length > 0}
                  loginHref={loginHref}
                />
              )}
            </div>
          }
          footnote={
            kind === 'mcp' && item.href ? (
              <Link href={item.href} className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
                <BookOpenIcon className="size-3" /> Step-by-step setup
              </Link>
            ) : undefined
          }
        />
        <AdviceBanner advice={advice} note={adviceNote} instead={instead} />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            <ItemMedia id={item.id} title={title} readme={readme} video={video} headshot={headshot} />
            <ItemTabs
              aliases={{ 'made-with-this': 'made', screenshots: 'made', 'v*': 'releases' }}
              tabs={[
                {
                  id: 'readme',
                  label: 'README',
                  content: (
                    <ReadmeView id={item.id} kind={kind} title={item.title} readme={readme} badges={[]} header={false} />
                  ),
                },
                {
                  id: 'made',
                  label: 'Made with this',
                  count: made,
                  content: (
                    <div className="flex flex-col gap-6">
                      <MadeWithThis itemId={item.id} itemKey={key} title={item.title} mark={readiness} members={members} loginHref={loginHref} />
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
              tags={tags}
              rating={<ItemRating itemId={item.id} title={item.title} version={item.version} initial={item.rating ?? rating} />}
              facts={{ level, tier: tier === 'public' ? 'Public · open to everyone' : `${tierLabel(tier)} and above`, version: item.version, size, deps: uses.length }}
            >
              {item.madeBy && <MadeByLine madeBy={item.madeBy} />}
              <AuthorsLine authors={authors} />
              {directoryUrl && (
                <p className="text-xs text-muted-foreground">
                  In Claude&apos;s connector directory:{' '}
                  <a href={directoryUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
                    {directoryUrl.replace('https://', '')}
                  </a>
                </p>
              )}
              <ItemCardTools itemId={item.id} kind={kind} title={item.title} />
            </AboutCard>
  
            {uses.length > 0 && (
              <div className="border-t pt-5">
                <DependsOn depends={useDependencies(uses)} />
              </div>
            )}
            {usedBy.length > 0 && (
              <div className="border-t pt-5">
                <UsesThis users={usedBy} />
              </div>
            )}
          </aside>
        </div>
      </main>
    </ItemShell>
  );
}

/** A locked item's page: what its card shows, and which membership opens it. Nothing else of it is sent. */
function LockedItem({ kind, slug, title, summary, tier, signedIn }: { kind: CatalogKind; slug: string; title: string; summary?: string; tier?: MemberTier; signedIn: boolean }) {
  const opensWith = tier && tier !== 'public' ? `a ${tierLabel(tier)} membership` : 'a membership';
  const here = itemPagePath(`${kind}/${slug}`);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <p className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
        <span>{KIND_LABEL[kind]}</span>
        <span aria-hidden>/</span>
        <span className="font-semibold text-foreground">{slug}</span>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {summary && <p className="text-muted-foreground">{summary}</p>}
      <p className="flex items-center gap-1.5 rounded-xl border bg-card p-4 text-sm">
        <LockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          Opens with <span className="font-medium">{opensWith}</span>.{' '}
          {signedIn ? (
            <Link href="/app/subscription" className="underline underline-offset-4">
              How to get it
            </Link>
          ) : (
            <Link href={`/login?redirectTo=${encodeURIComponent(here)}`} className="underline underline-offset-4">
              Sign in
            </Link>
          )}
        </span>
      </p>
    </main>
  );
}
