import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { AuthError, adminLinkAccount, createClaimLink, listAccounts } from '@/lib/auth/accounts';
import { publicOrigin } from '@/lib/mcp/oauth';

/**
 * Accounts, for admins (behind the middleware, so x-client-id is the caller).
 *
 * GET   every account: its client id, email, name and sign-in methods, and
 *       the old accounts (a client id with keys only) nobody has linked yet.
 * POST  { clientId, email, name? } links an old account to a person: the
 *       admin vouches for the email, and the person then signs in with a
 *       Google or GitHub account of that address, or sets a password with
 *       "Forgot password".
 * POST  { clientId } makes a one-time link to send to the account's owner:
 *       whoever opens it links their Google or GitHub account to the account
 *       (/login/claim). It works once, for 7 days.
 */
async function admin(req: NextRequest) {
  try {
    return await requireAdmin(req);
  } catch {
    return null;
  }
}

const forbidden = () => NextResponse.json({ error: 'Admin access required' }, { status: 403 });

export async function GET(req: NextRequest) {
  if (!(await admin(req))) return forbidden();
  return NextResponse.json({ accounts: await listAccounts() });
}

export async function POST(req: NextRequest) {
  if (!(await admin(req))) return forbidden();
  try {
    const { clientId, email, name } = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
    if (email === undefined || email === '') {
      return NextResponse.json(await createClaimLink({ clientId, origin: publicOrigin(req) }));
    }
    return NextResponse.json({ account: await adminLinkAccount({ clientId, email, name }) });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[admin/users]', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
