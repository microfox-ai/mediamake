import { CrudHash } from '@microfox/db-upstash';
import { Redis } from '@upstash/redis';
import type { ApiKeyInfo, AppSession } from '@/app/types/db';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const sessionStore = new CrudHash<AppSession>(redis, 'sessions');
export const apiKeyStore = new CrudHash<ApiKeyInfo>(redis, 'apiKeys');
