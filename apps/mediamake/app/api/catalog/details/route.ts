import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/access';
import { itemDetailsFor } from '@/lib/app-shell/details-data';

/**
 * GET /api/catalog/details?key=catalog:skill/<name> | space:<space>:<item> | linked:<id> | local:<name>
 * What the item dialog shows about one skill, MCP or app (lib/app-shell/details), as the caller
 * sees it. Works signed out for a store item, like the rest of /api/catalog; a member's own items
 * (their spaces', the ones linked to them, the ones on their computers) need their sign-in. 404
 * when the caller has no such item.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? '';
  if (!/^(catalog|space|linked|local):[\w:./@ -]{1,300}$/.test(key)) return NextResponse.json({ error: 'key names an item' }, { status: 400 });
  const viewer = await resolveViewer(req);
  const details = await itemDetailsFor(viewer, key).catch(error => {
    console.error('[details] Could not build the details:', error);
    return null;
  });
  if (!details) return NextResponse.json({ error: 'No such item' }, { status: 404 });
  return NextResponse.json({ details }, { headers: { 'Cache-Control': 'private, no-store' } });
}
