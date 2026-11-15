import Link from 'next/link';
import { AppPage } from '@/components/app-shell/app-page';
import { ProjectsPage } from '@/components/projects/projects-page';
import { canUseCloudProjects } from '@/lib/access';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { FEATURE_TIERS, tierLabel } from '@/lib/memberships/tiers';
import { capsByTier, formatBytes } from '@/lib/projects/storage';

export const metadata = { title: 'Projects · MediaMake' };

/**
 * /app/projects: cloud projects, for Plus members and above (the same rule
 * the project APIs apply, canUseCloudProjects), with the member's storage of
 * its cap (lib/projects/storage). Everyone else sees what the page is and
 * how to get it.
 */
export default async function AppProjectsPage() {
  const { tier, isAdmin } = await getAppViewer();
  if (canUseCloudProjects(tier)) return <ProjectsPage isAdmin={isAdmin} />;

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
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          {[
            ['Productions', "A video's code and renders, picked up on any computer"],
            ['Brand kits', 'Logos, fonts, colours and intros every skill reads'],
            ['Sharing', 'A channel team works from the same project'],
          ].map(([title, about]) => (
            <li key={title} className="rounded-lg border p-3">
              <p className="font-medium">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{about}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Storage comes with the membership:{' '}
          {capsByTier()
            // the cohort and admins stay out of sight of everyone below
            .filter(entry => entry.tier === 'plus' || entry.tier === 'pro')
            .map(entry => `${formatBytes(entry.cap ?? 0)} with ${entry.label}`)
            .join(', ')}
          . An admin can raise it for you.
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
