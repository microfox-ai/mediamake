import { ApiKeyInfo } from '@/app/types/db';
import { isAdmin } from '@/lib/admin-utils';
import { CrudHash } from '@microfox/db-upstash';
import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API keys for the /api-keys page. Behind the middleware, so x-client-id is
 * the signed-in client.
 *
 * GET:    everyone sees their own keys; admins see every key.
 * POST:   { clientName, clientId? } creates a key. Everyone can add any number
 *         of keys to their own account (clientName is then the key's label,
 *         e.g. "Laptop scripts"); admins can also create keys for other
 *         clients, and new clients.
 * PATCH:  { apiKey, clientName?, isValid? } renames, disables or enables a key.
 * DELETE: { apiKey } deletes a key.
 * PATCH and DELETE work on your own keys, and on every key for admins.
 *
 * A key is also its client's sign-in password, so no one can disable or
 * delete the last working key of their own account.
 */

function store() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return new CrudHash<ApiKeyInfo>(redis, 'apiKeys');
}

async function caller(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  return { clientId, admin: await isAdmin(clientId) };
}

const signedOut = () => NextResponse.json({ error: 'Sign in first' }, { status: 401 });
const forbidden = () =>
  NextResponse.json({ error: 'Only admins can create keys for other clients' }, { status: 403 });
// Someone else's key looks the same as a missing one to non-admins.
const notFound = () => NextResponse.json({ error: 'Key not found' }, { status: 404 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

function sortKeys(keys: ApiKeyInfo[]) {
  return keys
    .filter(Boolean)
    .sort((a, b) => (a.clientName || a.clientId).localeCompare(b.clientName || b.clientId));
}

export async function GET(req: NextRequest) {
  const { clientId, admin } = await caller(req);
  if (!clientId) return signedOut();
  const all = await store().list();
  const keys = admin ? all : all.filter(k => k?.clientId === clientId);
  return NextResponse.json({ clientId, isAdmin: admin, keys: sortKeys(keys) });
}

const createSchema = z.object({
  clientName: z.string().trim().min(1, 'Name is required').max(80),
  clientId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._@-]{2,64}$/, 'Client id: 2-64 letters, digits, dots, dashes, underscores or @')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

function clientIdFrom(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${slug || 'client'}-${randomBytes(3).toString('hex')}`;
}

export async function POST(req: NextRequest) {
  const { clientId, admin } = await caller(req);
  if (!clientId) return signedOut();

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad(parsed.error.issues[0].message);
  if (!admin && parsed.data.clientId && parsed.data.clientId !== clientId) return forbidden();

  const keys = store();
  const apiKey = randomBytes(16).toString('hex');
  if (await keys.get(apiKey)) return NextResponse.json({ error: 'Try again' }, { status: 500 });

  const info: ApiKeyInfo = {
    id: apiKey,
    apiKey,
    clientId: admin ? (parsed.data.clientId ?? clientIdFrom(parsed.data.clientName)) : clientId,
    clientName: parsed.data.clientName,
    isValid: true,
  };
  await keys.set(apiKey, info);
  return NextResponse.json({ key: info }, { status: 201 });
}

async function guardOwnLastKey(clientId: string | null, target: ApiKeyInfo) {
  if (target.clientId !== clientId) return null;
  const working = (await store().list()).filter(k => k?.clientId === clientId && k.isValid);
  return working.length <= 1 && target.isValid
    ? "This is your account's only working key, and you sign in with it. Create another key for yourself first."
    : null;
}

const patchSchema = z.object({
  apiKey: z.string().min(1),
  clientName: z.string().trim().min(1).max(80).optional(),
  isValid: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const { clientId, admin } = await caller(req);
  if (!clientId) return signedOut();

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad(parsed.error.issues[0].message);

  const keys = store();
  const existing = await keys.get(parsed.data.apiKey);
  if (!existing || (!admin && existing.clientId !== clientId)) return notFound();

  if (parsed.data.isValid === false) {
    const blocked = await guardOwnLastKey(clientId, existing);
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
  const { clientId, admin } = await caller(req);
  if (!clientId) return signedOut();

  const { apiKey } = await req.json().catch(() => ({}));
  if (typeof apiKey !== 'string' || !apiKey) return bad('apiKey is required');

  const keys = store();
  const existing = await keys.get(apiKey);
  if (!existing || (!admin && existing.clientId !== clientId)) return notFound();

  const blocked = await guardOwnLastKey(clientId, existing);
  if (blocked) return bad(blocked);

  await keys.del(apiKey);
  return NextResponse.json({ success: true });
}
