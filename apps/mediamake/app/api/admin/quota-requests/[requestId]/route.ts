import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import {
  quotaRequestDB,
  userQuotaDB,
  type PeriodType,
} from '@/lib/quota-mongodb';

// PATCH /api/admin/quota-requests/[requestId]
// Approve body: { action: 'approve', isUnlimited?, maxPerPeriod?, periodType?, note?, resetUsage? }
// Reject  body: { action: 'reject', reviewNote? }
//
// On approve: the quota_request's `platform` field decides which platform to grant.
// Admin may override the user's requested limit (custom increase/decrease).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  let adminId: string;
  try {
    adminId = requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { requestId } = await params;
  const body = await req.json();
  const { action, reviewNote } = body as { action: 'approve' | 'reject'; reviewNote?: string };

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const quotaReq = await quotaRequestDB.getById(requestId);
  if (!quotaReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  if (quotaReq.status !== 'pending') {
    return NextResponse.json({ error: `Request is already '${quotaReq.status}'` }, { status: 409 });
  }

  const reviewAction = action === 'approve' ? 'approved' : 'rejected';
  const updated = await quotaRequestDB.review(requestId, adminId, reviewAction, reviewNote);

  let quota = null;
  if (action === 'approve') {
    const isUnlimited = body.isUnlimited ?? false;
    const periodType: PeriodType = body.periodType ?? quotaReq.requestedPeriod ?? 'month';
    const maxPerPeriod = isUnlimited
      ? undefined
      : (body.maxPerPeriod !== undefined ? Number(body.maxPerPeriod) : quotaReq.requestedLimit);

    quota = await userQuotaDB.setPlatformLimit(
      quotaReq.requesterId,
      quotaReq.platform,
      {
        isUnlimited,
        maxPerPeriod,
        periodType,
        isActive: true,
        resetUsage: body.resetUsage,
      },
      { adminId, note: body.note ?? reviewNote },
    );
  }

  return NextResponse.json({ request: updated, quota });
}
