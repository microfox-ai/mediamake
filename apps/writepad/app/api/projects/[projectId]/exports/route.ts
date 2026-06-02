import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  projectsCol,
  projectExportsCol,
  hasAccess,
  isValidId,
  toObjectId,
} from '@/lib/db/collections';

/** Maximum stored content size: 10 MB */
const MAX_CONTENT_BYTES = 10 * 1024 * 1024;

async function guardProject(projectId: string, clientId: string) {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  const project = await col.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId)) return null;
  return project;
}

/**
 * POST /api/projects/[projectId]/exports
 *
 * Body: { format: 'pdf' | 'docx' | 'epub', content: string, fileName: string }
 *   - content for pdf/docx: full HTML document string
 *   - content for epub: base64-encoded EPUB zip bytes
 *
 * Returns: { shareUrl: string, token: string }
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

  let body: { format: string; content: string; fileName: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { format, content, fileName } = body;

  if (!['pdf', 'docx', 'epub'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }
  if (typeof content !== 'string' || !content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }
  if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES) {
    return NextResponse.json({ error: 'Content too large' }, { status: 413 });
  }

  const shareToken = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const col = await projectExportsCol();
  await col.insertOne({
    _id: new ObjectId(),
    projectId,
    shareToken,
    format: format as 'pdf' | 'docx' | 'epub',
    content,
    fileName: fileName || `${project.name || 'export'}.${format === 'docx' ? 'doc' : format}`,
    projectName: project.name,
    createdAt: now,
    expiresAt,
  });

  // Ensure TTL index exists (idempotent — MongoDB ignores duplicate index creation)
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });

  const origin = req.nextUrl.origin;
  const shareUrl = `${origin}/share/${shareToken}`;

  return NextResponse.json({ shareUrl, token: shareToken });
}
