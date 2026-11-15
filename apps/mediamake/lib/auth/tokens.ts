import { Redis } from '@upstash/redis';
import { createHash, randomBytes } from 'crypto';

/**
 * One-time tokens for sign-in: the link in a verification or reset mail, the
 * state of a Google or GitHub round trip, and an identity waiting to be linked
 * to an account. Each is stored in Redis under the SHA-256 of the token, with
 * an expiry, so a copy of the database holds nothing that can be used.
 */

export type TokenKind = 'verify' | 'reset' | 'oauth' | 'identity';

function redis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('base64url');
const key = (kind: TokenKind, token: string) => `auth:${kind}:${sha256(token)}`;

export async function putToken<T extends object>(kind: TokenKind, data: T, ttlSeconds: number): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await redis().set(key(kind, token), JSON.stringify(data), { ex: ttlSeconds });
  return token;
}

function parse<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  // The Upstash client parses JSON strings itself.
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

/** Reads a token and leaves it usable. */
export async function peekToken<T>(kind: TokenKind, token: string | undefined | null): Promise<T | null> {
  if (!token) return null;
  return parse<T>(await redis().get(key(kind, token)));
}

/** Reads a token and uses it up. */
export async function takeToken<T>(kind: TokenKind, token: string | undefined | null): Promise<T | null> {
  if (!token) return null;
  return parse<T>(await redis().getdel(key(kind, token)));
}

/**
 * Counts one attempt under `name` and says whether it is still allowed: at
 * most `limit` in each window. Guards password and key guessing and mail floods.
 */
export async function allowAttempt(name: string, limit: number, windowSeconds: number): Promise<boolean> {
  const r = redis();
  const counter = `auth:rate:${sha256(name)}`;
  const count = await r.incr(counter);
  if (count === 1) await r.expire(counter, windowSeconds);
  return count <= limit;
}

/** The caller's address, for rate limits. */
export function callerIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
}
