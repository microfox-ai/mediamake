import { AwsRegion, RenderMediaOnLambdaOutput } from '@remotion/lambda/client';
import {
  renderMediaOnLambda,
  speculateFunctionName,
} from '@remotion/lambda/client';
import { AWS_RENDER_CONFIGS, REGION, SITE_NAME } from '../../../../config.mjs';
import { NextRequest, NextResponse } from 'next/server';
import { renderRequestDB } from '@/lib/render-mongodb';

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
      awsRenderPreset = 'classic',
      concurrencyOverride,
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

    const config =
      AWS_RENDER_CONFIGS[
      awsRenderPreset as keyof typeof AWS_RENDER_CONFIGS
      ] ?? AWS_RENDER_CONFIGS.classic;

    let concurrency: number | undefined;

    if (concurrencyOverride === 'auto') {
      concurrency = undefined;
    } else if (typeof concurrencyOverride === 'number') {
      concurrency = concurrencyOverride;
    } else {
      concurrency = config.concurrency;
    }

    console.log(process.env.REMOTION_AWS_REGION || REGION);
    console.log('Composition is', id);
    console.log('Codec is', codec);
    console.log('Audio Codec is', audioCodec);
    console.log('Render Type is', renderType);
    console.log('AWS Render Preset is', awsRenderPreset);
    console.log(
      'Function name is',
      speculateFunctionName({
        diskSizeInMb: config.disk,
        memorySizeInMb: config.memory,
        timeoutInSeconds: config.timeout,
      }),
    );

    const result = await renderMediaOnLambda({
      codec: codec ?? 'h264',
      functionName: speculateFunctionName({
        diskSizeInMb: config.disk,
        memorySizeInMb: config.memory,
        timeoutInSeconds: config.timeout,
      }),
      region: (process.env.REMOTION_AWS_REGION || REGION) as AwsRegion,
      serveUrl: SITE_NAME, // https://remotionlambda-useast2-xjv1ee2a1g.s3.us-east-2.amazonaws.com/sites/mediamake
      composition: id ?? 'DataMotion',
      inputProps: inputProps,
      audioCodec: audioCodec ?? 'aac',
      //      framesPerLambda: 10,
      //concurrency: 10,
      ...(concurrency ? { concurrency: concurrency } : {}),
      timeoutInMilliseconds: config.timeoutInMilliseconds ?? (900 * 1000),
      downloadBehavior: {
        type: isDownloadable ? 'download' : 'play-in-browser',
        fileName: isDownloadable ? fileName || 'video.mp4' : null,
      },
      //   metadata: {

      //   }
    });

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
        awsRenderPreset: awsRenderPreset,
        concurrencyUsed: concurrency,
      });
    }
    return NextResponse.json(result);
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

