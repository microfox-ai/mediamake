import { NextRequest, NextResponse } from 'next/server';
import { renderRequestDB, type RenderRequestDocument } from '@/lib/render-mongodb';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Format document for API response. Excludes inputProps to keep list/single responses light (inputProps can be MBs). */
function formatDoc(doc: RenderRequestDocument) {
  return {
    id: doc.renderId,
    fileName: doc.fileName,
    codec: doc.codec,
    composition: doc.composition,
    status: doc.status,
    createdAt: doc.createdAt,
    projectId: doc.projectId,
    tags: doc.tags,
    downloadUrl: doc.downloadUrl,
    fileSize: doc.fileSize,
    progress: doc.progress,
    error: doc.error,
    progressData: doc.progressData,
    isDownloadable: doc.isDownloadable,
    bucketName: doc.bucketName,
    renderId: doc.renderId,
    renderType: doc.renderType,
    audioCodec: doc.audioCodec,
    configMode: doc.configMode,
    awsRenderPreset: doc.awsRenderPreset,
    customConfig: doc.customConfig,
    concurrencyUsed: doc.concurrencyUsed,
    framesPerLambdaUsed: doc.framesPerLambdaUsed,
    memoryUsed: doc.memoryUsed,
    diskUsed: doc.diskUsed,
    timeoutUsed: doc.timeoutUsed,
    functionNameUsed: doc.functionNameUsed,
    isArchived: doc.isArchived,
  };
}

export const GET = async (req: NextRequest) => {
  try {
    const clientId = req.headers.get('x-client-id');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const singleRenderId = searchParams.get('renderId');
    const inputPropsOnly = searchParams.get('inputPropsOnly') === 'true';
    const includeArchived = searchParams.get('includeArchived') === 'true' || searchParams.get('includeDeleted') === 'true';
    const archivedOnly = searchParams.get('archived') === 'true' || searchParams.get('deleted') === 'true';
    const renderType = (searchParams.get('renderType') ?? 'any') as 'any' | 'video' | 'audio' | 'still';
    const projectId = (searchParams.get('projectId') ?? 'any') as string | 'any';
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam
      ? tagsParam
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // Fetch only inputProps for a single render (on-demand, avoids sending large payload in list/single)
    if (singleRenderId && inputPropsOnly) {
      const inputProps = await renderRequestDB.getInputPropsById(
        singleRenderId,
        clientId,
        includeArchived ? { includeArchived: true } : undefined,
      );
      return NextResponse.json({ inputProps: inputProps ?? undefined });
    }

    // Single render fetch (e.g. for refresh or viewing archived) — excludes inputProps
    if (singleRenderId) {
      const doc = await renderRequestDB.getById(
        singleRenderId,
        clientId,
        includeArchived ? { includeArchived: true } : undefined,
      );
      if (!doc) {
        return NextResponse.json({ items: [], hasMore: false });
      }
      return NextResponse.json({
        items: [formatDoc(doc)],
        hasMore: false,
      });
    }

    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const cursor = searchParams.get('cursor') ?? undefined;

    const { items, nextCursor, hasMore } = await renderRequestDB.getByClientIdPaginated(
      clientId,
      limit,
      cursor || null,
      {
        ...(archivedOnly ? { archivedOnly: true } : {}),
        ...(renderType !== 'any' ? { renderType } : {}),
        ...(projectId !== 'any' ? { projectId } : {}),
        ...(tags.length > 0 ? { tags } : {}),
      },
    );

    const formattedHistory = items.map(formatDoc);

    return NextResponse.json({
      items: formattedHistory,
      nextCursor: nextCursor ?? undefined,
      hasMore,
    });
  } catch (error) {
    console.error('Failed to fetch render history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch render history' },
      { status: 500 },
    );
  }
};
