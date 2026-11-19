import { NextRequest } from 'next/server';
import { SLUG } from '@/lib/cloud-library';
import { answer, caller, failed, refuse, spaceOf } from '@/lib/cloud-library/http';
import { libraryDB } from '@/lib/cloud-library/store';

/**
 * Rebuilds a collection's part of the search index from its records (lib/cloud-library/meaning).
 * The records are the truth: this is for an index that drifted, a collection filled before the
 * index was set up, or a changed way of cutting text into pieces.
 *
 * POST { space, collection, from? } → { total, done, records, next? }. A page of entries a call:
 *      send `next` back as `from` until there is none. Owners and editors of the space the
 *      collection belongs to (a shared collection is rebuilt by its owner's space).
 */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const body = await req.json().catch(() => null);
  const collection = String(body?.collection ?? '').toLowerCase();
  if (!SLUG.test(collection)) return refuse('collection is the id of the collection to rebuild');
  try {
    const at = await spaceOf(clientId, body?.space, 'write');
    if ('response' in at) return at.response;
    return answer(await libraryDB.reindex(at.space, collection, Number.isInteger(body?.from) ? body.from : 0));
  } catch (error) {
    return failed('rebuild the search index', error);
  }
}
