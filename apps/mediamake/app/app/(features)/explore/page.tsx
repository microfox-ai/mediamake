import { AppPage } from '@/components/app-shell/app-page';
import { Explore } from '@/components/app-shell/explore';
import { exploreFiltersFrom } from '@/lib/app-shell/member';
import { categoryInfo, getAppItems } from '@/lib/app-shell/member-data';
import { LIBRARY_HREF, pageOpens } from '@/lib/app-shell/nav';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { RULE } from '@/lib/catalog/types';
import { tierLabel } from '@/lib/memberships/tiers';

export const metadata = { title: 'Explore · MediaMake' };

/**
 * /app/explore: every skill, MCP and app the member's membership opens, with
 * search, kind and category, Beta and membership badges. What a higher
 * membership opens is shown locked, saying which; the cohort's stays out.
 * Failed items are behind a filter, each with its reason; internal skills are
 * never listed. Collections (the Cloud Library) only for those it opens for.
 */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { clientId, tier } = await getAppViewer();
  if (!clientId) return null;
  const [items, params] = await Promise.all([getAppItems(clientId), searchParams]);

  return (
    <AppPage title="Explore">
      <Explore items={items} categories={categoryInfo()} initial={exploreFiltersFrom(params)} rule={RULE} membership={tierLabel(tier)} libraryOpen={pageOpens(tier, LIBRARY_HREF)} />
    </AppPage>
  );
}
