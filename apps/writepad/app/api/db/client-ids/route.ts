import { NextResponse } from 'next/server';
import { apiKeyStore } from '@/lib/auth/session-store';

/**
 * GET /api/db/client-ids
 * Returns distinct client IDs from Upstash apiKeys hash.
 */
export async function GET() {
  try {
    const apiKeys = await apiKeyStore.list();
    const clientIds = Array.from(
      new Set(
        apiKeys
          .map((k) => k?.clientId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ).sort();
    return NextResponse.json({ clientIds });
  } catch (error) {
    console.error('Error fetching client IDs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client IDs' },
      { status: 500 },
    );
  }
}
