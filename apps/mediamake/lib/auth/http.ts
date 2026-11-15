import { NextRequest, NextResponse } from 'next/server';
import { MailNotConfiguredError } from '@/lib/mail/send';
import { publicOrigin } from '@/lib/mcp/oauth';
import { AuthError } from './accounts';
import { clientIdOfSession, createSession, sessionCookieOptions } from './session';
import { callerIp } from './tokens';

/** Shared by the /api/auth routes, which skip the middleware and read the session cookie themselves. */

export { publicOrigin };

export const ipOf = (req: NextRequest) => callerIp(req.headers);

export const sessionClientIdOf = (req: NextRequest) => clientIdOfSession(req.cookies.get('session_token')?.value);

export const body = async (req: NextRequest) =>
  ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

/** The answer for a thrown error: its own words for an AuthError, a plain one otherwise. */
export function fail(error: unknown): NextResponse {
  if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.status });
  if (error instanceof MailNotConfiguredError) {
    return NextResponse.json({ message: 'Mail is not set up yet, so this cannot be sent. Ask an admin.' }, { status: 503 });
  }
  console.error('[auth]', error);
  return NextResponse.json({ message: 'Something went wrong. Try again.' }, { status: 500 });
}

/** Signs this browser in as `clientId` on `response`. */
export async function withSession<T extends NextResponse>(req: NextRequest, response: T, clientId: string): Promise<T> {
  response.cookies.set('session_token', await createSession(clientId, req.headers), sessionCookieOptions());
  return response;
}

/**
 * False when a browser says the request came from another site. Guards the
 * routes that change an account with nothing but the session cookie.
 */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') !== 'cross-site';
  try {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    return new URL(origin).host === host || origin === publicOrigin(req);
  } catch {
    return false;
  }
}

export const crossSite = () => NextResponse.json({ message: 'This request came from another site.' }, { status: 403 });
export const signedOut = () => NextResponse.json({ message: 'Sign in first.' }, { status: 401 });

/** Short-lived cookies of the Google and GitHub round trip. */
export const OAUTH_STATE_COOKIE = 'oauth_state';
export const PENDING_COOKIE = 'pending_identity';

export const shortCookie = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge,
  path: '/',
});
