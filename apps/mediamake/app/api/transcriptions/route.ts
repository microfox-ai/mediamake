import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import {
  Transcription,
  CreateTranscriptionRequest,
  TranscriptionListResponse,
  TranscriptionFilters,
  TranscriptionListItem,
} from '@/app/types/transcription';

// GET /api/transcriptions - List transcriptions with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = req.headers.get('x-client-id') || undefined;
    // Parse query parameters
    const filters: TranscriptionFilters = {
      clientId,
      status: searchParams.get('status') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      language: searchParams.get('language') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy:
        (searchParams.get('sortBy') as 'createdAt' | 'updatedAt') ||
        'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      fields: searchParams.get('fields') || undefined,
    };

    const searchQuery = searchParams.get('search') || undefined;

    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

    // Build query
    const query: any = {};
    if (filters.clientId) query.clientId = filters.clientId;
    if (filters.status) query.status = filters.status;
    if (filters.language) query.language = filters.language;
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }
    
    // Add search query to filter by title, description, keywords, or tags
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { keywords: { $regex: searchQuery, $options: 'i' } },
        { tags: { $regex: searchQuery, $options: 'i' } },
        { audioUrl: { $regex: searchQuery, $options: 'i' } },
        { language: { $regex: searchQuery, $options: 'i' } },
      ];
    }
    // Calculate pagination
    const skip = (filters.page! - 1) * filters.limit!;
    const sort: any = {};
    sort[filters.sortBy!] = filters.sortOrder === 'asc' ? 1 : -1;

    // Build projection for field selection
    let projection: any = {};
    if (filters.fields) {
      const fields = filters.fields.split(',').map(f => f.trim());
      fields.forEach(field => {
        projection[field] = 1;
      });
    } else {
      // Default lightweight fields for list view
      projection = {
        _id: 1,
        clientId: 1,
        assemblyId: 1,
        audioUrl: 1,
        language: 1,
        status: 1,
        tags: 1,
        title: 1,
        description: 1,
        keywords: 1,
        createdAt: 1,
        updatedAt: 1,
        error: 1,
        'processingData.step1.rawText': 1,
      };
    }

    // Execute query
    const [transcriptions, total] = await Promise.all([
      collection
        .find(query, { projection })
        .sort(sort)
        .skip(skip)
        .limit(filters.limit!)
        .toArray(),
      collection.countDocuments(query),
    ]);

    const response: TranscriptionListResponse = {
      transcriptions,
      total,
      page: filters.page!,
      limit: filters.limit!,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcriptions' },
      { status: 500 },
    );
  }
}

// POST /api/transcriptions - Create a new transcription
export async function POST(req: NextRequest) {
  try {
    const clientId = req.headers.get('x-client-id') || undefined;
    const body: CreateTranscriptionRequest = await req.json();

    // Validate required fields
    if (!body.assemblyId || !body.audioUrl) {
      return NextResponse.json(
        { error: 'assemblyId and audioUrl are required' },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

    // Check if transcription with this assemblyId already exists
    const existing = await collection.findOne({ assemblyId: body.assemblyId });
    if (existing) {
      return NextResponse.json(
        { error: 'Transcription with this assemblyId already exists' },
        { status: 409 },
      );
    }

    const now = new Date();
    const transcription: Omit<Transcription, '_id'> = {
      clientId,
      assemblyId: body.assemblyId,
      audioUrl: body.audioUrl,
      language: body.language,
      status: body.status || 'processing',
      tags: body.tags || [],
      title: body.title,
      description: body.description,
      keywords: body.keywords || [],
      captions: body.captions || [],
      processingData: body.processingData || {},
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(transcription);

    // Fetch the created document
    const createdTranscription = await collection.findOne({
      _id: result.insertedId,
    });

    return NextResponse.json(
      { success: true, transcription: createdTranscription },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating transcription:', error);
    return NextResponse.json(
      { error: 'Failed to create transcription' },
      { status: 500 },
    );
  }
}
