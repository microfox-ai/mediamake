import { NextRequest, NextResponse } from 'next/server';
import { publicOrigin, sessionClientIdOf, shortCookie } from '@/lib/auth/http';
import { safeRedirect } from '@/lib/auth/redirect';
import { getUserByClientId } from '@/lib/auth/users';
import { STATE_COOKIE, appGrantFromCode, appInstallUrl, stateMatches } from '@/lib/space/github';
import { githubGrants } from '@/lib/space/github-store';

/**
 * GET /api/space/github/callback
 * The GitHub App's callback URL and its setup URL.
 * - Back from authorizing (code and state): the tokens are kept when they are
 *   for the GitHub account linked to this MediaMake account. When the App
 *   isn't installed on that account yet, on to GitHub to install it.
 * - Back from installing (installation_id, no state of ours): the round trip
 *   starts again, which now finds the App installed. Nothing is taken from
 *   this request's parameters.
 */
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req);
  let saved: { state?: string; verifier?: string; redirectTo?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get(STATE_COOKIE)?.value ?? '{}');
  } catch {
    // no cookie: the state check below fails
  }
  const redirectTo = safeRedirect(saved.redirectTo, '/app/projects');
  const to = (message: string) => {
    const response = NextResponse.redirect(`${origin}${redirectTo}${redirectTo.includes('?') ? '&' : '?'}github=${encodeURIComponent(message)}`);
    response.cookies.delete(STATE_COOKIE);
    return response;
  };

  const clientId = await sessionClientIdOf(req);
  if (!clientId) return to('Sign in first, then connect GitHub again.');
  const params = req.nextUrl.searchParams;
  const code = params.get('code');
  const ours = !!code && !!saved.verifier && stateMatches(saved.state, params.get('state'));
  if (!ours) {
    // back from installing the App: authorize again, which is instant now
    if (params.get('installation_id') || params.get('setup_action')) return NextResponse.redirect(`${origin}/api/space/github/start`);
    return to('GitHub was not connected. Try again.');
  }

  try {
    const [grant, user] = await Promise.all([appGrantFromCode({ origin, code: code!, verifier: saved.verifier! }), getUserByClientId(clientId)]);
    if (!user?.githubId) return to('Link your GitHub account under Account first, then connect it for projects.');
    if (user.githubId !== grant.id) return to(`You are signed in to GitHub as ${grant.login}, but this MediaMake account is linked to ${user.githubLogin ?? 'another GitHub account'}. Switch on GitHub and try again.`);
    if (!grant.installed) {
      // keep where to go back to, drop the used state: the setup URL brings them back here
      const response = NextResponse.redirect(appInstallUrl());
      response.cookies.set(STATE_COOKIE, JSON.stringify({ redirectTo }), shortCookie(60 * 30));
      return response;
    }
    await githubGrants.save(clientId, grant);
    return to('connected');
  } catch (error) {
    console.error('[spaces] Connect GitHub failed:', error instanceof Error ? error.message : 'error');
    return to('GitHub was not connected. Try again.');
  }
}
