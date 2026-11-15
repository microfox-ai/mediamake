import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { storageState } from '@/lib/projects/storage';
import { storageOf } from '@/lib/projects/storage-store';

/**
 * GET /api/project/storage
 * What the signed-in account stores in the cloud projects it owns, and its
 * cap (its membership's, or what an admin raised it to): `{ tier, used, cap,
 * left, percent, near, full, raised, byProject }`, in bytes; `cap: null` is
 * no cap. Behind the middleware, so x-client-id is the caller.
 */
export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  try {
    const storage = await storageOf(await getDatabase(), clientId);
    return NextResponse.json({ tier: storage.tier, ...storageState(storage.used, storage.cap), raised: !!storage.raise && storage.cap === storage.raise.bytes, byProject: storage.byProject });
  } catch (error) {
    console.error('[storage] Could not count storage:', error);
    return NextResponse.json({ error: 'Could not count your storage' }, { status: 503 });
  }
}
