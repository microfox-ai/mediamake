import { NextRequest, NextResponse } from 'next/server';
import { projectsCol, hasAccess, isValidId, toObjectId } from '@/lib/db/collections';
import { platformCostUsageCol } from '@/lib/db/cost-usage';

function shortModelName(source: string): string {
  const parts = source.split('/');
  return parts[parts.length - 1] ?? source;
}

/** GET /api/projects/[projectId]/usage?days=30&from=ISO&to=ISO */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isValidId(projectId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = await (await projectsCol()).findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') ?? '30', 10);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const from = fromParam ? new Date(fromParam) : new Date(Date.now() - days * 86_400_000);
  const to = toParam ? new Date(toParam) : new Date();

  const col = await platformCostUsageCol();

  const baseMatch = {
    projectId,
    platform: 'ai' as const,
    createdAt: { $gte: from, $lte: to },
  };

  const [summary, byModel, byUser, byDay] = await Promise.all([
    // ── Summary totals ──────────────────────────────────────────────────────
    col.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalCostUSD:          { $sum: '$cost.amountUSD' },
          totalInputTokens:      { $sum: { $add: [{ $ifNull: ['$metadata.usage.inputTokens', 0] }, { $ifNull: ['$metadata.usage.promptTokens', 0] }] } },
          totalOutputTokens:     { $sum: { $add: [{ $ifNull: ['$metadata.usage.outputTokens', 0] }, { $ifNull: ['$metadata.usage.completionTokens', 0] }] } },
          totalCachedTokens:     { $sum: { $ifNull: ['$metadata.usage.cachedInputTokens', 0] } },
          totalReasoningTokens:  { $sum: { $ifNull: ['$metadata.usage.reasoningTokens', 0] } },
          requestCount:          { $sum: 1 },
          inputUSD:              { $sum: { $ifNull: ['$cost.breakdown.inputUSD', 0] } },
          outputUSD:             { $sum: { $ifNull: ['$cost.breakdown.outputUSD', 0] } },
          reasoningUSD:          { $sum: { $ifNull: ['$cost.breakdown.reasoningUSD', 0] } },
          cacheReadUSD:          { $sum: { $ifNull: ['$cost.breakdown.cacheReadUSD', 0] } },
          cacheWriteUSD:         { $sum: { $ifNull: ['$cost.breakdown.cacheWriteUSD', 0] } },
        },
      },
    ]).toArray(),

    // ── By model ────────────────────────────────────────────────────────────
    col.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$source',
          cost:          { $sum: { $ifNull: ['$cost.amountUSD', 0] } },
          inputTokens:   { $sum: { $add: [{ $ifNull: ['$metadata.usage.inputTokens', 0] }, { $ifNull: ['$metadata.usage.promptTokens', 0] }] } },
          outputTokens:  { $sum: { $add: [{ $ifNull: ['$metadata.usage.outputTokens', 0] }, { $ifNull: ['$metadata.usage.completionTokens', 0] }] } },
          cachedTokens:  { $sum: { $ifNull: ['$metadata.usage.cachedInputTokens', 0] } },
          inputUSD:      { $sum: { $ifNull: ['$cost.breakdown.inputUSD', 0] } },
          outputUSD:     { $sum: { $ifNull: ['$cost.breakdown.outputUSD', 0] } },
          cacheReadUSD:  { $sum: { $ifNull: ['$cost.breakdown.cacheReadUSD', 0] } },
          requests:      { $sum: 1 },
        },
      },
      { $sort: { cost: -1 } },
    ]).toArray(),

    // ── By user (clientId) ──────────────────────────────────────────────────
    col.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id:          '$clientId',
          cost:         { $sum: { $ifNull: ['$cost.amountUSD', 0] } },
          inputTokens:  { $sum: { $add: [{ $ifNull: ['$metadata.usage.inputTokens', 0] }, { $ifNull: ['$metadata.usage.promptTokens', 0] }] } },
          outputTokens: { $sum: { $add: [{ $ifNull: ['$metadata.usage.outputTokens', 0] }, { $ifNull: ['$metadata.usage.completionTokens', 0] }] } },
          requests:     { $sum: 1 },
        },
      },
      { $sort: { cost: -1 } },
    ]).toArray(),

    // ── By day (time series) ────────────────────────────────────────────────
    col.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id:          { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          cost:         { $sum: { $ifNull: ['$cost.amountUSD', 0] } },
          inputTokens:  { $sum: { $add: [{ $ifNull: ['$metadata.usage.inputTokens', 0] }, { $ifNull: ['$metadata.usage.promptTokens', 0] }] } },
          outputTokens: { $sum: { $add: [{ $ifNull: ['$metadata.usage.outputTokens', 0] }, { $ifNull: ['$metadata.usage.completionTokens', 0] }] } },
          requests:     { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  const s = summary[0] ?? {};
  const totalIn = s.totalInputTokens ?? 0;
  const totalOut = s.totalOutputTokens ?? 0;

  return NextResponse.json({
    summary: {
      totalCostUSD:         s.totalCostUSD ?? 0,
      totalInputTokens:     totalIn,
      totalOutputTokens:    totalOut,
      totalTokens:          totalIn + totalOut,
      totalCachedTokens:    s.totalCachedTokens ?? 0,
      totalReasoningTokens: s.totalReasoningTokens ?? 0,
      requestCount:         s.requestCount ?? 0,
      avgCostPerRequest:    (s.requestCount ?? 0) > 0 ? (s.totalCostUSD ?? 0) / s.requestCount : 0,
      breakdown: {
        inputUSD:     s.inputUSD ?? 0,
        outputUSD:    s.outputUSD ?? 0,
        reasoningUSD: s.reasoningUSD ?? 0,
        cacheReadUSD: s.cacheReadUSD ?? 0,
        cacheWriteUSD: s.cacheWriteUSD ?? 0,
      },
    },
    byModel: byModel.map((m) => ({
      model:       (m._id as string) ?? 'unknown',
      displayName: shortModelName((m._id as string) ?? ''),
      cost:         m.cost ?? 0,
      inputTokens:  m.inputTokens ?? 0,
      outputTokens: m.outputTokens ?? 0,
      cachedTokens: m.cachedTokens ?? 0,
      inputUSD:     m.inputUSD ?? 0,
      outputUSD:    m.outputUSD ?? 0,
      cacheReadUSD: m.cacheReadUSD ?? 0,
      requests:     m.requests ?? 0,
    })),
    byUser: byUser.map((u) => ({
      clientId:     (u._id as string) ?? 'unknown',
      displayId:    ((u._id as string) ?? 'anonymous').slice(0, 10),
      cost:         u.cost ?? 0,
      inputTokens:  u.inputTokens ?? 0,
      outputTokens: u.outputTokens ?? 0,
      requests:     u.requests ?? 0,
    })),
    byDay: byDay.map((d) => ({
      date:         d._id as string,
      cost:         d.cost ?? 0,
      inputTokens:  d.inputTokens ?? 0,
      outputTokens: d.outputTokens ?? 0,
      requests:     d.requests ?? 0,
    })),
    meta: { from: from.toISOString(), to: to.toISOString(), days },
  });
}
