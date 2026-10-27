import { NextRequest, NextResponse } from 'next/server';
import { getEntitlements, resolveViewer, type Viewer } from '@/lib/access';
import { clientIdForInstallCode, isInstallCode } from '@/lib/catalog/install-code';
import { buildInstallPlan } from '@/lib/catalog/install';
import { catalogItemsDB } from '@/lib/catalog/store';

/**
 * GET /api/catalog/install?item=mcp/browse-hack
 * Authorization: Bearer <install code from the prompt, or MediaMake API key>
 *
 * The ordered install plan for an item and everything it requires (repos to
 * clone, GitHub release files, other catalog items), with 30-minute package
 * links. This is what the public install.md has Claude call. Items open to
 * everyone need no Authorization at all.
 */
export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('item');
  if (!itemId) return NextResponse.json({ error: 'item is required, e.g. ?item=skill/lyric-video' }, { status: 400 });

  const bearer = req.headers.get('authorization')?.split(' ')[1];
  let viewer: Viewer;
  if (isInstallCode(bearer)) {
    const clientId = await clientIdForInstallCode(bearer, itemId);
    if (!clientId) {
      return NextResponse.json(
        { error: 'This install code has expired or is for another item. Copy the install prompt again from MediaMake.' },
        { status: 401 },
      );
    }
    viewer = { clientId };
  } else {
    viewer = await resolveViewer(req);
  }

  const plan = await buildInstallPlan(itemId, await getEntitlements(viewer));
  if (!plan.ok && plan.status === 404 && !viewer.clientId) {
    // Might be shared with them: we just don't know who they are.
    return NextResponse.json(
      { error: 'Copy the install prompt from the item page on MediaMake while signed in (it carries an install code), or send your MediaMake API key as "Authorization: Bearer <key>".' },
      { status: 401 },
    );
  }
  if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.status });

  const at = new Date().toISOString();
  await Promise.all(
    plan.steps.flatMap(step =>
      step.type === 'item'
        ? [catalogItemsDB.logDownload({ itemId: step.id, version: step.version, clientId: viewer.clientId, at })]
        : [],
    ),
  ).catch(error => console.error('[catalog] Could not log install downloads:', error));

  return NextResponse.json(plan);
}
