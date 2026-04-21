import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import {
  serialize,
  vcsBranchesCol,
  vcsCommitsCol,
} from '@/lib/db/collections';
import {
  ensureMainBranch,
  ensureVcsIndexes,
  getBranchSnapshot,
  guardProject,
  requireClientId,
} from '../_lib';

const COMMITS_PER_PAGE = 30;

/**
 * GET /api/projects/[projectId]/vcs/panel?branch=main&page=1
 *
 * Batch endpoint: returns branches + HEAD snapshot + paginated commits in one round-trip.
 *
 * STATUS IS NOW COMPUTED CLIENT-SIDE using the headSnapshot returned here.
 * This eliminates the multi-user contamination bug where reads from the shared
 * project_files collection would show other users' uncommitted changes as phantom diffs.
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

  const branchName = req.nextUrl.searchParams.get('branch')?.trim() || 'main';
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10));

  await ensureMainBranch(projectId, clientId);

  const branchesCol = await vcsBranchesCol();
  const commitsCol = await vcsCommitsCol();

  // ── Parallel: branches, head snapshot, branch row ─────────────────────────
  // NOTE: We deliberately do NOT read from project_files here. Status is computed
  // client-side so each user sees diffs against their own working state, not a shared DB.
  const [branches, headSnapshot, branchRow] = await Promise.all([
    branchesCol.find({ projectId }).toArray(),
    getBranchSnapshot(projectId, branchName),
    branchesCol.findOne({ projectId, name: branchName }),
  ]);

  // Serialise headSnapshot as an array so it round-trips cleanly through JSON.
  // The client reconstructs a Map and computes statusEntries from its own in-memory state.
  const headSnapshotArr = [...headSnapshot.entries()].map(([fileId, snapshot]) => ({
    fileId,
    snapshot,
  }));

  // ── Commits (paginated DAG walk) ──────────────────────────────────────────
  let commits: ReturnType<typeof serialize>[] = [];
  let commitsHasMore = false;

  if (branchRow?.headCommitId) {
    // Prefetch a larger window to handle pagination
    const prefetchLimit = COMMITS_PER_PAGE * page + 1;
    const prefetched = await commitsCol
      .find({ projectId, branchName })
      .sort({ createdAt: -1 })
      .limit(prefetchLimit + COMMITS_PER_PAGE) // buffer for DAG gaps
      .toArray();
    const prefetchedById = new Map(prefetched.map((c) => [c._id.toHexString(), c]));

    const allCommits: typeof prefetched = [];
    const seen = new Set<string>();
    let cursor: string | null = branchRow.headCommitId;
    while (cursor && allCommits.length <= COMMITS_PER_PAGE * page) {
      if (seen.has(cursor)) break;
      seen.add(cursor);
      let row = prefetchedById.get(cursor);
      if (!row) {
        row =
          (await commitsCol.findOne({ _id: new ObjectId(cursor), projectId })) ?? undefined;
        if (!row) break;
      }
      allCommits.push(row);
      cursor = row.parentCommitId;
    }

    const startIdx = (page - 1) * COMMITS_PER_PAGE;
    const endIdx = startIdx + COMMITS_PER_PAGE;
    commits = allCommits.slice(startIdx, endIdx).map(serialize);
    commitsHasMore = allCommits.length > endIdx;
  }

  return NextResponse.json(
    {
      branches: branches.map(serialize),
      headSnapshot: headSnapshotArr,
      commits,
      commitsHasMore,
      branchName,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
