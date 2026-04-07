import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  hasAccess,
  isOwner,
  isValidId,
  toObjectId,
} from '@/lib/db/collections';

async function resolveProject(projectId: string) {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  return col.findOne({ _id: toObjectId(projectId) });
}

/** GET /api/projects/[projectId]/members */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await resolveProject(projectId);
  if (!project || !hasAccess(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ownerId: project.ownerId,
    members: project.members,
  });
}

/** POST /api/projects/[projectId]/members — add a member (owner only) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await resolveProject(projectId);
  if (!project || !hasAccess(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isOwner(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as { clientId?: string; role?: 'editor' | 'viewer' };
  if (!body.clientId?.trim())
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  if (body.clientId === clientId)
    return NextResponse.json({ error: 'Cannot add yourself as a member' }, { status: 400 });

  const role: 'editor' | 'viewer' = body.role === 'viewer' ? 'viewer' : 'editor';

  const col = await projectsCol();
  // Remove existing entry for this clientId first, then push new one
  await col.updateOne(
    { _id: project._id },
    {
      $pull: { members: { clientId: body.clientId } } as never,
    },
  );
  await col.updateOne(
    { _id: project._id },
    {
      $push: { members: { clientId: body.clientId, role } } as never,
      $set: { updatedAt: new Date() },
    },
  );

  return NextResponse.json({ ok: true });
}

/** DELETE /api/projects/[projectId]/members?clientId=xxx — remove a member (owner only) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await resolveProject(projectId);
  if (!project || !hasAccess(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isOwner(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const targetClientId = req.nextUrl.searchParams.get('clientId');
  if (!targetClientId)
    return NextResponse.json({ error: 'clientId query param required' }, { status: 400 });

  const col = await projectsCol();
  await col.updateOne(
    { _id: project._id },
    {
      $pull: { members: { clientId: targetClientId } } as never,
      $set: { updatedAt: new Date() },
    },
  );

  return NextResponse.json({ ok: true });
}
