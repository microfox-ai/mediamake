import { NextRequest, NextResponse } from 'next/server';
import { getEntitlements, resolveViewer } from '@/lib/access';
import { buildInstallPlan } from '@/lib/catalog/install';
import { catalogItemsDB } from '@/lib/catalog/store';

/**
 * GET /api/catalog/install?item=mcp/get-into-zone
 * Authorization: Bearer <MediaMake API key>
 *
 * The ordered install plan for an item and everything it requires (repos to
 * clone, GitHub release files, other catalog items), with 30-minute package
 * links. This is what the public install.md has Claude call.
 */
export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('item');
  if (!itemId) return NextResponse.json({ error: 'item is required, e.g. ?item=skill/lyric-video' }, { status: 400 });

  const viewer = await resolveViewer(req);
  if (!viewer.clientId) {
    return NextResponse.json(
      { error: 'Send your MediaMake API key as "Authorization: Bearer <key>" to get an install plan.' },
      { status: 401 },
    );
  }

  const plan = await buildInstallPlan(itemId, await getEntitlements(viewer));
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
