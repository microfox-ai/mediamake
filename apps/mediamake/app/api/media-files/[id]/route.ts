import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { UpdateMediaFileRequest } from '@/app/types/media';
import {
  ragStocksearchVectorbase,
  DEFAULT_STOCKSEARCH_NAMESPACE,
  toProjectNamespace,
  toTagNamespace,
} from '@/lib/sparkboard/redis';

// GET /api/media-files/[id] - Fetch a specific media file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const collection = db.collection('mediaFiles');

    const file = await collection.findOne({ _id: new ObjectId(id) });

    if (!file) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error fetching media file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media file' },
      { status: 500 },
    );
  }
}

// PUT /api/media-files/[id] - Update a media file
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: UpdateMediaFileRequest = await request.json();
    const db = await getDatabase();
    const collection = db.collection('mediaFiles');

    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 },
      );
    }

    const updatedFile = await collection.findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error('Error updating media file:', error);
    return NextResponse.json(
      { error: 'Failed to update media file' },
      { status: 500 },
    );
  }
}

// DELETE /api/media-files/[id] - Delete a media file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const collection = db.collection('mediaFiles');

    // Load the file first so we know how it was indexed into RAG.
    // If it's already gone from Mongo, treat the delete as idempotent success.
    const file = await collection.findOne({ _id: new ObjectId(id) });

    if (file) {
      // Best-effort: remove the doc from all RAG namespaces where it might exist.
      // Derive src/platformId from metadata when present, else from document (e.g. uploads with empty metadata).
      try {
        if (ragStocksearchVectorbase) {
          const metadata = (file.metadata ?? {}) as {
            src?: string;
            platformId?: string;
          };
          const filePath = (file as { filePath?: string }).filePath;
          const contentSource = (file as { contentSource?: string }).contentSource;
          const src = metadata.src ?? filePath;
          const platformId = metadata.platformId ?? contentSource ?? 'upload';

          if (src && platformId) {
            const docId = `${platformId}:${src}`;

            const projectId: string | undefined =
              (file as { projectId?: string }).projectId ?? undefined;
            const baseNamespace =
              projectId && projectId !== 'default'
                ? toProjectNamespace(projectId)
                : DEFAULT_STOCKSEARCH_NAMESPACE;

            const namespaces = new Set<string>();
            namespaces.add(baseNamespace);

            const tags: string[] = Array.isArray((file as { tags?: string[] }).tags)
              ? ((file as { tags?: string[] }).tags as string[])
              : [];

            for (const tag of tags) {
              if (tag?.trim()) namespaces.add(toTagNamespace(tag.trim()));
            }

            // Await vector deletes so we know cleanup has been attempted before returning.
            // RagUpstashSdk uses deleteDocFromRAG(id, namespace) per doc/namespace.
            const deletePromises: Promise<unknown>[] = [];
            for (const ns of namespaces) {
              deletePromises.push(
                ragStocksearchVectorbase.deleteDocFromRAG(docId, ns)
              );
            }
            await Promise.allSettled(deletePromises);
          }
        }
      } catch (error) {
        // Log but don't block media deletion if vector cleanup fails
        console.error('Error removing media from RAG namespaces:', error);
      }
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    // Treat "not found" as idempotent success
    if (result.deletedCount === 0) {
      return NextResponse.json({
        message: 'Media file not found in database; treated as deleted',
      });
    }

    return NextResponse.json({ message: 'Media file deleted successfully' });
  } catch (error) {
    console.error('Error deleting media file:', error);
    return NextResponse.json(
      { error: 'Failed to delete media file' },
      { status: 500 },
    );
  }
}
