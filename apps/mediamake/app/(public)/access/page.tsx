import Link from 'next/link';
import { getEntitlements, getViewer } from '@/lib/access';
import { installPromptFor, toCard, toEntry, type CatalogEntry } from '@/lib/catalog';
import { releasesOf, type Release } from '@/lib/catalog/releases';
import { accessRequestsDB, catalogItemsDB } from '@/lib/catalog/store';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessActions, RedeemInvite } from './access-actions';

export const dynamic = 'force-dynamic';

/**
 * /access?item=skill/lyric-video  — install or download one item you have access to.
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
  let pending = false;
  if (itemId) {
    const record = await catalogItemsDB.get(itemId).catch(() => null);
    if (record) {
      const entry = toEntry(await getEntitlements(viewer), toCard(record));
      // Locked items are hidden: answer as if they don't exist.
      if (entry.access !== 'locked') {
        item = entry;
        releases = releasesOf(record.versions, 20);
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
                <Badge variant="outline" className="capitalize">{item.kind}</Badge>
                {item.visibility !== 'public' && (
                  <Badge variant="secondary">{item.visibility === 'network' ? 'Community' : 'Private'}</Badge>
                )}
                {item.version && (
                  <span className="font-mono text-xs text-muted-foreground" title="Latest release">
                    v{item.version}
                  </span>
                )}
              </div>
              <CardTitle className="text-2xl">{item.title}</CardTitle>
              {item.summary && <CardDescription>{item.summary}</CardDescription>}
            </CardHeader>
            <CardContent>
              <AccessActions
                itemId={item.id}
                access={item.access}
                hasPackage={!!item.version}
                signedIn={!!viewer.clientId}
                pending={pending}
                installPrompt={item.version ? installPromptFor(item.id) : undefined}
                loginHref={loginHref}
              />
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
