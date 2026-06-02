import { NextRequest, NextResponse } from 'next/server';
import { projectsCol } from '@/lib/db/collections';
import {
  VcsTransactionUnavailableError,
  applySnapshotToProjectFiles,
  assertCanEdit,
  ensureMainBranch,
  ensureVcsIndexes,
  getBranch,
  getBranchSnapshot,
  guardProject,
  requireClientId,
  withVcsTransaction,
} from '../_lib';

/**
 * POST /api/projects/[projectId]/vcs/restore
 *
 * Discard working-directory changes for specific files WITHOUT creating a commit.
 * Equivalent to `git restore <files>`.
 *
 * Behaviour by file state:
 *   - tracked (in HEAD with content): restores the committed content → removes "modified"/"deleted" status
 *   - untracked (never committed, not in HEAD): deletes the file from project_files → removes "untracked" status
 *   - vcs-deleted (HEAD says deleted): treated as untracked — deletes from project_files
 *
 * Body: { branchName?: string; fileIds: string[] }
 */
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

  const body = await req.json() as { branchName?: string; fileIds?: string[] };
  const branchName = body.branchName?.trim() || 'main';
  const fileIds = [...new Set((body.fileIds ?? []).filter(Boolean))];

  if (fileIds.length === 0) {
    return NextResponse.json({ error: 'fileIds are required' }, { status: 400 });
  }

  await ensureMainBranch(projectId, clientId);
  const branch = await getBranch(projectId, branchName);
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

  // Load the full branch HEAD snapshot
  const fullSnapshot = await getBranchSnapshot(projectId, branchName);

  // Build the restore+discard map:
  //   - tracked (HEAD has non-null snapshot) → restore snapshot content
  //   - not in HEAD (untracked) or HEAD has null (vcs-deleted) → delete from project_files (null = delete)
  const discardMap = new Map<string, import('@/lib/db/collections').VcsFileSnapshot | null>();

  for (const fileId of fileIds) {
    const snap = fullSnapshot.has(fileId) ? fullSnapshot.get(fileId) : undefined;
    if (snap != null) {
      // Tracked file with content → restore from HEAD
      discardMap.set(fileId, snap);
    } else {
      // Untracked or vcs-deleted → delete from project_files
      discardMap.set(fileId, null);
    }
  }

  if (discardMap.size === 0) {
    return NextResponse.json({ error: 'No files to restore or discard' }, { status: 400 });
  }

  try {
    await withVcsTransaction(async (session) => {
      const now = new Date();

      // applySnapshotToProjectFiles handles both:
      //   null → delete from project_files
      //   non-null → upsert with snapshot content (clears draft)
      await applySnapshotToProjectFiles(projectId, discardMap, session);

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

  const restoredCount = [...discardMap.values()].filter((v) => v !== null).length;
  const discardedCount = [...discardMap.values()].filter((v) => v === null).length;

  return NextResponse.json({ ok: true, branchName, restoredFiles: restoredCount, discardedFiles: discardedCount });
}
