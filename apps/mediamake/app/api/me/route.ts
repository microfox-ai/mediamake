import { isAdmin } from '@/lib/admin-utils';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Who the caller is signed in as: the client id behind the session cookie, API
 * key or OAuth access token (the middleware resolves it). Signed-in apps such
 * as the Browse Hack extension show it as the account they're connected to.
 */
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  return NextResponse.json({ clientId, isAdmin: await isAdmin(clientId) });
}
