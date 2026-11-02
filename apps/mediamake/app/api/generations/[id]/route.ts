import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { refFromInput } from '@/lib/generations';
import { generationsAccess } from '@/lib/generations/access';
import { parsePatch, toGeneration } from '@/lib/generations/db';
import { getGenerationsCollection } from '../model';

// PATCH /api/generations/[id] - { rating?, note?, usedIn?, libraryItem? }: rating and libraryItem replace (null clears),
// note is appended, usedIn slugs are added. [id] is the take's id, or its ref (a Suno song id; ?tool= for another tool).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const clientId = getClientId(request);
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = parsePatch(await request.json().catch(() => null), clientId, new Date().toISOString());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const collection = await getGenerationsCollection();
    const tool = request.nextUrl.searchParams.get('tool')?.trim().toLowerCase() || 'suno';
    const byId = /^[a-f0-9]{24}$/i.test(id) ? await collection.findOne({ _id: new ObjectId(id) }, { projection: { projectId: 1 } }) : null;
    const take = byId ?? (await collection.findOne({ tool, ref: refFromInput(id) }, { projection: { projectId: 1 } }));
    const access = take ? await generationsAccess(await getDatabase(), take.projectId, clientId, 'write') : null;
    // Someone the project isn't shared with can't tell the take exists.
    if (!take || !access || (!access.ok && access.status === 404)) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const updated = await collection.findOneAndUpdate({ _id: take._id }, parsed.value, { returnDocument: 'after' });
    if (!updated) return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    return NextResponse.json(toGeneration(updated));
  } catch (error) {
    console.error('Error updating generation:', error);
    return NextResponse.json({ error: 'Failed to update generation' }, { status: 500 });
  }
}
