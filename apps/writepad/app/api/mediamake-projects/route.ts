import { NextRequest, NextResponse } from 'next/server';
import { getMediamakeDb, isMediamakeConfigured } from '@/lib/db/mediamakeMongo';
import type { MediamakeProjectRow } from '@/lib/types/mediamake-media';

/**
 * GET /api/mediamake-projects — projects from Mediamake Mongo `projects` (aligned with apps/mediamake /api/project).
 */
export async function GET(request: NextRequest) {
  if (!isMediamakeConfigured()) {
    return NextResponse.json({ configured: false, projects: [] as MediamakeProjectRow[] });
  }

  const clientId = request.headers.get('x-client-id');
  if (!clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getMediamakeDb();
    const docs = await db
      .collection('projects')
      .find({ clientId })
      .sort({ createdAt: -1 })
      .toArray();

    const projects: MediamakeProjectRow[] = docs.map((d) => ({
      id: d._id!.toString(),
      displayName: typeof d.displayName === 'string' ? d.displayName : 'Project',
    }));

    return NextResponse.json({ configured: true, projects });
  } catch (e) {
    console.error('[mediamake-projects]', e);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}
