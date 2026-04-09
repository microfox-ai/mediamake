import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  projectsCol,
  projectAgentsCol,
  hasAccess,
  canEditProject,
  isValidId,
  toObjectId,
  serialize,
} from '@/lib/db/collections';
import { LOCAL_AGENT_TEMPLATES } from '@/lib/agent-templates';

async function guardProject(projectId: string, clientId: string) {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  const project = await col.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId)) return null;
  return project;
}

/** GET /api/projects/[projectId]/agents */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const col = await projectAgentsCol();
  const projectAgents = await col
    .find({ projectId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  return NextResponse.json({
    localAgents: LOCAL_AGENT_TEMPLATES,
    projectAgents: projectAgents.map(serialize),
    canEdit: canEditProject(project, clientId),
  });
}

/** POST /api/projects/[projectId]/agents */
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

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    prompt?: string;
    baseAgentId?: string;
  };
  if (!body.name?.trim())
    return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const now = new Date();
  const col = await projectAgentsCol();
  const result = await col.insertOne({
    _id: new ObjectId(),
    projectId,
    name: body.name.trim(),
    prompt: body.prompt?.trim() ?? '',
    baseAgentId: body.baseAgentId?.trim() || undefined,
    createdBy: clientId,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: result.insertedId.toHexString() }, { status: 201 });
}
