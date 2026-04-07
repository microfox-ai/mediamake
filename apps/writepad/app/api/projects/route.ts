import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { projectsCol, projectFilesCol, serialize } from '@/lib/db/collections';
import { buildBoilerplate } from '@/lib/boilerplate';

/** GET /api/projects — list projects the caller owns or is a member of */
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const col = await projectsCol();
  const docs = await col
    .find({ $or: [{ ownerId: clientId }, { 'members.clientId': clientId }] })
    .sort({ updatedAt: -1 })
    .toArray();

  return NextResponse.json(docs.map(serialize));
}

/** POST /api/projects — create a new project */
export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { name?: string; description?: string; type?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const col = await projectsCol();
  const now = new Date();
  const name = body.name.trim();
  const description = body.description?.trim() ?? '';
  const type = body.type?.trim() ?? 'other';

  const result = await col.insertOne({
    _id: new ObjectId(),
    name,
    description,
    type,
    ownerId: clientId,
    members: [],
    createdAt: now,
    updatedAt: now,
  });

  const projectId = result.insertedId.toHexString();

  // Seed boilerplate files (.writepad/rules.md + main content file)
  const filesCol = await projectFilesCol();
  await filesCol.insertMany(buildBoilerplate({ projectId, name, description, type }));

  return NextResponse.json({ id: projectId }, { status: 201 });
}
