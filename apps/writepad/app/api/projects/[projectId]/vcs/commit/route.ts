import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import {
  isValidId,
  projectFilesCol,
  projectsCol,
  serialize,
  toObjectId,
  vcsBranchesCol,
  vcsCommitFilesCol,
  vcsCommitsCol,
  vcsFileHeadsCol,
} from '@/lib/db/collections';
import {
  VcsTransactionUnavailableError,
  assertCanEdit,
  ensureMainBranch,
  ensureVcsIndexes,
  getBranch,
  getBranchHeads,
  guardProject,
  loadHeadSnapshots,
  requireClientId,
  withVcsTransaction,
} from '../_lib';
import type { VcsFileSnapshot } from '@/lib/db/collections';

/**
 * POST /api/projects/[projectId]/vcs/commit
 *
 * Creates a new commit on a branch using CLIENT-PROVIDED file snapshots.
 * The client sends the current in-memory content for each file so the server
 * never reads from the shared project_files collection for content. This
 * eliminates the multi-user contamination bug where another user's checkout
 * or commit would corrupt the shared working directory.
 *
 * Body:
 *   {
 *     branchName: string
 *     message: string
 *     files: Array<{
 *       fileId: string
 *       name?: string
 *       type?: 'file' | 'folder'
 *       parentId?: string | null
 *       content?: string
 *       order?: number
 *       deleted?: boolean  // true → commit as deletion
 *     }>
 *   }
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

  const body = await req.json() as {
    branchName?: string;
    message?: string;
    files?: Array<{
      fileId: string;
      name?: string;
      type?: string;
      parentId?: string | null;
      content?: string;
      order?: number;
      deleted?: boolean;
    }>;
  };

  const branchName = body.branchName?.trim() || 'main';
  const message = body.message?.trim();
  const requestedFiles = body.files ?? [];

  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 });
  if (requestedFiles.length === 0) {
    return NextResponse.json({ error: 'files are required' }, { status: 400 });
  }

  // Deduplicate and validate fileIds
  const seen = new Set<string>();
  const validFiles = requestedFiles.filter((f) => {
    if (!f.fileId || !isValidId(f.fileId) || seen.has(f.fileId)) return false;
    seen.add(f.fileId);
    return true;
  });
  if (validFiles.length === 0) {
    return NextResponse.json({ error: 'No valid file ids provided' }, { status: 400 });
  }

  await ensureMainBranch(projectId, clientId);
  const branch = await getBranch(projectId, branchName);
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

  const priorHeads = await getBranchHeads(projectId, branchName);
  const priorHeadByFile = new Map(priorHeads.map((h) => [h.fileId, h]));
  const priorSnapshots = await loadHeadSnapshots(priorHeads);

  // Build the list of changes using client-provided content (not the shared DB)
  const changes: Array<{
    fileId: string;
    changeType: 'add' | 'modify' | 'delete' | 'rename';
    snapshot: VcsFileSnapshot | null;
  }> = [];

  // Files to flush to project_files after commit (using the committed content from client)
  const filesToFlush: Array<{ fileId: string; content: string }> = [];

  for (const reqFile of validFiles) {
    const { fileId, deleted } = reqFile;
    const prev = priorSnapshots.get(fileId) ?? null;

    if (deleted) {
      // File was deleted from working directory — commit as deletion
      if (prev) {
        changes.push({ fileId, changeType: 'delete', snapshot: null });
      }
      continue;
    }

    // Build snapshot from client-provided data
    const nextSnapshot: VcsFileSnapshot = {
      fileId,
      name: reqFile.name ?? '',
      type: (reqFile.type as 'file' | 'folder') ?? 'file',
      parentId: reqFile.parentId ?? null,
      content: reqFile.content ?? '',
      order: reqFile.order ?? 0,
    };

    if (!prev) {
      // Brand-new file — never tracked on this branch
      changes.push({ fileId, changeType: 'add', snapshot: nextSnapshot });
      filesToFlush.push({ fileId, content: nextSnapshot.content });
      continue;
    }

    const sameContent =
      prev.content === nextSnapshot.content &&
      prev.name === nextSnapshot.name &&
      prev.parentId === nextSnapshot.parentId &&
      prev.type === nextSnapshot.type;
    if (sameContent) continue;

    const renameOnly =
      prev.content === nextSnapshot.content &&
      prev.type === nextSnapshot.type &&
      (prev.name !== nextSnapshot.name || prev.parentId !== nextSnapshot.parentId);
    changes.push({
      fileId,
      changeType: renameOnly ? 'rename' : 'modify',
      snapshot: nextSnapshot,
    });
    filesToFlush.push({ fileId, content: nextSnapshot.content });
  }

  if (changes.length === 0) {
    return NextResponse.json({ error: 'No material file changes to commit' }, { status: 400 });
  }

  try {
    let createdCommitId = '';
    await withVcsTransaction(async (session) => {
      const now = new Date();
      const commitId = new ObjectId();
      createdCommitId = commitId.toHexString();
      const commitsCol = await vcsCommitsCol();
      const commitFilesCol = await vcsCommitFilesCol();
      const headsCol = await vcsFileHeadsCol();
      const branchesCol = await vcsBranchesCol();
      const projectCol = await projectsCol();

      await commitsCol.insertOne({
        _id: commitId,
        projectId,
        branchName,
        message,
        authorClientId: clientId,
        parentCommitId: branch.headCommitId,
        mergeParentCommitId: null,
        createdAt: now,
      }, { session });

      await commitFilesCol.insertMany(
        changes.map((c) => ({
          _id: new ObjectId(),
          commitId: commitId.toHexString(),
          projectId,
          fileId: c.fileId,
          changeType: c.changeType,
          snapshot: c.snapshot,
          previousFileId: priorHeadByFile.get(c.fileId)?.fileId ?? null,
          createdAt: now,
        })),
        { session },
      );

      for (const c of changes) {
        await headsCol.updateOne(
          { projectId, branchName, fileId: c.fileId },
          {
            $set: {
              lastCommitId: commitId.toHexString(),
              deleted: c.snapshot === null,
              updatedAt: now,
            },
            $setOnInsert: {
              _id: new ObjectId(),
              projectId,
              branchName,
              fileId: c.fileId,
            },
          },
          { upsert: true, session },
        );
      }

      // Flush committed content to project_files using CLIENT-PROVIDED content.
      // This correctly clears each user's own draft without contaminating other users:
      //   - content = what was just committed (from client, not from a possibly-stale DB draft)
      //   - draft = null (draft has been consumed by this commit)
      // Other users computing status client-side are unaffected by these writes because
      // they compare their own in-memory state against VcsFileHead, not project_files.
      const filesCol = await projectFilesCol();
      for (const { fileId, content } of filesToFlush) {
        await filesCol.updateOne(
          { _id: toObjectId(fileId), projectId },
          { $set: { content, draft: null, updatedAt: now } },
          { session },
        );
      }

      await branchesCol.updateOne(
        { projectId, name: branchName },
        { $set: { headCommitId: commitId.toHexString(), updatedAt: now } },
        { session },
      );
      await projectCol.updateOne(
        { _id: project._id },
        { $set: { updatedAt: now } },
        { session },
      );
    });

    const created = await (await vcsCommitsCol()).findOne({ _id: new ObjectId(createdCommitId) });
    return NextResponse.json(serialize(created!), { status: 201 });
  } catch (error) {
    if (error instanceof VcsTransactionUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
}
