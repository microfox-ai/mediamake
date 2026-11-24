import { LISTING_PICTURE_TYPE, parsePictures, withPictures, type ListingFields, type ListingPictures } from './listing';

/**
 * An item's pictures (its headshot and, for an MCP or an app, its icon), changed by the people who
 * look after the item: its authors (./authors) and admins. Here is who may and what each request
 * does. The reads and writes are passed in, so the rules are tested without a database
 * (./pictures.test.ts); app/api/catalog/listing gives them the real ones.
 *
 * The rest of a listing (tags, screenshots, description, README, editors' pick, advice) is an
 * admin's, and nothing here reads or changes it.
 */

/** An item with a store listing of its own. */
export const LISTED_ITEM = /^(skill|mcp|app)\/[a-z0-9][a-z0-9-]{0,63}$/;

export type PicturesRole = 'admin' | 'author';

export interface PicturesStore {
  /** The item's record, or null when the store has none. */
  record(itemId: string): Promise<{ id: string; kind: string; madeBy?: { name: string } } | null>;
  isAdmin(clientId: string): Promise<boolean>;
  isAuthor(itemId: string, clientId: string): Promise<boolean>;
  listing(itemId: string): Promise<ListingFields | null>;
  /** Saves the listing and answers with it as kept (null when nothing is left of it). */
  save(itemId: string, listing: ListingFields, clientId: string): Promise<ListingPictures | null>;
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
export type PicturesAnswer = { status: number; body: Record<string, unknown>; changed?: string };

const fail = (status: number, error: string): PicturesAnswer => ({ status, body: { error } });

/** What the caller is to the item: an admin, one of its authors, or neither. */
export async function picturesRole(store: Pick<PicturesStore, 'isAdmin' | 'isAuthor'>, itemId: string, clientId: string): Promise<PicturesRole | null> {
  if (await store.isAdmin(clientId)) return 'admin';
  return (await store.isAuthor(itemId, clientId)) ? 'author' : null;
}

/**
 * Whether the caller may change the item's pictures, with the ones its listing has when they may.
 * Anyone else, signed in or not, gets `canEdit: false` and nothing more.
 */
export async function readPictures(store: PicturesStore, itemId: string, clientId: string | null): Promise<PicturesAnswer> {
  if (!LISTED_ITEM.test(itemId)) return fail(400, 'item names a skill, MCP or app');
  const no: PicturesAnswer = { status: 200, body: { item: itemId, canEdit: false } };
  if (!clientId || !(await store.record(itemId))) return no;
  const role = await picturesRole(store, itemId, clientId);
  if (!role) return no;
  const listing = await store.listing(itemId);
  return { status: 200, body: { item: itemId, canEdit: true, role, headshot: listing?.headshot, icon: listing?.icon } };
}

/**
 * `{ type: 'create_upload', itemId, filename, contentType }`: a signed link to upload one picture.
 * `{ type: 'set', itemId, headshot?, icon? }`: puts the links on the listing; the rest of it stays.
 * Both only for the item's authors and admins. An author sets a picture uploaded for the item
 * (`isUploadedFor`); an admin any https link, as on the release page.
 */
export async function changePictures(store: PicturesStore, clientId: string | null, sent: unknown): Promise<PicturesAnswer> {
  if (!clientId) return fail(401, 'Sign in first');
  const body = (sent && typeof sent === 'object' ? sent : {}) as Record<string, unknown>;
  if (body.type !== 'create_upload' && body.type !== 'set') return fail(400, "type is 'create_upload' or 'set'");
  const itemId = typeof body.itemId === 'string' ? body.itemId : '';
  if (!LISTED_ITEM.test(itemId)) return fail(400, 'itemId names a skill, MCP or app, e.g. mcp/browse-hack');
  const item = await store.record(itemId);
  if (!item) return fail(404, `No ${itemId} in the store`);
  const role = await picturesRole(store, itemId, clientId);
  if (!role) {
    return fail(
      403,
      item.madeBy
        ? `${itemId} is made by ${item.madeBy.name}, outside MediaMake: an admin sets its pictures`
        : `Only the authors of ${itemId} and admins change its pictures. Its page names them`,
    );
  }

  if (body.type === 'create_upload') {
    const contentType = typeof body.contentType === 'string' ? body.contentType : '';
    if (!LISTING_PICTURE_TYPE.test(contentType)) return fail(400, 'contentType must be a PNG, JPEG, WebP, GIF or AVIF image');
    const filename = typeof body.filename === 'string' && body.filename.trim() ? body.filename.trim().slice(0, 200) : 'picture';
    const { uploadUrl, publicUrl } = await store.upload({ clientId, itemId, filename, contentType });
    return { status: 200, body: { uploadUrl, publicUrl } };
  }

  const parsed = parsePictures(body, item.kind);
  if ('error' in parsed) return fail(400, parsed.error);
  if (role === 'author') {
    for (const [key, link] of Object.entries(parsed.pictures)) {
      if (link && !isUploadedFor(itemId, link, store.uploadsBase)) {
        return fail(400, `${key} must be a picture uploaded for ${itemId}: ask for an upload link (create_upload), send the picture to it, and give its publicUrl`);
      }
    }
  }
  const kept = await store.save(itemId, withPictures(await store.listing(itemId), parsed.pictures), clientId);
  return { status: 200, body: { item: itemId, headshot: kept?.headshot, icon: kept?.icon }, changed: itemId };
}
