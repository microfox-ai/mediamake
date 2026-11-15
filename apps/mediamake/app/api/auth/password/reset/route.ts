import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/lib/auth/accounts';
import { body, fail, withSession } from '@/lib/auth/http';

/** POST /api/auth/password/reset  { token, password }: sets the password, signs other browsers out and this one in. */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await body(req);
    const { clientId } = await resetPassword({ token, password });
    return withSession(req, NextResponse.json({ clientId }), clientId);
  } catch (error) {
    return fail(error);
  }
}
