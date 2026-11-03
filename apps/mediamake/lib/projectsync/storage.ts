import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
