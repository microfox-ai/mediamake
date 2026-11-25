import { redirect } from 'next/navigation';
import { AGENTS_HREF, pageOpens } from '@/lib/app-shell/nav';
import { getAppViewer } from '@/lib/app-shell/viewer';

/**
 * Sub-agents are for the cohort and admins (lib/sub-agents). Anyone else who is signed in is sent to
 * My Items. The API checks the same membership on every call: this closes the page.
 */
export default async function AgentsLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getAppViewer();
  if (viewer.clientId && !pageOpens(viewer.tier, AGENTS_HREF)) redirect('/app/mine');
  return children;
}
