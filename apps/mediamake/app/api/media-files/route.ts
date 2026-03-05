import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import {
  CreateMediaFileRequest,
  MediaFile,
  UpdateMediaFileRequest,
} from '@/app/types/media';
import { getClientId } from '@/lib/auth-utils';
import { indexAndAnalyzeImage, hasDescription } from '@/lib/sparkboard/sparkboard-lib';

// GET /api/media-files - Fetch media files with optional tag filtering
export async function GET(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const db = await getDatabase();
    const collection = db.collection('mediaFiles');

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const tags = searchParams.get('tags');
    const projectId = searchParams.get('projectId');
    const contentType = searchParams.get('contentType');
    const contentSource = searchParams.get('contentSource');
    const contentSourceUrl = searchParams.get('contentSourceUrl');
    const ids = searchParams.get('ids');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const fields = searchParams.get('fields');

    const query: any = {};
    if (clientId) query.clientId = clientId;
    if (tag) query.tags = { $in: [tag] };
    if (tags)
      query.tags = { $in: tags.includes(',') ? tags.split(',') : [tags] };
    // Project filter:
    // - 'default' / 'stocksearch' => only media without projectId (global stocksearch)
    // - any other value => exact projectId match
    if (projectId === 'default' || projectId === 'stocksearch') {
      query.projectId = { $exists: false };
    } else if (projectId) {
      query.projectId = projectId;
    }
    if (contentType) query.contentType = contentType;
    if (contentSource) query.contentSource = contentSource;
    if (contentSourceUrl) query.contentSourceUrl = contentSourceUrl;
    if (ids) {
      const objectIds = ids.split(',').map(id => new ObjectId(id.trim()));
      query._id = { $in: objectIds };
    }

    const sortObject = { [sort]: order as 'asc' | 'desc' };

    // Build projection for field selection
    let projection: any = {};
    if (fields) {
      const fieldList = fields.split(',').map(f => f.trim());
      fieldList.forEach(field => {
        projection[field] = 1;
      });
    } else {
      // Default lightweight fields for list view
      projection = {
        _id: 1,
        tags: 1,
        clientId: 1,
        projectId: 1,
        createdAt: 1,
        updatedAt: 1,
        contentType: 1,
        contentMimeType: 1,
        contentSubType: 1,
        contentSource: 1,
        contentSourceUrl: 1,
        fileName: 1,
        fileSize: 1,
        filePath: 1,
        metadata: 1,
      };
    }

    const files = await collection
      .find(query, { projection })
      .sort(sortObject)
      .skip(offset)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments(query);

    return NextResponse.json({
      files,
      total,
      hasMore: offset + files.length < total,
    });
  } catch (error) {
    console.error('Error fetching media files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media files' },
      { status: 500 },
    );
  }
}

// POST /api/media-files - Create a new media file
export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const body: CreateMediaFileRequest & {
      analyzeImage?: boolean;
      generateDescription?: boolean;
      generateKeywords?: boolean;
    } = await request.json();
    console.log(
      'Media file creation request body:',
      JSON.stringify(body, null, 2),
    );
    const {
      tags,
      projectId: bodyProjectId,
      contentType,
      contentMimeType,
      contentSubType,
      contentSource,
      contentSourceUrl,
      metadata,
      fileName,
      fileSize,
      filePath,
      analyzeImage = true,
      generateDescription = true,
      generateKeywords = true,
    } = body;

    if (!tags || !contentType || !contentMimeType || !contentSource) {
      return NextResponse.json(
        {
          error:
            'Required fields: tags, contentType, contentMimeType, contentSubType, contentSource',
        },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const collection = db.collection('mediaFiles');

    // Start with the provided metadata
    let finalMetadata = metadata || {};
    const mediaSourceUrl = filePath;
    // Perform AI analysis for images if metadata doesn't have description
    if (contentType === 'image' && analyzeImage && !hasDescription(finalMetadata)) {
      try {
        // TODO: Add video analysis support when the endpoint supports it
        if (mediaSourceUrl) {
          console.log('Performing AI analysis for image:', mediaSourceUrl);
          const aiMetadata = await indexAndAnalyzeImage(
            mediaSourceUrl,
            clientId || 'default',
            {
              platform: contentSource,
              platformUrl: mediaSourceUrl,
              imageLink: mediaSourceUrl,
              tags: tags,
              projectId: bodyProjectId ?? undefined,
            },
          );

          if (aiMetadata) {
            const ai = aiMetadata as unknown as Record<string, unknown>;
            if (!generateDescription) ai.description = null;
            if (!generateKeywords) {
              ai.keywords = null;
              ai.artStyle = null;
              ai.audienceKeywords = null;
            }
            // Merge AI metadata with existing metadata
            finalMetadata = {
              ...finalMetadata,
              ...aiMetadata,
            };
            console.log('AI analysis completed, metadata updated');
            //console.log('AI metadata:', aiMetadata);
          } else {
            console.log('AI analysis failed or returned no metadata');
          }
        } else {
          console.log('No contentSourceUrl provided, skipping AI analysis');
        }
      } catch (error) {
        console.error('Error during AI analysis:', error);
        // Continue with creation even if AI analysis fails
      }
    } else if (contentType === 'video') {
      // TODO: Add video analysis support when the endpoint supports it
      console.log('Video analysis not yet supported, skipping AI analysis');
    }

    // Check if media file with same URL already exists
    const existingFile = await collection.findOne({
      filePath: filePath,
      clientId: clientId || 'default',
    });

    if (existingFile) {
      console.log(
        'Media file with URL already exists, skipping creation:',
        contentSourceUrl,
      );
      return NextResponse.json(
        {
          ...existingFile,
          message: 'Media file already exists',
        },
        { status: 200 },
      );
    }

    console.log('Storing media file with tags:', tags);
    const mediaFile: MediaFile = {
      tags,
      clientId: clientId || 'default',
      ...(bodyProjectId ? { projectId: bodyProjectId } : {}),
      contentType,
      contentMimeType,
      contentSubType: contentSubType || 'unknown',
      contentSource,
      contentSourceUrl,
      metadata: finalMetadata,
      fileName,
      fileSize,
      filePath,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(mediaFile);

    return NextResponse.json(
      {
        ...mediaFile,
        _id: result.insertedId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating media file:', error);
    return NextResponse.json(
      { error: 'Failed to create media file' },
      { status: 500 },
    );
  }
}
