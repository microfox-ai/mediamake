import { AwsRegion } from '@remotion/lambda/client';
import {
  renderMediaOnLambda,
  renderStillOnLambda,
  speculateFunctionName,
} from '@remotion/lambda/client';
import {
  AWS_RENDER_CONFIGS,
  AWS_REGIONS,
  DEFAULT_REGION,
  SITE_NAME,
  CONCURRENCY_LIMITS,
  FRAMES_PER_LAMBDA_LIMITS,
} from '../../../../config.mjs';
import { NextRequest, NextResponse } from 'next/server';
import { renderRequestDB } from '@/lib/render-mongodb';
import { platformCostUsageDB } from '@/lib/cost-usage-mongodb';
import { userQuotaDB } from '@/lib/quota-mongodb';
import { isAdmin } from '@/lib/admin-utils';

// Custom configuration type
interface CustomLambdaConfig {
  memory: number;
  disk: number;
  timeout: number;
  concurrency: number | 'auto';
  framesPerLambda: number | 'auto';
  timeoutInMilliseconds: number;
}

export const POST = async (req: NextRequest) => {
  try {
    const {
      id,
      inputProps,
      isDownloadable,
      fileName,
      codec,
      audioCodec,
      renderType,
      projectId,
      tags,
      // Configuration mode
      configMode = 'preset',
      // Preset mode settings
      awsRenderPreset = 'classic',
      concurrencyOverride,
      // Custom mode settings
      customConfig,
      // Region selection (optional - falls back to env/default)
      region: requestedRegion,
    } = await req.json();

    if (
      !process.env.AWS_ACCESS_KEY_ID &&
      !process.env.REMOTION_AWS_ACCESS_KEY_ID
    ) {
      throw new TypeError(
        'Set up Remotion Lambda to render videos. See the README.md for how to do so.',
      );
    }
    if (
      !process.env.AWS_SECRET_ACCESS_KEY &&
      !process.env.REMOTION_AWS_SECRET_ACCESS_KEY
    ) {
      throw new TypeError(
        'The environment variable REMOTION_AWS_SECRET_ACCESS_KEY is missing. Add it to your .env file.',
      );
    }

    // Determine the configuration based on mode
    let config: {
      memory: number;
      disk: number;
      timeout: number;
      concurrency: number | undefined;
      timeoutInMilliseconds: number;
      framesPerLambda: number | undefined;
    };

    if (configMode === 'custom' && customConfig) {
      // Validate custom config
      const validatedCustomConfig = validateCustomConfig(customConfig);
      
      config = {
        memory: validatedCustomConfig.memory,
        disk: validatedCustomConfig.disk,
        timeout: validatedCustomConfig.timeout,
        concurrency: validatedCustomConfig.concurrency === 'auto' ? undefined : validatedCustomConfig.concurrency,
        timeoutInMilliseconds: validatedCustomConfig.timeoutInMilliseconds,
        framesPerLambda: validatedCustomConfig.framesPerLambda === 'auto' ? undefined : validatedCustomConfig.framesPerLambda,
      };
    } else {
      // Use preset configuration
      const presetConfig = AWS_RENDER_CONFIGS[awsRenderPreset as keyof typeof AWS_RENDER_CONFIGS] 
        ?? AWS_RENDER_CONFIGS.classic;
      
      config = {
        memory: presetConfig.memory,
        disk: presetConfig.disk,
        timeout: presetConfig.timeout,
        concurrency: presetConfig.concurrency,
        timeoutInMilliseconds: presetConfig.timeoutInMilliseconds,
        framesPerLambda: presetConfig.framesPerLambda,
      };

      // Apply concurrency override for preset mode
      if (concurrencyOverride === 'auto') {
        config.concurrency = undefined;
      } else if (typeof concurrencyOverride === 'number') {
        config.concurrency = concurrencyOverride;
      }
    }

    // ── Render quota & config enforcement ─────────────────────────────────
    // 1. Quota: soft-cap on TRIGGER COUNT.  2. Config: check Lambda settings against user's limits.
    // Admins bypass entirely.
    const requestClientId = req.headers.get('x-client-id');
    if (requestClientId && !isAdmin(requestClientId)) {
      // 1. Trigger count quota
      const check = await userQuotaDB.checkPlatform(requestClientId, 'render');
      if (!check.allowed) {
        return NextResponse.json(
          { type: 'error', message: check.reason, quotaError: check.detail },
          { status: check.status },
        );
      }

      // 2. Lambda config limits (advanced per-user setting)
      const quota = await userQuotaDB.getByClientId(requestClientId);
      const configCheck = userQuotaDB.checkRenderConfig(quota?.renderConfig, {
        memory: config.memory,
        timeout: config.timeout,
        concurrency: config.concurrency,
        disk: config.disk,
        preset: configMode === 'preset' ? awsRenderPreset : undefined,
      });
      if (!configCheck.allowed) {
        return NextResponse.json(
          { type: 'error', message: configCheck.reason },
          { status: 403 },
        );
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const functionName = speculateFunctionName({
      diskSizeInMb: config.disk,
      memorySizeInMb: config.memory,
      timeoutInSeconds: config.timeout,
    });

    // Resolve effective AWS region
    const envRegion = process.env.REMOTION_AWS_REGION as AwsRegion | undefined;
    const fallbackRegion = (envRegion ?? DEFAULT_REGION) as AwsRegion;
    const effectiveRegion = (requestedRegion &&
      (AWS_REGIONS as readonly AwsRegion[]).includes(
        requestedRegion as AwsRegion,
      )
      ? requestedRegion
      : fallbackRegion) as AwsRegion;

    const serveUrl =
      effectiveRegion === DEFAULT_REGION
        ? SITE_NAME
        : `${SITE_NAME}-${effectiveRegion}`;

    console.log('==========================================');
    console.log('REMOTION LAMBDA RENDER');
    console.log('==========================================');
    console.log('Region:', effectiveRegion);
    console.log('Config Mode:', configMode);
    console.log('Composition:', id);
    console.log('Codec:', codec);
    console.log('Audio Codec:', audioCodec);
    console.log('Render Type:', renderType);
    console.log('Function Name:', functionName);
    console.log('Memory:', config.memory, 'MB');
    console.log('Disk:', config.disk, 'MB');
    console.log('Timeout:', config.timeout, 's');
    console.log('Concurrency:', config.concurrency ?? 'Auto');
    console.log('Frames/Lambda:', config.framesPerLambda ?? 'Auto');
    console.log('==========================================');

    // Remotion only allows one of concurrency or framesPerLambda, not both
    // If concurrency is set, prioritize it and don't send framesPerLambda
    const renderOptions: any = {
      codec: codec ?? 'h264',
      functionName,
      region: effectiveRegion,
      serveUrl,
      composition: id ?? 'DataMotion',
      inputProps: inputProps,
      audioCodec: audioCodec ?? 'aac',
      timeoutInMilliseconds: config.timeoutInMilliseconds ?? 900 * 1000,
      downloadBehavior: {
        type: isDownloadable ? 'download' : 'play-in-browser',
        fileName: isDownloadable ? fileName || 'video.mp4' : null,
      },
    };

    // Only set one of concurrency or framesPerLambda
    if (config.concurrency !== undefined) {
      renderOptions.concurrency = config.concurrency;
    } else if (config.framesPerLambda !== undefined) {
      renderOptions.framesPerLambda = config.framesPerLambda;
    }

    const clientId = requestClientId;
    const safeTags =
      Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string' && t.trim() !== '') : undefined;
    const safeProjectId = typeof projectId === 'string' && projectId.trim() ? projectId.trim() : undefined;

    // Still image render: run to completion and store as completed immediately.
    if (renderType === 'still') {
      const stillResult = await renderStillOnLambda({
        region: effectiveRegion,
        functionName,
        serveUrl,
        composition: id ?? 'DataMotion',
        inputProps: inputProps,
        imageFormat: 'png',
        frame: 0,
        privacy: 'public',
      });

      if (clientId) {
        await renderRequestDB.create({
          clientId,
          renderId: stillResult.renderId,
          fileName: fileName || 'image.png',
          codec: codec || 'png',
          composition: id ?? 'DataMotion',
          status: 'completed',
          inputProps: inputProps,
          bucketName: stillResult.bucketName,
          isDownloadable: isDownloadable,
          renderType: 'still',
          audioCodec: audioCodec || 'aac',
          regionUsed: effectiveRegion,
          downloadUrl: stillResult.url,
          fileSize: stillResult.sizeInBytes,
          projectId: safeProjectId,
          tags: safeTags,
          // Store configuration details
          configMode,
          awsRenderPreset: configMode === 'preset' ? awsRenderPreset : undefined,
          customConfig: configMode === 'custom' ? customConfig : undefined,
          // Actual values used for rendering
          concurrencyUsed: config.concurrency,
          framesPerLambdaUsed: config.framesPerLambda,
          memoryUsed: config.memory,
          diskUsed: config.disk,
          timeoutUsed: config.timeout,
          functionNameUsed: functionName,
        });

        await platformCostUsageDB.insert({
          platform: 'aws_render',
          source: 'remotion_lambda',
          clientId,
          metadata: { renderId: stillResult.renderId, bucketName: stillResult.bucketName },
          isCalculated: false,
        });
        // Increment quota usage after successful dispatch (soft-cap: render already running)
        if (clientId && !isAdmin(clientId)) {
          await userQuotaDB.incrementUsage(clientId, 'render');
        }
      }

      return NextResponse.json({
        ...stillResult,
        configUsed: {
          mode: configMode,
          region: effectiveRegion,
          functionName,
          memory: config.memory,
          disk: config.disk,
          timeout: config.timeout,
          concurrency: config.concurrency ?? 'auto',
          framesPerLambda: config.framesPerLambda ?? 'auto',
        },
      });
    }

    const result = await renderMediaOnLambda(renderOptions);

    if (clientId) {
      await renderRequestDB.create({
        clientId,
        renderId: result.renderId,
        fileName: fileName || 'video.mp4',
        codec: codec || 'h264',
        composition: id ?? 'DataMotion',
        status: 'rendering',
        inputProps: inputProps,
        bucketName: result.bucketName,
        isDownloadable: isDownloadable,
        renderType: renderType || 'video',
        audioCodec: audioCodec || 'aac',
        regionUsed: effectiveRegion,
        projectId: safeProjectId,
        tags: safeTags,
        // Store configuration details
        configMode,
        awsRenderPreset: configMode === 'preset' ? awsRenderPreset : undefined,
        customConfig: configMode === 'custom' ? customConfig : undefined,
        // Actual values used for rendering
        concurrencyUsed: config.concurrency,
        framesPerLambdaUsed: config.framesPerLambda,
        memoryUsed: config.memory,
        diskUsed: config.disk,
        timeoutUsed: config.timeout,
        functionNameUsed: functionName,
      });
      await platformCostUsageDB.insert({
        platform: 'aws_render',
        source: 'remotion_lambda',
        clientId,
        metadata: { renderId: result.renderId, bucketName: result.bucketName },
        isCalculated: false,
      });
      // Increment quota usage after successful dispatch (soft-cap: render already sent to Lambda)
      if (clientId && !isAdmin(clientId)) {
        await userQuotaDB.incrementUsage(clientId, 'render');
      }
    }

    return NextResponse.json({
      ...result,
      configUsed: {
        mode: configMode,
        region: effectiveRegion,
        functionName,
        memory: config.memory,
        disk: config.disk,
        timeout: config.timeout,
        concurrency: config.concurrency ?? 'auto',
        framesPerLambda: config.framesPerLambda ?? 'auto',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { type: 'error', message: (err as Error).message },
      {
        status: 500,
      },
    );
  }
};

/**
 * Validate and sanitize custom configuration
 */
function validateCustomConfig(config: CustomLambdaConfig): CustomLambdaConfig {
  const validMemories = [1024, 2048, 3008, 4096, 6144, 10240];
  const validDisks = [2048, 5120, 10240];
  
  const memory = validMemories.includes(config.memory) ? config.memory : 3008;
  const disk = validDisks.includes(config.disk) ? config.disk : 10240;
  const timeout = Math.min(900, Math.max(1, config.timeout || 900));
  
  let concurrency: number | 'auto' = 'auto';
  if (config.concurrency !== 'auto' && typeof config.concurrency === 'number') {
    concurrency = Math.min(CONCURRENCY_LIMITS.max, Math.max(CONCURRENCY_LIMITS.min, config.concurrency));
  }
  
  let framesPerLambda: number | 'auto' = 'auto';
  if (config.framesPerLambda !== 'auto' && typeof config.framesPerLambda === 'number') {
    framesPerLambda = Math.min(FRAMES_PER_LAMBDA_LIMITS.max, Math.max(FRAMES_PER_LAMBDA_LIMITS.min, config.framesPerLambda));
  }
  
  return {
    memory,
    disk,
    timeout,
    concurrency,
    framesPerLambda,
    timeoutInMilliseconds: timeout * 1000,
  };
}
