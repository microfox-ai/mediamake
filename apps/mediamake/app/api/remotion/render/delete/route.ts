import {
  deleteRender,
  getRenderProgress,
  speculateFunctionName,
} from '@remotion/lambda/client';
import type { AwsRegion } from '@remotion/lambda/client';
import { AWS_RENDER_CONFIGS, REGION } from '../../../../../config.mjs';
import { NextRequest, NextResponse } from 'next/server';
import { renderRequestDB } from '@/lib/render-mongodb';
import { getClientId } from '@/lib/auth-utils';

export const POST = async (req: NextRequest) => {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const {
      renderId,
      bucketName: bodyBucketName,
      region: bodyRegion,
      archiveInDatabase = false,
    } = body as {
      renderId: string;
      bucketName?: string;
      region?: string;
      archiveInDatabase?: boolean;
    };

    if (!renderId || typeof renderId !== 'string') {
      return NextResponse.json(
        { error: 'renderId is required' },
        { status: 400 },
      );
    }

    const doc = await renderRequestDB.getById(renderId, clientId);
    if (!doc) {
      return NextResponse.json(
        { error: 'Render not found or access denied' },
        { status: 404 },
      );
    }

    const bucketName = bodyBucketName ?? doc.bucketName;
    const region = (bodyRegion ?? REGION) as AwsRegion;

    if (!bucketName) {
      return NextResponse.json(
        { error: 'bucketName is required (not stored for this render)' },
        { status: 400 },
      );
    }

    // Save final pricing and render details from Remotion before deleting from Lambda
    try {
      const awsRenderPreset = doc.awsRenderPreset || 'classic';
      const config =
        AWS_RENDER_CONFIGS[awsRenderPreset as keyof typeof AWS_RENDER_CONFIGS] ??
        AWS_RENDER_CONFIGS['classic'];
      const renderProgress = await getRenderProgress({
        bucketName,
        functionName: speculateFunctionName({
          diskSizeInMb: config.disk,
          memorySizeInMb: config.memory,
          timeoutInSeconds: config.timeout,
        }),
        region,
        renderId,
      });
      await renderRequestDB.update(
        renderId,
        {
          progressData: renderProgress,
          status: renderProgress.fatalErrorEncountered
            ? 'failed'
            : renderProgress.done
              ? 'completed'
              : 'rendering',
          downloadUrl: renderProgress.outputFile as string,
          fileSize: renderProgress.outputSizeInBytes as number,
        },
        clientId,
      );
    } catch (progressErr) {
      // Lambda render may already be gone or not found; continue with delete
      console.warn('Could not fetch final progress before delete:', progressErr);
    }

    let freedBytes = 0;
    try {
      const result = await deleteRender({
        bucketName,
        region,
        renderId,
      });
      freedBytes = result.freedBytes;
    } catch (deleteErr) {
      // Render may already be deleted from Lambda; still allow archiving in DB if requested
      console.warn('Could not delete render from Lambda (may already be gone):', deleteErr);
    }

    let archivedInDatabase = false;
    if (archiveInDatabase) {
      archivedInDatabase = await renderRequestDB.archive(renderId, clientId);
    }

    return NextResponse.json({
      freedBytes,
      archivedInDatabase,
    });
  } catch (error) {
    console.error('Failed to delete render:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete render' },
      { status: 500 },
    );
  }
};
