import { Redis } from '@upstash/redis';
import { CrudHash } from '@microfox/db-upstash';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { ApiKeyInfo } from '@/app/types/db';
import { isAdmin } from '@/lib/admin-utils';
import { accessGrantsDB, accessGroupsDB } from '@/lib/catalog/store';
import {
  NETWORK_GROUP,
  type AccessLevel,
  type CatalogItem,
} from '@/lib/catalog/types';

/**
 * Access control for gated catalog items.
 *
 * Public items are open to everyone once public releases are turned on
 * (see publicReleasesOpen). Otherwise a viewer may open an item when any of
 * these holds:
 *  - they are an admin (`isAdmin` on their Redis user profile);
 *  - a live grant names the item, its whole kind (`skill/*`) or everything
 *    (`*`), for them or for a group they are in;
 *  - the item is `network` and they are in the `network` group.
 * Grants, groups and invites are stored in MongoDB (lib/catalog/store) and
 * managed with `npm run catalog` or /api/admin/catalog.
 */

/**
 * Who is looking. `clientId` is null for signed-out visitors.
 */
export interface Viewer {
  clientId: string | null;
}

/** The fields access depends on; any other catalog fields may ride along. */
export type GatedItem = Pick<CatalogItem, 'id' | 'visibility'> & Partial<CatalogItem>;

/** Everything that decides what one viewer may open, resolved once. */
export interface Entitlements {
  clientId: string | null;
  isAdmin: boolean;
  groups: string[];
  /** Every item is granted (a `'*'` grant). */
  all: boolean;
  itemIds: Set<string>;
}

function redis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

async function clientIdFromSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  const session = await new CrudHash<any>(redis(), 'sessions').get(sessionId);
  return session && session.expires > Date.now() ? (session.clientId as string) : null;
}

/** Viewer for server components and pages, from the session cookie. */
export async function getViewer(): Promise<Viewer> {
  try {
    const sessionId = (await cookies()).get('session_token')?.value;
    return { clientId: await clientIdFromSession(sessionId) };
  } catch {
    return { clientId: null };
  }
}

/**
 * Viewer for `/api/catalog/*` routes. Those routes skip the middleware so
 * that signed-out visitors can browse, which means `x-client-id` is not set
 * by us there and must never be trusted. We resolve the session cookie or a
 * Bearer API key here instead.
 */
export async function resolveViewer(req: NextRequest): Promise<Viewer> {
  try {
    const fromSession = await clientIdFromSession(req.cookies.get('session_token')?.value);
    if (fromSession) return { clientId: fromSession };

    const bearer = req.headers.get('authorization')?.split(' ')[1];
    if (bearer) {
      const info = await new CrudHash<ApiKeyInfo>(redis(), 'apiKeys').get(bearer);
      if (info?.isValid) return { clientId: info.clientId };
    }

    if (process.env.NODE_ENV === 'development' && process.env.DEV_API_KEY) {
      return { clientId: process.env.NEXT_PUBLIC_DEV_CLIENT_ID ?? 'dev' };
    }
  } catch (error) {
    console.error('[access] Could not resolve viewer:', error);
  }
  return { clientId: null };
}

/**
 * Grants from `MEDIAMAKE_ACCESS_GRANTS`, a fallback for when the database is
 * not configured. Format: `clientId:skill/lyric-video|mcp/*,clientId2:*`.
 */
function envGrants(clientId: string): string[] {
  const raw = process.env.MEDIAMAKE_ACCESS_GRANTS ?? '';
  return raw
    .split(',')
    .map(entry => entry.trim().split(':'))
    .filter(([id]) => id === clientId)
    .flatMap(([, items]) => (items ?? '').split('|').map(s => s.trim()).filter(Boolean));
}

/** Resolves a viewer's admin flag, groups and grants. */
export async function getEntitlements(viewer: Viewer): Promise<Entitlements> {
  const { clientId } = viewer;
  const result: Entitlements = { clientId, isAdmin: false, groups: [], all: false, itemIds: new Set() };
  if (!clientId) return result;

  const fromEnv = envGrants(clientId);
  for (const id of fromEnv) {
    if (id === '*') result.all = true;
    else result.itemIds.add(id);
  }

  try {
    result.isAdmin = await isAdmin(clientId);
  } catch (error) {
    console.error('[access] Could not check admin flag:', error);
  }

  try {
    result.groups = await accessGroupsDB.groupsOf(clientId);
    const grants = await accessGrantsDB.liveFor(clientId, result.groups);
    for (const grant of grants) {
      if (grant.itemId === '*') result.all = true;
      else result.itemIds.add(grant.itemId);
    }
  } catch (error) {
    // No database configured, or it is down: fall back to env grants only.
    console.error('[access] Could not load grants:', error);
  }
  return result;
}

/**
 * Whether `public` items are open to everyone. Releases are locked until
 * MEDIAMAKE_PUBLIC_RELEASES=open: until then a public item needs a grant
 * like a private one, and nothing is shown to signed-out visitors.
 */
export function publicReleasesOpen(): boolean {
  return process.env.MEDIAMAKE_PUBLIC_RELEASES === 'open';
}

/** What `entitlements` can do with `item`. */
export function accessLevel(
  entitlements: Entitlements,
  item: GatedItem,
): AccessLevel {
  if (item.visibility === 'public' && publicReleasesOpen()) return 'open';
  const kindWildcard = `${item.id.split('/')[0]}/*`;
  if (
    entitlements.isAdmin ||
    entitlements.all ||
    entitlements.itemIds.has(item.id) ||
    entitlements.itemIds.has(kindWildcard)
  ) {
    return 'granted';
  }
  // The network circle also sees public items while public releases are locked.
  if (item.visibility !== 'private' && entitlements.groups.includes(NETWORK_GROUP)) return 'granted';
  return 'locked';
}

/** True when `viewer` may open `item`. */
export async function canAccess(
  viewer: Viewer,
  item: GatedItem,
): Promise<boolean> {
  if (item.visibility === 'public' && publicReleasesOpen()) return true;
  return accessLevel(await getEntitlements(viewer), item) !== 'locked';
}
