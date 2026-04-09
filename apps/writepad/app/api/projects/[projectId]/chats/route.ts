import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
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

/**
 * GET /api/projects/[projectId]/chats
 * Returns the calling user's chat sessions for this project (most-recent first).
 * Messages are NOT included in the list response — fetch a single chat to get them.
 */
export async function GET(
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

  const col = await chatSessionsCol();
  const sessions = await col
    .find({ projectId, userId: clientId })
    .sort({ updatedAt: -1 })
    .project({ messages: 0 })  // omit messages from list
    .toArray();

  return NextResponse.json(sessions.map((session) => serialize(session as any)));
}

/**
 * POST /api/projects/[projectId]/chats
 * Create a new (empty) chat session for the calling user.
 * Body: { title?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await guardProject(projectId, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { title?: string };

  const col = await chatSessionsCol();
  const now = new Date();
  const result = await col.insertOne({
    _id: new ObjectId(),
    projectId,
    userId: clientId,
    title: body.title?.trim() || 'New Chat',
    messages: [],
    messageMeta: {},
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: result.insertedId.toHexString() }, { status: 201 });
}
