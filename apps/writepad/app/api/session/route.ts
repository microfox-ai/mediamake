import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionStore } from '@/lib/auth/session-store';

export async function GET() {
  const sessionId = (await cookies()).get('session_token')?.value;
  if (!sessionId) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }

  const session = await sessionStore.get(sessionId);
  if (session && session.expires > Date.now()) {
    return NextResponse.json({
      isAuthenticated: true,
      clientId: session.clientId,
    });
  }

  return NextResponse.json({ isAuthenticated: false }, { status: 401 });
}
