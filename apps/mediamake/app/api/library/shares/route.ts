import { NextRequest, NextResponse } from 'next/server';
import { SLUG, parseRef } from '@/lib/cloud-library';
import { answer, caller, failed, placeOf, refuse, spaceOf } from '@/lib/cloud-library/http';
import { shareDB } from '@/lib/cloud-library/share-store';
import { parseShareAsk } from '@/lib/cloud-library/shares';
import { canWrite } from '@/lib/editor/project-access';

/**
 * Shared collections (docs/library.md › Shared collections). A collection is opened to a project
 * or a person by the owner of its space, and to nobody by anyone else. Nothing is copied.
 *
 * GET   ?space=<id>&collection=<id> [&days=30]   the owner: who the collection is opened to, and what
 *                                                each fetched through it.
 *       ?space=<id>&notes=<collection>/<entry>   this space's own notes on a shared entry.
 * POST  { action: "share", space, collection, project | email, role?: "viewer" | "editor", internal? }
 *                                                opens it (an invitation), or changes what a share allows.
 *       { action: "unshare", space, collection, to }      takes it back, at once.
 *       { action: "accept", space, from, collection }     the receiving space says yes: the collection
 *                                                shows there, live. Its owner or an editor does this.
 *       { action: "leave", space, from, collection }      declines, or leaves it.
 *       { action: "notes", space, ref, rating?, tags?, usedIn? }  this space's notes on a shared entry.
 *                                                They never touch the entry.
 */
const OWNER_ONLY = "Only the owner of the collection's space shares it";

export async function GET(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const params = req.nextUrl.searchParams;
  try {
    if (params.has('notes')) {
      const ref = parseRef(params.get('notes'));
      if (!ref) return refuse('notes is <collection>/<entry>');
      const at = await placeOf(clientId, params.get('space'), ref.collection, 'read');
      if ('response' in at) return at.response;
      if (!at.shared) return refuse('Notes are kept on entries of a shared collection: your own entries have their fields');
      return NextResponse.json({ notes: await shareDB.notes(at.shared.to.id, at.shared.share, ref.entry) });
    }
    const at = await spaceOf(clientId, params.get('space'), 'read');
    if ('response' in at) return at.response;
    if (at.space.role !== 'owner') return refuse(OWNER_ONLY, 403);
    const collection = (params.get('collection') ?? '').toLowerCase();
    if (!SLUG.test(collection)) return refuse('collection is the id of one of this space’s collections');
    const days = Math.min(366, Math.max(1, Number(params.get('days')) || 30));
    return NextResponse.json(await shareDB.list(at.space, collection, new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10)));
  } catch (error) {
    return failed('read the shares', error);
  }
}

export async function POST(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? '');
  try {
    if (action === 'notes') {
      const ref = parseRef(body?.ref);
      if (!ref) return refuse('ref is <collection>/<entry>');
      const at = await placeOf(clientId, body?.space, ref.collection, 'read');
      if ('response' in at) return at.response;
      if (!at.shared) return refuse('Notes are kept on entries of a shared collection: change your own entry instead');
      if (!canWrite(at.shared.to.role)) return refuse("The owner or an editor of this space writes its notes", 403);
      return NextResponse.json({ notes: await shareDB.setNotes(at.shared.to.id, at.shared.share, ref.entry, body, clientId) });
    }
    if (action === 'share' || action === 'unshare') {
      const at = await spaceOf(clientId, body?.space, 'write');
      if ('response' in at) return at.response;
      if (at.space.role !== 'owner') return refuse(OWNER_ONLY, 403);
      if (action === 'unshare') return answer(await shareDB.unshare(at.space, String(body?.collection ?? '').toLowerCase(), String(body?.to ?? '')));
      const ask = parseShareAsk(body);
      return 'error' in ask ? refuse(ask.error) : answer(await shareDB.share(at.space, ask, clientId));
    }
    if (action === 'accept' || action === 'leave') {
      const at = await spaceOf(clientId, body?.space, 'write');
      if ('response' in at) return at.response;
      const from = String(body?.from ?? '');
      const collection = String(body?.collection ?? '').toLowerCase();
      return answer(action === 'accept' ? await shareDB.accept(at.space, from, collection, clientId) : await shareDB.leave(at.space, from, collection));
    }
    return refuse('action is "share", "unshare", "accept", "leave" or "notes"');
  } catch (error) {
    return failed('change the share', error);
  }
}
