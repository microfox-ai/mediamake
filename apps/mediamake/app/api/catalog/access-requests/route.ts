import { NextRequest, NextResponse } from 'next/server';
import { publicReleasesOpen, resolveViewer } from '@/lib/access';
import { accessRequestsDB, catalogItemsDB } from '@/lib/catalog/store';

/** GET /api/catalog/access-requests — item ids the caller is waiting on. */
export async function GET(req: NextRequest) {
  const viewer = await resolveViewer(req);
  if (!viewer.clientId) return NextResponse.json({ pending: [] });
  return NextResponse.json({ pending: await accessRequestsDB.pendingFor(viewer.clientId) });
}

/** POST /api/catalog/access-requests  { itemId, message? } — ask for access. */
export async function POST(req: NextRequest) {
  const viewer = await resolveViewer(req);
  if (!viewer.clientId) return NextResponse.json({ error: 'Sign in to request access' }, { status: 401 });

  const { itemId, message } = (await req.json().catch(() => ({}))) as { itemId?: string; message?: string };
  if (!itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 });

  // Locked items are hidden, so only items the caller can already see (and
  // listed ones, once public releases are open) can be asked for.
  const item = await catalogItemsDB.get(itemId);
  if (!item || item.listed === false || !publicReleasesOpen()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (item.visibility === 'public') return NextResponse.json({ error: 'This item is already public' }, { status: 400 });

  const request = await accessRequestsDB.create(itemId, viewer.clientId, message?.slice(0, 1000));
  return NextResponse.json({ success: true, request });
}
