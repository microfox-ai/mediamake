import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import {
  type DbVcsCommit,
  type VcsFileSnapshot,
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
  getBranchSnapshot,
  guardProject,
  requireClientId,
  snapshotFromFile,
  withVcsTransaction,
} from '../_lib';

/** POST /api/projects/[projectId]/vcs/revert */
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
    branchName?: string;
    commitId?: string;
    fileId?: string;
  };
  const branchName = body.branchName?.trim() || 'main';
  const commitId = body.commitId?.trim();
  const fileId = body.fileId?.trim();
  if (!commitId) return NextResponse.json({ error: 'commitId is required' }, { status: 400 });

  await ensureMainBranch(projectId, clientId);
  const branch = await (await vcsBranchesCol()).findOne({ projectId, name: branchName });
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

  if (!ObjectId.isValid(commitId)) {
    return NextResponse.json({ error: 'Invalid commitId' }, { status: 400 });
  }
  const commit = await (await vcsCommitsCol()).findOne({ _id: new ObjectId(commitId), projectId, branchName });
  if (!commit) return NextResponse.json({ error: 'Commit not found on this branch' }, { status: 404 });

  // File-level restore: restore specific file(s) from a commit snapshot.
  if (fileId) {
    const commitFiles = await (await vcsCommitFilesCol())
      .find({ projectId, commitId, fileId })
      .toArray();
    if (commitFiles.length === 0) {
      return NextResponse.json({ error: 'No matching file snapshots found in commit' }, { status: 404 });
    }

    const [currentSnapshot, currentFiles] = await Promise.all([
      getBranchSnapshot(projectId, branchName),
      (await projectFilesCol()).find({ projectId }).toArray(),
    ]);
    const changedSnapshots = new Map(commitFiles.map((cf) => [cf.fileId, cf.snapshot]));
    const nextSnapshot = new Map(currentSnapshot);
    for (const [fid, snapshot] of changedSnapshots.entries()) {
      nextSnapshot.set(fid, snapshot);
    }
    // Preserve untracked working-directory files (not in any branch head)
    for (const file of currentFiles) {
      const fid = file._id.toHexString();
      if (!nextSnapshot.has(fid)) {
        nextSnapshot.set(fid, snapshotFromFile(file));
      }
    }

    try {
      let newCommitId = '';
      await withVcsTransaction(async (session) => {
        const now = new Date();
        const revertCommitId = new ObjectId();
        newCommitId = revertCommitId.toHexString();
        const commitsCol = await vcsCommitsCol();
        const commitFilesCol = await vcsCommitFilesCol();
        const headsCol = await vcsFileHeadsCol();
        const branchesCol = await vcsBranchesCol();
        const projectCol = await projectsCol();

        await commitsCol.insertOne({
          _id: revertCommitId,
          projectId,
          branchName,
          message: `Restore ${fileId} from ${commitId}`,
          authorClientId: clientId,
          parentCommitId: branch.headCommitId,
          mergeParentCommitId: null,
          createdAt: now,
        }, { session });

        await commitFilesCol.insertMany(
          [...changedSnapshots.entries()].map(([fid, snapshot]) => ({
            _id: new ObjectId(),
            commitId: revertCommitId.toHexString(),
            projectId,
            fileId: fid,
            changeType: snapshot ? 'modify' as const : 'delete' as const,
            snapshot,
            previousFileId: fid,
            createdAt: now,
          })),
          { session },
        );

        for (const [fid, snapshot] of changedSnapshots.entries()) {
          await headsCol.updateOne(
            { projectId, branchName, fileId: fid },
            {
              $set: {
                lastCommitId: revertCommitId.toHexString(),
                deleted: snapshot === null,
                updatedAt: now,
              },
              $setOnInsert: {
                _id: new ObjectId(),
                projectId,
                branchName,
                fileId: fid,
              },
            },
            { upsert: true, session },
          );
        }

        await branchesCol.updateOne(
          { projectId, name: branchName },
          { $set: { headCommitId: revertCommitId.toHexString(), updatedAt: now } },
          { session },
        );
        await applySnapshotToProjectFiles(projectId, nextSnapshot, session);
        await projectCol.updateOne(
          { _id: project._id },
          { $set: { updatedAt: now } },
          { session },
        );
      });

      return NextResponse.json({ ok: true, commitId: newCommitId, restoredFiles: commitFiles.length });
    } catch (error) {
      if (error instanceof VcsTransactionUnavailableError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      throw error;
    }
  }

  if (!branch.headCommitId) {
    return NextResponse.json({ error: 'Branch has no commits to revert' }, { status: 400 });
  }

  const commitsCol = await vcsCommitsCol();
  let cursor: string | null = branch.headCommitId;
  let foundTarget = false;
  while (cursor) {
    const row: (DbVcsCommit & { _id: ObjectId }) | null = await commitsCol.findOne({ _id: new ObjectId(cursor), projectId, branchName });
    if (!row) {
      return NextResponse.json({ error: 'Branch history is inconsistent' }, { status: 409 });
    }
    const rowId = row._id.toHexString();
    if (rowId === commitId) {
      foundTarget = true;
      break;
    }
    cursor = row.parentCommitId;
  }
  if (!foundTarget) {
    return NextResponse.json({ error: 'Target commit is not in current branch history' }, { status: 400 });
  }

  // Walk the FULL commit DAG backward from the target commit to reconstruct the
  // complete file state at that point. Walking newest-first means the first time
  // we encounter a fileId = its most recent state at or before targetCommit.
  // This is the root cause fix: the old code only looked at files changed IN the
  // target commit itself, leaving all earlier files without head records.
  const targetStateByFile = new Map<
    string,
    { lastCommitId: string; deleted: boolean; snapshot: VcsFileSnapshot | null }
  >();
  {
    const cfCol = await vcsCommitFilesCol();
    const visited = new Set<string>();
    let frontier: string[] = [commitId];
    while (frontier.length > 0) {
      const batch = frontier.filter((id) => !visited.has(id));
      if (batch.length === 0) break;
      for (const id of batch) visited.add(id);

      // Load all commit_files for this batch of commits
      const rows = await cfCol.find({ projectId, commitId: { $in: batch } }).toArray();
      for (const row of rows) {
        // First-seen = most recent state for this file
        if (!targetStateByFile.has(row.fileId)) {
          targetStateByFile.set(row.fileId, {
            lastCommitId: row.commitId,
            deleted: row.snapshot === null,
            snapshot: row.snapshot,
          });
        }
      }

      // Follow parent chains to older commits
      const parentCommits = await commitsCol
        .find({ projectId, _id: { $in: batch.map((id) => new ObjectId(id)) } })
        .toArray();
      frontier = [];
      for (const c of parentCommits) {
        if (c.parentCommitId && !visited.has(c.parentCommitId)) frontier.push(c.parentCommitId);
        if (c.mergeParentCommitId && !visited.has(c.mergeParentCommitId)) frontier.push(c.mergeParentCommitId);
      }
    }
  }

  const targetSnapshot = new Map(
    [...targetStateByFile.entries()]
      .filter(([, state]) => !state.deleted && state.snapshot !== null)
      .map(([fid, state]) => [fid, state.snapshot]),
  );

  // Preserve current uncommitted/untracked nodes (not present in current branch HEAD).
  const currentHeadSnapshot = await getBranchSnapshot(projectId, branchName);
  const currentFiles = await (await projectFilesCol()).find({ projectId }).toArray();
  for (const file of currentFiles) {
    const fid = file._id.toHexString();
    if (!currentHeadSnapshot.has(fid)) {
      targetSnapshot.set(fid, snapshotFromFile(file));
    }
  }

  try {
    await withVcsTransaction(async (session) => {
      const now = new Date();
      const headsCol = await vcsFileHeadsCol();
      const branchesCol = await vcsBranchesCol();
      const projectCol = await projectsCol();

      await headsCol.deleteMany({ projectId, branchName }, { session });
      if (targetStateByFile.size > 0) {
        await headsCol.insertMany(
          [...targetStateByFile.entries()].map(([fid, state]) => ({
            _id: new ObjectId(),
            projectId,
            branchName,
            fileId: fid,
            lastCommitId: state.lastCommitId,
            deleted: state.deleted,
            updatedAt: now,
          })),
          { session },
        );
      }

      await branchesCol.updateOne(
        { projectId, name: branchName },
        { $set: { headCommitId: commitId, updatedAt: now } },
        { session },
      );

      // Commits are immutable — we never delete them. Moving the branch pointer
      // backward is sufficient; commits beyond the new HEAD simply become
      // unreachable from this branch but remain accessible by any other branch
      // that was forked from them. This matches the GitHub model.

      await applySnapshotToProjectFiles(projectId, targetSnapshot, session);
      await projectCol.updateOne(
        { _id: project._id },
        { $set: { updatedAt: now } },
        { session },
      );
    });

    return NextResponse.json({
      ok: true,
      branchName,
      resetToCommitId: commitId,
    });
  } catch (error) {
    if (error instanceof VcsTransactionUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
}
