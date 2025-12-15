import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { MidjourneyPromptRecord } from '@/app/ai/agents/midjourney/helpers';

// GET /api/midjourney-prompts/[id] - Get a single prompt record with all prompts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const collection =
      db.collection<MidjourneyPromptRecord>('midjourneyPrompts');

    const objectId = new ObjectId(id);
    const record = await collection.findOne({ _id: objectId });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error fetching midjourney prompt record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch midjourney prompt record' },
      { status: 500 },
    );
  }
}
