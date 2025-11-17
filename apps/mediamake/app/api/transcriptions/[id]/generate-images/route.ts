import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { aiMainRouter } from '@/app/ai';

/**
 * POST /api/transcriptions/[id]/generate-images
 * 
 * Generate stylized graphic novel images for each caption in a transcription
 * 
 * Request Body:
 * {
 *   imageSize?: string (default: 'landscape_16_9')
 *   imageResolution?: string (default: '1K')
 *   userRequest?: string (additional instructions)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   data: {
 *     sentences: Array<{
 *       sentenceIndex: number
 *       originalText: string
 *       metadata: {
 *         imagePrompt: string
 *         taskId: string
 *         imageUrl: string
 *         status: 'completed' | 'failed'
 *         imageSize: string
 *         imageResolution: string
 *         error?: string
 *       }
 *     }>
 *     totalSentences: number
 *     confidence: number (0-1, success rate)
 *   }
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Validate transcription ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid transcription ID format' },
        { status: 400 },
      );
    }

    // Validate image size if provided
    const validImageSizes = [
      'square',
      'square_hd',
      'portrait_4_3',
      'portrait_3_2',
      'portrait_16_9',
      'landscape_4_3',
      'landscape_3_2',
      'landscape_16_9',
      'landscape_21_9',
    ];

    if (body.imageSize && !validImageSizes.includes(body.imageSize)) {
      return NextResponse.json(
        {
          error: 'Invalid image size',
          validOptions: validImageSizes,
        },
        { status: 400 },
      );
    }

    // Validate image resolution if provided
    const validResolutions = ['1K', '2K', '4K'];
    if (
      body.imageResolution &&
      !validResolutions.includes(body.imageResolution)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid image resolution',
          validOptions: validResolutions,
        },
        { status: 400 },
      );
    }

    console.log(
      `[Generate Images] Starting for transcription: ${id}, size: ${body.imageSize || 'landscape_16_9'}, resolution: ${body.imageResolution || '1K'}`,
    );

    // Call the text-to-image agent
    const response = await aiMainRouter.toAwaitResponse('/script-meta/text-to-image', {
      request: {
        messages: [],
        params: {
          transcriptionId: id,
          imageSize: body.imageSize || 'landscape_16_9',
          imageResolution: body.imageResolution || '1K',
          userRequest: body.userRequest,
        },
      },
    });

    // Parse the response
    const responseData = await response.json();
    
    // Extract data from UI message format
    let result: any = null;
    if (Array.isArray(responseData) && responseData.length > 0) {
      const message = responseData[0];
      if (message.parts) {
        const toolPart = message.parts.find((p: any) => p.type.startsWith('tool-'));
        if (toolPart) {
          result = toolPart.output;
        }
      }
    }

    if (!result) {
      throw new Error('Failed to extract result from agent response');
    }

    const { sentences, totalSentences, confidence } = result;

    // Calculate success/failure counts
    const completedCount = sentences.filter(
      (s: any) => s.metadata.status === 'completed',
    ).length;
    const failedCount = sentences.filter(
      (s: any) => s.metadata.status === 'failed',
    ).length;

    console.log(
      `[Generate Images] Completed: ${completedCount}/${totalSentences} succeeded, ${failedCount} failed`,
    );

    return NextResponse.json({
      success: true,
      data: {
        sentences,
        totalSentences,
        confidence,
        summary: {
          completed: completedCount,
          failed: failedCount,
          successRate: `${(confidence * 100).toFixed(1)}%`,
        },
      },
    });
  } catch (error) {
    console.error('[Generate Images] Error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Transcription not found' },
          { status: 404 },
        );
      }

      if (error.message.includes('MEDIA_HELPER_URL')) {
        return NextResponse.json(
          {
            error: 'Text-to-image service not configured',
            details: 'MEDIA_HELPER_URL environment variable is not set',
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to generate images',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/transcriptions/[id]/generate-images
 * 
 * Get the current status of generated images for a transcription
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid transcription ID format' },
        { status: 400 },
      );
    }

    const { getDatabase } = await import('@/lib/mongodb');
    const Transcription = await import('@/app/types/transcription');

    const db = await getDatabase();
    const collection = db.collection<any>('transcriptions');

    const transcription = await collection.findOne({
      _id: new ObjectId(id),
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 },
      );
    }

    // Extract image metadata from captions
    const imageMetadata = transcription.captions.map((caption: any, index: number) => ({
      captionIndex: index,
      text: caption.text,
      hasImage: !!caption.metadata?.imageUrl,
      imageUrl: caption.metadata?.imageUrl,
      imagePrompt: caption.metadata?.imagePrompt,
      status: caption.metadata?.status,
    }));

    const totalCaptions = transcription.captions.length;
    const captionsWithImages = imageMetadata.filter((m: any) => m.hasImage).length;

    return NextResponse.json({
      success: true,
      data: {
        transcriptionId: id,
        totalCaptions,
        captionsWithImages,
        progress: `${captionsWithImages}/${totalCaptions}`,
        captions: imageMetadata,
      },
    });
  } catch (error) {
    console.error('[Generate Images Status] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get image generation status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

