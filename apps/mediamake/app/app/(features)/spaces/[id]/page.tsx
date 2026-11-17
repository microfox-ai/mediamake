import { redirect } from 'next/navigation';
import { AppPage } from '@/components/app-shell/app-page';
import { ProjectDetail } from '@/components/projects/project-detail';
import { canUseCloudProjects } from '@/lib/access';
import { getSpaces } from '@/lib/app-shell/member-data';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata = { title: 'Space · MediaMake' };

/**
 * /app/spaces/<id>: one space, with what it keeps on MediaMake (productions,
 * releases, media), the skills, MCPs and apps made for it, and who can open
 * it. The id is its project's; the personal space's is its own project
 * (lib/projects/personal), with the member's own skills. Plus and above, like
 * the list; the APIs it reads check the membership and the sharing again.
 */
export default async function AppSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, viewer] = await Promise.all([params, getAppViewer()]);
  if (!canUseCloudProjects(viewer.tier)) redirect('/app/spaces');
  const spaces = viewer.clientId ? await getSpaces(viewer.clientId) : null;
  const space = spaces?.personalProjectId === id ? spaces.mine : (spaces?.projects.find(project => project.projectId === id)?.space ?? null);
  return (
    <AppPage title="Spaces">
      <ProjectDetail projectId={id} me={viewer.clientId ?? undefined} oldEditor={viewer.isAdmin} space={space} />
    </AppPage>
  );
}
