import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { parseRef, type ReadAsk } from '@/lib/cloud-library';
import { librarySpaces } from '@/lib/cloud-library/access';
import { answer, caller, failed, keptBack, mayUseLibrary, placeOf, refuse, seen, spaceOf, through } from '@/lib/cloud-library/http';
import { shareDB } from '@/lib/cloud-library/share-store';
import { parseMadeFromAsk } from '@/lib/cloud-library/reuse';
import { storageReady } from '@/lib/cloud-library/storage';
import { libraryDB } from '@/lib/cloud-library/store';

/**
 * A Library's files. Bytes never pass through this server: they go to and from storage on signed
 * links that last an hour.
 *
 * POST  { action: "start", space, files: [{ sha256, size, name, contentType? }] }
 *            → { uploads: [{ sha256, uploadUrl, headers }], alreadyStored: [sha256…] }. PUT each file to its
 *              link with those headers. A content the space already stores is not sent again.
 *       Both take `collection` too when the files are for a collection another space shares with an editor role.
 *       { action: "finish", space, sha256s: [...], device? }
 *            checks the bytes arrived, then they can be put in an entry's slot (/api/library/entries).
 * GET   ?space=<id>&ref=<collection>/<entry> [&slots=master,artwork] [&device=…]
 *            signed links to the entry's files, each with its sha256 to check after the download.
 *       ?space=<id>&ref=…&read=<field or slot> [&lines=1-40] [&from=60&to=90]
 *            a field's text or a text or JSON file's content, whole or a part (lines, or seconds of a
 *            timed transcript). Nothing is downloaded by the caller.
 *       ?madeFrom=<sha256> [&space=<id>] [&slot=transcript] [&tool=…] [&params=…]
 *            the files that were made from that exact file with those settings (none: the tool's
 *            defaults), in one space or in every space the caller can open. Cards, no links.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { clientId, usage } = caller(req, body);
  if (!clientId) return refuse('Sign in first', 401);
  if (!storageReady()) return refuse('File storage is not set up on this server', 503);
  try {
    // an editor of a shared collection names it, so the bytes go to its owner's storage
    const at = await placeOf(clientId, body?.space, body?.collection, 'write');
    if ('response' in at) return at.response;
    if (body?.action === 'start') return answer(await libraryDB.startUploads(at.space, Array.isArray(body.files) ? body.files : [], clientId));
    if (body?.action === 'finish') return answer(await libraryDB.finishUploads(at.space, Array.isArray(body.sha256s) ? body.sha256s : [], through(usage, at)));
    return refuse('action is "start" or "finish"');
  } catch (error) {
    return failed('store the files', error);
  }
}

export async function GET(req: NextRequest) {
  const { clientId, usage } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const params = req.nextUrl.searchParams;
  if (params.has('madeFrom')) {
    const ask = parseMadeFromAsk(params);
    if ('error' in ask) return refuse(ask.error);
    try {
      if (params.get('space')) {
        const at = await spaceOf(clientId, params.get('space'), 'read');
        return 'response' in at ? at.response : answer(await libraryDB.madeFrom([at.space], ask, usage, await shareDB.into([at.space])));
      }
      const locked = await mayUseLibrary(clientId);
      if (locked) return locked;
      const spaces = await librarySpaces(await getDatabase(), clientId);
      return answer(await libraryDB.madeFrom(spaces, ask, usage, await shareDB.into(spaces)));
    } catch (error) {
      return failed('look for the result', error);
    }
  }
  const ref = parseRef(params.get('ref'));
  if (!ref) return refuse('ref is <collection>/<entry>, e.g. songs/nakama');
  try {
    const at = await placeOf(clientId, params.get('space'), ref.collection, 'read');
    if ('response' in at) return at.response;
    const kept = await keptBack(at, ref.entry);
    if (kept) return kept;
    if (params.has('read')) {
      const ask: ReadAsk = {};
      const lines = /^(\d+)-(\d+)$/.exec(params.get('lines') ?? '');
      if (lines) ask.lines = [Number(lines[1]), Number(lines[2])];
      if (params.has('from') || params.has('to')) ask.time = [Number(params.get('from')) || 0, Number(params.get('to')) || Number.MAX_SAFE_INTEGER];
      return answer(seen(at, await libraryDB.read(at.space, at.collection, ref.entry, String(params.get('read')), ask, through(usage, at))));
    }
    if (!storageReady()) return refuse('File storage is not set up on this server', 503);
    const slots = (params.get('slots') ?? '').split(',').map(slot => slot.trim().toLowerCase()).filter(Boolean);
    return answer(seen(at, await libraryDB.links(at.space, at.collection, ref.entry, slots, through(usage, at))));
  } catch (error) {
    return failed('get the files', error);
  }
}
