import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Caption, CaptionsDocument } from '@/app/types/transcription';

export interface CreateCaptionsRequest {
  title?: string;
  description?: string;
  captions?: Caption[];
  sourceTranscriptionId?: string;
  sourceCaptionsId?: string;
  projectId?: string;
}

// GET /api/captions - Search caption versions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = req.headers.get('x-client-id') || undefined;
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10)),
    );
    const sourceTranscriptionId =
      searchParams.get('sourceTranscriptionId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;

    const db = await getDatabase();
    const collection = db.collection<CaptionsDocument>('captions');

    const query: Record<string, unknown> = {};
    if (clientId) query.clientId = clientId;
    if (sourceTranscriptionId) query.sourceTranscriptionId = sourceTranscriptionId;
    if (projectId) query.projectId = projectId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [captions, total] = await Promise.all([
      collection
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({ captions, total, page, limit });
  } catch (error) {
    console.error('Error fetching captions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch captions' },
      { status: 500 },
    );
  }
}

// POST /api/captions - Create a caption version (copy of a transcription or caption)
export async function POST(req: NextRequest) {
  try {
    const clientId = req.headers.get('x-client-id') || undefined;
    const body: CreateCaptionsRequest = await req.json();

    const db = await getDatabase();
    const collection = db.collection<CaptionsDocument>('captions');
    const now = new Date();

    const doc: Omit<CaptionsDocument, '_id'> = {
      clientId,
      projectId: body.projectId,
      title: body.title?.trim() || 'Untitled Captions',
      description: body.description ?? '',
      captions: Array.isArray(body.captions) ? body.captions : [],
      sourceTranscriptionId: body.sourceTranscriptionId || undefined,
      sourceCaptionsId: body.sourceCaptionsId || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc as CaptionsDocument);
    const created = await collection.findOne({ _id: result.insertedId });

    return NextResponse.json({ success: true, captions: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating captions:', error);
    return NextResponse.json(
      { error: 'Failed to create captions' },
      { status: 500 },
    );
  }
}
