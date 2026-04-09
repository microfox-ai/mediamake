import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  projectAgentsCol,
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

async function resolveAgent(projectId: string, agentId: string) {
  if (!isValidId(agentId)) return null;
  const col = await projectAgentsCol();
  return col.findOne({ _id: toObjectId(agentId), projectId });
}

/** PUT /api/projects/[projectId]/agents/[agentId] */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; agentId: string }> },
) {
  const { projectId, agentId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canEditProject(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const agent = await resolveAgent(projectId, agentId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Partial<{
    name: string;
    prompt: string;
  }>;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === 'string') update.name = body.name.trim();
  if (typeof body.prompt === 'string') update.prompt = body.prompt;

  const col = await projectAgentsCol();
  await col.updateOne({ _id: agent._id }, { $set: update });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/projects/[projectId]/agents/[agentId] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; agentId: string }> },
) {
  const { projectId, agentId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canEditProject(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const agent = await resolveAgent(projectId, agentId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const col = await projectAgentsCol();
  await col.deleteOne({ _id: agent._id });
  return NextResponse.json({ ok: true });
}
