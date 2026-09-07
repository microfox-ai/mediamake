import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

/**
 * Returns the role of `clientId` on the given project, or null if the project
 * does not exist, the id is malformed, or the client has no access to it.
 *
 * Shared by every route that reads or writes project-scoped data so that
 * access control stays in one place.
 */
export async function getProjectRole(
  db: Db,
  projectId: string,
  clientId: string
): Promise<ProjectRole | null> {
  try {
    const project = await db
      .collection('projects')
      .findOne({ _id: new ObjectId(projectId) });
    if (!project) return null;
    if (project.clientId === clientId) return 'owner';
    const member = (project.sharedWith ?? []).find(
      (m: { clientId?: string }) => m.clientId === clientId
    );
    return (member?.role as ProjectRole) ?? null;
  } catch {
    return null;
  }
}

/** True when the role may write to the project (owners and editors). */
export function canWrite(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'editor';
}
