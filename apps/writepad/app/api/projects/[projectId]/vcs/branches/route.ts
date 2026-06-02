import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import {
  vcsBranchesCol,
  vcsFileHeadsCol,
} from '@/lib/db/collections';
import {
  VcsTransactionUnavailableError,
  assertCanEdit,
  ensureMainBranch,
  ensureVcsIndexes,
  getBranch,
  guardProject,
  requireClientId,
  serializeBranch,
  withVcsTransaction,
} from '../_lib';

/** GET /api/projects/[projectId]/vcs/branches */
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

  await ensureMainBranch(projectId, clientId);
  const branches = await (await vcsBranchesCol())
    .find({ projectId })
    .sort({ name: 1 })
    .toArray();
  return NextResponse.json(branches.map(serializeBranch));
}

/** POST /api/projects/[projectId]/vcs/branches */
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

  const body = await req.json() as { name?: string; sourceBranch?: string };
  const name = body.name?.trim();
  const sourceBranch = body.sourceBranch?.trim() || 'main';
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!/^[a-zA-Z0-9._/-]{1,64}$/.test(name)) {
    return NextResponse.json({ error: 'Invalid branch name' }, { status: 400 });
  }

  const existing = await getBranch(projectId, name);
  if (existing) return NextResponse.json({ error: 'Branch already exists' }, { status: 409 });

  const source = await getBranch(projectId, sourceBranch) ?? await ensureMainBranch(projectId, clientId);

  try {
    await withVcsTransaction(async (session) => {
      const now = new Date();
      const branchesCol = await vcsBranchesCol();
      const headsCol = await vcsFileHeadsCol();
      const newBranchId = new ObjectId();
      await branchesCol.insertOne({
        _id: newBranchId,
        projectId,
        name,
        headCommitId: source.headCommitId,
        createdBy: clientId,
        createdAt: now,
        updatedAt: now,
      }, { session });

      const sourceHeads = await headsCol.find({ projectId, branchName: source.name }, { session }).toArray();
      if (sourceHeads.length > 0) {
        await headsCol.insertMany(
          sourceHeads.map((h) => ({
            _id: new ObjectId(),
            projectId,
            branchName: name,
            fileId: h.fileId,
            lastCommitId: h.lastCommitId,
            deleted: h.deleted,
            updatedAt: now,
          })),
          { session },
        );
      }
    });
  } catch (error) {
    if (error instanceof VcsTransactionUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  const created = await getBranch(projectId, name);
  return NextResponse.json(serializeBranch(created!), { status: 201 });
}
