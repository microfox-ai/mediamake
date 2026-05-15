import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  projectsCol,
  projectFilesCol,
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

/** Build a fileId→filePath map from project files. */
async function buildPathMap(projectId: string): Promise<Record<string, string>> {
  const col = await projectFilesCol();
  const files = await col.find({ projectId }).toArray();
  // Simple flat map — does not resolve nested paths (good enough for display)
  const map: Record<string, string> = {};
  for (const f of files) map[f._id.toHexString()] = f.name;
  return map;
}

/**
 * GET /api/projects/[projectId]/comments
 * Returns all comments for the project (optionally ?fileId=xxx to filter).
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

  const fileId = req.nextUrl.searchParams.get('fileId') ?? undefined;
  const col = await projectCommentsCol();
  const query = fileId ? { projectId, fileId } : { projectId };
  const docs = await col.find(query).sort({ createdAt: -1 }).toArray();

  const pathMap = await buildPathMap(projectId);

  const comments = docs.map((d) => ({
    id: d._id.toHexString(),
    projectId: d.projectId,
    fileId: d.fileId,
    filePath: pathMap[d.fileId] ?? d.fileId,
    authorId: d.authorId,
    text: d.text,
    lineNumber: d.lineNumber,
    lineContent: d.lineContent,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return NextResponse.json({ comments });
}

/**
 * POST /api/projects/[projectId]/comments
 * Body: { fileId, text, lineNumber, lineContent }
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

  const body = await req.json() as {
    fileId?: string;
    text?: string;
    lineNumber?: number;
    lineContent?: string;
  };

  const { fileId, text, lineNumber, lineContent = '' } = body;
  if (!fileId || !text?.trim() || typeof lineNumber !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const now = new Date();
  const col = await projectCommentsCol();
  const result = await col.insertOne({
    _id: new ObjectId(),
    projectId,
    fileId,
    authorId: clientId,
    text: text.trim(),
    lineNumber,
    lineContent: lineContent.slice(0, 200),
    status: 'open',
    createdAt: now,
    updatedAt: now,
  });

  const pathMap = await buildPathMap(projectId);

  return NextResponse.json({
    comment: {
      id: result.insertedId.toHexString(),
      projectId,
      fileId,
      filePath: pathMap[fileId] ?? fileId,
      authorId: clientId,
      text: text.trim(),
      lineNumber,
      lineContent,
      status: 'open',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  }, { status: 201 });
}
