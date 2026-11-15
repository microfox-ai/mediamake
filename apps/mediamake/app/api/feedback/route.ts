import { NextRequest, NextResponse } from 'next/server';
import { accessLevel, getEntitlements, viewerTier } from '@/lib/access';
import { isAdmin } from '@/lib/admin-utils';
import { getCatalogRecord } from '@/lib/catalog/records';
import { FEEDBACK_PER_DAY, parseFeedback } from '@/lib/feedback/feedback';
import { feedbackDB } from '@/lib/feedback/store';

/**
 * Feedback from members. Behind the middleware, so x-client-id is the
 * signed-in account.
 *
 * POST { text, itemId?, version?, source? }   send feedback, about one catalog item or about
 *                                              MediaMake as a whole. Every member may, Public
 *                                              ones too. What mm-use's send_feedback calls.
 * GET  [?item=skill/x][&status=new][&all=true] the caller's own feedback, newest first; admins
 *                                              read everyone's with all=true.
 *
 * Feedback is seen by admins and its writer only.
 */
export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const parsed = parseFeedback(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const entitlements = await getEntitlements({ clientId });
  if (parsed.itemId) {
    // an item they can't see answers like one that doesn't exist: the cohort's and the vault's names stay hidden
    const item = await getCatalogRecord(parsed.itemId);
    if (!item || accessLevel(entitlements, item) === 'locked') return NextResponse.json({ error: `${parsed.itemId} isn't an item you can open` }, { status: 404 });
  }
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if ((await feedbackDB.countSince(clientId, since)) >= FEEDBACK_PER_DAY) {
      return NextResponse.json({ error: `That is ${FEEDBACK_PER_DAY} in a day: send the rest tomorrow` }, { status: 429 });
    }
    const { feedbackId, createdAt } = await feedbackDB.add(clientId, viewerTier(entitlements), parsed);
    return NextResponse.json({ feedbackId, createdAt });
  } catch (error) {
    console.error('[feedback] Could not save feedback:', error);
    return NextResponse.json({ error: 'Could not save the feedback' }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const all = params.get('all') === 'true';
  if (all && !(await isAdmin(clientId))) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  try {
    const feedback = await feedbackDB.list({
      ...(!all && { clientId }),
      itemId: params.get('item') ?? undefined,
      status: params.get('status') ?? undefined,
    });
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('[feedback] Could not read feedback:', error);
    return NextResponse.json({ error: 'Could not read the feedback' }, { status: 503 });
  }
}
