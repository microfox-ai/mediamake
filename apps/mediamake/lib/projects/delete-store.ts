import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { BUNDLE_COLLECTION } from '@/lib/projectsync';
import { deleteProjectFiles } from '@/lib/projectsync/storage';
import { deleteRepo } from '@/lib/space/github';
import { githubGrants } from '@/lib/space/github-store';
import type { LinkRecord } from '@/lib/space/links';
import { githubAfterLink } from '@/lib/space/links-store';
import { projectSpaceId, type SpaceRecord } from '@/lib/space/space';
import { deleteRefusal, projectFileKeys, type DeletedSpace, type DeleteRefusal, type RepoChoice, type RepoOutcome } from './delete';
import { PERSONAL_ONLY_YOURS } from './personal';

interface ProjectDoc {
  _id: ObjectId;
  clientId?: string;
  personal?: boolean;
  displayName?: string;
  brandKit?: { assets?: { url?: string }[]; logo?: string };
}

/**
 * Deletes a project space for good (see ./delete), for its owner, who typed its name.
 *
 * The repo comes first: when the owner asked for it to be deleted and GitHub
 * didn't, nothing else is touched, so they can try again or keep it. Then
 * the records, then the stored files (best effort: a file left behind is an
 * orphan nobody can reach), then the repos of the items that were linked to
 * it, so its people lose those too.
 */
export async function deleteSpace(projectId: string, clientId: string, typedName: unknown, repo: RepoChoice): Promise<DeletedSpace | DeleteRefusal> {
  if (!ObjectId.isValid(projectId)) return { status: 400, error: 'That is not a space id' };
  const db = await getDatabase();
  const _id = new ObjectId(projectId);
  const projects = db.collection<ProjectDoc>('projects');
  const project = await projects.findOne({ _id }, { projection: { clientId: 1, personal: 1, displayName: 1, 'brandKit.assets.url': 1, 'brandKit.logo': 1 } });
  const refusal = deleteRefusal(project, clientId, typedName, PERSONAL_ONLY_YOURS);
  if (refusal) return refusal;
  const name = project!.displayName ?? 'Project';
  const spaceId = projectSpaceId(projectId);

  const space = await db.collection<SpaceRecord>('spaces').findOne({ id: spaceId }, { projection: { _id: 0, repo: 1 } });
  let outcome: RepoOutcome = space?.repo ? { state: 'kept', repo: space.repo } : { state: 'none' };
  if (space?.repo && repo === 'delete') {
    const grant = await githubGrants.use(clientId);
    if (!grant) return { status: 409, error: `Connect GitHub to delete ${space.repo} from here, or keep the repo and delete it on GitHub yourself.` };
    const result = await deleteRepo(grant, space.repo);
    if (result.state === 'other-owner') return { status: 409, error: `${space.repo} is under ${result.owner}'s GitHub account, so only they can delete it. Keep the repo to delete the space.` };
    if (result.state === 'failed') return { status: 502, error: result.reason };
    outcome = { state: 'deleted', repo: space.repo };
  }

  const media = await db.collection('mediaFiles').find({ projectId }, { projection: { filePath: 1 } }).toArray();
  const keys = projectFileKeys(projectId, [...media.map(file => file.filePath as string | undefined), ...(project!.brandKit?.assets ?? []).map(asset => asset.url), project!.brandKit?.logo], process.env.SPACES_BUCKET);
  const linked = (await db.collection<LinkRecord>('space_links').find({ 'projects.id': projectId }, { projection: { _id: 0 } }).toArray()) as LinkRecord[];

  // the project itself first: once it is gone nobody can open the rest
  const gone = await projects.deleteOne({ _id, clientId, personal: { $ne: true } });
  if (!gone.deletedCount) return { status: 404, error: 'Space not found' };
  await Promise.all([
    db.collection('spaces').deleteOne({ id: spaceId }),
    db.collection('space_items').deleteMany({ space: spaceId }),
    db.collection('todos').deleteMany({ project: projectId }),
    db.collection('runs').deleteMany({ project: projectId }),
    db.collection('places').updateMany({ projects: projectId }, { $pull: { projects: projectId } } as never),
    db.collection('space_links').updateMany({ 'projects.id': projectId }, { $pull: { projects: { id: projectId } }, $set: { updatedAt: new Date().toISOString() } } as never),
    db.collection('mediaFiles').deleteMany({ projectId }),
    db.collection('timelines').deleteMany({ projectId }),
    ...Object.values(BUNDLE_COLLECTION).map(collection => db.collection(collection).deleteMany({ projectId })),
  ]);

  await deleteProjectFiles(projectId, keys);
  await Promise.all(linked.map(link => githubAfterLink({ ...link, projects: link.projects.filter(entry => entry.id !== projectId) })));
  return { deleted: true, name, repo: outcome, unlinked: linked.length };
}
