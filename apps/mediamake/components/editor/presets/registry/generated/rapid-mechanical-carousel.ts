/**
 * Rapid Mechanical Carousel Transition Preset
 *
 * Ultra-fast mechanical carousel transition for rapid-fire YouTube slideshows with sharp slide-left exits,
 * instant reveals, and micro-shake mechanical stops. Features 0.15-0.25s transitions with no gaps, 
 * GPU-accelerated transforms, and precision timing for energetic montages.
 *
 * Technical Implementation:
 * - BaseLayout 'absolute inset-0' with minimal overlap 0.18s for rapid changes
 * - Outgoing ImageAtom: translateX [0%, -100%] over 0.15s with ease-in-quart (fast exit)
 * - Opacity maintained at 1 until last 0.05s then [1, 0]
 * - Incoming ImageAtom already visible underneath (z-index lower), subtle scale [0.98, 1] settle
 * - End shake: translateX [0, 2px, -2px, 1px, 0] over 0.08s after reveal, using linear timing
 * - Very short duration calculation: BaseLayout = sum of all image durations - (0.18s × number of overlaps)
 * - Z-index: outgoing z-20 (on top, sliding away), incoming z-10 (revealed underneath)
 * - GPU-accelerated transforms only for smooth rapid transitions
 *
 * Features:
 * - **Rapid Transitions**: 0.15-0.25s transition times for fast-paced content
 * - **Sharp Movements**: Decisive slide-left exits with ease-in-quart easing
 * - **No Black Gaps**: Incoming image pre-positioned underneath outgoing
 * - **Mechanical Stop**: Micro-shake effect (2-3 frames) to sell the mechanical halt
 * - **Precision Timing**: Calculated overlaps for seamless rapid succession
 * - **GPU Acceleration**: Transform-only animations for 60fps performance
 * - **Multiple Images**: Supports 2+ images in carousel sequence
 *
 * Use cases:
 * - Energetic YouTube slideshows with rapid image changes
 * - Fast-paced montages and compilations
 * - Quick product showcases
 * - High-energy tutorial sequences
 * - Rapid visual storytelling
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        duration: z.number().describe('Duration to display this image in seconds'),
      }),
    )
    .min(2)
    .describe('Array of images to display in carousel sequence (minimum 2)'),
  transitionDuration: z
    .number()
    .min(0.15)
    .max(0.25)
    .default(0.18)
    .describe('Duration of overlap/transition between images (0.15-0.25s for rapid-fire)'),
  slideDuration: z
    .number()
    .min(0.1)
    .max(0.2)
    .default(0.15)
    .describe('Duration of the slide-out animation (0.1-0.2s for sharp exit)'),
  opacityDropDuration: z
    .number()
    .min(0.03)
    .max(0.1)
    .default(0.05)
    .describe('Duration of final opacity drop (0.03-0.1s for quick fade)'),
  settleDuration: z
    .number()
    .min(0.15)
    .max(0.3)
    .default(0.2)
    .describe('Duration of incoming image settle effect (0.15-0.3s)'),
  shakeDuration: z
    .number()
    .min(0.05)
    .max(0.12)
    .default(0.08)
    .describe('Duration of mechanical shake effect (0.05-0.12s for micro-shake)'),
  trackName: z
    .string()
    .default('rapid-carousel')
    .describe('Name used for generating unique component IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    transitionDuration,
    slideDuration,
    opacityDropDuration,
    settleDuration,
    shakeDuration,
    trackName,
  } = params;

  // Calculate total duration: sum of all image durations minus overlaps
  const totalOverlap = transitionDuration * (images.length - 1);
  const totalDuration =
    images.reduce((sum, img) => sum + img.duration, 0) - totalOverlap;

  const childrenData: RenderableComponentData[] = [];
  let currentTime = 0;

  images.forEach((image, index) => {
    const isFirst = index === 0;
    const isLast = index === images.length - 1;

    // Calculate timing for this image
    const imageStart = isFirst ? 0 : currentTime - transitionDuration;
    const imageDuration = isFirst
      ? image.duration
      : image.duration + transitionDuration;

    // Outgoing slide-out effect (starts near end of image display)
    const slideOutStart = image.duration - transitionDuration;

    // Opacity drop effect (last moment before slide completes)
    const opacityDropStart = image.duration - opacityDropDuration;

    // Create image component
    const imageComponent: RenderableComponentData = {
      id: `${trackName}-image-${index}`,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: isFirst ? 10 : 10, // All start at z-10, outgoing will be raised to z-20 via effect context
        },
      },
      context: {
        timing: {
          start: imageStart,
          duration: imageDuration,
        },
      },
      effects: [],
    };

    // Add slide-out effect for non-last images (outgoing animation)
    if (!isLast) {
      imageComponent.effects!.push({
        id: `${trackName}-slide-out-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-quart',
          start: slideOutStart,
          duration: slideDuration,
          mode: 'provider',
          targetIds: [`${trackName}-image-${index}`],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-100%', prog: 1 },
            // Raise z-index during slide to ensure outgoing is on top
            { key: 'zIndex', val: 20, prog: 0 },
          ],
        },
      });

      // Add opacity drop effect (final fade at end of slide)
      imageComponent.effects!.push({
        id: `${trackName}-opacity-drop-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: opacityDropStart,
          duration: opacityDropDuration,
          mode: 'provider',
          targetIds: [`${trackName}-image-${index}`],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    // Add settle effect for non-first images (incoming animation)
    if (!isFirst) {
      imageComponent.effects!.push({
        id: `${trackName}-settle-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to image start
          duration: settleDuration,
          mode: 'provider',
          targetIds: [`${trackName}-image-${index}`],
          ranges: [
            { key: 'scale', val: 0.98, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      });

      // Add mechanical shake effect (after settle, when fully revealed)
      imageComponent.effects!.push({
        id: `${trackName}-shake-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionDuration, // After transition overlap
          duration: shakeDuration,
          mode: 'provider',
          targetIds: [`${trackName}-image-${index}`],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '2px', prog: 0.25 },
            { key: 'translateX', val: '-2px', prog: 0.5 },
            { key: 'translateX', val: '1px', prog: 0.75 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      });
    }

    childrenData.push(imageComponent);

    // Update current time for next image (subtract overlap for next image's start)
    currentTime += image.duration;
  });

  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
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
  id: 'rapid-mechanical-carousel',
  title: 'Rapid Mechanical Carousel Transition',
  description:
    'Ultra-fast mechanical carousel transition for rapid-fire YouTube slideshows with sharp slide-left exits, instant reveals, and micro-shake mechanical stops. Features 0.15-0.25s transitions with no gaps, GPU-accelerated transforms, and precision timing for energetic montages.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'carousel', 'rapid', 'mechanical', 'slideshow', 'fast-paced', 'energetic', 'shake'],
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
        duration: 2.5,
      },
      {
        src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
        duration: 2.0,
      },
      {
        src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=1080&fit=crop',
        duration: 2.5,
      },
      {
        src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&h=1080&fit=crop',
        duration: 2.0,
      },
    ],
    transitionDuration: 0.18,
    slideDuration: 0.15,
    opacityDropDuration: 0.05,
    settleDuration: 0.2,
    shakeDuration: 0.08,
    trackName: 'rapid-carousel',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const rapidMechanicalCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
