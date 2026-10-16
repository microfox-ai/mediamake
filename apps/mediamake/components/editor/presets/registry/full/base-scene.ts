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
 * - **Track type**: Sequence hugs child tracks. Aligned uses a start and duration you can drag.
 * - **Clip Support**: Optional clip start and duration for trimming
 *
 * Use cases:
 * - Creating the base layer for video compositions
 * - Setting up scene dimensions and background
 * - Establishing the foundation for all other presets
 * - Creating simple colored background scenes
 */

import z from 'zod';
import { paramMetaTypes } from '../../dataTypes';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  backgroundColor: z.string(),
  resolution: z.number().default(1080).optional(),
  aspectRatio: z.string().optional(),
  trackType: z
    .enum(['lockedTo', 'sequence', 'aligned', 'autoRange'])
    .default('autoRange')
    .describe(
      'Lock copies another track. Sequence plays children in order. Aligned uses start and duration. Auto range starts at the first child and ends at the last child.',
    ),
  start: z
    .number()
    .optional()
    .describe('Start of this scene in its parent, in seconds'),
  duration: z
    .number()
    .optional()
    .describe('Duration in seconds. Used when track type is aligned.'),
  lock: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.lockTarget]: true })
    .describe(
      'Lock start and duration to another track. A scene can lock to a child, and the scene window becomes that child.',
    ),
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
  const { backgroundColor, duration, lock } = params;
  const trackType =
    params.trackType === 'sequence'
      ? 'sequence'
      : params.trackType === 'autoRange'
        ? 'autoRange'
        : 'aligned';

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

  const clipDuration =
    params.clip?.duration && params.clip.duration > 0
      ? params.clip.duration
      : undefined;
  const authoredDuration =
    clipDuration ??
    (typeof duration === 'number' && duration > 0 ? duration : undefined);
  const sceneDuration =
    (trackType === 'sequence' && authoredDuration === undefined) ||
    trackType === 'autoRange'
      ? undefined
      : (authoredDuration ?? 20);
  const lockRef = typeof lock === 'string' && lock ? lock : undefined;

  const start = params.clip?.start
    ? -params.clip.start
    : typeof params.start === 'number'
      ? params.start
      : 0;
  const durationData =
    lockRef ||
    trackType === 'autoRange' ||
    (trackType === 'sequence' && authoredDuration === undefined)
      ? {}
      : { duration: sceneDuration ?? 20 };
  return {
    output: {
      childrenData: [
        {
          id: 'BaseScene',
          componentId: 'BaseLayout',
          type: trackType === 'sequence' ? ('scene' as const) : ('layout' as const),
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
            },
          },
          childrenData: [],
        },
      ],
      config: {
        width: baseWidth,
        height: baseHeight,
        fps: 30,
        ...(sceneDuration !== undefined ? { duration: sceneDuration } : {}),
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
    trackType: 'autoRange',
    start: 0,
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
