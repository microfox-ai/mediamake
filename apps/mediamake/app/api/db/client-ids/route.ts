import { ApiKeyInfo } from '@/app/types/db';
import { CrudHash } from '@microfox/db-upstash';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? 'https://ignore',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? 'ignore',
});
const apiKeyStore = new CrudHash<ApiKeyInfo>(redis, 'apiKeys');

/**
 * GET /api/db/client-ids
 * Returns only clientIds (no sensitive data like apiKeys)
 * Safe to expose to client-side
 */
export const GET = async (req: NextRequest) => {
  try {
    const apiKeyInfos = await apiKeyStore.list();
    
    // Extract only clientIds, filter out null/undefined/empty values
    const clientIds = Array.from(
      new Set(
        apiKeyInfos
          .map((info) => info?.clientId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    ).sort(); // Sort alphabetically for better UX

    return NextResponse.json({ clientIds });
  } catch (error) {
    console.error('Error fetching client IDs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client IDs' },
      { status: 500 }
    );
  }
};
