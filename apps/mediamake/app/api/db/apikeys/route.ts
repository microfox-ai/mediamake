import { ApiKeyInfo } from '@/app/types/db';
import { CrudHash } from '@microfox/db-upstash';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? 'https://ignore',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? 'ignore',
});
const apiKeyStore = new CrudHash<ApiKeyInfo>(redis, 'apiKeys');

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const apiKey = searchParams.get('apiKey');

  const apiKeyInfos = await apiKeyStore.list();
  if (apiKey) {
    return NextResponse.json(
      apiKeyInfos.find(apiKeyInfo => apiKeyInfo.apiKey === apiKey),
    );
  }
  if (clientId) {
    return NextResponse.json(
      apiKeyInfos.find(apiKeyInfo => apiKeyInfo.clientId === clientId),
    );
  }
  return NextResponse.json(apiKeyInfos);
};

export const POST = async (req: NextRequest) => {
  const { apiKey, clientId, clientName, isValid } = await req.json();
  const apiKeyInfo = await apiKeyStore.set(apiKey, {
    id: apiKey,
    apiKey,
    clientId,
    clientName,
    isValid,
  });
  return NextResponse.json(apiKeyInfo);
};

export const DELETE = async (req: NextRequest) => {
  const { apiKey } = await req.json();
  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
  }
  // del() returns void; NextResponse.json(undefined) is not serializable.
  await apiKeyStore.del(apiKey);
  return NextResponse.json({ success: true });
};
