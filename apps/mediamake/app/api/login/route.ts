import { NextRequest, NextResponse } from 'next/server';
import { createSession, sessionCookieOptions, validateApiKey } from '@/lib/auth/session';
import { allowAttempt, callerIp } from '@/lib/auth/tokens';

/**
 * POST /api/login  { clientId, clientKey }
 * Core's sign-in (/core/login): a client id and one of its API keys. The
 * site's own sign-in, with email, Google and GitHub, is /api/auth/*.
 */
export async function POST(request: NextRequest) {
  try {
    const { clientId, clientKey } = await request.json();

    if (!(await allowAttempt(`core-login-ip:${callerIp(request.headers)}`, 30, 60 * 15))) {
      return NextResponse.json({ message: 'Too many tries. Wait a few minutes and try again.' }, { status: 429 });
    }

    const apiKeyInfo = await validateApiKey(clientKey, clientId);
    if (!apiKeyInfo) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ message: 'Logged in successfully' });
    response.cookies.set('session_token', await createSession(apiKeyInfo.clientId, request.headers), sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { message: 'An internal error occurred' },
      { status: 500 },
    );
  }
}
