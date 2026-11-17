import { NextRequest, NextResponse } from 'next/server';
import { publicOrigin, sessionClientIdOf, shortCookie } from '@/lib/auth/http';
import { safeRedirect, withRedirect } from '@/lib/auth/redirect';
import { getUserByClientId } from '@/lib/auth/users';
import { STATE_COOKIE, githubConfigured, newState, repoAuthorizeUrl } from '@/lib/space/github';

const BACK = '/app/projects';

/**
 * GET /api/space/github/start?redirectTo=…
 * A signed-in person lets MediaMake make their projects' private repos and
 * invite members to them: off to GitHub for the `repo` scope, back at
 * /api/auth/github/callback/repos. Only a browser session starts this.
 */
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req);
  const redirectTo = safeRedirect(req.nextUrl.searchParams.get('redirectTo'), BACK);
  const clientId = await sessionClientIdOf(req);
  if (!clientId) return NextResponse.redirect(`${origin}${withRedirect('/login', redirectTo)}`);
  const back = (message: string) => NextResponse.redirect(`${origin}${redirectTo}${redirectTo.includes('?') ? '&' : '?'}github=${encodeURIComponent(message)}`);
  if (!githubConfigured()) return back('GitHub sign-in is not set up on this site yet.');

  const user = await getUserByClientId(clientId).catch(() => null);
  const state = newState();
  const response = NextResponse.redirect(repoAuthorizeUrl({ origin, state, login: user?.githubLogin }));
  response.cookies.set(STATE_COOKIE, JSON.stringify({ state, redirectTo }), shortCookie(60 * 10));
  return response;
}
