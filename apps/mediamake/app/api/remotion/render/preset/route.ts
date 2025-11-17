import { AwsRegion, RenderMediaOnLambdaOutput } from '@remotion/lambda/client';
import {
  renderMediaOnLambda,
  speculateFunctionName,
} from '@remotion/lambda/client';
import {
  AWS_RENDER_CONFIGS,
  REGION,
  SITE_NAME,
} from '../../../../../config.mjs';
import { NextRequest, NextResponse } from 'next/server';
import { renderRequestDB } from '@/lib/render-mongodb';
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
  composition?: string; // Optional composition ID, defaults to 'DataMotion'
  baseData?: Record<string, any>; // Base data for data references
  awsRenderPreset?:
    | 'complex-fast'
    | 'complex-slow'
    | 'basic-fast'
    | 'throttled'
    | 'classic';
  concurrencyOverride?: number | 'auto';
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
      awsRenderPreset = 'classic',
      concurrencyOverride,
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

    const config =
      AWS_RENDER_CONFIGS[awsRenderPreset as keyof typeof AWS_RENDER_CONFIGS] ??
      AWS_RENDER_CONFIGS.classic;

    let concurrency: number | undefined;
    if (concurrencyOverride === 'auto') {
      concurrency = undefined;
    } else if (typeof concurrencyOverride === 'number') {
      concurrency = concurrencyOverride;
    } else {
      concurrency = config.concurrency;
    }

    // Use the same render logic as the main route
    const result = await renderMediaOnLambda({
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
      functionName: speculateFunctionName({
        diskSizeInMb: config.disk,
        memorySizeInMb: config.memory,
        timeoutInSeconds: config.timeout,
      }),
      region: (process.env.REMOTION_AWS_REGION || REGION) as AwsRegion,
      serveUrl: SITE_NAME,
      composition: composition ?? 'DataMotion',
      inputProps: finalComposition,
      audioCodec:
        (audioCodec as 'mp3' | 'aac' | 'pcm-16' | 'opus' | null | undefined) ??
        'aac',
      timeoutInMilliseconds: config.timeoutInMilliseconds ?? (240 * 1000),
      ...(concurrency ? { concurrency: concurrency } : {}),
      downloadBehavior: {
        type: isDownloadable ? 'download' : 'play-in-browser',
        fileName: isDownloadable ? fileName || 'video.mp4' : null,
      },
    });

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
        awsRenderPreset: awsRenderPreset,
        concurrencyUsed: concurrency,
      });
    }

    return NextResponse.json({
      ...result,
      processedPresets: presets.length,
      finalComposition,
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
