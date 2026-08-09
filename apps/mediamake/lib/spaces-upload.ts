import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Shared S3/Spaces client for presigned uploads (media uploads + browser renders).
const s3Client = new S3Client({
  region: 'ap-south-1',
  endpoint: process.env.SPACES_ENDPOINT ?? '',
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY ?? '',
  },
  forcePathStyle: false, // DigitalOcean Spaces needs this to be false usually, or true depending on the endpoint format. The existing code used false.
});

/** Public URL for a stored object (CDN endpoint preferred). */
export function getPublicUrl(key: string): string {
  const baseUrl =
    process.env.SPACES_CDN_ENDPOINT ||
    process.env.SPACES_ENDPOINT?.replace(
      'https://',
      `https://${process.env.SPACES_BUCKET}.`,
    );
  return `${baseUrl}/${key}`;
}

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  filename: string;
}

/**
 * Create a presigned PUT URL for a public-read object under the client's
 * mediamake prefix. `subPath` lets callers namespace uploads (e.g. "renders").
 */
export async function createPresignedUpload({
  clientId,
  filename,
  contentType,
  subPath,
}: {
  clientId: string;
  filename: string;
  contentType: string;
  subPath?: string;
}): Promise<PresignedUpload> {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const prefix = `mediamake/${clientId.replaceAll(' ', '')}`;
  const key = subPath
    ? `${prefix}/${subPath}/${timestamp}-${sanitizedFilename}`
    : `${prefix}/${timestamp}-${sanitizedFilename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.SPACES_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: 'public-read', // Make the file public readable
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    uploadUrl,
    publicUrl: getPublicUrl(key),
    key,
    filename: sanitizedFilename,
  };
}
