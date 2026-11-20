import { redirect } from 'next/navigation';
import { SPACES_HREF, pageOpens } from '@/lib/app-shell/nav';
import { getAppViewer } from '@/lib/app-shell/viewer';

/**
 * Spaces is shown to the cohort and admins only, for now (lib/app-shell/nav). Anyone else who is
 * signed in is sent to Mine, where their own skills, MCPs and apps are. `mm space` and the Spaces
 * MCP keep their own rules (lib/access): this closes the pages, not what a membership opens.
 */
export default async function SpacesLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getAppViewer();
  if (viewer.clientId && !pageOpens(viewer.tier, SPACES_HREF)) redirect('/app/mine');
  return children;
}
