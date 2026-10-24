import { cookies } from 'next/headers';
import { Redis } from '@upstash/redis';
import { CrudHash } from '@microfox/db-upstash';
import type { CatalogItem } from '@/lib/catalog/types';

/**
 * Access control for private catalog items.
 *
 * Pages read the catalog through listCatalog (lib/catalog), which calls
 * canAccess, so the grant source can be swapped out here without touching
 * the UI.
 *
 * Current grant source (stub): the MEDIAMAKE_ACCESS_GRANTS env var,
 *   "clientA:skill/lyric-video|mcp/mediamake,clientB:*"
 * A grant can name an item id, a whole kind ("skill/*"), or everything ("*").
 */

export interface Viewer {
  clientId: string | null;
}

export async function getViewer(): Promise<Viewer> {
  try {
    const sessionId = (await cookies()).get('session_token')?.value;
    if (!sessionId || !process.env.UPSTASH_REDIS_REST_URL) {
      return { clientId: null };
    }
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const session = await new CrudHash<any>(redis, 'sessions').get(sessionId);
    if (session && session.expires > Date.now()) {
      return { clientId: session.clientId ?? null };
    }
  } catch (error) {
    console.error('[access] failed to read session', error);
  }
  return { clientId: null };
}

function parseGrants(raw: string | undefined): Map<string, string[]> {
  const grants = new Map<string, string[]>();
  for (const entry of (raw ?? '').split(',')) {
    const [clientId, items] = entry.split(':');
    if (!clientId?.trim() || !items) continue;
    grants.set(
      clientId.trim(),
      items.split('|').map((i) => i.trim()).filter(Boolean),
    );
  }
  return grants;
}

export async function canAccess(viewer: Viewer, item: CatalogItem): Promise<boolean> {
  if (item.visibility === 'public') return true;
  if (!viewer.clientId) return false;

  const granted = parseGrants(process.env.MEDIAMAKE_ACCESS_GRANTS).get(viewer.clientId) ?? [];
  return granted.some(
    (grant) => grant === '*' || grant === item.id || grant === `${item.kind}/*`,
  );
}
