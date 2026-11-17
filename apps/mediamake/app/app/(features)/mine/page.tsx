import { AppPage } from '@/components/app-shell/app-page';
import { MINE_TABS, MineView, type MineTab } from '@/components/app-shell/mine';
import { mineDetails } from '@/lib/app-shell/details';
import { lastUsed, mine } from '@/lib/app-shell/member';
import { getAppItems, getMemberActivity, getSpaces, MOST_USED_DAYS } from '@/lib/app-shell/member-data';
import { registry } from '@/lib/skills/registry';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata = { title: 'Mine · MediaMake' };

/**
 * /app/mine, one tab each (`?tab=` opens one): what the member installed
 * (the last used first), what is theirs, what their projects have, what
 * members shared with them and the other skills their computers reported,
 * with a warning on anything installed that is failed right now. Clicking
 * an item opens its details.
 */
export default async function MinePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { clientId } = await getAppViewer();
  if (!clientId) return null;
  const [items, activity, spaces] = await Promise.all([getAppItems(clientId), getMemberActivity(clientId), getSpaces(clientId)]);

  const skills = registry?.skills ?? [];
  const now = Date.now();
  const mineOf = mine(items, activity, skills);

  return (
    <AppPage title="Mine">
      <MineView
        mine={mineOf}
        spaces={spaces}
        tab={MINE_TABS.find(name => name === tab) as MineTab | undefined}
        details={mineDetails(mineOf, spaces, lastUsed(activity, skills), now, MOST_USED_DAYS)}
        now={now}
      />
    </AppPage>
  );
}
