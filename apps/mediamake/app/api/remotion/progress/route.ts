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
import { platformCostUsageDB } from '@/lib/cost-usage-mongodb';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** Accrued cost already saved when the render completed or failed. */
function readStoredAccrued(progressData: unknown): {
  accruedSoFar: number;
  currency: string;
  payload: Record<string, unknown>;
} | null {
  const root = asRecord(progressData);
  if (!root) return null;
  const payload = asRecord(root.renderInfo) ?? root;
  const costs = asRecord(payload.costs);
  const accruedSoFar = costs?.accruedSoFar;
  if (typeof accruedSoFar !== 'number' || !Number.isFinite(accruedSoFar)) return null;
  return {
    accruedSoFar,
    currency: typeof costs?.currency === 'string' ? costs.currency : 'USD',
    payload,
  };
}

function responseFromStored(payload: Record<string, unknown>) {
  const fatal = payload.fatalErrorEncountered === true;
  if (fatal) {
    const errors = Array.isArray(payload.errors) ? payload.errors : [];
    const first = asRecord(errors[0]);
    return NextResponse.json({
      type: 'error',
      message: typeof first?.message === 'string' ? first.message : 'Render failed',
      renderInfo: payload,
    });
  }
  if (payload.done === true) {
    return NextResponse.json({
      type: 'done',
      url: payload.outputFile as string,
      size: payload.outputSizeInBytes as number,
      renderInfo: payload,
    });
  }
  return NextResponse.json({
    type: 'progress',
    progress: Math.max(0.03, typeof payload.overallProgress === 'number' ? payload.overallProgress : 0),
    renderInfo: payload,
  });
}

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

    const alreadyFinished =
      renderRequest.status === 'completed' || renderRequest.status === 'failed';
    const storedCost = alreadyFinished ? readStoredAccrued(renderRequest.progressData) : null;
    if (storedCost) {
      return responseFromStored(storedCost.payload);
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

    const renderSettled = renderProgress.done || renderProgress.fatalErrorEncountered;
    const accrued = renderProgress.costs?.accruedSoFar;
    if (renderSettled && typeof accrued === 'number' && Number.isFinite(accrued) && clientId) {
      await platformCostUsageDB.upsertAwsRenderCost({
        renderId: renderProgress.renderId,
        clientId,
        bucketName: renderRequest.bucketName,
        createdAt: renderRequest.createdAt,
        cost: {
          amount: accrued,
          currency: renderProgress.costs?.currency ?? 'USD',
          amountUSD: accrued,
        },
      });
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
