import { AppPage } from '@/components/app-shell/app-page';
import { MineView } from '@/components/app-shell/mine';
import { mine } from '@/lib/app-shell/member';
import { getAppItems, getMemberActivity } from '@/lib/app-shell/member-data';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata = { title: 'Mine · MediaMake' };

/**
 * /app/mine: what the member installed, their variants of MediaMake's
 * skills, and the other skills their computers reported (mm and mm-use),
 * with a warning on anything installed that is failed right now.
 */
export default async function MinePage() {
  const { clientId } = await getAppViewer();
  if (!clientId) return null;
  const [items, activity] = await Promise.all([getAppItems(clientId), getMemberActivity(clientId)]);

  return (
    <AppPage title="Mine">
      <MineView mine={mine(items, activity)} />
    </AppPage>
  );
}
