import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  continuityReportsCol,
  hasAccess,
  isOwner,
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
 * GET /api/projects/[projectId]/continuity-checks/[reportId]
 *
 * Returns one full continuity report with the issue array.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; reportId: string }> },
) {
  const { projectId, reportId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await guardProject(projectId, clientId)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isValidId(reportId)) return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });

  const col = await continuityReportsCol();
  const doc = await col.findOne({ _id: toObjectId(reportId), projectId });
  if (!doc) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  return NextResponse.json({
    report: {
      id: doc._id.toHexString(),
      projectId: doc.projectId,
      jobId: doc.jobId,
      triggeredBy: doc.triggeredBy,
      scope: doc.scope,
      modelId: doc.modelId,
      status: doc.status,
      issues: doc.issues,
      stats: doc.stats,
      errorMessage: doc.errorMessage,
      shardErrors: doc.shardErrors,
      createdAt: doc.createdAt.toISOString(),
      completedAt: doc.completedAt.toISOString(),
    },
  });
}

/**
 * DELETE /api/projects/[projectId]/continuity-checks/[reportId]
 *
 * Owner-only deletion of a past report.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; reportId: string }> },
) {
  const { projectId, reportId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isOwner(project, clientId))
    return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  if (!isValidId(reportId)) return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });

  const col = await continuityReportsCol();
  const result = await col.deleteOne({ _id: toObjectId(reportId), projectId });
  if (result.deletedCount === 0)
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
