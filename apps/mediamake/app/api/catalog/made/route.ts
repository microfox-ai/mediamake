import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getEntitlements, resolveViewer } from '@/lib/access';
import { itemDetailsBare } from '@/lib/app-shell/details-data';
import { MAX_MADE, MAX_MADE_EACH, isMadeKey, madeShown, parseMade } from '@/lib/catalog/made';
import { madeDB } from '@/lib/catalog/made-store';
import { itemPagePath } from '@/lib/catalog/paths';

/**
 * What members made with an item (lib/catalog/made): the "Made with this" anyone who can use the item
 * adds to, beside the productions an admin recorded as its proof.
 *
 * GET    ?key=<details key>        { entries, canAdd, canRemoveAny, signedIn }: the entries (the caller's own
 *                                  marked `mine`), and whether the caller may add one. Works signed out for a store item.
 * POST   { key, title, url?, image? }
 *                                  adds what the caller made with it. Every signed-in member may, for any
 *                                  item they can use (a store item their membership opens, an item of a space
 *                                  they are in). Links are https; a YouTube link plays in the gallery.
 * DELETE ?key=<details key>&id=<entry id>
 *                                  takes one back: the caller's own, or any for an admin.
 *
 * Who may is worked out as the item's page works it out (lib/app-shell/details), so an item the caller
 * can't see answers like one that doesn't exist. Nobody is told who added what.
 */

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

/** A store item's page is built ahead of time: build it again after a change. */
function refresh(key: string) {
  if (key.startsWith('catalog:')) revalidatePath(itemPagePath(key.slice('catalog:'.length)));
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? '';
  if (!isMadeKey(key)) return NextResponse.json({ error: 'key names a skill, MCP or app' }, { status: 400 });
  const { clientId } = await resolveViewer(req);
  try {
    const details = await itemDetailsBare({ clientId }, key);
    if (!details) return NextResponse.json({ error: "That isn't an item you can open" }, { status: 404 });
    const [entries, entitlements] = await Promise.all([madeDB.list(key), clientId ? getEntitlements({ clientId }) : null]);
    return NextResponse.json({ entries: madeShown(entries, clientId), canAdd: !!clientId && !details.locked, canRemoveAny: !!entitlements?.isAdmin, signedIn: !!clientId }, noStore);
  } catch (error) {
    console.error('[made] Could not read what was made:', error);
    return NextResponse.json({ error: 'Could not read what was made with it' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const { clientId } = await resolveViewer(req);
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const parsed = parseMade(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const details = await itemDetailsBare({ clientId }, parsed.key);
    if (!details) return NextResponse.json({ error: "That isn't an item you can open" }, { status: 404 });
    if (details.locked) return NextResponse.json({ error: `It opens with ${details.locked}: only people who can use it add what they made` }, { status: 403 });
    const entries = await madeDB.list(parsed.key);
    if (entries.length >= MAX_MADE) return NextResponse.json({ error: `It already shows ${MAX_MADE}: that is all its page holds` }, { status: 409 });
    if (entries.filter(entry => entry.by === clientId).length >= MAX_MADE_EACH) return NextResponse.json({ error: `You added ${MAX_MADE_EACH} already: remove one first` }, { status: 409 });
    await madeDB.add({ ...parsed, by: clientId });
    refresh(parsed.key);
    return NextResponse.json({ entries: madeShown(await madeDB.list(parsed.key), clientId) }, noStore);
  } catch (error) {
    console.error('[made] Could not save what was made:', error);
    return NextResponse.json({ error: 'Could not save it' }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const { clientId } = await resolveViewer(req);
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const key = req.nextUrl.searchParams.get('key') ?? '';
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!isMadeKey(key) || !/^[\w-]{1,40}$/.test(id)) return NextResponse.json({ error: 'key and id name the entry' }, { status: 400 });
  try {
    const { isAdmin } = await getEntitlements({ clientId });
    const removed = await madeDB.remove(key, id, isAdmin ? undefined : clientId);
    if (!removed) return NextResponse.json({ error: 'Only whoever added it, or an admin, can remove it' }, { status: 404 });
    refresh(key);
    return NextResponse.json({ entries: madeShown(await madeDB.list(key), clientId) }, noStore);
  } catch (error) {
    console.error('[made] Could not remove what was made:', error);
    return NextResponse.json({ error: 'Could not remove it' }, { status: 503 });
  }
}
