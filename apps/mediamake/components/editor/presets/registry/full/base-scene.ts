/**
 * Base Scene Preset
 *
 * This preset creates a foundational scene with a customizable background color. It serves as the
 * base container for all other presets and components in a composition.
 *
 * Features:
 * - **Background Color**: Set any background color for the scene
 * - **Resolution Control**: Configure width and height (defaults to 1080p)
 * - **Aspect Ratio**: Support for custom aspect ratios (e.g., "16:9", "9:16", "1:1")
 * - **Duration Management**: Set explicit duration or fit to other components
 * - **Clip Support**: Optional clip start and duration for trimming
 *
 * Use cases:
 * - Creating the base layer for video compositions
 * - Setting up scene dimensions and background
 * - Establishing the foundation for all other presets
 * - Creating simple colored background scenes
 */

import {
  AudioAtomDataProps,
  InputCompositionProps,
  PanEffectData,
  TextAtomData,
  WaveformConfig,
  WaveformHistogramRangedDataProps,
  ZoomEffectData,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  backgroundColor: z.string(),
  resolution: z.number().default(1080).optional(),
  duration: z.number().optional(),
  fitDurationTo: z.string().optional(),
  aspectRatio: z.string().optional(),
  clip: z
    .object({
      start: z.number().optional(),
      duration: z.number().optional(),
    })
    .optional(),
});
//src: https://cdn1.suno.ai/6aded313-9bd5-4c8b-bb6f-fd5f158642e3.m4a
const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  const { backgroundColor, duration, fitDurationTo } = params;

  const [widthRatio, heightRatio] = params.aspectRatio
    ?.split(':')
    .map(Number) ?? [16, 9];
  const aspectRatio = widthRatio / heightRatio;

  // Calculate dimensions based on aspect ratio (using 1920 as base width)
  let baseWidth, baseHeight;
  if (params.resolution && aspectRatio > 1) {
    baseHeight = params.resolution ?? 1920;
    baseWidth = Math.round(baseHeight * aspectRatio);
  } else {
    baseWidth = params.resolution ?? 1080;
    baseHeight = Math.round(baseWidth / aspectRatio);
  }

  const sceneDuration =
    params.clip?.duration && params.clip?.duration > 0
      ? params.clip.duration
      : duration && duration > 0
        ? duration
        : 20;
  const sceneFitDuration =
    params.clip?.duration && params.clip?.duration > 0
      ? {}
      : { fitDurationTo: 'BaseScene' };
  const externalFit =
    fitDurationTo &&
    fitDurationTo !== 'this' &&
    fitDurationTo !== 'fill' &&
    fitDurationTo !== 'parent' &&
    fitDurationTo !== 'BaseScene'
      ? fitDurationTo
      : undefined;
  const fitDuarationToData = externalFit ? { fitDurationTo: externalFit } : {};

  const start = params.clip?.start ? -params.clip.start : 0;
  const durationData =
    params.clip?.duration && params.clip?.duration > 0
      ? {
          duration: params.clip?.duration,
        }
      : params.clip
        ? {}
        : { duration: sceneDuration ?? 20 };
  return {
    output: {
      childrenData: [
        {
          id: 'BaseScene',
          componentId: 'BaseLayout',
          type: 'layout' as const,
          data: {
            containerProps: {
              className: 'flex items-center justify-center absolute inset-0',
              style: {
                backgroundColor: backgroundColor,
              },
            },
            childrenProps: [],
          },
          context: {
            timing: {
              start: start,
              ...durationData,
              ...fitDuarationToData,
            },
          },
          childrenData: [],
        },
      ],
      config: {
        width: baseWidth,
        height: baseHeight,
        fps: 30,
        duration: sceneDuration ?? 20,
        ...sceneFitDuration,
      },
    },
    options: {
      clip: {
        start: params.clip?.start,
        duration: params.clip?.duration,
      },
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'base-scene',
  title: 'Base Scene',
  description: 'A base scene with a background color',
  type: 'predefined',
  presetType: 'full',
  role: 'scene',
  tags: ['base', 'scene'],
  defaultInputParams: {
    backgroundColor: 'black',
    duration: 20,
    fitDurationTo: 'BaseScene',
  },
};

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const baseScenePreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { baseScenePreset };
