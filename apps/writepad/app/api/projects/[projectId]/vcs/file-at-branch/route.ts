import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  hasAccess,
  isValidId,
  toObjectId,
} from '@/lib/db/collections';
import { getBranchSnapshot } from '../_lib';

async function guardProject(projectId: string, clientId: string) {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  const project = await col.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId)) return null;
  return project;
}

/**
 * GET /api/projects/[projectId]/vcs/file-at-branch?branch=X&fileId=Y
 * Returns the file content at the HEAD of the given branch.
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

  const url = new URL(req.url);
  const branch = url.searchParams.get('branch');
  const fileId = url.searchParams.get('fileId');
  const filePath = url.searchParams.get('filePath'); // alternative: lookup by name

  if (!branch) return NextResponse.json({ error: 'branch required' }, { status: 400 });
  if (!fileId && !filePath) return NextResponse.json({ error: 'fileId or filePath required' }, { status: 400 });

  const snapshot = await getBranchSnapshot(projectId, branch);

  if (fileId) {
    const file = snapshot.get(fileId);
    if (!file) return NextResponse.json({ found: false, content: null });
    return NextResponse.json({ found: true, fileId, name: file.name, content: file.content });
  }

  // Lookup by file name/path (partial match)
  for (const [fid, file] of snapshot.entries()) {
    if (file && file.name === filePath) {
      return NextResponse.json({ found: true, fileId: fid, name: file.name, content: file.content });
    }
  }

  return NextResponse.json({ found: false, content: null });
}
