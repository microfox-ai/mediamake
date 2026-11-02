import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { generationsAccess } from '@/lib/generations/access';
import { parsePreset, toPreset } from '@/lib/generations/db';
import { getGenerationPresetsCollection } from '../model';

async function listPresets(projectId: string, tool?: string) {
  const collection = await getGenerationPresetsCollection();
  const docs = await collection
    .find({ projectId, ...(tool ? { tool } : {}) })
    .sort({ name: 1 })
    .toArray();
  return docs.map(toPreset);
}

// GET /api/generations/presets?projectId=&tool= - the project's presets, by name
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const projectId = params.get('projectId');
  try {
    const db = await getDatabase();
    const access = await generationsAccess(db, projectId, getClientId(request), 'read');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    return NextResponse.json({ presets: await listPresets(projectId!, params.get('tool')?.trim().toLowerCase() || undefined) });
  } catch (error) {
    console.error('Error listing generation presets:', error);
    return NextResponse.json({ error: 'Failed to list presets' }, { status: 500 });
  }
}

// POST /api/generations/presets?projectId= - { name, tool?, styles, excludeStyles, settings, id? }: saves the preset with
// that name (per tool), or with an id replaces that preset, renaming it. Returns every preset of the project.
export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const body = await request.json().catch(() => null);
    const projectId = request.nextUrl.searchParams.get('projectId') ?? (typeof body?.projectId === 'string' ? body.projectId : null);
    const db = await getDatabase();
    const access = await generationsAccess(db, projectId, clientId, 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const parsed = parsePreset(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { id, ...preset } = parsed.value;
    const collection = await getGenerationPresetsCollection();
    const updatedAt = new Date().toISOString();
    try {
      if (id) {
        const result = await collection.updateOne({ _id: new ObjectId(id), projectId: projectId! }, { $set: { ...preset, updatedAt } });
        if (!result.matchedCount) return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
      } else {
        const { styles, excludeStyles, settings } = preset;
        await collection.updateOne(
          { projectId: projectId!, tool: preset.tool, name: preset.name },
          { $set: { styles, excludeStyles, settings, updatedAt }, $setOnInsert: { createdBy: clientId! } },
          { upsert: true },
        );
      }
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return NextResponse.json({ error: `A preset called ${preset.name} already exists` }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ presets: await listPresets(projectId!) });
  } catch (error) {
    console.error('Error saving generation preset:', error);
    return NextResponse.json({ error: 'Failed to save preset' }, { status: 500 });
  }
}

// DELETE /api/generations/presets?projectId=&id= - removes a preset, returns the rest
export async function DELETE(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const projectId = params.get('projectId');
  const id = params.get('id');
  try {
    const db = await getDatabase();
    const access = await generationsAccess(db, projectId, getClientId(request), 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!id || !/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const collection = await getGenerationPresetsCollection();
    await collection.deleteOne({ _id: new ObjectId(id), projectId: projectId! });
    return NextResponse.json({ presets: await listPresets(projectId!) });
  } catch (error) {
    console.error('Error deleting generation preset:', error);
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}
