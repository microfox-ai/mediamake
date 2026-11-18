import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getPublicUrl } from '../spaces-upload';
import type { ReadmePicture } from './space';

/**
 * The pictures of space items' READMEs (./space ReadmePicture). GitHub doesn't
 * serve a private repo's pictures to another site, so each one is copied once
 * into MediaMake's storage, like any media: a computer's report names the
 * pictures by their content's SHA-256, the answer asks for the ones not there
 * yet (uploadsFor), and the computer sends them with a signed PUT. The README
 * shows each from its address (pictureUrl); only the item's dialog names it, and
 * the dialog is only for who can see the space.
 */

const s3Client = new S3Client({
  region: 'ap-south-1',
  endpoint: process.env.SPACES_ENDPOINT ?? '',
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY ?? '',
  },
  forcePathStyle: false,
});

const EXTENSION: Record<ReadmePicture['type'], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** Where one picture of one space is stored: the space, then the picture's hash. */
export function readmeFileKey(spaceId: string, picture: Pick<ReadmePicture, 'sha256' | 'type'>): string {
  return `space-readmes/${spaceId.replace(/[^\w-]/g, '_')}/${picture.sha256}.${EXTENSION[picture.type]}`;
}

/** A picture's address, for the README to show it. */
export const pictureUrl = (spaceId: string, picture: Pick<ReadmePicture, 'sha256' | 'type'>) => getPublicUrl(readmeFileKey(spaceId, picture));

/** What the computer is asked to send: the hash, a signed PUT and the headers it must send with it. */
export interface ReadmeUpload {
  sha256: string;
  url: string;
  headers: Record<string, string>;
}

/** The signed uploads for the pictures of a report that storage doesn't have yet, each picture once. */
export async function uploadsFor(spaceId: string, pictures: ReadmePicture[]): Promise<ReadmeUpload[]> {
  const bucket = process.env.SPACES_BUCKET;
  if (!bucket) return [];
  const uploads: ReadmeUpload[] = [];
  for (const picture of new Map(pictures.map(p => [p.sha256, p])).values()) {
    const key = readmeFileKey(spaceId, picture);
    const there = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).then(
      () => true,
      () => false,
    );
    if (there) continue;
    const url = await getSignedUrl(s3Client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: picture.type, ACL: 'public-read' }), { expiresIn: 15 * 60 });
    uploads.push({ sha256: picture.sha256, url, headers: { 'Content-Type': picture.type, 'x-amz-acl': 'public-read' } });
  }
  return uploads;
}
