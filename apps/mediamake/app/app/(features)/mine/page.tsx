import { AppPage } from '@/components/app-shell/app-page';
import { MINE_TABS, MineView, type MineTab } from '@/components/app-shell/mine';
import { mine } from '@/lib/app-shell/member';
import { getAppItems, getMemberActivity, getSpaces } from '@/lib/app-shell/member-data';
import { registry } from '@/lib/skills/registry';
import { SPACES_HREF, pageOpens } from '@/lib/app-shell/nav';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata = { title: 'My Items · MediaMake' };

/**
 * /app/mine, My Items (it was Mine), one tab each (`?tab=` opens one): what the member installed
 * (the last used first), what is theirs, what their projects have, what
 * members shared with them and the other skills their computers reported,
 * with a warning on anything installed that is failed right now. Clicking
 * an item opens its page (/app/item), whose breadcrumb leads back to the tab.
 */
export default async function MinePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { clientId, tier } = await getAppViewer();
  if (!clientId) return null;
  const [items, activity, spaces] = await Promise.all([getAppItems(clientId), getMemberActivity(clientId), getSpaces(clientId)]);

  const skills = registry?.skills ?? [];
  const now = Date.now();
  const mineOf = mine(items, activity, skills);

  return (
    <AppPage title="My Items">
      <MineView mine={mineOf} spaces={spaces} spacesOpen={pageOpens(tier, SPACES_HREF)} tab={MINE_TABS.find(name => name === tab) as MineTab | undefined} now={now} />
    </AppPage>
  );
}
