import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { accessLevel, getEntitlements, resolveViewer } from '@/lib/access';
import { itemPagePath } from '@/lib/catalog/paths';
import { getCatalogRecord } from '@/lib/catalog/records';
import { parseRating } from '@/lib/ratings/ratings';
import { ratingsDB } from '@/lib/ratings/store';

/**
 * Ratings of a skill, MCP or app (lib/ratings). Under /api/catalog, so it
 * works signed out like the rest of the catalog: the route resolves the
 * viewer itself.
 *
 * GET    ?item=skill/x            its average and how many rated it, for everyone; `mine` is
 *                                 the caller's own stars when they are signed in and rated it.
 * POST   { itemId, stars, version?, source? }
 *                                 rate it from 1 to 5, or change the rating given before. Every
 *                                 signed-in member may, for any item they can open. What the item
 *                                 pages, the item dialog and mm-use's rate_item call.
 * DELETE ?item=skill/x            take the caller's rating back.
 *
 * Nobody sees who gave what. Words that go with a rating are feedback (POST /api/feedback).
 */

const ITEM = /^(skill|mcp|app)\/[a-z0-9][a-z0-9-]{0,63}$/;

/** The item when the viewer can open it; one they can't see answers like one that doesn't exist. */
async function openItem(clientId: string | null, itemId: string) {
  const item = await getCatalogRecord(itemId).catch(() => null);
  if (!item) return null;
  return accessLevel(await getEntitlements({ clientId }), item) === 'locked' ? null : item;
}

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('item') ?? '';
  if (!ITEM.test(itemId)) return NextResponse.json({ error: 'item names a skill, MCP or app' }, { status: 400 });
  const { clientId } = await resolveViewer(req);
  try {
    if (!(await openItem(clientId, itemId))) return NextResponse.json({ error: `${itemId} isn't an item you can open` }, { status: 404 });
    const [summary, mine] = await Promise.all([ratingsDB.summary(itemId), clientId ? ratingsDB.mine(clientId, itemId) : null]);
    return NextResponse.json({ rating: summary, mine, signedIn: !!clientId }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[ratings] Could not read ratings:', error);
    return NextResponse.json({ error: 'Could not read the ratings' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const { clientId } = await resolveViewer(req);
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const parsed = parseRating(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    if (!(await openItem(clientId, parsed.itemId))) return NextResponse.json({ error: `${parsed.itemId} isn't an item you can open` }, { status: 404 });
    const saved = await ratingsDB.set(clientId, parsed);
    const summary = await ratingsDB.summary(parsed.itemId);
    // a skill's page is built ahead of time
    revalidatePath(itemPagePath(parsed.itemId));
    return NextResponse.json({ rating: summary, mine: saved.stars });
  } catch (error) {
    console.error('[ratings] Could not save a rating:', error);
    return NextResponse.json({ error: 'Could not save the rating' }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const { clientId } = await resolveViewer(req);
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const itemId = req.nextUrl.searchParams.get('item') ?? '';
  if (!ITEM.test(itemId)) return NextResponse.json({ error: 'item names a skill, MCP or app' }, { status: 400 });
  try {
    await ratingsDB.remove(clientId, itemId);
    revalidatePath(itemPagePath(itemId));
    return NextResponse.json({ rating: await ratingsDB.summary(itemId), mine: null });
  } catch (error) {
    console.error('[ratings] Could not remove a rating:', error);
    return NextResponse.json({ error: 'Could not remove the rating' }, { status: 503 });
  }
}
