import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { LINK_TTL_SECONDS, type BundleKind } from '.';

/**
 * Private storage for productions and releases. Objects are written without a public ACL, so the
 * CDN can't serve them; the only way in is a signed link handed out after the project's access
 * check. They live under `projectsync-private/` in PROJECTSYNC_BUCKET when set, else SPACES_BUCKET.
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

function bucket() {
  return process.env.PROJECTSYNC_BUCKET || process.env.SPACES_BUCKET || '';
}

/**
 * The host the signed links point at (the bucket's own, since the client addresses buckets by host):
 * what a place with limited network access has to allow to save or fetch a production. Not a secret:
 * it is in every link. Undefined when storage isn't set up.
 */
export function storageHost(env: Readonly<Record<string, string | undefined>> = process.env): string | undefined {
  const name = env.PROJECTSYNC_BUCKET || env.SPACES_BUCKET;
  try {
    const host = new URL(env.SPACES_ENDPOINT ?? '').host;
    // a bucket with a dot in its name is addressed by path, on the endpoint's own host
    return name && host ? (name.includes('.') ? host : `${name}.${host}`) : undefined;
  } catch {
    return undefined;
  }
}

/** One file of one bundle: content-addressed, so versions share unchanged files. */
export function fileKey(projectId: string, kind: BundleKind, bundleId: string, sha256: string, path: string) {
  const name = (path.split('/').pop() ?? 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  return `projectsync-private/${projectId}/${kind}s/${bundleId}/${sha256.slice(0, 16)}-${name}`;
}

/** Signed PUT link; the uploader sends the same Content-Type. */
export async function createUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ACL: 'private' });
  return getSignedUrl(s3Client, command, { expiresIn: LINK_TTL_SECONDS });
}

/** Signed GET link that downloads under the file's own name. */
export async function createReadUrl(key: string, filename: string) {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
  });
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

/** Everything a project's productions and releases stored: all of it sits under this, and nothing else does. */
export const projectPrefix = (projectId: string) => `projectsync-private/${projectId}/`;

async function removeKeys(from: string, keys: string[]): Promise<number> {
  let removed = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const result = await s3Client.send(new DeleteObjectsCommand({ Bucket: from, Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true } }));
    removed += batch.length - (result.Errors?.length ?? 0);
  }
  return removed;
}

/**
 * Deletes a deleted project's stored files (lib/projects/delete): its productions and releases, and
 * the public files named by `publicKeys` (its media and brand kit, in SPACES_BUCKET). How many went.
 * Best effort: the records are gone already, so a file left behind is only an orphan in the bucket.
 */
export async function deleteProjectFiles(projectId: string, publicKeys: string[]): Promise<{ removed: number; failed: boolean }> {
  if (!/^[0-9a-f]{24}$/.test(projectId) || !process.env.SPACES_ENDPOINT) return { removed: 0, failed: false };
  let removed = 0;
  let failed = false;
  try {
    let token: string | undefined;
    do {
      const page = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: projectPrefix(projectId), ContinuationToken: token }));
      const keys = (page.Contents ?? []).flatMap(object => (object.Key ? [object.Key] : []));
      if (keys.length) removed += await removeKeys(bucket(), keys);
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  } catch (error) {
    failed = true;
    console.error('[projects] Could not delete stored productions and releases:', error instanceof Error ? error.message : 'error');
  }
  try {
    if (publicKeys.length && process.env.SPACES_BUCKET) removed += await removeKeys(process.env.SPACES_BUCKET, publicKeys);
  } catch (error) {
    failed = true;
    console.error('[projects] Could not delete stored media:', error instanceof Error ? error.message : 'error');
  }
  return { removed, failed };
}
