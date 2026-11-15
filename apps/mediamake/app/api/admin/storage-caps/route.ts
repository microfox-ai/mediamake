import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { getDatabase } from '@/lib/mongodb';
import { parseRaise, storageState } from '@/lib/projects/storage';
import { storageOf, storageRaisesDB } from '@/lib/projects/storage-store';

/**
 * Cloud project storage caps, for admins (behind the middleware, so
 * x-client-id is the caller). Each membership has a cap
 * (lib/projects/storage); these raise one person's.
 *
 * GET                        every raised cap, newest first.
 * GET    ?clientId=…         what that person stores, and their cap.
 * POST   { clientId, gb, note? }   raise their cap to `gb` GB. It counts when it is more than
 *                            their membership's cap, and stays when their membership changes.
 * DELETE ?clientId=…         back to their membership's cap.
 */
async function admin(req: NextRequest) {
  try {
    return await requireAdmin(req);
  } catch {
    return null;
  }
}

const forbidden = () => NextResponse.json({ error: 'Admin access required' }, { status: 403 });

async function stateOf(clientId: string) {
  const storage = await storageOf(await getDatabase(), clientId);
  return { clientId, tier: storage.tier, ...storageState(storage.used, storage.cap), raise: storage.raise };
}

export async function GET(req: NextRequest) {
  if (!(await admin(req))) return forbidden();
  const clientId = req.nextUrl.searchParams.get('clientId')?.trim();
  if (clientId) return NextResponse.json(await stateOf(clientId));
  return NextResponse.json({ raises: await storageRaisesDB.list() });
}

export async function POST(req: NextRequest) {
  const by = await admin(req);
  if (!by) return forbidden();
  const parsed = parseRaise(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await storageRaisesDB.set({ ...parsed, by });
  return NextResponse.json(await stateOf(parsed.clientId));
}

export async function DELETE(req: NextRequest) {
  if (!(await admin(req))) return forbidden();
  const clientId = req.nextUrl.searchParams.get('clientId')?.trim();
  if (!clientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  await storageRaisesDB.remove(clientId);
  return NextResponse.json(await stateOf(clientId));
}
