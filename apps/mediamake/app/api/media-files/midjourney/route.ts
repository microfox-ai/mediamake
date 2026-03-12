import { NextRequest, NextResponse } from 'next/server';
import { S3Space } from '@microfox/s3-space';
import { getClientId } from '@/lib/auth-utils';
import { getDatabase } from '@/lib/mongodb';
import { MediaFile } from '@/app/types/media';
import { indexAndAnalyzeImage, hasDescription } from '@/lib/sparkboard/sparkboard-lib';

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

interface MidjourneyRequest {
  tags?: string[];
  metadata?: any;
  images?: Array<
    string | { data: string; fileName?: string; contentType?: string }
  >;
  imageData?: string | string[];
  imageMimeType?: string;
  prompt?: string;
}

// Handle preflight OPTIONS requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    const body: MidjourneyRequest = await req.json();
    const { tags = [], images, imageData, imageMimeType, prompt } = body;

    // Normalize inputs to base64 data
    type NormalizedInput = {
      kind: 'base64';
      data: string;
      fileName?: string;
      contentType?: string;
    };

    const normalizedInputs: NormalizedInput[] = [];

    if (images && Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        if (typeof img === 'string') {
          normalizedInputs.push({
            kind: 'base64',
            data: img,
            contentType: imageMimeType,
          });
        } else if (img && typeof img === 'object' && 'data' in img) {
          normalizedInputs.push({
            kind: 'base64',
            data: img.data,
            fileName: img.fileName,
            contentType: img.contentType || imageMimeType,
          });
        }
      }
    } else if (imageData) {
      if (Array.isArray(imageData)) {
        for (const d of imageData)
          normalizedInputs.push({
            kind: 'base64',
            data: d,
            contentType: imageMimeType,
          });
      } else {
        normalizedInputs.push({
          kind: 'base64',
          data: imageData,
          contentType: imageMimeType,
        });
      }
    }

    if (normalizedInputs.length === 0) {
      return NextResponse.json(
        { error: 'Provide images as base64 (images/imageData)' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        },
      );
    }

    console.log('Midjourney request body:', body);
    const folderName = `mediamake/${clientId?.replaceAll(' ', '') || 'default'}/midjourney`;
    const db = await getDatabase();
    const collection = db.collection('mediaFiles');

    const results = [];

    for (const input of normalizedInputs) {
      try {
        // Build image buffer and metadata from base64
        let imageBuffer: ArrayBuffer;
        let contentType: string | undefined;
        let fileName: string | undefined;

        const data = input.data.trim();
        const dataUrlMatch = data.match(/^data:(.*?);base64,(.*)$/);
        if (dataUrlMatch) {
          contentType = input.contentType || dataUrlMatch[1] || 'image/jpeg';
          const base64 = dataUrlMatch[2];
          const nodeBuf = Buffer.from(base64, 'base64');
          imageBuffer = nodeBuf.buffer.slice(
            nodeBuf.byteOffset,
            nodeBuf.byteOffset + nodeBuf.byteLength,
          );
          fileName =
            input.fileName ||
            `midjourney-${Date.now()}.${contentType.split('/')[1] || 'jpg'}`;
        } else {
          contentType = input.contentType || 'image/jpeg';
          const nodeBuf = Buffer.from(data, 'base64');
          imageBuffer = nodeBuf.buffer.slice(
            nodeBuf.byteOffset,
            nodeBuf.byteOffset + nodeBuf.byteLength,
          );
          fileName =
            input.fileName ||
            `midjourney-${Date.now()}.${contentType.split('/')[1] || 'jpg'}`;
        }

        // Validate image buffer
        if (imageBuffer.byteLength === 0) {
          throw new Error('Received empty image buffer');
        }

        // Check if it's a valid image by looking at magic bytes
        const uint8Array = new Uint8Array(imageBuffer);
        const isValidImage =
          (uint8Array[0] === 0xff && uint8Array[1] === 0xd8) || // JPEG
          (uint8Array[0] === 0x89 &&
            uint8Array[1] === 0x50 &&
            uint8Array[2] === 0x4e &&
            uint8Array[3] === 0x47) || // PNG
          (uint8Array[0] === 0x47 &&
            uint8Array[1] === 0x49 &&
            uint8Array[2] === 0x46) || // GIF
          (uint8Array[0] === 0x52 &&
            uint8Array[1] === 0x49 &&
            uint8Array[2] === 0x46 &&
            uint8Array[3] === 0x46); // WEBP

        if (!isValidImage) {
          console.log('Invalid image format detected, treating as JPEG');
        }

        const resolvedContentType = contentType || 'image/jpeg';
        const resolvedFileName = fileName || `midjourney-${Date.now()}.jpg`;

        // Create a File object from the buffer
        const file = new File([imageBuffer], resolvedFileName, {
          type: resolvedContentType,
        });
        const uniqueName = `${Date.now()}-${resolvedFileName}`;
        const newFile = new File([file], uniqueName, {
          type: resolvedContentType,
        });

        // Upload to S3
        const s3Response = await s3.uploadFile({
          file: newFile,
          folder: folderName,
        });

        if (!s3Response || s3Response.$metadata.httpStatusCode !== 200) {
          throw new Error('Failed to upload file to S3');
        }

        const fileUrl = s3.getPublicFileUrl({
          file: newFile,
          folder: folderName,
        });

        // Start with the provided metadata
        let finalMetadata: any = {
          tags,
          desciption: 'unkown image uploaded from midjourney',
          contentType: 'image',
          contentMimeType:
            contentType || file.type || 'application/octet-stream',
          contentSubType: 'full',
          contentSource: 'midjourney',
          contentSourceUrl: 'upload-from-midjourney',
          fileName: fileName,
          fileSize: file.size,
          filePath: fileUrl,
          promptUsed: prompt || 'unkown image uploaded from midjourney',
        };

        // Perform AI analysis for images if metadata doesn't have description
        if (!hasDescription(finalMetadata)) {
          try {
            console.log('Performing AI analysis for image:', fileUrl);

            // Add a small delay to ensure the image is fully uploaded and accessible
            await new Promise(resolve => setTimeout(resolve, 1000));

            const aiMetadata = await indexAndAnalyzeImage(
              fileUrl,
              clientId || 'default',
              {
                platform: 'midjourney',
                platformUrl: undefined,
                imageLink: fileUrl,
                tags: tags,
              },
            );

            if (aiMetadata) {
              finalMetadata = {
                ...finalMetadata,
                ...aiMetadata,
              };
              console.log('AI analysis completed, metadata updated');
              console.log('AI metadata:', aiMetadata);
            } else {
              console.log('AI analysis failed or returned no metadata');
            }
          } catch (error) {
            console.error('Error during AI analysis:', error);
            // Add basic metadata if AI analysis fails
            finalMetadata = {
              description: `Midjourney generated image`,
              ...finalMetadata,
              platform: 'midjourney',
              platformUrl: undefined,
              imageLink: fileUrl,
              tags: tags,
            };
            console.log('Added fallback metadata due to AI analysis failure');
          }
        }

        // Check if media file with same URL already exists
        const existingFile = await collection.findOne({
          filePath: fileUrl,
          clientId: clientId || 'default',
        });

        if (existingFile) {
          console.log(
            'Media file with URL already exists, skipping creation:',
            fileUrl,
          );
          results.push({
            ...existingFile,
            message: 'Media file already exists',
            originalUrl: fileUrl,
          });
          continue;
        }

        // Create media file record
        const mediaFile: MediaFile = {
          tags: tags,
          clientId: clientId || 'default',
          contentType: 'image',
          contentMimeType: resolvedContentType,
          contentSubType: resolvedContentType.split('/')[1] || 'jpeg',
          contentSource: 'midjourney',
          contentSourceUrl: undefined,
          metadata: finalMetadata,
          fileName: resolvedFileName,
          fileSize: imageBuffer.byteLength,
          filePath: fileUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        console.log('Media file updating:', mediaFile);
        const result = await collection.insertOne(mediaFile);

        results.push({
          ...mediaFile,
          _id: result.insertedId,
          originalUrl: undefined,
        });
      } catch (error) {
        console.error('Error processing image input:', error);
        results.push({
          error: (error as Error).message,
          originalUrl: undefined,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        results,
        processed: results.length,
        total: results.length,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      },
    );
  } catch (error) {
    console.error('Error in Midjourney route:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      },
    );
  }
}
