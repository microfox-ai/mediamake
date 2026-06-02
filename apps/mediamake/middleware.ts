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
  const { pathname } = request.nextUrl;
  const isWebhook = pathname.startsWith('/api/webhooks/');
  
  // console.log(`[Middleware] ========================================`);
  // console.log(`[Middleware] Request to: ${pathname}`);
  // console.log(`[Middleware] Is webhook: ${isWebhook}`);
  
  // --- 1. Session Authentication Pre-Check (for API calls from UI) ---
  const sessionId = request.cookies.get('session_token')?.value;
  // console.log(`[Middleware] Session ID from cookie: ${sessionId ? 'Present' : 'Missing'}`);
  
  if (sessionId) {
    const session = await sessionStore.get(sessionId);
    if (session && session.expires > Date.now()) {
      // If a valid session exists, authenticate the request and bypass API key logic.
      // console.log(`[Middleware] ✅ Valid session found for client: ${session.clientId}`);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-client-id', session.clientId);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    // console.log(`[Middleware] Session invalid or expired`);
  }

  // --- 2. Original, Unmodified API Key Authentication Logic ---
  // If no valid session was found, proceed with the traditional API key validation.
  const apiKey = request.headers.get('Authorization');
  // console.log(`[Middleware] Authorization header: ${apiKey ? `Present (${apiKey.substring(0, 20)}...)` : 'Missing'}`);
  
  let bearer = apiKey?.split(' ')[1];
  // console.log(`[Middleware] Bearer token extracted: ${bearer ? `Yes (length: ${bearer.length})` : 'No'}`);

  if (
    (process.env.NODE_ENV === 'development' &&
      !!process.env.DEV_API_KEY &&
      process.env.DEV_API_KEY !== '') &&
    !bearer
  ) {
    // In development, use the API key from environment variables
    // console.log(`[Middleware] Using DEV_API_KEY from environment`);
    const devApiKey = process.env.DEV_API_KEY;
    if (devApiKey) {
      bearer = devApiKey;
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-client-id', process.env.NEXT_PUBLIC_DEV_CLIENT_ID ?? 'dev');
    // console.log(`[Middleware] ✅ Dev mode authenticated`);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    //return NextResponse.next();
  }

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
    // console.error(`[Middleware] ❌ Path not allowed: ${pathname}`);
    return NextResponse.json({ error: 'Unauthorized', reason: 'Path not allowed' }, { status: 401 });
  }

  if (!bearer) {
    // console.error(`[Middleware] ❌ REJECTION REASON: No Bearer token found`);
    // console.error(`[Middleware] ❌ Authorization header was: ${apiKey || 'null'}`);
    return NextResponse.json(
      { error: 'Unauthorized ( No API Key provided )', reason: 'Missing Bearer token in Authorization header' },
      { status: 401 },
    );
  }

  // console.log(`[Middleware] Looking up API key in store...`);
  // console.log(`[Middleware] Bearer token first 20 chars: ${bearer.substring(0, 20)}`);
  
  const apiKeyStore = new CrudHash<ApiKeyInfo>(redis, 'apiKeys');

  const apiKeyInfo = await apiKeyStore.get(bearer);
  // console.log(`[Middleware] API key lookup result: ${apiKeyInfo ? 'Found' : 'Not found'}`);
  
  if (apiKeyInfo) {
    // console.log(`[Middleware] API key isValid: ${apiKeyInfo.isValid}`);
    // console.log(`[Middleware] API key clientId: ${apiKeyInfo.clientId}`);
  }
  
  if (!apiKeyInfo || !apiKeyInfo.isValid) {
    // console.error(`[Middleware] ❌ REJECTION REASON: ${!apiKeyInfo ? 'API key not found in store' : 'API key found but marked as invalid'}`);
    // console.error(`[Middleware] ❌ Bearer token: ${bearer}`);
    return NextResponse.json(
      { 
        error: 'Unauthorized ( Invalid API Key provided )', 
        reason: !apiKeyInfo ? 'API key not found in database' : 'API key is marked as invalid',
        hint: 'Make sure the API key exists in your database and isValid is true'
      },
      { status: 401 },
    );
  }

  // Pass the clientId as a header to the next request
  // console.log(`[Middleware] ✅✅✅ Authentication successful for client: ${apiKeyInfo.clientId}`);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-client-id', apiKeyInfo.clientId);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  /*
   * Match all API routes except for the ones starting with:
   * - login (the login API route)
   * - signup (the signup API route)
   * - session (the session API route)
   * 
   * Note: Webhooks are NOT excluded - they use API key authentication too!
   */
  matcher: '/api/((?!login|signup|session).*)',
};
