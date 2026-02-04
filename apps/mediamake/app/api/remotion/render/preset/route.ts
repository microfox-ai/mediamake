import { AwsRegion, RenderMediaOnLambdaOutput } from '@remotion/lambda/client';
import {
  renderMediaOnLambda,
  speculateFunctionName,
} from '@remotion/lambda/client';
import {
  AWS_RENDER_CONFIGS,
  REGION,
  SITE_NAME,
  CONCURRENCY_LIMITS,
  FRAMES_PER_LAMBDA_LIMITS,
} from '../../../../../config.mjs';
import { NextRequest, NextResponse } from 'next/server';
import { renderRequestDB } from '@/lib/render-mongodb';
import { platformCostUsageDB } from '@/lib/cost-usage-mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getPredefinedPresetById } from '@/components/editor/presets/registry/registry/presets-registry';
import {
  runPreset,
  insertPresetToComposition,
} from '@/components/editor/presets/engine/preset-helpers';
import {
  processPresetInputData,
  createBaseDataFromReferences,
} from '@/components/editor/presets/engine/preset-data-mutation';
import { createCachedFetcher } from '@/lib/audio-cache';
import {
  DatabasePreset,
  Preset,
  PresetInputData,
} from '@/components/editor/presets/types';
import { InputCompositionProps } from '@microfox/remotion';
import { ObjectId } from 'mongodb';

// Custom configuration type
interface CustomLambdaConfig {
  memory: number;
  disk: number;
  timeout: number;
  concurrency: number | 'auto';
  framesPerLambda: number | 'auto';
  timeoutInMilliseconds: number;
}

// Types for the preset render request
interface PresetRenderItem {
  presetId: string;
  presetType: 'predefined' | 'database';
  presetInputData: PresetInputData;
}

interface PresetRenderRequest {
  presets: PresetRenderItem[];
  isDownloadable?: boolean;
  fileName?: string;
  codec?: string;
  audioCodec?: string;
  composition?: string;
  baseData?: Record<string, any>;
  // Configuration mode
  configMode?: 'preset' | 'custom';
  // Preset mode settings
  awsRenderPreset?:
    | 'classic'
    | 'complex-fast'
    | 'complex-slow'
    | 'basic-fast'
    | 'throttled'
    | 'lightweight'
    | 'broadcast'
    | 'enterprise';
  concurrencyOverride?: number | 'auto';
  // Custom mode settings
  customConfig?: CustomLambdaConfig;
}

