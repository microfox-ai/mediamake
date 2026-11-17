import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { applyHookEvent } from '@/lib/feedback/actions';
import { parseHookEvent } from '@/lib/feedback/auto-pr';
import { prMaxUsd } from '@/lib/feedback/budget';
import { feedbackDB } from '@/lib/feedback/store';
import { getCatalogRecord } from '@/lib/catalog/records';
import { publicOrigin } from '@/lib/mcp/oauth';

/**
 * For the feedback workflows in GitHub Actions (.github/workflows/feedback-fix.yml
 * and feedback-shipped.yml), not for people. Outside the middleware: the
 * caller shows FEEDBACK_HOOK_SECRET as a Bearer token, the same value as the
 * repository's secret of that name.
 *
 * GET  ?id=fb_…   what the fix run needs: the feedback's words, its item and
 *                 Claude's reading of it. Never who wrote it.
 * POST { event: 'fix', feedbackId, state: 'open' | 'failed', repo, prNumber?, prUrl?, runUrl?, costUSD?, note? }
 *                 how a fix run ended, and what it cost.
 * POST { event: 'merged', repo, prNumber }
 *                 a pull request merged: the feedback tied to it ships and
 *                 its writers are mailed. Sent for every merged PR; one that
 *                 answers no feedback changes nothing.
 */
export const maxDuration = 60;

function allowed(req: NextRequest): boolean | null {
  const secret = process.env.FEEDBACK_HOOK_SECRET?.trim();
  if (!secret) return null;
  const shown = Buffer.from(req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '');
  const expected = Buffer.from(secret);
  return shown.length === expected.length && timingSafeEqual(shown, expected);
}

function refuse(req: NextRequest) {
  const ok = allowed(req);
  if (ok === null) return NextResponse.json({ error: 'FEEDBACK_HOOK_SECRET is not set on this deployment' }, { status: 503 });
  return ok ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const refused = refuse(req);
  if (refused) return refused;
  const feedback = await feedbackDB.get(req.nextUrl.searchParams.get('id') ?? '').catch(() => null);
  if (!feedback) return NextResponse.json({ error: 'No such feedback' }, { status: 404 });
  const record = feedback.itemId ? await getCatalogRecord(feedback.itemId).catch(() => null) : null;
  return NextResponse.json({
    feedbackId: feedback.feedbackId,
    itemId: feedback.itemId ?? null,
    itemTitle: record?.title ?? null,
    version: feedback.version ?? null,
    kind: feedback.triage?.kind ?? null,
    severity: feedback.triage?.severity ?? null,
    summary: feedback.triage?.summary ?? null,
    text: feedback.text,
    maxUSD: prMaxUsd(),
  });
}

export async function POST(req: NextRequest) {
  const refused = refuse(req);
  if (refused) return refused;
  const event = parseHookEvent(await req.json().catch(() => null));
  if ('error' in event) return NextResponse.json({ error: event.error }, { status: 400 });
  try {
    const result = await applyHookEvent(event, publicOrigin(req));
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (error) {
    console.error('[feedback-hook] Could not apply the event:', error);
    return NextResponse.json({ error: 'Could not save it' }, { status: 503 });
  }
}
