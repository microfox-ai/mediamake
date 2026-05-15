import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  hasAccess,
  isValidId,
  toObjectId,
} from '@/lib/db/collections';
import { WORKER_REGISTRY } from '@/lib/workers/registry';
import { listJobsByWorker } from '@/app/api/workflows/stores/jobStore';
import type { JobRecord } from '@/app/api/workflows/stores/jobStore';

/**
 * Project-scoped worker-runs list.
 *
 * GET /api/projects/[projectId]/worker-runs?workerId=<id>&status=<s>&limit=50
 *
 * Iterates the registered workers and pulls each one's job list from the
 * canonical `listJobsByWorker(workerId)` workflow store API (works for both
 * MongoDB and Upstash Redis adapters), then filters in-memory to jobs whose
 * `input.projectId` or `metadata.projectId` matches this project.
 *
 * Auth: requires `x-client-id` header + project access.
 *
 * This is the ONLY project-scoped endpoint we add for the workers feature —
 * triggering, status-polling, and output retrieval all use the existing
 * `/api/workflows/workers/...` endpoints via the `useWorkflowJob` hook.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isValidId(projectId)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });

  const project = await (await projectsCol()).findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const workerIdFilter = req.nextUrl.searchParams.get('workerId') ?? undefined;
  const statusFilter = req.nextUrl.searchParams.get('status') ?? undefined;
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 1),
    500,
  );

  // Determine which worker IDs to query — registered workers, optionally
  // restricted by ?workerId.
  const workerIds = workerIdFilter
    ? [workerIdFilter]
    : WORKER_REGISTRY.map((w) => w.workerId);

  // Pull jobs for each worker in parallel.
  const lists = await Promise.all(
    workerIds.map(async (wid) => {
      try {
        return await listJobsByWorker(wid);
      } catch {
        // If a worker hasn't been triggered yet, the index may be empty —
        // treat as no jobs rather than failing the whole list.
        return [] as JobRecord[];
      }
    }),
  );

  const allJobs = lists.flat();

  // Filter: only this project, optional status filter.
  const filtered = allJobs.filter((j) => {
    const meta = (j.metadata ?? {}) as Record<string, unknown>;
    const inp = (j.input ?? {}) as Record<string, unknown>;
    const matchesProject =
      meta.projectId === projectId || inp.projectId === projectId;
    if (!matchesProject) return false;
    if (statusFilter && j.status !== statusFilter) return false;
    return true;
  });

  // Sort newest first (workers may return out-of-order across calls).
  filtered.sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  );

  const runs = filtered.slice(0, limit).map((j) => ({
    jobId: j.jobId,
    workerId: j.workerId,
    status: j.status,
    progress: (j as { progress?: number }).progress,
    progressMessage: (j as { progressMessage?: string }).progressMessage,
    output: j.output,
    error: j.error,
    metadata: j.metadata,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
    completedAt: j.completedAt,
  }));

  return NextResponse.json({ runs });
}
