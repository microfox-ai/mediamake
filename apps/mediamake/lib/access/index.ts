import { Redis } from '@upstash/redis';
import { CrudHash } from '@microfox/db-upstash';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { ApiKeyInfo } from '@/app/types/db';
import { isAdmin } from '@/lib/admin-utils';
import { accessGrantsDB, accessGroupsDB } from '@/lib/catalog/store';
import type { ViewerTier } from '@/lib/catalog/types';
import { membershipsDB } from '@/lib/memberships/store';
import { accessLevel, openToEveryone, viewerTier, type Entitlements, type GatedItem, type Viewer } from './rules';

export * from './rules';

/**
 * Access control for catalog items, on the membership ladder (Public, Plus,
 * Pro, Cohort, Admin: see lib/memberships/tiers).
 *
 * Every item names the lowest tier that opens it (itemTier), and every
 * viewer holds one tier (viewerTier): an admin by the `isAdmin` flag on
 * their Redis user profile, else the highest of their live membership
 * records (lib/memberships), else Public. The ladder is strict, so a viewer
 * opens every item at their tier or below.
 *
 * A Public item is open to everyone, signed in or not, once public releases
 * are turned on (see publicReleasesOpen); a skill in the public repo and an
 * item made by others are open even before that. Beside the ladder, a viewer
 * may open an item when a live grant names it, for them or a group they are
 * in, or, outside the vault, names its whole kind (`skill/*`) or everything
 * (`*`). The vault (tier Admin) opens to admins and to grants that name the
 * item, nothing else.
 *
 * Grants, groups and invites are stored in MongoDB (lib/catalog/store),
 * memberships in lib/memberships/store; all are managed with
 * `npm run catalog`, the MediaMake MCP or /api/admin/catalog.
 *
 * The rules themselves are in ./rules (pure, so they can be tested); this
 * file finds out who is looking and loads what they hold.
 */

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
  const result: Entitlements = { clientId, isAdmin: false, groups: [], all: false, itemIds: new Set(), memberships: [] };
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

  try {
    result.memberships = await membershipsDB.liveFor(clientId);
  } catch (error) {
    console.error('[access] Could not load memberships:', error);
  }
  return result;
}

/** True when `viewer` may open `item`. */
export async function canAccess(
  viewer: Viewer,
  item: GatedItem,
): Promise<boolean> {
  if (openToEveryone(item)) return true;
  return accessLevel(await getEntitlements(viewer), item) !== 'locked';
}

export async function getViewerTier(viewer: Viewer): Promise<ViewerTier> {
  return viewerTier(await getEntitlements(viewer));
}

