import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/access';
import { isAdmin } from '@/lib/admin-utils';
import { itemPagePath } from '@/lib/catalog/paths';
import { changePictures, picturesFolder, readPictures, type PicturesStore } from '@/lib/catalog/pictures';
import { getCatalogRecord } from '@/lib/catalog/records';
import { catalogListingDB } from '@/lib/catalog/store';
import { createPresignedUpload, getPublicUrl } from '@/lib/spaces-upload';
import { isAuthor } from '@/lib/submissions/authors';

/**
 * An item's pictures on its store listing: its headshot and, for an MCP or an app, its icon, set by
 * the people who look after the item (lib/catalog/pictures has the rules). Under /api/catalog, so the
 * route resolves the viewer itself. What the item's page (Change pictures) and mm-use's
 * upload_item_picture and set_item_pictures call.
 *
 * GET  ?item=mcp/x                 { item, canEdit, role?, headshot?, icon? }: whether the caller may
 *                                  change them, and the ones its listing has now. A store page is the
 *                                  same for everyone, so its button asks here.
 * POST { type: 'create_upload', itemId, filename, contentType } → { uploadUrl, publicUrl }
 *                                  a signed PUT for one picture (PNG, JPEG, WebP, GIF or AVIF), public
 *                                  once uploaded; send the same Content-Type and x-amz-acl: public-read.
 * POST { type: 'set', itemId, headshot?, icon? } → { item, headshot?, icon? }
 *                                  each an https link: given, it replaces what was there; empty, it
 *                                  clears it; left out, it stays. A skill has no icon. An author gives
 *                                  the publicUrl of a picture uploaded for the item; an admin any link.
 *
 * Who may: the item's authors (lib/catalog/authors) and admins. An item made outside MediaMake has
 * no authors here, so its pictures are an admin's. The rest of a listing (tags, screenshots,
 * description, README, editors' pick, advice) stays an admin's: POST /api/admin/catalog `set_listing`.
 */

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

const store: PicturesStore = {
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
    const answer = await readPictures(store, itemId, clientId);
    return NextResponse.json(answer.body, { status: answer.status, ...noStore });
  } catch (error) {
    console.error('[listing] Could not read who may change the pictures:', error);
    return NextResponse.json({ item: itemId, canEdit: false }, noStore);
  }
}

export async function POST(req: NextRequest) {
  const { clientId } = await resolveViewer(req);
  const body = await req.json().catch(() => null);
  try {
    const answer = await changePictures(store, clientId, body);
    if (answer.changed) {
      // its cards and its page are built ahead of time
      revalidatePath('/');
      revalidatePath(itemPagePath(answer.changed));
    }
    return NextResponse.json(answer.body, { status: answer.status });
  } catch (error) {
    console.error('[listing] Could not change the pictures:', error);
    return NextResponse.json({ error: 'Could not change the pictures' }, { status: 503 });
  }
}
