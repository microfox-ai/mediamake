import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/access';
import { isAdmin } from '@/lib/admin-utils';
import { itemPagePath } from '@/lib/catalog/paths';
import { changeAuthorListing, picturesFolder, readAuthorListing, type AuthorListingStore } from '@/lib/catalog/author-listing';
import { getCatalogRecord } from '@/lib/catalog/records';
import { catalogListingDB } from '@/lib/catalog/store';
import { createPresignedUpload, getPublicUrl } from '@/lib/spaces-upload';
import { isAuthor } from '@/lib/submissions/authors';

/**
 * The part of an item's store listing that the people who look after it set themselves: its
 * description, its headshot and, for an MCP or an app, its icon (lib/catalog/author-listing has the
 * rules). Under /api/catalog, so the route resolves the viewer itself. What the item's page and My
 * store items (Edit card) and mm-use's upload_item_picture and set_item_listing call.
 *
 * GET  ?item=mcp/x                 { item, canEdit, role?, description?, summary?, headshot?, icon? }:
 *                                  whether the caller may change them, and the ones its listing has
 *                                  now. A store page is the same for everyone, so its button asks here.
 * POST { type: 'create_upload', itemId, filename, contentType } → { uploadUrl, publicUrl }
 *                                  a signed PUT for one picture (PNG, JPEG, WebP, GIF or AVIF), public
 *                                  once uploaded; send the same Content-Type and x-amz-acl: public-read.
 * POST { type: 'set', itemId, description?, headshot?, icon? } → { item, description?, headshot?, icon? }
 *                                  given, it replaces what was there; empty, it clears it; left out,
 *                                  it stays. The description is text, in a line or two. A picture is
 *                                  an https link: an author gives the publicUrl of one uploaded for
 *                                  the item, an admin any link. A skill has no icon.
 *
 * Who may: the item's authors (lib/catalog/authors) and admins. An item made outside MediaMake has
 * no authors here, so these are an admin's. The rest of a listing (tags, screenshots, README,
 * editors' pick, advice) stays an admin's: POST /api/admin/catalog `set_listing`.
 */

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

const store: AuthorListingStore = {
  record: getCatalogRecord,
  isAdmin,
  isAuthor,
  listing: itemId => catalogListingDB.get(itemId),
  save: (itemId, listing, clientId) => catalogListingDB.set(itemId, listing, clientId),
  upload: ({ clientId, itemId, filename, contentType }) => createPresignedUpload({ clientId, filename, contentType, subPath: picturesFolder(itemId) }),
  // createPresignedUpload keeps every upload under mediamake/<uploader>/
  uploadsBase: getPublicUrl('mediamake/'),
};

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('item') ?? '';
  const { clientId } = await resolveViewer(req);
  try {
    const answer = await readAuthorListing(store, itemId, clientId);
    return NextResponse.json(answer.body, { status: answer.status, ...noStore });
  } catch (error) {
    console.error('[listing] Could not read who may change the listing:', error);
    return NextResponse.json({ item: itemId, canEdit: false }, noStore);
  }
}

export async function POST(req: NextRequest) {
  const { clientId } = await resolveViewer(req);
  const body = await req.json().catch(() => null);
  try {
    const answer = await changeAuthorListing(store, clientId, body);
    if (answer.changed) {
      // its cards and its page are built ahead of time
      revalidatePath('/');
      revalidatePath(itemPagePath(answer.changed));
    }
    return NextResponse.json(answer.body, { status: answer.status });
  } catch (error) {
    console.error('[listing] Could not change the listing:', error);
    return NextResponse.json({ error: 'Could not save the changes' }, { status: 503 });
  }
}
