import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { CrudHash } from '@microfox/db-upstash';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const sessionStore = new CrudHash<any>(redis, 'sessions');

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
