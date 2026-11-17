import { NextRequest, NextResponse } from 'next/server';
import { getEntitlements, resolveViewer, type Viewer } from '@/lib/access';
import { buildInstallPlan } from '@/lib/catalog/install';
import { catalogItemsDB } from '@/lib/catalog/store';
import { isUpdateToken, readUpdateToken } from '@/lib/catalog/update-token';

/**
 * GET /api/catalog/install?item=mcp/browse-hack
 * Authorization: Bearer <update token or MediaMake API key> (or the session cookie)
 *
 * The ordered install plan for an item and everything it requires (repos to
 * clone, GitHub release files, other catalog items), with 30-minute package
 * links. This is what the public install.md has Claude call. Items open to
 * everyone need no Authorization at all. An update token (saved after an
 * install, see lib/catalog/update-token) works for the items it covers.
 */
export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('item');
  if (!itemId) return NextResponse.json({ error: 'item is required, e.g. ?item=skill/lyric-video' }, { status: 400 });

  const bearer = req.headers.get('authorization')?.split(' ')[1];
  let viewer: Viewer;
  if (isUpdateToken(bearer)) {
    const token = await readUpdateToken(bearer);
    if (!token?.items.includes(itemId)) {
      return NextResponse.json(
        {
          error: token
            ? `This update token wasn't made for ${itemId}. Sign this computer in (mm login) and run mm items install ${itemId} --yes, which adds it to the token.`
            : 'This update token has lapsed. Sign this computer in (mm login) and run mm items install --yes, which saves a new one.',
        },
        { status: 401 },
      );
    }
    viewer = { clientId: token.clientId };
  } else {
    viewer = await resolveViewer(req);
  }

  const plan = await buildInstallPlan(itemId, await getEntitlements(viewer));
  if (!plan.ok && plan.status === 404 && !viewer.clientId) {
    // Might be shared with them: we just don't know who they are.
    return NextResponse.json(
      { error: 'Sign in to install it: on a computer with MediaMake, mm login then mm items install --yes; elsewhere, send your MediaMake API key as "Authorization: Bearer <key>".' },
      { status: 401 },
    );
  }
  if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.status });

  const at = new Date().toISOString();
  await Promise.all(
    plan.steps.flatMap(step =>
      // packages that are only there for a choice may be turned down: they aren't counted
      step.type === 'item' && !step.forChoices
        ? [catalogItemsDB.logDownload({ itemId: step.id, version: step.version, clientId: viewer.clientId, at })]
        : [],
    ),
  ).catch(error => console.error('[catalog] Could not log install downloads:', error));

  return NextResponse.json(plan);
}
