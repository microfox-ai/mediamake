/**
 * Camera Flash Transition Preset
 *
 * This preset creates an intense white flash transition effect between two video clips,
 * simulating a camera flash going off. The effect features a white overlay that rapidly
 * expands from the center with a bright burst, momentarily whiting out the screen during
 * the transition. The outgoing video receives a brief exposure boost for added realism.
 *
 * Features:
 * - **Flash Burst Effect**: Pure white overlay that scales from center
 * - **Exposure Boost**: Brief brightness increase on outgoing video
 * - **Smooth Timing**: Fade in (0.1s), hold (0.2s), fade out (0.2s)
 * - **Seamless Switch**: Videos swap during peak white-out moment
 * - **Configurable Overlap**: Default 0.5s transition overlap
 *
 * Use cases:
 * - Creating dramatic transitions between video clips
 * - Simulating camera flash photography effects
 * - Building action-packed video sequences
 * - Adding cinematic impact to scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video clip'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second video clip'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the flash transition overlap in seconds'),
  flashIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for the flash effect'),
  exposureBoost: z
    .number()
    .min(1)
    .max(2)
    .default(1.5)
    .optional()
    .describe('Brightness boost multiplier for outgoing video'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;
  const flashIntensity = params.flashIntensity ?? 1;
  const exposureBoost = params.exposureBoost ?? 1.5;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Flash timing breakdown (total 0.5s)
  const fadeInDuration = 0.1; // 0.1s fade in
  const holdDuration = 0.2; // 0.2s hold at full white
  const fadeOutDuration = 0.2; // 0.2s fade out

  // Transition point where video2 starts
  const transitionStart = video1.duration - overlapDuration;

  // Outgoing video (video1)
  const outgoingVideo: RenderableComponentData = {
    id: 'camera-flash-outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Exposure boost effect (brightness filter) right before flash
      {
        id: 'exposure-boost-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStart - 0.1, // Start 0.1s before transition
          duration: 0.1,
          mode: 'provider',
          targetIds: ['camera-flash-outgoing-video'],
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: exposureBoost, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video (video2)
  const incomingVideo: RenderableComponentData = {
    id: 'camera-flash-incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
  };

  // White flash overlay using HTMLBlockAtom (ShapeAtom is deprecated)
  const flashOverlay: RenderableComponentData = {
    id: 'camera-flash-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="w-full h-full bg-white rounded-full" style="transform-origin: center;"></div>',
      className: 'absolute inset-0 flex items-center justify-center',
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
    effects: [
      // Scale effect
      {
        id: 'flash-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['camera-flash-overlay'],
          ranges: [
            // Scale from 0 to 1.5 during fade-in (0-0.1s)
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.5 * flashIntensity, prog: 0.2 }, // prog 0.2 = 0.1s
            // Hold at 1.5 during white-out (0.1-0.3s)
            { key: 'scale', val: 1.5 * flashIntensity, prog: 0.6 }, // prog 0.6 = 0.3s
            // Stay at 1.5 during fade-out (0.3-0.5s)
            { key: 'scale', val: 1.5 * flashIntensity, prog: 1 },
          ],
        },
      },
      // Opacity effect
      {
        id: 'flash-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['camera-flash-overlay'],
          ranges: [
            // Fade in (0-0.1s)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 }, // prog 0.2 = 0.1s
            // Hold at full white (0.1-0.3s)
            { key: 'opacity', val: 1, prog: 0.6 }, // prog 0.6 = 0.3s
            // Fade out (0.3-0.5s)
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'camera-flash-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo, flashOverlay],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'camera-flash-transition',
  title: 'Camera Flash Transition',
  description:
    'A camera flash transition preset that simulates an intense white blowout effect between two video clips. Creates a bright flash burst expanding from center during the overlap period, with exposure boost on outgoing video for added realism.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'flash', 'effect', 'video', 'cinematic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 0.5,
    flashIntensity: 1,
    exposureBoost: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cameraFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
