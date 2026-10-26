import { Redis } from '@upstash/redis';
import { CrudHash } from '@microfox/db-upstash';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { ApiKeyInfo } from '@/app/types/db';
import { isAdmin } from '@/lib/admin-utils';
import { accessGrantsDB, accessGroupsDB } from '@/lib/catalog/store';
import {
  NETWORK_GROUP,
  PRIVATE_GROUP,
  effectiveVisibility,
  isAlwaysPublic,
  type AccessLevel,
  type CatalogItem,
  type ViewerTier,
} from '@/lib/catalog/types';

/**
 * Access control for gated catalog items.
 *
 * Skills are always public and open to everyone, signed in or not, even
 * while public releases are locked (their files are committed in the repo).
 * Other public items are open to everyone once public releases are turned on
 * (see publicReleasesOpen). A gated item counts as public once its
 * `publicAt` has passed. Otherwise a viewer may open an item when any of
 * these holds:
 *  - they are an admin (`isAdmin` on their Redis user profile);
 *  - a live grant names the item itself, for them or a group they are in;
 *  - the item is not never-publish, and a grant names its whole kind
 *    (`skill/*`) or everything (`*`), or they are in the `private` group;
 *  - the item is `network` or `public` and they are in the `network` group.
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
  const visibility = effectiveVisibility(item);
  if (visibility === 'public' && (publicReleasesOpen() || item.openToAll || isAlwaysPublic(item))) return 'open';
  if (entitlements.isAdmin || entitlements.itemIds.has(item.id)) return 'granted';
  // The vault only opens to admins and grants that name the item.
  if (item.neverPublish) return 'locked';
  const kindWildcard = `${item.id.split('/')[0]}/*`;
  if (entitlements.all || entitlements.itemIds.has(kindWildcard) || entitlements.groups.includes(PRIVATE_GROUP)) {
    return 'granted';
  }
  // The community also sees public items while public releases are locked.
  if (visibility !== 'private' && entitlements.groups.includes(NETWORK_GROUP)) return 'granted';
  return 'locked';
}

/** True when `viewer` may open `item`. */
export async function canAccess(
  viewer: Viewer,
  item: GatedItem,
): Promise<boolean> {
  if (effectiveVisibility(item) === 'public' && (publicReleasesOpen() || item.openToAll || isAlwaysPublic(item))) return true;
  return accessLevel(await getEntitlements(viewer), item) !== 'locked';
}

/**
 * The tier a viewer belongs to (see ViewerTier). Item access still goes
 * through accessLevel; this is for features that depend on who someone is,
 * such as which render paths they get.
 */
export function viewerTier(entitlements: Entitlements): ViewerTier {
  if (entitlements.isAdmin) return 'admin';
  if (entitlements.all || entitlements.groups.includes(PRIVATE_GROUP)) return 'private';
  if (entitlements.groups.includes(NETWORK_GROUP)) return 'community';
  return 'public';
}

export async function getViewerTier(viewer: Viewer): Promise<ViewerTier> {
  return viewerTier(await getEntitlements(viewer));
}

/**
 * Whether a tier may keep projects in the cloud and reach them through the
 * MediaMake MCP (which also needs an API key). Public users keep projects
 * local.
 */
export function canUseCloudProjects(tier: ViewerTier): boolean {
  return tier !== 'public';
}
