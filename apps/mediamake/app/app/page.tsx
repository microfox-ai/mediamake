import { AppPage } from '@/components/app-shell/app-page';
import { HomeColumns } from '@/components/app-shell/home-columns';
import { homeColumns } from '@/lib/app-shell/member';
import { MOST_USED_DAYS, getAppItems, getMemberActivity } from '@/lib/app-shell/member-data';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { registry } from '@/lib/skills/registry';

export const metadata = { title: 'Home · MediaMake' };

/**
 * /app: Home. Three columns, Skills, MCPs and Apps: in each, what the member
 * uses most (lib/usage), then what they installed lately, with open, copy
 * install prompt and update on every row.
 */
export default async function AppHomePage() {
  const { clientId } = await getAppViewer();
  // the layout sends signed-out visitors to sign in before any page renders
  if (!clientId) return null;
  const [items, activity] = await Promise.all([getAppItems(clientId), getMemberActivity(clientId)]);

  return (
    <AppPage title="Home">
      <div className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <p className="text-sm text-muted-foreground">What you use most, then what you installed lately. Click a name for its details.</p>
        <HomeColumns columns={homeColumns(items, activity, registry?.skills ?? [])} days={MOST_USED_DAYS} />
      </div>
    </AppPage>
  );
}
