/**
 * Vintage Film Burn Transition Preset
 *
 * Creates a vintage film burn transition effect where images fade through a white-hot
 * overexposure effect, mimicking old film stock burning under projection heat. Features:
 * - Halation bloom effects (brightness + blur)
 * - Radial vignette overlays
 * - Irregular hand-cranked timing for organic feel
 * - White background for burn-through effect
 * - Blend modes for authentic film aesthetic
 *
 * Technical approach:
 * - Images transition through white-hot overexposure (brightness increase + blur)
 * - Next image fades in through the haze as previous burns out
 * - Vignette effect applied via overlay divs with radial gradients
 * - Staggered timing (2.8s, 3.2s, 2.9s) for hand-cranked feel
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        duration: z
          .number()
          .default(3)
          .describe('Base display duration in seconds'),
      }),
    )
    .min(2)
    .describe('Array of images to transition between (minimum 2)'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of the burn transition effect in seconds'),
  burnIntensity: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Peak brightness intensity during burn effect (1-5)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(25)
    .describe('Maximum blur during transition in pixels'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Vignette darkness intensity (0-1)'),
  irregularTiming: z
    .boolean()
    .default(true)
    .describe('Enable irregular timing for hand-cranked film effect'),
  trackName: z
    .string()
    .default('vintage-film-burn')
    .describe('Name/ID for the transition track'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    transitionDuration,
    burnIntensity,
    blurIntensity,
    vignetteIntensity,
    irregularTiming,
    trackName,
  } = params;

  // Helper: Generate irregular durations for hand-cranked feel
  const getIrregularDuration = (baseDuration: number, index: number): number => {
    if (!irregularTiming) return baseDuration;
    const variations = [2.8, 3.2, 2.9, 3.1, 2.85, 3.15];
    const variance = variations[index % variations.length];
    return baseDuration * (variance / 3);
  };

  // Calculate total duration
  let currentTime = 0;
  const imageDurations: number[] = [];
  
  images.forEach((image, index) => {
    const irregularDuration = getIrregularDuration(image.duration, index);
    imageDurations.push(irregularDuration);
  });

  // Calculate total with overlaps
  const totalDuration = imageDurations.reduce(
    (sum, duration, index) => {
      if (index === 0) return duration;
      return sum + duration - transitionDuration;
    },
    0,
  );

  const childrenData: RenderableComponentData[] = [];

  // Create image containers with transitions
  images.forEach((image, index) => {
    const isFirst = index === 0;
    const isLast = index === images.length - 1;
    const duration = imageDurations[index];

    // Calculate start time (overlapping for transitions)
    let startTime: number;
    if (isFirst) {
      startTime = 0;
    } else {
      startTime = currentTime - transitionDuration;
    }

    const imageId = `${trackName}-image-${index}`;
    const containerId = `${trackName}-container-${index}`;
    const vignetteId = `${trackName}-vignette-${index}`;

    // Create image container with image and vignette
    const imageContainer: RenderableComponentData = {
      id: containerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: index,
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: isLast ? duration : duration + transitionDuration,
        },
      },
      childrenData: [
        // Image atom
        {
          id: imageId,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: image.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: isLast ? duration : duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Vignette overlay
        {
          id: vignetteId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div></div>',
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: isLast ? duration : duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [],
    };

    // Add burn-out effect (outgoing image)
    if (!isLast) {
      const burnOutStart = duration - transitionDuration;
      
      // Fade out with burn
      imageContainer.effects!.push({
        id: `${imageId}-burn-out-opacity`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: burnOutStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });

      // Brightness increase (white-hot burn)
      imageContainer.effects!.push({
        id: `${imageId}-burn-out-brightness`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          start: burnOutStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'filter', val: 'brightness(1)', prog: 0 },
            { key: 'filter', val: `brightness(${burnIntensity})`, prog: 0.7 },
            { key: 'filter', val: `brightness(${burnIntensity})`, prog: 1 },
          ],
        },
      });

      // Blur increase (halation effect)
      imageContainer.effects!.push({
        id: `${imageId}-burn-out-blur`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          start: burnOutStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'backdropFilter', val: 'blur(0px)', prog: 0 },
            { key: 'backdropFilter', val: `blur(${blurIntensity}px)`, prog: 1 },
          ],
        },
      });
    }

    // Add fade-in effect (incoming image, not first)
    if (!isFirst) {
      // Fade in through haze
      imageContainer.effects!.push({
        id: `${imageId}-fade-in-opacity`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Brightness normalize
      imageContainer.effects!.push({
        id: `${imageId}-fade-in-brightness`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'filter', val: `brightness(${burnIntensity * 0.7})`, prog: 0 },
            { key: 'filter', val: 'brightness(1)', prog: 1 },
          ],
        },
      });

      // Blur decrease
      imageContainer.effects!.push({
        id: `${imageId}-fade-in-blur`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'backdropFilter', val: `blur(${blurIntensity * 0.6}px)`, prog: 0 },
            { key: 'backdropFilter', val: 'blur(0px)', prog: 1 },
          ],
        },
      });
    }

    childrenData.push(imageContainer);

    // Update current time
    if (!isLast) {
      currentTime += duration - transitionDuration;
    } else {
      currentTime += duration;
    }
  });

  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-white',
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
  id: 'vintage-film-burn-transition',
  title: 'Vintage Film Burn Transition',
  description:
    'A preset that transitions between images using a white-hot overexposure effect mimicking old film stock burning under projection heat. Features halation bloom effects, vignette overlays, and irregular hand-cranked timing for an authentic vintage film aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vintage',
    'film',
    'burn',
    'halation',
    'overexposure',
    'vignette',
    'retro',
    'analog',
  ],
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
        duration: 3,
      },
      {
        src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
        duration: 3,
      },
      {
        src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=1080&fit=crop',
        duration: 3,
      },
    ],
    transitionDuration: 1.2,
    burnIntensity: 3,
    blurIntensity: 25,
    vignetteIntensity: 0.6,
    irregularTiming: true,
    trackName: 'vintage-film-burn',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageFilmBurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
