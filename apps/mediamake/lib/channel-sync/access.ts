import { ObjectId, type Db } from 'mongodb';
import { canUseCloudProjects, getViewerTier } from '@/lib/access';
import { canWrite, getProjectRole, type ProjectRole } from '@/lib/editor/project-access';

export type ChannelSyncAccess = { ok: true; role: ProjectRole } | { ok: false; status: number; error: string };

/**
 * Who may use a channel's team sync. It lives on cloud projects (community access and above, like
 * brand kits); then the project role decides: anyone the project is shared with pulls, owners and
 * editors push, and only the owner changes the size limit.
 */
export async function channelSyncAccess(db: Db, projectId: string | null, clientId: string | null, mode: 'read' | 'write' | 'owner'): Promise<ChannelSyncAccess> {
  if (!clientId) return { ok: false, status: 401, error: 'Unauthorized' };
  if (!projectId) return { ok: false, status: 400, error: 'projectId is required' };
  if (!ObjectId.isValid(projectId)) return { ok: false, status: 400, error: 'projectId is not a project id' };
  if (process.env.NODE_ENV !== 'development') {
    const tier = await getViewerTier({ clientId });
    if (!canUseCloudProjects(tier)) return { ok: false, status: 403, error: 'Channel sync needs community access or above.' };
  }
  const role = await getProjectRole(db, projectId, clientId);
  if (!role) return { ok: false, status: 404, error: 'Project not found' };
  if (mode === 'write' && !canWrite(role)) return { ok: false, status: 403, error: 'Only the owner or an editor can push to this channel; viewers pull' };
  if (mode === 'owner' && role !== 'owner') return { ok: false, status: 403, error: "Only the project's owner can change the channel's limit" };
  return { ok: true, role };
}
