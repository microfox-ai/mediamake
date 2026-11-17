import { NextRequest, NextResponse } from 'next/server';
import { accessLevel, getEntitlements } from '@/lib/access';
import { getCatalogRecord } from '@/lib/catalog/records';
import { shownIssues } from '@/lib/feedback/known-issues';
import { knownIssuesDB } from '@/lib/feedback/known-issues-store';

/**
 * GET ?item=skill/x   an item's known issues: the list admins keep, as its
 *                     page shows it (open ones, and those fixed in the last
 *                     30 days). For any signed-in account that can open the
 *                     item. What mm-use's known_issues calls, so Claude can
 *                     check before sending feedback that repeats one.
 */
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const itemId = req.nextUrl.searchParams.get('item') ?? '';
  const item = itemId ? await getCatalogRecord(itemId).catch(() => null) : null;
  // an item they can't see answers like one that doesn't exist
  if (!item || accessLevel(await getEntitlements({ clientId }), item) === 'locked') return NextResponse.json({ error: `${itemId || 'That'} isn't an item you can open` }, { status: 404 });
  try {
    return NextResponse.json({ item: itemId, issues: shownIssues(await knownIssuesDB.forItem(itemId)) });
  } catch (error) {
    console.error('[feedback] Could not read known issues:', error);
    return NextResponse.json({ error: 'Could not read the known issues' }, { status: 503 });
  }
}
