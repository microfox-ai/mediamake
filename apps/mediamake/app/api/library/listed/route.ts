import { NextRequest, NextResponse } from 'next/server';
import { SLUG } from '@/lib/cloud-library';
import { answer, caller, failed, mayUseLibrary, refuse, spaceOf } from '@/lib/cloud-library/http';
import { cleanListing, parseRequest } from '@/lib/cloud-library/listing';
import { listingDB } from '@/lib/cloud-library/listing-store';

/**
 * Collections listed in Explore, and requests for access (lib/cloud-library/listing).
 *
 * GET   no space                    every listed collection: its card, its template, a sample of titles and
 *                                   its owner's rights, with what the caller has to do with it (state).
 *       ?space=<id>&collection=<c>  the requests waiting on a collection, for the owner of its space.
 * POST  { action: "list", space, collection, about?, rights }   list it, or change its listing. Owner only.
 *       { action: "unlist", space, collection }                 take it off. Owner only.
 *       { action: "request", from, collection, to?, note? }     ask its owner for access, for the caller's
 *                                                               personal Library or a space they own or edit.
 *       { action: "withdraw", from, collection }                take a request back.
 *       { action: "accept" | "decline", space, collection, to } the owner's answer. Accept opens it to read
 *                                                               and fetch, as an invitation the asker accepts.
 */
export async function GET(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const params = req.nextUrl.searchParams;
  try {
    if (params.has('space')) {
      const at = await spaceOf(clientId, params.get('space'), 'read');
      if ('response' in at) return at.response;
      if (at.space.role !== 'owner') return refuse("Only the space's owner reads the requests for its collections", 403);
      return NextResponse.json(await listingDB.requests(at.space, String(params.get('collection') ?? '').toLowerCase()));
    }
    const locked = await mayUseLibrary(clientId);
    return locked ?? NextResponse.json(await listingDB.listed(clientId));
  } catch (error) {
    return failed('read the listed collections', error);
  }
}

export async function POST(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? '');
  try {
    if (action === 'request' || action === 'withdraw') {
      const locked = await mayUseLibrary(clientId);
      if (locked) return locked;
      const ask = parseRequest(body);
      if ('error' in ask) return refuse(ask.error);
      return answer(action === 'request' ? await listingDB.request(clientId, ask) : await listingDB.withdraw(clientId, ask.from, ask.collection));
    }
    if (!['list', 'unlist', 'accept', 'decline'].includes(action)) return refuse('action is "list", "unlist", "request", "withdraw", "accept" or "decline"');
    const at = await spaceOf(clientId, body?.space, 'write');
    if ('response' in at) return at.response;
    if (at.space.role !== 'owner') return refuse("Only the space's owner lists a collection and answers its requests", 403);
    const collection = String(body?.collection ?? '').toLowerCase();
    if (!SLUG.test(collection)) return refuse('collection is the id of the collection');
    if (action === 'unlist') return answer(await listingDB.set(at.space, collection, null, clientId));
    if (action === 'list') {
      const listing = cleanListing(body);
      return 'error' in listing ? refuse(listing.error) : answer(await listingDB.set(at.space, collection, listing, clientId));
    }
    if (typeof body?.to !== 'string' || !/^[0-9a-f]{24}$/i.test(body.to)) return refuse('to is the space that asked, as the request gives it');
    return answer(await listingDB.decide(at.space, collection, body.to.toLowerCase(), action === 'accept', clientId));
  } catch (error) {
    return failed('change the listing', error);
  }
}
