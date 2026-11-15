import { Redis } from '@upstash/redis';
import { CrudHash, safeJsonParse } from '@microfox/db-upstash';
import { cookies, headers } from 'next/headers';
import { randomBytes } from 'crypto';
import { ApiKeyInfo } from '@/app/types/db';
import { deviceFromHeaders, type Device } from '@/lib/auth/device';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** A website login, stored under its session_token cookie. */
export interface WebSession {
  clientId: string;
  expires: number;
  /** Unset on logins from before devices were tracked. */
  createdAt?: number;
  device?: Device;
}

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

/** Stores a website login for a known client and returns its session token. */
export async function createSession(clientId: string, requestHeaders: Headers): Promise<string> {
  const sessionStore = new CrudHash<any>(redis(), 'sessions');
  const sessionId = randomBytes(32).toString('hex');
  await sessionStore.set(
    sessionId,
    {
      clientId,
      expires: Date.now() + SESSION_TTL_SECONDS * 1000,
      createdAt: Date.now(),
      device: deviceFromHeaders(requestHeaders),
    } satisfies WebSession,
    { ttl: SESSION_TTL_SECONDS },
  );
  return sessionId;
}

/** The session_token cookie's settings, for routes that set it on their response. */
export const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_TTL_SECONDS,
  path: '/',
});

/** Create a browser session cookie for a known client. */
export async function createSessionForClient(clientId: string) {
  const sessionId = await createSession(clientId, await headers());
  (await cookies()).set('session_token', sessionId, sessionCookieOptions());
}

/** The client id behind a session token, or null. */
export async function clientIdOfSession(sessionId: string | undefined | null): Promise<string | null> {
  if (!sessionId) return null;
  const session = await new CrudHash<WebSession & { id: string }>(redis(), 'sessions').get(sessionId);
  return session && session.expires > Date.now() ? session.clientId : null;
}

/**
 * Every live website login with its session token (CrudHash.list drops the
 * keys, and older sessions don't store theirs).
 */
export async function listWebSessions(): Promise<{ token: string; session: WebSession }[]> {
  const r = redis();
  const keys: string[] = [];
  let cursor = 0;
  do {
    const [next, batch] = await r.scan(cursor, { match: 'sessions:*', count: 250 });
    keys.push(...batch);
    cursor = Number(next);
  } while (cursor !== 0);
  if (keys.length === 0) return [];

  const pipeline = r.pipeline();
  keys.forEach(key => pipeline.hgetall(key));
  const values = await pipeline.exec<(Record<string, unknown> | null)[]>();
  return keys.flatMap((key, i) => {
    const value = values[i];
    if (!value) return [];
    // Same parsing as CrudHash.get.
    const session = Object.fromEntries(
      Object.entries(value).map(([field, v]) => [field, safeJsonParse(v as string)]),
    ) as unknown as WebSession;
    return session.expires > Date.now() ? [{ token: key.slice('sessions:'.length), session }] : [];
  });
}

/** Signs a browser out: the middleware rejects its cookie from the next request. */
export async function deleteWebSessions(tokens: string[]) {
  const sessionStore = new CrudHash<{ id: string }>(redis(), 'sessions');
  await Promise.all(tokens.map(token => sessionStore.del(token)));
}
