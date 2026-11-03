import Link from 'next/link';
import { accessLevel, getEntitlements, getViewer } from '@/lib/access';
import { VIDEO_KINDS, directoryUrlOf, installPromptFor, isInstallable, mcpRunsOf, slugOf, toCard, toEntry, withHealth, type CatalogEntry, type CatalogItemRecord, type CatalogVideo, type HealthMark, type McpRuns, type UseShown } from '@/lib/catalog';
import { getCatalogRecord } from '@/lib/catalog/records';
import { releasesOf, type Release } from '@/lib/catalog/releases';
import { accessRequestsDB, catalogArchiveDB, catalogHealthDB, catalogVideosDB } from '@/lib/catalog/store';
import { watchPath } from '@/lib/catalog/video';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MadeByLine, UsesList } from '@/components/catalog/uses';
import { HealthBadge, HEALTH } from '@/components/catalog/health';
import { OldBadge, RunsBadges } from '@/components/catalog/runs';
import { VideoThumb, YouTubeEmbed } from '@/components/catalog/video';
import { AccessActions, RedeemInvite } from './access-actions';

export const dynamic = 'force-dynamic';

/**
 * /access?item=skill/lyric-video  — install or download one item you have access to,
 *                                   and watch its video (a skill's intro, a tutorial).
 * /access?code=XXXX               — redeem an invite someone shared with you.
 */
