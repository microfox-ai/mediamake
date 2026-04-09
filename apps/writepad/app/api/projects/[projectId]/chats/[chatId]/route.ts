import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  chatSessionsCol,
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

async function resolveChat(projectId: string, chatId: string, userId: string) {
  if (!isValidId(chatId)) return null;
  const col = await chatSessionsCol();
  // Users can only access their own chats
  return col.findOne({ _id: toObjectId(chatId), projectId, userId });
}

/** GET /api/projects/[projectId]/chats/[chatId] — full chat including messages */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; chatId: string }> },
) {
  const { projectId, chatId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canEditProject(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const chat = await resolveChat(projectId, chatId, clientId);
  if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(serialize(chat));
}

/**
 * PUT /api/projects/[projectId]/chats/[chatId]
 * Save messages + messageMeta after an AI turn, and optionally update the title.
 * Body: { title?: string; messages?: unknown[]; messageMeta?: Record<string, unknown> }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; chatId: string }> },
) {
  const { projectId, chatId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canEditProject(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const chat = await resolveChat(projectId, chatId, clientId);
  if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    title?: string;
    messages?: unknown[];
    messageMeta?: Record<string, unknown>;
  };

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) update.title = body.title;
  if (body.messages !== undefined) update.messages = body.messages;
  if (body.messageMeta !== undefined) update.messageMeta = body.messageMeta;

  const col = await chatSessionsCol();
  await col.updateOne({ _id: chat._id }, { $set: update });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/projects/[projectId]/chats/[chatId] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; chatId: string }> },
) {
  const { projectId, chatId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await guardProject(projectId, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const chat = await resolveChat(projectId, chatId, clientId);
  if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const col = await chatSessionsCol();
  await col.deleteOne({ _id: chat._id });

  return NextResponse.json({ ok: true });
}
