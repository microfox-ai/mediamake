import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  projectFilesCol,
  hasAccess,
  isValidId,
  toObjectId,
  serialize,
} from '@/lib/db/collections';

async function guardProject(projectId: string, clientId: string) {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  const project = await col.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId)) return null;
  return project;
}

async function resolveFile(projectId: string, fileId: string) {
  if (!isValidId(fileId)) return null;
  const col = await projectFilesCol();
  return col.findOne({ _id: toObjectId(fileId), projectId });
}

/** GET /api/projects/[projectId]/files/[fileId] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const { projectId, fileId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await guardProject(projectId, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const file = await resolveFile(projectId, fileId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(serialize(file));
}

/**
 * PUT /api/projects/[projectId]/files/[fileId]
 * Update name, content, parentId, or order.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const { projectId, fileId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await guardProject(projectId, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const file = await resolveFile(projectId, fileId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as Partial<{
    name: string;
    content: string;
    parentId: string | null;
    order: number;
  }>;

  const col = await projectFilesCol();
  await col.updateOne(
    { _id: file._id },
    { $set: { ...body, updatedAt: new Date() } },
  );

  // Also bump the project's updatedAt so the list re-sorts correctly
  const projectsC = await projectsCol();
  await projectsC.updateOne({ _id: toObjectId(projectId) }, { $set: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/projects/[projectId]/files/[fileId]
 * Deletes a file (or folder + all its descendants).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const { projectId, fileId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await guardProject(projectId, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const file = await resolveFile(projectId, fileId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const col = await projectFilesCol();

  if (file.type === 'file') {
    await col.deleteOne({ _id: file._id });
  } else {
    // Delete the folder and all descendants recursively by collecting IDs breadth-first
    const idsToDelete = [file._id];
    const queue = [fileId];
    while (queue.length) {
      const parentId = queue.shift()!;
      const children = await col.find({ projectId, parentId }).toArray();
      for (const child of children) {
        idsToDelete.push(child._id);
        if (child.type === 'folder') queue.push(child._id.toHexString());
      }
    }
    await col.deleteMany({ _id: { $in: idsToDelete } });
  }

  return NextResponse.json({ ok: true });
}
