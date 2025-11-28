/**
 * Vintage Light Leak Transition Preset
 *
 * Creates a Super 8 film-inspired transition effect with vertical light bands sweeping
 * across the frame from left to right. Features three tall rectangular light streaks with
 * staggered timing that move across the screen, while the outgoing video gradually loses
 * contrast and gains a warm tint, and the incoming video emerges through the light streaks
 * with complementary cool tones that normalize as the transition completes.
 *
 * Features:
 * - **Three Light Bands**: Vertical light streaks (w-32 h-full) with yellow gradient
 * - **Staggered Timing**: Light bands sweep at 0s, 0.3s, and 0.6s intervals
 * - **Warm Color Grading**: Outgoing video gets sepia/brightness treatment
 * - **Cool Color Grading**: Incoming video starts with cool hue-rotate effect
 * - **2 Second Overlap**: Transition occurs over 2 seconds with cross-fade
 * - **Film Artifact Aesthetic**: Authentic vintage Super 8 film look
 *
 * Use cases:
 * - Creating nostalgic film transitions between clips
 * - Vintage photo slideshow effects
 * - Retro video montages with film aesthetic
 * - Adding cinematic light leaks to transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    outgoingVideoDuration,
    incomingVideoSrc,
    incomingVideoDuration,
    transitionDuration,
  } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Calculate timing for incoming video (starts before outgoing ends)
  const incomingStartTime = outgoingVideoDuration - transitionDuration;

  // Outgoing video effects: warm color grading over full duration
  const outgoingVideoEffects = [
    // Opacity fade-out during middle of transition (0.5s-1.5s of the 2s overlap)
    {
      id: 'outgoing-fade-out',
      componentId: 'generic',
      data: {
        type: 'ease-in' as const,
        start: outgoingVideoDuration - transitionDuration + 0.5, // Start at 0.5s into transition
        duration: 1, // Fade over 1 second
        mode: 'provider' as const,
        targetIds: ['outgoing-video'],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
    // Warm filter progression over full duration
    {
      id: 'outgoing-warm-filter',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: outgoingVideoDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-video'],
        ranges: [
          {
            key: 'filter',
            val: 'contrast(1) sepia(0) brightness(1)',
            prog: 0,
          },
          {
            key: 'filter',
            val: 'contrast(0.7) sepia(0.2) brightness(1.3)',
            prog: 1,
          },
        ],
      },
    },
  ];

  // Incoming video effects: cool color grading that normalizes
  const incomingVideoEffects = [
    // Opacity fade-in during middle of transition (0.5s-1.5s of the 2s overlap)
    {
      id: 'incoming-fade-in',
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: 0.5, // Relative to incoming video start (0.5s into transition)
        duration: 1, // Fade over 1 second
        mode: 'provider' as const,
        targetIds: ['incoming-video'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    },
    // Cool filter that transitions to normal over full incoming duration
    {
      id: 'incoming-cool-filter',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0, // Relative to incoming video start
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-video'],
        ranges: [
          {
            key: 'filter',
            val: 'brightness(0.8) hue-rotate(-10deg)',
            prog: 0,
          },
          { key: 'filter', val: 'brightness(1) hue-rotate(0deg)', prog: 1 },
        ],
      },
    },
  ];

  // Create three light bands with staggered timing
  const lightBands = [0, 0.3, 0.6].map((stagger, index) => ({
    id: `light-band-${index + 1}`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="w-full h-full"></div>',
      className:
        'absolute h-full w-32 bg-gradient-to-r from-transparent via-yellow-100/60 to-transparent pointer-events-none',
      style: {
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: incomingStartTime, // All bands start when transition begins
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: `light-sweep-${index + 1}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: stagger, // Stagger relative to band's start time
          duration: transitionDuration - stagger, // Duration adjusted for stagger
          mode: 'provider' as const,
          targetIds: [`light-band-${index + 1}`],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '200%', prog: 1 },
          ],
        },
      },
    ],
  })) as RenderableComponentData[];

  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover' as const,
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: outgoingVideoEffects,
    },
    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover' as const,
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: incomingVideoDuration,
        },
      },
      effects: incomingVideoEffects,
    },
    // Light bands (on top of videos)
    ...lightBands,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'vintage-light-leak-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'vintage-light-leak-transition',
  title: 'Vintage Light Leak Transition',
  description:
    'Super 8 film-inspired transition with vertical light bands sweeping across the frame. Features three staggered light streaks with warm/cool color grading effects that create an authentic vintage film aesthetic during the 2-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vintage',
    'light-leak',
    'film',
    'super-8',
    'retro',
    'cinematic',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    outgoingVideoDuration: 5,
    incomingVideoSrc: 'https://example.com/video2.mp4',
    incomingVideoDuration: 5,
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageLightLeakTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
