import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SHA256 } from './index';

/**
 * Where the Cloud Library keeps bytes: one private object per content, `library-private/<space>/<sha256>`,
 * in the bucket productions and releases use (lib/projectsync/storage). Stored by content, so a file
 * in ten entries is one object, a new master leaves the old one where it was, and a computer can
 * tell what the cloud already has before sending anything. The only way in is a signed link handed
 * out after the space's access check.
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

/** Signed links live this long. */
export const LINK_TTL_SECONDS = 60 * 60;
/** One file, at most: the same as a production's (lib/projectsync). */
export const MAX_FILE_BYTES = 5_000_000_000;
/** The most of a text or JSON file the server reads to answer a `read`. */
export const MAX_INLINE_BYTES = 5_000_000;

const bucket = () => process.env.PROJECTSYNC_BUCKET || process.env.SPACES_BUCKET || '';
export const storageReady = () => !!(bucket() && process.env.SPACES_ENDPOINT);

export function blobKey(space: string, sha256: string): string {
  if (!/^[0-9a-f]{24}$/.test(space) || !SHA256.test(sha256)) throw new Error('Not a space id and a sha256');
  return `library-private/${space}/${sha256.slice(0, 2)}/${sha256}`;
}

/** Signed PUT link; the uploader sends the same Content-Type and `x-amz-acl: private`. */
export async function createUploadUrl(key: string, contentType: string) {
  return getSignedUrl(s3Client, new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ACL: 'private' }), { expiresIn: LINK_TTL_SECONDS });
}

/** Signed GET link that downloads under the file's own name. */
export async function createReadUrl(key: string, filename: string) {
  const command = new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"` });
  return getSignedUrl(s3Client, command, { expiresIn: LINK_TTL_SECONDS });
}

/** The stored object's size, or null when it isn't there. */
export async function storedSize(key: string): Promise<number | null> {
  try {
    const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return head.ContentLength ?? 0;
  } catch {
    return null;
  }
}

/** A small text or JSON object's content. Null when it isn't there or is larger than MAX_INLINE_BYTES. */
export async function readText(key: string, size: number): Promise<string | null> {
  if (size > MAX_INLINE_BYTES) return null;
  try {
    const got = await s3Client.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return (await got.Body?.transformToString('utf-8')) ?? null;
  } catch {
    return null;
  }
}
