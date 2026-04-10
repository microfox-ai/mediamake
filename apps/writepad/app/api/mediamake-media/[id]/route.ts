import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMediamakeDb, isMediamakeConfigured } from '@/lib/db/mediamakeMongo';
import { mediaFileDocToListItem } from '@/lib/mediamake/mediaFileSerialize';

/**
 * GET /api/mediamake-media/[id] — single media row scoped by clientId (tenant-safe).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isMediamakeConfigured()) {
    return NextResponse.json({ error: 'Mediamake not configured' }, { status: 503 });
  }

  const clientId = req.headers.get('x-client-id');
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const db = await getMediamakeDb();
    const doc = await db.collection('mediaFiles').findOne(
      { _id: oid, clientId },
      {
        projection: {
          _id: 1,
          filePath: 1,
          fileName: 1,
          contentType: 1,
          contentMimeType: 1,
          createdAt: 1,
          tags: 1,
          projectId: 1,
          contentSource: 1,
        },
      },
    );

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const file = mediaFileDocToListItem(doc);

    return NextResponse.json({ configured: true, file });
  } catch (e) {
    console.error('[mediamake-media id]', e);
    return NextResponse.json(
      { error: 'Failed to load media' },
      { status: 500 },
    );
  }
}
