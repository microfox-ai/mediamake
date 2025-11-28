/**
 * Glitch Swap Transition Preset
 *
 * A high-energy glitch-style swap transition with 0.5-second overlap.
 * Features horizontal shake with increasing intensity and opacity flickering (1→0.3→1→0.3→0)
 * on the outgoing video, while the incoming video shakes vertically with decreasing intensity
 * and flickers in (0→0.7→0→0.7→1).
 *
 * RGB channel split effect using red and cyan overlays with screen blend mode creates
 * digital corruption aesthetic. Perfect for action sequences, music videos, and energetic content.
 *
 * Technical implementation:
 * - BaseLayout with 0.5s overlap calculation
 * - Outgoing video: opacity keyframes [1, 0.3, 1, 0.3, 0] at 0.1s intervals
 * - Transform translateX with values [-5px, 5px, -8px, 8px, 0]
 * - Incoming video: starts at (video1.duration - 0.5s)
 * - Opacity keyframes [0, 0.7, 0, 0.7, 1]
 * - Transform translateY values [8px, -8px, 5px, -5px, 0]
 * - Color overlay divs with mix-blend-mode: screen and animated opacity for RGB split effect
 * - All animations over 0.5s with linear easing for sharp movements
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
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  overlapDuration: z
    .number()
    .default(0.5)
    .describe('Duration of transition overlap in seconds (0.5s default for glitch effect)'),
  shakeIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Multiplier for shake intensity (1 = default)'),
  rgbIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of RGB channel split effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, shakeIntensity, rgbIntensity } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate when transition effects start (relative to outgoing video)
  const transitionStartOutgoing = video1.duration - overlapDuration;

  // Shake values with intensity multiplier
  const horizontalShake = {
    val1: -5 * shakeIntensity,
    val2: 5 * shakeIntensity,
    val3: -8 * shakeIntensity,
    val4: 8 * shakeIntensity,
  };

  const verticalShake = {
    val1: 8 * shakeIntensity,
    val2: -8 * shakeIntensity,
    val3: 5 * shakeIntensity,
    val4: -5 * shakeIntensity,
  };

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'glitch-outgoing-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Opacity flicker effect
        {
          id: 'outgoing-opacity-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStartOutgoing,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['glitch-outgoing-container'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.4 },
              { key: 'opacity', val: 0.3, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Horizontal shake effect
        {
          id: 'outgoing-horizontal-shake',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStartOutgoing,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['glitch-outgoing-container'],
            ranges: [
              { key: 'translateX', val: horizontalShake.val1, prog: 0 },
              { key: 'translateX', val: horizontalShake.val2, prog: 0.2 },
              { key: 'translateX', val: horizontalShake.val3, prog: 0.4 },
              { key: 'translateX', val: horizontalShake.val4, prog: 0.6 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'glitch-outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video container
    {
      id: 'glitch-incoming-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: video2.duration,
        },
      },
      effects: [
        // Opacity flicker effect
        {
          id: 'incoming-opacity-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['glitch-incoming-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.2 },
              { key: 'opacity', val: 0, prog: 0.4 },
              { key: 'opacity', val: 0.7, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Vertical shake effect
        {
          id: 'incoming-vertical-shake',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['glitch-incoming-container'],
            ranges: [
              { key: 'translateY', val: verticalShake.val1, prog: 0 },
              { key: 'translateY', val: verticalShake.val2, prog: 0.2 },
              { key: 'translateY', val: verticalShake.val3, prog: 0.4 },
              { key: 'translateY', val: verticalShake.val4, prog: 0.6 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'glitch-incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // RGB Red Overlay
    {
      id: 'glitch-rgb-red-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: `rgba(255, 0, 0, ${rgbIntensity})`,
            mixBlendMode: 'screen',
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [
        // Red overlay pulse
        {
          id: 'red-overlay-pulse',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['glitch-rgb-red-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.25 },
              { key: 'opacity', val: 0.2, prog: 0.5 },
              { key: 'opacity', val: 0.9, prog: 0.75 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Red channel offset
        {
          id: 'red-channel-offset',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['glitch-rgb-red-overlay'],
            ranges: [
              { key: 'translateX', val: -3, prog: 0 },
              { key: 'translateX', val: 5, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // RGB Cyan Overlay
    {
      id: 'glitch-rgb-cyan-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: `rgba(0, 255, 255, ${rgbIntensity})`,
            mixBlendMode: 'screen',
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [
        // Cyan overlay pulse
        {
          id: 'cyan-overlay-pulse',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['glitch-rgb-cyan-overlay'],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 0.1, prog: 0.25 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0.2, prog: 0.75 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Cyan channel offset
        {
          id: 'cyan-channel-offset',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['glitch-rgb-cyan-overlay'],
            ranges: [
              { key: 'translateX', val: 3, prog: 0 },
              { key: 'translateX', val: -5, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'glitch-swap-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
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
  id: 'glitch-swap-transition',
  title: 'Glitch Swap Transition',
  description:
    'A high-energy glitch-style swap transition with 0.5-second overlap. Features horizontal shake with increasing intensity and opacity flickering on the outgoing video, while the incoming video shakes vertically with decreasing intensity. RGB channel split effect using red and cyan overlays creates digital corruption aesthetic. Perfect for action sequences, music videos, and energetic content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'swap',
    'video',
    'rgb-split',
    'shake',
    'flicker',
    'energetic',
    'action',
    'music-video',
    'digital-corruption',
  ],
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
    shakeIntensity: 1,
    rgbIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchSwapTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
