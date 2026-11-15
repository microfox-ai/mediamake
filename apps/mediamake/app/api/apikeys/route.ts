import { ApiKeyInfo } from '@/app/types/db';
import { CrudHash } from '@microfox/db-upstash';
import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API keys for the app's API Keys page. Behind the middleware, so x-client-id
 * is the signed-in account.
 *
 * Every verb works on the caller's own keys and no one else's, admins
 * included: a key is its account's sign-in password, so no page or route
 * shows one account's keys to another. Someone else's key answers like a
 * missing one.
 *
 * GET:    your keys.
 * POST:   { clientName } adds a key to your account (clientName is the key's
 *         label, e.g. "Laptop scripts").
 * PUT:    { apiKey } rotates a key: a new secret under the same name, and the
 *         old one stops working at once.
 * PATCH:  { apiKey, clientName?, isValid? } renames, disables or enables a key.
 * DELETE: { apiKey } deletes a key.
 *
 * No one can disable or delete the last working key of their account.
 * Someone locked out of an account gets a one-time link from an admin
 * (Manage Memberships), never their key.
 */

function store() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return new CrudHash<ApiKeyInfo>(redis, 'apiKeys');
}

const signedOut = () => NextResponse.json({ error: 'Sign in first' }, { status: 401 });
const notFound = () => NextResponse.json({ error: 'Key not found' }, { status: 404 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

/** The keys of one account, by name. */
function keysOf(all: ApiKeyInfo[], clientId: string) {
  return all
    .filter(key => key?.clientId === clientId)
    .sort((a, b) => (a.clientName || a.clientId).localeCompare(b.clientName || b.clientId));
}

async function freshSecret(keys: CrudHash<ApiKeyInfo>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomBytes(16).toString('hex');
    if (!(await keys.get(candidate))) return candidate;
  }
  throw new Error('Could not make a unique API key');
}

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signedOut();
  return NextResponse.json({ clientId, keys: keysOf(await store().list(), clientId) });
}

const createSchema = z.object({
  clientName: z.string().trim().min(1, 'Name is required').max(80),
});

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signedOut();

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad(parsed.error.issues[0].message);

  const keys = store();
  const apiKey = await freshSecret(keys);
  const info: ApiKeyInfo = { id: apiKey, apiKey, clientId, clientName: parsed.data.clientName, isValid: true };
  await keys.set(apiKey, info);
  return NextResponse.json({ key: info }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signedOut();

  const { apiKey } = await req.json().catch(() => ({}));
  if (typeof apiKey !== 'string' || !apiKey) return bad('apiKey is required');

  const keys = store();
  const existing = await keys.get(apiKey);
  if (!existing || existing.clientId !== clientId) return notFound();

  const next = await freshSecret(keys);
  const rotated: ApiKeyInfo = { ...existing, id: next, apiKey: next };
  await keys.set(next, rotated);
  try {
    await keys.del(existing.apiKey);
  } catch (error) {
    await keys.del(next);
    throw error;
  }
  return NextResponse.json({ key: rotated });
}

async function guardLastKey(clientId: string, target: ApiKeyInfo) {
  const working = (await store().list()).filter(k => k?.clientId === clientId && k.isValid);
  return working.length <= 1 && target.isValid
    ? "This is your account's only working key. Create another key first."
    : null;
}

const patchSchema = z.object({
  apiKey: z.string().min(1),
  clientName: z.string().trim().min(1).max(80).optional(),
  isValid: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signedOut();

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad(parsed.error.issues[0].message);

  const keys = store();
  const existing = await keys.get(parsed.data.apiKey);
  if (!existing || existing.clientId !== clientId) return notFound();

  if (parsed.data.isValid === false) {
    const blocked = await guardLastKey(clientId, existing);
    if (blocked) return bad(blocked);
  }

  const updated: ApiKeyInfo = {
    ...existing,
    clientName: parsed.data.clientName ?? existing.clientName,
    isValid: parsed.data.isValid ?? existing.isValid,
  };
  await keys.set(existing.apiKey, updated);
  return NextResponse.json({ key: updated });
}

export async function DELETE(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return signedOut();

  const { apiKey } = await req.json().catch(() => ({}));
  if (typeof apiKey !== 'string' || !apiKey) return bad('apiKey is required');

  const keys = store();
  const existing = await keys.get(apiKey);
  if (!existing || existing.clientId !== clientId) return notFound();

  const blocked = await guardLastKey(clientId, existing);
  if (blocked) return bad(blocked);

  await keys.del(apiKey);
  return NextResponse.json({ success: true });
}
