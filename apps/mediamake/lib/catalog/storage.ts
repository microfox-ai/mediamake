import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Private storage for catalog packages. Objects are written without a
 * public ACL, so the CDN cannot serve them; the only way in is a signed
 * link from `createDownloadUrl`, handed out after an access check.
 *
 * Set CATALOG_BUCKET to keep packages in a bucket of their own (best);
 * otherwise they go under `catalog-private/` in SPACES_BUCKET.
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

function bucket() {
  return process.env.CATALOG_BUCKET || process.env.SPACES_BUCKET || '';
}

/** Where one version of one item is stored. */
export function packageKey(itemId: string, version: string) {
  return `catalog-private/${itemId}/${version}.tar.gz`;
}

/** Signed PUT link for the release CLI to upload a package to. */
export async function createPackageUpload(key: string, expiresIn = 15 * 60) {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: 'application/gzip',
    ACL: 'private',
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/** Signed GET link to a package; short-lived on purpose. */
export async function createDownloadUrl(key: string, filename: string, expiresIn = 5 * 60) {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}
