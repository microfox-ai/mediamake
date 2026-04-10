import { NextRequest, NextResponse } from 'next/server';
import { getMediamakeDb, isMediamakeConfigured } from '@/lib/db/mediamakeMongo';
import type { MediamakeTagRow } from '@/lib/types/mediamake-media';

/**
 * GET /api/mediamake-tags — tags from Mediamake Mongo `tags` (aligned with apps/mediamake /api/tags).
 */
export async function GET(request: NextRequest) {
  if (!isMediamakeConfigured()) {
    return NextResponse.json({ configured: false, tags: [] as MediamakeTagRow[] });
  }

  const clientId = request.headers.get('x-client-id');
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getMediamakeDb();
    const tags = await db
      .collection('tags')
      .find({ clientId })
      .sort({ displayName: 1 })
      .toArray();

    const rows: MediamakeTagRow[] = tags.map((t) => ({
      id: typeof t.id === 'string' ? t.id : String(t.id ?? ''),
      displayName: typeof t.displayName === 'string' ? t.displayName : String(t.displayName ?? ''),
    }));

    return NextResponse.json({ configured: true, tags: rows });
  } catch (e) {
    console.error('[mediamake-tags]', e);
    return NextResponse.json({ error: 'Failed to load tags' }, { status: 500 });
  }
}
