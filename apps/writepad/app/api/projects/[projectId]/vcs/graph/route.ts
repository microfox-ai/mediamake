import { NextRequest, NextResponse } from 'next/server';
import { serialize, vcsBranchesCol, vcsCommitsCol } from '@/lib/db/collections';
import { ensureVcsIndexes, ensureMainBranch, guardProject, requireClientId } from '../_lib';

/**
 * GET /api/projects/[projectId]/vcs/graph
 *
 * Returns all branches and up to 400 most-recent commits across all branches,
 * sufficient to render a full branch-graph visualization.
 *
 * Each commit carries its original `branchName` so the client can assign lane
 * columns without further DB round-trips.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = requireClientId(req);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureVcsIndexes();
  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await ensureMainBranch(projectId, clientId);

  const [branchesCol, commitsCol] = await Promise.all([vcsBranchesCol(), vcsCommitsCol()]);

  const [branches, commits] = await Promise.all([
    branchesCol.find({ projectId }).sort({ createdAt: 1 }).toArray(),
    commitsCol
      .find({ projectId })
      .sort({ createdAt: -1 })
      .limit(400)
      .toArray(),
  ]);

  return NextResponse.json(
    {
      branches: branches.map(serialize),
      commits: commits.map(serialize),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
