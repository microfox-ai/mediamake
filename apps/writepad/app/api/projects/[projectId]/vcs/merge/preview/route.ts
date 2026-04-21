import { NextRequest, NextResponse } from 'next/server';
import { vcsBranchesCol } from '@/lib/db/collections';
import {
  assertCanEdit,
  ensureMainBranch,
  ensureVcsIndexes,
  findCommonAncestor,
  getBranchSnapshot,
  getSnapshotAtCommit,
  guardProject,
  requireClientId,
} from '../../_lib';
import { buildMergePreview } from '../../_merge';

/** POST /api/projects/[projectId]/vcs/merge/preview */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = requireClientId(req);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureVcsIndexes();
  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!assertCanEdit(project, clientId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { sourceBranch?: string; targetBranch?: string };
  const sourceBranch = body.sourceBranch?.trim();
  const targetBranch = body.targetBranch?.trim();
  if (!sourceBranch || !targetBranch) {
    return NextResponse.json({ error: 'sourceBranch and targetBranch are required' }, { status: 400 });
  }
  if (sourceBranch === targetBranch) {
    return NextResponse.json({ error: 'Cannot merge a branch into itself' }, { status: 400 });
  }
  await ensureMainBranch(projectId, clientId);

  const branchesCol = await vcsBranchesCol();
  const [source, target] = await Promise.all([
    branchesCol.findOne({ projectId, name: sourceBranch }),
    branchesCol.findOne({ projectId, name: targetBranch }),
  ]);
  if (!source || !target) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
  }

  // Find common ancestor for proper 3-way merge
  const [sourceSnapshot, targetSnapshot, ancestorCommitId] = await Promise.all([
    getBranchSnapshot(projectId, sourceBranch),
    getBranchSnapshot(projectId, targetBranch),
    findCommonAncestor(projectId, source.headCommitId, target.headCommitId),
  ]);

  const ancestorSnapshot = ancestorCommitId
    ? await getSnapshotAtCommit(projectId, ancestorCommitId)
    : new Map<string, null>();

  const preview = buildMergePreview(sourceSnapshot, targetSnapshot, ancestorSnapshot);
  return NextResponse.json({
    ...preview,
    ancestorCommitId: ancestorCommitId ?? null,
    alreadyUpToDate: preview.autoMergedFiles.length === 0 && preview.conflicts.length === 0,
  });
}
