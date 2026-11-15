import { NextRequest, NextResponse } from 'next/server';
import { startOAuth } from '@/lib/auth/accounts';
import { OAUTH_STATE_COOKIE, publicOrigin, sessionClientIdOf, shortCookie } from '@/lib/auth/http';
import { PROVIDER_NAMES, isProvider, providerConfigured } from '@/lib/auth/providers';
import { ACCOUNT_PAGE, withRedirect } from '@/lib/auth/redirect';

/**
 * GET /api/auth/google/start, /api/auth/github/start  ?redirectTo=…&connect=1
 * Sends the browser to the provider. With connect=1 a signed-in person adds
 * the provider to their own account instead of signing in.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = publicOrigin(req);
  const redirectTo = req.nextUrl.searchParams.get('redirectTo');
  const connect = req.nextUrl.searchParams.get('connect') === '1';
  const back = (message: string) =>
    NextResponse.redirect(
      `${origin}${withRedirect(`${connect ? ACCOUNT_PAGE : '/login'}?error=${encodeURIComponent(message)}`, connect ? null : redirectTo)}`,
    );

  if (!isProvider(provider)) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  if (!providerConfigured(provider)) return back(`${PROVIDER_NAMES[provider]} sign-in is not set up yet.`);

  let connectTo: string | null = null;
  if (connect) {
    connectTo = await sessionClientIdOf(req);
    if (!connectTo) return NextResponse.redirect(`${origin}${withRedirect('/login', ACCOUNT_PAGE)}`);
  }

  try {
    const { url, state } = await startOAuth(provider, { origin, redirectTo: connect ? ACCOUNT_PAGE : redirectTo, connectTo });
    const response = NextResponse.redirect(url);
    response.cookies.set(OAUTH_STATE_COOKIE, state, shortCookie(60 * 10));
    return response;
  } catch (error) {
    console.error('[auth] Could not start sign-in:', error);
    return back('Something went wrong. Try again.');
  }
}
