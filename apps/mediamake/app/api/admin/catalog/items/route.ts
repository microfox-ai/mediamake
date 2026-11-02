import { NextRequest, NextResponse } from 'next/server';
import { publicReleasesOpen } from '@/lib/access';
import { requireAdmin } from '@/lib/admin-utils';
import { catalogIndex } from '@/lib/catalog/admin-index';
import { summarize } from '@/lib/catalog/summary';
import { CATALOG_KINDS, RELEASE_TIERS, type CatalogKind, type ReleaseTier } from '@/lib/catalog/types';

/**
 * GET /api/admin/catalog/items[?kind=skill][&tier=public][&archived=true|false][&q=brand]
 * Every catalog item in a line each (see ItemSummary): who can open it,
 * where it comes from, whether it is archived, what it works with, what uses
 * it, and its release page. What the MediaMake MCP's `catalog_items` tool
 * shows. Read-only: it settles no gates.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const params = req.nextUrl.searchParams;
  const kind = params.get('kind') as CatalogKind | null;
  const tier = params.get('tier') as ReleaseTier | null;
  const archived = params.get('archived');
  const q = params.get('q')?.trim().toLowerCase();
  if (kind && !CATALOG_KINDS.includes(kind)) return NextResponse.json({ error: `kind must be one of ${CATALOG_KINDS.join(', ')}` }, { status: 400 });
  if (tier && !RELEASE_TIERS.includes(tier)) return NextResponse.json({ error: `tier must be one of ${RELEASE_TIERS.join(', ')}` }, { status: 400 });

  const { byId } = await catalogIndex();
  const items = summarize([...byId.values()])
    .filter(
      item =>
        (!kind || item.kind === kind) &&
        (!tier || item.tier === tier) &&
        (archived === null || (archived === 'true') === !!item.archivedAt) &&
        (!q || `${item.id} ${item.title}`.toLowerCase().includes(q)),
    )
    .sort((a, b) => CATALOG_KINDS.indexOf(a.kind) - CATALOG_KINDS.indexOf(b.kind) || a.id.localeCompare(b.id));

  return NextResponse.json({ items, publicReleasesOpen: publicReleasesOpen() });
}
