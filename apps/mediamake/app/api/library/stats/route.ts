import { NextRequest } from 'next/server';
import { parseRef } from '@/lib/cloud-library';
import { answer, caller, failed, refuse, spaceOf } from '@/lib/cloud-library/http';
import { libraryDB } from '@/lib/cloud-library/store';

/**
 * An entry's numbers per platform and day (a song's streams, listeners, saves), kept apart from the
 * entry so a daily sync never touches its history. A worker or a person sends them; the entry's GET
 * gives the latest of each platform.
 *
 * POST { space, ref: "<collection>/<entry>", rows: [{ platform, day?, numbers: { streams: 1200 }, source? }] }
 *      The same platform and day is replaced. Numbers are stored as sent: no totals are made up.
 */
export async function POST(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const body = await req.json().catch(() => null);
  const ref = parseRef(body?.ref);
  if (!ref) return refuse('ref is <collection>/<entry>');
  try {
    const at = await spaceOf(clientId, body?.space, 'write');
    return 'response' in at ? at.response : answer(await libraryDB.putStats(at.space, ref.collection, ref.entry, Array.isArray(body.rows) ? body.rows : []));
  } catch (error) {
    return failed('save the numbers', error);
  }
}
