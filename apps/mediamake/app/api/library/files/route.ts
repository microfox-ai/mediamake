import { NextRequest } from 'next/server';
import { parseRef, type ReadAsk } from '@/lib/cloud-library';
import { answer, caller, failed, refuse, spaceOf } from '@/lib/cloud-library/http';
import { storageReady } from '@/lib/cloud-library/storage';
import { libraryDB } from '@/lib/cloud-library/store';

/**
 * A Library's files. Bytes never pass through this server: they go to and from storage on signed
 * links that last an hour.
 *
 * POST  { action: "start", space, files: [{ sha256, size, name, contentType? }] }
 *            → { uploads: [{ sha256, uploadUrl, headers }], alreadyStored: [sha256…] }. PUT each file to its
 *              link with those headers. A content the space already stores is not sent again.
 *       { action: "finish", space, sha256s: [...], device? }
 *            checks the bytes arrived, then they can be put in an entry's slot (/api/library/entries).
 * GET   ?space=<id>&ref=<collection>/<entry> [&slots=master,artwork] [&device=…]
 *            signed links to the entry's files, each with its sha256 to check after the download.
 *       ?space=<id>&ref=…&read=<field or slot> [&lines=1-40] [&from=60&to=90]
 *            a field's text or a text or JSON file's content, whole or a part (lines, or seconds of a
 *            timed transcript). Nothing is downloaded by the caller.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { clientId, usage } = caller(req, body);
  if (!clientId) return refuse('Sign in first', 401);
  if (!storageReady()) return refuse('File storage is not set up on this server', 503);
  try {
    const at = await spaceOf(clientId, body?.space, 'write');
    if ('response' in at) return at.response;
    if (body?.action === 'start') return answer(await libraryDB.startUploads(at.space, Array.isArray(body.files) ? body.files : [], clientId));
    if (body?.action === 'finish') return answer(await libraryDB.finishUploads(at.space, Array.isArray(body.sha256s) ? body.sha256s : [], usage));
    return refuse('action is "start" or "finish"');
  } catch (error) {
    return failed('store the files', error);
  }
}

export async function GET(req: NextRequest) {
  const { clientId, usage } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const params = req.nextUrl.searchParams;
  const ref = parseRef(params.get('ref'));
  if (!ref) return refuse('ref is <collection>/<entry>, e.g. songs/nakama');
  try {
    const at = await spaceOf(clientId, params.get('space'), 'read');
    if ('response' in at) return at.response;
    if (params.has('read')) {
      const ask: ReadAsk = {};
      const lines = /^(\d+)-(\d+)$/.exec(params.get('lines') ?? '');
      if (lines) ask.lines = [Number(lines[1]), Number(lines[2])];
      if (params.has('from') || params.has('to')) ask.time = [Number(params.get('from')) || 0, Number(params.get('to')) || Number.MAX_SAFE_INTEGER];
      return answer(await libraryDB.read(at.space, ref.collection, ref.entry, String(params.get('read')), ask, usage));
    }
    if (!storageReady()) return refuse('File storage is not set up on this server', 503);
    const slots = (params.get('slots') ?? '').split(',').map(slot => slot.trim().toLowerCase()).filter(Boolean);
    return answer(await libraryDB.links(at.space, ref.collection, ref.entry, slots, usage));
  } catch (error) {
    return failed('get the files', error);
  }
}
