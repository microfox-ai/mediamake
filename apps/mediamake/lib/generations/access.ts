import type { Db } from 'mongodb';
import { canUseCloudProjects, getViewerTier } from '@/lib/access';
import { canWrite, getProjectRole, type ProjectRole } from '@/lib/editor/project-access';

export type GenerationsAccess =
  | { ok: true; role: ProjectRole }
  | { ok: false; status: number; error: string };

/**
 * Who may read or change a project's generations and presets: the brand kit
 * rule. Cloud projects are for community, private and admin users; then the
 * project role decides: anyone it is shared with may read, owners and editors
 * may write.
 */
export async function generationsAccess(db: Db, projectId: string | null, clientId: string | null, mode: 'read' | 'write'): Promise<GenerationsAccess> {
  if (!clientId) return { ok: false, status: 401, error: 'Unauthorized' };
  if (!projectId) return { ok: false, status: 400, error: 'projectId is required' };
  if (process.env.NODE_ENV !== 'development') {
    const tier = await getViewerTier({ clientId });
    if (!canUseCloudProjects(tier)) {
      return { ok: false, status: 403, error: 'Generations on cloud projects need community access or above.' };
    }
  }
  const role = await getProjectRole(db, projectId, clientId);
  if (!role) return { ok: false, status: 404, error: 'Project not found' };
  if (mode === 'write' && !canWrite(role)) return { ok: false, status: 403, error: "Only the owner or an editor can change this project's generations" };
  return { ok: true, role };
}
