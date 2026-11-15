import { HomePage } from '@/components/home/home-page';
import { homeTabs, type HomeTab } from '@/components/home/tabs';
import { getViewer } from '@/lib/access';
import { listCatalog } from '@/lib/catalog';
import { skillFacets, skillFiltersFrom } from '@/components/home/skill-filters';
import { registry } from '@/lib/skills/registry';

// Cards depend on who is viewing (private items unlock per viewer).
export const dynamic = 'force-dynamic';

export default async function Homepage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = (homeTabs.find((t) => t.value === tab)?.value ?? 'home') as HomeTab;

  const viewer = await getViewer();
  const cards = await listCatalog(viewer);

  return (
    <HomePage
      cards={cards}
      initialTab={initialTab}
      signedIn={!!viewer.clientId}
      skills={{
        facets: skillFacets(registry?.skills ?? []),
        categories: (registry?.categories ?? []).map(({ id, about, internal }) => ({ id, about, ...(internal && { internal }) })),
        initial: skillFiltersFrom(params),
      }}
    />
  );
}
