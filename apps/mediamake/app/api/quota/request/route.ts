import { NextRequest, NextResponse } from 'next/server';
import {
  quotaRequestDB,
  userQuotaDB,
  ALL_PLATFORMS,
  type Platform,
  type PeriodType,
} from '@/lib/quota-mongodb';

// GET /api/quota/request  — user's own request history
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requests = await quotaRequestDB.listByRequester(clientId);
  return NextResponse.json({ requests });
}

// POST /api/quota/request  — submit a new request for a specific platform
// Body: { platform, message?, requestedLimit?, requestedPeriod? }
export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { platform, message, requestedLimit, requestedPeriod } = body as {
    platform: Platform;
    message?: string;
    requestedLimit?: number;
    requestedPeriod?: PeriodType;
  };

  if (!ALL_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  // Determine type — 'access' if no limit exists for this platform, otherwise 'increase'
  const existing = await userQuotaDB.getByClientId(clientId);
  const platformLimit = existing?.platforms?.[platform];
  const type: 'access' | 'increase' = platformLimit && platformLimit.isActive ? 'increase' : 'access';

  // One pending request per platform at a time
  const hasPending = await quotaRequestDB.hasPendingForPlatform(clientId, platform);
  if (hasPending) {
    return NextResponse.json(
      { error: `You already have a pending request for ${platform}. Wait for it to be reviewed.` },
      { status: 409 },
    );
  }

  const request = await quotaRequestDB.create({
    requesterId: clientId,
    platform,
    type,
    message,
    requestedLimit: requestedLimit ? Number(requestedLimit) : undefined,
    requestedPeriod,
  });

  return NextResponse.json({ request }, { status: 201 });
}
