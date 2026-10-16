import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';

const COLLECTION = 'actionChoices';
const MAX_VALUES_BYTES = 64 * 1024;

const strip = ({ _id, clientId, ...rest }: Record<string, unknown>) => rest;

function requireSignedIn(request: NextRequest) {
  const clientId = getClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

// GET /api/action-choices?actionId=… — shared choices for one choice action
export async function GET(request: NextRequest) {
  const denied = requireSignedIn(request);
  if (denied) return denied;
  const actionId = new URL(request.url).searchParams.get('actionId');
  if (!actionId) {
    return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
  }
  try {
    const db = await getDatabase();
    const choices = await db
      .collection(COLLECTION)
      .find({ actionId })
      .sort({ createdAt: 1 })
      .toArray();
    return NextResponse.json(choices.map(strip));
  } catch (error) {
    console.error('Error fetching action choices:', error);
    return NextResponse.json({ error: 'Failed to fetch choices' }, { status: 500 });
  }
}

// POST /api/action-choices — save a new shared choice
export async function POST(request: NextRequest) {
  const denied = requireSignedIn(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const actionId = typeof body?.actionId === 'string' ? body.actionId : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const values = body?.values;
    if (!actionId || !name) {
      return NextResponse.json({ error: 'actionId and name are required' }, { status: 400 });
    }
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      return NextResponse.json({ error: 'values must be an object' }, { status: 400 });
    }
    if (JSON.stringify(values).length > MAX_VALUES_BYTES) {
      return NextResponse.json({ error: 'values are too large' }, { status: 413 });
    }
    const now = new Date().toISOString();
    const choice = {
      id: randomUUID(),
      actionId,
      name,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      thumbnailUrl: typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl : undefined,
      values,
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDatabase();
    await db.collection(COLLECTION).insertOne(choice);
    return NextResponse.json(choice, { status: 201 });
  } catch (error) {
    console.error('Error saving action choice:', error);
    return NextResponse.json({ error: 'Failed to save choice' }, { status: 500 });
  }
}

// DELETE /api/action-choices?id=… — remove a shared choice
export async function DELETE(request: NextRequest) {
  const denied = requireSignedIn(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  try {
    const db = await getDatabase();
    const result = await db.collection(COLLECTION).deleteOne({ id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Choice not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting action choice:', error);
    return NextResponse.json({ error: 'Failed to delete choice' }, { status: 500 });
  }
}
