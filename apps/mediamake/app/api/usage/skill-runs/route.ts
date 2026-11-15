import { NextRequest, NextResponse } from 'next/server';
import { usageDB } from '@/lib/usage/store';
import { daysParam, parseRuns, sinceDays } from '@/lib/usage/usage';

/**
 * Skill runs: which skills an account runs and when, for "what you use most"
 * on Home. Behind the middleware, so x-client-id is the signed-in account
 * (session, API key or a connector's token).
 *
 * POST   { runs: [{ skill, at }] }   report runs: a skill's name and an ISO time each. Any
 *                                     other field is dropped and never stored. Reporting a run
 *                                     twice counts it once. What the repo's hook
 *                                     (tools/skill-runs.mjs) and mm-use's report_skill_run send.
 * GET    ?days=90                     the account's skills by how often they ran, most used first.
 * DELETE                              forget everything usage holds of the account (runs,
 *                                     local skills and apps opened).
 */
export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const parsed = parseRuns(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const saved = await usageDB.addRuns(clientId, parsed.runs);
    return NextResponse.json({ saved, known: parsed.runs.length - saved, dropped: parsed.dropped });
  } catch (error) {
    console.error('[usage] Could not save skill runs:', error);
    return NextResponse.json({ error: 'Could not save the runs' }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const days = daysParam(req.nextUrl.searchParams.get('days'));
  try {
    return NextResponse.json({ days, skills: await usageDB.usageOf(clientId, sinceDays(days)) });
  } catch (error) {
    console.error('[usage] Could not read skill runs:', error);
    return NextResponse.json({ error: 'Could not read the runs' }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  try {
    return NextResponse.json({ forgotten: await usageDB.forget(clientId) });
  } catch (error) {
    console.error('[usage] Could not delete usage:', error);
    return NextResponse.json({ error: 'Could not delete the usage' }, { status: 503 });
  }
}
