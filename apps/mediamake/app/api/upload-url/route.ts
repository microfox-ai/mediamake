import { NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/auth-utils';
import { createPresignedUpload } from '@/lib/spaces-upload';

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

    const { uploadUrl, publicUrl, key, filename: sanitizedFilename } =
      await createPresignedUpload({ clientId, filename, contentType });

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
