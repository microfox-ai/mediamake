import { S3Space } from '@microfox/s3-space';

const s3 = new S3Space({
  forcePathStyle: false,
  endpoint: process.env.SPACES_ENDPOINT ?? '',
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY ?? '',
  },
  bucket: process.env.SPACES_BUCKET ?? '',
  cdnEndpoint: process.env.SPACES_CDN_ENDPOINT ?? '',
});

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/tif': '.tif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

function getFileExtension(mimeType: string): string {
  return MIME_TO_EXT[mimeType.toLowerCase()] ?? '.jpg';
}

export interface UploadFileParams {
  id: string;
  buffer?: ArrayBuffer | Uint8Array | Buffer;
  imageUrl?: string;
  imageType?: string;
  contentType?: string;
  fileExtension?: string;
  folder: string;
}

export async function uploadFile({
  id,
  buffer,
  imageUrl,
  imageType,
  contentType,
  fileExtension,
  folder,
}: UploadFileParams): Promise<string | undefined> {
  try {
    let fileBuffer: Buffer;

    if (imageUrl) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else if (buffer) {
      fileBuffer = Buffer.isBuffer(buffer)
        ? buffer
        : Buffer.from(
            buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer),
          );
    } else {
      throw new Error('Either buffer or imageUrl must be provided.');
    }

    const ext = fileExtension
      ? fileExtension.startsWith('.')
        ? fileExtension
        : `.${fileExtension}`
      : getFileExtension(imageType ?? 'image/jpeg');
    const fileName = `${id}${ext}`;

    await s3.uploadFile({
      fileInfoWithFileBuffer: {
        fileName,
        fileType: contentType ?? imageType ?? 'application/octet-stream',
        fileBuffer,
      },
      folder,
    });

    return s3.getPublicFileUrl({
      file: { fileName },
      folder,
    });
  } catch (error) {
    console.error('uploadFile error:', error);
    return undefined;
  }
}
