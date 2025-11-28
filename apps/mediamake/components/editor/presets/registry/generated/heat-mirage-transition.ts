/**
 * Heat Mirage Displacement Transition Preset
 *
 * Simulates desert heat wave distortions during transitions between two videos.
 * The outgoing video wavers with increasing horizontal distortion resembling heat shimmer
 * (rapid oscillating skew/translate transforms with blur/sepia), while the incoming video
 * materializes through the mirage with decreasing distortion. Features a warm color overlay
 * (orange gradient) that peaks at maximum distortion midpoint over 1.6s duration.
 *
 * Features:
 * - **Heat Shimmer Effect**: Rapid oscillating horizontal translations (-5px to 5px every 0.1s)
 * - **Skew Distortion**: Oscillating skew transforms (-2deg to 2deg) for wavering effect
 * - **Scale & Blur**: Progressive scale (1 to 1.02) and blur (0px to 3px) for heat haze
 * - **Sepia Toning**: Warm sepia filter (0 to 0.3) for desert heat atmosphere
 * - **Warm Overlay**: Orange gradient overlay with opacity peaking at transition midpoint
 * - **Reverse Pattern**: Incoming video starts with heavy distortion and normalizes
 *
 * Use cases:
 * - Desert/heat-themed transitions
 * - Summer/tropical video sequences
 * - Creative distortion effects between clips
 * - Weather/climate storytelling transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of heat mirage transition in seconds'),
  oscillationFrequency: z
    .number()
    .default(0.1)
    .describe('Frequency of oscillation cycles in seconds'),
  maxTranslateX: z
    .number()
    .default(5)
    .describe('Maximum horizontal translation in pixels'),
  maxSkewX: z
    .number()
    .default(2)
    .describe('Maximum skew angle in degrees'),
  maxScale: z
    .number()
    .default(1.02)
    .describe('Maximum scale value'),
  maxBlur: z
    .number()
    .default(3)
    .describe('Maximum blur in pixels'),
  maxSepia: z
    .number()
    .default(0.3)
    .describe('Maximum sepia value (0-1)'),
  overlayOpacity: z
    .number()
    .default(0.4)
    .describe('Peak opacity of warm overlay (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    oscillationFrequency,
    maxTranslateX,
    maxSkewX,
    maxScale,
    maxBlur,
    maxSepia,
    overlayOpacity,
  } = params;

  // Calculate total duration with overlap
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper: Generate oscillating keyframes for heat shimmer effect
  const generateOscillatingKeyframes = (
    property: string,
    minValue: number,
    maxValue: number,
    duration: number,
    frequency: number,
    reverse: boolean = false,
  ) => {
    const keyframes = [];
    const cycles = Math.floor(duration / frequency);

    for (let i = 0; i <= cycles; i++) {
      const prog = i / cycles;
      const isEven = i % 2 === 0;

      // Envelope: increase for outgoing, decrease for incoming
      const envelope = reverse ? 1 - prog : prog;

      // Oscillate between min and max
      const value =
        isEven
          ? minValue + (maxValue - minValue) * envelope
          : maxValue - (maxValue - minValue) * envelope;

      keyframes.push({
        key: property,
        val: value,
        prog,
      });
    }

    return keyframes;
  };

  // Helper: Generate transform keyframes with multiple properties
  const generateTransformKeyframes = (
    duration: number,
    frequency: number,
    reverse: boolean = false,
  ) => {
    const cycles = Math.floor(duration / frequency);
    const keyframes = [];

    for (let i = 0; i <= cycles; i++) {
      const prog = i / cycles;
      const isEven = i % 2 === 0;
      const envelope = reverse ? 1 - prog : prog;

      // TranslateX oscillation
      const translateX =
        isEven
          ? -maxTranslateX * envelope
          : maxTranslateX * envelope;

      // SkewX oscillation
      const skewX = isEven ? -maxSkewX * envelope : maxSkewX * envelope;

      // Scale progression
      const scale = 1 + (maxScale - 1) * envelope;

      keyframes.push({
        prog,
        translateX: `${translateX}px`,
        skewX: `${skewX}deg`,
        scale,
      });
    }

    return keyframes;
  };

  // Helper: Generate filter keyframes (blur + sepia)
  const generateFilterKeyframes = (
    duration: number,
    reverse: boolean = false,
  ) => {
    const steps = 10;
    const keyframes = [];

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const envelope = reverse ? 1 - prog : prog;

      const blur = maxBlur * envelope;
      const sepia = maxSepia * envelope;

      keyframes.push({
        key: 'filter',
        val: `blur(${blur}px) sepia(${sepia})`,
        prog,
      });
    }

    return keyframes;
  };

  // Generate keyframes for outgoing video (increasing distortion)
  const outgoingTransformFrames = generateTransformKeyframes(
    transitionDuration,
    oscillationFrequency,
    false,
  );
  const outgoingFilterFrames = generateFilterKeyframes(transitionDuration, false);

  // Generate keyframes for incoming video (decreasing distortion)
  const incomingTransformFrames = generateTransformKeyframes(
    transitionDuration,
    oscillationFrequency,
    true,
  );
  const incomingFilterFrames = generateFilterKeyframes(transitionDuration, true);

  // Convert transform frames to separate range arrays
  const outgoingTransformRanges = [];
  const incomingTransformRanges = [];

  for (const frame of outgoingTransformFrames) {
    outgoingTransformRanges.push(
      { key: 'translateX', val: frame.translateX, prog: frame.prog },
      { key: 'skewX', val: frame.skewX, prog: frame.prog },
      { key: 'scale', val: frame.scale, prog: frame.prog },
    );
  }

  for (const frame of incomingTransformFrames) {
    incomingTransformRanges.push(
      { key: 'translateX', val: frame.translateX, prog: frame.prog },
      { key: 'skewX', val: frame.skewX, prog: frame.prog },
      { key: 'scale', val: frame.scale, prog: frame.prog },
    );
  }

  // Determine component IDs based on media type
  const outgoingComponentId =
    outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video with increasing distortion
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 object-cover will-change-transform',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Transform effect (translateX, skewX, scale)
        {
          id: 'outgoing-transform',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: outgoingTransformRanges,
          },
        },
        // Filter effect (blur + sepia)
        {
          id: 'outgoing-filter',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: outgoingFilterFrames,
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video with decreasing distortion (starts with heavy distortion)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideo.src,
        className: 'absolute inset-0 object-cover will-change-transform',
        fit: 'cover',
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Transform effect (reverse pattern)
        {
          id: 'incoming-transform',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: incomingTransformRanges,
          },
        },
        // Filter effect (reverse pattern)
        {
          id: 'incoming-filter',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: incomingFilterFrames,
          },
        },
      ],
    } as RenderableComponentData,

    // Heat overlay (warm orange gradient, peaks at midpoint)
    {
      id: 'heat-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(255, 165, 0, 1), transparent);"></div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'overlay-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['heat-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: overlayOpacity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'heat-mirage-transition-container',
    type: 'layout',
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
  id: 'heat-mirage-transition',
  title: 'Heat Mirage Displacement Transition',
  description:
    'Simulates desert heat wave distortions during transitions. Outgoing video wavers with increasing horizontal distortion resembling heat shimmer (rapid oscillating skew/translate transforms with blur/sepia), while incoming video materializes through the mirage with decreasing distortion. Features warm color overlay peaking at maximum distortion over 1.6s duration.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'heat', 'mirage', 'distortion', 'desert', 'effect'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 1.6,
    oscillationFrequency: 0.1,
    maxTranslateX: 5,
    maxSkewX: 2,
    maxScale: 1.02,
    maxBlur: 3,
    maxSepia: 0.3,
    overlayOpacity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const heatMirageTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
