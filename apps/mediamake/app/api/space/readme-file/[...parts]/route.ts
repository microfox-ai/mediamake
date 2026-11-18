import { NextRequest, NextResponse } from 'next/server';
import { canSeeSpace } from '@/lib/space/links-store';
import { pictureLink } from '@/lib/space/readme-files';
import { SPACE_KINDS } from '@/lib/space/space';
import { spaceDB } from '@/lib/space/store';

/**
 * GET /api/space/readme-file/<space>/<kind>/<name>/<path…>
 *
 * A picture an item's README shows from its own folder (`shots/steps.png`), for
 * an item in a space: the member's own, a project's or a linked item's. Behind
 * the middleware, so x-client-id is the viewer; only someone who may see that
 * space gets it. Answers with a redirect to a short-lived signed link: the
 * picture is never public (lib/space/readme-files). README pages point their
 * relative pictures here (lib/space/item-readme).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ parts: string[] }> }) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const parts = (await params).parts.map(part => decodeURIComponent(part));
  const [spaceId, kind, name, ...rest] = parts;
  const path = rest.join('/');
  if (!spaceId || !kind || !name || !path || !(SPACE_KINDS as readonly string[]).includes(kind)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    if (!(await canSeeSpace(spaceId, clientId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const readme = await spaceDB.itemReadme(spaceId, kind, name);
    const picture = readme?.pictures?.find(entry => entry.path === path);
    if (!picture) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const res = NextResponse.redirect(await pictureLink(spaceId, picture), 302);
    // the signed link lasts ten minutes; a browser keeps the redirect a little less
    res.headers.set('Cache-Control', 'private, max-age=300');
    return res;
  } catch (error) {
    console.error('[space] Could not hand out a README picture:', error);
    return NextResponse.json({ error: 'Could not read that picture' }, { status: 503 });
  }
}
