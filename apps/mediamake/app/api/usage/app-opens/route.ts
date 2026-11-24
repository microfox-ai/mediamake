import { NextRequest, NextResponse } from 'next/server';
import { usageDB } from '@/lib/usage/store';
import { daysParam, parseAppOpen, sinceDays } from '@/lib/usage/usage';

/**
 * Apps opened from the app, for "what you use most" in Home's Apps column
 * (an app is a page of this site, so no hook or MCP can report it). Behind
 * the middleware, so x-client-id is the signed-in account.
 *
 * POST  { app }      one app opened from Home, Explore or My Items: its catalog id. The time is
 *                    the server's; nothing else is read or stored.
 * GET   ?days=90     the account's apps by how often it opened them, most opened first.
 *
 * DELETE /api/usage/skill-runs (`mm usage forget`) deletes these too.
 */
export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const parsed = parseAppOpen(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    await usageDB.addOpen(clientId, parsed);
    return NextResponse.json({ saved: 1 });
  } catch (error) {
    console.error('[usage] Could not save the app open:', error);
    return NextResponse.json({ error: 'Could not save it' }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const days = daysParam(req.nextUrl.searchParams.get('days'));
  try {
    return NextResponse.json({ days, apps: await usageDB.opensOf(clientId, sinceDays(days)) });
  } catch (error) {
    console.error('[usage] Could not read app opens:', error);
    return NextResponse.json({ error: 'Could not read them' }, { status: 503 });
  }
}
