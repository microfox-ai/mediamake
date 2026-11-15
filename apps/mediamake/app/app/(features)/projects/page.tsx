import Link from 'next/link';
import { AppPage } from '@/components/app-shell/app-page';
import { ProjectsPage } from '@/components/projects/projects-page';
import { canUseCloudProjects } from '@/lib/access';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { FEATURE_TIERS, tierLabel } from '@/lib/memberships/tiers';

export const metadata = { title: 'Projects · MediaMake' };

/**
 * /app/projects: cloud projects, for Plus members and above (the same rule
 * the project APIs apply, canUseCloudProjects). Everyone else sees what the
 * page is and how to get it.
 */
export default async function AppProjectsPage() {
  const { tier } = await getAppViewer();
  if (canUseCloudProjects(tier)) return <ProjectsPage />;

  const needed = tierLabel(FEATURE_TIERS.cloudProjects);
  return (
    <AppPage title="Projects">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10 lg:px-6">
        <p className="w-fit rounded-md border px-2 py-0.5 text-xs font-medium">{needed} and above</p>
        <h2 className="text-xl font-semibold">Your projects, kept in the cloud</h2>
        <p className="text-sm text-muted-foreground">
          Projects keeps your productions, brand kits and song takes on MediaMake, so they follow you to every computer
          and can be shared with your team. Your membership is {tierLabel(tier)}, so your work stays on your own
          computer for now, and every skill keeps working there.
        </p>
        <p className="text-sm text-muted-foreground">
          {needed} comes from contributing to MediaMake, or from an admin.{' '}
          <Link href="/app/subscription" className="font-medium text-foreground underline underline-offset-4">
            See your membership
          </Link>
          .
        </p>
      </div>
    </AppPage>
  );
}
