import { AppPage } from '@/components/app-shell/app-page';
import { MINE_TABS, MineView, type MineTab } from '@/components/app-shell/mine';
import { mine } from '@/lib/app-shell/member';
import { getAppItems, getMemberActivity, getSpaces } from '@/lib/app-shell/member-data';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata = { title: 'Mine · MediaMake' };

/**
 * /app/mine, one tab each (`?tab=` opens one): what the member installed,
 * what is theirs, what their projects have, what members shared with them
 * and the other skills their computers reported, with a warning on anything
 * installed that is failed right now.
 */
export default async function MinePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { clientId } = await getAppViewer();
  if (!clientId) return null;
  const [items, activity, spaces] = await Promise.all([getAppItems(clientId), getMemberActivity(clientId), getSpaces(clientId)]);

  return (
    <AppPage title="Mine">
      <MineView mine={mine(items, activity)} spaces={spaces} tab={MINE_TABS.find(name => name === tab) as MineTab | undefined} />
    </AppPage>
  );
}
