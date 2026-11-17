import { NextResponse } from 'next/server';

/**
 * Retired. This route used to give a client id and an API key to anyone who
 * asked. Accounts are now made on /signup (POST /api/auth/signup), which
 * confirms an email.
 */
export async function POST() {
  return NextResponse.json(
    { message: 'This route is retired. Create an account at /signup.' },
    { status: 410 },
  );
}
