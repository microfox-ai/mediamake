import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMediamakeDb, isMediamakeConfigured } from '@/lib/db/mediamakeMongo';
import { mediaFileDocToListItem } from '@/lib/mediamake/mediaFileSerialize';
import { isMediamakeRagConfigured } from '@/lib/mediamake/ragEnv';
import type { MediamakeMediaListResponse } from '@/lib/types/mediamake-media';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MAX_LIMIT = 50;
const SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'fileName']);

function buildMediaQuery(clientId: string, searchParams: URLSearchParams): Record<string, unknown> {
  const query: Record<string, unknown> = { clientId };

  const tag = searchParams.get('tag')?.trim();
  const tagsParam = searchParams.get('tags')?.trim();
  const projectId = searchParams.get('projectId')?.trim();
  const contentType = searchParams.get('contentType')?.trim();
  const contentSource = searchParams.get('contentSource')?.trim();
  const contentSourceUrl = searchParams.get('contentSourceUrl')?.trim();
  const parentMediaId = searchParams.get('parentMediaId')?.trim();

  const tagIds = new Set<string>();
  if (tag) tagIds.add(tag);
  if (tagsParam) {
    for (const t of tagsParam.split(',')) {
      const x = t.trim();
      if (x) tagIds.add(x);
    }
  }
  if (tagIds.size) query.tags = { $in: [...tagIds] };

  if (projectId === 'default' || projectId === 'stocksearch') {
    query.projectId = { $exists: false };
  } else if (projectId) {
    query.projectId = projectId;
  }
  if (contentType && contentType !== 'all') query.contentType = contentType;
  if (contentSource && contentSource !== 'all') query.contentSource = contentSource;
  if (contentSourceUrl) query.contentSourceUrl = contentSourceUrl;
  if (parentMediaId === 'none') {
    query.parentMediaId = { $exists: false };
  } else if (parentMediaId) {
    try {
      query.parentMediaId = new ObjectId(parentMediaId);
    } catch {
      /* ignore invalid id */
    }
  }

  const q = searchParams.get('q')?.trim() ?? '';
  if (q) {
    const escaped = escapeRegex(q);
    query.$or = [
      { fileName: { $regex: escaped, $options: 'i' } },
      { filePath: { $regex: escaped, $options: 'i' } },
      { 'metadata.description': { $regex: escaped, $options: 'i' } },
    ];
  }

  return query;
}

/**
 * GET /api/mediamake-media — list Mediamake `mediaFiles` (same filters as apps/mediamake /api/media-files).
 */
export async function GET(request: NextRequest) {
  if (!isMediamakeConfigured()) {
    const body: MediamakeMediaListResponse = {
      configured: false,
      files: [],
      total: 0,
      hasMore: false,
      ragConfigured: isMediamakeRagConfigured(),
    };
    return NextResponse.json(body);
  }

  const clientId = request.headers.get('x-client-id');
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50),
    );
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const offset = (page - 1) * limit;

    const sortParam = searchParams.get('sort') || 'createdAt';
    const orderParam = searchParams.get('order') || 'desc';
    const safeSort = SORT_FIELDS.has(sortParam) ? sortParam : 'createdAt';
    const sortDir = orderParam === 'asc' ? 1 : -1;
    const sortObject = { [safeSort]: sortDir as 1 | -1 };

    const db = await getMediamakeDb();
    const collection = db.collection('mediaFiles');

    const query = buildMediaQuery(clientId, searchParams);

    const projection = {
      _id: 1,
      filePath: 1,
      fileName: 1,
      contentType: 1,
      contentMimeType: 1,
      createdAt: 1,
      updatedAt: 1,
      tags: 1,
      projectId: 1,
      contentSource: 1,
    };

    const [filesRaw, total] = await Promise.all([
      collection
        .find(query, { projection })
        .sort(sortObject)
        .skip(offset)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    const files = filesRaw.map((doc) => mediaFileDocToListItem(doc));

    const body: MediamakeMediaListResponse = {
      configured: true,
      files,
      total,
      hasMore: offset + files.length < total,
      ragConfigured: isMediamakeRagConfigured(),
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error('[mediamake-media]', e);
    return NextResponse.json(
      { error: 'Failed to load Mediamake media' },
      { status: 500 },
    );
  }
}
