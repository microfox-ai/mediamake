import { NextRequest, NextResponse } from 'next/server';
import { accessRequestsDB } from '@/lib/catalog/store';
import { tierOf } from '@/lib/memberships/admin';
import { nextTier, tierRequestId } from '@/lib/memberships/requests';

/**
 * POST /api/memberships/request  { message? }
 * Asks an admin for the next membership up (Subscription's "Ask an admin").
 * The request lands in Manage Memberships; asking again refreshes it. Behind
 * the middleware, so x-client-id is the signed-in caller.
 */
export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in to ask' }, { status: 401 });

  const { message } = ((await req.json().catch(() => ({}))) ?? {}) as { message?: unknown };
  const tier = nextTier(await tierOf(clientId));
  if (!tier) return NextResponse.json({ error: 'There is no higher membership to ask for' }, { status: 400 });

  const request = await accessRequestsDB.create(tierRequestId(tier), clientId, typeof message === 'string' ? message.trim().slice(0, 1000) || undefined : undefined);
  return NextResponse.json({ success: true, tier, request });
}
