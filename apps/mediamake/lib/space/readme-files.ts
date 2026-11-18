import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getDatabase } from '../mongodb';
import type { ReadmePicture } from './space';

/**
 * The pictures of space items' READMEs (./space ReadmePicture), kept privately
 * so they show wherever the item does and nowhere else. Each is stored once per
 * space by its content's SHA-256: a computer's report names the pictures, the
 * answer asks for the ones not stored yet (uploadsFor), and the computer sends
 * them straight to storage with a signed PUT. Nothing is public: the item's
 * dialog shows them through /api/space/readme-file, which checks the viewer may
 * see that space and hands out a short-lived signed link (pictureLink).
 *
 * MongoDB `space_readme_files`: `{ space, sha256, type, bytes, storedAt }`, one
 * per stored picture, so a report doesn't ask storage about pictures it already
 * has. Storage: the catalog's private bucket when one is set (like catalog
 * packages), under `space-readmes/<space>/<sha256>`.
 */

const s3Client = new S3Client({
  region: 'ap-south-1',
  endpoint: process.env.CATALOG_SPACES_ENDPOINT || process.env.SPACES_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.CATALOG_SPACES_ACCESS_KEY_ID || process.env.SPACES_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CATALOG_SPACES_SECRET_ACCESS_KEY || process.env.SPACES_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: false,
});

const bucket = () => process.env.CATALOG_BUCKET || process.env.SPACES_BUCKET || '';

const COL = 'space_readme_files';

/** Where one picture of one space is stored: the space id made safe for a key, then its hash. */
export function readmeFileKey(spaceId: string, sha256: string): string {
  return `space-readmes/${spaceId.replace(/[^\w-]/g, '_')}/${sha256}`;
}

/** What the computer is asked to send: the hash, a signed PUT and the headers it must send with it. */
export interface ReadmeUpload {
  sha256: string;
  url: string;
  headers: Record<string, string>;
}

/** How long a computer has to send a picture after its report. */
const UPLOAD_SECONDS = 15 * 60;
/** How long a picture's link works: a dialog asks again each time it opens. */
const LINK_SECONDS = 10 * 60;

/** True when storage has the picture (a report from another computer may have sent it already). */
async function stored(key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * The signed uploads for the pictures of a report this space doesn't have yet, each picture once. A
 * picture storage turns out to have is recorded, so the next report doesn't ask again.
 */
export async function uploadsFor(spaceId: string, pictures: ReadmePicture[]): Promise<ReadmeUpload[]> {
  const wanted = new Map(pictures.map(picture => [picture.sha256, picture]));
  if (!wanted.size || !bucket()) return [];
  const db = await getDatabase();
  const known = await db
    .collection(COL)
    .find({ space: spaceId, sha256: { $in: [...wanted.keys()] } }, { projection: { _id: 0, sha256: 1 } })
    .toArray();
  for (const doc of known) wanted.delete(String(doc.sha256));
  const uploads: ReadmeUpload[] = [];
  for (const picture of wanted.values()) {
    const key = readmeFileKey(spaceId, picture.sha256);
    if (await stored(key)) {
      await db
        .collection(COL)
        .updateOne(
          { space: spaceId, sha256: picture.sha256 },
          { $set: { type: picture.type, bytes: picture.bytes }, $setOnInsert: { storedAt: new Date().toISOString() } },
          { upsert: true },
        );
      continue;
    }
    const url = await getSignedUrl(s3Client, new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: picture.type, ACL: 'private' }), {
      expiresIn: UPLOAD_SECONDS,
    });
    uploads.push({ sha256: picture.sha256, url, headers: { 'Content-Type': picture.type, 'x-amz-acl': 'private' } });
  }
  return uploads;
}

/** A short-lived link to one stored picture, shown as the type it was sent as. */
export async function pictureLink(spaceId: string, picture: Pick<ReadmePicture, 'sha256' | 'type'>): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucket(), Key: readmeFileKey(spaceId, picture.sha256), ResponseContentType: picture.type }),
    { expiresIn: LINK_SECONDS },
  );
}
