import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

type MemberRole = 'editor' | 'viewer';

interface ProjectMember {
  clientId: string;
  role: MemberRole;
  addedAt: string;
}

async function getProjectAsOwner(projectId: string, ownerId: string) {
  const db = await getDatabase();
  try {
    return await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
      clientId: ownerId,
    });
  } catch {
    return null;
  }
}

// GET /api/project/share?projectId=...
// Returns the member list for a project.
// Owners get full management access; shared members get a read-only view of who else has access.
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });

  const db = await getDatabase();

  // Try as owner first
  let project = await getProjectAsOwner(projectId, clientId);
  let isOwner = !!project;

  // Fall back to member lookup so shared users can also see the list
  if (!project) {
    try {
      project = await db.collection('projects').findOne({
        _id: new ObjectId(projectId),
        'sharedWith.clientId': clientId,
      });
    } catch {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }
  }

  if (!project) return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });

  const members = (project.sharedWith as ProjectMember[]) ?? [];
  const myRole = isOwner
    ? 'owner'
    : (members.find((m) => m.clientId === clientId)?.role ?? null);

  return NextResponse.json({ members, isOwner, myRole });
}

// POST /api/project/share
// Body: { projectId, clientId, role }
export async function POST(req: NextRequest) {
  const ownerId = req.headers.get('x-client-id');
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { projectId, clientId: memberId, role } = body as {
    projectId: string;
    clientId: string;
    role: MemberRole;
  };

  if (!projectId || !memberId || !role)
    return NextResponse.json({ error: 'projectId, clientId, and role are required' }, { status: 400 });

  if (!['editor', 'viewer'].includes(role))
    return NextResponse.json({ error: "role must be 'editor' or 'viewer'" }, { status: 400 });

  if (memberId === ownerId)
    return NextResponse.json({ error: 'Cannot share a project with yourself' }, { status: 400 });

  const project = await getProjectAsOwner(projectId, ownerId);
  if (!project) return NextResponse.json({ error: 'Project not found or not owned by you' }, { status: 404 });

  const existing = ((project.sharedWith as ProjectMember[]) ?? []).find((m) => m.clientId === memberId);
  if (existing)
    return NextResponse.json({ error: 'User is already a member of this project' }, { status: 409 });

  const member: ProjectMember = {
    clientId: memberId,
    role,
    addedAt: new Date().toISOString(),
  };

  const db = await getDatabase();
  await db.collection('projects').updateOne(
    { _id: new ObjectId(projectId) },
    {
      $push: { sharedWith: member } as any,
      $set: { updatedAt: new Date() },
    },
  );

  return NextResponse.json({ member }, { status: 201 });
}

// DELETE /api/project/share
// Body: { projectId, clientId }
export async function DELETE(req: NextRequest) {
  const ownerId = req.headers.get('x-client-id');
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { projectId, clientId: memberId } = body as { projectId: string; clientId: string };

  if (!projectId || !memberId)
    return NextResponse.json({ error: 'projectId and clientId are required' }, { status: 400 });

  const project = await getProjectAsOwner(projectId, ownerId);
  if (!project) return NextResponse.json({ error: 'Project not found or not owned by you' }, { status: 404 });

  const db = await getDatabase();
  await db.collection('projects').updateOne(
    { _id: new ObjectId(projectId) },
    {
      $pull: { sharedWith: { clientId: memberId } } as any,
      $set: { updatedAt: new Date() },
    },
  );

  return NextResponse.json({ success: true });
}
