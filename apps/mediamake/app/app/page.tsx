import { AppPage } from '@/components/app-shell/app-page';
import { HomeView, type HomeProject } from '@/components/app-shell/home';
import { homeColumns, homeShelf, storefront } from '@/lib/app-shell/member';
import { categoryInfo, getAppItems, getMemberActivity, getSpaces } from '@/lib/app-shell/member-data';
import { SPACES_HREF, pageOpens } from '@/lib/app-shell/nav';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { registry } from '@/lib/skills/registry';

export const metadata = { title: 'Home · MediaMake' };

/**
 * /app: Home, in two columns (components/app-shell/home). The wide one: what is new on the
 * store, then the member's projects and own space as marks, where Spaces open for them (the
 * cohort and admins, for now). The narrow one: their skills as pictures and their MCPs and
 * apps as icons (most used, then installed lately), and a section kept for what comes next.
 */
export default async function AppHomePage() {
  const { clientId, tier } = await getAppViewer();
  // the layout sends signed-out visitors to sign in before any page renders
  if (!clientId) return null;
  const spacesOpen = pageOpens(tier, SPACES_HREF);
  const [items, activity, spaces] = await Promise.all([getAppItems(clientId), getMemberActivity(clientId), spacesOpen ? getSpaces(clientId) : null]);

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
    <AppPage title="Home">
      <HomeView fresh={fresh} projects={projects} skills={homeShelf(columns, ['skill'], 8)} tools={homeShelf(columns, ['mcp', 'app'], 15)} />
    </AppPage>
  );
}
