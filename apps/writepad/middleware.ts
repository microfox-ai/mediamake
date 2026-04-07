import { NextRequest, NextResponse } from 'next/server';
import { apiKeyStore, sessionStore } from '@/lib/auth/session-store';
import { isProtectedApiPath } from '@/lib/auth/auth-config';

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedApiPath(pathname)) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get('session_token')?.value;
  if (sessionId) {
    const session = await sessionStore.get(sessionId);
    if (session && session.expires > Date.now()) {
      const response = NextResponse.next();
      response.headers.set('x-client-id', session.clientId);
      return response;
    }
  }

  const authHeader = request.headers.get('authorization');
  let bearer = authHeader?.split(' ')[1];

  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_API_KEY &&
    process.env.DEV_API_KEY !== '' &&
    !bearer
  ) {
    bearer = process.env.DEV_API_KEY;
    const response = NextResponse.next();
    response.headers.set('x-client-id', process.env.NEXT_PUBLIC_DEV_CLIENT_ID ?? 'dev');
    return response;
  }

  if (!bearer) {
    return NextResponse.json(
      { error: 'Unauthorized ( No API Key provided )', reason: 'Missing Bearer token in Authorization header' },
      { status: 401 },
    );
  }

  const apiKeyInfo = await apiKeyStore.get(bearer);
  if (!apiKeyInfo || !apiKeyInfo.isValid) {
    return NextResponse.json(
      {
        error: 'Unauthorized ( Invalid API Key provided )',
        reason: !apiKeyInfo ? 'API key not found in database' : 'API key is marked as invalid',
      },
      { status: 401 },
    );
  }

  const response = NextResponse.next();
  response.headers.set('x-client-id', apiKeyInfo.clientId);
  return response;
}

export const config = {
  matcher: '/api/((?!login|logout|session).*)',
};
