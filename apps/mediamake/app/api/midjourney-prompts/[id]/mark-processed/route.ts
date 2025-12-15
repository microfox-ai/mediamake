import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { updateGenerationProgress } from '@/app/ai/agents/midjourney/helpers';

// POST /api/midjourney-prompts/[id]/mark-processed - Mark a prompt as processed
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { promptIndex } = body;

    if (typeof promptIndex !== 'number' || promptIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid promptIndex' },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const collection = db.collection('midjourneyPrompts');

    const objectId = new ObjectId(id);
    
    // Get the current record
    const record = await collection.findOne({ _id: objectId });
    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 },
      );
    }

    // Get current generatedIndexes or initialize as empty array
    const currentGeneratedIndexes = record.generatedIndexes || [];
    
    // Add the promptIndex if it's not already there
    const updatedGeneratedIndexes = Array.from(
      new Set([...currentGeneratedIndexes, promptIndex])
    ).sort((a, b) => a - b);

    // Update the record using the helper function
    const updatedRecord = await updateGenerationProgress(
      objectId,
      updatedGeneratedIndexes,
    );

    if (!updatedRecord) {
      return NextResponse.json(
        { error: 'Failed to update record' },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error('Error marking prompt as processed:', error);
    return NextResponse.json(
      { error: 'Failed to mark prompt as processed' },
      { status: 500 },
    );
  }
}

