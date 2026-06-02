import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { serialize, vcsCommitsCol } from '@/lib/db/collections';
import {
  getBranch,
  ensureMainBranch,
  ensureVcsIndexes,
  guardProject,
  requireClientId,
} from '../_lib';

/** GET /api/projects/[projectId]/vcs/commits?branch=main */
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

  const branch = req.nextUrl.searchParams.get('branch')?.trim() || 'main';
  await ensureMainBranch(projectId, clientId);
  const branchRow = await getBranch(projectId, branch);
  if (!branchRow) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

  const commitsCol = await vcsCommitsCol();

  // Prefetch up to 200 commits for this branch in one round-trip, then walk the DAG in memory.
  // This eliminates N+1 sequential DB queries for typical branch histories.
  const prefetched = await commitsCol
    .find({ projectId, branchName: branch })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  const prefetchedById = new Map(prefetched.map((c) => [c._id.toHexString(), c]));

  const commits = [];
  const seen = new Set<string>();
  let cursor: string | null = branchRow.headCommitId;
  while (cursor && commits.length < 100) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    let row = prefetchedById.get(cursor);
    if (!row) {
      // Rare fallback: commit predates the 200-commit prefetch window — fetch directly.
      row = (await commitsCol.findOne({ _id: new ObjectId(cursor), projectId })) ?? undefined;
      if (!row) break;
    }
    commits.push(row);
    cursor = row.parentCommitId;
  }

  return NextResponse.json(commits.map(serialize));
}
