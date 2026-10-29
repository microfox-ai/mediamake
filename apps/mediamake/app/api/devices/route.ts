import { isAdmin } from '@/lib/admin-utils';
import { findDevices } from '@/lib/auth/devices';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Signed-in devices for the /core/devices page (see lib/auth/devices). Behind
 * the middleware, so x-client-id is the signed-in client. Keep this route's
 * path clear of "session…": the middleware skips those, and then anyone could
 * send their own x-client-id.
 *
 * GET:     your devices. Admins: ?all=1 for everyone's, &clientId= for one user's.
 * DELETE:  { id } signs that device out; { all: true, clientId?, keepCurrent? }
 *          signs out every device of a user, optionally keeping this browser.
 *          Your own devices, and everyone's for admins.
 */

async function caller(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  return { clientId, admin: await isAdmin(clientId) };
}

const signedOut = () => NextResponse.json({ error: 'Sign in first' }, { status: 401 });
// Someone else's device looks the same as a missing one to non-admins.
const notFound = () => NextResponse.json({ error: 'Device not found' }, { status: 404 });

export async function GET(req: NextRequest) {
  const { clientId, admin } = await caller(req);
  if (!clientId) return signedOut();
  const params = req.nextUrl.searchParams;
  const user = admin ? params.get('clientId') || (params.get('all') ? null : clientId) : clientId;
  const { devices } = await findDevices(
    d => !user || d.clientId === user,
    req.cookies.get('session_token')?.value,
  );
  return NextResponse.json({ clientId, isAdmin: admin, devices });
}

const deleteSchema = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({
    all: z.literal(true),
    clientId: z.string().min(1).optional(),
    keepCurrent: z.boolean().optional(),
  }),
]);

export async function DELETE(req: NextRequest) {
  const { clientId, admin } = await caller(req);
  if (!clientId) return signedOut();

  const parsed = deleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Send { id } or { all: true }' }, { status: 400 });
  const body = parsed.data;
  if ('all' in body && !admin && body.clientId && body.clientId !== clientId) return notFound();

  const { devices, revoke } = await findDevices(
    'id' in body
      ? d => d.id === body.id && (admin || d.clientId === clientId)
      : d => d.clientId === (body.clientId ?? clientId) && !(body.keepCurrent && d.current),
    req.cookies.get('session_token')?.value,
  );
  if ('id' in body && devices.length === 0) return notFound();

  await revoke();
  return NextResponse.json({ revoked: devices.length });
}
