import { LISTING_PICTURES, LISTING_PICTURE_TYPE, parseAuthorListing, withAuthorListing, type AuthorListing, type ListingFields } from './listing';
import { parseYouTubeId } from './video';

/**
 * The part of an item's store listing that the people who look after it change themselves: its
 * description, its pictures (the headshot and, for an MCP or an app, the icon), its tags, its
 * README and its screenshots. They are its authors (./authors) and admins. Here is who may and what
 * each request does. The reads and writes are passed in, so the rules are tested without a database
 * (./author-listing.test.ts); app/api/catalog/listing gives them the real ones. An author edits
 * them on My store items › the item (app/app/(account)/my-items/[kind]/[slug]).
 *
 * The editors' pick and the advice stay an admin's, and nothing here reads or changes them.
 */

/** An item with a store listing of its own. */
export const LISTED_ITEM = /^(skill|mcp|app)\/[a-z0-9][a-z0-9-]{0,63}$/;

export type AuthorRole = 'admin' | 'author';

export interface AuthorListingStore {
  /** The item's record, or null when the store has none. */
  record(itemId: string): Promise<{ id: string; kind: string; summary?: string; tags?: string[]; madeBy?: { name: string } } | null>;
  isAdmin(clientId: string): Promise<boolean>;
  isAuthor(itemId: string, clientId: string): Promise<boolean>;
  listing(itemId: string): Promise<ListingFields | null>;
  /** Saves the listing and answers with it as kept (null when nothing is left of it). */
  save(itemId: string, listing: ListingFields, clientId: string): Promise<AuthorListing | null>;
  /** A signed PUT for one picture of the item, public once uploaded. */
  upload(input: { clientId: string; itemId: string; filename: string; contentType: string }): Promise<{ uploadUrl: string; publicUrl: string }>;
  /** Where uploads are kept, as their public links start: `https://<cdn>/mediamake/`. */
  uploadsBase: string;
}

/** Where a picture uploaded for an item is kept, under its uploader's folder (`upload` above). */
export const picturesFolder = (itemId: string) => `catalog-thumbnails/${itemId}`;

/**
 * True when the link is a picture that was uploaded for this item through `upload`. An author sets
 * only these: a picture in MediaMake's storage stays the picture that was set, and the store's pages
 * never load one from somewhere else on a member's word.
 */
export function isUploadedFor(itemId: string, link: string, uploadsBase: string): boolean {
  if (!uploadsBase || !link.startsWith(uploadsBase)) return false;
  const [uploader, ...rest] = link.slice(uploadsBase.length).split('/');
  const file = rest.pop() ?? '';
  return !!uploader && rest.join('/') === picturesFolder(itemId) && /^[\w.-]+$/.test(file);
}

/** What a request answers with; `changed` is the item whose listing was saved, so its pages are built again. */
export type AuthorListingAnswer = { status: number; body: Record<string, unknown>; changed?: string };

const fail = (status: number, error: string): AuthorListingAnswer => ({ status, body: { error } });

/** What the caller is to the item: an admin, one of its authors, or neither. */
export async function authorRole(store: Pick<AuthorListingStore, 'isAdmin' | 'isAuthor'>, itemId: string, clientId: string): Promise<AuthorRole | null> {
  if (await store.isAdmin(clientId)) return 'admin';
  return (await store.isAuthor(itemId, clientId)) ? 'author' : null;
}

/**
 * Whether the caller may change the item's description and pictures, with the ones its listing has
 * when they may (`summary` is the item's own, shown while the listing has no description). Anyone
 * else, signed in or not, gets `canEdit: false` and nothing more.
 */
