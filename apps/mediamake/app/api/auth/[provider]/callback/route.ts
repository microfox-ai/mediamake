import { NextRequest, NextResponse } from 'next/server';
import { AuthError, finishOAuth } from '@/lib/auth/accounts';
import { OAUTH_STATE_COOKIE, PENDING_COOKIE, publicOrigin, sessionClientIdOf, shortCookie, withSession } from '@/lib/auth/http';
import { isProvider } from '@/lib/auth/providers';
import { ACCOUNT_PAGE, AFTER_SIGN_IN, safeRedirect, withRedirect } from '@/lib/auth/redirect';

/**
 * GET /api/auth/google/callback, /api/auth/github/callback
 * Where the provider sends the browser back. Signs in, adds the provider to
 * the signed-in account, or goes to /login/link when nobody has this identity yet.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider)) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const origin = publicOrigin(req);
  const to = (path: string) => {
    const response = NextResponse.redirect(`${origin}${path}`);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  };

  const sessionClientId = await sessionClientIdOf(req);
  try {
    const result = await finishOAuth(provider, {
      origin,
      code: req.nextUrl.searchParams.get('code'),
      state: req.nextUrl.searchParams.get('state'),
      cookieState: req.cookies.get(OAUTH_STATE_COOKIE)?.value,
      sessionClientId,
    });
    if (result.kind === 'pending') {
      const response = to(withRedirect('/login/link', result.redirectTo));
      response.cookies.set(PENDING_COOKIE, result.pending, shortCookie(60 * 15));
      return response;
    }
    if (result.kind === 'connected') return to(`${ACCOUNT_PAGE}?connected=${provider}`);
    return withSession(req, to(safeRedirect(result.redirectTo, AFTER_SIGN_IN)), result.clientId);
  } catch (error) {
    const message = error instanceof AuthError ? error.message : 'Something went wrong. Try again.';
    if (!(error instanceof AuthError)) console.error('[auth]', error);
    // A signed-in person was adding the provider: back to their account page.
    return to(`${sessionClientId ? ACCOUNT_PAGE : '/login'}?error=${encodeURIComponent(message)}`);
  }
}
