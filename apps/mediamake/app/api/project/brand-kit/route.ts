import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { applyBrandKitPatch, type BrandKit, type BrandKitPatch } from '@/lib/brand-kit';
import { brandKitAccess } from '@/lib/brand-kit/access';

// GET /api/project/brand-kit?projectId=... - the project's brand kit (null when it has none)
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  try {
    const db = await getDatabase();
    const access = await brandKitAccess(db, projectId, getClientId(request), 'read');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId!) }, { projection: { brandKit: 1 } });
    return NextResponse.json({ projectId, role: access.role, brandKit: (project?.brandKit as BrandKit | undefined) ?? null });
  } catch (error) {
    console.error('Error reading brand kit:', error);
    return NextResponse.json({ error: 'Failed to read brand kit' }, { status: 500 });
  }
}

// PUT /api/project/brand-kit - { projectId, ...BrandKitPatch }: passed fields replace, assets merge by path
export async function PUT(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const { projectId, ...patch } = (await request.json()) as BrandKitPatch & { projectId?: string };
    const db = await getDatabase();
    const access = await brandKitAccess(db, projectId ?? null, clientId, 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const projects = db.collection('projects');
    const _id = new ObjectId(projectId!);
    const project = await projects.findOne({ _id }, { projection: { brandKit: 1 } });
    const brandKit = applyBrandKitPatch(project?.brandKit as BrandKit | undefined, patch, clientId!);
    await projects.updateOne({ _id }, { $set: { brandKit, updatedAt: new Date() } });
    return NextResponse.json({ projectId, brandKit });
  } catch (error) {
    console.error('Error saving brand kit:', error);
    return NextResponse.json({ error: 'Failed to save brand kit' }, { status: 500 });
  }
}

// DELETE /api/project/brand-kit?projectId=... - remove the kit (uploaded files stay in storage)
export async function DELETE(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  try {
    const db = await getDatabase();
    const access = await brandKitAccess(db, projectId, getClientId(request), 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    await db.collection('projects').updateOne({ _id: new ObjectId(projectId!) }, { $unset: { brandKit: '' }, $set: { updatedAt: new Date() } });
    return NextResponse.json({ projectId, brandKit: null });
  } catch (error) {
    console.error('Error deleting brand kit:', error);
    return NextResponse.json({ error: 'Failed to delete brand kit' }, { status: 500 });
  }
}
