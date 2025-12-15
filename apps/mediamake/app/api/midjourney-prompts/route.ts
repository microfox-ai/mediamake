import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { MidjourneyPromptRecord } from '@/app/ai/agents/midjourney/helpers';

// GET /api/midjourney-prompts - List prompts with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

    const db = await getDatabase();
    const collection =
      db.collection<MidjourneyPromptRecord>('midjourneyPrompts');

    // Build query
    const query: any = {};

    // Search by title
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Filter by tags
    if (tags.length > 0) {
      query.tags = { $in: tags };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Projection to exclude prompts array and inputParams (only fetch basic info)
    const projection = {
      _id: 1,
      title: 1,
      tags: 1,
      createdAt: 1,
      updatedAt: 1,
      isGenerated: 1,
      generationProgress: 1,
      //   generatedIndexes: 1,
      // Exclude prompts array and inputParams for faster loading
    };

    // Execute query
    const [records, total] = await Promise.all([
      collection
        .find(query, { projection })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching midjourney prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch midjourney prompts' },
      { status: 500 },
    );
  }
}
