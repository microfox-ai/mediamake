import Link from 'next/link';
import { ShieldAlertIcon } from 'lucide-react';
import { AppPage } from '@/components/app-shell/app-page';
import { AuthorItem } from '@/components/my-items/author-item';
import { Button } from '@/components/ui/button';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { LISTED_ITEM } from '@/lib/catalog/author-listing';
import { authorView, itemDetail } from '@/lib/catalog/item-detail';
import { updatesDirectly } from '@/lib/submissions/submission';
import { authorsOf } from '@/lib/submissions/authors';

interface Props {
  params: Promise<{ kind: string; slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { kind, slug } = await params;
  return { title: `${kind}/${slug} · My store items · MediaMake` };
}

function Closed({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShieldAlertIcon className="size-5" />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/app/my-items">My store items</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * /app/my-items/<kind>/<slug>: a store item's page for its authors (components/my-items/author-item),
 * like its release page without what is an admin's. Only its authors and admins open it; an admin
 * changes everything else on /app/releases/<kind>/<slug>.
 */
export default async function MyStoreItemPage({ params }: Props) {
  const [{ kind, slug }, viewer] = await Promise.all([params, getAppViewer()]);
  if (!viewer.clientId) return null; // the app's layout sends signed-out visitors to sign in
  const id = `${kind}/${slug}`;
  if (!LISTED_ITEM.test(id)) {
    return (
      <AppPage title="My store items">
        <Closed title={`No item ${id}`} body="A store item is a skill, an MCP or an app." />
      </AppPage>
    );
  }
  const authors = await authorsOf(id).catch(() => []);
  const index = authors.findIndex(author => author.clientId === viewer.clientId);
  if (index < 0 && !viewer.isAdmin) {
    return (
      <AppPage title="My store items">
        <Closed title="Only its authors" body={`This page is for the authors of ${id}. Its store page names them: ask one to add you by the email of your MediaMake account.`} />
      </AppPage>
    );
  }
  const detail = await itemDetail(id).catch(error => {
    console.error('[my-items] Could not read the item:', error);
    return null;
  });
  if (!detail) {
    return (
      <AppPage title="My store items">
        <Closed title={`No item ${id}`} body="It isn’t in the store. Check the link, or open it from My store items." />
      </AppPage>
    );
  }

  return (
    <AppPage title="My store items">
      <AuthorItem detail={authorView(detail)} role={index === 0 ? 'author' : index > 0 ? 'co-author' : 'admin'} direct={updatesDirectly(viewer.tier)} />
    </AppPage>
  );
}
