import Link from 'next/link';
import { AppPage } from '@/components/app-shell/app-page';
import { PersonalSpace } from '@/components/projects/personal-space';
import { ProjectsPage } from '@/components/projects/projects-page';
import { SpacesExplainer } from '@/components/projects/spaces-explainer';
import { canUseCloudProjects } from '@/lib/access';
import { getSpaces } from '@/lib/app-shell/member-data';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { FEATURE_TIERS, tierLabel, tierOpens } from '@/lib/memberships/tiers';
import { capsByTier, formatBytes } from '@/lib/projects/storage';

export const metadata = { title: 'Spaces · MediaMake' };

/**
 * /app/spaces: MediaMake Spaces. Every member has a personal space for the
 * skills, MCPs and apps they made (lib/space). Plus members and above also
 * keep files in it and have project spaces, shared with a team (the same
 * rule the project APIs apply, canUseCloudProjects), with their storage of
 * its cap (lib/projects/storage). Everyone else sees their personal space,
 * what project spaces are and how to get them.
 */
export default async function AppSpacesPage() {
  const { tier, isAdmin, clientId } = await getAppViewer();
  const spaces = clientId ? await getSpaces(clientId) : null;
  // the Spaces MCP, which moves a space's files from a computer, opens at Plus, like files in a space
  const canSync = tierOpens(tier, 'plus');
  if (canUseCloudProjects(tier)) return <ProjectsPage isAdmin={isAdmin} canSync={canSync} mySpace={spaces?.mine ?? null} />;

  const needed = tierLabel(FEATURE_TIERS.cloudProjects);
  return (
    <AppPage title="Spaces">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Spaces</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A space keeps everything for one body of work in one place. Your personal space is only yours. A project space is shared with the people you choose.
          </p>
        </div>
        <PersonalSpace space={spaces?.mine ?? null} filesNeed={needed} />
        <div className="flex max-w-2xl flex-col gap-4">
          <p className="w-fit rounded-md border px-2 py-0.5 text-xs font-medium">{needed} and above</p>
          <h2 className="text-xl font-semibold">Project spaces, and your files kept in the cloud</h2>
          <p className="text-sm text-muted-foreground">
            With {needed}, a space also keeps productions, brand kits and song takes on MediaMake, so they follow you to every computer, and you can make project spaces to share with your team. Your membership is{' '}
            {tierLabel(tier)}, so your files stay on your own computer for now, and every skill keeps working there.
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            {[
              ['Productions', "A video's code and renders, picked up on any computer"],
              ['Brand kits', 'Logos, fonts, colours and intros every skill reads'],
              ['Sharing', 'A channel team works from the same space'],
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
        <SpacesExplainer canSync={canSync} />
      </div>
    </AppPage>
  );
}
