import { NextRequest, NextResponse } from 'next/server';
import { platformCostUsageAggregatesDB } from '@/lib/cost-usage-mongodb';
import type { PeriodType } from '@/lib/cost-usage-types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodType = (searchParams.get('periodType') || 'month') as PeriodType;
    const periodValue = searchParams.get('periodValue') ?? undefined;
    const limit = searchParams.get('limit');
    const validPeriodTypes: PeriodType[] = ['day', 'week', 'month'];
    if (!validPeriodTypes.includes(periodType)) {
      return NextResponse.json(
        { error: 'Invalid periodType. Use day, week, or month.' },
        { status: 400 }
      );
    }

    const opts = limit ? { limit: Math.min(parseInt(limit, 10) || 500, 2000) } : undefined;
    const aggregates = await platformCostUsageAggregatesDB.getAllAggregates(
      periodType,
      periodValue ?? undefined,
      opts
    );

    // Normalize for JSON (clientId undefined => null for "Global")
    const normalized = aggregates.map((a) => ({
      ...a,
      clientId: a.clientId ?? null,
    }));

    return NextResponse.json({
      periodType,
      periodValue: periodValue ?? null,
      aggregates: normalized,
    });
  } catch (e) {
    console.error('[billing/aggregates]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch billing aggregates' },
      { status: 500 }
    );
  }
}
