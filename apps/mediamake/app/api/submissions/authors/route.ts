import { NextRequest, NextResponse } from 'next/server';
import { getEntitlements, viewerTier } from '@/lib/access';
import { parseCatalogItemId } from '@/lib/catalog/types';
import { changeAuthors } from '@/lib/submissions/authors';

/**
 * A store item's authors (lib/catalog/authors), managed like a git repo's collaborators. Behind the
 * middleware, so x-client-id is the signed-in account. What `mm submit authors` calls. Only the
 * item's authors and admins read or change them; the answer names each author by GitHub login or
 * display name, never an email.
 *
 * GET  ?id=skill/<name>                                the item's authors
 * POST { id, add?: <email>, remove?: <email or name> } adds or removes one; an item always keeps one
 */
const ITEM_KINDS = ['skill', 'mcp', 'app'];

async function answer(req: NextRequest, id: unknown, change: { add?: unknown; remove?: unknown } = {}) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const parsed = typeof id === 'string' ? parseCatalogItemId(id) : null;
  if (!parsed || !ITEM_KINDS.includes(parsed.kind)) return NextResponse.json({ error: 'id is a skill, MCP or app, e.g. skill/make-thing' }, { status: 400 });
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : undefined);
  try {
    const tier = viewerTier(await getEntitlements({ clientId }));
    const outcome = await changeAuthors({ itemId: `${parsed.kind}/${parsed.slug}`, clientId, tier, add: text(change.add), remove: text(change.remove) });
    if (!outcome.ok) return NextResponse.json({ error: outcome.why }, { status: outcome.status });
    const { ok: _ok, ...view } = outcome;
    return NextResponse.json(view);
  } catch (error) {
    console.error('[submissions] Could not change the authors:', error);
    return NextResponse.json({ error: 'Could not read or change the authors' }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  return answer(req, req.nextUrl.searchParams.get('id'));
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: unknown; add?: unknown; remove?: unknown } | null;
  if (!body) return NextResponse.json({ error: 'Send { id, add?, remove? }' }, { status: 400 });
  if (!body.add && !body.remove) return NextResponse.json({ error: 'Say add (an email) or remove (an email or a name)' }, { status: 400 });
  return answer(req, body.id, body);
}
