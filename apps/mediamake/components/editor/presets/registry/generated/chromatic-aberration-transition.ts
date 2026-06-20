/**
 * Chromatic Aberration Image Transition Preset
 *
 * A refined, cinematic transition effect that uses subtle RGB channel separation and convergence
 * to elegantly morph between two images. During the 0.5s overlap, both images undergo gentle
 * chromatic aberration where color channels softly drift apart (max 4px separation) and then
 * reconverge. The outgoing image's channels expand outward while fading, and the incoming
 * image's channels contract inward while appearing.
 *
 * Features:
 * - Subtle RGB channel separation (max 4px) for professional chromatic aberration effect
 * - Gentle scale pulse (1.0 to 1.02 and back) for organic breathing
 * - Smooth opacity transitions with quadratic easing
 * - 0.5s overlap period for seamless transitions
 * - High-end video production quality suitable for professional YouTube content
 *
 * Use cases:
 * - Professional YouTube video transitions
 * - High-end video production content
 * - Cinematic image crossfades
 * - Polished, sophisticated visual storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  image1: z.object({
    src: z.string().describe('Source URL or path of the first image'),
    duration: z.number().describe('Duration of the first image in seconds'),
  }).describe('First image configuration'),
  image2: z.object({
    src: z.string().describe('Source URL or path of the second image'),
    duration: z.number().describe('Duration of the second image in seconds'),
  }).describe('Second image configuration'),
  overlapDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the transition overlap in seconds (default: 0.5s)'),
  maxChromaticSeparation: z
    .number()
    .default(4)
    .describe('Maximum chromatic aberration separation in pixels (default: 4px)'),
  scaleIntensity: z
    .number()
    .default(1.02)
    .describe('Maximum scale value for the breathing pulse effect (default: 1.02)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, overlapDuration, maxChromaticSeparation, scaleIntensity } = params;

  // Calculate total duration: image1 + image2 - overlap
  const totalDuration = image1.duration + image2.duration - overlapDuration;

  // Image 1 (outgoing) starts at 0
  const image1Start = 0;
  const image1FullDuration = image1.duration;

  // Image 2 (incoming) starts before image1 ends (creates overlap)
  const image2Start = image1.duration - overlapDuration;
  const image2FullDuration = image2.duration;

  // Effect start times (relative to their parent components)
  const image1EffectStart = image1.duration - overlapDuration; // Relative to image1-container
  const image2EffectStart = 0; // Relative to image2-container (starts immediately)

  // Image 1 Container (outgoing)
  const image1Container: RenderableComponentData = {
    id: 'chromatic-image1-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: image1Start,
        duration: image1FullDuration,
      },
    },
    effects: [
      // Opacity fade out (ease-in-quad)
      {
        id: 'image1-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: image1EffectStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['chromatic-image1-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Scale pulse (1.0 -> 1.02 -> 1.01)
      {
        id: 'image1-scale-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: image1EffectStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['chromatic-image1-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scaleIntensity, prog: 0.5 },
            { key: 'scale', val: 1.01, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
    childrenData: [
      // Image 1 Atom
      {
        id: 'chromatic-image1-atom',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image1.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: image1FullDuration,
          },
        },
        effects: [
          // Red channel - expand outward (0 -> 4px -> 3px)
          {
            id: 'image1-chromatic-red',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: image1EffectStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['chromatic-image1-atom'],
              ranges: [
                { key: 'filter', val: 'drop-shadow(0px 0px 0px rgba(255,0,0,0))', prog: 0 },
                { key: 'filter', val: `drop-shadow(${maxChromaticSeparation}px 0px 0px rgba(255,0,0,0.8))`, prog: 0.5 },
                { key: 'filter', val: `drop-shadow(${maxChromaticSeparation * 0.75}px 0px 0px rgba(255,0,0,0.6))`, prog: 1 },
              ],
            } as GenericEffectData,
          },
          // Blue channel - expand outward opposite direction (0 -> -4px -> -3px)
          {
            id: 'image1-chromatic-blue',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: image1EffectStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['chromatic-image1-atom'],
              ranges: [
                { key: 'filter', val: 'drop-shadow(0px 0px 0px rgba(0,0,255,0))', prog: 0 },
                { key: 'filter', val: `drop-shadow(-${maxChromaticSeparation}px 0px 0px rgba(0,0,255,0.8))`, prog: 0.5 },
                { key: 'filter', val: `drop-shadow(-${maxChromaticSeparation * 0.75}px 0px 0px rgba(0,0,255,0.6))`, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Image 2 Container (incoming)
  const image2Container: RenderableComponentData = {
    id: 'chromatic-image2-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: image2Start,
        duration: image2FullDuration,
      },
    },
    effects: [
      // Opacity fade in (ease-out-quad)
      {
        id: 'image2-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: image2EffectStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['chromatic-image2-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Scale convergence (1.02 -> 1.0)
      {
        id: 'image2-scale-convergence',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: image2EffectStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['chromatic-image2-container'],
          ranges: [
            { key: 'scale', val: scaleIntensity, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
    childrenData: [
      // Image 2 Atom
      {
        id: 'chromatic-image2-atom',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image2.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: image2FullDuration,
          },
        },
        effects: [
          // Red channel - contract inward (-4px -> 0px)
          {
            id: 'image2-chromatic-red-converge',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: image2EffectStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['chromatic-image2-atom'],
              ranges: [
                { key: 'filter', val: `drop-shadow(-${maxChromaticSeparation}px 0px 0px rgba(255,0,0,0.8))`, prog: 0 },
                { key: 'filter', val: 'drop-shadow(0px 0px 0px rgba(255,0,0,0))', prog: 1 },
              ],
            } as GenericEffectData,
          },
          // Blue channel - contract inward (4px -> 0px)
          {
            id: 'image2-chromatic-blue-converge',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: image2EffectStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['chromatic-image2-atom'],
              ranges: [
                { key: 'filter', val: `drop-shadow(${maxChromaticSeparation}px 0px 0px rgba(0,0,255,0.8))`, prog: 0 },
                { key: 'filter', val: 'drop-shadow(0px 0px 0px rgba(0,0,255,0))', prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'chromatic-transition-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [image1Container, image2Container],
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
  id: 'chromatic-aberration-transition',
  title: 'Chromatic Aberration Image Transition',
  description:
    'A refined, cinematic transition effect that uses subtle RGB channel separation and convergence to elegantly morph between two images. Features gentle chromatic aberration (max 4px offset), subtle scale pulse (1.0-1.02), and professional opacity fades over a 0.5s overlap period. Designed for high-end YouTube content with polished, sophisticated aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'chromatic-aberration',
    'image',
    'cinematic',
    'professional',
    'youtube',
    'rgb-separation',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    overlapDuration: 0.5,
    maxChromaticSeparation: 4,
    scaleIntensity: 1.02,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const chromaticAberrationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
