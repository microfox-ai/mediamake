/**
 * Focus-Pull Gallery Preset
 *
 * Documentary-style focus-pull image transitions simulating manual lens focus adjustments.
 *
 * Features:
 * - **Bokeh Blur Effect**: Images transition with circular blur patterns (0-30px)
 * - **Lens Breathing**: Subtle zoom effect (1.0→1.05→1.0) simulating lens pump during focus pulls
 * - **Chromatic Aberration**: RGB channel separation at peak blur for vintage lens authenticity
 * - **Documentary Feel**: Timing follows real camera operator patterns (0.3s acceleration, 2s hold, 0.5s deceleration)
 * - **Smooth Transitions**: 40% overlap between images with peaked blur curve
 *
 * Use cases:
 * - Creating cinematic image galleries with documentary feel
 * - Simulating manual focus pulls between subjects
 * - Building vintage lens-style transitions
 * - Adding authentic camera operator aesthetics to image sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
      }),
    )
    .describe('Array of images to display in the gallery'),
  transitionDuration: z
    .number()
    .default(2.8)
    .describe(
      'Total transition duration per image in seconds (acceleration + hold + deceleration)',
    ),
  overlapPercentage: z
    .number()
    .min(0)
    .max(100)
    .default(40)
    .describe('Percentage overlap between images (default: 40%)'),
  maxBlur: z
    .number()
    .min(0)
    .max(50)
    .default(30)
    .describe('Maximum blur amount in pixels at peak transition'),
  maxScale: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.05)
    .describe('Maximum scale for lens breathing effect (default: 1.05)'),
  chromaticAberrationIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe(
      'Chromatic aberration intensity in pixels (RGB channel separation)',
    ),
  accelerationDuration: z
    .number()
    .default(0.3)
    .describe('Focus acceleration phase duration in seconds'),
  holdDuration: z
    .number()
    .default(2)
    .describe('Hold phase duration in seconds (image in focus)'),
  decelerationDuration: z
    .number()
    .default(0.5)
    .describe('Focus deceleration phase duration in seconds'),
  trackName: z
    .string()
    .default('focus-pull-gallery')
    .describe('Track name for unique IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    transitionDuration,
    overlapPercentage,
    maxBlur,
    maxScale,
    chromaticAberrationIntensity,
    accelerationDuration,
    holdDuration,
    decelerationDuration,
    trackName,
  } = params;

  // Helper function: Calculate timing for each image
  const calculateImageTiming = (imageIndex: number) => {
    const overlapDuration = (transitionDuration * overlapPercentage) / 100;
    const startTime = imageIndex * (transitionDuration - overlapDuration);
    return {
      start: startTime,
      duration: transitionDuration,
      overlapDuration,
    };
  };

  // Helper function: Create focus-pull effects (blur, scale, chromatic aberration)
  const createFocusPullEffects = (
    imageId: string,
    imageIndex: number,
  ): any[] => {
    const effects: any[] = [];
    const isFirstImage = imageIndex === 0;
    const isLastImage = imageIndex === images.length - 1;

    // Phase timing calculations
    const accelEnd = accelerationDuration;
    const holdEnd = accelEnd + holdDuration;
    const decelEnd = holdEnd + decelerationDuration;
    const totalPhaseDuration = decelEnd;

    // Blur effect (0 → maxBlur → 0) with peaked curve
    const blurRanges: any[] = [];
    if (!isFirstImage) {
      // Blur in during acceleration
      blurRanges.push(
        { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: accelEnd / totalPhaseDuration },
      );
    } else {
      // First image starts in focus
      blurRanges.push({ key: 'filter', val: 'blur(0px)', prog: 0 });
    }

    // Hold phase - stay in focus
    blurRanges.push({
      key: 'filter',
      val: 'blur(0px)',
      prog: holdEnd / totalPhaseDuration,
    });

    if (!isLastImage) {
      // Blur out during deceleration
      blurRanges.push({
        key: 'filter',
        val: `blur(${maxBlur}px)`,
        prog: 1,
      });
    } else {
      // Last image stays in focus
      blurRanges.push({ key: 'filter', val: 'blur(0px)', prog: 1 });
    }

    const blurEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: [imageId],
      ranges: blurRanges,
    };

    effects.push({
      id: `${imageId}-blur`,
      componentId: 'generic',
      data: blurEffect,
    });

    // Scale effect (lens breathing) - 1.0 → maxScale → 1.0
    const scaleRanges: any[] = [];
    if (!isFirstImage) {
      // Scale up during focus pull in
      scaleRanges.push(
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: maxScale, prog: accelEnd / totalPhaseDuration },
      );
    } else {
      scaleRanges.push({ key: 'scale', val: 1, prog: 0 });
    }

    // Hold at max scale
    scaleRanges.push({
      key: 'scale',
      val: maxScale,
      prog: holdEnd / totalPhaseDuration,
    });

    if (!isLastImage) {
      // Scale back down during focus pull out
      scaleRanges.push({ key: 'scale', val: 1, prog: 1 });
    } else {
      scaleRanges.push({ key: 'scale', val: maxScale, prog: 1 });
    }

    const scaleEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: [imageId],
      ranges: scaleRanges,
    };

    effects.push({
      id: `${imageId}-scale`,
      componentId: 'generic',
      data: scaleEffect,
    });

    // Opacity effect with overlap
    const opacityRanges: any[] = [];
    const overlapDuration = (transitionDuration * overlapPercentage) / 100;

    if (!isFirstImage) {
      // Fade in during acceleration
      opacityRanges.push(
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: accelEnd / totalPhaseDuration },
      );
    } else {
      opacityRanges.push({ key: 'opacity', val: 1, prog: 0 });
    }

    // Hold at full opacity
    opacityRanges.push({
      key: 'opacity',
      val: 1,
      prog: holdEnd / totalPhaseDuration,
    });

    if (!isLastImage) {
      // Fade out during deceleration
      opacityRanges.push({ key: 'opacity', val: 0, prog: 1 });
    } else {
      opacityRanges.push({ key: 'opacity', val: 1, prog: 1 });
    }

    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: [imageId],
      ranges: opacityRanges,
    };

    effects.push({
      id: `${imageId}-opacity`,
      componentId: 'generic',
      data: opacityEffect,
    });

    // Chromatic aberration effects (RGB channel separation at peak blur)
    if (!isFirstImage || !isLastImage) {
      const peakBlurProg = !isFirstImage
        ? 0
        : !isLastImage
          ? 1
          : 0.5;
      const peakBlurTime = peakBlurProg * totalPhaseDuration;

      // Red channel shift (positive X)
      const redChannelRanges: any[] = [];
      if (!isFirstImage) {
        redChannelRanges.push(
          { key: 'translateX', val: `${chromaticAberrationIntensity}px`, prog: 0 },
          { key: 'translateX', val: '0px', prog: accelEnd / totalPhaseDuration },
        );
      } else {
        redChannelRanges.push({ key: 'translateX', val: '0px', prog: 0 });
      }

      redChannelRanges.push({
        key: 'translateX',
        val: '0px',
        prog: holdEnd / totalPhaseDuration,
      });

      if (!isLastImage) {
        redChannelRanges.push({
          key: 'translateX',
          val: `${chromaticAberrationIntensity}px`,
          prog: 1,
        });
      } else {
        redChannelRanges.push({ key: 'translateX', val: '0px', prog: 1 });
      }

      const redChannelEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [`${imageId}-red`],
        ranges: redChannelRanges,
      };

      effects.push({
        id: `${imageId}-chromatic-red`,
        componentId: 'generic',
        data: redChannelEffect,
      });

      // Blue channel shift (negative X)
      const blueChannelRanges: any[] = [];
      if (!isFirstImage) {
        blueChannelRanges.push(
          { key: 'translateX', val: `-${chromaticAberrationIntensity}px`, prog: 0 },
          { key: 'translateX', val: '0px', prog: accelEnd / totalPhaseDuration },
        );
      } else {
        blueChannelRanges.push({ key: 'translateX', val: '0px', prog: 0 });
      }

      blueChannelRanges.push({
        key: 'translateX',
        val: '0px',
        prog: holdEnd / totalPhaseDuration,
      });

      if (!isLastImage) {
        blueChannelRanges.push({
          key: 'translateX',
          val: `-${chromaticAberrationIntensity}px`,
          prog: 1,
        });
      } else {
        blueChannelRanges.push({ key: 'translateX', val: '0px', prog: 1 });
      }

      const blueChannelEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [`${imageId}-blue`],
        ranges: blueChannelRanges,
      };

      effects.push({
        id: `${imageId}-chromatic-blue`,
        componentId: 'generic',
        data: blueChannelEffect,
      });
    }

    return effects;
  };

  // Create image layers
  const imageLayersData: RenderableComponentData[] = images.map(
    (image, index) => {
      const imageId = `${trackName}-image-${index}`;
      const timing = calculateImageTiming(index);
      const effects = createFocusPullEffects(imageId, index);

      // Main image container with chromatic aberration layers
      return {
        id: `${imageId}-container`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 will-change-transform',
          },
        },
        context: {
          timing: {
            start: timing.start,
            duration: timing.duration,
          },
        },
        effects: effects,
        childrenData: [
          // Base image (green channel - no shift)
          {
            id: imageId,
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: image.src,
              className: 'absolute inset-0 w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: timing.duration,
              },
            },
          } as RenderableComponentData,
          // Red channel (shifted right at peak blur)
          {
            id: `${imageId}-red`,
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: image.src,
              className: 'absolute inset-0 w-full h-full object-cover',
              style: {
                mixBlendMode: 'screen',
                opacity: 0.3,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: timing.duration,
              },
            },
          } as RenderableComponentData,
          // Blue channel (shifted left at peak blur)
          {
            id: `${imageId}-blue`,
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: image.src,
              className: 'absolute inset-0 w-full h-full object-cover',
              style: {
                mixBlendMode: 'screen',
                opacity: 0.3,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: timing.duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Calculate total duration
  const overlapDuration = (transitionDuration * overlapPercentage) / 100;
  const totalDuration =
    images.length * (transitionDuration - overlapDuration) + overlapDuration;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-neutral-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: imageLayersData,
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
  id: 'focus-pull-gallery',
  title: 'Focus-Pull Gallery Preset',
  description:
    'Documentary-style focus-pull image transitions simulating manual lens focus adjustments with bokeh blur, chromatic aberration, and lens breathing effects. Images transition with circular blur patterns (0-30px), subtle zoom (1.0→1.05→1.0), and RGB channel separation at peak blur for vintage lens authenticity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'gallery',
    'focus-pull',
    'documentary',
    'cinematography',
    'bokeh',
    'chromatic-aberration',
    'lens-breathing',
    'transitions',
    'images',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05' },
    ],
    transitionDuration: 2.8,
    overlapPercentage: 40,
    maxBlur: 30,
    maxScale: 1.05,
    chromaticAberrationIntensity: 3,
    accelerationDuration: 0.3,
    holdDuration: 2,
    decelerationDuration: 0.5,
    trackName: 'focus-pull-gallery',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const focusPullGalleryPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
