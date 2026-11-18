import { NextRequest, NextResponse } from 'next/server';
import { canAccess, resolveViewer } from '@/lib/access';
import { getCatalogRecord } from '@/lib/catalog/records';
import { submissionsDB } from '@/lib/submissions/store';

/**
 * GET /api/catalog/readme-file/<kind>/<slug>/<path…>
 *
 * A picture a store package's README.md shows from its own folder
 * (`shots/steps.png`): the package of a member's skill, MCP or app, released
 * from a submission (lib/submissions). It comes from the files of the version
 * released (lib/catalog/readme-data releasedReadmeBase points the README's
 * pictures here), for whoever may open the item. Outside the middleware, like
 * every /api/catalog route, so the viewer is resolved here.
 */
const TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
};

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export async function GET(req: NextRequest, { params }: { params: Promise<{ parts: string[] }> }) {
  const [kind, slug, ...rest] = (await params).parts.map(part => decodeURIComponent(part));
  const path = rest.join('/');
  const type = TYPES[path.split('.').pop()?.toLowerCase() ?? ''];
  if (!kind || !slug || !path || !type || path.split('/').some(part => !part || part === '.' || part === '..')) return notFound();
  try {
    const record = await getCatalogRecord(`${kind}/${slug}`);
    if (!record || !(await canAccess(await resolveViewer(req), record))) return notFound();
    const released = await submissionsDB.releasedOf(record.id);
    if (!released) return notFound();
    const file = (await submissionsDB.filesOf(released.submissionId)).find(entry => entry.path === path);
    if (!file) return notFound();
    const body = Buffer.from(file.content, file.encoding);
    return new NextResponse(body, {
      headers: {
        'Content-Type': type,
        'Content-Length': String(body.length),
        // a new version's pictures have their own submission; a viewer keeps one for an hour
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[catalog] Could not hand out a README picture:', error);
    return NextResponse.json({ error: 'Could not read that picture' }, { status: 503 });
  }
}
