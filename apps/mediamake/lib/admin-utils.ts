import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

/** Redis key for a user's profile hash. */
export function userRedisKey(clientId: string): string {
  return `user:${clientId}`;
}

/**
 * Returns true if the clientId has isAdmin=true in their Redis user profile.
 * Set via: HSET user:{clientId} isAdmin true
 */
export async function isAdmin(clientId: string | null | undefined): Promise<boolean> {
  if (!clientId) return false;
  const val = await redis.hget(userRedisKey(clientId), 'isAdmin');
  return val === true || val === 'true' || val === 1 || val === '1';
}

/** Reads x-client-id header and checks if it's an admin. */
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  return isAdmin(req.headers.get('x-client-id'));
}

/** Throws a structured error if the request is not from an admin. */
export async function requireAdmin(req: NextRequest): Promise<string> {
  const clientId = req.headers.get('x-client-id');
  if (!(await isAdmin(clientId))) {
    throw Object.assign(new Error('Admin access required'), { status: 403 });
  }
  return clientId!;
}
