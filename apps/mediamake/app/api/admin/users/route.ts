import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { AuthError, adminLinkAccount, listAccounts } from '@/lib/auth/accounts';

/**
 * Accounts, for admins (behind the middleware, so x-client-id is the caller).
 *
 * GET   every account: its client id, email, name and sign-in methods, and
 *       the old accounts (a client id with keys only) nobody has linked yet.
 * POST  { clientId, email, name? } links an old account to a person: the
 *       admin vouches for the email, and the person then signs in with a
 *       Google or GitHub account of that address, or sets a password with
 *       "Forgot password".
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
    return NextResponse.json({ account: await adminLinkAccount({ clientId, email, name }) });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[admin/users]', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
