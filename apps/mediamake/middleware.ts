import { NextResponse, NextRequest } from 'next/server';
import { ApiKeyInfo } from './app/types/db';
import { Redis } from '@upstash/redis';
import { CrudHash } from '@microfox/db-upstash';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const sessionStore = new CrudHash<any>(redis, 'sessions');

export default async function middleware(request: NextRequest) {
  // --- 1. Session Authentication Pre-Check (for API calls from UI) ---
  const sessionId = request.cookies.get('session_token')?.value;
  if (sessionId) {
    const session = await sessionStore.get(sessionId);
    if (session && session.expires > Date.now()) {
      // If a valid session exists, authenticate the request and bypass API key logic.
      const response = NextResponse.next();
      response.headers.set('x-client-id', session.clientId);
      return response;
    }
  }

  // --- 2. Original, Unmodified API Key Authentication Logic ---
  // If no valid session was found, proceed with the traditional API key validation.
  const apiKey = request.headers.get('Authorization');
  let bearer = apiKey?.split(' ')[1];

  if (
    (process.env.NODE_ENV === 'development' &&
      !!process.env.DEV_API_KEY &&
      process.env.DEV_API_KEY !== '') &&
    !bearer
  ) {
    // In development, use the API key from environment variables
    const devApiKey = process.env.DEV_API_KEY;
    if (devApiKey) {
      bearer = devApiKey;
    }
    const response = NextResponse.next();
    response.headers.set(
      'x-client-id',
      process.env.NEXT_PUBLIC_DEV_CLIENT_ID ?? 'dev',
    );
    return response;
    //return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  // Only allow api/remotion, api/transcribe & api/transcriptions routes
  if (
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/transcribe') &&
    !pathname.startsWith('/api/transcriptions') &&
    !pathname.startsWith('/api/studio') &&
    !pathname.startsWith('/api/presets') &&
    !pathname.startsWith('/api/preset-data') &&
    process.env.NODE_ENV === 'production'
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!bearer) {
    return NextResponse.json(
      { error: 'Unauthorized ( No API Key provided )' },
      { status: 401 },
    );
  }

  const apiKeyStore = new CrudHash<ApiKeyInfo>(redis, 'apiKeys');

  const apiKeyInfo = await apiKeyStore.get(bearer);
  if (!apiKeyInfo || !apiKeyInfo.isValid) {
    return NextResponse.json(
      { error: 'Unauthorized ( Invalid API Key provided )' },
      { status: 401 },
    );
  }

  // Pass the clientId as a header to the next request
  const response = NextResponse.next();
  response.headers.set('x-client-id', apiKeyInfo.clientId);

  return response;
}

export const config = {
  /*
   * Match all API routes except for the ones starting with:
   * - login (the login API route)
   * - signup (the signup API route)
   * This ensures the middleware protects APIs but doesn't block auth.
   */
  matcher: '/api/((?!login|signup|session).*)',
};
