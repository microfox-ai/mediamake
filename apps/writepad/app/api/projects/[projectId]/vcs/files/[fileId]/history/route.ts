import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { serialize, vcsBranchesCol, vcsCommitFilesCol, vcsCommitsCol } from '@/lib/db/collections';
import { ensureVcsIndexes, guardProject, requireClientId } from '../../../_lib';

/**
 * GET /api/projects/[projectId]/vcs/files/[fileId]/history?branch=main&limit=5
 *
 * Returns the commit history for a specific file on a specific branch,
 * newest-first. Only commits reachable from the branch HEAD are returned —
 * this prevents commits from other branches (feature, archive, etc.) from
 * appearing in a branch's file history.
 *
 * limit defaults to 20, max 100.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const { projectId, fileId } = await params;
  const clientId = requireClientId(req);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureVcsIndexes();
  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const limitParam = parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 100);
  const branchName = req.nextUrl.searchParams.get('branch')?.trim() || 'main';

  // Walk the branch DAG to collect all commit IDs reachable from the branch HEAD.
  // This ensures we only return history for commits that are actually part of
  // this branch, excluding commits that belong to other branches.
  const branchRow = await (await vcsBranchesCol()).findOne({ projectId, name: branchName });
  if (!branchRow?.headCommitId) {
    return NextResponse.json({ entries: [], hasMore: false });
  }

  const commitsCol = await vcsCommitsCol();
  const reachableIds = new Set<string>();
  const visited = new Set<string>();
  let frontier: string[] = [branchRow.headCommitId];

  while (frontier.length > 0) {
    const batch = frontier.filter((id) => !visited.has(id));
    if (batch.length === 0) break;
    for (const id of batch) {
      visited.add(id);
      reachableIds.add(id);
    }
    const commits = await commitsCol
      .find({ projectId, _id: { $in: batch.map((id) => new ObjectId(id)) } })
      .toArray();
    frontier = [];
    for (const c of commits) {
      if (c.parentCommitId && !visited.has(c.parentCommitId)) frontier.push(c.parentCommitId);
      if (c.mergeParentCommitId && !visited.has(c.mergeParentCommitId))
        frontier.push(c.mergeParentCommitId);
    }
  }

  if (reachableIds.size === 0) return NextResponse.json({ entries: [], hasMore: false });

  const commitFiles = await (await vcsCommitFilesCol())
    .find({ projectId, fileId, commitId: { $in: [...reachableIds] } })
    .sort({ createdAt: -1 })
    .limit(limit + 1) // fetch one extra to detect hasMore
    .toArray();

  const hasMore = commitFiles.length > limit;
  const page = commitFiles.slice(0, limit);

  if (page.length === 0) return NextResponse.json({ entries: [], hasMore: false });

  const commitIds = [...new Set(page.map((cf) => cf.commitId))];
  const commits = await commitsCol
    .find({ projectId, _id: { $in: commitIds.map((id) => new ObjectId(id)) } })
    .toArray();
  const commitById = new Map(commits.map((c) => [c._id.toHexString(), c]));

  const entries = page.map((cf) => ({
    ...serialize(cf),
    commit: commitById.has(cf.commitId) ? serialize(commitById.get(cf.commitId)!) : null,
  }));

  return NextResponse.json({ entries, hasMore });
}
