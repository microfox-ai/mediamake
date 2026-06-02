import { NextRequest, NextResponse } from 'next/server';
import { isValidId, vcsCommitFilesCol } from '@/lib/db/collections';
import {
  ensureVcsIndexes,
  getFileSnapshotAtCommit,
  guardProject,
  requireClientId,
} from '../../../../_lib';

/**
 * GET /api/projects/[projectId]/vcs/files/[fileId]/at/[commitId]
 *
 * Returns the state of a file AT the given commit by walking the commit graph
 * backward until the file's last modification is found. This correctly handles
 * the case where the file was not changed in that specific commit (e.g. when
 * fetching the "before" content at a parent commit in a diff view).
 *
 * Response:
 *   snapshot: VcsFileSnapshot — file existed at this commit
 *   snapshot: null            — file was deleted at/before this commit
 *   404                       — commitId invalid or file was never tracked
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; fileId: string; commitId: string }> },
) {
  const { projectId, fileId, commitId } = await params;
  const clientId = requireClientId(req);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isValidId(commitId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await ensureVcsIndexes();
  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Walk the commit graph backward to find this file's state at the given commit.
  const { found, snapshot } = await getFileSnapshotAtCommit(projectId, fileId, commitId);

  if (!found) {
    // File was never tracked in this commit's history (e.g. before it was added).
    // Return null snapshot so the caller can show an empty "before" pane.
    return NextResponse.json({ fileId, commitId, snapshot: null, changeType: 'add' });
  }

  // Determine the changeType from the direct commit_files record if available
  // (used for display labels). Falls back to 'modify' / 'delete' heuristics.
  const direct = await (await vcsCommitFilesCol()).findOne({ projectId, fileId, commitId });
  const changeType = direct?.changeType ?? (snapshot ? 'modify' : 'delete');

  return NextResponse.json({ fileId, commitId, snapshot, changeType });
}
