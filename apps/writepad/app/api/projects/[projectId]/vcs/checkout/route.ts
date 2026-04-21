import { NextRequest, NextResponse } from 'next/server';
import { projectsCol, vcsBranchesCol, vcsFileHeadsCol } from '@/lib/db/collections';
import {
  VcsTransactionUnavailableError,
  applySnapshotToProjectFiles,
  assertCanEdit,
  ensureMainBranch,
  ensureVcsIndexes,
  getBranchSnapshot,
  guardProject,
  requireClientId,
  withVcsTransaction,
} from '../_lib';

/** POST /api/projects/[projectId]/vcs/checkout */
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

  const body = await req.json() as { branchName?: string };
  const branchName = body.branchName?.trim() || 'main';
  await ensureMainBranch(projectId, clientId);

  const branch = await (await vcsBranchesCol()).findOne({ projectId, name: branchName });
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
  const snapshot = await getBranchSnapshot(projectId, branchName);

  // Determine which files are tracked (committed, non-deleted) on ANY branch in this project.
  // Files that are tracked somewhere but NOT present on the target branch are "branch-specific"
  // and must be removed from the working directory — otherwise switching from feature → main
  // would leave feature-only files behind as phantom "untracked" files on main.
  const headsCol = await vcsFileHeadsCol();
  const allTrackedHeads = await headsCol.find({ projectId, deleted: false }).toArray();
  const targetTrackedIds = new Set(
    [...snapshot.entries()]
      .filter(([, snap]) => snap !== null)
      .map(([id]) => id),
  );
  for (const head of allTrackedHeads) {
    if (!targetTrackedIds.has(head.fileId) && !snapshot.has(head.fileId)) {
      // Tracked on another branch, not present on target → mark for deletion
      snapshot.set(head.fileId, null);
    }
  }

  try {
    await withVcsTransaction(async (session) => {
      const now = new Date();
      await applySnapshotToProjectFiles(projectId, snapshot, session);
      await (await projectsCol()).updateOne(
        { _id: project._id },
        { $set: { updatedAt: now } },
        { session },
      );
    });
  } catch (error) {
    if (error instanceof VcsTransactionUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, branchName, filesApplied: [...snapshot.values()].filter(Boolean).length });
}
