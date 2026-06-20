/**
 * Magnifying Glass Lens Distortion Transition Preset
 *
 * This preset creates a detective-style magnifying glass transition effect that sweeps
 * across the screen from top-left to bottom-right, revealing the incoming video through
 * a circular lens with distortion effects.
 *
 * Features:
 * - **Circular Reveal Pattern**: The incoming video is revealed through a moving circular mask
 * - **Lens Distortion Simulation**: Scale effects simulate a bulge/magnification effect
 * - **Diagonal Sweep Path**: The lens moves from top-left to bottom-right
 * - **Edge Blur**: Subtle blur effect on the lens edges
 * - **Contrast Enhancement**: Slight contrast boost in the lens area
 * - **2-Second Overlap**: Smooth transition with configurable overlap duration
 *
 * Use cases:
 * - Creating detective/mystery themed transitions
 * - Adding dramatic reveal effects between video clips
 * - Building cinematic investigation sequences
 * - Creating focus/attention-drawing transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
  lensIntensity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.15)
    .describe('Intensity of the lens bulge effect (scale multiplier)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum blur intensity at lens edges in pixels'),
  contrastBoost: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.1)
    .describe('Contrast boost in lens area (0.1 = 110% contrast)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, lensIntensity, blurIntensity, contrastBoost } = params;

  // Calculate total duration (sum of videos minus overlap)
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate when incoming video starts (before outgoing ends)
  const incomingStartTime = video1.duration - overlapDuration;

  // Calculate contrast values
  const maxContrast = 1 + contrastBoost;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video (video1)
    {
      id: 'outgoing-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover' as const,
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Bulge distortion effect in the lens area
        {
          id: 'outgoing-lens-bulge',
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: incomingStartTime,
            duration: overlapDuration,
            mode: 'provider' as const,
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1 + lensIntensity, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Fade out during transition
        {
          id: 'outgoing-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: incomingStartTime,
            duration: overlapDuration,
            mode: 'provider' as const,
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    // Incoming video (video2)
    {
      id: 'incoming-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover' as const,
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: video2.duration,
        },
      },
      effects: [
        // Circular reveal animation (magnifying glass path)
        {
          id: 'incoming-circular-reveal',
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: 0,
            duration: overlapDuration,
            mode: 'provider' as const,
            targetIds: ['incoming-video'],
            ranges: [
              // Start: small circle at top-left
              { key: 'clipPath', val: 'circle(0% at 0% 0%)', prog: 0 },
              // Mid: circle at center
              { key: 'clipPath', val: 'circle(50% at 50% 50%)', prog: 0.5 },
              // End: large circle at bottom-right (fully revealed)
              { key: 'clipPath', val: 'circle(150% at 100% 100%)', prog: 1 },
            ],
          },
        },
        // Blur effect at lens edges
        {
          id: 'incoming-lens-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: 0,
            duration: overlapDuration,
            mode: 'provider' as const,
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Contrast boost in lens area
        {
          id: 'incoming-contrast',
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: 0,
            duration: overlapDuration,
            mode: 'provider' as const,
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'contrast(100%)', prog: 0 },
              { key: 'filter', val: `contrast(${maxContrast * 100}%)`, prog: 0.5 },
              { key: 'filter', val: 'contrast(100%)', prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'magnifying-glass-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
  id: 'magnifying-glass-transition',
  title: 'Magnifying Glass Lens Transition',
  description:
    'A detective-style magnifying glass transition that sweeps diagonally across the screen revealing the next video. Features a circular reveal pattern with lens distortion simulation using scale and blur effects. The lens moves from top-left to bottom-right during a configurable overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'magnifying-glass', 'lens', 'distortion', 'circular-reveal'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2,
    lensIntensity: 0.15,
    blurIntensity: 2,
    contrastBoost: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const magnifyingGlassTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
