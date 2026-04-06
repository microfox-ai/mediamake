import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiKeyStore, sessionStore } from '@/lib/auth/session-store';

export async function POST(request: Request) {
  try {
    const { clientId, clientKey } = await request.json();

    const apiKeyInfo = await apiKeyStore.get(clientKey);
    if (!apiKeyInfo || !apiKeyInfo.isValid || apiKeyInfo.clientId !== clientId) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const sessionId = randomBytes(32).toString('hex');
    const sessionExpiry = 60 * 60 * 24 * 7; // 7 days in seconds

    await sessionStore.set(
      sessionId,
      {
        id: sessionId,
        clientId: apiKeyInfo.clientId,
        expires: Date.now() + sessionExpiry * 1000,
      },
      { ttl: sessionExpiry },
    );

    (await cookies()).set('session_token', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionExpiry,
      path: '/',
    });

    return NextResponse.json({ message: 'Logged in successfully' });
  } catch {
    return NextResponse.json({ message: 'An internal error occurred' }, { status: 500 });
  }
}
