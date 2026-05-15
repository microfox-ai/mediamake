import { NextRequest, NextResponse } from 'next/server';
import {
  assertCanEdit,
  ensureVcsIndexes,
  getBranchSnapshot,
  getFullSnapshotAtCommit,
  guardProject,
  requireClientId,
} from '../_lib';
import { ObjectId } from 'mongodb';
import { vcsCommitsCol } from '@/lib/db/collections';

/** GET /api/projects/[projectId]/vcs/revert-preview?branch=X&commitId=Y
 *
 * Returns a diff between the current branch HEAD and the target commit:
 *   toDelete  — files that exist now but will be removed after revert
 *   toRestore — files that don't exist now (or are deleted) but will come back
 *   toModify  — files that exist in both but with different content
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
  if (!assertCanEdit(project, clientId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const branchName = searchParams.get('branch') || 'main';
  const commitId = searchParams.get('commitId') || '';
  if (!commitId || !ObjectId.isValid(commitId)) {
    return NextResponse.json({ error: 'commitId is required' }, { status: 400 });
  }

  // Verify commit belongs to this project/branch
  const commit = await (await vcsCommitsCol()).findOne({
    _id: new ObjectId(commitId),
    projectId,
    branchName,
  });
  if (!commit) return NextResponse.json({ error: 'Commit not found' }, { status: 404 });

  const [currentHead, targetState] = await Promise.all([
    getBranchSnapshot(projectId, branchName),
    getFullSnapshotAtCommit(projectId, commitId),
  ]);

  type FileEntry = { fileId: string; name: string };
  const toDelete: FileEntry[] = [];
  const toRestore: FileEntry[] = [];
  const toModify: FileEntry[] = [];

  // Files in the target state
  for (const [fid, meta] of targetState) {
    const current = currentHead.get(fid);
    if (meta.snapshot === null) {
      // File was deleted at target commit — if currently alive, it will be deleted
      if (current && current !== null) {
        toDelete.push({ fileId: fid, name: (current as { name: string }).name });
      }
      continue;
    }
    if (current === undefined || current === null) {
      // Doesn't exist now → will be restored
      toRestore.push({ fileId: fid, name: meta.snapshot.name });
    } else if (current.content !== meta.snapshot.content) {
      // Content differs → will be modified
      toModify.push({ fileId: fid, name: meta.snapshot.name });
    }
    // else: unchanged — not shown
  }

  // Files in current HEAD but absent from target state → will be deleted
  for (const [fid, snap] of currentHead) {
    if (!targetState.has(fid) && snap !== null) {
      toDelete.push({ fileId: fid, name: (snap as { name: string }).name });
    }
  }

  return NextResponse.json({
    ok: true,
    branchName,
    commitMessage: commit.message,
    commitId: commit._id.toHexString(),
    toDelete,
    toRestore,
    toModify,
  });
}
