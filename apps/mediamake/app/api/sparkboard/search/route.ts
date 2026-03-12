import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SearchQuerySchema } from '@/lib/sparkboard/types';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { MediaFile } from '@/app/types/media';
import { ObjectId } from 'mongodb';
import {
  searchSparkboardImagesInNamespaces,
  DEFAULT_STOCKSEARCH_NAMESPACE,
  toProjectNamespace,
} from '@/lib/sparkboard/redis';

// Convert search result to MediaFile format
function convertSearchResultToMediaFile(
  searchResult: any,
  clientId: string,
): MediaFile {
  const metadata = searchResult.metadata || {};

  // Determine content type from metadata
  let contentType: 'video' | 'audio' | 'image' | 'document' | 'unknown' =
    'unknown';
  if (metadata.mediaType) {
    switch (metadata.mediaType.toLowerCase()) {
      case 'image':
        contentType = 'image';
        break;
      case 'video':
        contentType = 'video';
        break;
      case 'audio':
        contentType = 'audio';
        break;
      default:
        contentType = 'unknown';
    }
  } else if (metadata.mimeType) {
    if (metadata.mimeType.startsWith('image/')) {
      contentType = 'image';
    } else if (metadata.mimeType.startsWith('video/')) {
      contentType = 'video';
    } else if (metadata.mimeType.startsWith('audio/')) {
      contentType = 'audio';
    }
  }

  // Create file path from src or use a generated path
  const filePath = metadata.src || `search/${searchResult.id}`;

  // Generate filename from URL or use ID
  const fileName = searchResult.id
    ? String(searchResult.id)
    : metadata.src
      ? metadata.src.split('/').pop() || `search-${searchResult.id}`
      : `search-${searchResult.id}`;

  return {
    _id: new ObjectId(), // Generate random ObjectId for new files
    tags: [],
    clientId,
    contentMimeType: metadata.mimeType || 'image/jpeg',
    contentSubType: 'full',
    contentSource: metadata.platform || 'sparkboard-search',
    contentSourceUrl:
      metadata.pagePermalink || metadata.platformUrl || metadata.src || '',
    fileName,
    fileSize: 0,
    contentType,
    metadata: {
      ...metadata,
    },
    filePath,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MediaFile;
}

export async function GET(req: NextRequest) {
  try {
    // Get client ID
    const clientId = getClientId(req) || 'default';

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = SearchQuerySchema.parse(queryParams);
    const {
      searchType,
      q,
      projectId: queryProjectId,
      projectDisplayName: queryProjectDisplayName,
      tags: queryTags,
      artStyle,
      keywords,
      audienceKeywords,
      aspectRatioType,
      mediaType,
      mimeType,
      platformId,
      topK,
    } = validatedParams;

    // Resolve project namespace by projectId (avoids long display names)
    const projectNamespace =
      !queryProjectId || queryProjectId === 'default'
        ? DEFAULT_STOCKSEARCH_NAMESPACE
        : toProjectNamespace(queryProjectId);

    // Build filter string similar to original Sparkboard search logic
    const filterConditions: string[] = [];

    if (artStyle) {
      filterConditions.push(`artStyle CONTAINS '${artStyle}'`);
    }
    if (keywords) {
      filterConditions.push(`keywords CONTAINS '${keywords}'`);
    }
    if (audienceKeywords) {
      filterConditions.push(`audienceKeywords CONTAINS '${audienceKeywords}'`);
    }
    if (aspectRatioType) {
      filterConditions.push(`aspectRatioType = '${aspectRatioType}'`);
    }
    if (mediaType) {
      filterConditions.push(`mediaType = '${mediaType}'`);
    }
    if (mimeType) {
      filterConditions.push(`mimeType = '${mimeType}'`);
    }
    if (platformId) {
      filterConditions.push(`platformId = '${platformId}'`);
    }

    const filterString =
      filterConditions.length > 0 ? filterConditions.join(' AND ') : undefined;

    const ragResults = await searchSparkboardImagesInNamespaces({
      q,
      topK,
      projectNamespace,
      tags: queryTags,
      filterString,
    });

    // Get database connection
    const db = await getDatabase();
    const collection = db.collection('mediaFiles');

    // Process search results based on searchType
    const processedResults: MediaFile[] = [];

    for (const searchResult of ragResults) {
      //   console.log(searchResult);
      // Check if this search result exists in the database
      const existingMediaFile = await collection.findOne({
        filePath: searchResult.metadata?.src,
        ...(searchType === 'clientFiles' ? { clientId: clientId } : {}),
      });

      if (existingMediaFile) {
        // File exists in database
        if (searchType === 'clientFiles') {
          processedResults.push(existingMediaFile as MediaFile);
        } else if (searchType === 'mediaFiles') {
          // Include all files from database (no client ID check)
          processedResults.push(existingMediaFile as MediaFile);
        } else if (searchType === 'allFiles') {
          // Include all files from database
          processedResults.push(existingMediaFile as MediaFile);
        }
      } else {
        // File doesn't exist in database
        if (searchType === 'allFiles') {
          // Convert search result to MediaFile format
          const mediaFile = convertSearchResultToMediaFile(
            searchResult,
            clientId,
          );
          processedResults.push(mediaFile);
        }
        // For clientFiles and mediaFiles, we only return existing files from DB
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results: processedResults,
        total: processedResults.length,
        searchType,
        clientId,
      },
    });
  } catch (error) {
    console.error('Search error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(issue => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
      });

      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${errorMessages.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
