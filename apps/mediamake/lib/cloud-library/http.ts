import { NextRequest, NextResponse } from 'next/server';
import { getViewerTier } from '@/lib/access';
import { tierHasFeature } from '@/lib/memberships/tiers';
import { getDatabase } from '@/lib/mongodb';
import { canWrite } from '@/lib/editor/project-access';
import { NEEDS_COHORT, libraryAccess, type LibrarySpace } from './access';
import { shareDB } from './share-store';
import { cardThrough, hiddenFromShare, type ShareRecord, type ShareRole } from './shares';
import { libraryDB } from './store';

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

/** Where a call's collection really is: in the space it named, or in the space that shares it. */
export interface Place {
  /** The space the records and files are in. For a shared collection, its owner's. */
  space: LibrarySpace;
  /** The collection's id in that space. */
  collection: string;
  /** Set when the collection was opened to the space the call named. */
  shared?: { to: LibrarySpace; as: string; by: string; role: ShareRole; share: ShareRecord };
}

/**
 * The space and the collection a call names, checked for this account. A collection another space
 * opened to this one is found under its id here, and can be changed only when its owner named this
 * space an editor.
 */
export async function placeOf(clientId: string | null, spaceId: unknown, collection: unknown, mode: 'read' | 'write'): Promise<Place | { response: NextResponse }> {
  const access = await libraryAccess(await getDatabase(), typeof spaceId === 'string' ? spaceId : null, clientId, 'read');
  if (!access.ok) return { response: refuse(access.error, access.status) };
  const slug = typeof collection === 'string' ? collection.toLowerCase() : '';
  const found = slug ? await shareDB.resolve(access.space, slug) : null;
  if (!found) {
    if (mode === 'write' && !canWrite(access.space.role)) return { response: refuse("You can read this Library: its space's owner or an editor adds and changes things", 403) };
    return { space: access.space, collection: slug };
  }
  if (mode === 'write' && found.space.role !== 'editor') return { response: refuse(`This collection is shared by ${found.by}: they and the editors they name add and change things`, 403) };
  return { space: found.space, collection: found.share.collection, shared: { to: access.space, as: found.share.as!, by: found.by, role: found.space.role as ShareRole, share: found.share } };
}

/** The usage line's who, with the space a shared collection was reached through. */
export const through = <T extends { clientId: string }>(usage: T, place: Place): T & { via?: string } => (place.shared ? { ...usage, via: place.shared.to.id } : usage);

/** An answer as the asking space reads it: a shared collection goes by its id there. */
export function seen<T extends object>(place: Place, result: T): T {
  if (!place.shared || 'error' in result) return result;
  const { shared } = place;
  const out = { ...result } as Record<string, unknown>;
  if (typeof out.ref === 'string') out.ref = `${shared.as}/${out.ref.split('/')[1]}`;
  if (out.entry && typeof out.entry === 'object') {
    const entry = out.entry as { card?: string; slug?: string };
    out.entry = { ...entry, collection: shared.as, space: shared.to.id, ...(typeof entry.card === 'string' && entry.slug && { card: cardThrough(entry.card, place.collection, entry.slug, shared.as, shared.by) }) };
  }
  out.shared = { by: shared.by, role: shared.role };
  return out as T;
}

/** A shared entry its owner keeps to their own space ("Internal only") is not there for the others. */
export async function keptBack(place: Place, entry: string): Promise<NextResponse | null> {
  if (!place.shared || place.shared.share.internal) return null;
  const doc = await libraryDB.entry(place.space.id, place.collection, entry);
  return doc && hiddenFromShare(doc, place.shared.share) ? refuse(`No ${place.shared.as}/${entry} in the ${place.shared.to.name} space`, 404) : null;
}
