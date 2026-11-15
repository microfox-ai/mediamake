import { NextRequest, NextResponse } from 'next/server';
import { createFromPending, linkPendingWithKey } from '@/lib/auth/accounts';
import { PENDING_COOKIE, body, crossSite, fail, ipOf, sameOrigin, withSession } from '@/lib/auth/http';

/**
 * POST /api/auth/link
 * For someone who came back from Google or GitHub with an identity no account
 * has yet (the pending_identity cookie, 15 minutes):
 *   { clientId, clientKey }  links it to the old account that key proves;
 *   { create: true }         makes a new account for it.
 * Either way this browser is signed in.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return crossSite();
  try {
    const pending = req.cookies.get(PENDING_COOKIE)?.value;
    const { clientId, clientKey, create } = await body(req);
    const result =
      create === true ? await createFromPending(pending) : await linkPendingWithKey({ pending, clientId, clientKey, ip: ipOf(req) });
    const response = NextResponse.json({ clientId: result.clientId, redirectTo: result.redirectTo });
    response.cookies.delete(PENDING_COOKIE);
    return withSession(req, response, result.clientId);
  } catch (error) {
    return fail(error);
  }
}
