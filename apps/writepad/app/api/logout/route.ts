import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionStore } from '@/lib/auth/session-store';

export async function POST() {
  const sessionId = (await cookies()).get('session_token')?.value;
  if (sessionId) {
    await sessionStore.del(sessionId);
  }

  (await cookies()).set('session_token', '', {
    expires: new Date(0),
    path: '/',
  });

  return NextResponse.json({ message: 'Logged out successfully' });
}
