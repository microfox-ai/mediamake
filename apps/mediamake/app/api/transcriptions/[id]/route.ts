import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import {
  Transcription,
  UpdateTranscriptionRequest,
} from '@/app/types/transcription';
import { providedTranscriptionSet } from '@/app/api/transcribe/provided-transcription';

// GET /api/transcriptions/[id] - Get a specific transcription
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid transcription ID' },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

    const transcription = await collection.findOne({ _id: new ObjectId(id) });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ transcription }, { status: 200 });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcription' },
      { status: 500 },
    );
  }
}

// PATCH /api/transcriptions/[id] - Update a specific transcription
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid transcription ID' },
        { status: 400 },
      );
    }

    const body: UpdateTranscriptionRequest = await req.json();

    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.keywords !== undefined) updateData.keywords = body.keywords;
    if (body.captions !== undefined) updateData.captions = body.captions;
    if (body.processingData !== undefined)
      updateData.processingData = body.processingData;
    if (body.videos !== undefined) updateData.videos = body.videos;
    if (body.error !== undefined) updateData.error = body.error;
    if (body.audioUrl !== undefined) updateData.audioUrl = body.audioUrl;
    if (typeof body.userWrittenTranscription === 'string') {
      if (body.processingData !== undefined) {
        // Mongo rejects `processingData` and `processingData.step1.*` in one $set.
        return NextResponse.json(
          { error: 'Send userWrittenTranscription without processingData' },
          { status: 400 },
        );
      }
      Object.assign(
        updateData,
        providedTranscriptionSet(body.userWrittenTranscription.trim()),
      );
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' },
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, transcription: result },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error updating transcription:', error);
    return NextResponse.json(
      { error: 'Failed to update transcription' },
      { status: 500 },
    );
  }
}

// DELETE /api/transcriptions/[id] - Delete a specific transcription
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid transcription ID' },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, message: 'Transcription deleted' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error deleting transcription:', error);
    return NextResponse.json(
      { error: 'Failed to delete transcription' },
      { status: 500 },
    );
  }
}