export const POST = async (req: NextRequest) => {
  try {
    const {
      presets,
      isDownloadable,
      fileName,
      codec,
      audioCodec,
      composition,
      baseData = {},
      configMode = 'preset',
      awsRenderPreset = 'classic',
      concurrencyOverride,
      customConfig,
    }: PresetRenderRequest = await req.json();
    const clientId = req.headers.get('x-client-id') || undefined;

    // Validate required fields
    if (!presets || !Array.isArray(presets) || presets.length === 0) {
      return NextResponse.json(
        { error: 'Presets array is required and must not be empty' },
        { status: 400 },
      );
    }

    // Validate AWS credentials
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

    console.log('Processing presets:', presets.length);
    console.log('Composition:', composition || 'DataMotion');
    console.log('Codec:', codec || 'h264');
    console.log('Config Mode:', configMode);

    // Start with empty composition
    let finalComposition: InputCompositionProps = {
      childrenData: [],
      config: {},
      style: {},
    };

    let clip = {};

    // Process each preset in order
    for (const presetItem of presets) {
      const { presetId, presetType, presetInputData } = presetItem;

      let preset: Preset | DatabasePreset | null = null;

      // Fetch preset based on type
      if (presetType === 'predefined') {
        const foundPreset = getPredefinedPresetById(presetId);
        if (!foundPreset) {
          return NextResponse.json(
            { error: `Predefined preset with ID '${presetId}' not found` },
            { status: 404 },
          );
        }
        preset = foundPreset;
      } else if (presetType === 'database') {
        console.log(
          `🔍 RENDER API: Processing database preset with ID: ${presetId}`,
        );

        // Validate ObjectId format
        if (!ObjectId.isValid(presetId)) {
          console.log(
            `❌ RENDER API: Invalid database preset ID format: ${presetId}`,
          );
          return NextResponse.json(
            { error: `Invalid database preset ID: '${presetId}'` },
            { status: 400 },
          );
        }

        const db = await getDatabase();
        const collection = db.collection<DatabasePreset>('presets');
        const clientId = req.headers.get('x-client-id') || undefined;

        const query: any = { _id: new ObjectId(presetId) };
        if (clientId) query.clientId = clientId;

        preset = await collection.findOne(query);
        if (!preset) {
          console.log(`❌ RENDER API: Database preset not found: ${presetId}`);
          return NextResponse.json(
            { error: `Database preset with ID '${presetId}' not found` },
            { status: 404 },
          );
        }

        console.log(`✅ RENDER API: Successfully loaded database preset:`, {
          id: presetId,
          title: preset.metadata?.title,
          type: preset.metadata?.presetType,
          clientId: clientId,
        });
      } else {
        return NextResponse.json(
          {
            error: `Invalid preset type: '${presetType}'. Must be 'predefined' or 'database'`,
          },
          { status: 400 },
        );
      }

      // Process input data with base data references
      const processedInputData = processPresetInputData(
        presetInputData,
        baseData,
      );

      // Execute the preset
      const presetOutput = await runPreset(
        processedInputData,
        preset.presetFunction,
        {
          config: finalComposition.config,
          style: finalComposition.style,
          clip,
          baseData: baseData,
          fetcher: (url: string, data: any) =>
            fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            }),
        },
        preset.metadata, // Pass metadata for dependency injection
      );
      if (!presetOutput) {
        return NextResponse.json(
          { error: `Failed to execute preset '${presetId}'` },
          { status: 500 },
        );
      }

      if (presetOutput.options?.clip && preset.metadata.presetType === 'full') {
        clip = presetOutput.options.clip;
      }

      // Insert preset output into composition
      finalComposition = insertPresetToComposition(finalComposition, {
        presetOutput,
        presetType: preset.metadata.presetType,
      });

      console.log(
        `Processed preset: ${preset.metadata.title} (${preset.metadata.presetType})`,
      );
    }

    console.log('Final composition built, starting render...');

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
    console.log('REMOTION LAMBDA PRESET RENDER');
    console.log('==========================================');
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
      codec:
        (codec as
          | 'h264'
          | 'h265'
          | 'vp8'
          | 'vp9'
          | 'mp3'
          | 'aac'
          | 'wav'
          | 'gif'
          | 'prores') ?? 'h264',
      functionName,
      region: (process.env.REMOTION_AWS_REGION || REGION) as AwsRegion,
      serveUrl: SITE_NAME,
      composition: composition ?? 'DataMotion',
      inputProps: finalComposition,
      audioCodec:
        (audioCodec as 'mp3' | 'aac' | 'pcm-16' | 'opus' | null | undefined) ??
        'aac',
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

    // Store render history if client ID is provided
    if (clientId) {
      await renderRequestDB.create({
        clientId,
        renderId: result.renderId,
        fileName: fileName || 'video.mp4',
        codec: codec || 'h264',
        composition: composition || 'DataMotion',
        status: 'rendering',
        inputProps: finalComposition,
        bucketName: result.bucketName,
        isDownloadable: isDownloadable,
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
      await platformCostUsageDB.insert({
        platform: 'aws_render',
        source: 'remotion_lambda',
        clientId,
        metadata: { renderId: result.renderId, bucketName: result.bucketName },
        isCalculated: false,
      });
    }

    return NextResponse.json({
      ...result,
      processedPresets: presets.length,
      finalComposition,
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
    console.error('Preset render error:', err);
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
