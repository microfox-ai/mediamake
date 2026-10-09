import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { Caption, CaptionsDocument } from '@/app/types/transcription';

interface UpdateCaptionsRequest {
  title?: string;
  description?: string;
  captions?: Caption[];
}

// GET /api/captions/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid captions ID' }, { status: 400 });
    }

    const db = await getDatabase();
    const doc = await db
      .collection<CaptionsDocument>('captions')
      .findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ error: 'Captions not found' }, { status: 404 });
    }

    return NextResponse.json({ id, captions: { ...doc, _id: id } });
  } catch (error) {
    console.error('Error fetching captions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch captions' },
      { status: 500 },
    );
  }
}

// PATCH /api/captions/[id] - Sync title, description, and caption lines
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid captions ID' }, { status: 400 });
    }

    const body: UpdateCaptionsRequest = await req.json();
    const update: Partial<CaptionsDocument> = { updatedAt: new Date() };

    if (typeof body.title === 'string') update.title = body.title;
    if (typeof body.description === 'string') update.description = body.description;
    if (Array.isArray(body.captions)) update.captions = body.captions;

    if (Object.keys(update).length === 1) {
      return NextResponse.json(
        { error: 'Nothing to update' },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const collection = db.collection<CaptionsDocument>('captions');
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Captions not found' }, { status: 404 });
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json({
      success: true,
      id,
      captions: updated ? { ...updated, _id: id } : { _id: id },
    });
  } catch (error) {
    console.error('Error updating captions:', error);
    return NextResponse.json(
      { error: 'Failed to update captions' },
      { status: 500 },
    );
  }
}
