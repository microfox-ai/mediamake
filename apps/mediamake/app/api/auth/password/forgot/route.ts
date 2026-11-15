import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/auth/accounts';
import { body, fail, ipOf, publicOrigin } from '@/lib/auth/http';

/** POST /api/auth/password/forgot  { email }: mails a reset link when the address has an account. */
export async function POST(req: NextRequest) {
  try {
    const { email } = await body(req);
    await requestPasswordReset({ email, origin: publicOrigin(req), ip: ipOf(req) });
    return NextResponse.json({ message: 'If that address has an account, a reset link is on its way.' });
  } catch (error) {
    return fail(error);
  }
}
