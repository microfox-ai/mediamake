import { NextRequest, NextResponse } from 'next/server';
import { isValidId, serialize, toObjectId, vcsCommitFilesCol, vcsCommitsCol } from '@/lib/db/collections';
import { ensureVcsIndexes, guardProject, requireClientId } from '../../_lib';

/** GET /api/projects/[projectId]/vcs/commits/[commitId] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; commitId: string }> },
) {
  const { projectId, commitId } = await params;
  const clientId = requireClientId(req);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isValidId(commitId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await ensureVcsIndexes();
  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const commit = await (await vcsCommitsCol()).findOne({ _id: toObjectId(commitId), projectId });
  if (!commit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const changes = await (await vcsCommitFilesCol())
    .find({ projectId, commitId })
    .sort({ fileId: 1 })
    .toArray();
  return NextResponse.json({
    ...serialize(commit),
    changes: changes.map(serialize),
  });
}
