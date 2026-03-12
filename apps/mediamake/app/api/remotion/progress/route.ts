import {
  speculateFunctionName,
  AwsRegion,
  getRenderProgress,
} from '@remotion/lambda/client';
import {
  AWS_RENDER_CONFIGS,
  AWS_REGIONS,
  DEFAULT_REGION,
} from '../../../../config.mjs';
import { NextRequest, NextResponse } from 'next/server';
import { renderRequestDB } from '@/lib/render-mongodb';
import { getClientId } from '@/lib/auth-utils';

export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const bucketName = searchParams.get('bucketName');
    const id = searchParams.get('id');

    console.log('bucketName', bucketName);
    console.log('id', id);
    if (!bucketName || !id) {
      return NextResponse.json(
        { error: 'Missing bucketName or id parameters' },
        { status: 400 },
      );
    }

    const clientId = getClientId(req);
    const renderRequest = await renderRequestDB.getById(id, clientId || undefined);

    if (!renderRequest) {
      return NextResponse.json({ error: 'Render not found' }, { status: 404 });
    }

    const awsRenderPreset = renderRequest.awsRenderPreset || 'classic';
    const config =
      AWS_RENDER_CONFIGS[awsRenderPreset as keyof typeof AWS_RENDER_CONFIGS] ??
      AWS_RENDER_CONFIGS['classic'];

    // Resolve effective region for this render (should match where it actually ran)
    const envRegion = process.env.REMOTION_AWS_REGION as AwsRegion | undefined;
    const fallbackRegion = (envRegion ?? DEFAULT_REGION) as AwsRegion;
    const storedRegion = renderRequest.regionUsed as AwsRegion | undefined;
    const effectiveRegion = (storedRegion &&
      (AWS_REGIONS as readonly AwsRegion[]).includes(storedRegion)
      ? storedRegion
      : fallbackRegion) as AwsRegion;

    const renderProgress = await getRenderProgress({
      bucketName: bucketName,
      functionName: speculateFunctionName({
        diskSizeInMb: config.disk,
        memorySizeInMb: config.memory,
        timeoutInSeconds: config.timeout,
      }),
      region: effectiveRegion,
      renderId: id,
    });

    if (clientId) {
      const errorMessage = renderProgress.fatalErrorEncountered && renderProgress.errors?.[0]
        ? renderProgress.errors[0].message
        : undefined;
      // Persist full progress (cost, statistics, errors, timing, etc.) for display in history and archived view.
      await renderRequestDB.update(
        renderProgress.renderId,
        {
          progressData: renderProgress as Parameters<typeof renderRequestDB.update>[1]['progressData'],
          status: renderProgress.fatalErrorEncountered
            ? 'failed'
            : renderProgress.done
              ? 'completed'
              : 'rendering',
          downloadUrl: renderProgress.outputFile as string,
          fileSize: renderProgress.outputSizeInBytes as number,
          ...(errorMessage != null ? { error: errorMessage } : {}),
        },
        clientId,
      );
    }

    if (renderProgress.fatalErrorEncountered) {
      return NextResponse.json({
        type: 'error',
        message: renderProgress.errors[0].message,
        renderInfo: renderProgress,
      });
    }

    if (renderProgress.done) {
      return NextResponse.json({
        type: 'done',
        url: renderProgress.outputFile as string,
        size: renderProgress.outputSizeInBytes as number,
        renderInfo: renderProgress,
      });
    }

    return NextResponse.json({
      type: 'progress',
      progress: Math.max(0.03, renderProgress.overallProgress),
      renderInfo: renderProgress,
    });
  } catch (error) {
    console.error('Failed to get render progress:', error);
    return NextResponse.json(
      { error: 'Failed to get render progress' },
      { status: 500 },
    );
  }
};
