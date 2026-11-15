import { NextRequest, NextResponse } from 'next/server';
import { startSignup } from '@/lib/auth/accounts';
import { body, fail, ipOf, publicOrigin } from '@/lib/auth/http';

/**
 * POST /api/auth/signup  { email, password, name, redirectTo? }
 * Mails a link to confirm the address; the account is made when it is
 * confirmed (/api/auth/verify). Answers the same for an address that already
 * has an account.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, name, redirectTo } = await body(req);
    await startSignup({
      email,
      password,
      name,
      redirectTo: typeof redirectTo === 'string' ? redirectTo : undefined,
      origin: publicOrigin(req),
      ip: ipOf(req),
    });
    return NextResponse.json({ message: 'Check your mail for a link to confirm your address.' });
  } catch (error) {
    return fail(error);
  }
}
