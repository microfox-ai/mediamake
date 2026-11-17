import { NextRequest, NextResponse } from 'next/server';
import { publicOrigin, sessionClientIdOf, shortCookie } from '@/lib/auth/http';
import { safeRedirect, withRedirect } from '@/lib/auth/redirect';
import { getUserByClientId } from '@/lib/auth/users';
import { STATE_COOKIE, appAuthorizeUrl, githubConfigured, newState } from '@/lib/space/github';

const BACK = '/app/spaces';

/**
 * GET /api/space/github/start?redirectTo=…
 * A signed-in person lets MediaMake's GitHub App make their projects'
 * private repos and invite members to them: off to GitHub to authorize the
 * App, back at /api/space/github/callback, which sends them on to install
 * it when it isn't on their account yet. Only a browser session starts this.
 * Without redirectTo it goes back where the round trip started (the cookie).
 */
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req);
  let before: { redirectTo?: string } = {};
  try {
    before = JSON.parse(req.cookies.get(STATE_COOKIE)?.value ?? '{}');
  } catch {
    // no cookie yet
  }
  const redirectTo = safeRedirect(req.nextUrl.searchParams.get('redirectTo') ?? before.redirectTo, BACK);
  const clientId = await sessionClientIdOf(req);
  if (!clientId) return NextResponse.redirect(`${origin}${withRedirect('/login', redirectTo)}`);
  const back = (message: string) => NextResponse.redirect(`${origin}${redirectTo}${redirectTo.includes('?') ? '&' : '?'}github=${encodeURIComponent(message)}`);
  if (!githubConfigured()) return back('The GitHub App is not set up on this site yet.');

  const user = await getUserByClientId(clientId).catch(() => null);
  const state = newState();
  const verifier = newState();
  const response = NextResponse.redirect(appAuthorizeUrl({ origin, state, verifier, login: user?.githubLogin }));
  // long enough to install the App on GitHub in between
  response.cookies.set(STATE_COOKIE, JSON.stringify({ state, verifier, redirectTo }), shortCookie(60 * 30));
  return response;
}
