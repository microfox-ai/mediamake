import { NextRequest, NextResponse } from 'next/server';
import { platformCostUsageAggregatesDB } from '@/lib/cost-usage-mongodb';
import type { PeriodType } from '@/lib/cost-usage-types';
import { isAdmin } from '@/lib/admin-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodType = (searchParams.get('periodType') || 'month') as PeriodType;
    const periodValue = searchParams.get('periodValue') ?? undefined;
    const limit = searchParams.get('limit');
    const scope = searchParams.get('scope') || 'global';
    const validPeriodTypes: PeriodType[] = ['day', 'week', 'month'];
    if (!validPeriodTypes.includes(periodType)) {
      return NextResponse.json(
        { error: 'Invalid periodType. Use day, week, or month.' },
        { status: 400 }
      );
    }

    const callerClientId = request.headers.get('x-client-id');
    const admin = callerClientId ? await isAdmin(callerClientId) : false;

    if (scope !== 'global' && !admin && scope !== callerClientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const opts = limit ? { limit: Math.min(parseInt(limit, 10) || 500, 2000) } : undefined;
    const aggregates = await platformCostUsageAggregatesDB.getAllAggregates(
      periodType,
      periodValue ?? undefined,
      opts
    );

    const normalized = aggregates.map((a) => ({
      ...a,
      clientId: a.clientId ?? null,
    }));

    const visible = normalized.filter((a) => {
      const isGlobalRow = a.clientId == null || a.clientId === '';
      if (scope === 'global') {
        if (admin) return true;
        return isGlobalRow || a.clientId === callerClientId;
      }
      return a.clientId === scope;
    });

    return NextResponse.json({
      periodType,
      periodValue: periodValue ?? null,
      scope,
      isAdmin: admin,
      clientId: callerClientId,
      aggregates: visible,
    });
  } catch (e) {
    console.error('[billing/aggregates]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch billing aggregates' },
      { status: 500 }
    );
  }
}
