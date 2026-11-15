import { NextRequest, NextResponse } from 'next/server';
import { signInWithPassword } from '@/lib/auth/accounts';
import { body, fail, ipOf, withSession } from '@/lib/auth/http';

/** POST /api/auth/login  { email, password }: signs this browser in. */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await body(req);
    const { clientId } = await signInWithPassword({ email, password, ip: ipOf(req) });
    return withSession(req, NextResponse.json({ clientId }), clientId);
  } catch (error) {
    return fail(error);
  }
}
