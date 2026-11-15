import { NextRequest, NextResponse } from 'next/server';
import { confirmEmail } from '@/lib/auth/accounts';
import { body, fail, withSession } from '@/lib/auth/http';

/**
 * POST /api/auth/verify  { token }
 * Confirms the link from a verification mail. A sign-up link makes the
 * account and signs in; a link that adds an email to an account only adds it.
 * A POST from the page's button, so mail scanners that open links use nothing up.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await body(req);
    const result = await confirmEmail(typeof token === 'string' ? token : null);
    const response = NextResponse.json({ signedIn: result.signIn, redirectTo: result.redirectTo });
    return result.signIn ? withSession(req, response, result.clientId) : response;
  } catch (error) {
    return fail(error);
  }
}
