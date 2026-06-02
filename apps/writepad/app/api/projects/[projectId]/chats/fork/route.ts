import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  projectsCol,
  chatSessionsCol,
  hasAccess,
  canEditProject,
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
 * POST /api/projects/[projectId]/chats/fork
 *
 * Creates a new chat session pre-populated with a slice of messages (a fork).
 * - If `targetUserId` is omitted the fork is owned by the calling user.
 * - If `targetUserId` is provided the fork is owned by that user; they must
 *   already be a project member (owner or member[]).
 *
 * Body: { title: string; messages: unknown[]; messageMeta: Record<string, unknown>; targetUserId?: string }
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
    title?: string;
    messages?: unknown[];
    messageMeta?: Record<string, unknown>;
    targetUserId?: string;
  };

  // Resolve target user — defaults to caller
  const targetUserId = body.targetUserId?.trim() || clientId;

  // Validate target is a project member (or the caller itself)
  if (targetUserId !== clientId) {
    const isProjectMember =
      project.ownerId === targetUserId ||
      project.members.some((m) => m.clientId === targetUserId);
    if (!isProjectMember)
      return NextResponse.json({ error: 'Target user is not a project member' }, { status: 403 });
  }

  const col = await chatSessionsCol();
  const now = new Date();
  const result = await col.insertOne({
    _id: new ObjectId(),
    projectId,
    userId: targetUserId,
    title: body.title?.trim() || 'Forked Chat',
    messages: body.messages ?? [],
    messageMeta: body.messageMeta ?? {},
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: result.insertedId.toHexString() }, { status: 201 });
}
