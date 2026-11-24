import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { itemDetail } from '@/lib/catalog/item-detail';

/**
 * GET /api/admin/catalog/item?id=mcp/browse-hack
 * One item as its release page shows it (/app/releases/<kind>/<slug>): lib/catalog/item-detail
 * says what is in it. Admins only. Read-only: unlike GET /api/admin/catalog, it settles no gates.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required, e.g. ?id=mcp/browse-hack' }, { status: 400 });
  const detail = await itemDetail(id);
  if (!detail) return NextResponse.json({ error: `No item ${id}` }, { status: 404 });
  return NextResponse.json(detail);
}
