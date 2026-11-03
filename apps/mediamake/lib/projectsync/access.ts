import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { canUseCloudProjects, getViewerTier } from '@/lib/access';
import { canDelete, canWrite, getProjectRole, type ProjectRole } from '@/lib/editor/project-access';

export type ProjectSyncAccess = { ok: true; role: ProjectRole } | { ok: false; status: number; error: string };

/**
 * Who may use a project's productions, releases and media. They live on cloud projects (community
 * access and above, like brand kits); then the project role decides: anyone the project is shared
 * with reads, owners and editors write, and only the owner deletes.
 */
export async function projectSyncAccess(
  db: Db,
  projectId: string | null | undefined,
  clientId: string | null,
  mode: 'read' | 'write' | 'delete',
): Promise<ProjectSyncAccess> {
  if (!clientId) return { ok: false, status: 401, error: 'Unauthorized' };
  if (!projectId) return { ok: false, status: 400, error: 'projectId is required: productions, releases and media always belong to a project' };
  if (!ObjectId.isValid(projectId)) return { ok: false, status: 400, error: 'projectId is not a project id' };
  if (process.env.NODE_ENV !== 'development') {
    const tier = await getViewerTier({ clientId });
    if (!canUseCloudProjects(tier)) {
      return { ok: false, status: 403, error: 'Cloud projects need community access or above. Public accounts keep their work on their own computer.' };
    }
  }
  const role = await getProjectRole(db, projectId, clientId);
  if (!role) return { ok: false, status: 404, error: 'Project not found' };
  if (mode === 'write' && !canWrite(role)) return { ok: false, status: 403, error: 'You can only read this project: the owner or an editor can add and change things' };
  if (mode === 'delete' && !canDelete(role)) return { ok: false, status: 403, error: "Only the project's owner can delete from it" };
  return { ok: true, role };
}
