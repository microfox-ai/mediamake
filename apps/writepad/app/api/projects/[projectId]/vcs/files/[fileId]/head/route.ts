import { NextRequest, NextResponse } from 'next/server';
import { ensureMainBranch, ensureVcsIndexes, getBranch, getBranchSnapshot, guardProject, requireClientId } from '../../../_lib';

/** GET /api/projects/[projectId]/vcs/files/[fileId]/head?branch=main */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const { projectId, fileId } = await params;
  const clientId = requireClientId(req);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureVcsIndexes();
  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const branchName = req.nextUrl.searchParams.get('branch')?.trim() || 'main';
  await ensureMainBranch(projectId, clientId);
  const branch = await getBranch(projectId, branchName);
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

  const snapshot = (await getBranchSnapshot(projectId, branchName)).get(fileId) ?? null;
  return NextResponse.json({
    fileId,
    branchName,
    snapshot,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
