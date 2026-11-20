import { ProjectsPage } from '@/components/projects/projects-page';
import { getSpaces } from '@/lib/app-shell/member-data';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { tierOpens } from '@/lib/memberships/tiers';

export const metadata = { title: 'Spaces · MediaMake' };

/**
 * /app/spaces: MediaMake Spaces. A personal space for the skills, MCPs and apps a member made
 * (lib/space) and the files they keep, and project spaces shared with a team, with their storage
 * of its cap (lib/projects/storage). The page is shown to the cohort and admins only, for now:
 * ./layout.tsx sends everyone else to Mine. What a membership opens outside the page (`mm space`,
 * the Spaces MCP, the project APIs: lib/access) is unchanged.
 */
export default async function AppSpacesPage() {
  const { tier, isAdmin, clientId } = await getAppViewer();
  const spaces = clientId ? await getSpaces(clientId) : null;
  // the Spaces MCP, which moves a space's files from a computer, opens at Plus, like files in a space
  return <ProjectsPage isAdmin={isAdmin} canSync={tierOpens(tier, 'plus')} mySpace={spaces?.mine ?? null} />;
}
