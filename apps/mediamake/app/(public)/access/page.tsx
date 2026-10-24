import Link from 'next/link';
import { getEntitlements, getViewer } from '@/lib/access';
import { toCard, toEntry, type CatalogEntry } from '@/lib/catalog';
import { accessRequestsDB, catalogItemsDB } from '@/lib/catalog/store';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessActions, RedeemInvite } from './access-actions';

export const dynamic = 'force-dynamic';

/**
 * /access?item=skill/lyric-video  — open, download, or ask for one item.
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
  let pending = false;
  if (itemId) {
    const record = await catalogItemsDB.get(itemId).catch(() => null);
    if (record) {
      const entry = toEntry(await getEntitlements(viewer), toCard(record));
      if (entry.access !== 'locked' || record.listed !== false) item = entry;
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
              <CardDescription>There is no item called {itemId}, or it is not shared yet.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {item && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{item.kind}</Badge>
                {item.visibility !== 'public' && (
                  <Badge variant="secondary">{item.visibility === 'network' ? 'Network' : 'Private'}</Badge>
                )}
                {item.version && <span className="text-xs text-muted-foreground">v{item.version}</span>}
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
                loginHref={loginHref}
              />
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
