import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMediamakeDb, isMediamakeConfigured } from '@/lib/db/mediamakeMongo';
import { mediaFileDocToListItem } from '@/lib/mediamake/mediaFileSerialize';
import { isMediamakeRagConfigured } from '@/lib/mediamake/ragEnv';
import {
  DEFAULT_STOCKSEARCH_NAMESPACE,
  searchSparkboardImagesInNamespaces,
  toProjectNamespace,
} from '@/lib/mediamake/ragVector';
import type { MediamakeMediaListItem, MediamakeMediaListResponse } from '@/lib/types/mediamake-media';

const QuerySchema = z.object({
  q: z.string().min(1),
  projectId: z.string().optional(),
  tags: z.string().optional(),
  topK: z.coerce.number().min(1).max(100).optional().default(40),
});

function metadataSrc(meta: Record<string, unknown> | undefined): string | null {
  if (!meta) return null;
  const src = meta.src;
  if (typeof src === 'string' && src.length > 0) return src;
  return null;
}

/**
 * GET /api/mediamake-media/rag — semantic search (same RAG stack as apps/mediamake /api/sparkboard/search).
 * Requires STOCKSEARCH_RAG_VECTOR_REST_URL + STOCKSEARCH_RAG_VECTOR_REST_TOKEN (same as Mediamake).
 */
export async function GET(request: NextRequest) {
  if (!isMediamakeConfigured()) {
    const body: MediamakeMediaListResponse = {
      configured: false,
      files: [],
      total: 0,
      hasMore: false,
      ragConfigured: false,
    };
    return NextResponse.json(body);
  }

  const clientId = request.headers.get('x-client-id');
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isMediamakeRagConfigured()) {
    return NextResponse.json(
      {
        configured: true,
        ragConfigured: false,
        files: [] as MediamakeMediaListItem[],
        total: 0,
        hasMore: false,
        message:
          'Semantic search is not configured. Set STOCKSEARCH_RAG_VECTOR_REST_URL and STOCKSEARCH_RAG_VECTOR_REST_TOKEN (same as Mediamake).',
      },
      { status: 200 },
    );
  }

  const raw = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { q, projectId, tags, topK } = parsed.data;
  const tagList = tags
    ? tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  const projectNamespace =
    !projectId || projectId === 'default' || projectId === 'stocksearch'
      ? DEFAULT_STOCKSEARCH_NAMESPACE
      : toProjectNamespace(projectId);

  try {
    const ragResults = await searchSparkboardImagesInNamespaces({
      q,
      topK,
      projectNamespace,
      tags: tagList,
    });

    const db = await getMediamakeDb();
    const collection = db.collection('mediaFiles');

    const files: MediamakeMediaListItem[] = [];
    const seen = new Set<string>();

    for (const r of ragResults) {
      const meta = r.metadata as Record<string, unknown> | undefined;
      const src = metadataSrc(meta);
      if (!src) continue;
      const doc = await collection.findOne(
        { filePath: src, clientId },
        {
          projection: {
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
          },
        },
      );
      if (!doc) continue;
      const id = doc._id.toString();
      if (seen.has(id)) continue;
      seen.add(id);
      files.push(mediaFileDocToListItem(doc));
    }

    const body: MediamakeMediaListResponse = {
      configured: true,
      ragConfigured: true,
      files,
      total: files.length,
      hasMore: false,
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error('[mediamake-media/rag]', e);
    return NextResponse.json(
      { error: 'Semantic search failed' },
      { status: 500 },
    );
  }
}
