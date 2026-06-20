/**
 * Chemical Burn Transition Preset
 *
 * Mimics darkroom development accidents with blob-like shapes of light expanding from multiple points.
 * Features:
 * - 1.8 second overlap transition duration
 * - 4-6 circular blob shapes with radial gradients (white/orange to transparent)
 * - Blobs start small and expand using scale transforms with elastic easing
 * - Outgoing video inverts colors momentarily at peak with heavy bloom effect
 * - Incoming video emerges with high contrast that softens to normal
 * - Staggered timing for blob animations (0.2s delays between each)
 *
 * Use cases:
 * - Creative transitions between video clips or images
 * - Organic, chemical-inspired visual effects
 * - Adding dramatic, artistic transitions to montages
 * - Simulating darkroom accidents for stylistic purposes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingMedia: z
    .object({
      src: z.string().describe('Source URL of the outgoing media (video or image)'),
      type: z.enum(['video', 'image']).describe('Type of outgoing media'),
      duration: z.number().describe('Duration of outgoing media in seconds'),
    })
    .describe('Outgoing media configuration'),
  incomingMedia: z
    .object({
      src: z.string().describe('Source URL of the incoming media (video or image)'),
      type: z.enum(['video', 'image']).describe('Type of incoming media'),
      duration: z.number().describe('Duration of incoming media in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.8)
    .describe('Duration of the transition overlap in seconds (default: 1.8s)'),
  blobCount: z
    .number()
    .int()
    .min(4)
    .max(6)
    .default(6)
    .describe('Number of blob shapes to create (4-6)'),
  blobStaggerDelay: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Delay between each blob animation start in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingMedia, incomingMedia, transitionDuration, blobCount, blobStaggerDelay } = params;

  // Calculate total duration: sum of media durations minus transition overlap
  const totalDuration = outgoingMedia.duration + incomingMedia.duration - transitionDuration;

  // Determine component IDs based on media types
  const outgoingComponentId = outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Helper function to generate blob positions
  const generateBlobPositions = (count: number) => {
    const positions = [
      { className: 'absolute top-0 left-0' },           // Top-left corner
      { className: 'absolute top-0 right-0' },          // Top-right corner
      { className: 'absolute bottom-0 left-0' },        // Bottom-left corner
      { className: 'absolute bottom-0 right-0' },       // Bottom-right corner
      { className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' }, // Center
      { className: 'absolute top-1/4 right-1/4' },      // Top-right quadrant
    ];
    return positions.slice(0, count);
  };

  const blobPositions = generateBlobPositions(blobCount);

  // Create blob elements with staggered animations
  const blobs: RenderableComponentData[] = blobPositions.map((position, index) => {
    const blobStart = index * blobStaggerDelay;
    const blobDuration = transitionDuration - blobStart;

    return {
      id: `blob-${index + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='w-64 h-64 rounded-full' style='background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(253,186,116,0.4) 50%, transparent 100%);'></div>`,
        className: position.className,
      },
      context: {
        timing: {
          start: blobStart,
          duration: blobDuration,
        },
      },
      effects: [
        {
          id: `blob-${index + 1}-scale`,
          componentId: 'generic',
          data: {
            type: 'spring',
            easingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            start: 0,
            duration: blobDuration,
            mode: 'provider',
            targetIds: [`blob-${index + 1}`],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Outgoing media with invert/bloom effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-media',
    type: 'atom',
    componentId: outgoingComponentId,
    data: {
      src: outgoingMedia.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingMedia.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-invert-bloom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media'],
          ranges: [
            // Invert effect
            { key: 'invert', val: 0, prog: 0 },
            { key: 'invert', val: 1, prog: 0.5 },
            { key: 'invert', val: 1, prog: 0.6 },
            { key: 'invert', val: 0, prog: 1 },
            // Blur effect
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 3, prog: 0.5 },
            { key: 'blur', val: 3, prog: 0.6 },
            { key: 'blur', val: 0, prog: 1 },
            // Brightness effect
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 2, prog: 0.5 },
            { key: 'brightness', val: 2, prog: 0.6 },
            { key: 'brightness', val: 1, prog: 1 },
            // Opacity fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming media with high contrast that softens
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-media',
    type: 'atom',
    componentId: incomingComponentId,
    data: {
      src: incomingMedia.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: outgoingMedia.duration - transitionDuration,
        duration: incomingMedia.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-contrast-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            // Contrast effect
            { key: 'contrast', val: 2, prog: 0 },
            { key: 'contrast', val: 2, prog: 0.3 },
            { key: 'contrast', val: 1, prog: 1 },
            // Brightness effect
            { key: 'brightness', val: 0.5, prog: 0 },
            { key: 'brightness', val: 0.5, prog: 0.3 },
            { key: 'brightness', val: 1, prog: 1 },
            // Opacity fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Assemble all children: outgoing → blobs → incoming (layering order)
  const childrenData: RenderableComponentData[] = [
    outgoingVideo,
    ...blobs,
    incomingVideo,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'chemical-burn-transition-container',
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
  id: 'chemical-burn-transition',
  title: 'Chemical Burn Transition',
  description:
    'A darkroom development accident-style transition with blob-like light shapes expanding from multiple points. Creates organic burn effects with inverted colors and bloom on the outgoing media while the incoming media emerges with high contrast.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'chemical', 'burn', 'organic', 'darkroom', 'artistic'],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 1.8,
    blobCount: 6,
    blobStaggerDelay: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const chemicalBurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
