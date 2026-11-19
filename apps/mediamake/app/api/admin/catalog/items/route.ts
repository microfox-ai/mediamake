import { NextRequest, NextResponse } from 'next/server';
import { publicReleasesOpen } from '@/lib/access';
import { requireAdmin } from '@/lib/admin-utils';
import { catalogIndex } from '@/lib/catalog/admin-index';
import { summarize } from '@/lib/catalog/summary';
import { CATALOG_KINDS, ITEM_HEALTH, ITEM_TIERS, parseHealth, parseReadiness, type CatalogKind, type ItemTier } from '@/lib/catalog/types';

/**
 * GET /api/admin/catalog/items[?kind=skill][&tier=pro][&readiness=alpha|beta|production][&archived=true|false][&health=failed][&q=brand]
 * Every catalog item in a line each (see ItemSummary): the lowest membership
 * that opens it (tier: public, plus, pro, cohort, or admin for the vault), its
 * readiness (its level: alpha, beta, or production, `ready`, with its proof),
 * where it comes from, whether it is archived, its health, what it works with, what uses
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
  // the earlier names still filter: vault, development and community
  const tierParam = params.get('tier');
  const tier = (tierParam && ({ vault: 'admin', development: 'cohort', community: 'pro' } as Record<string, ItemTier>)[tierParam]) || (tierParam as ItemTier | null);
  const asked = params.get('readiness');
  const readiness = asked ? parseReadiness(asked) : null;
  const archived = params.get('archived');
  const healthParam = params.get('health');
  const health = healthParam ? parseHealth(healthParam) : null;
  const q = params.get('q')?.trim().toLowerCase();
  if (kind && !CATALOG_KINDS.includes(kind)) return NextResponse.json({ error: `kind must be one of ${CATALOG_KINDS.join(', ')}` }, { status: 400 });
  if (tier && !ITEM_TIERS.includes(tier)) return NextResponse.json({ error: `tier must be one of ${ITEM_TIERS.join(', ')}` }, { status: 400 });
  if (asked && !readiness) return NextResponse.json({ error: 'readiness must be one of alpha, beta, production (ready)' }, { status: 400 });
  if (healthParam && !health) return NextResponse.json({ error: `health must be one of ${ITEM_HEALTH.join(', ')}` }, { status: 400 });

  const { byId } = await catalogIndex();
  const items = summarize([...byId.values()])
    .filter(
      item =>
        (!kind || item.kind === kind) &&
        (!tier || item.tier === tier) &&
        (!readiness || item.readiness === readiness) &&
        (archived === null || (archived === 'true') === !!item.archivedAt) &&
        (!health || (item.health ?? 'healthy') === health) &&
        (!q || `${item.id} ${item.title}`.toLowerCase().includes(q)),
    )
    .sort((a, b) => CATALOG_KINDS.indexOf(a.kind) - CATALOG_KINDS.indexOf(b.kind) || a.id.localeCompare(b.id));

  return NextResponse.json({ items, publicReleasesOpen: publicReleasesOpen() });
}
