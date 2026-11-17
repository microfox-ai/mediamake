import { getAccount } from '@/lib/auth/accounts';
import { getEntitlements, viewerTier } from '@/lib/access';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Who the caller is signed in as: the client id behind the session cookie, API
 * key or OAuth access token (the middleware resolves it), with the account's
 * name, email and membership tier. Signed-in apps such as the Browse Hack
 * extension show it as the account they're connected to, and `mm items`
 * (tools/items.mjs) reads the tier from it, so a computer that is signed in
 * never has to be told who it is.
 */
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const [entitlements, account] = await Promise.all([
    getEntitlements({ clientId }),
    // an account from before sign-in has only its client id
    getAccount(clientId).catch(() => null),
  ]);
  return NextResponse.json({
    clientId,
    isAdmin: entitlements.isAdmin,
    tier: viewerTier(entitlements),
    ...(account?.name && { name: account.name }),
    ...(account?.email && { email: account.email }),
  });
}
