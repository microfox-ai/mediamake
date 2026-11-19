import { NextRequest, NextResponse } from 'next/server';
import { librarySpaces } from '@/lib/cloud-library/access';
import { answer, caller, failed, mayUseLibrary, refuse, spaceOf } from '@/lib/cloud-library/http';
import { meaningReady } from '@/lib/cloud-library/meaning-store';
import { libraryDB } from '@/lib/cloud-library/store';
import { templateList } from '@/lib/cloud-library/templates';
import { getDatabase } from '@/lib/mongodb';
import { ensurePersonalProject } from '@/lib/projects/personal';

/**
 * The Cloud Library (lib/cloud-library, docs/library.md). Behind the middleware, so x-client-id is
 * the signed-in account. Open to the cohort for now.
 *
 * GET   no space        the spaces whose Library the account can open (its personal one first), each
 *                       with its collections, and the templates a new collection starts from.
 *       ?space=<id>     that space's collections in full: fields, slots, what the lists have learned,
 *                       the template's guide and the owner's preferences. Read this before filling one.
 * POST  { action: "new-collection", space, template, name? }   a collection from a template.
 *       { action: "prefs", space, collection, prefs }          the owner's preferences (Markdown, whole).
 *       { action: "headshot", space, collection, sha256? | url? } the collection's picture: an image the space
 *                                                              stores, or an https link. Neither takes it off.
 */
export async function GET(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  try {
    const spaceId = req.nextUrl.searchParams.get('space');
    if (spaceId) {
      const at = await spaceOf(clientId, spaceId, 'read');
      return 'response' in at ? at.response : NextResponse.json({ ...(await libraryDB.overview(at.space, true)), byMeaning: meaningReady() });
    }
    const locked = await mayUseLibrary(clientId);
    if (locked) return locked;
    const db = await getDatabase();
    // the personal space is made the first time it is asked for, as the Spaces page does
    await ensurePersonalProject(db, clientId).catch(error => console.error('[library] Could not make the personal space:', error));
    const spaces = await librarySpaces(db, clientId);
    return NextResponse.json({ spaces: await Promise.all(spaces.map(space => libraryDB.overview(space))), templates: templateList() });
  } catch (error) {
    return failed('read the Library', error);
  }
}

export async function POST(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const body = await req.json().catch(() => null);
  try {
    const at = await spaceOf(clientId, body?.space, 'write');
    if ('response' in at) return at.response;
    if (body?.action === 'new-collection') return answer(await libraryDB.createCollection(at.space, String(body.template ?? ''), clientId, typeof body.name === 'string' ? body.name : undefined));
    if (body?.action === 'prefs') {
      if (at.space.role !== 'owner') return refuse("Only the space's owner writes a collection's preferences", 403);
      return answer(await libraryDB.setPrefs(at.space, String(body.collection ?? ''), String(body.prefs ?? '')));
    }
    if (body?.action === 'headshot') return answer(await libraryDB.setHeadshot(at.space, String(body.collection ?? ''), { sha256: body.sha256, url: body.url }));
    return refuse('action is "new-collection", "prefs" or "headshot"');
  } catch (error) {
    return failed('change the Library', error);
  }
}
