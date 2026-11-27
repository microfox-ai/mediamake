import { AppPage } from '@/components/app-shell/app-page';
import { HomeView, type HomeProject } from '@/components/app-shell/home';
import { HomeSearch } from '@/components/app-shell/home-feed';
import { homeColumns, homeShelf, storeList, storefront } from '@/lib/app-shell/member';
import { categoryInfo, getAppItems, getMemberActivity, getSpaces } from '@/lib/app-shell/member-data';
import { SPACES_HREF, pageOpens } from '@/lib/app-shell/nav';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { registry } from '@/lib/skills/registry';

export const metadata = { title: 'Home · MediaMake' };

/**
 * /app: Home, in two columns (components/app-shell/home). The wide one: what is new on the
 * store, then the whole store as a list that grows as it is scrolled, searched from the bar
 * beside the title (`?q=`). The narrow one: the member's skills as pictures, their projects and
 * own space as marks, where Spaces open for them (the cohort and admins, for now), and their
 * MCPs and apps as icons (most used, then installed lately). Internal skills are in none of it.
 */
export default async function AppHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { clientId, tier } = await getAppViewer();
  // the layout sends signed-out visitors to sign in before any page renders
  if (!clientId) return null;
  const spacesOpen = pageOpens(tier, SPACES_HREF);
  const [items, activity, spaces] = await Promise.all([getAppItems(clientId), getMemberActivity(clientId), spacesOpen ? getSpaces(clientId) : null]);

  const asked = (await searchParams).q;
  const q = (Array.isArray(asked) ? asked[0] : asked) ?? '';

  const columns = homeColumns(items, activity, registry?.skills ?? [], 12);
  const fresh = storefront(items, categoryInfo(), { rowSize: 6 }).fresh;
  const projects: HomeProject[] | null = spacesOpen
    ? [
        ...(spaces?.personalProjectId ? [{ href: `/app/spaces/${spaces.personalProjectId}`, name: 'Your space', brand: spaces.personalBrand, note: 'Only you' }] : []),
        ...(spaces?.projects ?? []).map(project => ({
          href: `/app/spaces/${project.projectId}`,
          name: project.name,
          brand: project.brand,
          note: project.people > 1 ? `${project.people} people` : 'Only you',
        })),
      ]
    : null;

  return (
    <AppPage title="Home" header={<HomeSearch initial={q} />}>
      <HomeView fresh={fresh} store={storeList(items)} q={q} projects={projects} skills={homeShelf(columns, ['skill'], 8)} tools={homeShelf(columns, ['mcp', 'app'], 15)} />
    </AppPage>
  );
}
