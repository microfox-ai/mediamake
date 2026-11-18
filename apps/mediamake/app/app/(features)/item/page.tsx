import Link from 'next/link';
import { AppPage } from '@/components/app-shell/app-page';
import { ItemView } from '@/components/app-shell/item-details';
import { itemDetailsFor } from '@/lib/app-shell/details-data';
import { backPath, itemCrumbs } from '@/lib/app-shell/item-page';
import { getAppViewer } from '@/lib/app-shell/viewer';

/**
 * /app/item?key=<details key>&from=<the page it was opened from>
 *
 * One page for every skill, MCP and app the member can see, private or public:
 * a store item (`catalog:`), one in a space (`space:`), a linked one (`linked:`)
 * or one only on their computers (`local:`). Laid out as a space's Code tab
 * (components/app-shell/item-details ItemView), with a breadcrumb back to
 * where it was opened (lib/app-shell/item-page).
 */
export const metadata = { title: 'Item · MediaMake' };

const KEY = /^(catalog|space|linked|local):[\w:./@ -]{1,300}$/;

export default async function ItemPage({ searchParams }: { searchParams: Promise<{ key?: string; from?: string }> }) {
  const { key, from } = await searchParams;
  const { clientId } = await getAppViewer();
  if (!clientId) return null;
  const item = key && KEY.test(key) ? await itemDetailsFor({ clientId }, key).catch(() => null) : null;
  if (!key || !item) {
    const back = backPath(from) ?? '/app/mine';
    return (
      <AppPage title="Not found">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-10 lg:px-6">
          <p className="text-sm text-muted-foreground">That skill, MCP or app isn&apos;t listed for you any more.</p>
          <Link href={back} className="text-sm font-medium underline underline-offset-4">
            Go back
          </Link>
        </div>
      </AppPage>
    );
  }
  const crumbs = itemCrumbs(from, item);
  // the title bar names where it was opened (Mine, Spaces…), like that page's; the breadcrumb names the item
  const place = crumbs.length > 1 && crumbs[0].label !== 'Back' ? crumbs[0].label : item.title;
  return (
    <AppPage title={place}>
      <ItemView itemKey={key} item={item} crumbs={crumbs} />
    </AppPage>
  );
}
