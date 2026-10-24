import { ApiKeyInfo } from '@/app/types/db';
import { requireAdmin } from '@/lib/admin-utils';
import { CrudHash } from '@microfox/db-upstash';
import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? 'https://ignore',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? 'ignore',
});
const apiKeyStore = new CrudHash<ApiKeyInfo>(redis, 'apiKeys');

async function generateUniqueApiKey(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomBytes(16).toString('hex');
    const existing = await apiKeyStore.get(candidate);
    if (!existing) return candidate;
  }
  throw new Error('Failed to generate a unique API key');
}

/**
 * POST /api/admin/apikeys/rotate
 * Replace an existing API key with a new secret. The client record
 * (clientId, clientName, isValid) is kept. The previous secret stops
 * working as soon as this succeeds.
 *
 * Body: { apiKey: string } or { clientId: string }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let body: { apiKey?: unknown; clientId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';

  if (!apiKey && !clientId) {
    return NextResponse.json(
      { error: 'apiKey or clientId is required' },
      { status: 400 },
    );
  }

  try {
    let existing: ApiKeyInfo | undefined;

    if (apiKey) {
      existing = (await apiKeyStore.get(apiKey)) ?? undefined;
      if (!existing) {
        return NextResponse.json({ error: 'API key not found' }, { status: 404 });
      }
    } else {
      const matches = (await apiKeyStore.list()).filter(
        (info) => info?.clientId === clientId,
      );
      if (matches.length === 0) {
        return NextResponse.json(
          { error: 'No API key found for this client' },
          { status: 404 },
        );
      }
      if (matches.length > 1) {
        return NextResponse.json(
          { error: 'Multiple API keys exist for this client. Pass apiKey to choose one.' },
          { status: 409 },
        );
      }
      existing = matches[0];
    }

    if (!existing?.apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const previousApiKey = existing.apiKey;
    const nextApiKey = await generateUniqueApiKey();
    const rotated: ApiKeyInfo = {
      id: nextApiKey,
      apiKey: nextApiKey,
      clientId: existing.clientId,
      clientName: existing.clientName,
      isValid: existing.isValid,
    };

    await apiKeyStore.set(nextApiKey, rotated);
    try {
      await apiKeyStore.del(previousApiKey);
    } catch (deleteError) {
      await apiKeyStore.del(nextApiKey);
      throw deleteError;
    }

    return NextResponse.json(rotated);
  } catch (error) {
    console.error('API key rotation error:', error);
    return NextResponse.json(
      { error: 'Failed to rotate API key' },
      { status: 500 },
    );
  }
}
