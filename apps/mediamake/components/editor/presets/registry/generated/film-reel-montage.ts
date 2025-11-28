/**
 * Film Reel Montage Preset
 *
 * A rapid-fire image montage preset that mimics film reel splicing techniques with high-energy animations.
 * Creates a dynamic sequence where images flash on screen in quick succession with hard cuts and overshoot
 * animations that settle into place. Images stack horizontally like film strips, with each new image pushing
 * previous ones slightly to the left before snapping back.
 *
 * Features:
 * - **Rapid-fire Image Display**: Images appear for 200-400ms with varying durations for erratic rhythm
 * - **Overshoot Animation**: Each image enters with translateX from 120% to -5% to 0% with spring easing
 * - **Horizontal Film Strip Layout**: Images stack side-by-side like film frames
 * - **Film Grain Overlay**: Semi-transparent texture overlay with mix-blend-overlay for analog aesthetic
 * - **Frame Jitter Effect**: Subtle rotate (-1 to 1 degree) and scale (0.98 to 1.02) variations
 * - **White Flash Transitions**: Camera flash effects between every 3-4 images
 * - **GPU-Accelerated Animations**: Uses transform properties with will-change optimization
 *
 * Use cases:
 * - High-energy video montages with film aesthetic
 * - Music video sequences with rapid cuts
 * - Dynamic photo slideshows with analog feel
 * - Energetic brand videos with vintage film look
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
      }),
    )
    .min(2)
    .describe('Array of images to display in the montage (minimum 2 images)'),
  totalDuration: z
    .number()
    .optional()
    .describe('Total duration of the montage in seconds (if not provided, calculated from image count)'),
  trackName: z
    .string()
    .default('film-reel-montage')
    .describe('Name of the track for unique IDs'),
  filmGrainOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Opacity of the film grain overlay (0-1)'),
  jitterIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for frame jitter effects (0-2)'),
  whiteFlashInterval: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .optional()
    .describe('Number of images between white flash transitions (2-10)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    totalDuration,
    trackName,
    filmGrainOpacity = 0.4,
    jitterIntensity = 1,
    whiteFlashInterval = 3,
  } = params;

  // Helper function: Calculate image durations with randomization
  const calculateImageDurations = (
    imageCount: number,
    total: number,
  ): number[] => {
    const baseDuration = total / imageCount;
    const durations: number[] = [];
    let remaining = total;

    for (let i = 0; i < imageCount; i++) {
      if (i === imageCount - 1) {
        durations.push(remaining);
      } else {
        // Randomize between 200ms and 400ms (0.2 to 0.4 seconds)
        const minDuration = 0.2;
        const maxDuration = 0.4;
        const randomDuration =
          minDuration + Math.random() * (maxDuration - minDuration);
        // Clamp to ensure we don't exceed total
        const duration = Math.min(randomDuration, remaining - (imageCount - i - 1) * minDuration);
        durations.push(duration);
        remaining -= duration;
      }
    }

    return durations;
  };

  // Calculate total duration if not provided
  const calculatedTotalDuration = totalDuration || images.length * 0.3;

  // Calculate durations for each image
  const imageDurations = calculateImageDurations(
    images.length,
    calculatedTotalDuration,
  );

  // Create image wrappers with effects
  const imageWrappers: RenderableComponentData[] = [];
  const whiteFlashes: RenderableComponentData[] = [];
  let currentTime = 0;

  images.forEach((image, index) => {
    const imageId = `${trackName}-image-${index}`;
    const wrapperId = `${trackName}-wrapper-${index}`;
    const duration = imageDurations[index];

    // Overshoot animation: 120% -> -5% -> 0%
    const overshootEffect = {
      id: `${imageId}-overshoot`,
      componentId: 'generic',
      data: {
        type: 'spring' as const,
        start: 0,
        duration: 0.3,
        mode: 'provider' as const,
        targetIds: [imageId],
        ranges: [
          { key: 'translateX', val: '120%', prog: 0 },
          { key: 'translateX', val: '-5%', prog: 0.7 },
          { key: 'translateX', val: '0%', prog: 1 },
        ],
      },
    };

    // Frame jitter: subtle rotation and scale
    const jitterRotate = (Math.random() - 0.5) * 2 * jitterIntensity; // -1 to 1 degree
    const jitterScale = 0.98 + Math.random() * 0.04 * jitterIntensity; // 0.98 to 1.02

    const jitterEffect = {
      id: `${imageId}-jitter`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [imageId],
        ranges: [
          { key: 'rotate', val: jitterRotate, prog: 0 },
          { key: 'rotate', val: jitterRotate, prog: 1 },
          { key: 'scale', val: jitterScale, prog: 0 },
          { key: 'scale', val: jitterScale, prog: 1 },
        ],
      },
    };

    // Image wrapper
    const imageWrapper: RenderableComponentData = {
      id: wrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative flex-shrink-0',
        },
      },
      context: {
        timing: {
          start: currentTime,
          duration: duration,
        },
      },
      childrenData: [
        {
          id: imageId,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: image.src,
            className: 'w-full h-full object-cover',
            style: {
              willChange: 'transform',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [overshootEffect, jitterEffect],
        } as RenderableComponentData,
      ],
    };

    imageWrappers.push(imageWrapper);

    // Add white flash after every N images (except the last image)
    if ((index + 1) % whiteFlashInterval === 0 && index < images.length - 1) {
      const flashId = `${trackName}-flash-${Math.floor(index / whiteFlashInterval)}`;
      const flashStart = currentTime + duration;
      const flashDuration = 0.1;

      const whiteFlash: RenderableComponentData = {
        id: flashId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: flashStart,
            duration: flashDuration,
          },
        },
        childrenData: [
          {
            id: `${flashId}-block`,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: "<div style='width: 100%; height: 100%; background-color: white;'></div>",
              className: 'w-full h-full',
            },
            context: {
              timing: {
                start: 0,
                duration: flashDuration,
              },
            },
            effects: [
              {
                id: `${flashId}-opacity`,
                componentId: 'generic',
                data: {
                  type: 'linear' as const,
                  start: 0,
                  duration: flashDuration,
                  mode: 'provider' as const,
                  targetIds: [`${flashId}-block`],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 0.5 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      };

      whiteFlashes.push(whiteFlash);
    }

    currentTime += duration;
  });

  // Film grain overlay
  const filmGrainOverlay: RenderableComponentData = {
    id: `${trackName}-film-grain`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none mix-blend-overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedTotalDuration,
      },
    },
    childrenData: [
      {
        id: `${trackName}-grain-texture`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.03) 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.03) 3px); opacity: ${filmGrainOpacity};'></div>`,
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: calculatedTotalDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Film strip container (horizontal layout)
  const filmStripContainer: RenderableComponentData = {
    id: `${trackName}-film-strip`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-row items-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedTotalDuration,
      },
    },
    childrenData: [...imageWrappers, ...whiteFlashes],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedTotalDuration,
      },
    },
    childrenData: [filmStripContainer, filmGrainOverlay],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'film-reel-montage',
  title: 'Film Reel Montage',
  description:
    'A rapid-fire image montage preset that mimics film reel splicing techniques with high-energy animations, overshoot effects, horizontal stacking, film grain overlay, frame jitter, and white flash transitions between images.',
  type: 'predefined',
  presetType: 'children',
  tags: ['montage', 'film', 'reel', 'rapid-fire', 'images', 'energy', 'vintage'],
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800' },
      { src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800' },
      { src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800' },
    ],
    totalDuration: 3,
    trackName: 'film-reel-montage',
    filmGrainOpacity: 0.4,
    jitterIntensity: 1,
    whiteFlashInterval: 3,
  },
  dependencies: {},
};

export const filmReelMontagePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};