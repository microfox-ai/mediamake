import { NextResponse } from 'next/server';
import { createSessionForClient, validateApiKey } from '@/lib/auth/session';

/**
 * Development-only sign-in for local browsers (Cursor, Claude, a human
 * without the login form). Reads server env, never the client bundle.
 *
 * Set DEV_CLIENT_KEY (or DEV_API_KEY) to an API key that exists in Redis.
 * The session clientId is taken from that key. Set DEV_CLIENT_ID only when
 * you want to require an exact match.
 */
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const clientKey = process.env.DEV_CLIENT_KEY || process.env.DEV_API_KEY;
  if (!clientKey) {
    return NextResponse.json(
      { message: 'Set DEV_CLIENT_KEY or DEV_API_KEY to enable dev login' },
      { status: 400 },
    );
  }

  const expectedClientId = process.env.DEV_CLIENT_ID || undefined;

  try {
    const apiKeyInfo = await validateApiKey(clientKey, expectedClientId);
    if (!apiKeyInfo) {
      return NextResponse.json(
        { message: 'Dev credentials are not a valid API key' },
        { status: 401 },
      );
    }

    await createSessionForClient(apiKeyInfo.clientId);
    return NextResponse.json({
      message: 'Logged in successfully',
      clientId: apiKeyInfo.clientId,
    });
  } catch {
    return NextResponse.json(
      { message: 'An internal error occurred' },
      { status: 500 },
    );
  }
}
