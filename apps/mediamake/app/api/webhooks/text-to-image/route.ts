import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Transcription } from '@/app/types/transcription';
import { ObjectId } from 'mongodb';

/**
 * Webhook endpoint for text-to-image callbacks
 * POST /api/webhooks/text-to-image
 * 
 * Called by MEDIA_HELPER_URL when image generation completes
 * 
 * Request Body:
 * {
 *   taskId: string
 *   status: 'completed' | 'failed'
 *   imageUrl?: string
 *   error?: string
 *   metadata?: {
 *     transcriptionId: string
 *     captionIndex: number
 *     imagePrompt: string
 *     imageSize: string
 *     imageResolution: string
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, status, imageUrl, error, metadata } = body;

    console.log(`[Webhook] Received callback for task ${taskId}:`, {
      status,
      hasImageUrl: !!imageUrl,
      hasError: !!error,
    });

    // Validate required fields
    if (!taskId || !status || !metadata) {
      console.error('[Webhook] Missing required fields:', body);
      return NextResponse.json(
        { error: 'Missing required fields: taskId, status, metadata' },
        { status: 400 },
      );
    }

    const { transcriptionId, captionIndex, imagePrompt, imageSize, imageResolution } =
      metadata;

    if (!transcriptionId || captionIndex === undefined) {
      console.error('[Webhook] Missing metadata fields:', metadata);
      return NextResponse.json(
        { error: 'Missing required metadata: transcriptionId, captionIndex' },
        { status: 400 },
      );
    }

    // Validate transcription ID
    if (!ObjectId.isValid(transcriptionId)) {
      console.error('[Webhook] Invalid transcription ID:', transcriptionId);
      return NextResponse.json(
        { error: 'Invalid transcription ID' },
        { status: 400 },
      );
    }

    // Get database connection
    const db = await getDatabase();
    const collection = db.collection<Transcription>('transcriptions');

    // Find the transcription
    const transcription = await collection.findOne({
      _id: new ObjectId(transcriptionId),
    });

    if (!transcription) {
      console.error('[Webhook] Transcription not found:', transcriptionId);
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 },
      );
    }

    // Verify caption exists
    if (captionIndex >= transcription.captions.length) {
      console.error(
        `[Webhook] Caption index ${captionIndex} out of range (total: ${transcription.captions.length})`,
      );
      return NextResponse.json(
        { error: 'Caption index out of range' },
        { status: 400 },
      );
    }

    // Update the specific caption's metadata
    const updatedCaptions = [...transcription.captions];
    updatedCaptions[captionIndex] = {
      ...updatedCaptions[captionIndex],
      metadata: {
        ...(updatedCaptions[captionIndex].metadata || {}),
        imagePrompt,
        taskId,
        imageUrl: status === 'completed' ? imageUrl : undefined,
        status,
        imageSize,
        imageResolution,
        error: status === 'failed' ? error : undefined,
        completedAt: new Date().toISOString(),
      },
    };

    // Update the transcription in the database
    await collection.updateOne(
      { _id: new ObjectId(transcriptionId) },
      {
        $set: {
          [`captions.${captionIndex}.metadata`]: updatedCaptions[captionIndex].metadata,
          updatedAt: new Date(),
        },
      },
    );

    console.log(
      `[Webhook] Updated caption ${captionIndex} for transcription ${transcriptionId}`,
    );

    // Check if all captions have completed (optional - for progress tracking)
    const allCaptions = await collection.findOne({
      _id: new ObjectId(transcriptionId),
    });

    if (allCaptions) {
      const captionsWithImages = allCaptions.captions.filter(
        (c: any) => c.metadata?.status === 'completed',
      ).length;
      const captionsFailed = allCaptions.captions.filter(
        (c: any) => c.metadata?.status === 'failed',
      ).length;
      const captionsPending = allCaptions.captions.length - captionsWithImages - captionsFailed;

      console.log(
        `[Webhook] Progress: ${captionsWithImages} completed, ${captionsFailed} failed, ${captionsPending} pending`,
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      transcriptionId,
      captionIndex,
      status,
    });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/text-to-image',
    message: 'Text-to-image webhook endpoint is ready',
  });
}



