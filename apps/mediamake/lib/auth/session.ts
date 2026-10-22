import { Redis } from '@upstash/redis';
import { CrudHash } from '@microfox/db-upstash';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { ApiKeyInfo } from '@/app/types/db';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function redis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

/** Look up an API key. When `clientId` is set, it must match the stored record. */
export async function validateApiKey(clientKey: string, clientId?: string) {
  const apiKeyStore = new CrudHash<ApiKeyInfo>(redis(), 'apiKeys');
  const apiKeyInfo = await apiKeyStore.get(clientKey);
  if (!apiKeyInfo || !apiKeyInfo.isValid) return null;
  if (clientId && apiKeyInfo.clientId !== clientId) return null;
  return apiKeyInfo;
}

/** Create a browser session cookie for a known client. */
export async function createSessionForClient(clientId: string) {
  const sessionStore = new CrudHash<any>(redis(), 'sessions');
  const sessionId = randomBytes(32).toString('hex');
  await sessionStore.set(
    sessionId,
    {
      clientId,
      expires: Date.now() + SESSION_TTL_SECONDS * 1000,
    },
    { ttl: SESSION_TTL_SECONDS },
  );

  (await cookies()).set('session_token', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}
