import { NextRequest, NextResponse } from 'next/server';
import { publicOrigin, sessionClientIdOf } from '@/lib/auth/http';
import { safeRedirect } from '@/lib/auth/redirect';
import { getUserByClientId } from '@/lib/auth/users';
import { REPO_SCOPE, STATE_COOKIE, repoGrantFromCode, stateMatches } from '@/lib/space/github';
import { githubGrants } from '@/lib/space/github-store';

/**
 * GET /api/auth/github/callback/repos
 * Where GitHub sends the browser back after "Connect GitHub" (/api/space/github/start).
 * It is under the sign-in callback, so the same GitHub app accepts it. The
 * grant is kept only when it is for the GitHub account linked to this
 * MediaMake account and carries the repo scope.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  if ((await params).provider !== 'github') return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const origin = publicOrigin(req);
  let saved: { state?: string; redirectTo?: string } = {};
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
  const code = req.nextUrl.searchParams.get('code');
  if (!code || !stateMatches(saved.state, req.nextUrl.searchParams.get('state'))) return to('GitHub was not connected. Try again.');

  try {
    const [grant, user] = await Promise.all([repoGrantFromCode({ origin, code }), getUserByClientId(clientId)]);
    if (!grant.scopes.includes(REPO_SCOPE)) return to('GitHub was not connected: the permission for private repos was not given.');
    if (!user?.githubId) return to('Link your GitHub account under Account first, then connect it for projects.');
    if (user.githubId !== grant.id) return to(`You are signed in to GitHub as ${grant.login}, but this MediaMake account is linked to ${user.githubLogin ?? 'another GitHub account'}. Switch on GitHub and try again.`);
    await githubGrants.save(clientId, grant);
    return to('connected');
  } catch (error) {
    console.error('[spaces] Connect GitHub failed:', error instanceof Error ? error.message : 'error');
    return to('GitHub was not connected. Try again.');
  }
}
