/**
 * Projector Slide Carousel Transition Preset
 *
 * This preset creates a vintage slide projector transition effect that mimics mechanical slide changing.
 * It features a dramatic white flash during media changeover, simulating the burst of light when a physical
 * slide projector advances to the next slide. The transition includes mechanical shake effects and a click
 * sound for authentic projector feel.
 *
 * Features:
 * - **White Flash Effect**: Bright flash overlay during transition (0.1s in, 0.1s hold, 0.1s out)
 * - **Mechanical Shake**: Subtle shake effects during transition to simulate physical movement
 * - **Abrupt Cut**: Outgoing video cuts to black while incoming fades in from flash
 * - **Click Sound**: Precisely timed click audio synchronized with flash moment
 * - **Overlap Period**: 0.3 second overlap between media items for smooth transition
 *
 * Use cases:
 * - Creating retro slide show presentations
 * - Building nostalgic photo/video montages
 * - Adding vintage aesthetic to modern content
 * - Educational content mimicking old projector presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of the first media item'),
      type: z
        .enum(['image', 'video'])
        .describe('Type of the first media item'),
      duration: z.number().describe('Duration of the first media in seconds'),
    })
    .describe('First media item configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of the second media item'),
      type: z
        .enum(['image', 'video'])
        .describe('Type of the second media item'),
      duration: z.number().describe('Duration of the second media in seconds'),
    })
    .describe('Second media item configuration'),
  transitionDuration: z
    .number()
    .default(0.3)
    .describe('Duration of the transition overlap in seconds'),
  clickSoundSrc: z
    .string()
    .optional()
    .describe(
      'Source URL for the click sound effect (optional, uses default if not provided)',
    ),
  shakeIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(3)
    .describe('Intensity of the mechanical shake effect in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, clickSoundSrc, shakeIntensity } =
    params;

  // Calculate timing
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;
  const transitionStart = media1.duration - transitionDuration;
  const flashPhase1Duration = 0.1; // Fade in
  const flashPhase2Duration = 0.1; // Hold
  const flashPhase3Duration = 0.1; // Fade out
  const clickSoundStart = transitionStart + flashPhase1Duration; // Peak of flash

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Build children data
  const childrenData: RenderableComponentData[] = [
    // Outgoing media (video1 or image1)
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Abrupt cut to black at transition point
        {
          id: 'outgoing-cut',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: 0.01, // Instant cut
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming media (video2 or image2)
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 15,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        // Fade in from white flash
        {
          id: 'incoming-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0, // Relative to incoming media start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // White flash overlay using HTMLBlockAtom (ShapeAtom is deprecated)
    {
      id: 'flash-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background-color: #FFFFFF;"></div>',
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        // Flash effect: fade in (0.1s), hold (0.1s), fade out (0.1s)
        {
          id: 'flash-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0, // Relative to flash overlay start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['flash-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 }, // 0s
              { key: 'opacity', val: 1, prog: 0.333 }, // 0.1s (fade in complete)
              { key: 'opacity', val: 1, prog: 0.666 }, // 0.2s (hold)
              { key: 'opacity', val: 0, prog: 1 }, // 0.3s (fade out complete)
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Click sound effect (if provided)
    ...(clickSoundSrc
      ? [
          {
            id: 'click-audio',
            type: 'atom',
            componentId: 'AudioAtom',
            data: {
              src: clickSoundSrc,
              volume: 1,
            },
            context: {
              timing: {
                start: clickSoundStart, // Timed with flash peak
                duration: 0.5, // Short duration for click sound
              },
            },
          } as RenderableComponentData,
        ]
      : []),
  ];

  // Root container with mechanical shake effect
  const rootContainer: RenderableComponentData = {
    id: 'projector-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    effects: [
      // Mechanical shake during transition
      {
        id: 'mechanical-shake',
        componentId: 'shake',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['projector-transition-container'],
          amplitude: shakeIntensity,
          frequency: 0.05, // Fast shake frequency
          decay: false,
          axis: 'both',
        },
      },
    ],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'projector-slide-carousel-transition',
  title: 'Projector Slide Carousel Transition',
  description:
    'A vintage slide projector transition preset that mimics mechanical slide changing. Features a dramatic white flash effect during media changeover, simulating the burst of light when a physical slide projector advances. Includes mechanical shake effects and precisely timed click sound for authentic projector feel. The outgoing video cuts abruptly while the incoming video fades in from the white flash during the 0.3 second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'projector', 'vintage', 'flash', 'mechanical'],
  defaultInputParams: {
    media1: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 0.3,
    shakeIntensity: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const projectorSlideCarouselTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
