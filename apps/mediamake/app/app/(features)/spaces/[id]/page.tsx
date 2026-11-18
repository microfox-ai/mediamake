import { redirect } from 'next/navigation';
import { AppPage } from '@/components/app-shell/app-page';
import { ProjectDetail } from '@/components/projects/project-detail';
import { canUseCloudProjects } from '@/lib/access';
import { getSpaces } from '@/lib/app-shell/member-data';
import { getAppViewer } from '@/lib/app-shell/viewer';
import { storageHost } from '@/lib/projectsync/storage';
import { readmeAbout, readmeHtml } from '@/lib/space/readme';
import { spaceDB } from '@/lib/space/store';

export const metadata = { title: 'Space · MediaMake' };

/**
 * /app/spaces/<id>: one space, with its code (its repo as its computers
 * reported it, the README made into HTML here), what it keeps on MediaMake
 * (productions, releases, media), the skills, MCPs and apps made for it, and
 * who can open it. The id is its project's; the personal space's is its own project
 * (lib/projects/personal), with the member's own skills. Plus and above, like
 * the list; the APIs it reads check the membership and the sharing again.
 */
export default async function AppSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, viewer] = await Promise.all([params, getAppViewer()]);
  if (!canUseCloudProjects(viewer.tier)) redirect('/app/spaces');
  const spaces = viewer.clientId ? await getSpaces(viewer.clientId) : null;
  const personal = spaces?.personalProjectId === id;
  const space = personal ? spaces!.mine : (spaces?.projects.find(project => project.projectId === id)?.space ?? null);
  // the items linked to this project from members' spaces; on the personal space, the member's own linked items
  const linked = (spaces?.linked ?? []).filter(item => (personal ? item.role === 'owner' : item.projects.some(project => project.id === id)));
  const linkTargets = (spaces?.projects ?? []).filter(project => project.role !== 'viewer').map(project => ({ id: project.projectId, name: project.name }));
  // the Code tab: only for a space the lists above say the viewer may open
  const code = space && viewer.clientId ? await spaceDB.code(space.id, viewer.clientId).catch(() => null) : null;
  const readme = code?.readme ? await readmeHtml(code.readme, code.repoUrl, code.branch).catch(() => undefined) : undefined;
  return (
    <AppPage title="Spaces">
      <ProjectDetail
        projectId={id}
        me={viewer.clientId ?? undefined}
        oldEditor={viewer.isAdmin}
        space={space}
        linked={linked}
        linkTargets={linkTargets}
        code={code}
        readmeHtml={readme}
        about={code?.readme ? readmeAbout(code.readme) : undefined}
        storageHost={storageHost()}
      />
    </AppPage>
  );
}
