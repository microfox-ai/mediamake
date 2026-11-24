import type { Metadata } from 'next';
import { HomePage } from '@/components/home/home-page';
import { Landing } from '@/components/home/landing/landing';
import { homeShelf } from '@/components/home/landing/shelf';
import { homeTabs, type HomeTab } from '@/components/home/tabs';
import { getViewer } from '@/lib/access';
import { listCatalog } from '@/lib/catalog';
import { skillFacets, skillFiltersFrom } from '@/components/home/skill-filters';
import { registry } from '@/lib/skills/registry';

// Cards depend on who is viewing (private items unlock per viewer).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MediaMake · The open-source AI store for solo creators',
  description:
    'A suite of skills, MCPs and apps you drive from Claude Code, Codex or Antigravity. Say what you want made, and review every result before it is final.',
};

/**
 * `/` is the homepage, a scroll story (Landing). `/?tab=mcps|skills|apps|tutorials` is the store,
 * one tab a kind (HomePage).
 */
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

  if (initialTab === 'home') return <Landing {...homeShelf(cards)} />;

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
