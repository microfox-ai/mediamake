import { AppPage } from '@/components/app-shell/app-page';
import { MineView } from '@/components/app-shell/mine';
import { mine } from '@/lib/app-shell/member';
import { getAppItems, getMemberActivity, getSpaces } from '@/lib/app-shell/member-data';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata = { title: 'Mine · MediaMake' };

/**
 * /app/mine: what the member installed, what they and their projects made
 * (their private space and one space per project: each item and whether it
 * is the same on every computer), and the other skills their computers
 * reported, with a warning on anything installed that is failed right now.
 */
export default async function MinePage() {
  const { clientId } = await getAppViewer();
  if (!clientId) return null;
  const [items, activity, spaces] = await Promise.all([getAppItems(clientId), getMemberActivity(clientId), getSpaces(clientId)]);

  return (
    <AppPage title="Mine">
      <MineView mine={mine(items, activity)} spaces={spaces} />
    </AppPage>
  );
}
