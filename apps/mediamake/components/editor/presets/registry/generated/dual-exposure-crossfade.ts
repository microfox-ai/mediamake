/**
 * Dual-Exposure Crossfade Transition Preset
 *
 * Creates a dreamy, ghostly double-exposure effect that mimics the brief moment when two slides
 * overlap in a projector carousel during change. Both images are simultaneously visible at partial
 * opacity during the peak overlap moment, creating a nostalgic, ethereal transition.
 *
 * Features:
 * - Extended overlap duration (1.2-1.5s) for pronounced double-exposure effect
 * - Complementary opacity curves for outgoing and incoming images
 * - Peak overlap at 50% where both images have ~0.5-0.6 opacity
 * - Warm color temperature shift with sepia and saturation adjustments
 * - Simulates projector lamp warming effect during overlap
 *
 * Use cases:
 * - Nostalgic photo slideshows for YouTube
 * - Vintage-style memory presentations
 * - Documentary transitions with historical feel
 * - Artistic image galleries with dreamy aesthetics
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
    duration: z.number().default(5).describe('Duration of first image in seconds'),
  }).describe('First image configuration'),
  
  image2: z.object({
    src: z.string().describe('Source URL of the second (incoming) image'),
    duration: z.number().default(5).describe('Duration of second image in seconds'),
  }).describe('Second image configuration'),
  
  overlapDuration: z
    .number()
    .min(0.5)
    .max(2.5)
    .default(1.3)
    .describe('Duration of the double-exposure overlap in seconds (1.2-1.5s recommended)'),
  
  warmthIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Intensity of warm sepia effect during overlap (0-1, default: 0.15)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, overlapDuration, warmthIntensity } = params;

  // Calculate total duration (sum of durations minus overlap)
  const totalDuration = image1.duration + image2.duration - overlapDuration;

  // Calculate when incoming image should start (to create overlap)
  const incomingStartTime = image1.duration - overlapDuration;

  // Outgoing image opacity curve: [1, 0.7, 0.4, 0] over overlap
  const outgoingOpacityRanges = [
    { key: 'opacity', val: 1, prog: 0 },
    { key: 'opacity', val: 0.7, prog: 0.33 },
    { key: 'opacity', val: 0.4, prog: 0.66 },
    { key: 'opacity', val: 0, prog: 1 },
  ];

  // Incoming image opacity curve: [0, 0.4, 0.7, 1] (inverse of outgoing)
  const incomingOpacityRanges = [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 0.4, prog: 0.33 },
    { key: 'opacity', val: 0.7, prog: 0.66 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Warm color shift: sepia peaks at 50% (mid-overlap)
  const sepiaRanges = [
    { key: 'filter:sepia', val: 0, prog: 0 },
    { key: 'filter:sepia', val: warmthIntensity, prog: 0.5 },
    { key: 'filter:sepia', val: 0, prog: 1 },
  ];

  // Saturation slightly reduces during overlap (warms the colors)
  const saturateRanges = [
    { key: 'filter:saturate', val: 1, prog: 0 },
    { key: 'filter:saturate', val: 0.9, prog: 0.5 },
    { key: 'filter:saturate', val: 1, prog: 1 },
  ];

  const childrenData: RenderableComponentData[] = [
    // Outgoing Image (bottom layer, z-index 10)
    {
      id: 'outgoing-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'w-full h-full',
        style: {
          objectFit: 'cover',
          zIndex: 10,
          mixBlendMode: 'normal',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        // Opacity fade effect during overlap
        {
          id: 'outgoing-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: image1.duration - overlapDuration, // Relative to outgoing image start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: outgoingOpacityRanges,
          },
        },
        // Sepia warming effect during overlap
        {
          id: 'outgoing-sepia-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: image1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: sepiaRanges,
          },
        },
        // Saturation adjustment during overlap
        {
          id: 'outgoing-saturate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: image1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: saturateRanges,
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming Image (top layer, z-index 20)
    {
      id: 'incoming-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'w-full h-full',
        style: {
          objectFit: 'cover',
          zIndex: 20,
          mixBlendMode: 'normal',
        },
      },
      context: {
        timing: {
          start: incomingStartTime, // Starts before outgoing ends (creates overlap)
          duration: image2.duration,
        },
      },
      effects: [
        // Opacity fade-in effect during overlap (starts at 0 relative to incoming image)
        {
          id: 'incoming-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming image start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: incomingOpacityRanges,
          },
        },
        // Sepia warming effect during overlap
        {
          id: 'incoming-sepia-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: sepiaRanges,
          },
        },
        // Saturation adjustment during overlap
        {
          id: 'incoming-saturate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: saturateRanges,
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'dual-exposure-crossfade-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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
  id: 'dual-exposure-crossfade',
  title: 'Dual-Exposure Crossfade Transition',
  description:
    'Creates a dreamy, ghostly double-exposure effect where two images simultaneously overlap at partial opacity during transition, mimicking a projector carousel slide change. Features warm color temperature shift during overlap for nostalgic photo slideshows.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'crossfade', 'double-exposure', 'projector', 'nostalgic', 'slideshow'],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    overlapDuration: 1.3,
    warmthIntensity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dualExposureCrossfadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
