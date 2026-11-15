import { Redis } from '@upstash/redis';
import { canRenderOnLambda, getEntitlements, viewerTier } from '@/lib/access';
import { userRedisKey } from '@/lib/admin-utils';
import type { LambdaAccess } from './plan';

/**
 * Who may render on Remotion Lambda. Lambda costs us money per render, so it
 * is for clients holding a mediamake API key with render access, not for
 * everyone who signed up:
 *  - admins and the cohort (see FEATURE_TIERS in lib/memberships/tiers);
 *  - clients with `lambdaRender` on their Redis user profile
 *    (HSET user:{clientId} lambdaRender true, or POST /api/admin/user-config
 *    { type: 'lambda_render', clientId, allowed });
 *  - everyone with an API key, when MEDIAMAKE_LAMBDA_ACCESS=any-key, and
 *    everyone in development.
 * Everyone else renders locally (browser or CLI).
 */

const DENIED_REASON =
  'Lambda renders are for mediamake API keys with render access. Render it locally, or ask for Lambda access.';

function redis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });
}

async function hasLambdaFlag(clientId: string): Promise<boolean> {
  const val = await redis().hget(userRedisKey(clientId), 'lambdaRender');
  return val === true || val === 'true' || val === 1 || val === '1';
}

export async function setLambdaFlag(clientId: string, allowed: boolean): Promise<void> {
  if (allowed) await redis().hset(userRedisKey(clientId), { lambdaRender: 'true' });
  else await redis().hdel(userRedisKey(clientId), 'lambdaRender');
}

export async function getLambdaAccess(clientId: string | null | undefined): Promise<LambdaAccess> {
  if (!clientId) return { allowed: false, reason: 'Sign in with a mediamake API key to render on Lambda.' };
  if (process.env.MEDIAMAKE_LAMBDA_ACCESS === 'any-key' || process.env.NODE_ENV === 'development') return { allowed: true };

  try {
    const entitlements = await getEntitlements({ clientId });
    if (canRenderOnLambda(viewerTier(entitlements))) return { allowed: true };
    if (await hasLambdaFlag(clientId)) return { allowed: true };
  } catch (error) {
    console.error('[render-routing] Could not check Lambda access:', error);
  }
  return { allowed: false, reason: DENIED_REASON };
}
