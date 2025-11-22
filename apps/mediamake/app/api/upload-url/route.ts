import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getClientId } from '@/lib/auth-utils';

const s3Client = new S3Client({
  region: 'ap-south-1',
  endpoint: process.env.SPACES_ENDPOINT ?? '',
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY ?? '',
  },
  forcePathStyle: false, // DigitalOcean Spaces needs this to be false usually, or true depending on the endpoint format. The existing code used false.
});

export async function GET(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    const contentType = searchParams.get('contentType');

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Filename and contentType are required' },
        { status: 400 }
      );
    }

    // Sanitize filename and create a unique path
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `mediamake/${clientId.replaceAll(' ', '')}/${timestamp}-${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.SPACES_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read', // Make the file public readable
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Construct the public URL
    // If SPACES_CDN_ENDPOINT is available, use it, otherwise use the standard endpoint
    const baseUrl = process.env.SPACES_CDN_ENDPOINT || process.env.SPACES_ENDPOINT?.replace('https://', `https://${process.env.SPACES_BUCKET}.`);
    const publicUrl = `${baseUrl}/${key}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      filename: sanitizedFilename,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