export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; code?: string }>;
}) {
  const { item: itemId, code } = await searchParams;
  const viewer = await getViewer();
  const here = `/access?${new URLSearchParams({ ...(itemId ? { item: itemId } : {}), ...(code ? { code } : {}) })}`;
  const loginHref = `/login?redirectTo=${encodeURIComponent(here)}`;

  let item: CatalogEntry | null = null;
  let releases: Release[] = [];
  let installable = false;
  let hasPackage = false;
  let uses: UseShown[] = [];
  let runs: McpRuns[] = [];
  // the item to use first when this one is an old alternative, named and linked when this viewer can open it
  let preferred: { id: string; title?: string; href?: string } | undefined;
  let archived = false;
  let pending = false;
  let directoryUrl: string | undefined;
  let video: CatalogVideo | null = null;
  if (itemId) {
    // the database's record, else one the repo defines (a registry skill, a third-party MCP), with an MCP's health
    const [fetched, mark, found, healthMarks] = await Promise.all([
      getCatalogRecord(itemId),
      catalogArchiveDB.get(itemId).catch(() => null),
      catalogVideosDB.get(itemId).catch(() => null),
      catalogHealthDB.list().catch((): HealthMark[] => []),
    ]);
    const healthy = (r: CatalogItemRecord) => withHealth([r], healthMarks)[0];
    const record = fetched && healthy(fetched);
    archived = !!mark;
    if (record) {
      const entitlements = await getEntitlements(viewer);
      const entry = toEntry(entitlements, toCard(record));
      // Locked items are hidden: answer as if they don't exist.
      if (entry.access !== 'locked') {
        item = entry;
        video = found;
        releases = releasesOf(record.versions, 20);
        installable = isInstallable(record);
        directoryUrl = directoryUrlOf(record.install?.source);
        hasPackage = record.versions.length > 0;
        runs = mcpRunsOf(record);
        // what it works with, named and linked when this viewer can open it, with where each one runs
        uses = await Promise.all(
          (record.install?.uses ?? []).map(async use => {
            const fetchedUse = await getCatalogRecord(use.id);
            if (!fetchedUse) return use;
            const used = healthy(fetchedUse);
            const shown = { ...use, runs: mcpRunsOf(used), alternativeTo: used.alternativeTo, health: used.health };
            return accessLevel(entitlements, used) !== 'locked'
              ? { ...shown, title: used.title, href: `/access?item=${encodeURIComponent(use.id)}` }
              : shown;
          }),
        );
        if (record.alternativeTo) {
          const first = await getCatalogRecord(record.alternativeTo);
          preferred =
            first && accessLevel(entitlements, first) !== 'locked'
              ? { id: first.id, title: first.title, href: `/access?item=${encodeURIComponent(first.id)}` }
              : { id: record.alternativeTo };
        }
      }
      if (item?.access === 'locked' && viewer.clientId) {
        pending = (await accessRequestsDB.pendingFor(viewer.clientId).catch((): string[] => [])).includes(record.id);
      }
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← MediaMake
        </Link>

        {itemId && !item && (
          <Card>
            <CardHeader>
              <CardTitle>Not found</CardTitle>
              <CardDescription>
                There is no item called {itemId}, or it is not shared with you.
                {!viewer.clientId && (
                  <>
                    {' '}If someone shared it with you, <Link href={loginHref} className="underline">sign in</Link> first.
                  </>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {item && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={item.kind === 'mcp' ? 'uppercase' : 'capitalize'}>{item.kind}</Badge>
                <RunsBadges runs={runs} />
                {preferred && <OldBadge to={preferred.title ?? slugOf(preferred.id)} />}
                <HealthBadge health={item.health} note={item.healthNote} />
                {item.visibility !== 'public' && (
                  <Badge variant="secondary">{item.visibility === 'network' ? 'Community' : 'Private'}</Badge>
                )}
                {archived && (
                  <Badge variant="secondary" title="Not in use any more: left off the homepage, still installs">
                    Archived
                  </Badge>
                )}
                {item.version && (
                  <span className="font-mono text-xs text-muted-foreground" title="Latest release">
                    v{item.version}
                  </span>
                )}
              </div>
              <CardTitle className="text-2xl">{item.title}</CardTitle>
              {item.summary && <CardDescription>{item.summary}</CardDescription>}
              {item.madeBy && <MadeByLine madeBy={item.madeBy} />}
              {item.health && item.health !== 'healthy' && item.healthNote && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{HEALTH[item.health].label}:</span> {item.healthNote}
                </p>
              )}
              {preferred && (
                <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                  <span className="font-medium">Old, an alternative only.</span> Use{' '}
                  {preferred.href ? (
                    <Link href={preferred.href} className="font-medium underline underline-offset-2">
                      {preferred.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{slugOf(preferred.id)}</span>
                  )}{' '}
                  first; add this one only for what that one can&apos;t do.
                </p>
              )}
              {directoryUrl && (
                <p className="text-xs text-muted-foreground">
                  In Claude&apos;s connector directory:{' '}
                  <a href={directoryUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
                    {directoryUrl.replace('https://', '')}
                  </a>
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {video && <ItemVideoSection itemId={item.id} kind={item.kind} video={video} />}
              {uses.length > 0 && <UsesList uses={uses} />}
              {/* a tutorial or course is its video: nothing to install */}
              {!(VIDEO_KINDS.includes(item.kind) && !installable) && (
                <AccessActions
                  itemId={item.id}
                  access={item.access}
                  hasPackage={hasPackage}
                  signedIn={!!viewer.clientId}
                  pending={pending}
                  installPrompt={installable ? installPromptFor(item.id) : undefined}
                  worksWith={uses.length > 0}
                  loginHref={loginHref}
                />
              )}
            </CardContent>
          </Card>
        )}

        {item && releases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Release notes</CardTitle>
              <CardDescription>
                Installed copies update to the latest version: say &ldquo;update {item.title}&rdquo; to Claude.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {releases.map((release, i) => (
                <section key={release.version} className="flex flex-col gap-1.5">
                  <h3 className="flex items-baseline gap-2 text-sm font-semibold">
                    <span className="font-mono">v{release.version}</span>
                    {i === 0 && <Badge variant="secondary">Latest</Badge>}
                    <time dateTime={release.publishedAt} className="text-xs font-normal text-muted-foreground">
                      {new Date(release.publishedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </time>
                  </h3>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {release.notes ?? 'No notes for this release.'}
                  </p>
                </section>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Have an invite code?</CardTitle>
            <CardDescription>Redeem it to unlock what was shared with you.</CardDescription>
          </CardHeader>
          <CardContent>
            <RedeemInvite initialCode={code ?? ''} signedIn={!!viewer.clientId} loginHref={loginHref} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

/**
 * The item's video on its page: a skill's intro or a tutorial plays here; a
 * course plays its lessons in order on its own page.
 */
function ItemVideoSection({ itemId, kind, video }: { itemId: string; kind: CatalogEntry['kind']; video: CatalogVideo }) {
  if (kind === 'course') {
    const lessons = video.lessons?.length ?? 0;
    return (
      <section className="flex flex-col gap-3">
        <a href={watchPath(itemId)} className="block overflow-hidden rounded-xl border">
          <VideoThumb id={itemId} title={video.title} src={video.thumbnail} />
        </a>
        <Button asChild className="w-fit">
          <a href={watchPath(itemId)}>
            Watch the course · {lessons} lesson{lessons === 1 ? '' : 's'}
          </a>
        </Button>
      </section>
    );
  }
  if (!video.youtubeId) return null;
  // an intro has words of its own; a tutorial's title and first paragraph are its card's, shown above
  const intro = kind !== 'tutorial';
  const description = intro ? video.description : video.description.trim().split(/\n\s*\n/).slice(1).join('\n\n');
  return (
    <section className="flex flex-col gap-2">
      <YouTubeEmbed youtubeId={video.youtubeId} title={video.title} />
      {intro && <h3 className="pt-1 text-sm font-semibold">{video.title}</h3>}
      {description && <p className="whitespace-pre-line text-sm text-muted-foreground">{description}</p>}
    </section>
  );
}
