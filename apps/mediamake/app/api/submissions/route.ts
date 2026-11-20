import { NextRequest, NextResponse } from 'next/server';
import { getEntitlements, viewerTier } from '@/lib/access';
import { publicOrigin } from '@/lib/mcp/oauth';
import { directUpdateTier, publishDirectly, publishOwnSubmission, sendSubmission, withdrawSubmission } from '@/lib/submissions/actions';
import { submissionsDB } from '@/lib/submissions/store';
import { ownView, parseSubmission } from '@/lib/submissions/submission';

/**
 * Store submissions from members. Behind the middleware, so x-client-id is
 * the signed-in account. What `mm submit` and mm-use's submit_item,
 * my_submissions and withdraw_submission call.
 *
 * POST   { kind, name, made?: { title, url? }, files: [{ path, content, encoding? }], title?, summary?, version?, note?, publish? }
 *        sends an item privately for review. Every member may. A member below
 *        Cohort names the finished production made with it; Cohort members and
 *        admins may leave it out. An admin's `publish` (public, plus, pro or
 *        cohort) skips the review: the item is approved at once at that
 *        membership and released (`publishOwnSubmission`). An update to an item
 *        already in the store, sent by an admin or by the Cohort member who
 *        made it, is published the same way at the membership it has
 *        (`directUpdateTier`, `publishDirectly`). The leak checks run
 *        again here; the answer lists what they stop on (`problems`), which the
 *        sender fixes and sends again. The same item sent again before a
 *        decision replaces what was sent.
 * GET    the caller's own submissions, newest first, each with where it stands.
 * DELETE ?id=sub_…   takes one back before a decision.
 *
 * A submission is seen by admins and its sender only.
 */
export const maxDuration = 60;

const unavailable = (what: string, error: unknown) => {
  console.error(`[submissions] Could not ${what}:`, error);
  return NextResponse.json({ error: `Could not ${what}` }, { status: 503 });
};

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const parsed = parseSubmission(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const tier = viewerTier(await getEntitlements({ clientId }));
    const { publish } = parsed;
    // an update to an item already in the store, by an admin or by the Cohort member who made it: published at once
    const update = !publish ? await directUpdateTier(clientId, tier, parsed) : null;
    const outcome =
      publish && tier === 'admin'
        ? await publishOwnSubmission(clientId, { ...parsed, publish }, publicOrigin(req))
        : update
          ? await publishDirectly(clientId, tier, parsed, update, publicOrigin(req), tier === 'admin' ? 'An update published directly by an admin' : 'An update published directly by its maker')
          : await sendSubmission(clientId, tier, parsed);
    if (!outcome.ok) return NextResponse.json({ error: outcome.why }, { status: outcome.status ?? 400 });
    return NextResponse.json({ submission: ownView(outcome.submission), ...(outcome.notes?.length && { notes: outcome.notes }) });
  } catch (error) {
    return unavailable('save the submission', error);
  }
}

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  try {
    return NextResponse.json({ submissions: (await submissionsDB.listFor(clientId)).map(ownView) });
  } catch (error) {
    return unavailable('read the submissions', error);
  }
}

export async function DELETE(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  try {
    const outcome = await withdrawSubmission(req.nextUrl.searchParams.get('id') ?? '', clientId);
    if (!outcome.ok) return NextResponse.json({ error: outcome.why }, { status: outcome.status ?? 400 });
    return NextResponse.json({ submission: ownView(outcome.submission) });
  } catch (error) {
    return unavailable('withdraw the submission', error);
  }
}
