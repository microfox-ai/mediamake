import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { userQuotaDB, ALL_PLATFORMS, type Platform } from '@/lib/quota-mongodb';

// DELETE /api/admin/quotas/[clientId]?platform=render
//   - With ?platform=…  removes just that platform's limit
//   - Without            removes the user's entire quota document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { clientId } = await params;
  const platform = new URL(req.url).searchParams.get('platform') as Platform | null;

  if (platform) {
    if (!ALL_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    await userQuotaDB.removePlatform(clientId, platform);
    return NextResponse.json({ success: true });
  }

  const deleted = await userQuotaDB.deleteQuota(clientId);
  if (!deleted) return NextResponse.json({ error: 'Quota not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
