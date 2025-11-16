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
 * Authentication Flow:
 * 1. MediaMake encrypts API key with MEDIA_HELPER_SECRET
 * 2. Sends encrypted API key to MEDIA_HELPER
 * 3. MEDIA_HELPER decrypts API key using MEDIA_HELPER_SECRET
 * 4. MEDIA_HELPER sends decrypted API key as Bearer token in webhook
 * 5. Middleware validates the API key (no custom auth needed here!)
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
    // =====================================================
    // STEP 1: AUTHENTICATION (handled by middleware)
    // =====================================================
    console.log('[Webhook] ========================================');
    console.log('[Webhook] 📥 Received webhook request');
    console.log('[Webhook] Request URL:', req.url);
    console.log('[Webhook] Request method:', req.method);
    
    // Get client ID from middleware (already authenticated)
    const clientId = req.headers.get('x-client-id');
    console.log('[Webhook] ✅ Authenticated client:', clientId);

    // =====================================================
    // STEP 2: PROCESS WEBHOOK DATA
    // =====================================================
    console.log('[Webhook] ========================================');
    console.log('[Webhook] 📦 Processing webhook data...');
    
    const body = await req.json();
    console.log('[Webhook] Raw body:', JSON.stringify(body, null, 2));
    
    const { taskId, status, imageUrl, error, metadata } = body;

    console.log(`[Webhook] Parsed data for task ${taskId}:`, {
      status,
      hasImageUrl: !!imageUrl,
      imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'N/A',
      hasError: !!error,
      error: error || 'N/A',
      metadata,
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

    console.log(`[Webhook] ✅ Updated caption ${captionIndex} for transcription ${transcriptionId}`);

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

      console.log(`[Webhook] 📊 Progress: ${captionsWithImages} completed, ${captionsFailed} failed, ${captionsPending} pending`);
    }

    console.log('[Webhook] ========================================');

    console.log('[Webhook] ✅✅✅ Webhook processed successfully!');
    console.log('[Webhook] ========================================');

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      transcriptionId,
      captionIndex,
      status,
    });
  } catch (error) {
    console.error('[Webhook] ========================================');
    console.error('[Webhook] ❌❌❌ ERROR processing webhook');
    console.error('[Webhook] Error type:', error?.constructor?.name);
    console.error('[Webhook] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[Webhook] Full error:', error);
    console.error('[Webhook] ========================================');
    
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



