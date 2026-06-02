import { NextRequest, NextResponse } from 'next/server';
import { userQuotaDB, nextResetISO } from '@/lib/quota-mongodb';
import { isAdmin } from '@/lib/admin-utils';

// GET /api/quota  — returns the calling user's quota + per-platform usage
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const quota = await userQuotaDB.getByClientId(clientId);
  const admin = await isAdmin(clientId);

  // Decorate each platform with its next-reset date for the UI
  const platforms = quota?.platforms
    ? Object.fromEntries(
        Object.entries(quota.platforms).map(([k, v]) => [
          k,
          { ...v!, nextResetAt: nextResetISO(v!) },
        ]),
      )
    : {};

  return NextResponse.json({
    quota: quota ? { ...quota, platforms } : null,
    isAdmin: admin,
    clientId,
  });
}
