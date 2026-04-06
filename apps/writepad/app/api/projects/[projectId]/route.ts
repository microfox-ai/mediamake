import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  projectFilesCol,
  chatSessionsCol,
  serialize,
  hasAccess,
  isOwner,
  isValidId,
  toObjectId,
} from '@/lib/db/collections';

async function resolveProject(projectId: string, clientId: string) {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  return col.findOne({ _id: toObjectId(projectId) });
}

/** GET /api/projects/[projectId] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await resolveProject(projectId, clientId);
  if (!project || !hasAccess(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(serialize(project));
}

/** PUT /api/projects/[projectId] — update name/description/type (owner only) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await resolveProject(projectId, clientId);
  if (!project || !hasAccess(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isOwner(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as Partial<{ name: string; description: string; type: string }>;
  const col = await projectsCol();
  await col.updateOne(
    { _id: project._id },
    { $set: { ...body, updatedAt: new Date() } },
  );

  return NextResponse.json({ ok: true });
}

/** DELETE /api/projects/[projectId] — owner only, cascades files + chats */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await resolveProject(projectId, clientId);
  if (!project || !isOwner(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const id = project._id.toHexString();
  const [col, filesCol, chatsCol] = await Promise.all([
    projectsCol(),
    projectFilesCol(),
    chatSessionsCol(),
  ]);
  await Promise.all([
    col.deleteOne({ _id: project._id }),
    filesCol.deleteMany({ projectId: id }),
    chatsCol.deleteMany({ projectId: id }),
  ]);

  return NextResponse.json({ ok: true });
}
