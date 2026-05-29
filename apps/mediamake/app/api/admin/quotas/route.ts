import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import {
  userQuotaDB,
  ALL_PLATFORMS,
  type Platform,
  type PeriodType,
} from '@/lib/quota-mongodb';

// GET /api/admin/quotas  — list all user quotas (admin)
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const quotas = await userQuotaDB.listAll();
  return NextResponse.json({ quotas });
}

// POST /api/admin/quotas  — set/update a SINGLE platform limit for a user
// Body: { clientId, platform, isUnlimited, maxPerPeriod?, periodType, isActive, note?, resetUsage? }
export async function POST(req: NextRequest) {
  let adminId: string;
  try {
    adminId = requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const {
    clientId,
    platform,
    isUnlimited = false,
    maxPerPeriod,
    periodType = 'month',
    isActive = true,
    note,
    resetUsage,
  } = body as {
    clientId: string;
    platform: Platform;
    isUnlimited?: boolean;
    maxPerPeriod?: number;
    periodType?: PeriodType;
    isActive?: boolean;
    note?: string;
    resetUsage?: boolean;
  };

  if (!clientId?.trim()) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }
  if (!ALL_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }
  if (!['day', 'month', 'lifetime'].includes(periodType)) {
    return NextResponse.json({ error: "periodType must be 'day', 'month', or 'lifetime'" }, { status: 400 });
  }
  if (!isUnlimited && (maxPerPeriod === undefined || Number(maxPerPeriod) < 0)) {
    return NextResponse.json({ error: 'maxPerPeriod is required when not unlimited' }, { status: 400 });
  }

  const quota = await userQuotaDB.setPlatformLimit(
    clientId.trim(),
    platform,
    {
      isUnlimited,
      maxPerPeriod: isUnlimited ? undefined : Number(maxPerPeriod),
      periodType,
      isActive,
      resetUsage,
    },
    { adminId, note },
  );

  return NextResponse.json({ quota });
}
