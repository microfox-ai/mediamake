/**
 * Frosted Glass Refraction Blur Reveal Wipe Transition Preset
 *
 * This preset creates a sophisticated transition effect where the incoming video gradually
 * appears through a crystalline distortion effect that simulates looking through frosted
 * glass. The effect progressively clears from left to right, revealing the new video underneath.
 *
 * Features:
 * - **Frosted Glass Effect**: Outgoing video gains increasing blur (0px→20px) and brightness boost (100%→130%)
 * - **Horizontal Wipe Reveal**: Incoming video expands from left to right using clip-path animation
 * - **Subtle Scale Animation**: Incoming video scales from 1.02 to 1.0 for dynamic reveal
 * - **Complementary Blur**: Incoming video starts blurred (8px) and clears to sharp (0px)
 * - **Refraction Line**: Semi-transparent white overlay with gradient simulating glass refraction edge
 * - **1.5-Second Overlap**: Smooth transition period with synchronized effects
 *
 * Use cases:
 * - Creating elegant transitions between video clips
 * - Building cinematic video sequences with glass-like effects
 * - Adding sophisticated reveals to presentations
 * - Creating visual interest in video montages
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap period in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;
  const { config } = props;

  // Calculate total composition duration (video1 + video2 - overlap)
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate timing for transition effects
  const transitionStartTime = video1.duration - overlapDuration;
  const outgoingEffectDuration = overlapDuration * 0.7; // Effects end at 70% of overlap

  // Calculate refraction line travel distance
  const videoWidth = config?.width || 1920;
  const refractionLineWidth = 100;
  const refractionLineEndX = videoWidth + refractionLineWidth;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video with frosted glass effect
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-blur-brightness-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            mode: 'provider',
            targetIds: ['outgoing-video'],
            start: transitionStartTime,
            duration: outgoingEffectDuration,
            ranges: [
              {
                key: 'filter',
                val: 'blur(0px) brightness(100%)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'blur(20px) brightness(130%)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video with clip-path reveal, scale, and blur effects
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: video2.duration,
        },
      },
      effects: [
        // Clip-path wipe reveal from left to right
        {
          id: 'incoming-clippath-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            mode: 'provider',
            targetIds: ['incoming-video'],
            start: 0,
            duration: overlapDuration,
            ranges: [
              {
                key: 'clipPath',
                val: 'inset(0 100% 0 0)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'inset(0 0 0 0)',
                prog: 1,
              },
            ],
          },
        },
        // Subtle scale animation for dynamic reveal
        {
          id: 'incoming-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            mode: 'provider',
            targetIds: ['incoming-video'],
            start: 0,
            duration: overlapDuration,
            ranges: [
              {
                key: 'scale',
                val: 1.02,
                prog: 0,
              },
              {
                key: 'scale',
                val: 1,
                prog: 1,
              },
            ],
          },
        },
        // Blur effect that clears as video is revealed
        {
          id: 'incoming-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            mode: 'provider',
            targetIds: ['incoming-video'],
            start: 0,
            duration: overlapDuration,
            ranges: [
              {
                key: 'filter',
                val: 'blur(8px)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'blur(0px)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Refraction line overlay
    {
      id: 'refraction-line',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${refractionLineWidth}px; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0.4), transparent);"></div>`,
        className: 'absolute inset-y-0',
        style: {
          zIndex: 30,
          pointerEvents: 'none',
          left: 0,
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'refraction-line-translate-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            mode: 'provider',
            targetIds: ['refraction-line'],
            start: 0,
            duration: overlapDuration,
            ranges: [
              {
                key: 'translateX',
                val: -refractionLineWidth,
                prog: 0,
              },
              {
                key: 'translateX',
                val: refractionLineEndX,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'frosted-glass-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
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
  id: 'frosted-glass-refraction-wipe-transition',
  title: 'Frosted Glass Refraction Blur Reveal Wipe Transition',
  description:
    'A crystalline frosted glass transition effect where the incoming video is revealed through a horizontal wipe with blur distortion, brightness boost, and a moving refraction line. The outgoing video gains increasing blur and brightness to simulate frosted glass, while the incoming video is progressively unclipped from left to right with complementary blur reduction and subtle scale animation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wipe', 'reveal', 'blur', 'glass', 'refraction', 'frosted'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const frostedGlassRefractionWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