export async function readAuthorListing(store: AuthorListingStore, itemId: string, clientId: string | null): Promise<AuthorListingAnswer> {
  if (!LISTED_ITEM.test(itemId)) return fail(400, 'item names a skill, MCP or app');
  const no: AuthorListingAnswer = { status: 200, body: { item: itemId, canEdit: false } };
  if (!clientId) return no;
  const item = await store.record(itemId);
  if (!item) return no;
  const role = await authorRole(store, itemId, clientId);
  if (!role) return no;
  const listing = await store.listing(itemId);
  return { status: 200, body: { item: itemId, canEdit: true, role, description: listing?.description, summary: item.summary, headshot: listing?.headshot, icon: listing?.icon } };
}

/**
 * `{ type: 'create_upload', itemId, filename, contentType }`: a signed link to upload one picture.
 * `{ type: 'set', itemId, description?, headshot?, icon?, readme?, tags?, media? }`: puts them on the
 * listing; the rest of it stays. Both only for the item's authors and admins. An author sets a picture
 * uploaded for the item (`isUploadedFor`), as the headshot, the icon or a screenshot, and a video by
 * its YouTube link; an admin any https link, as on the release page.
 */
export async function changeAuthorListing(store: AuthorListingStore, clientId: string | null, sent: unknown): Promise<AuthorListingAnswer> {
  if (!clientId) return fail(401, 'Sign in first');
  const body = (sent && typeof sent === 'object' ? sent : {}) as Record<string, unknown>;
  if (body.type !== 'create_upload' && body.type !== 'set') return fail(400, "type is 'create_upload' or 'set'");
  const itemId = typeof body.itemId === 'string' ? body.itemId : '';
  if (!LISTED_ITEM.test(itemId)) return fail(400, 'itemId names a skill, MCP or app, e.g. mcp/browse-hack');
  const item = await store.record(itemId);
  if (!item) return fail(404, `No ${itemId} in the store`);
  const role = await authorRole(store, itemId, clientId);
  if (!role) {
    return fail(
      403,
      item.madeBy
        ? `${itemId} is made by ${item.madeBy.name}, outside MediaMake: an admin sets its description and pictures`
        : `Only the authors of ${itemId} and admins change its description and pictures. Its page names them`,
    );
  }

  if (body.type === 'create_upload') {
    const contentType = typeof body.contentType === 'string' ? body.contentType : '';
    if (!LISTING_PICTURE_TYPE.test(contentType)) return fail(400, 'contentType must be a PNG, JPEG, WebP, GIF or AVIF image');
    const filename = typeof body.filename === 'string' && body.filename.trim() ? body.filename.trim().slice(0, 200) : 'picture';
    const { uploadUrl, publicUrl } = await store.upload({ clientId, itemId, filename, contentType });
    return { status: 200, body: { uploadUrl, publicUrl } };
  }

  const parsed = parseAuthorListing(body, item.kind, item.tags);
  if ('error' in parsed) return fail(400, parsed.error);
  const current = await store.listing(itemId);
  if (role === 'author') {
    for (const key of LISTING_PICTURES) {
      const link = parsed.change[key];
      if (link && !isUploadedFor(itemId, link, store.uploadsBase)) {
        return fail(400, `${key} must be a picture uploaded for ${itemId}: ask for an upload link (create_upload), send the picture to it, and give its publicUrl`);
      }
    }
    // the screenshots it has keep their place: an author reorders or removes one an admin added
    const kept = new Set((current?.media ?? []).map(entry => entry.url));
    for (const [i, entry] of (parsed.change.media ?? []).entries()) {
      const ok = kept.has(entry.url) || (entry.kind === 'video' ? !!parseYouTubeId(entry.url) : isUploadedFor(itemId, entry.url, store.uploadsBase));
      if (!ok) {
        return fail(
          400,
          entry.kind === 'video'
            ? `media.${i}: a video is a YouTube link`
            : `media.${i} must be a picture uploaded for ${itemId}: ask for an upload link (create_upload), send the picture to it, and give its publicUrl`,
        );
      }
    }
  }
  const kept = await store.save(itemId, withAuthorListing(current, parsed.change), clientId);
  return { status: 200, body: { item: itemId, description: kept?.description, headshot: kept?.headshot, icon: kept?.icon }, changed: itemId };
}
