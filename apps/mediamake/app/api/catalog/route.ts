import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/access';
import { CATALOG_KINDS, listCatalog, type CatalogKind } from '@/lib/catalog';

/**
 * GET /api/catalog?kind=skill|mcp|app|tutorial
 * The catalog as the caller sees it. Works signed out: gated items come back
 * with `access: 'locked'` (and unlisted ones are left out).
 */
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind') as CatalogKind | null;
  if (kind && !CATALOG_KINDS.includes(kind)) {
    return NextResponse.json({ error: `kind must be one of ${CATALOG_KINDS.join(', ')}` }, { status: 400 });
  }
  const viewer = await resolveViewer(req);
  const items = await listCatalog(viewer, kind ?? undefined);
  return NextResponse.json({ signedIn: !!viewer.clientId, items });
}
