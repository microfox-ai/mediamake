import { ObjectId, type ClientSession } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import {
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
  getFullSnapshotAtCommit,
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

  const body = await req.json() as { branchName?: string; commitId?: string; fileId?: string };
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
  const commit = await (await vcsCommitsCol()).findOne({
    _id: new ObjectId(commitId),
    projectId,
    branchName,
  });
  if (!commit) return NextResponse.json({ error: 'Commit not found on this branch' }, { status: 404 });

  // ── File-level restore ────────────────────────────────────────────────────────
  // Restores specific file(s) to their state in the given commit, creating a new
  // commit on top of the current HEAD.
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

    // Working-directory snapshot: current HEAD + restored file(s) + untracked files
    const workingSnapshot = new Map<string, VcsFileSnapshot | null>(currentSnapshot);
    for (const [fid, snapshot] of changedSnapshots) workingSnapshot.set(fid, snapshot);
    for (const file of currentFiles) {
      const fid = file._id.toHexString();
      if (!workingSnapshot.has(fid)) workingSnapshot.set(fid, snapshotFromFile(file));
    }

    const run = async (session: ClientSession | null) => {
      const s = session ? { session } : {};
      const now = new Date();
      const revertCommitId = new ObjectId();
      const commitsCol = await vcsCommitsCol();
      const commitFilesCol = await vcsCommitFilesCol();
      const headsCol = await vcsFileHeadsCol();
      const branchesCol = await vcsBranchesCol();
      const projectCol = await projectsCol();

      await commitsCol.insertOne({
        _id: revertCommitId,
        projectId,
        branchName,
        message: `Restore file from ${commitId.slice(0, 7)}`,
        authorClientId: clientId,
        parentCommitId: branch.headCommitId,
        mergeParentCommitId: null,
        createdAt: now,
      }, s);

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
        s,
      );

      for (const [fid, snapshot] of changedSnapshots) {
        await headsCol.updateOne(
          { projectId, branchName, fileId: fid },
          {
            $set: { lastCommitId: revertCommitId.toHexString(), deleted: snapshot === null, updatedAt: now },
            $setOnInsert: { _id: new ObjectId(), projectId, branchName, fileId: fid },
          },
          { upsert: true, ...s },
        );
      }

      await branchesCol.updateOne(
        { projectId, name: branchName },
        { $set: { headCommitId: revertCommitId.toHexString(), updatedAt: now } },
        s,
      );
      await applySnapshotToProjectFiles(projectId, workingSnapshot, session);
      await projectCol.updateOne({ _id: project._id }, { $set: { updatedAt: now } }, s);

      return revertCommitId.toHexString();
    };

    try {
      let newCommitId: string;
      try {
        newCommitId = await withVcsTransaction((s) => run(s));
      } catch (err) {
        if (err instanceof VcsTransactionUnavailableError) {
          newCommitId = await run(null);
        } else {
          throw err;
        }
      }
      return NextResponse.json({ ok: true, commitId: newCommitId, restoredFiles: commitFiles.length });
    } catch (error) {
      console.error('[vcs/revert] file-level restore failed:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Revert failed' },
        { status: 500 },
      );
    }
  }

  // ── Branch-level revert (reset to commit) ─────────────────────────────────────
  // Moves the branch HEAD backward to `commitId`, rebuilds file_heads, and
  // updates project_files to match the working-directory state at that point.

  if (!branch.headCommitId) {
    return NextResponse.json({ error: 'Branch has no commits to revert' }, { status: 400 });
  }

  // Verify the target commit is in the branch's reachable history.
  // Walk the parent chain (follows mergeParentCommitId too for merge commits).
  {
    const commitsCol = await vcsCommitsCol();
    const visited = new Set<string>();
    let frontier = [branch.headCommitId];
    let found = false;
    while (frontier.length > 0 && !found) {
      const next: string[] = [];
      for (const id of frontier) {
        if (visited.has(id)) continue;
        visited.add(id);
        if (id === commitId) { found = true; break; }
        const row = await commitsCol.findOne({ _id: new ObjectId(id), projectId, branchName });
        if (row?.parentCommitId && !visited.has(row.parentCommitId)) next.push(row.parentCommitId);
        if (row?.mergeParentCommitId && !visited.has(row.mergeParentCommitId)) next.push(row.mergeParentCommitId);
      }
      frontier = next;
    }
    if (!found) {
      return NextResponse.json({ error: 'Target commit is not in current branch history' }, { status: 400 });
    }
  }

  // Get the full file state at the target commit (snapshot + which commit last changed each file).
  const targetByFile = await getFullSnapshotAtCommit(projectId, commitId);

  // Get the current branch HEAD snapshot (before revert) — needed to:
  //   1. Identify files to delete (tracked in current HEAD but absent from target state)
  //   2. Preserve untracked files (in project_files but never committed)
  const [currentHead, allFiles] = await Promise.all([
    getBranchSnapshot(projectId, branchName),
    (await projectFilesCol()).find({ projectId }).toArray(),
  ]);

  // Build the working-directory snapshot for project_files:
  //   - Files alive at target: their snapshot from the target state
  //   - Files tracked now but absent at target (added after target): null → deleted
  //   - Files not tracked in current HEAD (untracked working files): preserved as-is
  const workingSnapshot = new Map<string, VcsFileSnapshot | null>();

  for (const [fid, meta] of targetByFile) {
    // null snapshot = file was deleted at target; don't add to workingSnapshot (leave out)
    if (meta.snapshot !== null) workingSnapshot.set(fid, meta.snapshot);
  }

  for (const [fid] of currentHead) {
    if (!targetByFile.has(fid)) {
      // File exists in current HEAD but didn't exist at the target commit → delete it.
      workingSnapshot.set(fid, null);
    }
  }

  // Preserve untracked files (in project_files but not tracked by any HEAD).
  for (const file of allFiles) {
    const fid = file._id.toHexString();
    if (!currentHead.has(fid)) workingSnapshot.set(fid, snapshotFromFile(file));
  }

  const run = async (session: ClientSession | null) => {
    const s = session ? { session } : {};
    const now = new Date();
    const headsCol = await vcsFileHeadsCol();
    const branchesCol = await vcsBranchesCol();
    const projectCol = await projectsCol();

    // Rebuild file_heads for this branch from the target state.
    await headsCol.deleteMany({ projectId, branchName }, s);
    if (targetByFile.size > 0) {
      await headsCol.insertMany(
        [...targetByFile.entries()].map(([fid, meta]) => ({
          _id: new ObjectId(),
          projectId,
          branchName,
          fileId: fid,
          lastCommitId: meta.lastCommitId,
          deleted: meta.snapshot === null,
          updatedAt: now,
        })),
        s,
      );
    }

    // Move branch HEAD pointer to the target commit.
    // Commits beyond the new HEAD become unreachable from this branch but are
    // never deleted — they remain accessible to any branch forked from them.
    await branchesCol.updateOne(
      { projectId, name: branchName },
      { $set: { headCommitId: commitId, updatedAt: now } },
      s,
    );

    await applySnapshotToProjectFiles(projectId, workingSnapshot, session);
    await projectCol.updateOne({ _id: project._id }, { $set: { updatedAt: now } }, s);
  };

  try {
    try {
      await withVcsTransaction((s) => run(s));
    } catch (err) {
      if (err instanceof VcsTransactionUnavailableError) {
        await run(null);
      } else {
        throw err;
      }
    }
    return NextResponse.json({ ok: true, branchName, resetToCommitId: commitId });
  } catch (error) {
    console.error('[vcs/revert] branch revert failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Revert failed' },
      { status: 500 },
    );
  }
}
