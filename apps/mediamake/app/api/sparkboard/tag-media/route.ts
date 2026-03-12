import { NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/auth-utils';
import { MediaFile } from '@/app/types/media';
import { ObjectId } from 'mongodb';
import {
  DEFAULT_STOCKSEARCH_NAMESPACE,
  searchSparkboardImagesInNamespaces,
  searchSparkboardImagesInTagNamespace,
} from '@/lib/sparkboard/redis';

function convertSearchResultToMediaFile(
  searchResult: { id: string | number; metadata?: any },
  clientId: string,
): MediaFile {
  const metadata = searchResult.metadata || {};
  let contentType: 'video' | 'audio' | 'image' | 'document' | 'unknown' = 'unknown';
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
    if (metadata.mimeType.startsWith('image/')) contentType = 'image';
    else if (metadata.mimeType.startsWith('video/')) contentType = 'video';
    else if (metadata.mimeType.startsWith('audio/')) contentType = 'audio';
  }
  const filePath = metadata.src || `search/${searchResult.id}`;
  const fileName = searchResult.id
    ? String(searchResult.id)
    : metadata.src
      ? metadata.src.split('/').pop() || `search-${searchResult.id}`
      : `search-${searchResult.id}`;
  return {
    _id: new ObjectId(),
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
    metadata: { ...metadata },
    filePath,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MediaFile;
}

/** GET /api/sparkboard/tag-media?tag=...&topK=200 - List media in a tag's RAG namespace */
export async function GET(req: NextRequest) {
  try {
    const clientId = getClientId(req) || 'default';
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag');
    const topK = Math.min(
      Math.max(parseInt(searchParams.get('topK') || '200', 10), 1),
      500,
    );
    if (!tag?.trim()) {
      return NextResponse.json(
        { error: 'Query param tag is required' },
        { status: 400 },
      );
    }

    const includeDefault =
      searchParams.get('includeDefault') === '1' ||
      searchParams.get('includeDefault') === 'true';

    const trimmedTag = tag.trim();

    const results = includeDefault
      ? await searchSparkboardImagesInNamespaces({
          q: 'image media content',
          topK,
          projectNamespace: DEFAULT_STOCKSEARCH_NAMESPACE,
          tags: [trimmedTag],
        })
      : await searchSparkboardImagesInTagNamespace(trimmedTag, topK);
    const files: MediaFile[] = results.map((r) =>
      convertSearchResultToMediaFile(r, clientId),
    );
    return NextResponse.json({
      success: true,
      data: { results: files, total: files.length },
    });
  } catch (error) {
    console.error('Tag media error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
