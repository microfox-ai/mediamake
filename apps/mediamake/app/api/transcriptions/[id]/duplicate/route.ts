import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';
import crypto from 'crypto';

// POST /api/transcriptions/[id]/duplicate - Duplicate a transcription
export async function POST(
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

    // Find the original transcription
    const original = await collection.findOne({ _id: new ObjectId(id) });

    if (!original) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 },
      );
    }

    const now = new Date();

    // Generate a unique assemblyId for the duplicate to avoid unique index conflicts
    // Format: duplicate-{timestamp}-{random}
    const uniqueAssemblyId = `duplicate-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    // Create a copy of the transcription with new timestamps and modified title
    // Spread original but exclude _id and assemblyId
    const { _id, assemblyId, ...originalData } = original;

    const duplicate: Omit<Transcription, '_id'> = {
      ...originalData,
      title: original.title ? `${original.title} (Copy)` : 'Untitled Transcription (Copy)',
      assemblyId: uniqueAssemblyId, // Use generated unique ID
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(duplicate);

    // Fetch the created document
    const createdTranscription = await collection.findOne({
      _id: result.insertedId,
    });

    return NextResponse.json(
      { 
        success: true, 
        transcription: createdTranscription,
        message: 'Transcription duplicated successfully' 
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error duplicating transcription:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate transcription' },
      { status: 500 },
    );
  }
}

