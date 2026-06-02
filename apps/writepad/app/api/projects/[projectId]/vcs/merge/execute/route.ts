import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import {
  projectFilesCol,
  projectsCol,
  vcsBranchesCol,
  vcsCommitFilesCol,
  vcsCommitsCol,
  vcsFileHeadsCol,
} from '@/lib/db/collections';
import {
  VcsTransactionUnavailableError,
  applySnapshotToProjectFiles,
  assertCanEdit,
  ensureMainBranch,
  ensureVcsIndexes,
  findCommonAncestor,
  getBranchSnapshot,
  getSnapshotAtCommit,
  guardProject,
  requireClientId,
  snapshotFromFile,
  withVcsTransaction,
} from '../../_lib';
import { buildMergePreview } from '../../_merge';

/** POST /api/projects/[projectId]/vcs/merge/execute */
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

  const body = await req.json() as {
    sourceBranch?: string;
    targetBranch?: string;
    conflictResolutions?: Array<{ fileId: string; resolution: 'useSource' | 'useTarget' }>;
  };
  const sourceBranch = body.sourceBranch?.trim();
  const targetBranch = body.targetBranch?.trim();
  const conflictResolutions = body.conflictResolutions ?? [];
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

  // 3-way merge with common ancestor
  const [sourceSnapshot, targetSnapshot, ancestorCommitId] = await Promise.all([
    getBranchSnapshot(projectId, sourceBranch),
    getBranchSnapshot(projectId, targetBranch),
    findCommonAncestor(projectId, source.headCommitId, target.headCommitId),
  ]);

  const ancestorSnapshot = ancestorCommitId
    ? await getSnapshotAtCommit(projectId, ancestorCommitId)
    : new Map<string, null>();

  const preview = buildMergePreview(sourceSnapshot, targetSnapshot, ancestorSnapshot);

  // Already up to date — no merge commit needed
  if (preview.autoMergedFiles.length === 0 && preview.conflicts.length === 0) {
    return NextResponse.json({ ok: true, alreadyUpToDate: true, mergeCommitId: null });
  }

  // Validate all conflicts have resolutions
  const resolutionMap = new Map(conflictResolutions.map((r) => [r.fileId, r.resolution]));
  for (const conflict of preview.conflicts) {
    if (!resolutionMap.has(conflict.fileId)) {
      return NextResponse.json(
        { error: 'Missing conflict resolution', fileId: conflict.fileId },
        { status: 400 },
      );
    }
  }

  // Build the merged state starting from target
  const mergedState = new Map(targetSnapshot);
  // changedSnapshots = files actually modified relative to target (for the merge commit record)
  const changedSnapshots = new Map<string, typeof preview.autoMergedFiles[number]['source']>();

  for (const item of preview.autoMergedFiles) {
    mergedState.set(item.fileId, item.source);
    changedSnapshots.set(item.fileId, item.source);
  }
  for (const item of preview.conflicts) {
    const resolution = resolutionMap.get(item.fileId);
    if (resolution === 'useSource') {
      mergedState.set(item.fileId, item.source);
      changedSnapshots.set(item.fileId, item.source);
    }
    // 'useTarget' → target already has the right version, no change needed
  }

  // Preserve untracked working-directory files (not tracked by target branch)
  const currentFiles = await (await projectFilesCol()).find({ projectId }).toArray();
  for (const file of currentFiles) {
    const fid = file._id.toHexString();
    if (!targetSnapshot.has(fid)) {
      mergedState.set(fid, snapshotFromFile(file));
    }
  }

  try {
    let mergeCommitId = '';
    await withVcsTransaction(async (session) => {
      const now = new Date();
      const commitId = new ObjectId();
      mergeCommitId = commitId.toHexString();
      const commitsCol = await vcsCommitsCol();
      const commitFilesCol = await vcsCommitFilesCol();
      const headsCol = await vcsFileHeadsCol();
      const projectCol = await projectsCol();

      await commitsCol.insertOne({
        _id: commitId,
        projectId,
        branchName: targetBranch,
        message: `Merge ${sourceBranch} into ${targetBranch}`,
        authorClientId: clientId,
        parentCommitId: target.headCommitId,
        mergeParentCommitId: source.headCommitId,
        createdAt: now,
      }, { session });

      if (changedSnapshots.size > 0) {
        await commitFilesCol.insertMany(
          [...changedSnapshots.entries()].map(([fileId, snapshot]) => ({
            _id: new ObjectId(),
            commitId: commitId.toHexString(),
            projectId,
            fileId,
            changeType: snapshot ? 'modify' as const : 'delete' as const,
            snapshot,
            previousFileId: fileId,
            createdAt: now,
          })),
          { session },
        );

        for (const [fileId, snapshot] of changedSnapshots.entries()) {
          await headsCol.updateOne(
            { projectId, branchName: targetBranch, fileId },
            {
              $set: {
                lastCommitId: commitId.toHexString(),
                deleted: snapshot === null,
                updatedAt: now,
              },
              $setOnInsert: {
                _id: new ObjectId(),
                projectId,
                branchName: targetBranch,
                fileId,
              },
            },
            { upsert: true, session },
          );
        }
      }

      await branchesCol.updateOne(
        { projectId, name: targetBranch },
        { $set: { headCommitId: commitId.toHexString(), updatedAt: now } },
        { session },
      );
      await applySnapshotToProjectFiles(projectId, mergedState, session);
      await projectCol.updateOne(
        { _id: project._id },
        { $set: { updatedAt: now } },
        { session },
      );
    });

    return NextResponse.json({
      ok: true,
      alreadyUpToDate: false,
      mergeCommitId,
      autoMergedCount: preview.autoMergedFiles.length,
      conflictCount: preview.conflicts.length,
    });
  } catch (error) {
    if (error instanceof VcsTransactionUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
}
