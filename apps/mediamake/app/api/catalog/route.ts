import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/access';
import { CATALOG_KINDS, listCatalog, type CatalogKind } from '@/lib/catalog';

/**
 * GET /api/catalog?kind=skill|mcp|app|tutorial[&locked=show]
 * The catalog as the caller sees it: the items they can open. Works signed
 * out. With locked=show (Explore, mm-use's `explore`), the items a higher
 * membership opens come too, as `access: 'locked'` without their href; never
 * the cohort's or the vault's.
 */
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind') as CatalogKind | null;
  if (kind && !CATALOG_KINDS.includes(kind)) {
    return NextResponse.json({ error: `kind must be one of ${CATALOG_KINDS.join(', ')}` }, { status: 400 });
  }
  const viewer = await resolveViewer(req);
  const locked = req.nextUrl.searchParams.get('locked') === 'show' ? 'show' : 'hide';
  const items = await listCatalog(viewer, kind ?? undefined, { locked });
  return NextResponse.json({ signedIn: !!viewer.clientId, items });
}
