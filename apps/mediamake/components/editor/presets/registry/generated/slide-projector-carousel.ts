/**
 * Slide Projector Carousel Transition Preset
 *
 * Simulates the authentic mechanical click and slide change of vintage projectors with:
 * - Rapid slide-out to left with mechanical jitter effect
 * - Intentional black gap period (0.3-0.5s) simulating carousel mechanism
 * - Slide-in from right with mechanical snap
 * - Subtle shake effect during the 'click' moment
 * - Nostalgic, deliberate pacing that feels like a real projector
 *
 * Features:
 * - Sequential three-phase transition: slide-out → black gap → slide-in
 * - Mechanical jitter effect with ±3px wiggle during slide-out
 * - Pure black background gap between images
 * - Generic effects in provider mode for clean animation
 * - No overlap - images appear sequentially with gap between
 *
 * Use cases:
 * - Vintage photo slideshows
 * - Retro presentations
 * - Nostalgic memory sequences
 * - Classic educational content style
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) image'),
    duration: z.number().describe('Display duration of first image in seconds'),
  }).describe('First image to display'),
  
  image2: z.object({
    src: z.string().describe('Source URL of the second (incoming) image'),
    duration: z.number().describe('Display duration of second image in seconds'),
  }).describe('Second image to display'),
  
  blackGapDuration: z
    .number()
    .min(0.3)
    .max(0.5)
    .default(0.4)
    .describe('Duration of the black gap between slides in seconds (0.3-0.5s)'),
  
  slideOutDuration: z
    .number()
    .default(0.15)
    .describe('Duration of slide-out animation in seconds'),
  
  slideInDuration: z
    .number()
    .default(0.15)
    .describe('Duration of slide-in animation in seconds'),
  
  jitterIntensity: z
    .number()
    .default(3)
    .describe('Intensity of mechanical jitter in pixels (±value)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image1,
    image2,
    blackGapDuration,
    slideOutDuration,
    slideInDuration,
    jitterIntensity,
  } = params;

  // Calculate total duration: image1 + black gap + image2 (sequential, no overlap)
  const totalDuration = image1.duration + blackGapDuration + image2.duration;

  // Timing breakdown:
  // Phase 1: Outgoing slide (0 to image1.duration)
  // Phase 2: Black gap (image1.duration to image1.duration + blackGapDuration)
  // Phase 3: Incoming slide (image1.duration + blackGapDuration to end)

  const childrenData: RenderableComponentData[] = [
    // Outgoing slide (image1)
    {
      id: 'outgoing-slide',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        // Mechanical jitter during slide-out (around 0.1s mark)
        {
          id: 'outgoing-jitter',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0.1,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['outgoing-slide'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -jitterIntensity, prog: 0.2 },
              { key: 'translateX', val: jitterIntensity, prog: 0.4 },
              { key: 'translateX', val: -jitterIntensity * 0.67, prog: 0.6 },
              { key: 'translateX', val: jitterIntensity * 0.67, prog: 0.8 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
        // Rapid slide-out to left
        {
          id: 'outgoing-slide-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: image1.duration - slideOutDuration,
            duration: slideOutDuration,
            mode: 'provider',
            targetIds: ['outgoing-slide'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-100%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming slide (image2)
    {
      id: 'incoming-slide',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: image1.duration + blackGapDuration,
          duration: image2.duration,
        },
      },
      effects: [
        // Slide-in from right with mechanical snap
        {
          id: 'incoming-slide-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: slideInDuration,
            mode: 'provider',
            targetIds: ['incoming-slide'],
            ranges: [
              { key: 'translateX', val: '100%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
            ],
          },
        },
        // Subtle shake during 'click' moment at start
        {
          id: 'incoming-click-shake',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['incoming-slide'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -2, prog: 0.25 },
              { key: 'translateY', val: 2, prog: 0.5 },
              { key: 'translateY', val: -1, prog: 0.75 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'slide-projector-carousel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
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
  id: 'slide-projector-carousel',
  title: 'Vintage Slide Projector Carousel Transition',
  description:
    'Authentic mechanical slide projector transition with slide-out animation, intentional black gap period (0.3-0.5s), and slide-in animation. Features mechanical jitter effects and shake during the \'click\' moment to simulate vintage projector mechanism. Perfect for nostalgic image sequences and retro presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'projector', 'carousel', 'nostalgic', 'retro'],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    blackGapDuration: 0.4,
    slideOutDuration: 0.15,
    slideInDuration: 0.15,
    jitterIntensity: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const slideProjectorCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
