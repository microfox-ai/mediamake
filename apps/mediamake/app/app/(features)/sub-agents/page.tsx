import { AgentsView } from '@/components/sub-agents/sub-agents-view';
import { AppPage } from '@/components/app-shell/app-page';
import { agentsDB } from '@/lib/sub-agents/store';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata = { title: 'Sub-agents · MediaMake' };

/**
 * /app/sub-agents: every sub-agent the account ran on its API key, whichever computer or cloud session
 * it ran in (`mm agents` reports each as it works): what it is doing, what it cost, what was said,
 * and a box to answer it, stop it or start another. `?id=ag-…` opens one.
 */
export default async function AgentsPage() {
  const { clientId } = await getAppViewer();
  if (!clientId) return null;
  const initial = await agentsDB.list(clientId).catch(() => null);
  return (
    <AppPage title="Sub-agents">
      <AgentsView initial={initial} />
    </AppPage>
  );
}
