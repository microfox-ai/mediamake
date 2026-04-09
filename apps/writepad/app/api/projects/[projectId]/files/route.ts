import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  projectsCol,
  projectFilesCol,
  hasAccess,
  canEditProject,
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

/**
 * GET /api/projects/[projectId]/files
 * Returns a flat list of all file/folder nodes for this project, ordered by
 * (parentId, order). The client builds the tree from this list.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await guardProject(projectId, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const col = await projectFilesCol();
  const files = await col
    .find({ projectId })
    .sort({ parentId: 1, order: 1, name: 1 })
    .toArray();

  return NextResponse.json(files.map(serialize));
}

/**
 * POST /api/projects/[projectId]/files
 * Create a new file or folder.
 * Body: { name, type: 'file'|'folder', parentId?: string|null }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canEditProject(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as {
    name?: string;
    type?: 'file' | 'folder';
    parentId?: string | null;
  };

  if (!body.name?.trim())
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (body.type !== 'file' && body.type !== 'folder')
    return NextResponse.json({ error: 'type must be file or folder' }, { status: 400 });

  const parentId = body.parentId ?? null;

  // Determine next order value within the parent
  const col = await projectFilesCol();
  const lastSibling = await col.findOne(
    { projectId, parentId },
    { sort: { order: -1 } },
  );
  const order = lastSibling ? lastSibling.order + 1 : 0;

  const now = new Date();
  const result = await col.insertOne({
    _id: new ObjectId(),
    projectId,
    name: body.name.trim(),
    type: body.type,
    parentId,
    content: '',
    draft: null,
    order,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: result.insertedId.toHexString() }, { status: 201 });
}
