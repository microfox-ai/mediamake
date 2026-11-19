import { NextRequest, NextResponse } from 'next/server';
import { getViewerTier } from '@/lib/access';
import { tierHasFeature } from '@/lib/memberships/tiers';
import { getDatabase } from '@/lib/mongodb';
import { NEEDS_COHORT, libraryAccess, type LibrarySpace } from './access';

/** What the Library's routes share: who is asking, the space they named, and how a refusal is answered. */

export const refuse = (error: string, status = 400, more: object = {}) => NextResponse.json({ error, ...more }, { status });
export const answer = (result: object) => ('error' in result && 'status' in result ? refuse(String(result.error), Number(result.status), Object.fromEntries(Object.entries(result).filter(([key]) => key !== 'error' && key !== 'status'))) : NextResponse.json(result));
export const failed = (what: string, error: unknown) => {
  console.error(`[library] Could not ${what}:`, error instanceof Error ? error.message : error);
  return refuse(`Could not ${what}`, 503);
};

/** The signed-in account (the middleware sets x-client-id) and the place it calls from, when it said. */
export function caller(req: NextRequest, body?: { device?: unknown } | null) {
  const clientId = req.headers.get('x-client-id');
  const device = String(body?.device ?? req.nextUrl.searchParams.get('device') ?? '').replace(/[^\w .:-]/g, '').slice(0, 60);
  return { clientId, usage: { clientId: clientId ?? '', ...(device && { device }) } };
}

/** The space a call names, checked for this account. */
export async function spaceOf(clientId: string | null, spaceId: unknown, mode: 'read' | 'write'): Promise<{ space: LibrarySpace } | { response: NextResponse }> {
  const access = await libraryAccess(await getDatabase(), typeof spaceId === 'string' ? spaceId : null, clientId, mode);
  return access.ok ? { space: access.space } : { response: refuse(access.error, access.status) };
}

/** Whether the account may use the Library at all (the cohort, for now). Off in development, like the other membership checks. */
export async function mayUseLibrary(clientId: string): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === 'development') return null;
  return tierHasFeature(await getViewerTier({ clientId }), 'cloudLibrary') ? null : refuse(NEEDS_COHORT, 403);
}

export async function isAdmin(clientId: string): Promise<boolean> {
  return (await getViewerTier({ clientId })) === 'admin';
}
