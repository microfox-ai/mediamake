import { redirect } from 'next/navigation';
import { AppPage } from '@/components/app-shell/app-page';
import { ProjectDetail } from '@/components/projects/project-detail';
import { canUseCloudProjects } from '@/lib/access';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata = { title: 'Project · MediaMake' };

/**
 * /app/projects/<id>: one cloud project, with what it keeps on MediaMake
 * (productions, releases, media) and who can open it. Plus and above, like the list; the APIs it
 * reads check the membership and the project's sharing again.
 */
export default async function AppProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, viewer] = await Promise.all([params, getAppViewer()]);
  if (!canUseCloudProjects(viewer.tier)) redirect('/app/projects');
  return (
    <AppPage title="Projects">
      <ProjectDetail projectId={id} me={viewer.clientId ?? undefined} oldEditor={viewer.isAdmin} />
    </AppPage>
  );
}
