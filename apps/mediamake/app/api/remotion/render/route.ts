import { AwsRegion, RenderMediaOnLambdaOutput } from '@remotion/lambda/client';
import {
  renderMediaOnLambda,
  speculateFunctionName,
} from '@remotion/lambda/client';
import { AWS_RENDER_CONFIGS, REGION, SITE_NAME, CONCURRENCY_LIMITS, FRAMES_PER_LAMBDA_LIMITS } from '../../../../config.mjs';
import { NextRequest, NextResponse } from 'next/server';
import { renderRequestDB } from '@/lib/render-mongodb';

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
      // Configuration mode
      configMode = 'preset',
      // Preset mode settings
      awsRenderPreset = 'classic',
      concurrencyOverride,
      // Custom mode settings
      customConfig,
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

    const functionName = speculateFunctionName({
      diskSizeInMb: config.disk,
      memorySizeInMb: config.memory,
      timeoutInSeconds: config.timeout,
    });

    console.log('==========================================');
    console.log('REMOTION LAMBDA RENDER');
    console.log('==========================================');
    console.log('Region:', process.env.REMOTION_AWS_REGION || REGION);
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
      region: (process.env.REMOTION_AWS_REGION || REGION) as AwsRegion,
      serveUrl: SITE_NAME,
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

    const result = await renderMediaOnLambda(renderOptions);

    const clientId = req.headers.get('x-client-id');
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
    }
    
    return NextResponse.json({
      ...result,
      configUsed: {
        mode: configMode,
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
