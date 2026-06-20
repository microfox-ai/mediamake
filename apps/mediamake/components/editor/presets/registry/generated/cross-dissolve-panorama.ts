/**
 * Cross-Dissolve Panorama Preset
 *
 * High-end panoramic slideshow with cross-dissolve transitions, Ken Burns movement, and traveling vignette.
 * Each image has three phases:
 * 1. Fade-in with slight zoom (1.0 to 1.1 scale)
 * 2. Hold with subtle Ken Burns horizontal movement
 * 3. Fade-out while the next image is already fading in
 *
 * Features:
 * - Overlapping cross-dissolve transitions (60% overlap creates dreamy, ethereal quality)
 * - Three-phase animation per image (fade-in zoom, hold with movement, fade-out)
 * - Traveling vignette effect that moves with the focal point
 * - Customizable image duration and overlap percentage
 * - Smooth Ken Burns effect with configurable intensity
 *
 * Use cases:
 * - Creating professional image slideshows with cinematic transitions
 * - Building photo montages with flowing visual continuity
 * - Adding elegant presentation sequences
 * - Mimicking high-end slideshow software effects (ProShow, Photopia)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL or local path'),
      }),
    )
    .min(2)
    .describe('Array of images for the panorama sequence'),
  singleImageDuration: z
    .number()
    .min(3)
    .default(8)
    .describe('Duration of each individual image in seconds'),
  overlapPercentage: z
    .number()
    .min(0)
    .max(0.8)
    .default(0.6)
    .describe(
      'Overlap percentage between images (0.6 = 60% overlap, creates cross-dissolve)',
    ),
  kenBurnsIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Intensity of Ken Burns horizontal movement in pixels'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of vignette effect (0 = none, 1 = maximum)'),
  totalDuration: z
    .number()
    .optional()
    .describe(
      'Optional total duration override. If not set, calculated from images and overlap.',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    singleImageDuration,
    overlapPercentage,
    kenBurnsIntensity,
    vignetteIntensity,
    totalDuration,
  } = params;

  // Calculate timing
  const imageCount = images.length;
  const offsetPerImage = singleImageDuration * (1 - overlapPercentage);
  const calculatedTotalDuration =
    imageCount > 0
      ? singleImageDuration + offsetPerImage * (imageCount - 1)
      : singleImageDuration;
  const finalTotalDuration = totalDuration ?? calculatedTotalDuration;

  // Create image components with three-phase effects
  const imageComponents: RenderableComponentData[] = images.map(
    (image, index) => {
      const imageId = `panorama-image-${index}`;
      const startTime = index * offsetPerImage;

      // Three-phase timing breakdown
      const fadeInDuration = singleImageDuration * 0.2; // 20% fade-in with zoom
      const holdDuration = singleImageDuration * 0.6; // 60% hold with movement
      const fadeOutDuration = singleImageDuration * 0.2; // 20% fade-out

      // Create three-phase effect
      const imageEffect = {
        id: `panorama-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: singleImageDuration,
          mode: 'provider' as const,
          targetIds: [imageId],
          ranges: [
            // Phase 1: Fade-in with zoom (0-20%)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.2 },
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: kenBurnsIntensity * 0.2, prog: 0.2 },

            // Phase 2: Hold with subtle movement (20-80%)
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'scale', val: 1.1, prog: 0.8 },
            { key: 'translateX', val: kenBurnsIntensity * 0.8, prog: 0.8 },

            // Phase 3: Fade-out with continued movement (80-100%)
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1.1, prog: 1 },
            { key: 'translateX', val: kenBurnsIntensity, prog: 1 },
          ],
        },
      };

      return {
        id: imageId,
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: image.src,
          className: 'absolute inset-0 object-cover',
        },
        context: {
          timing: {
            start: startTime,
            duration: singleImageDuration,
          },
        },
        effects: [imageEffect],
      } as RenderableComponentData;
    },
  );

  // Create vignette overlay with traveling effect
  const vignetteGradient = {
    id: 'vignette-gradient',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,${vignetteIntensity}) 70%);"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'panorama-root' as const,
      },
    },
    effects: [
      {
        id: 'vignette-travel-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          fitDurationTo: 'panorama-root' as const,
          mode: 'provider' as const,
          targetIds: ['vignette-gradient'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: kenBurnsIntensity * 0.5, prog: 0.5 },
            { key: 'translateX', val: kenBurnsIntensity, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  const vignetteOverlay = {
    id: 'vignette-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'panorama-root' as const,
      },
    },
    childrenData: [vignetteGradient],
  } as RenderableComponentData;

  // Images container
  const imagesContainer = {
    id: 'images-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'panorama-root' as const,
      },
    },
    childrenData: imageComponents,
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: 'panorama-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: finalTotalDuration,
        fitDurationTo: 'input' as const,
      },
    },
    childrenData: [imagesContainer, vignetteOverlay],
  } as RenderableComponentData;

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
  id: 'cross-dissolve-panorama',
  title: 'Cross-Dissolve Panorama',
  description:
    'High-end panoramic slideshow with cross-dissolve transitions, Ken Burns movement, and traveling vignette. Each image has three phases: fade-in with zoom (1.0→1.1 scale), hold with subtle movement, and fade-out while next image fades in. Creates a dreamy, ethereal flowing effect with overlapping transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'image',
    'slideshow',
    'panorama',
    'cross-dissolve',
    'ken-burns',
    'transitions',
    'cinematic',
    'vignette',
  ],
  dependencies: {},
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05' },
      { src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff' },
    ],
    singleImageDuration: 8,
    overlapPercentage: 0.6,
    kenBurnsIntensity: 50,
    vignetteIntensity: 0.6,
  },
};

export const crossDissolvePanoramaPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
