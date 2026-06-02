import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  projectCommentsCol,
  hasAccess,
  isValidId,
  toObjectId,
} from '@/lib/db/collections';

async function guardProject(projectId: string, clientId: string) {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  const project = await col.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId)) return null;
  return project;
}

/**
 * PATCH /api/projects/[projectId]/comments/[commentId]
 * Body: { text?, status? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; commentId: string }> },
) {
  const { projectId, commentId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await guardProject(projectId, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isValidId(commentId))
    return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 });

  const body = await req.json() as { text?: string; status?: string };
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (body.text != null) update.text = body.text.trim();
  if (['open', 'resolved', 'dismissed'].includes(body.status ?? '')) {
    update.status = body.status;
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const col = await projectCommentsCol();
  const result = await col.findOneAndUpdate(
    { _id: toObjectId(commentId), projectId },
    { $set: update },
    { returnDocument: 'after' },
  );

  if (!result) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  return NextResponse.json({
    comment: {
      id: result._id.toHexString(),
      text: result.text,
      status: result.status,
      updatedAt: result.updatedAt.toISOString(),
    },
  });
}

/**
 * DELETE /api/projects/[projectId]/comments/[commentId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; commentId: string }> },
) {
  const { projectId, commentId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await guardProject(projectId, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isValidId(commentId))
    return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 });

  const col = await projectCommentsCol();
  const result = await col.deleteOne({ _id: toObjectId(commentId), projectId });

  if (result.deletedCount === 0)
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
