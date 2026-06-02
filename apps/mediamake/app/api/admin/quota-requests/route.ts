import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { quotaRequestDB, type QuotaRequestStatus } from '@/lib/quota-mongodb';

// GET /api/admin/quota-requests?status=pending|approved|rejected
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const status = new URL(req.url).searchParams.get('status') as QuotaRequestStatus | null;
  const requests = await quotaRequestDB.listAll(status ?? undefined);
  return NextResponse.json({ requests });
}
